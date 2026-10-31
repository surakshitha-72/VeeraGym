import React from 'react';
import { ArrowRight, LayoutDashboard, Users, UserPlus, Mic, Dumbbell, HeartPulse, ShieldCheck, Calendar, IndianRupee } from 'lucide-react';
import { DashboardStats } from '../types.ts';

interface Props {
  stats: DashboardStats | null;
  onEnterDashboard: () => void;
  onOpenCustomers: () => void;
  onOpenAddCustomer: () => void;
  onOpenVoiceRegister: () => void;
}

export const HomeView: React.FC<Props> = ({
  stats,
  onEnterDashboard,
  onOpenCustomers,
  onOpenAddCustomer,
  onOpenVoiceRegister,
}) => {
  return (
    <div className="relative min-h-[calc(100vh-8rem)] flex flex-col justify-between rounded-2xl overflow-hidden border border-neutral-700/80 shadow-2xl bg-[#181c22]">
      {/* Background with modern gym equipment photo and grey scrim */}
      <div
        className="absolute inset-0 z-0 bg-cover bg-center bg-no-repeat opacity-40 filter contrast-110 brightness-90"
        style={{
          backgroundImage: `url('/src/assets/images/modern_gym_silver_equipment_1793455068800.jpg')`,
        }}
      />
      {/* Cool grey gradient overlay */}
      <div className="absolute inset-0 z-0 bg-gradient-to-b from-[#1c2129]/90 via-[#161a20]/92 to-[#12151b]/98" />

      {/* Hero Content */}
      <div className="relative z-10 p-6 sm:p-10 lg:p-14 flex-1 flex flex-col justify-center max-w-5xl">
        {/* Top subtle badge */}
        <div className="inline-flex items-center gap-2 px-3.5 py-1.5 rounded-full bg-slate-800/80 border border-slate-600/60 text-slate-300 text-xs font-medium mb-6 self-start backdrop-blur-md shadow-sm">
          <Dumbbell className="w-3.5 h-3.5 text-slate-200" />
          <span className="tracking-wide uppercase text-[11px] font-semibold text-slate-200">
            Smart Gym Membership & Digital Register
          </span>
        </div>

        {/* Silver Written Words as "VeeraGym" */}
        <div className="space-y-4">
          <h1 className="text-5xl sm:text-7xl lg:text-8xl font-black tracking-tight leading-none">
            <span className="bg-gradient-to-r from-slate-100 via-white to-slate-400 bg-clip-text text-transparent drop-shadow-[0_4px_24px_rgba(255,255,255,0.25)]">
              VeeraGym
            </span>
          </h1>

          <p className="text-lg sm:text-xl text-slate-300 max-w-2xl font-light leading-relaxed">
            Welcome to <span className="font-semibold text-white">VeeraGym</span>. A modern, digital customer maintenance register replacing manual paper records with automated payment tracking and renewal reminders.
          </p>
        </div>

        {/* Primary CTA Buttons */}
        <div className="mt-8 flex flex-wrap items-center gap-4">
          <button
            onClick={onEnterDashboard}
            className="py-3 px-6 rounded-xl bg-gradient-to-r from-slate-100 via-white to-slate-200 hover:from-white hover:to-slate-300 text-slate-950 font-bold text-sm transition-all duration-200 flex items-center gap-2.5 shadow-[0_0_20px_rgba(255,255,255,0.2)] hover:shadow-[0_0_25px_rgba(255,255,255,0.3)] hover:scale-[1.02] cursor-pointer"
          >
            <LayoutDashboard className="w-4 h-4 text-slate-950" />
            <span>Enter Dashboard</span>
            <ArrowRight className="w-4 h-4 ml-0.5" />
          </button>

          <button
            onClick={onOpenCustomers}
            className="py-3 px-5 rounded-xl bg-slate-800/90 hover:bg-slate-700/90 text-white font-semibold text-sm transition-all border border-slate-600/80 backdrop-blur-md flex items-center gap-2 cursor-pointer"
          >
            <Users className="w-4 h-4 text-slate-300" />
            <span>Customers Register</span>
          </button>

          <button
            onClick={onOpenVoiceRegister}
            className="py-3 px-5 rounded-xl bg-slate-800/90 hover:bg-slate-700/90 text-slate-200 hover:text-white font-semibold text-sm transition-all border border-slate-600/80 backdrop-blur-md flex items-center gap-2 cursor-pointer"
          >
            <Mic className="w-4 h-4 text-emerald-400" />
            <span>Voice Registration</span>
          </button>
        </div>

        {/* Quick Facility & Membership Tiers Preview */}
        <div className="mt-12 pt-8 border-t border-slate-700/60 grid grid-cols-1 sm:grid-cols-3 gap-4">
          {/* Feature 1 */}
          <div className="p-4 rounded-xl bg-[#1e232b]/80 border border-slate-700/60 backdrop-blur-sm">
            <div className="flex items-center gap-2.5 text-slate-200 font-bold text-sm mb-1">
              <div className="p-1.5 rounded-lg bg-slate-800 text-slate-200">
                <HeartPulse className="w-4 h-4" />
              </div>
              <span>Cardio Plan</span>
            </div>
            <p className="text-xs text-slate-400">
              Treadmills, cross-trainers & endurance workouts.
            </p>
            <div className="mt-2 text-base font-extrabold text-white font-mono tabular-nums">
              ₹1,000 <span className="text-xs font-normal text-slate-400">/ month</span>
            </div>
          </div>

          {/* Feature 2 */}
          <div className="p-4 rounded-xl bg-[#1e232b]/80 border border-slate-700/60 backdrop-blur-sm">
            <div className="flex items-center gap-2.5 text-slate-200 font-bold text-sm mb-1">
              <div className="p-1.5 rounded-lg bg-slate-800 text-slate-200">
                <Dumbbell className="w-4 h-4" />
              </div>
              <span>Non-Cardio Plan</span>
            </div>
            <p className="text-xs text-slate-400">
              Free weights, barbell training & strength stations.
            </p>
            <div className="mt-2 text-base font-extrabold text-white font-mono tabular-nums">
              ₹600 <span className="text-xs font-normal text-slate-400">/ month</span>
            </div>
          </div>

          {/* Feature 3 */}
          <div className="p-4 rounded-xl bg-[#1e232b]/80 border border-slate-700/60 backdrop-blur-sm">
            <div className="flex items-center gap-2.5 text-slate-200 font-bold text-sm mb-1">
              <div className="p-1.5 rounded-lg bg-slate-800 text-slate-200">
                <Calendar className="w-4 h-4" />
              </div>
              <span>Automated Alerts</span>
            </div>
            <p className="text-xs text-slate-400">
              Smart 2-day advance renewal reminders with WhatsApp links.
            </p>
            <div className="mt-2 text-xs font-bold text-emerald-400 flex items-center gap-1">
              <ShieldCheck className="w-3.5 h-3.5" />
              <span>Real-time Sync Active</span>
            </div>
          </div>
        </div>
      </div>

      {/* Bottom Bar Info */}
      <div className="relative z-10 px-6 sm:px-10 py-4 bg-[#12151b]/90 border-t border-slate-800/80 flex flex-col sm:flex-row items-center justify-between gap-3 text-xs text-slate-400">
        <div className="flex items-center gap-4">
          <span>VeeraGym Digital Management Register</span>
          <span className="hidden sm:inline">·</span>
          <span className="font-mono text-slate-300">
            {stats ? `${stats.totalCustomers} Active Records` : 'Connecting...'}
          </span>
        </div>

        <button
          onClick={onOpenAddCustomer}
          className="hover:text-white transition-colors flex items-center gap-1 font-medium cursor-pointer"
        >
          <UserPlus className="w-3.5 h-3.5" />
          <span>Quick Enroll New Member →</span>
        </button>
      </div>
    </div>
  );
};
