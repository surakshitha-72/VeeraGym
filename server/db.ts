import fs from 'fs';
import path from 'path';
import { Customer, CustomerCategory, CustomerMonthOverride, DashboardStats, MonthRegisterRow, PaymentRecord, RenewalReminder } from '../src/types.ts';

const DATA_DIR = path.resolve(process.cwd(), 'data');
const DB_FILE = path.join(DATA_DIR, 'gym_database.json');

interface DatabaseSchema {
  customers: Customer[];
  payments: PaymentRecord[];
  monthOverrides: CustomerMonthOverride[];
  reminders: RenewalReminder[];
  settings: {
    gymName: string;
    lastAutoCheck: string;
  };
}

const MONTH_NAMES = [
  'January', 'February', 'March', 'April', 'May', 'June',
  'July', 'August', 'September', 'October', 'November', 'December'
];

// Helper to add months accurately (handles 28/29/30/31 days safely)
export function addOneMonth(dateStr: string): string {
  const [y, m, d] = dateStr.split('-').map(Number);
  const targetMonth = m; // m is 1-12, target is m (which is next month 0-indexed: m-1 + 1 = m)
  const targetYear = targetMonth === 12 ? y + 1 : y;
  const nextMonthIndex = targetMonth === 12 ? 0 : targetMonth;

  // Max days in the next month
  const maxDays = new Date(targetYear, nextMonthIndex + 1, 0).getDate();
  const day = Math.min(d, maxDays);
  const mm = String(nextMonthIndex + 1).padStart(2, '0');
  const dd = String(day).padStart(2, '0');
  return `${targetYear}-${mm}-${dd}`;
}

// Subtract days (for 2 days before renewal)
export function subtractDays(dateStr: string, days: number): string {
  const [y, m, d] = dateStr.split('-').map(Number);
  const date = new Date(Date.UTC(y, m - 1, d));
  date.setUTCDate(date.getUTCDate() - days);
  const yyyy = date.getUTCFullYear();
  const mm = String(date.getUTCMonth() + 1).padStart(2, '0');
  const dd = String(date.getUTCDate()).padStart(2, '0');
  return `${yyyy}-${mm}-${dd}`;
}

// Format date to YYYY-MM-DD in UTC / local
export function getTodayDateString(): string {
  const now = new Date();
  const yyyy = now.getFullYear();
  const mm = String(now.getMonth() + 1).padStart(2, '0');
  const dd = String(now.getDate()).padStart(2, '0');
  return `${yyyy}-${mm}-${dd}`;
}

class Database {
  private data: DatabaseSchema = {
    customers: [],
    payments: [],
    monthOverrides: [],
    reminders: [],
    settings: {
      gymName: 'VeeraGym',
      lastAutoCheck: new Date().toISOString(),
    },
  };

  constructor() {
    this.ensureDataDir();
    this.load();
  }

  private ensureDataDir() {
    if (!fs.existsSync(DATA_DIR)) {
      fs.mkdirSync(DATA_DIR, { recursive: true });
    }
  }

  private load() {
    try {
      if (fs.existsSync(DB_FILE)) {
        const raw = fs.readFileSync(DB_FILE, 'utf-8');
        this.data = JSON.parse(raw);
      } else {
        this.seedInitialData();
        this.save();
      }
    } catch (err) {
      console.error('Error reading database, creating new state:', err);
      this.seedInitialData();
      this.save();
    }
  }

  public save() {
    try {
      this.ensureDataDir();
      const tempPath = `${DB_FILE}.tmp.${Date.now()}`;
      fs.writeFileSync(tempPath, JSON.stringify(this.data, null, 2), 'utf-8');
      fs.renameSync(tempPath, DB_FILE);
    } catch (err) {
      console.error('Error writing database file:', err);
    }
  }

  private seedInitialData() {
    const today = '2026-10-31';

    const customers: Customer[] = [
      {
        id: 'VG-1001',
        name: 'Rahul Kumar',
        phone: '9876543210',
        weightKg: 72,
        category: 'non-cardio',
        monthlyFee: 600,
        status: 'active',
        joiningDate: '2026-05-15',
        lastPaymentDate: '2026-10-15',
        nextRenewalDate: '2026-11-15',
        notes: 'Regular morning strength training',
        createdAt: '2026-05-15T08:00:00.000Z',
        updatedAt: '2026-10-15T09:30:00.000Z',
      },
      {
        id: 'VG-1002',
        name: 'Vikram Rathore',
        phone: '9845012345',
        weightKg: 84,
        category: 'cardio',
        monthlyFee: 1000,
        status: 'active',
        joiningDate: '2026-02-10',
        lastPaymentDate: '2026-10-10',
        nextRenewalDate: '2026-11-10',
        notes: 'Cardio + functional fitness package',
        createdAt: '2026-02-10T07:30:00.000Z',
        updatedAt: '2026-10-10T08:15:00.000Z',
      },
      {
        id: 'VG-1003',
        name: 'Priya Sharma',
        phone: '9711234567',
        weightKg: 58,
        category: 'non-cardio',
        monthlyFee: 600,
        status: 'active',
        joiningDate: '2026-06-01',
        lastPaymentDate: '2026-09-01',
        nextRenewalDate: '2026-10-01', // Past due!
        notes: 'Weight management and core conditioning',
        createdAt: '2026-06-01T09:00:00.000Z',
        updatedAt: '2026-09-01T10:00:00.000Z',
      },
      {
        id: 'VG-1004',
        name: 'Ananya Deshmukh',
        phone: '9822334455',
        weightKg: 62,
        category: 'cardio',
        monthlyFee: 1000,
        status: 'active',
        joiningDate: '2026-08-02',
        lastPaymentDate: '2026-10-02',
        nextRenewalDate: '2026-11-02', // Reminder is 2026-10-31 (Due Today!)
        notes: 'High intensity treadmill & cycling program',
        createdAt: '2026-08-02T11:00:00.000Z',
        updatedAt: '2026-10-02T12:00:00.000Z',
      },
      {
        id: 'VG-1005',
        name: 'Suresh Reddy',
        phone: '9944556677',
        weightKg: 79,
        category: 'non-cardio',
        monthlyFee: 600,
        status: 'active',
        joiningDate: '2026-01-20',
        lastPaymentDate: '2026-09-20',
        nextRenewalDate: '2026-10-20', // Overdue!
        notes: 'Free weights focus',
        createdAt: '2026-01-20T08:30:00.000Z',
        updatedAt: '2026-09-20T09:00:00.000Z',
      },
      {
        id: 'VG-1006',
        name: 'Karthik Nair',
        phone: '9888776655',
        weightKg: 75,
        category: 'cardio',
        monthlyFee: 1000,
        status: 'active',
        joiningDate: '2026-07-18',
        lastPaymentDate: '2026-10-18',
        nextRenewalDate: '2026-11-18',
        notes: 'Cross-trainer and weight resistance',
        createdAt: '2026-07-18T17:00:00.000Z',
        updatedAt: '2026-10-18T18:00:00.000Z',
      },
      {
        id: 'VG-1007',
        name: 'Deepak Varma',
        phone: '9765432109',
        weightKg: 68,
        category: 'non-cardio',
        monthlyFee: 600,
        status: 'inactive', // Inactive member
        joiningDate: '2025-11-10',
        lastPaymentDate: '2026-08-10',
        nextRenewalDate: '2026-09-10',
        notes: 'On temporary work travel',
        createdAt: '2025-11-10T10:00:00.000Z',
        updatedAt: '2026-09-12T14:00:00.000Z',
      },
      {
        id: 'VG-1008',
        name: 'Rohan Mehta',
        phone: '9833445566',
        weightKg: 88,
        category: 'cardio',
        monthlyFee: 1000,
        status: 'active',
        joiningDate: '2026-03-05',
        lastPaymentDate: '2026-10-05',
        nextRenewalDate: '2026-11-05',
        notes: 'Cardio endurance and barbell training',
        createdAt: '2026-03-05T06:30:00.000Z',
        updatedAt: '2026-10-05T07:15:00.000Z',
      },
    ];

    const payments: PaymentRecord[] = [
      // Rahul Kumar (non-cardio ₹600)
      { id: 'PAY-1001', customerId: 'VG-1001', customerName: 'Rahul Kumar', category: 'non-cardio', amount: 600, paymentDate: '2026-05-15', paymentPeriod: 'May 2026', month: 5, year: 2026, paymentMethod: 'UPI / GPay / PhonePe', status: 'Completed', createdAt: '2026-05-15T08:00:00.000Z' },
      { id: 'PAY-1002', customerId: 'VG-1001', customerName: 'Rahul Kumar', category: 'non-cardio', amount: 600, paymentDate: '2026-06-15', paymentPeriod: 'June 2026', month: 6, year: 2026, paymentMethod: 'Cash', status: 'Completed', createdAt: '2026-06-15T08:00:00.000Z' },
      { id: 'PAY-1003', customerId: 'VG-1001', customerName: 'Rahul Kumar', category: 'non-cardio', amount: 600, paymentDate: '2026-07-15', paymentPeriod: 'July 2026', month: 7, year: 2026, paymentMethod: 'UPI / GPay / PhonePe', status: 'Completed', createdAt: '2026-07-15T08:00:00.000Z' },
      { id: 'PAY-1004', customerId: 'VG-1001', customerName: 'Rahul Kumar', category: 'non-cardio', amount: 600, paymentDate: '2026-08-15', paymentPeriod: 'August 2026', month: 8, year: 2026, paymentMethod: 'UPI / GPay / PhonePe', status: 'Completed', createdAt: '2026-08-15T08:00:00.000Z' },
      { id: 'PAY-1005', customerId: 'VG-1001', customerName: 'Rahul Kumar', category: 'non-cardio', amount: 600, paymentDate: '2026-09-15', paymentPeriod: 'September 2026', month: 9, year: 2026, paymentMethod: 'Cash', status: 'Completed', createdAt: '2026-09-15T08:00:00.000Z' },
      { id: 'PAY-1006', customerId: 'VG-1001', customerName: 'Rahul Kumar', category: 'non-cardio', amount: 600, paymentDate: '2026-10-15', paymentPeriod: 'October 2026', month: 10, year: 2026, paymentMethod: 'UPI / GPay / PhonePe', status: 'Completed', createdAt: '2026-10-15T09:30:00.000Z' },

      // Vikram Rathore (cardio ₹1000)
      { id: 'PAY-1007', customerId: 'VG-1002', customerName: 'Vikram Rathore', category: 'cardio', amount: 1000, paymentDate: '2026-08-10', paymentPeriod: 'August 2026', month: 8, year: 2026, paymentMethod: 'Card', status: 'Completed', createdAt: '2026-08-10T08:00:00.000Z' },
      { id: 'PAY-1008', customerId: 'VG-1002', customerName: 'Vikram Rathore', category: 'cardio', amount: 1000, paymentDate: '2026-09-10', paymentPeriod: 'September 2026', month: 9, year: 2026, paymentMethod: 'UPI / GPay / PhonePe', status: 'Completed', createdAt: '2026-09-10T08:00:00.000Z' },
      { id: 'PAY-1009', customerId: 'VG-1002', customerName: 'Vikram Rathore', category: 'cardio', amount: 1000, paymentDate: '2026-10-10', paymentPeriod: 'October 2026', month: 10, year: 2026, paymentMethod: 'UPI / GPay / PhonePe', status: 'Completed', createdAt: '2026-10-10T08:15:00.000Z' },

      // Priya Sharma (non-cardio ₹600) - Paid until Sept, Oct pending
      { id: 'PAY-1010', customerId: 'VG-1003', customerName: 'Priya Sharma', category: 'non-cardio', amount: 600, paymentDate: '2026-08-01', paymentPeriod: 'August 2026', month: 8, year: 2026, paymentMethod: 'Cash', status: 'Completed', createdAt: '2026-08-01T09:00:00.000Z' },
      { id: 'PAY-1011', customerId: 'VG-1003', customerName: 'Priya Sharma', category: 'non-cardio', amount: 600, paymentDate: '2026-09-01', paymentPeriod: 'September 2026', month: 9, year: 2026, paymentMethod: 'UPI / GPay / PhonePe', status: 'Completed', createdAt: '2026-09-01T10:00:00.000Z' },

      // Ananya Deshmukh (cardio ₹1000)
      { id: 'PAY-1012', customerId: 'VG-1004', customerName: 'Ananya Deshmukh', category: 'cardio', amount: 1000, paymentDate: '2026-08-02', paymentPeriod: 'August 2026', month: 8, year: 2026, paymentMethod: 'UPI / GPay / PhonePe', status: 'Completed', createdAt: '2026-08-02T11:00:00.000Z' },
      { id: 'PAY-1013', customerId: 'VG-1004', customerName: 'Ananya Deshmukh', category: 'cardio', amount: 1000, paymentDate: '2026-09-02', paymentPeriod: 'September 2026', month: 9, year: 2026, paymentMethod: 'UPI / GPay / PhonePe', status: 'Completed', createdAt: '2026-09-02T11:00:00.000Z' },
      { id: 'PAY-1014', customerId: 'VG-1004', customerName: 'Ananya Deshmukh', category: 'cardio', amount: 1000, paymentDate: '2026-10-02', paymentPeriod: 'October 2026', month: 10, year: 2026, paymentMethod: 'Card', status: 'Completed', createdAt: '2026-10-02T12:00:00.000Z' },

      // Suresh Reddy (non-cardio ₹600)
      { id: 'PAY-1015', customerId: 'VG-1005', customerName: 'Suresh Reddy', category: 'non-cardio', amount: 600, paymentDate: '2026-08-20', paymentPeriod: 'August 2026', month: 8, year: 2026, paymentMethod: 'Cash', status: 'Completed', createdAt: '2026-08-20T08:30:00.000Z' },
      { id: 'PAY-1016', customerId: 'VG-1005', customerName: 'Suresh Reddy', category: 'non-cardio', amount: 600, paymentDate: '2026-09-20', paymentPeriod: 'September 2026', month: 9, year: 2026, paymentMethod: 'Cash', status: 'Completed', createdAt: '2026-09-20T09:00:00.000Z' },

      // Karthik Nair (cardio ₹1000)
      { id: 'PAY-1017', customerId: 'VG-1006', customerName: 'Karthik Nair', category: 'cardio', amount: 1000, paymentDate: '2026-09-18', paymentPeriod: 'September 2026', month: 9, year: 2026, paymentMethod: 'UPI / GPay / PhonePe', status: 'Completed', createdAt: '2026-09-18T17:00:00.000Z' },
      { id: 'PAY-1018', customerId: 'VG-1006', customerName: 'Karthik Nair', category: 'cardio', amount: 1000, paymentDate: '2026-10-18', paymentPeriod: 'October 2026', month: 10, year: 2026, paymentMethod: 'UPI / GPay / PhonePe', status: 'Completed', createdAt: '2026-10-18T18:00:00.000Z' },

      // Deepak Varma (non-cardio ₹600)
      { id: 'PAY-1019', customerId: 'VG-1007', customerName: 'Deepak Varma', category: 'non-cardio', amount: 600, paymentDate: '2026-07-10', paymentPeriod: 'July 2026', month: 7, year: 2026, paymentMethod: 'Cash', status: 'Completed', createdAt: '2026-07-10T10:00:00.000Z' },
      { id: 'PAY-1020', customerId: 'VG-1007', customerName: 'Deepak Varma', category: 'non-cardio', amount: 600, paymentDate: '2026-08-10', paymentPeriod: 'August 2026', month: 8, year: 2026, paymentMethod: 'Cash', status: 'Completed', createdAt: '2026-08-10T10:00:00.000Z' },

      // Rohan Mehta (cardio ₹1000)
      { id: 'PAY-1021', customerId: 'VG-1008', customerName: 'Rohan Mehta', category: 'cardio', amount: 1000, paymentDate: '2026-09-05', paymentPeriod: 'September 2026', month: 9, year: 2026, paymentMethod: 'UPI / GPay / PhonePe', status: 'Completed', createdAt: '2026-09-05T06:30:00.000Z' },
      { id: 'PAY-1022', customerId: 'VG-1008', customerName: 'Rohan Mehta', category: 'cardio', amount: 1000, paymentDate: '2026-10-05', paymentPeriod: 'October 2026', month: 10, year: 2026, paymentMethod: 'UPI / GPay / PhonePe', status: 'Completed', createdAt: '2026-10-05T07:15:00.000Z' },
    ];

    this.data.customers = customers;
    this.data.payments = payments;
    this.data.monthOverrides = [];
    this.refreshRemindersInternal();
  }

  public getCustomers(category?: CustomerCategory, status?: string, search?: string): Customer[] {
    return this.data.customers.filter((c) => {
      if (category && c.category !== category) return false;
      if (status && c.status !== status) return false;
      if (search) {
        const q = search.toLowerCase().trim();
        const matchesName = c.name.toLowerCase().includes(q);
        const matchesPhone = c.phone.includes(q);
        const matchesId = c.id.toLowerCase().includes(q);
        if (!matchesName && !matchesPhone && !matchesId) return false;
      }
      return true;
    });
  }

  public getCustomerById(id: string): Customer | undefined {
    return this.data.customers.find((c) => c.id === id);
  }

  public createCustomer(input: {
    name: string;
    phone: string;
    weightKg: number;
    category: CustomerCategory;
    joiningDate: string;
    firstPaymentDate?: string;
    amountPaid?: number;
    paymentMethod?: string;
    notes?: string;
  }): { customer: Customer; payment?: PaymentRecord } {
    const fee = input.category === 'cardio' ? 1000 : 600;
    const nextIdNum = this.data.customers.length > 0
      ? Math.max(...this.data.customers.map(c => parseInt(c.id.replace('VG-', '')) || 1000)) + 1
      : 1001;
    const customerId = `VG-${nextIdNum}`;

    const joiningDate = input.joiningDate || getTodayDateString();
    let lastPaymentDate = '';
    let nextRenewalDate = addOneMonth(joiningDate);

    let paymentRecord: PaymentRecord | undefined = undefined;

    if (input.firstPaymentDate && (input.amountPaid ?? fee) > 0) {
      lastPaymentDate = input.firstPaymentDate;
      nextRenewalDate = addOneMonth(lastPaymentDate);

      const [y, m] = input.firstPaymentDate.split('-').map(Number);
      const payIdNum = this.data.payments.length > 0
        ? Math.max(...this.data.payments.map(p => parseInt(p.id.replace('PAY-', '')) || 1000)) + 1
        : 1001;

      paymentRecord = {
        id: `PAY-${payIdNum}`,
        customerId,
        customerName: input.name,
        category: input.category,
        amount: input.amountPaid ?? fee,
        paymentDate: input.firstPaymentDate,
        paymentPeriod: `${MONTH_NAMES[m - 1]} ${y}`,
        month: m,
        year: y,
        paymentMethod: (input.paymentMethod as any) || 'UPI / GPay / PhonePe',
        status: 'Completed',
        notes: 'Initial registration payment',
        createdAt: new Date().toISOString(),
      };
      this.data.payments.push(paymentRecord);
    }

    const newCustomer: Customer = {
      id: customerId,
      name: input.name.trim(),
      phone: input.phone.trim(),
      weightKg: Number(input.weightKg) || 0,
      category: input.category,
      monthlyFee: fee,
      status: 'active',
      joiningDate,
      lastPaymentDate: lastPaymentDate || joiningDate,
      nextRenewalDate,
      notes: input.notes?.trim() || '',
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    };

    this.data.customers.push(newCustomer);
    this.refreshRemindersInternal();
    this.save();

    return { customer: newCustomer, payment: paymentRecord };
  }

  public updateCustomer(id: string, updates: Partial<Customer>): Customer {
    const idx = this.data.customers.findIndex((c) => c.id === id);
    if (idx === -1) throw new Error(`Customer ${id} not found`);

    const existing = this.data.customers[idx];
    const newCategory = updates.category ?? existing.category;
    const newMonthlyFee = newCategory === 'cardio' ? 1000 : 600;

    const updated: Customer = {
      ...existing,
      ...updates,
      category: newCategory,
      monthlyFee: newMonthlyFee,
      updatedAt: new Date().toISOString(),
    };

    this.data.customers[idx] = updated;

    // If status changed or renewal date changed, refresh reminders
    this.refreshRemindersInternal();
    this.save();
    return updated;
  }

  public deleteCustomer(id: string): boolean {
    const idx = this.data.customers.findIndex((c) => c.id === id);
    if (idx === -1) return false;
    this.data.customers.splice(idx, 1);
    this.data.payments = this.data.payments.filter(p => p.customerId !== id);
    this.data.reminders = this.data.reminders.filter(r => r.customerId !== id);
    this.data.monthOverrides = this.data.monthOverrides.filter(m => m.customerId !== id);
    this.save();
    return true;
  }

  public getPayments(filters?: { customerId?: string; category?: CustomerCategory; month?: number; year?: number; search?: string }): PaymentRecord[] {
    return this.data.payments.filter((p) => {
      if (filters?.customerId && p.customerId !== filters.customerId) return false;
      if (filters?.category && p.category !== filters.category) return false;
      if (filters?.month && p.month !== filters.month) return false;
      if (filters?.year && p.year !== filters.year) return false;
      if (filters?.search) {
        const q = filters.search.toLowerCase().trim();
        if (!p.customerName.toLowerCase().includes(q) && !p.id.toLowerCase().includes(q)) return false;
      }
      return true;
    }).sort((a, b) => b.paymentDate.localeCompare(a.paymentDate));
  }

  public recordPayment(input: {
    customerId: string;
    amount: number;
    paymentDate: string;
    month: number;
    year: number;
    paymentMethod: string;
    notes?: string;
  }): { payment: PaymentRecord; customer: Customer } {
    const customer = this.getCustomerById(input.customerId);
    if (!customer) throw new Error(`Customer ${input.customerId} not found`);

    // Check duplicate payment for this exact month and year
    const existing = this.data.payments.find(
      (p) => p.customerId === input.customerId && p.month === input.month && p.year === input.year
    );
    if (existing) {
      throw new Error(`Payment already recorded for ${MONTH_NAMES[input.month - 1]} ${input.year}`);
    }

    const payIdNum = this.data.payments.length > 0
      ? Math.max(...this.data.payments.map(p => parseInt(p.id.replace('PAY-', '')) || 1000)) + 1
      : 1001;

    const payment: PaymentRecord = {
      id: `PAY-${payIdNum}`,
      customerId: customer.id,
      customerName: customer.name,
      category: customer.category,
      amount: Number(input.amount),
      paymentDate: input.paymentDate,
      paymentPeriod: `${MONTH_NAMES[input.month - 1]} ${input.year}`,
      month: input.month,
      year: input.year,
      paymentMethod: (input.paymentMethod as any) || 'UPI / GPay / PhonePe',
      status: 'Completed',
      notes: input.notes?.trim() || '',
      createdAt: new Date().toISOString(),
    };

    this.data.payments.push(payment);

    // Update customer's lastPaymentDate and nextRenewalDate
    // The next renewal date advances 1 month from payment date or current cycle
    const newLastPayment = input.paymentDate > customer.lastPaymentDate ? input.paymentDate : customer.lastPaymentDate;
    const newRenewalDate = addOneMonth(input.paymentDate);

    customer.lastPaymentDate = newLastPayment;
    if (newRenewalDate > customer.nextRenewalDate) {
      customer.nextRenewalDate = newRenewalDate;
    }
    customer.updatedAt = new Date().toISOString();

    this.refreshRemindersInternal();
    this.save();

    return { payment, customer };
  }

  // Returns customer's individual 12-month register for specified year
  public getCustomerRegister(customerId: string, year: number): MonthRegisterRow[] {
    const customer = this.getCustomerById(customerId);
    if (!customer) throw new Error(`Customer ${customerId} not found`);

    const customerPayments = this.data.payments.filter(
      (p) => p.customerId === customerId && p.year === year
    );

    const [joinYear, joinMonth] = customer.joiningDate.split('-').map(Number);
    const today = getTodayDateString();
    const [currentYear, currentMonth] = today.split('-').map(Number);

    const rows: MonthRegisterRow[] = [];

    for (let m = 1; m <= 12; m++) {
      const monthIdx = m - 1;
      const monthName = MONTH_NAMES[monthIdx];
      const payment = customerPayments.find((p) => p.month === m);

      // Check if user set an override for active/inactive for this month
      const override = this.data.monthOverrides.find(
        (o) => o.customerId === customerId && o.year === year && o.monthIndex === monthIdx
      );

      let isActive = true;
      let isInactive = false;

      if (override) {
        isActive = override.isActive;
        isInactive = override.isInactive;
      } else {
        // If customer joined after this month/year, not active yet
        const monthDateStr = `${year}-${String(m).padStart(2, '0')}-01`;
        const joinDateCompare = `${joinYear}-${String(joinMonth).padStart(2, '0')}-01`;
        if (monthDateStr < joinDateCompare) {
          isActive = false;
          isInactive = true;
        } else if (customer.status === 'inactive' && monthDateStr > customer.updatedAt.slice(0, 10)) {
          isActive = false;
          isInactive = true;
        }
      }

      // Payments tick marks
      let paid600 = false;
      let paid1000 = false;

      if (payment) {
        if (payment.amount === 600 || payment.category === 'non-cardio') {
          paid600 = true;
        } else if (payment.amount >= 1000 || payment.category === 'cardio') {
          paid1000 = true;
        }
      }

      // Check if Not Paid: Active in this month, month has occurred/past, and no payment
      const isPastOrCurrentMonth = year < currentYear || (year === currentYear && m <= currentMonth);
      const isAfterJoining = year > joinYear || (year === joinYear && m >= joinMonth);
      const isNotPaid = !payment && isActive && isPastOrCurrentMonth && isAfterJoining;

      rows.push({
        monthIndex: monthIdx,
        monthName,
        year,
        paid600,
        paid1000,
        isNotPaid,
        isActive,
        isInactive,
        paymentId: payment?.id,
        paymentDetails: payment
          ? {
              amount: payment.amount,
              paymentDate: payment.paymentDate,
              paymentMethod: payment.paymentMethod,
              period: payment.paymentPeriod,
              notes: payment.notes,
            }
          : undefined,
      });
    }

    return rows;
  }

  public updateMonthStatus(
    customerId: string,
    year: number,
    monthIndex: number,
    isActive: boolean,
    isInactive: boolean
  ) {
    // Mutually exclusive enforcement
    const finalActive = isActive;
    const finalInactive = !isActive;

    const existingIdx = this.data.monthOverrides.findIndex(
      (o) => o.customerId === customerId && o.year === year && o.monthIndex === monthIndex
    );

    if (existingIdx >= 0) {
      this.data.monthOverrides[existingIdx].isActive = finalActive;
      this.data.monthOverrides[existingIdx].isInactive = finalInactive;
    } else {
      this.data.monthOverrides.push({
        customerId,
        year,
        monthIndex,
        isActive: finalActive,
        isInactive: finalInactive,
      });
    }

    this.save();
    return this.getCustomerRegister(customerId, year);
  }

  // Renewal reminders logic
  private refreshRemindersInternal() {
    const today = getTodayDateString();

    const reminders: RenewalReminder[] = [];

    // Filter only ACTIVE customers
    const activeCustomers = this.data.customers.filter((c) => c.status === 'active');

    for (const customer of activeCustomers) {
      const renewalDate = customer.nextRenewalDate;
      const reminderDate = subtractDays(renewalDate, 2);

      // Check existing reminder state (enabled/disabled, lastNotifiedAt)
      const existing = this.data.reminders.find(
        (r) => r.customerId === customer.id && r.renewalDate === renewalDate
      );

      let status: 'Upcoming' | 'Due Today' | 'Pending / Overdue' | 'Sent' | 'Paid' = 'Upcoming';

      // Check if already paid for the renewal period
      const [rY, rM] = renewalDate.split('-').map(Number);
      const hasPaid = this.data.payments.some(
        (p) => p.customerId === customer.id && p.year === rY && p.month === rM
      );

      if (hasPaid) {
        status = 'Paid';
      } else if (today > renewalDate) {
        status = 'Pending / Overdue';
      } else if (today >= reminderDate && today <= renewalDate) {
        status = 'Due Today';
      } else {
        status = 'Upcoming';
      }

      reminders.push({
        id: existing?.id || `REM-${customer.id}-${renewalDate}`,
        customerId: customer.id,
        customerName: customer.name,
        phone: customer.phone,
        category: customer.category,
        amountDue: customer.monthlyFee,
        renewalDate,
        reminderDate,
        status,
        enabled: existing ? existing.enabled : true,
        lastNotifiedAt: existing?.lastNotifiedAt,
      });
    }

    this.data.reminders = reminders;
  }

  public getRenewalReminders(): RenewalReminder[] {
    this.refreshRemindersInternal();
    return this.data.reminders;
  }

  public updateReminder(id: string, updates: Partial<RenewalReminder>): RenewalReminder {
    const idx = this.data.reminders.findIndex((r) => r.id === id);
    if (idx === -1) throw new Error(`Reminder ${id} not found`);

    const updated = { ...this.data.reminders[idx], ...updates };
    this.data.reminders[idx] = updated;
    this.save();
    return updated;
  }

  public getDashboardStats(): DashboardStats {
    const today = getTodayDateString();
    const [currY, currM] = today.split('-').map(Number);

    const totalCustomers = this.data.customers.length;
    const cardioCustomers = this.data.customers.filter((c) => c.category === 'cardio').length;
    const nonCardioCustomers = this.data.customers.filter((c) => c.category === 'non-cardio').length;

    // Pending payments: Active customers who have not paid for the current month
    const pendingCustomers: Customer[] = [];

    for (const customer of this.data.customers) {
      if (customer.status !== 'active') continue;

      // Check if paid for current month
      const paidThisMonth = this.data.payments.some(
        (p) => p.customerId === customer.id && p.year === currY && p.month === currM
      );

      // Or nextRenewalDate <= today
      if (!paidThisMonth || customer.nextRenewalDate <= today) {
        pendingCustomers.push(customer);
      }
    }

    // Monthly revenue collected for current month
    const monthlyRevenue = this.data.payments
      .filter((p) => p.year === currY && p.month === currM)
      .reduce((sum, p) => sum + p.amount, 0);

    return {
      totalCustomers,
      cardioCustomers,
      nonCardioCustomers,
      pendingPayments: pendingCustomers.length,
      pendingCustomers,
      monthlyRevenue,
    };
  }
}

export const db = new Database();
