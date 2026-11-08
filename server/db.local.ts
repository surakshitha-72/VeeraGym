import fs from 'fs';
import path from 'path';
import { Customer, CustomerCategory, CustomerMonthOverride, DashboardStats, MonthRegisterRow, PaymentRecord, RenewalReminder, StoredPushSubscription } from '../src/types.ts';

const DATA_DIR = path.resolve(process.cwd(), 'data');
const DB_FILE = path.join(DATA_DIR, 'gym_database.json');
interface StoredFCMDevice {
  token: string;
  platform: string;
  userAgent?: string;
  createdAt: string;
  updatedAt: string;
}
interface DatabaseSchema {
  customers: Customer[];
  payments: PaymentRecord[];
  monthOverrides: CustomerMonthOverride[];
  reminders: RenewalReminder[];

  settings: {
    gymName: string;
    lastAutoCheck: string;
    vapidKeys?: {
      publicKey: string;
      privateKey: string;
    };
  };
  pushSubscriptions?: StoredPushSubscription[];
  fcmDevices?: StoredFCMDevice[];
  sentRenewalNotifications?: string[];
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

// Calculate difference in days (dateStrB - dateStrA)
export function daysBetween(dateStrA: string, dateStrB: string): number {
  const [y1, m1, d1] = dateStrA.split('-').map(Number);
  const [y2, m2, d2] = dateStrB.split('-').map(Number);
  const utc1 = Date.UTC(y1, m1 - 1, d1);
  const utc2 = Date.UTC(y2, m2 - 1, d2);
  const msPerDay = 1000 * 60 * 60 * 24;
  return Math.round((utc2 - utc1) / msPerDay);
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
    pushSubscriptions: [],
    fcmDevices: [],
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
        if (!Array.isArray(this.data.customers)) this.data.customers = [];
        if (!Array.isArray(this.data.payments)) this.data.payments = [];
        if (!Array.isArray(this.data.monthOverrides)) this.data.monthOverrides = [];
        if (!Array.isArray(this.data.reminders)) this.data.reminders = [];
        if (!Array.isArray(this.data.pushSubscriptions)) this.data.pushSubscriptions = [];
        if (!Array.isArray(this.data.fcmDevices)) this.data.fcmDevices = [];
        if (!Array.isArray(this.data.sentRenewalNotifications)) {
  this.data.sentRenewalNotifications = [];
}
        if (!this.data.settings) {
          this.data.settings = { gymName: 'VeeraGym', lastAutoCheck: new Date().toISOString() };
        }
      } else {
        this.initEmptyData();
        this.save();
      }
    } catch (err) {
      console.error('Error reading database, creating new state:', err);
      this.initEmptyData();
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

  private initEmptyData() {
    this.data.customers = [];
    this.data.payments = [];
    this.data.monthOverrides = [];
    this.data.reminders = [];
    this.data.pushSubscriptions = [];
this.data.fcmDevices = [];
this.data.sentRenewalNotifications = [];
    this.data.settings = {
      gymName: 'VeeraGym',
      lastAutoCheck: new Date().toISOString(),
    };
  }

  public resetAllData() {
    this.initEmptyData();
    this.save();
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
  public hasSentRenewalNotification(customerId: string, renewalDate: string): boolean {
  const key = `${customerId}_${renewalDate}`;
  return (this.data.sentRenewalNotifications || []).includes(key);
}

public markRenewalNotificationSent(customerId: string, renewalDate: string): void {
  if (!Array.isArray(this.data.sentRenewalNotifications)) {
    this.data.sentRenewalNotifications = [];
  }

  const key = `${customerId}_${renewalDate}`;

  if (!this.data.sentRenewalNotifications.includes(key)) {
    this.data.sentRenewalNotifications.push(key);
    this.save();
  }
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

  // Push Subscription Management
  public getPushSubscriptions(): StoredPushSubscription[] {
    return this.data.pushSubscriptions || [];
  }

  public savePushSubscription(sub: StoredPushSubscription): void {
    if (!Array.isArray(this.data.pushSubscriptions)) {
      this.data.pushSubscriptions = [];
    }
    const idx = this.data.pushSubscriptions.findIndex((s) => s.endpoint === sub.endpoint);
    if (idx >= 0) {
      this.data.pushSubscriptions[idx] = sub;
    } else {
      this.data.pushSubscriptions.push(sub);
    }
    this.save();
  }

  public removePushSubscription(endpoint: string): void {
    if (!Array.isArray(this.data.pushSubscriptions)) return;
    this.data.pushSubscriptions = this.data.pushSubscriptions.filter((s) => s.endpoint !== endpoint);
    this.save();
  }
// Firebase Cloud Messaging device management
public getFCMDevices(): StoredFCMDevice[] {
  return this.data.fcmDevices || [];
}

public saveFCMDevice(device: StoredFCMDevice): void {
  if (!Array.isArray(this.data.fcmDevices)) {
    this.data.fcmDevices = [];
  }

  const index = this.data.fcmDevices.findIndex(
    (item) => item.token === device.token
  );

  if (index >= 0) {
    this.data.fcmDevices[index] = {
      ...this.data.fcmDevices[index],
      ...device,
      updatedAt: new Date().toISOString(),
    };
  } else {
    this.data.fcmDevices.push(device);
  }

  this.save();
}

public removeFCMDevice(token: string): void {
  if (!Array.isArray(this.data.fcmDevices)) return;

  this.data.fcmDevices = this.data.fcmDevices.filter(
    (device) => device.token !== token
  );

  this.save();
}
  public getVapidKeys(): { publicKey: string; privateKey: string } | undefined {
    return this.data.settings?.vapidKeys;
  }

  public setVapidKeys(keys: { publicKey: string; privateKey: string }): void {
    if (!this.data.settings) {
      this.data.settings = { gymName: 'VeeraGym', lastAutoCheck: new Date().toISOString() };
    }
    this.data.settings.vapidKeys = keys;
    this.save();
  }

  // Get upcoming renewal candidates for background push notification (span of 2 days before)
  public getUpcomingRenewalsForNotification(maxDaysAhead: number = 2) {
    const today = getTodayDateString();
    this.refreshRemindersInternal();

    // Active customers with enabled reminders due within maxDaysAhead days
    const results: Array<{
      customerId: string;
      customerName: string;
      phone: string;
      category: CustomerCategory;
      amountDue: number;
      renewalDate: string;
      daysRemaining: number;
      daysText: string;
      status: string;
    }> = [];

    const activeCustomers = this.data.customers.filter((c) => c.status === 'active');

    for (const customer of activeCustomers) {
      const renewalDate = customer.nextRenewalDate;
      const days = daysBetween(today, renewalDate);

      // Check if already paid for the renewal period
      const [rY, rM] = renewalDate.split('-').map(Number);
      const hasPaid = this.data.payments.some(
        (p) => p.customerId === customer.id && p.year === rY && p.month === rM
      );

      if (hasPaid) continue;
      // Skip renewal notifications that have already been sent
if (this.hasSentRenewalNotification(customer.id, renewalDate)) {
  continue;
}

      // Span of 2 days before renewal: days <= 2
      // If days > 2, it's not time yet for the 2-day reminder
      if (days <= maxDaysAhead) {
        let daysText = `${days} days`;
        if (days === 0) daysText = 'Today';
        else if (days === 1) daysText = '1 day';
        else if (days < 0) daysText = `${Math.abs(days)} days overdue`;

        results.push({
          customerId: customer.id,
          customerName: customer.name,
          phone: customer.phone,
          category: customer.category,
          amountDue: customer.monthlyFee,
          renewalDate,
          daysRemaining: days,
          daysText,
          status: days < 0 ? 'Pending / Overdue' : (days <= 2 ? 'Due Today' : 'Upcoming'),
        });
      }
    }

    // Sort by most urgent (lowest days remaining first)
    results.sort((a, b) => a.daysRemaining - b.daysRemaining);
    return results;
  }
}

export const db = new Database();
