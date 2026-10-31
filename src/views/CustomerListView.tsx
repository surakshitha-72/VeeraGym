import React, { useState, useMemo } from 'react';
import { ArrowLeft, Search, Filter, ArrowUpDown, Plus, Edit2, UserCheck, UserX, Phone, Calendar, HeartPulse, Dumbbell } from 'lucide-react';
import { Customer, CustomerCategory } from '../types.ts';

interface Props {
  category: CustomerCategory;
  customers: Customer[];
  onBackToCategories: () => void;
  onSelectCustomer: (customerId: string) => void;
  onOpenAddCustomer: () => void;
  onEditCustomer: (customer: Customer) => void;
}

export const CustomerListView: React.FC<Props> = ({
  category,
  customers,
  onBackToCategories,
  onSelectCustomer,
  onOpenAddCustomer,
  onEditCustomer,
}) => {
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState<'all' | 'active' | 'inactive'>('all');
  const [sortBy, setSortBy] = useState<'name' | 'renewalDate'>('renewalDate');
  const [sortDirection, setSortDirection] = useState<'asc' | 'desc'>('asc');

  const filteredAndSortedCustomers = useMemo(() => {
    return customers
      .filter((c) => c.category === category)
      .filter((c) => {
        if (statusFilter !== 'all' && c.status !== statusFilter) return false;
        if (search.trim()) {
          const q = search.toLowerCase().trim();
          const matchesName = c.name.toLowerCase().includes(q);
          const matchesPhone = c.phone.includes(q);
          const matchesId = c.id.toLowerCase().includes(q);
          if (!matchesName && !matchesPhone && !matchesId) return false;
        }
        return true;
      })
      .sort((a, b) => {
        if (sortBy === 'name') {
          const cmp = a.name.localeCompare(b.name);
          return sortDirection === 'asc' ? cmp : -cmp;
        } else {
          const cmp = a.nextRenewalDate.localeCompare(b.nextRenewalDate);
          return sortDirection === 'asc' ? cmp : -cmp;
        }
      });
  }, [customers, category, search, statusFilter, sortBy, sortDirection]);

  const toggleSort = (type: 'name' | 'renewalDate') => {
    if (sortBy === type) {
      setSortDirection((prev) => (prev === 'asc' ? 'desc' : 'asc'));
    } else {
      setSortBy(type);
      setSortDirection('asc');
    }
  };

  const isCardio = category === 'cardio';

  return (
    <div className="space-y-6">
      {/* Category Header with Back Navigation */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-4 border-b border-neutral-800">
        <div className="flex items-center gap-3">
          <button
            onClick={onBackToCategories}
            className="p-2 bg-neutral-800/80 hover:bg-neutral-700 text-neutral-300 hover:text-white rounded-lg border border-neutral-700 transition-colors cursor-pointer"
            title="Return to Category Selection"
          >
            <ArrowLeft className="w-5 h-5" />
          </button>
          <div>
            <div className="flex items-center gap-2">
              <div className="p-1.5 rounded-md bg-neutral-800 text-white">
                {isCardio ? <HeartPulse className="w-4 h-4" /> : <Dumbbell className="w-4 h-4" />}
              </div>
              <h2 className="text-2xl font-bold text-white tracking-tight">
                {isCardio ? 'Cardio Customers' : 'Non-Cardio Customers'}
              </h2>
            </div>
            <p className="text-xs text-neutral-400 mt-1">
              Monthly Fee: <span className="font-mono text-white font-semibold">{isCardio ? '₹1,000' : '₹600'}</span> · Total {filteredAndSortedCustomers.length} registered members
            </p>
          </div>
        </div>

        <div className="flex items-center gap-2">
          <button
            onClick={onBackToCategories}
            className="py-2 px-3 bg-neutral-800 hover:bg-neutral-700 text-neutral-300 rounded-lg text-xs font-medium transition-colors border border-neutral-700 cursor-pointer"
          >
            Switch Category
          </button>
          <button
            onClick={onOpenAddCustomer}
            className="py-2 px-3.5 bg-white hover:bg-neutral-100 text-neutral-950 font-semibold rounded-lg text-xs transition-colors flex items-center gap-1.5 shadow-sm cursor-pointer"
          >
            <Plus className="w-4 h-4" />
            <span>Add Member</span>
          </button>
        </div>
      </div>

      {/* Filter and Search Bar */}
      <div className="p-4 rounded-xl bg-[#161a21]/90 border border-neutral-800 flex flex-col md:flex-row gap-3 items-stretch md:items-center justify-between">
        {/* Search */}
        <div className="relative flex-1">
          <Search className="absolute left-3 top-2.5 w-4 h-4 text-neutral-400" />
          <input
            type="text"
            placeholder="Search by customer name, phone number, or ID..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="w-full bg-[#1e232b] border border-neutral-700/80 rounded-lg pl-9 pr-4 py-2 text-xs text-white placeholder-neutral-500 focus:outline-none focus:border-neutral-500"
          />
        </div>

        {/* Filters */}
        <div className="flex items-center gap-2 shrink-0">
          <div className="flex items-center gap-1 p-1 bg-[#1e232b] border border-neutral-700/80 rounded-lg">
            <button
              onClick={() => setStatusFilter('all')}
              className={`px-3 py-1.5 text-xs font-medium rounded-md transition-colors cursor-pointer ${
                statusFilter === 'all'
                  ? 'bg-neutral-700 text-white shadow-sm'
                  : 'text-neutral-400 hover:text-white'
              }`}
            >
              All ({customers.filter(c => c.category === category).length})
            </button>
            <button
              onClick={() => setStatusFilter('active')}
              className={`px-3 py-1.5 text-xs font-medium rounded-md transition-colors cursor-pointer ${
                statusFilter === 'active'
                  ? 'bg-neutral-700 text-white shadow-sm'
                  : 'text-neutral-400 hover:text-white'
              }`}
            >
              Active
            </button>
            <button
              onClick={() => setStatusFilter('inactive')}
              className={`px-3 py-1.5 text-xs font-medium rounded-md transition-colors cursor-pointer ${
                statusFilter === 'inactive'
                  ? 'bg-neutral-700 text-white shadow-sm'
                  : 'text-neutral-400 hover:text-white'
              }`}
            >
              Inactive
            </button>
          </div>

          {/* Sort button */}
          <button
            onClick={() => toggleSort(sortBy === 'name' ? 'renewalDate' : 'name')}
            className="py-2 px-3 bg-[#1e232b] hover:bg-neutral-800 border border-neutral-700/80 rounded-lg text-xs font-medium text-neutral-300 flex items-center gap-1.5 transition-colors cursor-pointer"
          >
            <ArrowUpDown className="w-3.5 h-3.5 text-neutral-400" />
            <span>Sort: {sortBy === 'name' ? 'Name' : 'Renewal Date'} ({sortDirection.toUpperCase()})</span>
          </button>
        </div>
      </div>

      {/* Customer List Table */}
      <div className="rounded-xl bg-[#161a21]/90 border border-neutral-800 shadow-xl overflow-hidden">
        {filteredAndSortedCustomers.length === 0 ? (
          <div className="p-12 text-center text-neutral-400">
            <Filter className="w-8 h-8 text-neutral-500 mx-auto mb-2" />
            <p className="text-sm font-semibold text-white">No customers found</p>
            <p className="text-xs text-neutral-400 mt-1">Try adjusting your search criteria or add a new customer.</p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead className="bg-[#12151b] border-b border-neutral-800 text-neutral-400 uppercase tracking-wider text-[11px]">
                <tr>
                  <th className="py-3 px-4 font-semibold">Customer ID</th>
                  <th
                    onClick={() => toggleSort('name')}
                    className="py-3 px-4 font-semibold cursor-pointer hover:text-white"
                  >
                    <div className="flex items-center gap-1">
                      <span>Customer Name</span>
                      <ArrowUpDown className="w-3 h-3" />
                    </div>
                  </th>
                  <th className="py-3 px-4 font-semibold">Mobile Number</th>
                  <th className="py-3 px-4 font-semibold">Weight</th>
                  <th className="py-3 px-4 font-semibold">Monthly Fee</th>
                  <th className="py-3 px-4 font-semibold">Joining Date</th>
                  <th className="py-3 px-4 font-semibold">Last Payment Date</th>
                  <th
                    onClick={() => toggleSort('renewalDate')}
                    className="py-3 px-4 font-semibold cursor-pointer hover:text-white"
                  >
                    <div className="flex items-center gap-1">
                      <span>Next Renewal Date</span>
                      <ArrowUpDown className="w-3 h-3" />
                    </div>
                  </th>
                  <th className="py-3 px-4 font-semibold">Membership Status</th>
                  <th className="py-3 px-4 font-semibold text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-neutral-800/80">
                {filteredAndSortedCustomers.map((cust) => {
                  const isActive = cust.status === 'active';

                  return (
                    <tr
                      key={cust.id}
                      onClick={() => onSelectCustomer(cust.id)}
                      className="hover:bg-neutral-800/40 transition-colors cursor-pointer group"
                    >
                      <td className="py-3.5 px-4 font-mono text-neutral-400 font-medium">
                        {cust.id}
                      </td>

                      <td className="py-3.5 px-4 font-bold text-white group-hover:underline">
                        {cust.name}
                      </td>

                      <td className="py-3.5 px-4 font-mono text-neutral-300">
                        {cust.phone}
                      </td>

                      <td className="py-3.5 px-4 font-mono text-neutral-300">
                        {cust.weightKg} kg
                      </td>

                      <td className="py-3.5 px-4 font-mono font-bold text-white tabular-nums">
                        ₹{cust.monthlyFee.toLocaleString('en-IN')}
                      </td>

                      <td className="py-3.5 px-4 font-mono text-neutral-400">
                        {cust.joiningDate}
                      </td>

                      <td className="py-3.5 px-4 font-mono text-neutral-300">
                        {cust.lastPaymentDate || '—'}
                      </td>

                      <td className="py-3.5 px-4 font-mono font-semibold text-neutral-200">
                        {cust.nextRenewalDate}
                      </td>

                      <td className="py-3.5 px-4">
                        {isActive ? (
                          <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded text-[11px] font-semibold bg-emerald-950/40 text-emerald-300 border border-emerald-700/50">
                            <UserCheck className="w-3 h-3" /> Active
                          </span>
                        ) : (
                          <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded text-[11px] font-semibold bg-neutral-800 text-neutral-400 border border-neutral-700">
                            <UserX className="w-3 h-3" /> Inactive
                          </span>
                        )}
                      </td>

                      <td className="py-3.5 px-4 text-right space-x-2" onClick={(e) => e.stopPropagation()}>
                        <button
                          onClick={() => onEditCustomer(cust)}
                          className="p-1.5 bg-neutral-800 hover:bg-neutral-700 text-neutral-300 hover:text-white rounded-md transition-colors"
                          title="Edit Customer Details"
                        >
                          <Edit2 className="w-3.5 h-3.5" />
                        </button>
                        <button
                          onClick={() => onSelectCustomer(cust.id)}
                          className="py-1 px-2.5 bg-neutral-800 hover:bg-white hover:text-neutral-950 text-neutral-200 font-medium rounded-md text-[11px] transition-colors"
                        >
                          View Register →
                        </button>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
};
