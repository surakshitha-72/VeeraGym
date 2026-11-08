import { supabase } from './supabase.ts';
import type {
  Customer,
  CustomerCategory,
  CustomerMonthOverride,
  DashboardStats,
  MonthRegisterRow,
  PaymentRecord,
  RenewalReminder,
  StoredPushSubscription,
} from '../src/types.ts';

interface StoredFCMDevice {
  token: string;
  platform: string;
  userAgent?: string;
  createdAt: string;
  updatedAt: string;
}

const MONTH_NAMES = [
  'January', 'February', 'March', 'April', 'May', 'June',
  'July', 'August', 'September', 'October', 'November', 'December',
];

export function addOneMonth(dateStr: string): string {
  const [year, month, day] = dateStr.split('-').map(Number);
  const targetYear = month === 12 ? year + 1 : year;
  const targetMonthIndex = month === 12 ? 0 : month;
  const maxDays = new Date(targetYear, targetMonthIndex + 1, 0).getDate();
  const targetDay = Math.min(day, maxDays);
  return `${targetYear}-${String(targetMonthIndex + 1).padStart(2, '0')}-${String(targetDay).padStart(2, '0')}`;
}

export function subtractDays(dateStr: string, days: number): string {
  const [year, month, day] = dateStr.split('-').map(Number);
  const date = new Date(Date.UTC(year, month - 1, day));
  date.setUTCDate(date.getUTCDate() - days);
  return date.toISOString().slice(0, 10);
}

export function daysBetween(dateStrA: string, dateStrB: string): number {
  const [y1, m1, d1] = dateStrA.split('-').map(Number);
  const [y2, m2, d2] = dateStrB.split('-').map(Number);
  return Math.round((Date.UTC(y2, m2 - 1, d2) - Date.UTC(y1, m1 - 1, d1)) / 86400000);
}

export function getTodayDateString(): string {
  const now = new Date();
  return `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}-${String(now.getDate()).padStart(2, '0')}`;
}
function checkError(error: { message: string } | null, operation: string): void {
  if (error) {
    console.error(`[VeeraGym Database] ${operation}:`, error.message);
    throw new Error(`${operation}: ${error.message}`);
  }
}

class SupabaseDatabase {
  private async getAll<T>(table: string): Promise<T[]> {
    const { data, error } = await supabase.from(table).select('data');
    checkError(error, `Fetch ${table}`);
    return (data || []).map((row: { data: T }) => row.data);
  }

  private async getOne<T>(table: string, column: string, value: string): Promise<T | undefined> {
    const { data, error } = await supabase.from(table).select('data').eq(column, value).maybeSingle();
    checkError(error, `Fetch ${table} record`);
    return data?.data as T | undefined;
  }

  // CUSTOMER OPERATIONS
  async getCustomers(category?: CustomerCategory, status?: string, search?: string): Promise<Customer[]> {
    let customers = await this.getAll<Customer>('customers');
    if (category) customers = customers.filter(c => c.category === category);
    if (status) customers = customers.filter(c => c.status === status);
    if (search) {
      const q = search.toLowerCase().trim();
      customers = customers.filter(c =>
        c.name.toLowerCase().includes(q) || c.phone.includes(q) || c.id.toLowerCase().includes(q)
      );
    }
    return customers;
  }

  async getCustomerById(id: string): Promise<Customer | undefined> {
    return this.getOne<Customer>('customers', 'id', id);
  }

async hasSentRenewalNotification(customerId: string, renewalDate: string): Promise<boolean> {
    const key = `${customerId}_${renewalDate}`;
    const { data, error } = await supabase
      .from('sent_renewal_notifications')
      .select('notification_key')
      .eq('notification_key', key)
      .maybeSingle();
    checkError(error, 'Check renewal notification history');
    return Boolean(data);
  }

  async markRenewalNotificationSent(customerId: string, renewalDate: string): Promise<void> {
    const key = `${customerId}_${renewalDate}`;
    const { error } = await supabase
      .from('sent_renewal_notifications')
      .upsert({ notification_key: key }, { onConflict: 'notification_key', ignoreDuplicates: true });
    checkError(error, 'Save renewal notification history');
  }

  async createCustomer(input: {
    name: string;
    phone: string;
    weightKg: number;
    category: CustomerCategory;
    joiningDate: string;
    firstPaymentDate?: string;
    amountPaid?: number;
    paymentMethod?: string;
    notes?: string;
  }): Promise<{ customer: Customer; payment?: PaymentRecord }> {
    const customers = await this.getAll<Customer>('customers');
    const fee = input.category === 'cardio' ? 1000 : 600;
    const nextIdNum = customers.length
      ? Math.max(...customers.map(c => parseInt(c.id.replace('VG-', ''), 10) || 1000)) + 1
      : 1001;
    const customerId = `VG-${nextIdNum}`;
    const joiningDate = input.joiningDate || getTodayDateString();
    let lastPaymentDate = '';
    let nextRenewalDate = addOneMonth(joiningDate);
    let paymentRecord: PaymentRecord | undefined;

    if (input.firstPaymentDate && (input.amountPaid ?? fee) > 0) {
      lastPaymentDate = input.firstPaymentDate;
      nextRenewalDate = addOneMonth(lastPaymentDate);
      const payments = await this.getAll<PaymentRecord>('payments');
      const [, month] = input.firstPaymentDate.split('-').map(Number);
      const year = Number(input.firstPaymentDate.slice(0, 4));
      const payIdNum = payments.length
        ? Math.max(...payments.map(p => parseInt(p.id.replace('PAY-', ''), 10) || 1000)) + 1
        : 1001;
      paymentRecord = {
        id: `PAY-${payIdNum}`,
        customerId,
        customerName: input.name,
        category: input.category,
        amount: input.amountPaid ?? fee,
        paymentDate: input.firstPaymentDate,
        paymentPeriod: `${MONTH_NAMES[month - 1]} ${year}`,
        month,
        year,
        paymentMethod: (input.paymentMethod as any) || 'UPI / GPay / PhonePe',
        status: 'Completed',
        notes: 'Initial registration payment',
        createdAt: new Date().toISOString(),
      };
    }

    const now = new Date().toISOString();
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
      createdAt: now,
      updatedAt: now,
    };

    const { error: customerError } = await supabase.from('customers').insert({ id: customerId, data: newCustomer });
    checkError(customerError, 'Create customer');

    if (paymentRecord) {
      const { error: paymentError } = await supabase.from('payments').insert({ id: paymentRecord.id, data: paymentRecord });
      if (paymentError) {
        await supabase.from('customers').delete().eq('id', customerId);
        checkError(paymentError, 'Create initial payment');
      }
    }

    await this.refreshRemindersInternal();
    return { customer: newCustomer, payment: paymentRecord };
  }
async updateCustomer(id: string, updates: Partial<Customer>): Promise<Customer> {
    const existing = await this.getCustomerById(id);
    if (!existing) throw new Error(`Customer ${id} not found`);
    const newCategory = updates.category ?? existing.category;
    const updated: Customer = {
      ...existing,
      ...updates,
      category: newCategory,
      monthlyFee: newCategory === 'cardio' ? 1000 : 600,
      updatedAt: new Date().toISOString(),
    };
    const { error } = await supabase.from('customers')
      .update({ data: updated, updated_at: new Date().toISOString() }).eq('id', id);
    checkError(error, 'Update customer');
    await this.refreshRemindersInternal();
    return updated;
  }

  async deleteCustomer(id: string): Promise<boolean> {
    const existing = await this.getCustomerById(id);
    if (!existing) return false;
    for (const table of ['payments', 'reminders', 'month_overrides']) {
      const { error } = await supabase.from(table).delete().filter('data->>customerId', 'eq', id);
      checkError(error, `Delete customer records from ${table}`);
    }
    const { error } = await supabase.from('customers').delete().eq('id', id);
    checkError(error, 'Delete customer');
    return true;
  }

  // PAYMENT OPERATIONS
  async getPayments(filters?: {
    customerId?: string;
    category?: CustomerCategory;
    month?: number;
    year?: number;
    search?: string;
  }): Promise<PaymentRecord[]> {
    let payments = await this.getAll<PaymentRecord>('payments');
    if (filters?.customerId) payments = payments.filter(p => p.customerId === filters.customerId);
    if (filters?.category) payments = payments.filter(p => p.category === filters.category);
    if (filters?.month) payments = payments.filter(p => p.month === filters.month);
    if (filters?.year) payments = payments.filter(p => p.year === filters.year);
    if (filters?.search) {
      const q = filters.search.toLowerCase().trim();
      payments = payments.filter(p => p.customerName.toLowerCase().includes(q) || p.id.toLowerCase().includes(q));
    }
    return payments.sort((a, b) => b.paymentDate.localeCompare(a.paymentDate));
  }

async recordPayment(input: {
    customerId: string;
    amount: number;
    paymentDate: string;
    month: number;
    year: number;
    paymentMethod: string;
    notes?: string;
  }): Promise<{ payment: PaymentRecord; customer: Customer }> {
    const customer = await this.getCustomerById(input.customerId);
    if (!customer) throw new Error(`Customer ${input.customerId} not found`);
    const payments = await this.getAll<PaymentRecord>('payments');
    const existing = payments.find(p => p.customerId === input.customerId && p.month === input.month && p.year === input.year);
    if (existing) throw new Error(`Payment already recorded for ${MONTH_NAMES[input.month - 1]} ${input.year}`);

    const payIdNum = payments.length
      ? Math.max(...payments.map(p => parseInt(p.id.replace('PAY-', ''), 10) || 1000)) + 1
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

    const { error: paymentError } = await supabase.from('payments').insert({ id: payment.id, data: payment });
    checkError(paymentError, 'Record payment');

    const newLastPayment = input.paymentDate > customer.lastPaymentDate ? input.paymentDate : customer.lastPaymentDate;
    const newRenewalDate = addOneMonth(input.paymentDate);
    const updatedCustomer: Customer = {
      ...customer,
      lastPaymentDate: newLastPayment,
      nextRenewalDate: newRenewalDate > customer.nextRenewalDate ? newRenewalDate : customer.nextRenewalDate,
      updatedAt: new Date().toISOString(),
    };
    const { error: customerError } = await supabase.from('customers')
      .update({ data: updatedCustomer, updated_at: new Date().toISOString() }).eq('id', customer.id);
    if (customerError) {
      await supabase.from('payments').delete().eq('id', payment.id);
      checkError(customerError, 'Update customer after payment');
    }
    await this.refreshRemindersInternal();
    return { payment, customer: updatedCustomer };
  }

  async getCustomerRegister(customerId: string, year: number): Promise<MonthRegisterRow[]> {
    const customer = await this.getCustomerById(customerId);
    if (!customer) throw new Error(`Customer ${customerId} not found`);
    const [payments, overrides] = await Promise.all([
      this.getAll<PaymentRecord>('payments'),
      this.getAll<CustomerMonthOverride>('month_overrides'),
    ]);
    const customerPayments = payments.filter(p => p.customerId === customerId && p.year === year);
    const [joinYear, joinMonth] = customer.joiningDate.split('-').map(Number);
    const today = getTodayDateString();
    const [currentYear, currentMonth] = today.split('-').map(Number);
    const rows: MonthRegisterRow[] = [];

    for (let month = 1; month <= 12; month++) {
      const monthIndex = month - 1;
      const payment = customerPayments.find(p => p.month === month);
      const override = overrides.find(o => o.customerId === customerId && o.year === year && o.monthIndex === monthIndex);
      let isActive = true;
      let isInactive = false;
      if (override) {
        isActive = override.isActive;
        isInactive = override.isInactive;
      } else {
        const monthDateStr = `${year}-${String(month).padStart(2, '0')}-01`;
        const joinDateCompare = `${joinYear}-${String(joinMonth).padStart(2, '0')}-01`;
        if (monthDateStr < joinDateCompare) {
          isActive = false;
          isInactive = true;
        } else if (customer.status === 'inactive' && monthDateStr > customer.updatedAt.slice(0, 10)) {
          isActive = false;
          isInactive = true;
        }
      }
      let paid600 = false;
      let paid1000 = false;
      if (payment) {
        if (payment.amount === 600 || payment.category === 'non-cardio') paid600 = true;
        else if (payment.amount >= 1000 || payment.category === 'cardio') paid1000 = true;
      }
      const isPastOrCurrentMonth = year < currentYear || (year === currentYear && month <= currentMonth);
      const isAfterJoining = year > joinYear || (year === joinYear && month >= joinMonth);
      const isNotPaid = !payment && isActive && isPastOrCurrentMonth && isAfterJoining;
      rows.push({
        monthIndex,
        monthName: MONTH_NAMES[monthIndex],
        year,
        paid600,
        paid1000,
        isNotPaid,
        isActive,
        isInactive,
        paymentId: payment?.id,
        paymentDetails: payment ? {
          amount: payment.amount,
          paymentDate: payment.paymentDate,
          paymentMethod: payment.paymentMethod,
          period: payment.paymentPeriod,
          notes: payment.notes,
        } : undefined,
      });
    }
    return rows;
  }
async updateMonthStatus(
    customerId: string,
    year: number,
    monthIndex: number,
    isActive: boolean,
    isInactive: boolean,
  ): Promise<MonthRegisterRow[]> {
    const finalActive = isActive;
    const finalInactive = !isActive;
    const override: CustomerMonthOverride = {
      customerId,
      year,
      monthIndex,
      isActive: finalActive,
      isInactive: finalInactive,
    };
    const id = `${customerId}_${year}_${monthIndex}`;
    const { error } = await supabase.from('month_overrides').upsert({
      id,
      data: override,
      updated_at: new Date().toISOString(),
    }, { onConflict: 'id' });
    checkError(error, 'Update customer month status');
    return this.getCustomerRegister(customerId, year);
  }

  // RENEWAL REMINDERS
  private async refreshRemindersInternal(): Promise<void> {
    const today = getTodayDateString();
    const [customers, payments, existingReminders] = await Promise.all([
      this.getAll<Customer>('customers'),
      this.getAll<PaymentRecord>('payments'),
      this.getAll<RenewalReminder>('reminders'),
    ]);
    const activeCustomers = customers.filter(c => c.status === 'active');
    const reminders: RenewalReminder[] = [];

for (const customer of activeCustomers) {
      const renewalDate = customer.nextRenewalDate;
      const reminderDate = subtractDays(renewalDate, 2);
      const existing = existingReminders.find(r => r.customerId === customer.id && r.renewalDate === renewalDate);
      const [renewalYear, renewalMonth] = renewalDate.split('-').map(Number);
      const hasPaid = payments.some(p => p.customerId === customer.id && p.year === renewalYear && p.month === renewalMonth);
      let status: RenewalReminder['status'] = 'Upcoming';
      if (hasPaid) status = 'Paid';
      else if (today > renewalDate) status = 'Pending / Overdue';
      else if (today >= reminderDate && today <= renewalDate) status = 'Due Today';
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

    if (reminders.length) {
      const rows = reminders.map(reminder => ({ id: reminder.id, data: reminder, updated_at: new Date().toISOString() }));
      const { error } = await supabase.from('reminders').upsert(rows, { onConflict: 'id' });
      checkError(error, 'Refresh renewal reminders');
    }

    const validIds = new Set(reminders.map(r => r.id));
    for (const oldReminder of existingReminders) {
      if (!validIds.has(oldReminder.id)) {
        const { error } = await supabase.from('reminders').delete().eq('id', oldReminder.id);
        checkError(error, 'Remove outdated reminder');
      }
    }
  }

  async getRenewalReminders(): Promise<RenewalReminder[]> {
    await this.refreshRemindersInternal();
    return this.getAll<RenewalReminder>('reminders');
  }
  async updateReminder(id: string, updates: Partial<RenewalReminder>): Promise<RenewalReminder> {
    const existing = await this.getOne<RenewalReminder>('reminders', 'id', id);
    if (!existing) throw new Error(`Reminder ${id} not found`);
    const updated = { ...existing, ...updates };
    const { error } = await supabase.from('reminders')
      .update({ data: updated, updated_at: new Date().toISOString() }).eq('id', id);
    checkError(error, 'Update reminder');
    return updated;
  }

  // DASHBOARD STATISTICS
  async getDashboardStats(): Promise<DashboardStats> {
    const today = getTodayDateString();
    const [currentYear, currentMonth] = today.split('-').map(Number);
    const [customers, payments] = await Promise.all([
      this.getAll<Customer>('customers'),
      this.getAll<PaymentRecord>('payments'),
    ]);
    const totalCustomers = customers.length;
    const cardioCustomers = customers.filter(c => c.category === 'cardio').length;
    const nonCardioCustomers = customers.filter(c => c.category === 'non-cardio').length;
    const pendingCustomers: Customer[] = [];
    for (const customer of customers) {
      if (customer.status !== 'active') continue;
      const paidThisMonth = payments.some(p => p.customerId === customer.id && p.year === currentYear && p.month === currentMonth);
      if (!paidThisMonth || customer.nextRenewalDate <= today) pendingCustomers.push(customer);
    }
    const monthlyRevenue = payments
      .filter(p => p.year === currentYear && p.month === currentMonth)
      .reduce((sum, p) => sum + p.amount, 0);
    return { totalCustomers, cardioCustomers, nonCardioCustomers, pendingPayments: pendingCustomers.length, pendingCustomers, monthlyRevenue };
  }

  // WEB PUSH SUBSCRIPTIONS
  async getPushSubscriptions(): Promise<StoredPushSubscription[]> {
    return this.getAll<StoredPushSubscription>('push_subscriptions');
  }

  async savePushSubscription(sub: StoredPushSubscription): Promise<void> {
    const { error } = await supabase.from('push_subscriptions').upsert({
      endpoint: sub.endpoint,
      data: sub,
      updated_at: new Date().toISOString(),
    }, { onConflict: 'endpoint' });
    checkError(error, 'Save push subscription');
  }

  async removePushSubscription(endpoint: string): Promise<void> {
    const { error } = await supabase.from('push_subscriptions').delete().eq('endpoint', endpoint);
    checkError(error, 'Remove push subscription');
  }

  // FIREBASE CLOUD MESSAGING DEVICES
  async getFCMDevices(): Promise<StoredFCMDevice[]> {
    return this.getAll<StoredFCMDevice>('fcm_devices');
  }

  async saveFCMDevice(device: StoredFCMDevice): Promise<void> {
    const existing = await this.getOne<StoredFCMDevice>('fcm_devices', 'token', device.token);
    const updated: StoredFCMDevice = { ...existing, ...device, updatedAt: new Date().toISOString() };
    const { error } = await supabase.from('fcm_devices').upsert({
      token: device.token,
      data: updated,
      updated_at: new Date().toISOString(),
    }, { onConflict: 'token' });
    checkError(error, 'Save FCM device');
  }

  async removeFCMDevice(token: string): Promise<void> {
    const { error } = await supabase.from('fcm_devices').delete().eq('token', token);
    checkError(error, 'Remove FCM device');
  }

  // VAPID KEY MANAGEMENT - preserve existing keys in gym_settings
  async getVapidKeys(): Promise<{ publicKey: string; privateKey: string } | undefined> {
    const settings = await this.getOne<any>('gym_settings', 'id', 'main');
    return settings?.vapidKeys;
  }

  async setVapidKeys(keys: { publicKey: string; privateKey: string }): Promise<void> {
    const settings = await this.getOne<any>('gym_settings', 'id', 'main');
    const updatedSettings = {
      ...(settings || {}),
      gymName: settings?.gymName || 'VeeraGym',
      lastAutoCheck: settings?.lastAutoCheck || new Date().toISOString(),
      vapidKeys: keys,
    };
    const { error } = await supabase.from('gym_settings').upsert({
      id: 'main',
      data: updatedSettings,
      updated_at: new Date().toISOString(),
    }, { onConflict: 'id' });
    checkError(error, 'Save VAPID keys');
  }

  // UPCOMING RENEWALS FOR PUSH NOTIFICATIONS
  async getUpcomingRenewalsForNotification(maxDaysAhead: number = 2): Promise<Array<{
    customerId: string;
    customerName: string;
    phone: string;
    category: CustomerCategory;
    amountDue: number;
    renewalDate: string;
    daysRemaining: number;
    daysText: string;
    status: string;
  }>> {
    const today = getTodayDateString();
    const [customers, payments, sentData] = await Promise.all([
      this.getAll<Customer>('customers'),
      this.getAll<PaymentRecord>('payments'),
      supabase.from('sent_renewal_notifications').select('notification_key'),
    ]);
    checkError(sentData.error, 'Fetch sent renewal notifications');
    const sentKeys = new Set((sentData.data || []).map((row: { notification_key: string }) => row.notification_key));
    const results: Array<{
      customerId: string; customerName: string; phone: string; category: CustomerCategory;
      amountDue: number; renewalDate: string; daysRemaining: number; daysText: string; status: string;
    }> = [];
    for (const customer of customers.filter(c => c.status === 'active')) {
      const renewalDate = customer.nextRenewalDate;
      const days = daysBetween(today, renewalDate);
      const [renewalYear, renewalMonth] = renewalDate.split('-').map(Number);
      const hasPaid = payments.some(p => p.customerId === customer.id && p.year === renewalYear && p.month === renewalMonth);
      if (hasPaid || sentKeys.has(`${customer.id}_${renewalDate}`)) continue;
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
          status: days < 0 ? 'Pending / Overdue' : 'Due Today',
        });
      }
    }
    return results.sort((a, b) => a.daysRemaining - b.daysRemaining);
  }
}

export const db = new SupabaseDatabase();
