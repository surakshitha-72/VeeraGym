import express from 'express';
import dotenv from 'dotenv';
import path from 'path';
import { GoogleGenAI, Type } from '@google/genai';
import { db, getTodayDateString } from './server/db.ts';
import { parseVoiceTranscriptRobust } from './server/voiceParser.ts';

dotenv.config();

const app = express();
const port = 3000;

app.use(express.json());

// Server-side Gemini Client for voice transcript parsing and intelligent extraction
const ai = new GoogleGenAI({
  apiKey: process.env.GEMINI_API_KEY,
  httpOptions: {
    headers: {
      'User-Agent': 'aistudio-build',
    },
  },
});

// --- API Endpoints ---

// Dashboard statistics
app.get('/api/dashboard/stats', (req, res) => {
  try {
    const stats = db.getDashboardStats();
    res.json(stats);
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

// Customers CRUD
app.get('/api/customers', (req, res) => {
  try {
    const { category, status, search } = req.query;
    const list = db.getCustomers(category as any, status as string, search as string);
    res.json(list);
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

app.get('/api/customers/:id', (req, res) => {
  try {
    const customer = db.getCustomerById(req.params.id);
    if (!customer) {
      return res.status(404).json({ error: 'Customer not found' });
    }
    res.json(customer);
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

app.post('/api/customers', (req, res) => {
  try {
    const { name, phone, weightKg, category, joiningDate, firstPaymentDate, amountPaid, paymentMethod, notes } = req.body;
    if (!name || !phone || !category) {
      return res.status(400).json({ error: 'Name, phone number, and category are required' });
    }
    const result = db.createCustomer({
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

app.put('/api/customers/:id', (req, res) => {
  try {
    const updated = db.updateCustomer(req.params.id, req.body);
    res.json(updated);
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

app.delete('/api/customers/:id', (req, res) => {
  try {
    const ok = db.deleteCustomer(req.params.id);
    if (!ok) return res.status(404).json({ error: 'Customer not found' });
    res.json({ success: true });
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

// Individual Customer Monthly Payment Maintenance Register
app.get('/api/customers/:id/register', (req, res) => {
  try {
    const year = Number(req.query.year) || new Date().getFullYear();
    const register = db.getCustomerRegister(req.params.id, year);
    res.json(register);
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

app.post('/api/customers/:id/register-status', (req, res) => {
  try {
    const { year, monthIndex, isActive, isInactive } = req.body;
    const register = db.updateMonthStatus(
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
app.get('/api/payments', (req, res) => {
  try {
    const { customerId, category, month, year, search } = req.query;
    const payments = db.getPayments({
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

app.post('/api/payments', (req, res) => {
  try {
    const { customerId, amount, paymentDate, month, year, paymentMethod, notes } = req.body;
    if (!customerId || !amount || !paymentDate || !month || !year) {
      return res.status(400).json({ error: 'All payment fields are required' });
    }
    const result = db.recordPayment({
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
app.get('/api/reminders', (req, res) => {
  try {
    const reminders = db.getRenewalReminders();
    res.json(reminders);
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

app.put('/api/reminders/:id', (req, res) => {
  try {
    const updated = db.updateReminder(req.params.id, req.body);
    res.json(updated);
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

app.post('/api/reminders/:id/notify', (req, res) => {
  try {
    const nowStr = new Date().toISOString();
    const updated = db.updateReminder(req.params.id, {
      status: 'Sent',
      lastNotifiedAt: nowStr,
    });
    res.json(updated);
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

// Voice Registration parsing with Gemini 3.8 Flash + Resilient NLP Engine fallback
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
   - If Cardio, monthly fee is 1000 rupees.
   - If Non-Cardio, monthly fee is 600 rupees.
   - If the speech says 600 rupees, category is "non-cardio". If 1000 rupees, category is "cardio".
2. Extract the customer's full name.
3. Extract mobile/phone number (10 digits if possible). If spoken as words, convert to digits.
4. Extract weight in kilograms (numeric).
5. Extract joining date (YYYY-MM-DD format). If not specified, use "${todayStr}".
6. Extract first payment date (YYYY-MM-DD format) if mentioned, or null.
7. Extract amount paid (numeric 600, 1000, etc.) if mentioned.
8. Extract payment method (Cash, UPI / GPay / PhonePe, Card, Bank Transfer) if mentioned.
9. Any other notes.`;

      const response = await ai.models.generateContent({
        model: 'gemini-3.8-flash',
        contents: prompt,
        config: {
          responseMimeType: 'application/json',
          responseSchema: {
            type: Type.OBJECT,
            properties: {
              name: { type: Type.STRING, description: "Customer's full name" },
              phone: { type: Type.STRING, description: '10-digit mobile number' },
              weightKg: { type: Type.NUMBER, description: 'Weight in kg' },
              category: { type: Type.STRING, description: "'cardio' or 'non-cardio'" },
              monthlyFee: { type: Type.NUMBER, description: 'Monthly fee (600 or 1000)' },
              joiningDate: { type: Type.STRING, description: 'YYYY-MM-DD' },
              firstPaymentDate: { type: Type.STRING, description: 'YYYY-MM-DD or empty' },
              amountPaid: { type: Type.NUMBER, description: 'Amount paid initially or 0' },
              paymentMethod: { type: Type.STRING, description: 'Payment method or empty' },
              notes: { type: Type.STRING, description: 'Additional notes or empty' },
            },
            required: ['name', 'phone', 'category'],
          },
        },
      });

      const parsed = JSON.parse(response.text || '{}');

      // Normalize category
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
        parsed.category = (parsed.monthlyFee === 1000 || parsed.amountPaid === 1000) ? 'cardio' : 'non-cardio';
        parsed.monthlyFee = parsed.category === 'cardio' ? 1000 : 600;
      }

      if (!parsed.joiningDate) {
        parsed.joiningDate = todayStr;
      }

      return res.json(parsed);
    } catch (aiErr: any) {
      console.warn('Gemini API call failed, using high-speed local NLP parser fallback:', aiErr.message);
      // Fallback to robust rule-based extractor
      const robustResult = parseVoiceTranscriptRobust(transcript, todayStr);
      return res.json(robustResult);
    }
  } catch (err: any) {
    console.error('Error in /api/parse-voice:', err);
    res.status(500).json({ error: err.message || 'Failed to parse voice transcript' });
  }
});

// Periodic reminder checker (runs every 30 minutes in background)
setInterval(() => {
  try {
    db.getRenewalReminders();
  } catch (err) {
    console.error('Background reminder check error:', err);
  }
}, 30 * 60 * 1000);

// Setup Vite middleware in development or serve static in production
async function startServer() {
  if (process.env.NODE_ENV === 'production') {
    app.use(express.static(path.resolve(process.cwd(), 'dist')));
    app.get('*', (req, res) => {
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

  app.listen(port, '0.0.0.0', () => {
    console.log(`VeeraGym server running on port ${port}`);
  });
}

startServer();
