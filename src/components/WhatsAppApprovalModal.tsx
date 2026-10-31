import React from 'react';
import { X, Check, MessageSquare, Phone, Calendar, IndianRupee, ShieldCheck, ExternalLink } from 'lucide-react';
import { CustomerCategory } from '../types.ts';
import { notifyReminder } from '../services/api.ts';

export interface WhatsAppReminderTarget {
  id: string; // reminder ID or customer ID
  customerId: string;
  customerName: string;
  phone: string;
  category: CustomerCategory;
  amountDue: number;
  renewalDate: string; // e.g. 2026-11-02
}

interface Props {
  isOpen: boolean;
  onClose: () => void;
  target: WhatsAppReminderTarget | null;
  onApproved?: () => void;
}

export const WhatsAppApprovalModal: React.FC<Props> = ({
  isOpen,
  onClose,
  target,
  onApproved,
}) => {
  if (!isOpen || !target) return null;

  // The exact drafted message required: "Renewal date:Date,for your information and record"
  const draftedMessage = `Renewal date:${target.renewalDate},for your information and record`;

  const cleanPhone = target.phone.replace(/[^0-9]/g, '');
  const phoneWithCountryCode = cleanPhone.length === 10 ? `91${cleanPhone}` : cleanPhone;
  const whatsappUrl = `https://wa.me/${phoneWithCountryCode}?text=${encodeURIComponent(draftedMessage)}`;

  const handleApprove = async () => {
    // Open WhatsApp search and draft message
    window.open(whatsappUrl, '_blank');

    // Record notification in database if reminder id is available
    if (target.id) {
      try {
        await notifyReminder(target.id);
      } catch (err) {
        console.warn('Could not update notification log:', err);
      }
    }

    if (onApproved) {
      onApproved();
    }
    onClose();
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm animate-fadeIn">
      <div className="relative w-full max-w-lg bg-[#161a20] border-2 border-emerald-500/50 rounded-2xl shadow-2xl p-6 text-neutral-200">
        <button
          onClick={onClose}
          className="absolute top-4 right-4 p-1.5 text-neutral-400 hover:text-white rounded-lg hover:bg-neutral-800 transition-colors cursor-pointer"
          aria-label="Close modal"
        >
          <X className="w-5 h-5" />
        </button>

        {/* Header */}
        <div className="flex items-center gap-3 mb-5 pb-4 border-b border-neutral-800">
          <div className="p-3 bg-emerald-500/15 border border-emerald-500/30 rounded-xl text-emerald-400">
            <MessageSquare className="w-6 h-6" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <span className="text-[10px] uppercase font-bold tracking-wider px-2 py-0.5 rounded bg-amber-500/20 text-amber-300 border border-amber-500/30 font-mono">
                2-Day Advance Alert
              </span>
            </div>
            <h3 className="text-lg font-bold text-white tracking-tight mt-0.5">
              WhatsApp Renewal Draft Approval
            </h3>
          </div>
        </div>

        {/* Customer Details Summary */}
        <div className="space-y-4">
          <div className="p-4 rounded-xl bg-[#1e232b] border border-neutral-800 space-y-3">
            <div className="flex items-center justify-between">
              <div>
                <span className="text-xs text-neutral-400 block">Customer Name</span>
                <span className="text-base font-bold text-white">{target.customerName}</span>
              </div>
              <div className="text-right">
                <span className="text-xs text-neutral-400 block">Membership Fee</span>
                <span className="text-base font-extrabold text-white font-mono tabular-nums">
                  ₹{target.amountDue.toLocaleString('en-IN')}
                </span>
              </div>
            </div>

            <div className="grid grid-cols-2 gap-3 pt-2 border-t border-neutral-800/80 text-xs">
              <div>
                <span className="text-neutral-400 flex items-center gap-1 mb-0.5">
                  <Phone className="w-3.5 h-3.5 text-emerald-400" />
                  <span>WhatsApp Number</span>
                </span>
                <span className="font-mono text-white font-semibold">{target.phone}</span>
              </div>

              <div>
                <span className="text-neutral-400 flex items-center gap-1 mb-0.5">
                  <Calendar className="w-3.5 h-3.5 text-amber-400" />
                  <span>Actual Renewal Date</span>
                </span>
                <span className="font-mono text-amber-300 font-bold">{target.renewalDate}</span>
              </div>
            </div>
          </div>

          {/* Drafted Message Box */}
          <div>
            <div className="flex items-center justify-between text-xs text-neutral-400 mb-1.5">
              <span className="font-semibold text-neutral-300 flex items-center gap-1.5">
                <ShieldCheck className="w-3.5 h-3.5 text-emerald-400" />
                <span>Drafted WhatsApp Message (Auto-Filled):</span>
              </span>
              <span className="text-[11px] text-neutral-400 font-mono">wa.me/{phoneWithCountryCode}</span>
            </div>

            <div className="p-4 rounded-xl bg-emerald-950/25 border border-emerald-500/40 text-sm font-mono text-emerald-200 select-all leading-relaxed">
              "{draftedMessage}"
            </div>
            <p className="text-[11px] text-neutral-400 mt-1.5">
              Clicking approve will search this customer on WhatsApp and load the message into the chat draft ready to send.
            </p>
          </div>
        </div>

        {/* Action Controls */}
        <div className="mt-6 pt-4 border-t border-neutral-800 flex items-center gap-3">
          <button
            type="button"
            onClick={onClose}
            className="flex-1 py-3 px-4 bg-neutral-800 hover:bg-neutral-700 text-neutral-300 font-semibold rounded-xl text-xs transition-colors cursor-pointer"
          >
            Cancel / Later
          </button>

          <button
            type="button"
            onClick={handleApprove}
            className="flex-1 py-3 px-4 bg-emerald-500 hover:bg-emerald-400 text-neutral-950 font-bold rounded-xl text-xs transition-all flex items-center justify-center gap-2 shadow-lg hover:shadow-emerald-500/25 cursor-pointer"
          >
            <ExternalLink className="w-4 h-4" />
            <span>Approve & Open WhatsApp</span>
          </button>
        </div>
      </div>
    </div>
  );
};
