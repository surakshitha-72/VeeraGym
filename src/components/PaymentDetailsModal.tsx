import React from 'react';
import { X, CheckCircle, Calendar, CreditCard, Clock, FileText } from 'lucide-react';

interface Props {
  isOpen: boolean;
  onClose: () => void;
  customerName: string;
  paymentDetails: {
    amount: number;
    paymentDate: string;
    paymentMethod: string;
    period: string;
    notes?: string;
  } | null;
}

export const PaymentDetailsModal: React.FC<Props> = ({
  isOpen,
  onClose,
  customerName,
  paymentDetails,
}) => {
  if (!isOpen || !paymentDetails) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/75 backdrop-blur-sm animate-fadeIn">
      <div className="relative w-full max-w-md bg-[#161a20] border border-neutral-700/80 rounded-xl shadow-2xl p-6 text-neutral-200">
        <button
          onClick={onClose}
          className="absolute top-4 right-4 p-1.5 text-neutral-400 hover:text-white rounded-lg hover:bg-neutral-800 transition-colors"
          aria-label="Close modal"
        >
          <X className="w-5 h-5" />
        </button>

        <div className="flex items-center gap-3 mb-5 pb-4 border-b border-neutral-800">
          <div className="p-2.5 bg-emerald-500/10 border border-emerald-500/20 rounded-lg text-emerald-400">
            <CheckCircle className="w-6 h-6" />
          </div>
          <div>
            <h3 className="text-lg font-bold text-white tracking-tight">Payment Verified</h3>
            <p className="text-xs text-neutral-400 font-medium">{customerName} · {paymentDetails.period}</p>
          </div>
        </div>

        <div className="space-y-4">
          <div className="p-4 bg-[#1e232b] rounded-lg border border-neutral-800/80">
            <span className="text-xs font-semibold uppercase tracking-wider text-neutral-400">Amount Paid</span>
            <div className="text-3xl font-extrabold text-white mt-1 font-mono tabular-nums">
              ₹{paymentDetails.amount.toLocaleString('en-IN')}
            </div>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div className="p-3 bg-[#1e232b] rounded-lg border border-neutral-800/80">
              <div className="flex items-center gap-2 text-neutral-400 text-xs mb-1">
                <Calendar className="w-3.5 h-3.5 text-neutral-300" />
                <span>Payment Date</span>
              </div>
              <div className="text-sm font-semibold text-white font-mono tabular-nums">
                {paymentDetails.paymentDate}
              </div>
            </div>

            <div className="p-3 bg-[#1e232b] rounded-lg border border-neutral-800/80">
              <div className="flex items-center gap-2 text-neutral-400 text-xs mb-1">
                <CreditCard className="w-3.5 h-3.5 text-neutral-300" />
                <span>Method</span>
              </div>
              <div className="text-sm font-semibold text-white truncate">
                {paymentDetails.paymentMethod}
              </div>
            </div>
          </div>

          <div className="p-3 bg-[#1e232b] rounded-lg border border-neutral-800/80">
            <div className="flex items-center gap-2 text-neutral-400 text-xs mb-1">
              <Clock className="w-3.5 h-3.5 text-neutral-300" />
              <span>Registered Billing Period</span>
            </div>
            <div className="text-sm font-semibold text-white">
              {paymentDetails.period}
            </div>
          </div>

          {paymentDetails.notes && (
            <div className="p-3 bg-[#1e232b] rounded-lg border border-neutral-800/80">
              <div className="flex items-center gap-2 text-neutral-400 text-xs mb-1">
                <FileText className="w-3.5 h-3.5 text-neutral-300" />
                <span>Notes</span>
              </div>
              <div className="text-sm text-neutral-300 italic">
                "{paymentDetails.notes}"
              </div>
            </div>
          )}
        </div>

        <div className="mt-6">
          <button
            onClick={onClose}
            className="w-full py-2.5 px-4 bg-neutral-800 hover:bg-neutral-700 text-white font-medium rounded-lg text-sm transition-colors cursor-pointer"
          >
            Close Details
          </button>
        </div>
      </div>
    </div>
  );
};
