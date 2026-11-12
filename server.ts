import { parseVoiceTranscriptRobust } from './server/voiceParser.ts';
import { firebaseMessaging } from './server/firebaseAdmin.ts';
import express from 'express';
import { adminLogin, requireAdmin } from './server/auth.ts';
import dotenv from 'dotenv';
import path from 'path';
import { GoogleGenAI, Type } from '@google/genai';
import { db, getTodayDateString } from './server/db.supabase.ts';
import {
  getVapidPublicKey,
  broadcastPush,
  sendPushToSubscription,
  evaluateAndSendRenewalAlerts
} from './server/pushService.ts';

dotenv.config();

const app = express();
const port = Number(process.env.PORT) || 3000;

// Allow JSON request bodies
app.use(express.json());
// Admin authentication
app.post('/api/auth/login', adminLogin);

// Protect all API endpoints except login and the public VAPID key
app.use('/api', (req, res, next) => {
  if (
    req.path === '/push/vapid-public-key' ||
    req.path === '/push/cron-renewals'
  ) {
    return next();
  }

  requireAdmin(req, res, next);
});


// Server-side Gemini Client
const ai = new GoogleGenAI({
  apiKey: process.env.GEMINI_API_KEY,
  httpOptions: {
    headers: {
      'User-Agent': 'aistudio-build',
    },
  },
});

// --------------------------------------------------
// API ENDPOINTS
// --------------------------------------------------

// Dashboard statistics
app.get('/api/dashboard/stats', async (req, res) => {
  try {
    const stats = await db.getDashboardStats();
    res.json(stats);
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

// Customers CRUD
app.get('/api/customers', async (req, res) => {
  try {
    const { category, status, search } = req.query;
    const list = await db.getCustomers(category as any, status as string, search as string);
    res.json(list);
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

app.get('/api/customers/:id', async (req, res) => {
  try {
    const customer = await db.getCustomerById(req.params.id);

    if (!customer) {
      return res.status(404).json({ error: 'Customer not found' });
    }

    res.json(customer);
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});
app.post('/api/customers', async (req, res) => {
  try {
    const {
      name,
      phone,
      weightKg,
      category,
      joiningDate,
      firstPaymentDate,
      amountPaid,
      paymentMethod,
      notes
    } = req.body;

    if (!name || !phone || !category) {
      return res.status(400).json({
        error: 'Name, phone number, and category are required'
      });
    }

    const result = await db.createCustomer({
      name,
      phone,
      weightKg: Number(weightKg) || 0,
      category,
      joiningDate: joiningDate || getTodayDateString(),
      firstPaymentDate,
      amountPaid: amountPaid ? Number(amountPaid) : undefined,
      paymentMethod,
      notes,
    });

    res.status(201).json(result);
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

app.put('/api/customers/:id', async (req, res) => {
  try {
    const updated = await db.updateCustomer(req.params.id, req.body);
    res.json(updated);
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

app.delete('/api/customers/:id', async (req, res) => {
  try {
    const ok = await db.deleteCustomer(req.params.id);

    if (!ok) {
      return res.status(404).json({ error: 'Customer not found' });
    }

    res.json({ success: true });
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

// Individual Customer Monthly Payment Register
app.get('/api/customers/:id/register', async (req, res) => {
  try {
    const year = Number(req.query.year) || new Date().getFullYear();
    const register = await db.getCustomerRegister(req.params.id, year);
    res.json(register);
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

app.post('/api/customers/:id/register-status', async (req, res) => {
  try {
    const { year, monthIndex, isActive, isInactive } = req.body;

    const register = await db.updateMonthStatus(
      req.params.id,
      Number(year),
      Number(monthIndex),
      Boolean(isActive),
      Boolean(isInactive)
    );

    res.json(register);
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

// Payments
app.get('/api/payments', async (req, res) => {
  try {
    const { customerId, category, month, year, search } = req.query;

    const payments = await db.getPayments({
      customerId: customerId as string,
      category: category as any,
      month: month ? Number(month) : undefined,
      year: year ? Number(year) : undefined,
      search: search as string,
    });

    res.json(payments);
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

app.post('/api/payments', async (req, res) => {
  try {
    const {
      customerId,
      amount,
      paymentDate,
      month,
      year,
      paymentMethod,
      notes
    } = req.body;

    if (!customerId || !amount || !paymentDate || !month || !year) {
      return res.status(400).json({ error: 'All payment fields are required' });
    }

    const result = await db.recordPayment({
      customerId,
      amount: Number(amount),
      paymentDate,
      month: Number(month),
      year: Number(year),
      paymentMethod: paymentMethod || 'UPI / GPay / PhonePe',
      notes,
    });

    res.status(201).json(result);
  } catch (err: any) {
    res.status(400).json({ error: err.message });
  }
});

// Renewal Reminders
app.get('/api/reminders', async (req, res) => {
  try {
    const reminders = await db.getRenewalReminders();
    res.json(reminders);
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

app.put('/api/reminders/:id', async (req, res) => {
  try {
    const updated = await db.updateReminder(req.params.id, req.body);
    res.json(updated);
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

app.post('/api/reminders/:id/notify', async (req, res) => {
  try {
    const nowStr = new Date().toISOString();

    const updated = await db.updateReminder(req.params.id, {
      status: 'Sent',
      lastNotifiedAt: nowStr,
    });

    res.json(updated);
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

// Voice Registration Parsing
app.post('/api/parse-voice', async (req, res) => {
  try {
    const { transcript } = req.body;

    if (!transcript || typeof transcript !== 'string') {
      return res.status(400).json({ error: 'Transcript is required' });
    }

    const todayStr = getTodayDateString();

    try {
      const prompt = `You are a gym receptionist assistant for "VeeraGym" in India.
Current reference date: ${todayStr}.
Parse the following voice registration transcript and extract customer gym details:
"${transcript}"

Rules:
1. Category must be either "cardio" or "non-cardio".
   - Cardio monthly fee: 1000 rupees.
   - Non-Cardio monthly fee: 600 rupees.
2. Extract full name.
3. Extract mobile number.
4. Extract weight in kilograms.
5. Extract joining date in YYYY-MM-DD format. If missing, use "${todayStr}".
6. Extract first payment date or null.
7. Extract amount paid.
8. Extract payment method if mentioned.
9. Extract any additional notes.`;

      const response = await ai.models.generateContent({
        model: 'gemini-3.8-flash',
        contents: prompt,
        config: {
          responseMimeType: 'application/json',
          responseSchema: {
            type: Type.OBJECT,
            properties: {
              name: { type: Type.STRING },
              phone: { type: Type.STRING },
              weightKg: { type: Type.NUMBER },
              category: { type: Type.STRING },
              monthlyFee: { type: Type.NUMBER },
              joiningDate: { type: Type.STRING },
              firstPaymentDate: { type: Type.STRING },
              amountPaid: { type: Type.NUMBER },
              paymentMethod: { type: Type.STRING },
              notes: { type: Type.STRING },
            },
            required: ['name', 'phone', 'category'],
          },
        },
      });
      const parsed = JSON.parse(response.text || '{}');

      if (parsed.category) {
        const cat = parsed.category.toLowerCase().replace(/[^a-z]/g, '');

        if (cat.includes('cardio') && !cat.includes('non')) {
          parsed.category = 'cardio';
          parsed.monthlyFee = 1000;
        } else {
          parsed.category = 'non-cardio';
          parsed.monthlyFee = 600;
        }
      } else {
        parsed.category =
          parsed.monthlyFee === 1000 || parsed.amountPaid === 1000
            ? 'cardio'
            : 'non-cardio';

        parsed.monthlyFee = parsed.category === 'cardio' ? 1000 : 600;
      }

      if (!parsed.joiningDate) {
        parsed.joiningDate = todayStr;
      }

      return res.json(parsed);
    } catch (aiErr: any) {
      console.warn(
        'Gemini API call failed, using local NLP parser:',
        aiErr.message
      );

      const robustResult = parseVoiceTranscriptRobust(transcript, todayStr);
      return res.json(robustResult);
    }
  } catch (err: any) {
    console.error('Error in /api/parse-voice:', err);

    res.status(500).json({
      error: err.message || 'Failed to parse voice transcript'
    });
  }
});
// --------------------------------------------------
// PUSH NOTIFICATIONS
// --------------------------------------------------
// Register Android device for Firebase Cloud Messaging
app.post('/api/push/fcm/register', async (req, res) => {
  try {
    const { token, platform, userAgent } = req.body;

    if (!token || typeof token !== 'string') {
      return res.status(400).json({
        success: false,
        error: 'Valid FCM device token is required',
      });
    }

    const now = new Date().toISOString();

    await db.saveFCMDevice({
      token,
      platform: platform || 'android',
      userAgent: userAgent || req.headers['user-agent'] || 'Unknown',
      createdAt: now,
      updatedAt: now,
    });

    console.log('[VeeraGym FCM] Android device registered');

    return res.status(201).json({
      success: true,
      message: 'Android device registered for FCM notifications',
    });
  } catch (err: any) {
    return res.status(500).json({
      success: false,
      error: err.message,
    });
  }
});
// Unregister Android device from Firebase Cloud Messaging
app.post('/api/push/fcm/unregister', async (req, res) => {
  try {
    const { token } = req.body;

    if (!token || typeof token !== 'string') {
      return res.status(400).json({
        success: false,
        message: 'Valid FCM device token is required',
      });
    }

    await db.removeFCMDevice(token);

    console.log('[VeeraGym FCM] Android device unregistered');

    return res.json({
      success: true,
      message: 'Android notifications disabled successfully.',
    });
  } catch (err: any) {
    return res.status(500).json({
      success: false,
      message: err.message || 'Failed to unregister Android device.',
    });
  }
});
app.post('/api/push/fcm/test', async (req, res) => {
  try {
    const devices = await db.getFCMDevices();

    if (devices.length === 0) {
      return res.status(404).json({
        success: false,
        message: 'No Android devices registered for FCM',
      });
    }

    const results = await Promise.all(
      devices.map(async (device) => {
        try {
          await firebaseMessaging.send({
            token: device.token,
            notification: {
              title: 'VeeraGym Test Notification',
              body: 'Your Android push notifications are working!',
            },
            data: {
              type: 'test',
              screen: 'reminders',
            },
          });

          return { success: true };
        } catch (error: any) {
          console.error('[VeeraGym FCM] Send failed:', error.message);
          return { success: false };
        }
      })
    );
    const sent = results.filter((result) => result.success).length;

    return res.json({
      success: sent > 0,
      sent,
      total: devices.length,
    });
  } catch (err: any) {
    return res.status(500).json({
      success: false,
      error: err.message,
    });
  }
});
// Get VAPID public key
app.get('/api/push/vapid-public-key', async (req, res) => {
  try {
    const publicKey = await getVapidPublicKey();
    res.json({ publicKey });
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

app.post('/api/push/subscribe', async (req, res) => {
  try {
    const { subscription, userAgent } = req.body;

    if (!subscription || !subscription.endpoint || !subscription.keys) {
      return res.status(400).json({
        error: 'Valid subscription object is required'
      });
    }

    await db.savePushSubscription({
      endpoint: subscription.endpoint,
      expirationTime: subscription.expirationTime || null,
      keys: {
        p256dh: subscription.keys.p256dh,
        auth: subscription.keys.auth,
      },
      userAgent: userAgent || req.headers['user-agent'] || 'Unknown',
      createdAt: new Date().toISOString(),
    });

    console.log('[VeeraGym Push] New device subscription registered');

    res.status(201).json({
      success: true,
      message: 'Device subscribed to background push notifications'
    });
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

app.post('/api/push/unsubscribe', async (req, res) => {
  try {
    const { endpoint } = req.body;

    if (!endpoint) {
      return res.status(400).json({ error: 'Endpoint is required' });
    }

    await db.removePushSubscription(endpoint);

    res.json({ success: true, message: 'Device unsubscribed' });
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});
app.post('/api/push/test', async (req, res) => {
  try {
    const { subscription } = req.body;

    const testPayload = {
      title: 'VeeraGym: Device Notification Active',
      body: 'Push notifications are verified on your device!',
      icon: '/icon-192.svg',
      badge: '/badge-72.svg',
      tag: `test-notification-${Date.now()}`,
      data: {
        url: '/?view=reminders',
        type: 'test' as const,
      },
      actions: [
        {
          action: 'open_reminders',
          title: 'Open VeeraGym',
        },
      ],
    };

    if (subscription && subscription.endpoint) {
      const ok = await sendPushToSubscription(subscription, testPayload);

      return res.json({
        success: ok,
        message: ok ? 'Test push sent to your device' : 'Failed to send test push'
      });
    }

    const result = await broadcastPush(testPayload);

    res.json({
      success: true,
      sent: result.sent,
      total: result.total
    });
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

// Evaluate upcoming renewals and send alerts
app.post('/api/push/check-and-notify', async (req, res) => {
  try {
    const outcome = await evaluateAndSendRenewalAlerts();
    res.json(outcome);
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

app.get('/api/push/cron-renewals', async (req, res) => {
  try {
    const cronSecret = process.env.CRON_SECRET;

    if (!cronSecret) {
      return res.status(500).json({
        success: false,
        message: 'CRON_SECRET is not configured',
      });
    }

    if (req.headers.authorization !== `Bearer ${cronSecret}`) {
      return res.status(401).json({
        success: false,
        message: 'Unauthorized',
      });
    }

    const outcome = await evaluateAndSendRenewalAlerts();

    return res.json({
      success: true,
      ...outcome,
    });
  } catch (error: any) {
    console.error('[VeeraGym Cron] Renewal notification failed:', error);

    return res.status(500).json({
      success: false,
      message: error.message || 'Renewal notification failed',
    });
  }
});

async function startServer() {
  try {
    if (process.env.NODE_ENV === 'production') {
      app.use(express.static(path.resolve(process.cwd(), 'dist')));

      app.get('*', async (req, res) => {
        res.sendFile(path.resolve(process.cwd(), 'dist', 'index.html'));
      });
    } else {
      const { createServer } = await import('vite');

      const vite = await createServer({
        server: { middlewareMode: true },
        appType: 'spa',
      });

      app.use(vite.middlewares);
    }

    // IMPORTANT:
    // Listen on all network interfaces so your Android phone
    // can access this backend through your laptop's Wi-Fi IP.
    const server = app.listen(port, '0.0.0.0', () => {
      console.log('--------------------------------------');
      console.log('       VeeraGym Backend Started       ');
      console.log('--------------------------------------');
      console.log(`Port: ${port}`);
      console.log('Host: 0.0.0.0');
      console.log(`Local API: http://localhost:${port}`);
      console.log(`Phone API: http://YOUR_LAPTOP_IP:${port}`);
      console.log('Keep this terminal running while testing.');
      console.log('--------------------------------------');
    });

    server.on('error', (error: any) => {
      if (error.code === 'EADDRINUSE') {
        console.error(`Port ${port} is already in use.`);
      } else {
        console.error('Server startup error:', error);
      }
    });

  } catch (error) {
    console.error('Failed to start VeeraGym server:', error);
    process.exit(1);
  }
}


 
// Start the server locally, but let Vercel manage it in production.
if (!process.env.VERCEL) {
  startServer();
}

// Export the Express app for Vercel.
export default app;


