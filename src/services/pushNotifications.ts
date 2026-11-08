/**
 * Push Notification Service for VeeraGym
 * Manages Service Worker registration, Web Push subscriptions,
 * and testing of Outside-App Device Push Notifications.
 */

import {
  registerFCMDevice,
  unregisterFCMDevice,
  apiFetch,
} from './api.ts';
import { Capacitor } from '@capacitor/core';
import { PushNotifications } from '@capacitor/push-notifications';
export interface PushStatus {
  supported: boolean;
  permission: NotificationPermission;
  subscribed: boolean;
  registration: ServiceWorkerRegistration | null;
  subscription: PushSubscription | null;
}

function urlBase64ToUint8Array(base64String: string): Uint8Array<ArrayBuffer> {
  const padding = '='.repeat((4 - (base64String.length % 4)) % 4);
  const base64 = (base64String + padding)
    .replace(/-/g, '+')
    .replace(/_/g, '/');

  const rawData = window.atob(base64);
  const buffer = new ArrayBuffer(rawData.length);
  const outputArray = new Uint8Array(buffer);

  for (let i = 0; i < rawData.length; ++i) {
    outputArray[i] = rawData.charCodeAt(i);
  }
  return outputArray;
}

export function isPushSupported(): boolean {
  return (
    typeof window !== 'undefined' &&
    'serviceWorker' in navigator &&
    'PushManager' in window &&
    'Notification' in window
  );
}

export async function getPushStatus(): Promise<PushStatus> {
    // Check native Android FCM registration
  if (Capacitor.isNativePlatform()) {
    const nativePermission = await PushNotifications.checkPermissions();

    const permission: NotificationPermission =
      nativePermission.receive === 'granted'
        ? 'granted'
        : nativePermission.receive === 'denied'
        ? 'denied'
        : 'default';

    return {
      supported: true,
      permission,
      subscribed:
        localStorage.getItem('veeragym_fcm_registered') === 'true',
      registration: null,
      subscription: null,
    };
  }
  if (!isPushSupported()) {
    return {
      supported: false,
      permission: 'default',
      subscribed: false,
      registration: null,
      subscription: null,
    };
  }

  const permission = Notification.permission;
  try {
    const registration = await navigator.serviceWorker.getRegistration();
    if (!registration) {
      return {
        supported: true,
        permission,
        subscribed: false,
        registration: null,
        subscription: null,
      };
    }

    const subscription = await registration.pushManager.getSubscription();
    return {
      supported: true,
      permission,
      subscribed: !!subscription,
      registration,
      subscription,
    };
  } catch (err) {
    console.error('Error querying push status:', err);
    return {
      supported: true,
      permission,
      subscribed: false,
      registration: null,
      subscription: null,
    };
  }
}

export async function registerServiceWorker(): Promise<ServiceWorkerRegistration | null> {
  if (!('serviceWorker' in navigator)) return null;

  try {
    const registration = await navigator.serviceWorker.register('/sw.js', {
      scope: '/',
    });
    await navigator.serviceWorker.ready;
    return registration;
  } catch (err) {
    console.error('Failed to register service worker:', err);
    return null;
  }
}
// Native Android Firebase Cloud Messaging registration
export async function subscribeAndroidToPush(): Promise<{
  success: boolean;
  message: string;
}> {
  if (!Capacitor.isNativePlatform()) {
    return {
      success: false,
      message: 'This function is only for Android devices.',
    };
  }

  try {
    let permission = await PushNotifications.checkPermissions();

    if (permission.receive === 'prompt') {
      permission = await PushNotifications.requestPermissions();
    }

    if (permission.receive !== 'granted') {
      return {
        success: false,
        message: 'Please allow notification permission in Android settings.',
      };
    }

    const token = await new Promise<string>(async (resolve, reject) => {
      let registrationListener: any;
      let errorListener: any;

      const cleanup = async () => {
        await registrationListener?.remove();
        await errorListener?.remove();
      };

      registrationListener = await PushNotifications.addListener(
        'registration',
        async (tokenData) => {
          await cleanup();
          resolve(tokenData.value);
        }
      );

      errorListener = await PushNotifications.addListener(
        'registrationError',
        async (error) => {
          await cleanup();
          reject(new Error(JSON.stringify(error)));
        }
      );

      try {
        await PushNotifications.register();
      } catch (error) {
        await cleanup();
        reject(error);
      }
    });


   const result = await registerFCMDevice(token);

if (result.success) {
  localStorage.setItem('veeragym_fcm_registered', 'true');
  localStorage.setItem('veeragym_fcm_token', token);
}

return {
  success: result.success,
  message: result.message,
};
  } catch (error: any) {
    console.error('[VeeraGym FCM] Registration failed:', error);

    return {
      success: false,
      message: error.message || 'Android FCM registration failed.',
    };
  }
}
export async function subscribeDeviceToPush(): Promise<{
  success: boolean;
  message: string;
  subscription?: PushSubscription;
}> {
  if (!isPushSupported()) {
    return { success: false, message: 'Push notifications are not supported by this browser.' };
  }

  try {
    // 1. Request permission
    const permission = await Notification.requestPermission();
    if (permission !== 'granted') {
      return {
        success: false,
        message: 'Notification permission was denied. Please allow notifications in your browser settings.',
      };
    }

    // 2. Ensure Service Worker is registered
    let registration: ServiceWorkerRegistration | null | undefined = await navigator.serviceWorker.getRegistration();
    if (!registration) {
      registration = await registerServiceWorker();
    }
    if (!registration) {
      return { success: false, message: 'Failed to register Service Worker for background notifications.' };
    }

    // 3. Get VAPID public key from backend
    const keyRes = await fetch('/api/push/vapid-public-key');
    if (!keyRes.ok) {
      throw new Error('Failed to retrieve push encryption key from server');
    }
    const { publicKey } = await keyRes.json();
    const convertedVapidKey = urlBase64ToUint8Array(publicKey);

    // 4. Subscribe with PushManager
    let subscription = await registration.pushManager.getSubscription();
    if (!subscription) {
      subscription = await registration.pushManager.subscribe({
        userVisibleOnly: true,
        applicationServerKey: convertedVapidKey,
      });
    }

    // 5. Send subscription to server
    const subRes = await apiFetch('/api/push/subscribe', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        subscription: subscription.toJSON(),
        userAgent: navigator.userAgent,
      }),
    });

    if (!subRes.ok) {
      const errData = await subRes.json().catch(() => ({}));
      throw new Error(errData.error || 'Failed to save subscription on server');
    }

    return {
      success: true,
      message: 'Outside-app device notifications enabled successfully! You will receive push reminders 2 days before renewals.',
      subscription,
    };
  } catch (err: any) {
    console.error('Error subscribing to push notifications:', err);
    return {
      success: false,
      message: err.message || 'Could not subscribe to device notifications.',
    };
  }
}

export async function unsubscribeDeviceFromPush(): Promise<{
  success: boolean;
  message: string;
}> {
  try {
    // Android: Unregister the FCM device
    if (Capacitor.isNativePlatform()) {
      const token = await PushNotifications.getDeliveredNotifications();

      // Retrieve the FCM token saved during registration
      const savedToken = localStorage.getItem('veeragym_fcm_token');

      if (!savedToken) {
        localStorage.removeItem('veeragym_fcm_registered');

        return {
          success: true,
          message: 'Android notifications are disabled.',
        };
      }

      const result = await unregisterFCMDevice(savedToken);

      if (result.success) {
        localStorage.removeItem('veeragym_fcm_registered');
        localStorage.removeItem('veeragym_fcm_token');

        return {
          success: true,
          message: 'Android notifications disabled successfully.',
        };
      }

      return {
        success: false,
        message: result.message,
      };
    }

    // Browser: Keep the existing Web Push unsubscribe process
    if (!('serviceWorker' in navigator)) {
      return { success: false, message: 'Service worker not supported' };
    }

    const registration = await navigator.serviceWorker.getRegistration();

    if (registration) {
      const subscription = await registration.pushManager.getSubscription();

      if (subscription) {
        await apiFetch('/api/push/unsubscribe', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ endpoint: subscription.endpoint }),
        });

        await subscription.unsubscribe();
      }
    }

    return {
      success: true,
      message: 'Device notifications turned off.',
    };
  } catch (err: any) {
    console.error('Error unsubscribing:', err);

    return {
      success: false,
      message: err.message || 'Error unsubscribing.',
    };
  }
}

export async function sendTestNotification(): Promise<{ success: boolean; message: string }> {
  try {
    const registration = await navigator.serviceWorker.getRegistration();
    const subscription = registration ? await registration.pushManager.getSubscription() : null;

    const res = await apiFetch('/api/push/test', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        subscription: subscription ? subscription.toJSON() : null,
      }),
    });

    const data = await res.json();
    if (!res.ok) throw new Error(data.error || 'Failed to trigger test push');

    return {
      success: true,
      message: 'Test outside-app push notification dispatched! Check your device notification tray.',
    };
  } catch (err: any) {
    return {
      success: false,
      message: err.message || 'Failed to dispatch test notification.',
    };
  }
}

export async function triggerRenewalCheckAndNotify(): Promise<{
  triggered: boolean;
  count: number;
  message: string;
}> {
  try {
    const res = await apiFetch('/api/push/check-and-notify', {
      method: 'POST',
    });
    const data = await res.json();
    return data;
  } catch (err: any) {
    console.error('Failed to trigger renewal check:', err);
    return {
      triggered: false,
      count: 0,
      message: err.message || 'Failed to check renewals',
    };
  }
}
