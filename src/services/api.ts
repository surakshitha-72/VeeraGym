import { Customer, CustomerCategory, DashboardStats, MonthRegisterRow, PaymentRecord, RenewalReminder } from '../types.ts';

export async function fetchDashboardStats(): Promise<DashboardStats> {
  const res = await fetch('/api/dashboard/stats');
  if (!res.ok) throw new Error('Failed to load dashboard stats');
  return res.json();
}

export async function fetchCustomers(params?: {
  category?: CustomerCategory;
  status?: string;
  search?: string;
}): Promise<Customer[]> {
  const query = new URLSearchParams();
  if (params?.category) query.append('category', params.category);
  if (params?.status) query.append('status', params.status);
  if (params?.search) query.append('search', params.search);

  const res = await fetch(`/api/customers?${query.toString()}`);
  if (!res.ok) throw new Error('Failed to load customers');
  return res.json();
}

export async function fetchCustomer(id: string): Promise<Customer> {
  const res = await fetch(`/api/customers/${id}`);
  if (!res.ok) throw new Error('Failed to load customer profile');
  return res.json();
}

export async function createCustomer(data: {
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
  const res = await fetch('/api/customers', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(data),
  });
  if (!res.ok) {
    const err = await res.json().catch(() => ({}));
    throw new Error(err.error || 'Failed to create customer');
  }
  return res.json();
}

export async function updateCustomer(id: string, data: Partial<Customer>): Promise<Customer> {
  const res = await fetch(`/api/customers/${id}`, {
    method: 'PUT',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(data),
  });
  if (!res.ok) {
    const err = await res.json().catch(() => ({}));
    throw new Error(err.error || 'Failed to update customer');
  }
  return res.json();
}

export async function deleteCustomer(id: string): Promise<void> {
  const res = await fetch(`/api/customers/${id}`, { method: 'DELETE' });
  if (!res.ok) throw new Error('Failed to delete customer');
}

export async function fetchCustomerRegister(customerId: string, year: number): Promise<MonthRegisterRow[]> {
  const res = await fetch(`/api/customers/${customerId}/register?year=${year}`);
  if (!res.ok) throw new Error('Failed to load customer payment register');
  return res.json();
}

export async function updateMonthStatus(
  customerId: string,
  year: number,
  monthIndex: number,
  isActive: boolean,
  isInactive: boolean
): Promise<MonthRegisterRow[]> {
  const res = await fetch(`/api/customers/${customerId}/register-status`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ year, monthIndex, isActive, isInactive }),
  });
  if (!res.ok) throw new Error('Failed to update month status');
  return res.json();
}

export async function fetchPayments(params?: {
  customerId?: string;
  category?: CustomerCategory;
  month?: number;
  year?: number;
  search?: string;
}): Promise<PaymentRecord[]> {
  const query = new URLSearchParams();
  if (params?.customerId) query.append('customerId', params.customerId);
  if (params?.category) query.append('category', params.category);
  if (params?.month) query.append('month', String(params.month));
  if (params?.year) query.append('year', String(params.year));
  if (params?.search) query.append('search', params.search);

  const res = await fetch(`/api/payments?${query.toString()}`);
  if (!res.ok) throw new Error('Failed to load payments');
  return res.json();
}

export async function recordPayment(data: {
  customerId: string;
  amount: number;
  paymentDate: string;
  month: number;
  year: number;
  paymentMethod: string;
  notes?: string;
}): Promise<{ payment: PaymentRecord; customer: Customer }> {
  const res = await fetch('/api/payments', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(data),
  });
  if (!res.ok) {
    const err = await res.json().catch(() => ({}));
    throw new Error(err.error || 'Failed to record payment');
  }
  return res.json();
}

export async function fetchReminders(): Promise<RenewalReminder[]> {
  const res = await fetch('/api/reminders');
  if (!res.ok) throw new Error('Failed to load renewal reminders');
  return res.json();
}

export async function updateReminder(id: string, updates: Partial<RenewalReminder>): Promise<RenewalReminder> {
  const res = await fetch(`/api/reminders/${id}`, {
    method: 'PUT',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(updates),
  });
  if (!res.ok) throw new Error('Failed to update reminder');
  return res.json();
}

export async function notifyReminder(id: string): Promise<RenewalReminder> {
  const res = await fetch(`/api/reminders/${id}/notify`, { method: 'POST' });
  if (!res.ok) throw new Error('Failed to mark reminder sent');
  return res.json();
}

export async function parseVoiceTranscript(transcript: string): Promise<any> {
  const res = await fetch('/api/parse-voice', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ transcript }),
  });
  if (!res.ok) {
    const err = await res.json().catch(() => ({}));
    throw new Error(err.error || 'Failed to extract customer data from speech');
  }
  return res.json();
}
