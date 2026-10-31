import React, { useState, useMemo } from 'react';
import { Search, Filter, ArrowUpDown, Calendar, CreditCard, IndianRupee, ArrowRight, Download, Receipt } from 'lucide-react';
import { CustomerCategory, PaymentRecord } from '../types.ts';

interface Props {
  payments: PaymentRecord[];
  onSelectCustomer: (customerId: string) => void;
  onOpenRecordPayment: () => void;
}

const MONTHS = [
  'All Months',
  'January', 'February', 'March', 'April', 'May', 'June',
  'July', 'August', 'September', 'October', 'November', 'December'
];

export const PaymentRecordsView: React.FC<Props> = ({
  payments,
  onSelectCustomer,
  onOpenRecordPayment,
}) => {
  const [search, setSearch] = useState('');
  const [categoryFilter, setCategoryFilter] = useState<'all' | CustomerCategory>('all');
  const [selectedMonth, setSelectedMonth] = useState<number>(0); // 0 = all
  const [selectedYear, setSelectedYear] = useState<number>(2026);
  const [sortOrder, setSortOrder] = useState<'desc' | 'asc'>('desc');

  const filteredPayments = useMemo(() => {
    return payments
      .filter((p) => {
        if (categoryFilter !== 'all' && p.category !== categoryFilter) return false;
        if (selectedMonth > 0 && p.month !== selectedMonth) return false;
        if (selectedYear > 0 && p.year !== selectedYear) return false;
        if (search.trim()) {
          const q = search.toLowerCase().trim();
          const matchesName = p.customerName.toLowerCase().includes(q);
          const matchesId = p.id.toLowerCase().includes(q);
          const matchesCustId = p.customerId.toLowerCase().includes(q);
          if (!matchesName && !matchesId && !matchesCustId) return false;
        }
        return true;
      })
      .sort((a, b) => {
        const cmp = a.paymentDate.localeCompare(b.paymentDate);
        return sortOrder === 'asc' ? cmp : -cmp;
      });
  }, [payments, categoryFilter, selectedMonth, selectedYear, search, sortOrder]);

  const totalFilteredAmount = useMemo(() => {
    return filteredPayments.reduce((sum, p) => sum + p.amount, 0);
  }, [filteredPayments]);

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-4 border-b border-neutral-800">
        <div>
          <h2 className="text-2xl font-bold text-white tracking-tight">Payment Records</h2>
          <p className="text-xs text-neutral-400 mt-1">
            Centralized ledger of confirmed membership payment transactions.
          </p>
        </div>

        <div className="flex items-center gap-3">
          <div className="px-3.5 py-2 rounded-lg bg-[#161a21] border border-neutral-800 text-xs text-neutral-300 flex items-center gap-2">
            <span>Total Shown:</span>
            <span className="font-mono font-bold text-white tabular-nums text-sm">
              ₹{totalFilteredAmount.toLocaleString('en-IN')}
            </span>
          </div>
        </div>
      </div>

      {/* Filter and Search Bar */}
      <div className="p-4 rounded-xl bg-[#161a21]/90 border border-neutral-800 flex flex-col lg:flex-row gap-3 items-stretch lg:items-center justify-between">
        {/* Search */}
        <div className="relative flex-1">
          <Search className="absolute left-3 top-2.5 w-4 h-4 text-neutral-400" />
          <input
            type="text"
            placeholder="Search by customer name, receipt ID, or customer ID..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="w-full bg-[#1e232b] border border-neutral-700/80 rounded-lg pl-9 pr-4 py-2 text-xs text-white placeholder-neutral-500 focus:outline-none focus:border-neutral-500"
          />
        </div>

        {/* Filters */}
        <div className="flex flex-wrap items-center gap-2">
          {/* Category Filter */}
          <div className="flex items-center gap-1 p-1 bg-[#1e232b] border border-neutral-700/80 rounded-lg">
            <button
              onClick={() => setCategoryFilter('all')}
              className={`px-2.5 py-1 text-xs font-medium rounded-md transition-colors ${
                categoryFilter === 'all'
                  ? 'bg-neutral-700 text-white shadow-sm'
                  : 'text-neutral-400 hover:text-white'
              }`}
            >
              All Plans
            </button>
            <button
              onClick={() => setCategoryFilter('cardio')}
              className={`px-2.5 py-1 text-xs font-medium rounded-md transition-colors ${
                categoryFilter === 'cardio'
                  ? 'bg-neutral-700 text-white shadow-sm'
                  : 'text-neutral-400 hover:text-white'
              }`}
            >
              Cardio (₹1k)
            </button>
            <button
              onClick={() => setCategoryFilter('non-cardio')}
              className={`px-2.5 py-1 text-xs font-medium rounded-md transition-colors ${
                categoryFilter === 'non-cardio'
                  ? 'bg-neutral-700 text-white shadow-sm'
                  : 'text-neutral-400 hover:text-white'
              }`}
            >
              Non-Cardio (₹600)
            </button>
          </div>

          {/* Month Dropdown */}
          <select
            value={selectedMonth}
            onChange={(e) => setSelectedMonth(Number(e.target.value))}
            className="bg-[#1e232b] border border-neutral-700/80 rounded-lg px-3 py-2 text-xs text-white focus:outline-none focus:border-neutral-500"
          >
            {MONTHS.map((m, idx) => (
              <option key={m} value={idx}>
                {m}
              </option>
            ))}
          </select>

          {/* Year Dropdown */}
          <select
            value={selectedYear}
            onChange={(e) => setSelectedYear(Number(e.target.value))}
            className="bg-[#1e232b] border border-neutral-700/80 rounded-lg px-3 py-2 text-xs text-white focus:outline-none focus:border-neutral-500 font-mono"
          >
            <option value={2024}>2024</option>
            <option value={2025}>2025</option>
            <option value={2026}>2026</option>
            <option value={2027}>2027</option>
          </select>

          {/* Sort Date Toggle */}
          <button
            onClick={() => setSortOrder((prev) => (prev === 'desc' ? 'asc' : 'desc'))}
            className="py-2 px-3 bg-[#1e232b] hover:bg-neutral-800 border border-neutral-700/80 rounded-lg text-xs font-medium text-neutral-300 flex items-center gap-1.5 transition-colors cursor-pointer"
          >
            <ArrowUpDown className="w-3.5 h-3.5 text-neutral-400" />
            <span>Date: {sortOrder === 'desc' ? 'Newest First' : 'Oldest First'}</span>
          </button>
        </div>
      </div>

      {/* Payments Table */}
      <div className="rounded-xl bg-[#161a21]/90 border border-neutral-800 shadow-xl overflow-hidden">
        {filteredPayments.length === 0 ? (
          <div className="p-12 text-center text-neutral-400">
            <Receipt className="w-8 h-8 text-neutral-500 mx-auto mb-2" />
            <p className="text-sm font-semibold text-white">No payment transactions found</p>
            <p className="text-xs text-neutral-400 mt-1">
              Try adjusting the filter criteria or record a new member fee payment.
            </p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead className="bg-[#12151b] border-b border-neutral-800 text-neutral-400 uppercase tracking-wider text-[11px]">
                <tr>
                  <th className="py-3 px-4 font-semibold">Receipt ID</th>
                  <th className="py-3 px-4 font-semibold">Customer Name</th>
                  <th className="py-3 px-4 font-semibold">Category</th>
                  <th className="py-3 px-4 font-semibold">Amount Paid</th>
                  <th className="py-3 px-4 font-semibold">Payment Date</th>
                  <th className="py-3 px-4 font-semibold">Payment Period</th>
                  <th className="py-3 px-4 font-semibold">Payment Method</th>
                  <th className="py-3 px-4 font-semibold">Transaction Status</th>
                  <th className="py-3 px-4 font-semibold text-right">Register Link</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-neutral-800/80">
                {filteredPayments.map((p) => (
                  <tr
                    key={p.id}
                    onClick={() => onSelectCustomer(p.customerId)}
                    className="hover:bg-neutral-800/40 transition-colors cursor-pointer group"
                  >
                    <td className="py-3.5 px-4 font-mono text-neutral-400 font-medium">
                      {p.id}
                    </td>

                    <td className="py-3.5 px-4 font-bold text-white group-hover:underline">
                      {p.customerName}
                    </td>

                    <td className="py-3.5 px-4 text-neutral-300 capitalize">
                      {p.category}
                    </td>

                    <td className="py-3.5 px-4 font-mono font-extrabold text-white tabular-nums">
                      ₹{p.amount.toLocaleString('en-IN')}
                    </td>

                    <td className="py-3.5 px-4 font-mono text-neutral-300">
                      {p.paymentDate}
                    </td>

                    <td className="py-3.5 px-4 font-medium text-neutral-200">
                      {p.paymentPeriod}
                    </td>

                    <td className="py-3.5 px-4 text-neutral-300">
                      {p.paymentMethod}
                    </td>

                    <td className="py-3.5 px-4">
                      <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded text-[11px] font-semibold bg-emerald-950/40 text-emerald-300 border border-emerald-700/50">
                        ● Completed
                      </span>
                    </td>

                    <td className="py-3.5 px-4 text-right">
                      <span className="text-neutral-400 group-hover:text-white font-medium text-xs flex items-center justify-end gap-1">
                        Open Register <ArrowRight className="w-3.5 h-3.5" />
                      </span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
};
