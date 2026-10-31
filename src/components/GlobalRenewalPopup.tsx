import React, { useState, useEffect } from 'react';
import { BellRing, X, MessageSquare, ExternalLink, Calendar, Phone, CheckCircle, ChevronRight, AlertTriangle } from 'lucide-react';
import { RenewalReminder } from '../types.ts';
import { WhatsAppReminderTarget } from './WhatsAppApprovalModal.tsx';

interface Props {
  reminders: RenewalReminder[];
  onOpenApproval: (target: WhatsAppReminderTarget) => void;
  onRefresh: () => void;
}

export const GlobalRenewalPopup: React.FC<Props> = ({
  reminders,
  onOpenApproval,
  onRefresh,
}) => {
  const [isDismissed, setIsDismissed] = useState<boolean>(false);
  const [desktopNotified, setDesktopNotified] = useState<boolean>(false);

  // Filter active reminders that are Due Today (which corresponds to 2 days before renewalDate) or Pending/Overdue
  const activeAlerts = reminders.filter(
    (r) => (r.status === 'Due Today' || r.status === 'Pending / Overdue') && r.enabled
  );

  // Request browser desktop notification permission for "outside application" OS pop-ups
  useEffect(() => {
    if (activeAlerts.length > 0 && !desktopNotified && typeof window !== 'undefined' && 'Notification' in window) {
      if (Notification.permission === 'granted') {
        fireDesktopNotification(activeAlerts[0]);
      } else if (Notification.permission !== 'denied') {
        Notification.requestPermission().then((permission) => {
          if (permission === 'granted' && activeAlerts.length > 0) {
            fireDesktopNotification(activeAlerts[0]);
          }
        });
      }
    }
  }, [activeAlerts.length]);

  const fireDesktopNotification = (target: RenewalReminder) => {
    try {
      const title = `VeeraGym: 2-Day Renewal Reminder for ${target.customerName}`;
      const options = {
        body: `Renewal date:${target.renewalDate},for your information and record. Mobile: ${target.phone}. Click to approve WhatsApp draft.`,
        icon: '/favicon.ico',
        tag: `renewal-${target.customerId}-${target.renewalDate}`,
      };
      const notification = new Notification(title, options);
      notification.onclick = () => {
        window.focus();
        onOpenApproval({
          id: target.id,
          customerId: target.customerId,
          customerName: target.customerName,
          phone: target.phone,
          category: target.category,
          amountDue: target.amountDue,
          renewalDate: target.renewalDate,
        });
        notification.close();
      };
      setDesktopNotified(true);
    } catch (err) {
      console.warn('Native notification not triggered:', err);
    }
  };

  if (activeAlerts.length === 0 || isDismissed) {
    return null;
  }

  // Display the primary active alert (e.g. Due Today)
  const alertItem = activeAlerts[0];
  const draftedMsg = `Renewal date:${alertItem.renewalDate},for your information and record`;

  return (
    <div className="fixed bottom-5 right-5 z-40 max-w-sm w-full animate-fadeIn">
      <div className="relative p-5 rounded-2xl bg-[#14181f]/95 border-2 border-emerald-500/70 shadow-[0_10px_35px_rgba(0,0,0,0.8)] backdrop-blur-md text-neutral-200">
        <button
          onClick={() => setIsDismissed(true)}
          className="absolute top-3.5 right-3.5 p-1 text-neutral-400 hover:text-white rounded-lg hover:bg-neutral-800 transition-colors cursor-pointer"
          aria-label="Dismiss popup"
        >
          <X className="w-4 h-4" />
        </button>

        {/* Header Strip */}
        <div className="flex items-center gap-2.5 mb-3">
          <div className="p-2 rounded-lg bg-emerald-500/20 text-emerald-400 border border-emerald-500/30">
            <MessageSquare className="w-4 h-4" />
          </div>
          <div>
            <span className="text-[10px] font-bold uppercase tracking-wider text-amber-300 font-mono">
              Upcoming 2-Day Renewal Alert
            </span>
            <h4 className="text-sm font-bold text-white tracking-tight leading-tight">
              {alertItem.customerName}
            </h4>
          </div>
        </div>

        {/* Customer Details in Pop-up */}
        <div className="space-y-2 text-xs bg-[#1a1e26] p-3 rounded-xl border border-neutral-800">
          <div className="flex items-center justify-between">
            <span className="text-neutral-400 flex items-center gap-1.5">
              <Phone className="w-3.5 h-3.5 text-neutral-400" />
              <span className="font-mono text-neutral-200 font-semibold">{alertItem.phone}</span>
            </span>
            <span className="capitalize text-neutral-300 font-medium">
              {alertItem.category} (₹{alertItem.amountDue})
            </span>
          </div>

          <div className="flex items-center justify-between pt-1 border-t border-neutral-800/80">
            <span className="text-neutral-400 flex items-center gap-1.5">
              <Calendar className="w-3.5 h-3.5 text-amber-400" />
              <span>Renewal Date:</span>
            </span>
            <span className="font-mono text-amber-300 font-bold">
              {alertItem.renewalDate}
            </span>
          </div>

          <div className="mt-1 pt-1 text-[11px] font-mono text-emerald-300 bg-emerald-950/40 p-2 rounded border border-emerald-500/20">
            "{draftedMsg}"
          </div>
        </div>

        {/* Approval Button in Pop-up */}
        <div className="mt-4 flex items-center gap-2">
          <button
            onClick={() =>
              onOpenApproval({
                id: alertItem.id,
                customerId: alertItem.customerId,
                customerName: alertItem.customerName,
                phone: alertItem.phone,
                category: alertItem.category,
                amountDue: alertItem.amountDue,
                renewalDate: alertItem.renewalDate,
              })
            }
            className="flex-1 py-2.5 px-3 bg-emerald-500 hover:bg-emerald-400 text-neutral-950 font-bold rounded-xl text-xs transition-all flex items-center justify-center gap-1.5 shadow-md cursor-pointer hover:scale-[1.02]"
          >
            <CheckCircle className="w-3.5 h-3.5" />
            <span>Approve & Draft on WhatsApp</span>
          </button>
        </div>

        {activeAlerts.length > 1 && (
          <div className="mt-2 text-center text-[10px] text-neutral-400">
            +{activeAlerts.length - 1} more member renewals pending review
          </div>
        )}
      </div>
    </div>
  );
};
