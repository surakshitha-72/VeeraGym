import React, { useState, useEffect } from 'react';
import { ArrowLeft, Check, CheckCircle, XCircle, AlertCircle, Calendar, Edit2, PlusCircle, CreditCard, ChevronLeft, ChevronRight, Phone, Scale, RefreshCw } from 'lucide-react';
import { Customer, MonthRegisterRow } from '../types.ts';
import { fetchCustomerRegister, updateMonthStatus } from '../services/api.ts';

interface Props {
  customer: Customer;
  onBack: () => void;
  onEditCustomer: () => void;
  onOpenRecordPayment: (defaultMonth?: number, defaultYear?: number) => void;
  onViewPaymentDetails: (paymentDetails: any) => void;
  refreshTrigger: number;
}

export const CustomerRegisterView: React.FC<Props> = ({
  customer,
  onBack,
  onEditCustomer,
  onOpenRecordPayment,
  onViewPaymentDetails,
  refreshTrigger,
}) => {
  const [selectedYear, setSelectedYear] = useState<number>(2026);
  const [registerRows, setRegisterRows] = useState<MonthRegisterRow[]>([]);
  const [isLoading, setIsLoading] = useState<boolean>(true);
  const [updatingMonth, setUpdatingMonth] = useState<number | null>(null);

  const loadRegister = async () => {
    setIsLoading(true);
    try {
      const data = await fetchCustomerRegister(customer.id, selectedYear);
      setRegisterRows(data);
    } catch (err) {
      console.error(err);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    loadRegister();
  }, [customer.id, selectedYear, refreshTrigger]);

  const handleToggleStatus = async (monthIndex: number, newActive: boolean) => {
    setUpdatingMonth(monthIndex);
    try {
      const updatedRows = await updateMonthStatus(
        customer.id,
        selectedYear,
        monthIndex,
        newActive,
        !newActive
      );
      setRegisterRows(updatedRows);
    } catch (err) {
      console.error(err);
    } finally {
      setUpdatingMonth(null);
    }
  };

  const isCardio = customer.category === 'cardio';

  return (
    <div className="space-y-6">
      {/* Top Navigation & Back Action */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-4 border-b border-neutral-800">
        <div className="flex items-center gap-3">
          <button
            onClick={onBack}
            className="p-2 bg-neutral-800/80 hover:bg-neutral-700 text-neutral-300 hover:text-white rounded-lg border border-neutral-700 transition-colors cursor-pointer"
            title="Return to Customer List"
          >
            <ArrowLeft className="w-5 h-5" />
          </button>
          <div>
            <div className="flex items-center gap-2">
              <span className="font-mono text-xs px-2 py-0.5 rounded bg-neutral-800 text-neutral-300 border border-neutral-700">
                {customer.id}
              </span>
              <h2 className="text-2xl font-bold text-white tracking-tight">
                {customer.name}
              </h2>
            </div>
            <p className="text-xs text-neutral-400 mt-1">
              Individual Monthly Payment Maintenance Register · {customer.category === 'cardio' ? 'Cardio Member' : 'Non-Cardio Member'}
            </p>
          </div>
        </div>

        <div className="flex items-center gap-3">
          <button
            onClick={onEditCustomer}
            className="py-2 px-3.5 bg-neutral-800 hover:bg-neutral-700 text-neutral-200 border border-neutral-700 rounded-lg text-xs font-semibold transition-colors flex items-center gap-1.5 cursor-pointer"
          >
            <Edit2 className="w-3.5 h-3.5" />
            <span>Edit Profile</span>
          </button>

          <button
            onClick={() => onOpenRecordPayment()}
            className="py-2 px-4 bg-white hover:bg-neutral-100 text-neutral-950 font-semibold rounded-lg text-xs transition-colors flex items-center gap-1.5 shadow-sm cursor-pointer"
          >
            <PlusCircle className="w-4 h-4" />
            <span>Record Payment</span>
          </button>
        </div>
      </div>

      {/* Customer Profile Card */}
      <div className="rounded-xl bg-[#161a21]/95 border border-neutral-800 p-6 shadow-xl space-y-4">
        <div className="flex items-center justify-between border-b border-neutral-800/80 pb-3">
          <h3 className="text-xs font-semibold uppercase tracking-wider text-neutral-400">
            Customer Profile Information
          </h3>
          <span
            className={`px-2.5 py-0.5 rounded text-xs font-bold ${
              customer.status === 'active'
                ? 'bg-emerald-950/40 text-emerald-300 border border-emerald-700/50'
                : 'bg-neutral-800 text-neutral-400 border border-neutral-700'
            }`}
          >
            {customer.status === 'active' ? '● Active Member' : '○ Inactive Member'}
          </span>
        </div>

        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-4 text-xs">
          <div className="p-3 bg-[#1e232b] rounded-lg border border-neutral-800/80">
            <span className="text-neutral-400 block text-[11px] mb-1">Mobile Number</span>
            <div className="font-mono text-white font-semibold flex items-center gap-1.5">
              <Phone className="w-3.5 h-3.5 text-neutral-400" />
              <span>{customer.phone}</span>
            </div>
          </div>

          <div className="p-3 bg-[#1e232b] rounded-lg border border-neutral-800/80">
            <span className="text-neutral-400 block text-[11px] mb-1">Body Weight</span>
            <div className="font-mono text-white font-semibold flex items-center gap-1.5">
              <Scale className="w-3.5 h-3.5 text-neutral-400" />
              <span>{customer.weightKg} kg</span>
            </div>
          </div>

          <div className="p-3 bg-[#1e232b] rounded-lg border border-neutral-800/80">
            <span className="text-neutral-400 block text-[11px] mb-1">Category & Fee</span>
            <div className="font-semibold text-white capitalize">
              {customer.category} (₹{customer.monthlyFee.toLocaleString('en-IN')})
            </div>
          </div>

          <div className="p-3 bg-[#1e232b] rounded-lg border border-neutral-800/80">
            <span className="text-neutral-400 block text-[11px] mb-1">Joining Date</span>
            <div className="font-mono text-white font-semibold flex items-center gap-1.5">
              <Calendar className="w-3.5 h-3.5 text-neutral-400" />
              <span>{customer.joiningDate}</span>
            </div>
          </div>

          <div className="p-3 bg-[#1e232b] rounded-lg border border-neutral-800/80">
            <span className="text-neutral-400 block text-[11px] mb-1">Last Payment Date</span>
            <div className="font-mono text-white font-semibold flex items-center gap-1.5">
              <CreditCard className="w-3.5 h-3.5 text-neutral-400" />
              <span>{customer.lastPaymentDate || 'None'}</span>
            </div>
          </div>

          <div className="p-3 bg-[#1e232b] rounded-lg border border-neutral-800/80">
            <span className="text-neutral-400 block text-[11px] mb-1">Next Renewal Date</span>
            <div className="font-mono text-amber-300 font-bold flex items-center gap-1.5">
              <Calendar className="w-3.5 h-3.5 text-amber-400" />
              <span>{customer.nextRenewalDate}</span>
            </div>
          </div>
        </div>

        {customer.notes && (
          <div className="p-3 bg-[#1e232b]/60 rounded-lg border border-neutral-800/60 text-xs text-neutral-300">
            <span className="font-semibold text-neutral-400 mr-2">Notes:</span>
            <span>{customer.notes}</span>
          </div>
        )}
      </div>

      {/* Monthly Payment Maintenance Register Container */}
      <div className="rounded-xl bg-[#161a21]/95 border border-neutral-800 shadow-xl overflow-hidden">
        {/* Table Header Strip with Year Selector */}
        <div className="p-5 border-b border-neutral-800 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
          <div>
            <h3 className="text-base font-bold text-white tracking-tight">
              Annual Monthly Payment Maintenance Register
            </h3>
            <p className="text-xs text-neutral-400 mt-0.5">
              Official 12-month gym register. Tick marks appear automatically upon recorded payment. Active/Inactive columns are editable.
            </p>
          </div>

          {/* Year Switcher */}
          <div className="flex items-center gap-2 bg-[#1e232b] border border-neutral-700/80 rounded-lg p-1">
            <button
              onClick={() => setSelectedYear((y) => y - 1)}
              className="p-1 text-neutral-400 hover:text-white rounded hover:bg-neutral-800 transition-colors"
              title="Previous Year"
            >
              <ChevronLeft className="w-4 h-4" />
            </button>
            <span className="px-3 font-mono font-bold text-sm text-white tabular-nums">
              {selectedYear}
            </span>
            <button
              onClick={() => setSelectedYear((y) => y + 1)}
              className="p-1 text-neutral-400 hover:text-white rounded hover:bg-neutral-800 transition-colors"
              title="Next Year"
            >
              <ChevronRight className="w-4 h-4" />
            </button>
          </div>
        </div>

        {/* The Exact Required Table Layout */}
        <div className="overflow-x-auto">
          <table className="w-full text-center text-xs">
            <thead className="bg-[#12151b] border-b border-neutral-800 text-neutral-300 uppercase tracking-wider text-[11px]">
              <tr>
                <th className="py-3 px-6 text-left font-bold text-neutral-400">Month</th>
                <th className="py-3 px-4 font-bold text-neutral-300 border-l border-neutral-800/80">
                  ₹600 <span className="text-[10px] lowercase text-neutral-400 block font-normal">(Non-Cardio)</span>
                </th>
                <th className="py-3 px-4 font-bold text-neutral-300 border-l border-neutral-800/80">
                  ₹1000 <span className="text-[10px] lowercase text-neutral-400 block font-normal">(Cardio)</span>
                </th>
                <th className="py-3 px-4 font-bold text-neutral-300 border-l border-neutral-800/80">
                  Not Paid
                </th>
                <th className="py-3 px-4 font-bold text-emerald-400 border-l border-neutral-800/80">
                  Active
                </th>
                <th className="py-3 px-4 font-bold text-neutral-400 border-l border-neutral-800/80">
                  Inactive
                </th>
                <th className="py-3 px-4 font-bold text-neutral-400 border-l border-neutral-800/80 text-right">
                  Register Action
                </th>
              </tr>
            </thead>
            <tbody className="divide-y divide-neutral-800/80">
              {registerRows.map((row) => {
                const hasPayment = row.paid600 || row.paid1000;

                return (
                  <tr
                    key={row.monthIndex}
                    className="hover:bg-neutral-800/30 transition-colors"
                  >
                    {/* Month Name */}
                    <td className="py-3.5 px-6 text-left font-semibold text-white">
                      {row.monthName}
                    </td>

                    {/* ₹600 Column */}
                    <td className="py-3.5 px-4 border-l border-neutral-800/80">
                      {row.paid600 ? (
                        <button
                          onClick={() => onViewPaymentDetails(row.paymentDetails)}
                          className="inline-flex items-center justify-center gap-1.5 px-2.5 py-1 rounded bg-emerald-500/15 border border-emerald-500/30 text-emerald-400 font-bold text-xs hover:bg-emerald-500/25 transition-all cursor-pointer shadow-sm"
                          title="Click to view payment transaction details"
                        >
                          <Check className="w-4 h-4 text-emerald-400 stroke-[3]" />
                          <span className="font-mono tabular-nums">✓ Paid ₹600</span>
                        </button>
                      ) : (
                        <span className="text-neutral-600">—</span>
                      )}
                    </td>

                    {/* ₹1000 Column */}
                    <td className="py-3.5 px-4 border-l border-neutral-800/80">
                      {row.paid1000 ? (
                        <button
                          onClick={() => onViewPaymentDetails(row.paymentDetails)}
                          className="inline-flex items-center justify-center gap-1.5 px-2.5 py-1 rounded bg-emerald-500/15 border border-emerald-500/30 text-emerald-400 font-bold text-xs hover:bg-emerald-500/25 transition-all cursor-pointer shadow-sm"
                          title="Click to view payment transaction details"
                        >
                          <Check className="w-4 h-4 text-emerald-400 stroke-[3]" />
                          <span className="font-mono tabular-nums">✓ Paid ₹1,000</span>
                        </button>
                      ) : (
                        <span className="text-neutral-600">—</span>
                      )}
                    </td>

                    {/* Not Paid Column */}
                    <td className="py-3.5 px-4 border-l border-neutral-800/80">
                      {row.isNotPaid ? (
                        <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded text-[11px] font-bold bg-red-950/40 text-red-400 border border-red-800/50">
                          <AlertCircle className="w-3.5 h-3.5" />
                          <span>Not Paid</span>
                        </span>
                      ) : hasPayment ? (
                        <span className="text-neutral-600 text-xs">—</span>
                      ) : (
                        <span className="text-neutral-600 text-xs">—</span>
                      )}
                    </td>

                    {/* Active Column (Mutually exclusive, editable) */}
                    <td className="py-3.5 px-4 border-l border-neutral-800/80">
                      <button
                        type="button"
                        onClick={() => handleToggleStatus(row.monthIndex, true)}
                        disabled={updatingMonth === row.monthIndex}
                        className={`w-7 h-7 rounded-lg border flex items-center justify-center mx-auto transition-all cursor-pointer ${
                          row.isActive
                            ? 'bg-emerald-500 border-emerald-400 text-neutral-950 shadow-md font-bold'
                            : 'bg-[#1e232b] border-neutral-700 text-neutral-600 hover:border-neutral-500'
                        }`}
                        title="Mark Active for this month"
                      >
                        {row.isActive && <Check className="w-4 h-4 stroke-[3]" />}
                      </button>
                    </td>

                    {/* Inactive Column (Mutually exclusive, editable) */}
                    <td className="py-3.5 px-4 border-l border-neutral-800/80">
                      <button
                        type="button"
                        onClick={() => handleToggleStatus(row.monthIndex, false)}
                        disabled={updatingMonth === row.monthIndex}
                        className={`w-7 h-7 rounded-lg border flex items-center justify-center mx-auto transition-all cursor-pointer ${
                          row.isInactive
                            ? 'bg-neutral-600 border-neutral-400 text-white shadow-md font-bold'
                            : 'bg-[#1e232b] border-neutral-700 text-neutral-600 hover:border-neutral-500'
                        }`}
                        title="Mark Inactive for this month"
                      >
                        {row.isInactive && <Check className="w-4 h-4 stroke-[3]" />}
                      </button>
                    </td>

                    {/* Quick Row Action */}
                    <td className="py-3.5 px-4 border-l border-neutral-800/80 text-right">
                      {hasPayment ? (
                        <button
                          onClick={() => onViewPaymentDetails(row.paymentDetails)}
                          className="py-1 px-2.5 rounded bg-neutral-800 hover:bg-neutral-700 text-neutral-300 text-[11px] font-medium transition-colors"
                        >
                          View Receipt
                        </button>
                      ) : (
                        <button
                          onClick={() => onOpenRecordPayment(row.monthIndex + 1, selectedYear)}
                          className="py-1 px-2.5 rounded bg-white hover:bg-neutral-100 text-neutral-950 text-[11px] font-semibold transition-colors"
                        >
                          + Record Due
                        </button>
                      )}
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>

        {/* Legend / Guidance Note */}
        <div className="p-4 bg-[#12151b] border-t border-neutral-800 text-[11px] text-neutral-400 flex flex-wrap items-center justify-between gap-4">
          <div className="flex items-center gap-4">
            <div className="flex items-center gap-1.5">
              <span className="w-3 h-3 rounded bg-emerald-500/20 border border-emerald-500/40 text-emerald-400 flex items-center justify-center text-[9px] font-bold">✓</span>
              <span>Paid Tick Mark</span>
            </div>
            <div className="flex items-center gap-1.5">
              <span className="w-3 h-3 rounded bg-red-950/40 border border-red-800/50 text-red-400 flex items-center justify-center text-[9px] font-bold">!</span>
              <span>Not Paid (Overdue)</span>
            </div>
            <div className="flex items-center gap-1.5">
              <span className="w-3 h-3 rounded bg-emerald-500 text-neutral-950 flex items-center justify-center text-[9px] font-bold">✓</span>
              <span>Active Month</span>
            </div>
            <div className="flex items-center gap-1.5">
              <span className="w-3 h-3 rounded bg-neutral-600 text-white flex items-center justify-center text-[9px] font-bold">✓</span>
              <span>Inactive Month</span>
            </div>
          </div>

          <div className="text-neutral-500">
            Click any green tick mark to inspect the receipt and payment timestamp.
          </div>
        </div>
      </div>
    </div>
  );
};
