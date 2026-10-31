import React from 'react';
import { HeartPulse, Dumbbell, ArrowRight, UserPlus, Users } from 'lucide-react';
import { CustomerCategory } from '../types.ts';

interface Props {
  cardioCount: number;
  nonCardioCount: number;
  onSelectCategory: (category: CustomerCategory) => void;
  onOpenAddCustomer: () => void;
}

export const CategorySelectionView: React.FC<Props> = ({
  cardioCount,
  nonCardioCount,
  onSelectCategory,
  onOpenAddCustomer,
}) => {
  return (
    <div className="space-y-6 max-w-5xl mx-auto">
      {/* Header section */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-4 border-b border-neutral-800">
        <div>
          <h2 className="text-2xl font-bold text-white tracking-tight">Customer Categories</h2>
          <p className="text-xs text-neutral-400 mt-1">
            Select a membership tier below to access member profiles and individual monthly maintenance registers.
          </p>
        </div>
        <button
          onClick={onOpenAddCustomer}
          className="py-2 px-4 bg-white hover:bg-neutral-100 text-neutral-950 font-semibold rounded-lg text-xs transition-colors flex items-center gap-2 shadow-sm self-start sm:self-auto cursor-pointer"
        >
          <UserPlus className="w-4 h-4" />
          <span>Add New Customer</span>
        </button>
      </div>

      {/* The Two Mandatory Distinct Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6 pt-2">
        {/* Card 1: Cardio Customers */}
        <div
          onClick={() => onSelectCategory('cardio')}
          className="group relative rounded-2xl bg-[#161a21]/95 border-2 border-neutral-800 hover:border-neutral-500 p-8 transition-all duration-200 cursor-pointer shadow-xl hover:shadow-2xl flex flex-col justify-between overflow-hidden"
        >
          <div className="space-y-6">
            <div className="flex items-center justify-between">
              <div className="p-3.5 rounded-xl bg-neutral-800 border border-neutral-700 text-white">
                <HeartPulse className="w-7 h-7 text-white" />
              </div>
              <span className="px-3 py-1 rounded-full text-xs font-semibold bg-neutral-800 text-neutral-200 border border-neutral-700 font-mono">
                Premium Plan
              </span>
            </div>

            <div>
              <h3 className="text-2xl font-bold text-white tracking-tight group-hover:text-neutral-100 transition-colors">
                Cardio Customers
              </h3>
              <p className="text-sm text-neutral-400 mt-1">
                Members enrolled in cardio, treadmill, elliptical, spin bike, and endurance programs.
              </p>
            </div>

            <div className="p-4 rounded-xl bg-[#1e232b] border border-neutral-800 flex items-center justify-between">
              <div>
                <span className="text-[11px] font-semibold uppercase tracking-wider text-neutral-400 block">
                  Membership Fee
                </span>
                <span className="text-2xl font-extrabold text-white font-mono tabular-nums">
                  ₹1,000 <span className="text-xs font-normal text-neutral-400">/ month</span>
                </span>
              </div>

              <div className="text-right">
                <span className="text-[11px] font-semibold uppercase tracking-wider text-neutral-400 block">
                  Total Enrolled
                </span>
                <span className="text-2xl font-extrabold text-white font-mono tabular-nums">
                  {cardioCount} <span className="text-xs font-normal text-neutral-400">members</span>
                </span>
              </div>
            </div>
          </div>

          <div className="mt-8 pt-4 border-t border-neutral-800/80 flex items-center justify-between text-sm font-semibold text-white group-hover:text-neutral-200">
            <span>Open Cardio Customer List</span>
            <div className="w-8 h-8 rounded-full bg-neutral-800 flex items-center justify-center group-hover:translate-x-1 transition-transform">
              <ArrowRight className="w-4 h-4 text-white" />
            </div>
          </div>
        </div>

        {/* Card 2: Non-Cardio Customers */}
        <div
          onClick={() => onSelectCategory('non-cardio')}
          className="group relative rounded-2xl bg-[#161a21]/95 border-2 border-neutral-800 hover:border-neutral-500 p-8 transition-all duration-200 cursor-pointer shadow-xl hover:shadow-2xl flex flex-col justify-between overflow-hidden"
        >
          <div className="space-y-6">
            <div className="flex items-center justify-between">
              <div className="p-3.5 rounded-xl bg-neutral-800 border border-neutral-700 text-white">
                <Dumbbell className="w-7 h-7 text-white" />
              </div>
              <span className="px-3 py-1 rounded-full text-xs font-semibold bg-neutral-800 text-neutral-200 border border-neutral-700 font-mono">
                Standard Plan
              </span>
            </div>

            <div>
              <h3 className="text-2xl font-bold text-white tracking-tight group-hover:text-neutral-100 transition-colors">
                Non-Cardio Customers
              </h3>
              <p className="text-sm text-neutral-400 mt-1">
                Members with standard gym access, free weights, barbell training, machines, and general fitness.
              </p>
            </div>

            <div className="p-4 rounded-xl bg-[#1e232b] border border-neutral-800 flex items-center justify-between">
              <div>
                <span className="text-[11px] font-semibold uppercase tracking-wider text-neutral-400 block">
                  Membership Fee
                </span>
                <span className="text-2xl font-extrabold text-white font-mono tabular-nums">
                  ₹600 <span className="text-xs font-normal text-neutral-400">/ month</span>
                </span>
              </div>

              <div className="text-right">
                <span className="text-[11px] font-semibold uppercase tracking-wider text-neutral-400 block">
                  Total Enrolled
                </span>
                <span className="text-2xl font-extrabold text-white font-mono tabular-nums">
                  {nonCardioCount} <span className="text-xs font-normal text-neutral-400">members</span>
                </span>
              </div>
            </div>
          </div>

          <div className="mt-8 pt-4 border-t border-neutral-800/80 flex items-center justify-between text-sm font-semibold text-white group-hover:text-neutral-200">
            <span>Open Non-Cardio Customer List</span>
            <div className="w-8 h-8 rounded-full bg-neutral-800 flex items-center justify-center group-hover:translate-x-1 transition-transform">
              <ArrowRight className="w-4 h-4 text-white" />
            </div>
          </div>
        </div>
      </div>

      {/* Info notice */}
      <div className="p-4 rounded-xl bg-[#14181f]/80 border border-neutral-800/80 text-xs text-neutral-400 flex items-center gap-3">
        <Users className="w-4 h-4 text-neutral-300 shrink-0" />
        <span>
          Customer categorization happens automatically based on the membership fee (₹600/month = Non-Cardio, ₹1,000/month = Cardio). Clicking any customer row opens their independent monthly maintenance register.
        </span>
      </div>
    </div>
  );
};
