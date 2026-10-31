import React from 'react';
import { Home, LayoutDashboard, Users, UserPlus, Receipt, BellRing, Dumbbell, Menu, X } from 'lucide-react';

export type NavItem = 'home' | 'dashboard' | 'customers' | 'add-customer' | 'payments' | 'reminders';

interface Props {
  activeItem: NavItem;
  onNavigate: (item: NavItem) => void;
  mobileOpen: boolean;
  onToggleMobile: () => void;
  dueTodayCount: number;
}

export const Navigation: React.FC<Props> = ({
  activeItem,
  onNavigate,
  mobileOpen,
  onToggleMobile,
  dueTodayCount,
}) => {
  const navItems = [
    { id: 'home' as NavItem, label: 'Home', icon: Home },
    { id: 'dashboard' as NavItem, label: 'Dashboard', icon: LayoutDashboard },
    { id: 'customers' as NavItem, label: 'Customers', icon: Users },
    { id: 'add-customer' as NavItem, label: 'Add Customer', icon: UserPlus },
    { id: 'payments' as NavItem, label: 'Payment Records', icon: Receipt },
    {
      id: 'reminders' as NavItem,
      label: 'Renewal Reminders',
      icon: BellRing,
      badge: dueTodayCount > 0 ? dueTodayCount : null,
    },
  ];

  const handleItemClick = (id: NavItem) => {
    onNavigate(id);
    if (mobileOpen) onToggleMobile();
  };

  return (
    <>
      {/* Mobile top bar toggle button */}
      <div className="lg:hidden fixed top-0 left-0 right-0 z-40 bg-[#12151b]/95 backdrop-blur-md border-b border-neutral-800 px-4 py-3 flex items-center justify-between">
        <button
          onClick={() => handleItemClick('home')}
          className="flex items-center gap-2.5 text-left cursor-pointer"
        >
          <div className="w-8 h-8 rounded-lg bg-neutral-800 border border-neutral-700 flex items-center justify-center text-white">
            <Dumbbell className="w-4 h-4 text-white" />
          </div>
          <span className="text-lg font-bold tracking-tight bg-gradient-to-r from-slate-100 via-white to-slate-400 bg-clip-text text-transparent font-sans">VeeraGym</span>
        </button>
        <button
          onClick={onToggleMobile}
          className="p-2 text-neutral-300 hover:text-white rounded-lg bg-neutral-800/80 border border-neutral-700"
          aria-label="Toggle navigation menu"
        >
          {mobileOpen ? <X className="w-5 h-5" /> : <Menu className="w-5 h-5" />}
        </button>
      </div>

      {/* Backdrop overlay for mobile drawer */}
      {mobileOpen && (
        <div
          onClick={onToggleMobile}
          className="lg:hidden fixed inset-0 z-40 bg-black/70 backdrop-blur-sm"
        />
      )}

      {/* Sidebar navigation */}
      <aside
        className={`fixed top-0 bottom-0 left-0 z-50 w-64 bg-[#12151b] border-r border-neutral-800/90 flex flex-col transition-transform duration-200 ease-in-out lg:translate-x-0 ${
          mobileOpen ? 'translate-x-0' : '-translate-x-full'
        }`}
      >
        {/* Brand Lockup */}
        <button
          onClick={() => handleItemClick('home')}
          className="h-16 px-6 flex items-center gap-3 border-b border-neutral-800/80 shrink-0 text-left cursor-pointer hover:bg-neutral-850/50 transition-colors"
        >
          <div className="w-9 h-9 rounded-lg bg-neutral-800 border border-neutral-700 flex items-center justify-center text-white shadow-sm">
            <Dumbbell className="w-5 h-5 text-white" />
          </div>
          <div>
            <h1 className="text-xl font-bold tracking-tight bg-gradient-to-r from-slate-100 via-white to-slate-400 bg-clip-text text-transparent font-sans">
              VeeraGym
            </h1>
            <p className="text-[10px] text-neutral-400 font-medium tracking-wide">
              Smart Membership System
            </p>
          </div>
        </button>

        {/* 5 STRICT NAVIGATION ITEMS ONLY */}
        <nav className="flex-1 px-3 py-6 space-y-1.5 overflow-y-auto">
          {navItems.map((item) => {
            const Icon = item.icon;
            const isActive = activeItem === item.id;

            return (
              <button
                key={item.id}
                onClick={() => handleItemClick(item.id)}
                className={`w-full flex items-center justify-between px-3.5 py-3 rounded-lg text-sm font-medium transition-all group cursor-pointer ${
                  isActive
                    ? 'bg-neutral-800/90 text-white border border-neutral-700 shadow-sm'
                    : 'text-neutral-400 hover:text-neutral-100 hover:bg-neutral-800/40'
                }`}
              >
                <div className="flex items-center gap-3 min-w-0">
                  <Icon
                    className={`w-4 h-4 shrink-0 transition-colors ${
                      isActive ? 'text-white' : 'text-neutral-400 group-hover:text-neutral-200'
                    }`}
                  />
                  <span className="truncate">{item.label}</span>
                </div>

                {item.badge && (
                  <span className="px-2 py-0.5 text-[10px] font-bold rounded-md bg-amber-500/20 text-amber-300 border border-amber-500/30 font-mono tabular-nums">
                    {item.badge}
                  </span>
                )}
              </button>
            );
          })}
        </nav>

        {/* Footer info in sidebar */}
        <div className="p-4 border-t border-neutral-800/80 shrink-0 bg-[#0e1015]">
          <div className="p-3 rounded-lg bg-[#181c22] border border-neutral-800">
            <div className="text-[11px] font-semibold text-neutral-300">
              Receptionist / Owner
            </div>
            <div className="text-[10px] text-neutral-400 mt-0.5">
              VeeraGym · Hyderabad
            </div>
          </div>
        </div>
      </aside>
    </>
  );
};
