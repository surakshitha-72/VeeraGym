import webpush from 'web-push';
import { db } from './db.supabase.ts';
import { firebaseMessaging } from './firebaseAdmin.ts';
import { PushNotificationPayload, StoredPushSubscription } from '../src/types.ts';

// Load VAPID keys lazily from Supabase. Cache the promise so concurrent
// requests share the same initialization and serverless instances reuse keys.
let vapidInitialization: Promise<{ publicKey: string; privateKey: string }> | null = null;

async function ensureVapid(): Promise<{ publicKey: string; privateKey: string }> {
  if (!vapidInitialization) {
    vapidInitialization = (async () => {
      let keys = await db.getVapidKeys();

      if (!keys?.publicKey || !keys?.privateKey) {
        keys = webpush.generateVAPIDKeys();
        await db.setVapidKeys(keys);
        console.log('[VeeraGym Push] Generated new VAPID keys and saved to Supabase');
      }

      webpush.setVapidDetails(
        'mailto:admin@veeragym.com',
        keys.publicKey,
        keys.privateKey
      );

      return keys;
    })().catch((error) => {
      // Permit a later request to retry if Supabase initialization fails.
      vapidInitialization = null;
      throw error;
    });
  }

  return vapidInitialization;
}

export async function getVapidPublicKey(): Promise<string> {
  const keys = await ensureVapid();
  return keys.publicKey;
}

export async function sendPushToSubscription(
  sub: StoredPushSubscription,
  payload: PushNotificationPayload
): Promise<boolean> {
  try {
    await ensureVapid();

    const pushSubscription = {
      endpoint: sub.endpoint,
      expirationTime: sub.expirationTime || null,
      keys: {
        p256dh: sub.keys.p256dh,
        auth: sub.keys.auth,
      },
    };

    await webpush.sendNotification(
      pushSubscription,
      JSON.stringify(payload),
      {
        TTL: 60 * 60 * 24,
        urgency: 'high',
      }
    );
    return true;
  } catch (err: any) {
    if (err.statusCode === 404 || err.statusCode === 410) {
      console.log(`[VeeraGym Push] Subscription expired, removing endpoint: ${sub.endpoint.slice(0, 30)}...`);
      try {
        await db.removePushSubscription(sub.endpoint);
      } catch (removeError: any) {
        console.error('[VeeraGym Push] Could not remove expired subscription:', removeError.message || removeError);
      }
    } else {
      console.error('[VeeraGym Push] Error sending push notification:', err.message || err);
    }
    return false;
  }
}

export async function broadcastPush(
  payload: PushNotificationPayload
): Promise<{ total: number; sent: number }> {
  const subscriptions = await db.getPushSubscriptions();
  if (subscriptions.length === 0) {
    return { total: 0, sent: 0 };
  }

let sent = 0;
  for (const sub of subscriptions) {
    const ok = await sendPushToSubscription(sub, payload);
    if (ok) sent++;
  }

  return { total: subscriptions.length, sent };
}

// Send Firebase Cloud Messaging notification to all registered Android devices.
export async function broadcastFCM(
  payload: PushNotificationPayload
): Promise<{ total: number; sent: number }> {
  const devices = await db.getFCMDevices();

  if (devices.length === 0) {
    return { total: 0, sent: 0 };
  }

  let sent = 0;

  for (const device of devices) {
    try {
      await firebaseMessaging.send({
        token: device.token,
        notification: {
          title: payload.title,
          body: payload.body,
        },
        data: {
          type: String(payload.data?.type || 'renewal'),
          screen: 'reminders',
          ...(payload.data?.customerId && {
            customerId: String(payload.data.customerId),
          }),
        },
        android: {
          priority: 'high',
          notification: {
            channelId: 'default',
          },
        },
      });

      sent++;
    } catch (error: any) {
      console.error('[VeeraGym FCM] Notification failed:', error.message || error);

      if (
        error.code === 'messaging/registration-token-not-registered' ||
        error.code === 'messaging/invalid-registration-token'
      ) {
        try {
          await db.removeFCMDevice(device.token);
        } catch (removeError: any) {
          console.error('[VeeraGym FCM] Could not remove invalid token:', removeError.message || removeError);
        }
      }
    }
  }

  return {
    total: devices.length,
    sent,
  };
}

export async function evaluateAndSendRenewalAlerts(): Promise<{
  triggered: boolean;
  count: number;
  message: string;
  payload?: PushNotificationPayload;
}> {
  const upcoming = await db.getUpcomingRenewalsForNotification(2);

  if (upcoming.length === 0) {
    return {
      triggered: false,
      count: 0,
      message: 'No upcoming renewals due within 2 days.',
    };
  }

  let payload: PushNotificationPayload;

  if (upcoming.length === 1) {
    const item = upcoming[0];
    const daysLabel = item.daysRemaining === 0 ? 'Due Today' : item.daysText;

    payload = {
      title: 'VeeraGym: Renewal Reminder',
      body: `VeeraGym: ${item.customerName}'s membership renewal is due in ${daysLabel} (${item.renewalDate}). Amount Due: ₹${item.amountDue}. Days Remaining: ${daysLabel}. Would you like to prepare a WhatsApp reminder?`,
      icon: '/icon-192.svg',
      badge: '/badge-72.svg',
      tag: `renewal-${item.customerId}-${item.renewalDate}`,
      data: {
        url: `/?view=reminders&customerId=${encodeURIComponent(item.customerId)}`,
        customerId: item.customerId,
        customerName: item.customerName,
        renewalDate: item.renewalDate,
        amountDue: item.amountDue,
        daysRemaining: item.daysRemaining,
        type: 'single',
      },
      actions: [
        { action: 'open_and_prepare', title: 'Prepare Reminder' },
        { action: 'dismiss', title: 'Dismiss' },
      ],
    };
  } else {
    const totalAmount = upcoming.reduce((sum, item) => sum + item.amountDue, 0);
    const namesSummary = upcoming.slice(0, 3).map((item) => item.customerName).join(', ') +
      (upcoming.length > 3 ? ` and ${upcoming.length - 3} others` : '');

    payload = {
      title: `VeeraGym: ${upcoming.length} Pending WhatsApp Reminders`,
      body: `${upcoming.length} members have upcoming renewals (${namesSummary}). Total Amount Due: ₹${totalAmount}. Tap to prepare WhatsApp reminders.`,
      icon: '/icon-192.svg',
      badge: '/badge-72.svg',
      tag: `renewal-batch-${Date.now()}`,
      data: {
        url: '/?view=reminders',
        type: 'multiple',
        count: upcoming.length,
        totalAmount,
      },
      actions: [
        { action: 'open_reminders', title: 'Review All' },
        { action: 'dismiss', title: 'Dismiss' },
      ],
    };
  }

  const result = await broadcastPush(payload);
  const fcmResult = await broadcastFCM(payload);
  const deliverySucceeded = result.sent > 0 || fcmResult.sent > 0;

  if (deliverySucceeded) {
    for (const item of upcoming) {
      await db.markRenewalNotificationSent(item.customerId, item.renewalDate);
    }
  }

  return {
    triggered: true,
    count: upcoming.length,
    message: `Push alert sent: Web ${result.sent}/${result.total}, Android ${fcmResult.sent}/${fcmResult.total}, for ${upcoming.length} upcoming renewal(s).`,
    payload,
  };
}
