import React, { useState } from 'react';
import { BellRing, Calendar, Clock, AlertTriangle, CheckCircle2, MessageSquare, ToggleLeft, ToggleRight, UserX, IndianRupee, Send, ShieldAlert } from 'lucide-react';
import { Customer, RenewalReminder } from '../types.ts';
import { notifyReminder, updateReminder, updateCustomer } from '../services/api.ts';
import { WhatsAppReminderTarget } from '../components/WhatsAppApprovalModal.tsx';

interface Props {
  reminders: RenewalReminder[];
  onRefresh: () => void;
  onSelectCustomer: (customerId: string) => void;
  onQuickRecordPayment: (customerId: string) => void;
  onOpenWhatsAppApproval: (target: WhatsAppReminderTarget) => void;
}

type TabType = 'due-today' | 'upcoming' | 'pending' | 'all';

export const RenewalRemindersView: React.FC<Props> = ({
  reminders,
  onRefresh,
  onSelectCustomer,
  onQuickRecordPayment,
  onOpenWhatsAppApproval,
}) => {
  const [activeTab, setActiveTab] = useState<TabType>('due-today');
  const [actionLoading, setActionLoading] = useState<string | null>(null);

  const dueTodayList = reminders.filter((r) => r.status === 'Due Today');
  const upcomingList = reminders.filter((r) => r.status === 'Upcoming');
  const pendingList = reminders.filter((r) => r.status === 'Pending / Overdue');
  const historyList = reminders.filter((r) => r.status === 'Sent' || r.status === 'Paid');

  const getDisplayedList = () => {
    switch (activeTab) {
      case 'due-today':
        return dueTodayList;
      case 'upcoming':
        return upcomingList;
      case 'pending':
        return pendingList;
      case 'all':
      default:
        return reminders;
    }
  };

  const handleToggleEnabled = async (reminder: RenewalReminder) => {
    setActionLoading(reminder.id);
    try {
      await updateReminder(reminder.id, { enabled: !reminder.enabled });
      onRefresh();
    } catch (err) {
      console.error(err);
    } finally {
      setActionLoading(null);
    }
  };

  const handleSendInAppNotice = async (reminder: RenewalReminder) => {
    setActionLoading(reminder.id);
    try {
      await notifyReminder(reminder.id);
      onRefresh();
    } catch (err) {
      console.error(err);
    } finally {
      setActionLoading(null);
    }
  };

  const handleOpenWhatsApp = (reminder: RenewalReminder) => {
    const cleanPhone = reminder.phone.replace(/[^0-9]/g, '');
    const phoneWithCode = cleanPhone.length === 10 ? `91${cleanPhone}` : cleanPhone;
    const msg = encodeURIComponent(
      `Hello ${reminder.customerName}, this is a gentle reminder from VeeraGym. Your ${reminder.category === 'cardio' ? 'Cardio' : 'Non-Cardio'} gym membership (₹${reminder.amountDue}) is due for renewal on ${reminder.renewalDate}. Kindly pay to maintain your daily gym access. Thank you!`
    );
    window.open(`https://wa.me/${phoneWithCode}?text=${msg}`, '_blank');
  };

  const handleMarkInactive = async (reminder: RenewalReminder) => {
    if (!window.confirm(`Are you sure you want to mark ${reminder.customerName} as Inactive? They will no longer receive renewal reminders.`)) {
      return;
    }
    setActionLoading(reminder.id);
    try {
      await updateCustomer(reminder.customerId, { status: 'inactive' });
      onRefresh();
    } catch (err) {
      console.error(err);
    } finally {
      setActionLoading(null);
    }
  };

  const currentList = getDisplayedList();

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-4 border-b border-neutral-800">
        <div>
          <h2 className="text-2xl font-bold text-white tracking-tight">Renewal Reminders</h2>
          <p className="text-xs text-neutral-400 mt-1">
            Automated monthly renewal schedule with 2-day advance alerts. Inactive members are automatically excluded.
          </p>
        </div>

        <div className="flex items-center gap-2">
          <span className="px-3 py-1 rounded-lg bg-neutral-800/80 border border-neutral-700 text-xs text-neutral-300 font-mono">
            {dueTodayList.length} Reminders Due Today
          </span>
        </div>
      </div>

      {/* Tabs / Sub-Sections */}
      <div className="flex flex-wrap items-center gap-2 border-b border-neutral-800 pb-2">
        <button
          onClick={() => setActiveTab('due-today')}
          className={`py-2 px-4 rounded-lg text-xs font-semibold transition-colors flex items-center gap-2 cursor-pointer ${
            activeTab === 'due-today'
              ? 'bg-amber-500/20 text-amber-300 border border-amber-500/40 shadow-sm'
              : 'text-neutral-400 hover:text-white hover:bg-neutral-800/40'
          }`}
        >
          <Clock className="w-3.5 h-3.5" />
          <span>Reminders Due Today</span>
          <span className="px-1.5 py-0.2 bg-amber-500/30 text-amber-200 rounded text-[10px] font-mono tabular-nums">
            {dueTodayList.length}
          </span>
        </button>

        <button
          onClick={() => setActiveTab('upcoming')}
          className={`py-2 px-4 rounded-lg text-xs font-semibold transition-colors flex items-center gap-2 cursor-pointer ${
            activeTab === 'upcoming'
              ? 'bg-neutral-700 text-white shadow-sm'
              : 'text-neutral-400 hover:text-white hover:bg-neutral-800/40'
          }`}
        >
          <Calendar className="w-3.5 h-3.5" />
          <span>Upcoming Renewals</span>
          <span className="px-1.5 py-0.2 bg-neutral-800 text-neutral-300 rounded text-[10px] font-mono tabular-nums">
            {upcomingList.length}
          </span>
        </button>

        <button
          onClick={() => setActiveTab('pending')}
          className={`py-2 px-4 rounded-lg text-xs font-semibold transition-colors flex items-center gap-2 cursor-pointer ${
            activeTab === 'pending'
              ? 'bg-red-950/40 text-red-300 border border-red-800/40 shadow-sm'
              : 'text-neutral-400 hover:text-white hover:bg-neutral-800/40'
          }`}
        >
          <AlertTriangle className="w-3.5 h-3.5" />
          <span>Pending / Overdue</span>
          <span className="px-1.5 py-0.2 bg-red-900/50 text-red-200 rounded text-[10px] font-mono tabular-nums">
            {pendingList.length}
          </span>
        </button>

        <button
          onClick={() => setActiveTab('all')}
          className={`py-2 px-4 rounded-lg text-xs font-semibold transition-colors flex items-center gap-2 cursor-pointer ${
            activeTab === 'all'
              ? 'bg-neutral-700 text-white shadow-sm'
              : 'text-neutral-400 hover:text-white hover:bg-neutral-800/40'
          }`}
        >
          <BellRing className="w-3.5 h-3.5" />
          <span>All Active Reminders</span>
          <span className="px-1.5 py-0.2 bg-neutral-800 text-neutral-300 rounded text-[10px] font-mono tabular-nums">
            {reminders.length}
          </span>
        </button>
      </div>

      {/* Reminders Table */}
      <div className="rounded-xl bg-[#161a21]/90 border border-neutral-800 shadow-xl overflow-hidden">
        {currentList.length === 0 ? (
          <div className="p-12 text-center text-neutral-400">
            <CheckCircle2 className="w-8 h-8 text-neutral-500 mx-auto mb-2" />
            <p className="text-sm font-semibold text-white">No reminders in this queue</p>
            <p className="text-xs text-neutral-400 mt-1">All members are up to date or no upcoming renewals fit this filter.</p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead className="bg-[#12151b] border-b border-neutral-800 text-neutral-400 uppercase tracking-wider text-[11px]">
                <tr>
                  <th className="py-3 px-4 font-semibold">Customer</th>
                  <th className="py-3 px-4 font-semibold">Mobile Number</th>
                  <th className="py-3 px-4 font-semibold">Membership</th>
                  <th className="py-3 px-4 font-semibold">Amount Due</th>
                  <th className="py-3 px-4 font-semibold">Renewal Date</th>
                  <th className="py-3 px-4 font-semibold">Reminder Date</th>
                  <th className="py-3 px-4 font-semibold">Status</th>
                  <th className="py-3 px-4 font-semibold">Reminder State</th>
                  <th className="py-3 px-4 font-semibold text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-neutral-800/80">
                {currentList.map((rem) => {
                  const isDueToday = rem.status === 'Due Today';
                  const isOverdue = rem.status === 'Pending / Overdue';

                  return (
                    <tr
                      key={rem.id}
                      className={`hover:bg-neutral-800/40 transition-colors ${
                        isDueToday ? 'bg-amber-950/10' : isOverdue ? 'bg-red-950/10' : ''
                      }`}
                    >
                      <td className="py-3.5 px-4 font-bold text-white">
                        <button
                          onClick={() => onSelectCustomer(rem.customerId)}
                          className="hover:underline text-left cursor-pointer"
                        >
                          {rem.customerName}
                        </button>
                      </td>

                      <td className="py-3.5 px-4 font-mono text-neutral-300">
                        {rem.phone}
                      </td>

                      <td className="py-3.5 px-4 text-neutral-300 capitalize">
                        {rem.category}
                      </td>

                      <td className="py-3.5 px-4 font-mono font-extrabold text-white tabular-nums">
                        ₹{rem.amountDue.toLocaleString('en-IN')}
                      </td>

                      <td className="py-3.5 px-4 font-mono text-neutral-200 font-semibold">
                        {rem.renewalDate}
                      </td>

                      <td className="py-3.5 px-4 font-mono text-neutral-400">
                        {rem.reminderDate} (2 days prior)
                      </td>

                      <td className="py-3.5 px-4">
                        {isDueToday && (
                          <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded text-[11px] font-bold bg-amber-500/20 text-amber-300 border border-amber-500/40">
                            ● Due Today
                          </span>
                        )}
                        {isOverdue && (
                          <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded text-[11px] font-bold bg-red-950/40 text-red-400 border border-red-800/50">
                            ! Overdue
                          </span>
                        )}
                        {rem.status === 'Upcoming' && (
                          <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded text-[11px] font-medium bg-neutral-800 text-neutral-300 border border-neutral-700">
                            Upcoming
                          </span>
                        )}
                        {rem.status === 'Sent' && (
                          <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded text-[11px] font-semibold bg-blue-950/40 text-blue-300 border border-blue-800/50">
                            Sent In-App
                          </span>
                        )}
                        {rem.status === 'Paid' && (
                          <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded text-[11px] font-semibold bg-emerald-950/40 text-emerald-300 border border-emerald-700/50">
                            ✓ Paid
                          </span>
                        )}
                      </td>

                      <td className="py-3.5 px-4">
                        <button
                          onClick={() => handleToggleEnabled(rem)}
                          className={`text-xs font-medium flex items-center gap-1.5 transition-colors cursor-pointer ${
                            rem.enabled ? 'text-emerald-400 hover:text-emerald-300' : 'text-neutral-500 hover:text-neutral-400'
                          }`}
                          title={rem.enabled ? 'Click to disable reminder' : 'Click to enable reminder'}
                        >
                          {rem.enabled ? (
                            <>
                              <ToggleRight className="w-4 h-4 text-emerald-400" />
                              <span>Enabled</span>
                            </>
                          ) : (
                            <>
                              <ToggleLeft className="w-4 h-4 text-neutral-500" />
                              <span>Disabled</span>
                            </>
                          )}
                        </button>
                      </td>

                      <td className="py-3.5 px-4 text-right">
                        <div className="flex items-center justify-end gap-1.5">
                          <button
                            onClick={() =>
                              onOpenWhatsAppApproval({
                                id: rem.id,
                                customerId: rem.customerId,
                                customerName: rem.customerName,
                                phone: rem.phone,
                                category: rem.category,
                                amountDue: rem.amountDue,
                                renewalDate: rem.renewalDate,
                              })
                            }
                            className="py-1 px-2.5 bg-emerald-500 hover:bg-emerald-400 text-neutral-950 font-bold rounded text-xs transition-all flex items-center gap-1 cursor-pointer shadow-sm hover:scale-105 shrink-0"
                            title="Approve and draft WhatsApp renewal message"
                          >
                            <MessageSquare className="w-3.5 h-3.5" />
                            <span>Approve WhatsApp</span>
                          </button>

                          <button
                            onClick={() => onQuickRecordPayment(rem.customerId)}
                            className="py-1 px-2.5 bg-white hover:bg-neutral-100 text-neutral-950 font-bold rounded text-xs transition-colors cursor-pointer shrink-0"
                          >
                            Mark Paid
                          </button>

                          <button
                            onClick={() => handleMarkInactive(rem)}
                            className="p-1.5 bg-neutral-800 hover:bg-red-950/40 text-neutral-400 hover:text-red-300 rounded transition-colors shrink-0 cursor-pointer"
                            title="Mark Customer Inactive"
                          >
                            <UserX className="w-3.5 h-3.5" />
                          </button>
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Integration & Policy Notice */}
      <div className="p-4 rounded-xl bg-[#14181f]/80 border border-neutral-800/80 text-xs text-neutral-400 space-y-1">
        <div className="font-semibold text-neutral-300 flex items-center gap-2">
          <ShieldAlert className="w-4 h-4 text-neutral-400" />
          <span>Automated Reminder Business Rules</span>
        </div>
        <p>
          Reminders are automatically computed 2 days before each active member's renewal date.
          Once marked Inactive, reminder tracking stops immediately. When reactivated, reminders resume according to the new membership cycle.
          The WhatsApp button generates the exact pre-filled renewal message for the gym owner's phone without requiring costly external gateways.
        </p>
      </div>
    </div>
  );
};
