export type CustomerCategory = 'cardio' | 'non-cardio';

export type MembershipStatus = 'active' | 'inactive';

export type PaymentMethod = 'Cash' | 'UPI / GPay / PhonePe' | 'Card' | 'Bank Transfer';

export interface Customer {
  id: string;
  name: string;
  phone: string;
  weightKg: number;
  category: CustomerCategory;
  monthlyFee: number; // 1000 for cardio, 600 for non-cardio
  status: MembershipStatus;
  joiningDate: string; // YYYY-MM-DD
  lastPaymentDate: string; // YYYY-MM-DD
  nextRenewalDate: string; // YYYY-MM-DD
  notes?: string;
  createdAt: string;
  updatedAt: string;
}

export interface PaymentRecord {
  id: string;
  customerId: string;
  customerName: string;
  category: CustomerCategory;
  amount: number;
  paymentDate: string; // YYYY-MM-DD
  paymentPeriod: string; // e.g., "October 2026"
  month: number; // 1 to 12
  year: number; // e.g., 2026
  paymentMethod: PaymentMethod;
  status: 'Completed' | 'Pending';
  notes?: string;
  createdAt: string;
}

export interface MonthRegisterRow {
  monthIndex: number; // 0 to 11
  monthName: string; // January, February...
  year: number;
  paid600: boolean; // Tick mark if paid 600
  paid1000: boolean; // Tick mark if paid 1000
  isNotPaid: boolean; // True if past due without payment
  isActive: boolean; // Gym owner toggle, mutually exclusive with isInactive
  isInactive: boolean;
  paymentId?: string;
  paymentDetails?: {
    amount: number;
    paymentDate: string;
    paymentMethod: string;
    period: string;
    notes?: string;
  };
}

export interface CustomerMonthOverride {
  customerId: string;
  year: number;
  monthIndex: number;
  isActive: boolean;
  isInactive: boolean;
}

export interface RenewalReminder {
  id: string;
  customerId: string;
  customerName: string;
  phone: string;
  category: CustomerCategory;
  amountDue: number;
  renewalDate: string; // YYYY-MM-DD
  reminderDate: string; // YYYY-MM-DD (2 days before renewalDate)
  status: 'Upcoming' | 'Due Today' | 'Pending / Overdue' | 'Sent' | 'Paid';
  enabled: boolean;
  lastNotifiedAt?: string;
}

export interface DashboardStats {
  totalCustomers: number;
  cardioCustomers: number;
  nonCardioCustomers: number;
  pendingPayments: number;
  pendingCustomers: Customer[];
  monthlyRevenue: number;
}
