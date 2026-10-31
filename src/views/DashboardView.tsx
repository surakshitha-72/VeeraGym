import React from 'react';
import { Users, HeartPulse, Dumbbell, AlertTriangle, ArrowRight, IndianRupee, Plus, Mic, CheckCircle2 } from 'lucide-react';
import { Customer, CustomerCategory, DashboardStats } from '../types.ts';

interface Props {
  stats: DashboardStats | null;
  onNavigateCategory: (category: CustomerCategory) => void;
  onNavigateCustomersCategorySelection: () => void;
  onSelectCustomer: (customerId: string) => void;
  onOpenAddCustomer: () => void;
  onOpenVoiceRegister: () => void;
  onQuickRecordPayment: (customer: Customer) => void;
}

export const DashboardView: React.FC<Props> = ({
  stats,
  onNavigateCategory,
  onNavigateCustomersCategorySelection,
  onSelectCustomer,
  onOpenAddCustomer,
  onOpenVoiceRegister,
  onQuickRecordPayment,
}) => {
  if (!stats) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <div className="text-neutral-400 text-sm">Loading dashboard data...</div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Welcome Banner with Quick Actions */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 p-6 rounded-xl bg-[#14181f]/90 border border-neutral-800 shadow-xl backdrop-blur-sm">
        <div>
          <h2 className="text-2xl font-bold text-white tracking-tight">VeeraGym Dashboard</h2>
          <p className="text-xs text-neutral-400 mt-1">
            Smart digital register for member attendance, monthly fees, and renewal tracking.
          </p>
        </div>

        <div className="flex items-center gap-3">
          <button
            onClick={onOpenVoiceRegister}
            className="py-2 px-3.5 bg-neutral-800 hover:bg-neutral-700 text-neutral-200 border border-neutral-700 rounded-lg text-xs font-semibold transition-colors flex items-center gap-2 cursor-pointer"
          >
            <Mic className="w-4 h-4 text-neutral-300" />
            <span>Voice Registration</span>
          </button>
          <button
            onClick={onOpenAddCustomer}
            className="py-2 px-4 bg-white hover:bg-neutral-100 text-neutral-950 font-semibold rounded-lg text-xs transition-colors flex items-center gap-2 shadow-sm cursor-pointer"
          >
            <Plus className="w-4 h-4" />
            <span>Add Customer</span>
          </button>
        </div>
      </div>

      {/* 4 Mandatory Dashboard Summary Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {/* Card 1: Total Customers */}
        <div
          onClick={onNavigateCustomersCategorySelection}
          className="p-5 rounded-xl bg-[#161a21]/90 border border-neutral-800 hover:border-neutral-700 transition-all cursor-pointer group shadow-lg"
        >
          <div className="flex items-center justify-between mb-3">
            <span className="text-xs font-semibold uppercase tracking-wider text-neutral-400">
              Total Customers
            </span>
            <div className="p-2 rounded-lg bg-neutral-800 text-neutral-300 group-hover:text-white transition-colors">
              <Users className="w-4 h-4" />
            </div>
          </div>
          <div className="text-3xl font-extrabold text-white font-mono tabular-nums">
            {stats.totalCustomers}
          </div>
          <div className="mt-3 flex items-center justify-between text-xs text-neutral-400">
            <span>All registered members</span>
            <span className="flex items-center gap-1 text-neutral-300 group-hover:translate-x-0.5 transition-transform">
              View Categories <ArrowRight className="w-3.5 h-3.5" />
            </span>
          </div>
        </div>

        {/* Card 2: Cardio Customers */}
        <div
          onClick={() => onNavigateCategory('cardio')}
          className="p-5 rounded-xl bg-[#161a21]/90 border border-neutral-800 hover:border-neutral-700 transition-all cursor-pointer group shadow-lg"
        >
          <div className="flex items-center justify-between mb-3">
            <span className="text-xs font-semibold uppercase tracking-wider text-neutral-400">
              Cardio Customers
            </span>
            <div className="p-2 rounded-lg bg-neutral-800 text-neutral-300 group-hover:text-white transition-colors">
              <HeartPulse className="w-4 h-4" />
            </div>
          </div>
          <div className="text-3xl font-extrabold text-white font-mono tabular-nums">
            {stats.cardioCustomers}
          </div>
          <div className="mt-3 flex items-center justify-between text-xs text-neutral-400">
            <span className="font-mono text-neutral-300">₹1,000 / month</span>
            <span className="flex items-center gap-1 text-neutral-300 group-hover:translate-x-0.5 transition-transform">
              Open List <ArrowRight className="w-3.5 h-3.5" />
            </span>
          </div>
        </div>

        {/* Card 3: Non-Cardio Customers */}
        <div
          onClick={() => onNavigateCategory('non-cardio')}
          className="p-5 rounded-xl bg-[#161a21]/90 border border-neutral-800 hover:border-neutral-700 transition-all cursor-pointer group shadow-lg"
        >
          <div className="flex items-center justify-between mb-3">
            <span className="text-xs font-semibold uppercase tracking-wider text-neutral-400">
              Non-Cardio Customers
            </span>
            <div className="p-2 rounded-lg bg-neutral-800 text-neutral-300 group-hover:text-white transition-colors">
              <Dumbbell className="w-4 h-4" />
            </div>
          </div>
          <div className="text-3xl font-extrabold text-white font-mono tabular-nums">
            {stats.nonCardioCustomers}
          </div>
          <div className="mt-3 flex items-center justify-between text-xs text-neutral-400">
            <span className="font-mono text-neutral-300">₹600 / month</span>
            <span className="flex items-center gap-1 text-neutral-300 group-hover:translate-x-0.5 transition-transform">
              Open List <ArrowRight className="w-3.5 h-3.5" />
            </span>
          </div>
        </div>

        {/* Card 4: Pending Payments */}
        <div className="p-5 rounded-xl bg-[#161a21]/90 border border-neutral-800 shadow-lg">
          <div className="flex items-center justify-between mb-3">
            <span className="text-xs font-semibold uppercase tracking-wider text-amber-400">
              Pending Payments
            </span>
            <div className="p-2 rounded-lg bg-amber-500/10 border border-amber-500/20 text-amber-400">
              <AlertTriangle className="w-4 h-4" />
            </div>
          </div>
          <div className="text-3xl font-extrabold text-white font-mono tabular-nums">
            {stats.pendingPayments}
          </div>
          <div className="mt-3 flex items-center justify-between text-xs text-neutral-400">
            <span>Members awaiting renewal</span>
            <span className="font-mono text-amber-400 font-semibold">Active cycles</span>
          </div>
        </div>
      </div>

      {/* Revenue Snapshot Strip */}
      <div className="p-4 rounded-xl bg-[#161a21]/70 border border-neutral-800/80 flex flex-col sm:flex-row items-center justify-between gap-3 text-xs">
        <div className="flex items-center gap-2 text-neutral-300">
          <IndianRupee className="w-4 h-4 text-emerald-400" />
          <span>Total Monthly Fees Collected this Month:</span>
          <span className="font-mono text-base font-bold text-white tabular-nums">
            ₹{stats.monthlyRevenue.toLocaleString('en-IN')}
          </span>
        </div>
        <div className="text-neutral-400 font-mono text-[11px]">
          Automatic daily calculation from verified transactions
        </div>
      </div>

      {/* Outstanding / Pending Payments Table */}
      <div className="rounded-xl bg-[#161a21]/90 border border-neutral-800 shadow-xl overflow-hidden">
        <div className="p-5 border-b border-neutral-800 flex items-center justify-between">
          <div>
            <h3 className="text-base font-bold text-white tracking-tight">
              Customers With Outstanding Monthly Payments
            </h3>
            <p className="text-xs text-neutral-400 mt-0.5">
              Active members whose current monthly payment has not yet been recorded.
            </p>
          </div>
          <span className="px-2.5 py-1 text-xs font-semibold rounded-md bg-amber-500/15 text-amber-300 border border-amber-500/30 font-mono tabular-nums">
            {stats.pendingCustomers.length} Pending
          </span>
        </div>

        {stats.pendingCustomers.length === 0 ? (
          <div className="p-10 text-center text-neutral-400">
            <CheckCircle2 className="w-8 h-8 text-emerald-400 mx-auto mb-2" />
            <p className="text-sm font-semibold text-white">All Active Members Paid!</p>
            <p className="text-xs text-neutral-400 mt-1">There are no pending dues for the current membership cycle.</p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead className="bg-[#12151b] border-b border-neutral-800 text-neutral-400 uppercase tracking-wider text-[11px]">
                <tr>
                  <th className="py-3 px-4 font-semibold">Customer ID</th>
                  <th className="py-3 px-4 font-semibold">Customer Name</th>
                  <th className="py-3 px-4 font-semibold">Category</th>
                  <th className="py-3 px-4 font-semibold">Monthly Due</th>
                  <th className="py-3 px-4 font-semibold">Last Paid Date</th>
                  <th className="py-3 px-4 font-semibold">Renewal Due Date</th>
                  <th className="py-3 px-4 font-semibold text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-neutral-800/80">
                {stats.pendingCustomers.map((cust) => (
                  <tr key={cust.id} className="hover:bg-neutral-800/30 transition-colors">
                    <td className="py-3 px-4 font-mono text-neutral-400">{cust.id}</td>
                    <td className="py-3 px-4 font-semibold text-white">
                      <button
                        onClick={() => onSelectCustomer(cust.id)}
                        className="hover:underline text-left cursor-pointer"
                      >
                        {cust.name}
                      </button>
                    </td>
                    <td className="py-3 px-4 text-neutral-300 capitalize">
                      {cust.category}
                    </td>
                    <td className="py-3 px-4 font-mono font-bold text-white tabular-nums">
                      ₹{cust.monthlyFee.toLocaleString('en-IN')}
                    </td>
                    <td className="py-3 px-4 font-mono text-neutral-400">
                      {cust.lastPaymentDate || 'None'}
                    </td>
                    <td className="py-3 px-4 font-mono text-amber-300 font-semibold">
                      {cust.nextRenewalDate}
                    </td>
                    <td className="py-3 px-4 text-right space-x-2">
                      <button
                        onClick={() => onQuickRecordPayment(cust)}
                        className="py-1 px-3 bg-white hover:bg-neutral-100 text-neutral-950 font-semibold rounded-md text-xs transition-colors cursor-pointer"
                      >
                        Record Payment
                      </button>
                      <button
                        onClick={() => onSelectCustomer(cust.id)}
                        className="py-1 px-2.5 bg-neutral-800 hover:bg-neutral-700 text-neutral-300 rounded-md text-xs transition-colors cursor-pointer"
                      >
                        View Register
                      </button>
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
