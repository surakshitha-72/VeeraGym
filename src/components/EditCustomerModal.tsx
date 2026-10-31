import React, { useState } from 'react';
import { X, Check, UserCheck, UserX, AlertCircle } from 'lucide-react';
import { Customer, CustomerCategory, MembershipStatus } from '../types.ts';
import { updateCustomer } from '../services/api.ts';

interface Props {
  isOpen: boolean;
  onClose: () => void;
  customer: Customer | null;
  onSuccess: (updated: Customer) => void;
}

export const EditCustomerModal: React.FC<Props> = ({
  isOpen,
  onClose,
  customer,
  onSuccess,
}) => {
  if (!isOpen || !customer) return null;

  const [name, setName] = useState<string>(customer.name);
  const [phone, setPhone] = useState<string>(customer.phone);
  const [weightKg, setWeightKg] = useState<number>(customer.weightKg);
  const [category, setCategory] = useState<CustomerCategory>(customer.category);
  const [status, setStatus] = useState<MembershipStatus>(customer.status);
  const [notes, setNotes] = useState<string>(customer.notes || '');
  const [isSubmitting, setIsSubmitting] = useState<boolean>(false);
  const [error, setError] = useState<string | null>(null);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setIsSubmitting(true);

    try {
      const updated = await updateCustomer(customer.id, {
        name: name.trim(),
        phone: phone.trim(),
        weightKg: Number(weightKg) || 0,
        category,
        status,
        notes: notes.trim() || undefined,
      });
      setIsSubmitting(false);
      onSuccess(updated);
      onClose();
    } catch (err: any) {
      setIsSubmitting(false);
      setError(err.message || 'Failed to update customer details');
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

        <div className="mb-5 pb-4 border-b border-neutral-800">
          <h3 className="text-lg font-bold text-white tracking-tight">Edit Customer Record</h3>
          <p className="text-xs text-neutral-400 font-medium">Customer ID: {customer.id}</p>
        </div>

        {error && (
          <div className="mb-4 p-3 rounded-lg bg-red-900/30 border border-red-700/60 text-red-200 text-xs flex items-start gap-2">
            <AlertCircle className="w-4 h-4 shrink-0 mt-0.5 text-red-400" />
            <span>{error}</span>
          </div>
        )}

        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="block text-xs font-medium text-neutral-300 mb-1.5">
              Full Name
            </label>
            <input
              type="text"
              required
              value={name}
              onChange={(e) => setName(e.target.value)}
              className="w-full bg-[#1e232b] border border-neutral-700 text-white rounded-lg px-3 py-2 text-sm focus:outline-none focus:border-neutral-500"
            />
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-medium text-neutral-300 mb-1.5">
                Mobile Number
              </label>
              <input
                type="tel"
                required
                value={phone}
                onChange={(e) => setPhone(e.target.value)}
                className="w-full bg-[#1e232b] border border-neutral-700 text-white rounded-lg px-3 py-2 text-sm focus:outline-none focus:border-neutral-500 font-mono"
              />
            </div>

            <div>
              <label className="block text-xs font-medium text-neutral-300 mb-1.5">
                Weight (kg)
              </label>
              <input
                type="number"
                step="0.5"
                min={20}
                max={300}
                required
                value={weightKg}
                onChange={(e) => setWeightKg(Number(e.target.value))}
                className="w-full bg-[#1e232b] border border-neutral-700 text-white rounded-lg px-3 py-2 text-sm focus:outline-none focus:border-neutral-500 font-mono"
              />
            </div>
          </div>

          <div>
            <label className="block text-xs font-medium text-neutral-300 mb-1.5">
              Membership Category & Monthly Fee
            </label>
            <div className="grid grid-cols-2 gap-3">
              <button
                type="button"
                onClick={() => setCategory('non-cardio')}
                className={`p-3 rounded-lg border text-left transition-colors ${
                  category === 'non-cardio'
                    ? 'bg-neutral-800 text-white border-neutral-400 shadow-sm'
                    : 'bg-[#1e232b] text-neutral-400 border-neutral-700/60 hover:text-neutral-200'
                }`}
              >
                <div className="font-semibold text-sm">Non-Cardio</div>
                <div className="text-xs text-neutral-400 mt-0.5 font-mono">₹600 / month</div>
              </button>

              <button
                type="button"
                onClick={() => setCategory('cardio')}
                className={`p-3 rounded-lg border text-left transition-colors ${
                  category === 'cardio'
                    ? 'bg-neutral-800 text-white border-neutral-400 shadow-sm'
                    : 'bg-[#1e232b] text-neutral-400 border-neutral-700/60 hover:text-neutral-200'
                }`}
              >
                <div className="font-semibold text-sm">Cardio</div>
                <div className="text-xs text-neutral-400 mt-0.5 font-mono">₹1,000 / month</div>
              </button>
            </div>
          </div>

          <div>
            <label className="block text-xs font-medium text-neutral-300 mb-1.5">
              Membership Status
            </label>
            <div className="grid grid-cols-2 gap-3">
              <button
                type="button"
                onClick={() => setStatus('active')}
                className={`py-2 px-3 rounded-lg border flex items-center justify-center gap-2 text-xs font-semibold transition-colors ${
                  status === 'active'
                    ? 'bg-emerald-950/40 text-emerald-300 border-emerald-600/70'
                    : 'bg-[#1e232b] text-neutral-400 border-neutral-700/60 hover:text-neutral-200'
                }`}
              >
                <UserCheck className="w-4 h-4 text-emerald-400" />
                <span>Active Member</span>
              </button>

              <button
                type="button"
                onClick={() => setStatus('inactive')}
                className={`py-2 px-3 rounded-lg border flex items-center justify-center gap-2 text-xs font-semibold transition-colors ${
                  status === 'inactive'
                    ? 'bg-neutral-800 text-neutral-200 border-neutral-500'
                    : 'bg-[#1e232b] text-neutral-400 border-neutral-700/60 hover:text-neutral-200'
                }`}
              >
                <UserX className="w-4 h-4 text-neutral-400" />
                <span>Inactive Member</span>
              </button>
            </div>
          </div>

          <div>
            <label className="block text-xs font-medium text-neutral-300 mb-1.5">
              Notes
            </label>
            <textarea
              rows={2}
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              className="w-full bg-[#1e232b] border border-neutral-700 text-white rounded-lg px-3 py-2 text-sm focus:outline-none focus:border-neutral-500"
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
              className="flex-1 py-2.5 px-4 bg-white hover:bg-neutral-100 text-neutral-950 font-semibold rounded-lg text-sm transition-colors flex items-center justify-center gap-2"
            >
              <Check className="w-4 h-4" />
              <span>Update Details</span>
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
