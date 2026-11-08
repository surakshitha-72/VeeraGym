
import {
  Customer,
  CustomerCategory,
  DashboardStats,
  MonthRegisterRow,
  PaymentRecord,
  RenewalReminder
} from '../types.ts';


// Backend URL
const API_BASE_URL =
  import.meta.env.VITE_API_BASE_URL ??
  (import.meta.env.PROD ? '' : 'http://192.168.0.108:3000');
// ADMIN AUTHENTICATION
const AUTH_TOKEN_KEY = 'veeragym_admin_token';

export function getAuthToken(): string | null {
  return localStorage.getItem(AUTH_TOKEN_KEY);
}

export function saveAuthToken(token: string): void {
  localStorage.setItem(AUTH_TOKEN_KEY, token);
}

export function clearAuthToken(): void {
  localStorage.removeItem(AUTH_TOKEN_KEY);
}

export function isAuthenticated(): boolean {
  return !!getAuthToken();
}

export async function loginAdmin(
  username: string,
  password: string
): Promise<{ success: boolean; token: string; username: string }> {
  const response = await fetch(`${API_BASE_URL}/api/auth/login`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ username, password }),
  });

  const data = await response.json();

  if (!response.ok) {
    throw new Error(data.error || 'Login failed. Please try again.');
  }

  saveAuthToken(data.token);
  return data;
}

export function logoutAdmin(): void {
  clearAuthToken();
  window.dispatchEvent(new Event('veeragym:logout'));
}

// COMMON AUTHENTICATED API REQUEST HELPER
export async function apiFetch(
  path: string,
  options?: RequestInit
): Promise<Response> {
  const url = `${API_BASE_URL}${path}`;

  try {
    const headers = new Headers(options?.headers);
    const token = getAuthToken();

    if (token) {
      headers.set('Authorization', `Bearer ${token}`);
    }

    const response = await fetch(url, {
      ...options,
      headers,
    });

    if (response.status === 401 && token) {
      clearAuthToken();
      window.dispatchEvent(new Event('veeragym:auth-expired'));
      throw new Error('Your session has expired. Please log in again.');
    }

    if (!response.ok) {
      const errorText = await response.text().catch(() => '');
      console.error(
        `API Error [${response.status}] ${url}:`,
        errorText
      );

      throw new Error(
        `Request failed (${response.status}): ${path}`
      );
    }

    return response;
  } catch (error) {
    console.error(`Network/API request failed: ${url}`, error);
    throw error;
  }
}

// DASHBOARD
export async function fetchDashboardStats(): Promise<DashboardStats> {
  const res = await apiFetch('/api/dashboard/stats');
  return res.json();
}

// CUSTOMERS
export async function fetchCustomers(params?: {
  category?: CustomerCategory;
  status?: string;
  search?: string;
}): Promise<Customer[]> {
  const query = new URLSearchParams();

  if (params?.category) query.append('category', params.category);
  if (params?.status) query.append('status', params.status);
  if (params?.search) query.append('search', params.search);

  const res = await apiFetch(`/api/customers?${query.toString()}`);
  return res.json();
}

export async function fetchCustomer(id: string): Promise<Customer> {
  const res = await apiFetch(`/api/customers/${encodeURIComponent(id)}`);
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
  const res = await apiFetch('/api/customers', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(data),
  });

  return res.json();
}

export async function updateCustomer(
  id: string,
  data: Partial<Customer>
): Promise<Customer> {
  const res = await apiFetch(`/api/customers/${encodeURIComponent(id)}`, {
    method: 'PUT',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(data),
  });

  return res.json();
}

export async function deleteCustomer(id: string): Promise<void> {
  await apiFetch(`/api/customers/${encodeURIComponent(id)}`, {
    method: 'DELETE',
  });
}

// CUSTOMER PAYMENT REGISTER
export async function fetchCustomerRegister(
  customerId: string,
  year: number
): Promise<MonthRegisterRow[]> {
  const res = await apiFetch(
    `/api/customers/${encodeURIComponent(customerId)}/register?year=${year}`
  );

  return res.json();
}

export async function updateMonthStatus(
  customerId: string,
  year: number,
  monthIndex: number,
  isActive: boolean,
  isInactive: boolean
): Promise<MonthRegisterRow[]> {
  const res = await apiFetch(
    `/api/customers/${encodeURIComponent(customerId)}/register-status`,
    {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        year,
        monthIndex,
        isActive,
        isInactive,
      }),
    }
  );

  return res.json();
}

// PAYMENTS
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

  const res = await apiFetch(`/api/payments?${query.toString()}`);
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
  const res = await apiFetch('/api/payments', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(data),
  });

  return res.json();
}

// RENEWAL REMINDERS
export async function fetchReminders(): Promise<RenewalReminder[]> {
  const res = await apiFetch('/api/reminders');
  return res.json();
}

export async function updateReminder(
  id: string,
  updates: Partial<RenewalReminder>
): Promise<RenewalReminder> {
  const res = await apiFetch(`/api/reminders/${encodeURIComponent(id)}`, {
    method: 'PUT',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(updates),
  });

  return res.json();
}

export async function notifyReminder(id: string): Promise<RenewalReminder> {
  const res = await apiFetch(
    `/api/reminders/${encodeURIComponent(id)}/notify`,
    { method: 'POST' }
  );

  return res.json();
}

// VOICE TRANSCRIPT
export async function parseVoiceTranscript(
  transcript: string
): Promise<any> {
  const res = await apiFetch('/api/parse-voice', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ transcript }),
  });

  return res.json();
}

// FIREBASE CLOUD MESSAGING - ANDROID DEVICE REGISTRATION
export async function registerFCMDevice(
  token: string
): Promise<{ success: boolean; message: string }> {
  const res = await apiFetch('/api/push/fcm/register', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      token,
      platform: 'android',
      userAgent: navigator.userAgent,
    }),
  });

  return res.json();
}

// SEND TEST NOTIFICATION THROUGH FIREBASE CLOUD MESSAGING
export async function sendFCMTestNotification(): Promise<{
  success: boolean;
  sent?: number;
  total?: number;
}> {
  const res = await apiFetch('/api/push/fcm/test', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
  });

  const data = await res.json();

  if (!res.ok) {
    throw new Error(
      data.message || data.error || 'FCM test notification failed'
    );
  }

  return data;
}
// Unregister Android device from Firebase Cloud Messaging
export async function unregisterFCMDevice(
  token: string
): Promise<{ success: boolean; message: string }> {
  const res = await apiFetch('/api/push/fcm/unregister', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ token }),
  });

  return res.json();
}
