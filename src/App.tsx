/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useEffect } from 'react';
import { Customer, CustomerCategory, DashboardStats, PaymentRecord, RenewalReminder } from './types.ts';
import { fetchCustomers, fetchDashboardStats, fetchPayments, fetchReminders } from './services/api.ts';
import { Navigation, NavItem } from './components/Navigation.tsx';
import { HomeView } from './views/HomeView.tsx';
import { DashboardView } from './views/DashboardView.tsx';
import { CategorySelectionView } from './views/CategorySelectionView.tsx';
import { CustomerListView } from './views/CustomerListView.tsx';
import { CustomerRegisterView } from './views/CustomerRegisterView.tsx';
import { AddCustomerView } from './views/AddCustomerView.tsx';
import { PaymentRecordsView } from './views/PaymentRecordsView.tsx';
import { RenewalRemindersView } from './views/RenewalRemindersView.tsx';
import { PaymentDetailsModal } from './components/PaymentDetailsModal.tsx';
import { RecordPaymentModal } from './components/RecordPaymentModal.tsx';
import { EditCustomerModal } from './components/EditCustomerModal.tsx';
import { VoiceRegistrationModal } from './components/VoiceRegistrationModal.tsx';
import { WhatsAppApprovalModal, WhatsAppReminderTarget } from './components/WhatsAppApprovalModal.tsx';
import { GlobalRenewalPopup } from './components/GlobalRenewalPopup.tsx';

export default function App() {
  const [navItem, setNavItem] = useState<NavItem>('home');
  const [mobileNavOpen, setMobileNavOpen] = useState<boolean>(false);

  // Customers sub-navigation state
  const [selectedCategory, setSelectedCategory] = useState<CustomerCategory | null>(null);
  const [selectedCustomerId, setSelectedCustomerId] = useState<string | null>(null);

  // App data state
  const [stats, setStats] = useState<DashboardStats | null>(null);
  const [customers, setCustomers] = useState<Customer[]>([]);
  const [payments, setPayments] = useState<PaymentRecord[]>([]);
  const [reminders, setReminders] = useState<RenewalReminder[]>([]);
  const [dataRefreshTrigger, setDataRefreshTrigger] = useState<number>(0);

  // Modal states
  const [isVoiceModalOpen, setIsVoiceModalOpen] = useState<boolean>(false);
  const [voicePrefilledData, setVoicePrefilledData] = useState<any>(null);

  const [paymentDetailsModalOpen, setPaymentDetailsModalOpen] = useState<boolean>(false);
  const [activePaymentDetails, setActivePaymentDetails] = useState<any>(null);

  const [recordPaymentModalOpen, setRecordPaymentModalOpen] = useState<boolean>(false);
  const [recordPaymentTargetCustomer, setRecordPaymentTargetCustomer] = useState<Customer | null>(null);
  const [recordPaymentDefaultMonth, setRecordPaymentDefaultMonth] = useState<number | undefined>(undefined);
  const [recordPaymentDefaultYear, setRecordPaymentDefaultYear] = useState<number | undefined>(undefined);

  const [editCustomerModalOpen, setEditCustomerModalOpen] = useState<boolean>(false);
  const [editCustomerTarget, setEditCustomerTarget] = useState<Customer | null>(null);

  const [whatsAppModalOpen, setWhatsAppModalOpen] = useState<boolean>(false);
  const [whatsAppTarget, setWhatsAppTarget] = useState<WhatsAppReminderTarget | null>(null);

  // Load all foundational data
  const loadData = async () => {
    try {
      const [s, c, p, r] = await Promise.all([
        fetchDashboardStats(),
        fetchCustomers(),
        fetchPayments(),
        fetchReminders(),
      ]);
      setStats(s);
      setCustomers(c);
      setPayments(p);
      setReminders(r);
    } catch (err) {
      console.error('Failed to load application data:', err);
    }
  };

  useEffect(() => {
    loadData();
  }, [dataRefreshTrigger]);

  const triggerRefresh = () => {
    setDataRefreshTrigger((prev) => prev + 1);
  };

  // Navigation handlers
  const handleMainNavigation = (item: NavItem) => {
    setNavItem(item);
    if (item === 'customers') {
      // When user clicks on Customers navigation item, DO NOT immediately display all customers in one combined table.
      // Instead, open the category selection page!
      setSelectedCategory(null);
      setSelectedCustomerId(null);
    }
  };

  const handleSelectCustomer = (customerId: string) => {
    const cust = customers.find((c) => c.id === customerId);
    if (cust) {
      setSelectedCategory(cust.category);
      setSelectedCustomerId(customerId);
      setNavItem('customers');
    }
  };

  const handleQuickRecordPayment = (target: Customer | string) => {
    const cust = typeof target === 'string' ? customers.find((c) => c.id === target) || null : target;
    if (cust) {
      setRecordPaymentTargetCustomer(cust);
      setRecordPaymentDefaultMonth(undefined);
      setRecordPaymentDefaultYear(undefined);
      setRecordPaymentModalOpen(true);
    }
  };

  const handleOpenRecordPaymentForCustomer = (defaultMonth?: number, defaultYear?: number) => {
    const cust = customers.find((c) => c.id === selectedCustomerId);
    if (cust) {
      setRecordPaymentTargetCustomer(cust);
      setRecordPaymentDefaultMonth(defaultMonth);
      setRecordPaymentDefaultYear(defaultYear);
      setRecordPaymentModalOpen(true);
    }
  };

  const handleVoiceExtracted = (extractedData: any) => {
    setVoicePrefilledData(extractedData);
    setNavItem('add-customer');
  };

  const selectedCustomerObj = customers.find((c) => c.id === selectedCustomerId) || null;
  const dueTodayCount = reminders.filter((r) => r.status === 'Due Today').length;

  return (
    <div className="relative min-h-screen bg-[#0d0f13] text-neutral-100 selection:bg-neutral-700 selection:text-white">
      {/* Background with gym equipment photography and deep charcoal scrim */}
      <div
        className="fixed inset-0 z-0 bg-cover bg-center bg-no-repeat pointer-events-none opacity-20 filter contrast-125 brightness-75"
        style={{
          backgroundImage: `url('/src/assets/images/gym_charcoal_interior_1793453899535.jpg')`,
        }}
      />
      <div className="fixed inset-0 z-0 bg-[#0c0e12]/92 backdrop-blur-[1px] pointer-events-none" />

      {/* Strict 5-Item Navigation Sidebar */}
      <Navigation
        activeItem={navItem}
        onNavigate={handleMainNavigation}
        mobileOpen={mobileNavOpen}
        onToggleMobile={() => setMobileNavOpen((prev) => !prev)}
        dueTodayCount={dueTodayCount}
      />

      {/* Main Content Area */}
      <div className="relative z-10 lg:pl-64 flex flex-col min-h-screen">
        {/* Top Header bar with live date and status */}
        <header className="h-16 border-b border-neutral-800/80 bg-[#12151b]/80 backdrop-blur-md px-6 flex items-center justify-between shrink-0">
          <div className="flex items-center gap-2 text-xs text-neutral-400 font-mono">
            <span className="text-white font-semibold">VeeraGym Portal</span>
            <span>/</span>
            <span className="capitalize">{navItem.replace('-', ' ')}</span>
            {selectedCategory && navItem === 'customers' && (
              <>
                <span>/</span>
                <span className="text-white capitalize">{selectedCategory}</span>
              </>
            )}
            {selectedCustomerObj && navItem === 'customers' && (
              <>
                <span>/</span>
                <span className="text-white font-sans">{selectedCustomerObj.name}</span>
              </>
            )}
          </div>

          <div className="flex items-center gap-4">
            <div className="hidden sm:flex items-center gap-2 text-xs text-neutral-400">
              <span className="w-2 h-2 rounded-full bg-emerald-500" />
              <span>Register Online</span>
            </div>
          </div>
        </header>

        {/* View Content Port */}
        <main className="flex-1 p-4 sm:p-6 lg:p-8 max-w-7xl w-full mx-auto">
          {/* 0. Home Page of VeeraGym */}
          {navItem === 'home' && (
            <HomeView
              stats={stats}
              onEnterDashboard={() => setNavItem('dashboard')}
              onOpenCustomers={() => {
                setSelectedCategory(null);
                setSelectedCustomerId(null);
                setNavItem('customers');
              }}
              onOpenAddCustomer={() => {
                setVoicePrefilledData(null);
                setNavItem('add-customer');
              }}
              onOpenVoiceRegister={() => setIsVoiceModalOpen(true)}
            />
          )}

          {/* 1. Dashboard */}
          {navItem === 'dashboard' && (
            <DashboardView
              stats={stats}
              onNavigateCategory={(cat) => {
                setSelectedCategory(cat);
                setSelectedCustomerId(null);
                setNavItem('customers');
              }}
              onNavigateCustomersCategorySelection={() => {
                setSelectedCategory(null);
                setSelectedCustomerId(null);
                setNavItem('customers');
              }}
              onSelectCustomer={handleSelectCustomer}
              onOpenAddCustomer={() => {
                setVoicePrefilledData(null);
                setNavItem('add-customer');
              }}
              onOpenVoiceRegister={() => setIsVoiceModalOpen(true)}
              onQuickRecordPayment={handleQuickRecordPayment}
            />
          )}

          {/* 2. Customers (Category Selection -> Category List -> Individual Register) */}
          {navItem === 'customers' && (
            <>
              {/* Level 1: Category Selection Page */}
              {!selectedCategory && !selectedCustomerId && (
                <CategorySelectionView
                  cardioCount={customers.filter((c) => c.category === 'cardio').length}
                  nonCardioCount={customers.filter((c) => c.category === 'non-cardio').length}
                  onSelectCategory={(cat) => {
                    setSelectedCategory(cat);
                    setSelectedCustomerId(null);
                  }}
                  onOpenAddCustomer={() => {
                    setVoicePrefilledData(null);
                    setNavItem('add-customer');
                  }}
                />
              )}

              {/* Level 2: Specific Category Customer List */}
              {selectedCategory && !selectedCustomerId && (
                <CustomerListView
                  category={selectedCategory}
                  customers={customers}
                  onBackToCategories={() => {
                    setSelectedCategory(null);
                    setSelectedCustomerId(null);
                  }}
                  onSelectCustomer={(custNum) => setSelectedCustomerId(custNum)}
                  onOpenAddCustomer={() => {
                    setVoicePrefilledData(null);
                    setNavItem('add-customer');
                  }}
                  onEditCustomer={(cust) => {
                    setEditCustomerTarget(cust);
                    setEditCustomerModalOpen(true);
                  }}
                />
              )}

              {/* Level 3: Individual Customer Profile & Monthly Payment Register */}
              {selectedCustomerId && selectedCustomerObj && (
                <CustomerRegisterView
                  customer={selectedCustomerObj}
                  onBack={() => setSelectedCustomerId(null)}
                  onEditCustomer={() => {
                    setEditCustomerTarget(selectedCustomerObj);
                    setEditCustomerModalOpen(true);
                  }}
                  onOpenRecordPayment={handleOpenRecordPaymentForCustomer}
                  onViewPaymentDetails={(details) => {
                    setActivePaymentDetails(details);
                    setPaymentDetailsModalOpen(true);
                  }}
                  refreshTrigger={dataRefreshTrigger}
                />
              )}
            </>
          )}

          {/* 3. Add Customer */}
          {navItem === 'add-customer' && (
            <AddCustomerView
              prefilledData={voicePrefilledData}
              onOpenVoiceModal={() => setIsVoiceModalOpen(true)}
              onSuccess={(newId, cat) => {
                setVoicePrefilledData(null);
                triggerRefresh();
                // Navigate directly to the new customer's individual register
                setSelectedCategory(cat);
                setSelectedCustomerId(newId);
                setNavItem('customers');
              }}
            />
          )}

          {/* 4. Payment Records */}
          {navItem === 'payments' && (
            <PaymentRecordsView
              payments={payments}
              onSelectCustomer={handleSelectCustomer}
              onOpenRecordPayment={() => {
                if (customers.length > 0) {
                  setRecordPaymentTargetCustomer(customers[0]);
                  setRecordPaymentModalOpen(true);
                }
              }}
            />
          )}

          {/* 5. Renewal Reminders */}
          {navItem === 'reminders' && (
            <RenewalRemindersView
              reminders={reminders}
              onRefresh={triggerRefresh}
              onSelectCustomer={handleSelectCustomer}
              onQuickRecordPayment={handleQuickRecordPayment}
              onOpenWhatsAppApproval={(target) => {
                setWhatsAppTarget(target);
                setWhatsAppModalOpen(true);
              }}
            />
          )}
        </main>
      </div>

      {/* 2-Day Advance Renewal Alert Pop-up */}
      <GlobalRenewalPopup
        reminders={reminders}
        onOpenApproval={(target) => {
          setWhatsAppTarget(target);
          setWhatsAppModalOpen(true);
        }}
        onRefresh={triggerRefresh}
      />

      {/* Modals */}
      <WhatsAppApprovalModal
        isOpen={whatsAppModalOpen}
        onClose={() => {
          setWhatsAppModalOpen(false);
          setWhatsAppTarget(null);
        }}
        target={whatsAppTarget}
        onApproved={() => {
          triggerRefresh();
        }}
      />

      <PaymentDetailsModal
        isOpen={paymentDetailsModalOpen}
        onClose={() => {
          setPaymentDetailsModalOpen(false);
          setActivePaymentDetails(null);
        }}
        customerName={selectedCustomerObj?.name || 'Customer'}
        paymentDetails={activePaymentDetails}
      />

      <RecordPaymentModal
        isOpen={recordPaymentModalOpen}
        onClose={() => {
          setRecordPaymentModalOpen(false);
          setRecordPaymentTargetCustomer(null);
        }}
        customer={recordPaymentTargetCustomer}
        defaultMonth={recordPaymentDefaultMonth}
        defaultYear={recordPaymentDefaultYear}
        onSuccess={() => {
          triggerRefresh();
        }}
      />

      <EditCustomerModal
        isOpen={editCustomerModalOpen}
        onClose={() => {
          setEditCustomerModalOpen(false);
          setEditCustomerTarget(null);
        }}
        customer={editCustomerTarget}
        onSuccess={(updated) => {
          triggerRefresh();
        }}
      />

      <VoiceRegistrationModal
        isOpen={isVoiceModalOpen}
        onClose={() => setIsVoiceModalOpen(false)}
        onExtracted={handleVoiceExtracted}
      />
    </div>
  );
}
