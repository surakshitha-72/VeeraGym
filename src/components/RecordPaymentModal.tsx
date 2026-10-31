import React, { useState } from 'react';
import { X, Check, AlertCircle, IndianRupee } from 'lucide-react';
import { Customer, PaymentMethod } from '../types.ts';
import { recordPayment } from '../services/api.ts';

interface Props {
  isOpen: boolean;
  onClose: () => void;
  customer: Customer | null;
  defaultMonth?: number; // 1-12
  defaultYear?: number;
  onSuccess: () => void;
}

const MONTHS = [
  'January', 'February', 'March', 'April', 'May', 'June',
  'July', 'August', 'September', 'October', 'November', 'December'
];

export const RecordPaymentModal: React.FC<Props> = ({
  isOpen,
  onClose,
  customer,
  defaultMonth,
  defaultYear,
  onSuccess,
}) => {
  if (!isOpen || !customer) return null;

  const currentYear = defaultYear || new Date().getFullYear();
  const currentMonth = defaultMonth || (new Date().getMonth() + 1);

  const [month, setMonth] = useState<number>(currentMonth);
  const [year, setYear] = useState<number>(currentYear);
  const [amount, setAmount] = useState<number>(customer.monthlyFee);
  const [paymentDate, setPaymentDate] = useState<string>(
    new Date().toISOString().split('T')[0]
  );
  const [paymentMethod, setPaymentMethod] = useState<PaymentMethod>('UPI / GPay / PhonePe');
  const [notes, setNotes] = useState<string>('');
  const [isSubmitting, setIsSubmitting] = useState<boolean>(false);
  const [error, setError] = useState<string | null>(null);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setIsSubmitting(true);

    try {
      await recordPayment({
        customerId: customer.id,
        amount,
        paymentDate,
        month,
        year,
        paymentMethod,
        notes: notes.trim() || undefined,
      });
      setIsSubmitting(false);
      onSuccess();
      onClose();
    } catch (err: any) {
      setIsSubmitting(false);
      setError(err.message || 'Failed to record payment');
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/75 backdrop-blur-sm animate-fadeIn">
      <div className="relative w-full max-w-lg bg-[#161a20] border border-neutral-700/80 rounded-xl shadow-2xl p-6 text-neutral-200">
        <button
          onClick={onClose}
          className="absolute top-4 right-4 p-1.5 text-neutral-400 hover:text-white rounded-lg hover:bg-neutral-800 transition-colors"
          aria-label="Close modal"
        >
          <X className="w-5 h-5" />
        </button>

        <div className="flex items-center gap-3 mb-5 pb-4 border-b border-neutral-800">
          <div className="p-2.5 bg-neutral-800 border border-neutral-700 rounded-lg text-white">
            <IndianRupee className="w-5 h-5" />
          </div>
          <div>
            <h3 className="text-lg font-bold text-white tracking-tight">Record Membership Payment</h3>
            <p className="text-xs text-neutral-400 font-medium">
              {customer.name} ({customer.id}) · {customer.category === 'cardio' ? 'Cardio (₹1,000)' : 'Non-Cardio (₹600)'}
            </p>
          </div>
        </div>

        {error && (
          <div className="mb-4 p-3 rounded-lg bg-red-900/30 border border-red-700/60 text-red-200 text-xs flex items-start gap-2">
            <AlertCircle className="w-4 h-4 shrink-0 mt-0.5 text-red-400" />
            <span>{error}</span>
          </div>
        )}

        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-medium text-neutral-300 mb-1.5">
                Billing Month
              </label>
              <select
                value={month}
                onChange={(e) => setMonth(Number(e.target.value))}
                className="w-full bg-[#1e232b] border border-neutral-700 text-white rounded-lg px-3 py-2 text-sm focus:outline-none focus:border-neutral-500"
              >
                {MONTHS.map((m, idx) => (
                  <option key={m} value={idx + 1}>
                    {m}
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label className="block text-xs font-medium text-neutral-300 mb-1.5">
                Billing Year
              </label>
              <select
                value={year}
                onChange={(e) => setYear(Number(e.target.value))}
                className="w-full bg-[#1e232b] border border-neutral-700 text-white rounded-lg px-3 py-2 text-sm focus:outline-none focus:border-neutral-500 font-mono"
              >
                <option value={2024}>2024</option>
                <option value={2025}>2025</option>
                <option value={2026}>2026</option>
                <option value={2027}>2027</option>
                <option value={2028}>2028</option>
              </select>
            </div>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-medium text-neutral-300 mb-1.5">
                Amount (₹)
              </label>
              <div className="relative">
                <span className="absolute left-3 top-2.5 text-neutral-400 text-sm">₹</span>
                <input
                  type="number"
                  required
                  min={1}
                  value={amount}
                  onChange={(e) => setAmount(Number(e.target.value))}
                  className="w-full bg-[#1e232b] border border-neutral-700 text-white rounded-lg pl-7 pr-3 py-2 text-sm focus:outline-none focus:border-neutral-500 font-mono tabular-nums font-semibold"
                />
              </div>
            </div>

            <div>
              <label className="block text-xs font-medium text-neutral-300 mb-1.5">
                Actual Payment Date
              </label>
              <input
                type="date"
                required
                value={paymentDate}
                onChange={(e) => setPaymentDate(e.target.value)}
                className="w-full bg-[#1e232b] border border-neutral-700 text-white rounded-lg px-3 py-2 text-sm focus:outline-none focus:border-neutral-500 font-mono"
              />
            </div>
          </div>

          <div>
            <label className="block text-xs font-medium text-neutral-300 mb-1.5">
              Payment Method
            </label>
            <div className="grid grid-cols-2 gap-2">
              {(['UPI / GPay / PhonePe', 'Cash', 'Card', 'Bank Transfer'] as PaymentMethod[]).map((method) => (
                <button
                  type="button"
                  key={method}
                  onClick={() => setPaymentMethod(method)}
                  className={`py-2 px-3 text-xs font-medium rounded-lg border text-left transition-colors flex items-center justify-between ${
                    paymentMethod === method
                      ? 'bg-neutral-800 text-white border-neutral-500 shadow-sm'
                      : 'bg-[#1e232b] text-neutral-400 border-neutral-700/60 hover:text-neutral-200'
                  }`}
                >
                  <span className="truncate">{method}</span>
                  {paymentMethod === method && <Check className="w-3.5 h-3.5 text-emerald-400 shrink-0 ml-1" />}
                </button>
              ))}
            </div>
          </div>

          <div>
            <label className="block text-xs font-medium text-neutral-300 mb-1.5">
              Payment Remarks / Notes (Optional)
            </label>
            <input
              type="text"
              placeholder="e.g. Paid in full via GPay reference #9281..."
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              className="w-full bg-[#1e232b] border border-neutral-700 text-white placeholder-neutral-500 rounded-lg px-3 py-2 text-sm focus:outline-none focus:border-neutral-500"
            />
          </div>

          <div className="pt-2 flex items-center gap-3">
            <button
              type="button"
              onClick={onClose}
              disabled={isSubmitting}
              className="flex-1 py-2.5 px-4 bg-neutral-800 hover:bg-neutral-700 text-neutral-300 rounded-lg text-sm font-medium transition-colors"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={isSubmitting}
              className="flex-1 py-2.5 px-4 bg-white hover:bg-neutral-100 text-neutral-950 font-semibold rounded-lg text-sm transition-colors flex items-center justify-center gap-2 shadow-sm disabled:opacity-50"
            >
              {isSubmitting ? (
                <span>Recording...</span>
              ) : (
                <>
                  <Check className="w-4 h-4" />
                  <span>Confirm & Save</span>
                </>
              )}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
