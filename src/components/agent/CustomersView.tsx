import React, { useState } from 'react';
import { 
  Users, 
  Search, 
  Building, 
  Phone, 
  Mail, 
  Ticket, 
  Clock3, 
  ChevronRight, 
  ShieldCheck 
} from 'lucide-react';
import { CustomerProfile, Conversation } from '../../types';

interface CustomersViewProps {
  customers: CustomerProfile[];
  conversations: Conversation[];
  onSelectConversation: (conversationId: string) => void;
}

export const CustomersView: React.FC<CustomersViewProps> = ({
  customers,
  conversations,
  onSelectConversation
}) => {
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedCustomerId, setSelectedCustomerId] = useState<string>(customers[0]?.id || '');

  const filteredCustomers = customers.filter((cust) => {
    if (!searchQuery.trim()) return true;
    const q = searchQuery.toLowerCase();
    return (
      cust.name.toLowerCase().includes(q) ||
      cust.email.toLowerCase().includes(q) ||
      (cust.company && cust.company.toLowerCase().includes(q))
    );
  });

  const activeCustomer = customers.find((c) => c.id === selectedCustomerId) || customers[0];
  const customerTickets = conversations.filter(
    (c) => c.customerId === activeCustomer?.id || c.customerEmail === activeCustomer?.email
  );

  return (
    <div className="flex-1 bg-neutral-50 dark:bg-neutral-950 p-6 overflow-y-auto">
      <div className="max-w-6xl mx-auto space-y-6">
        <div>
          <h2 className="text-xl font-bold tracking-tight text-neutral-900 dark:text-neutral-100 flex items-center gap-2">
            <Users className="w-5 h-5 text-neutral-700 dark:text-neutral-300" />
            Customer Accounts & Ticket History
          </h2>
          <p className="text-xs text-neutral-500 dark:text-neutral-400 mt-1">
            Unified CRM profiles with support tier levels, historical ticket logs, and customer health metrics.
          </p>
        </div>

        {/* 2-column layout: Customer Directory + Selected Detail */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          {/* Customer list */}
          <div className="bg-white dark:bg-neutral-900 border border-neutral-200 dark:border-neutral-800 rounded-xl overflow-hidden shadow-2xs flex flex-col">
            <div className="p-3 border-b border-neutral-100 dark:border-neutral-800">
              <div className="relative">
                <Search className="w-3.5 h-3.5 absolute left-2.5 top-2.5 text-neutral-400" />
                <input
                  type="text"
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  placeholder="Search customers..."
                  className="w-full pl-8 pr-2 py-1.5 text-xs bg-neutral-100 dark:bg-neutral-800 rounded border border-transparent focus:border-neutral-300 dark:focus:border-neutral-700 text-neutral-900 dark:text-neutral-100 focus:outline-hidden"
                />
              </div>
            </div>

            <div className="divide-y divide-neutral-100 dark:divide-neutral-800/60 overflow-y-auto max-h-[600px]">
              {filteredCustomers.map((cust) => {
                const isSelected = cust.id === activeCustomer?.id;
                return (
                  <div
                    key={cust.id}
                    onClick={() => setSelectedCustomerId(cust.id)}
                    className={`p-3.5 cursor-pointer transition-colors ${
                      isSelected
                        ? 'bg-neutral-100 dark:bg-neutral-800 border-l-2 border-neutral-900 dark:border-neutral-100'
                        : 'hover:bg-neutral-50 dark:hover:bg-neutral-800/40'
                    }`}
                  >
                    <div className="flex items-center justify-between">
                      <span className="font-semibold text-xs text-neutral-900 dark:text-neutral-100">
                        {cust.name}
                      </span>
                      <span className={`text-[10px] font-semibold px-1.5 py-0.2 rounded ${
                        cust.tier === 'Enterprise'
                          ? 'bg-purple-100 text-purple-700 dark:bg-purple-950 dark:text-purple-300'
                          : 'bg-neutral-100 text-neutral-600 dark:bg-neutral-800 dark:text-neutral-400'
                      }`}>
                        {cust.tier}
                      </span>
                    </div>
                    <p className="text-[11px] text-neutral-500 truncate mt-0.5">{cust.email}</p>
                    {cust.company && (
                      <p className="text-[10px] text-neutral-400 mt-1 flex items-center gap-1">
                        <Building className="w-2.5 h-2.5" />
                        <span>{cust.company}</span>
                      </p>
                    )}
                  </div>
                );
              })}
            </div>
          </div>

          {/* Customer Details & Ticket Log */}
          {activeCustomer && (
            <div className="md:col-span-2 space-y-6">
              {/* Profile Card */}
              <div className="bg-white dark:bg-neutral-900 border border-neutral-200 dark:border-neutral-800 rounded-xl p-5 shadow-2xs space-y-4">
                <div className="flex items-start justify-between">
                  <div>
                    <h3 className="text-base font-bold text-neutral-900 dark:text-neutral-100">
                      {activeCustomer.name}
                    </h3>
                    <p className="text-xs text-neutral-500 mt-0.5">{activeCustomer.email}</p>
                  </div>
                  <span className="px-2.5 py-1 rounded-full text-xs font-semibold bg-neutral-900 text-white dark:bg-neutral-100 dark:text-neutral-900">
                    {activeCustomer.tier} Plan
                  </span>
                </div>

                <div className="grid grid-cols-2 sm:grid-cols-3 gap-3 text-xs pt-2 border-t border-neutral-100 dark:border-neutral-800">
                  <div>
                    <span className="text-neutral-400 text-[10px] block">Company</span>
                    <span className="font-medium text-neutral-800 dark:text-neutral-200">
                      {activeCustomer.company || 'Independent'}
                    </span>
                  </div>
                  <div>
                    <span className="text-neutral-400 text-[10px] block">Contact Phone</span>
                    <span className="font-medium text-neutral-800 dark:text-neutral-200">
                      {activeCustomer.phone || 'Not provided'}
                    </span>
                  </div>
                  <div>
                    <span className="text-neutral-400 text-[10px] block">Member Since</span>
                    <span className="font-medium text-neutral-800 dark:text-neutral-200">
                      {new Date(activeCustomer.createdAt).toLocaleDateString([], { month: 'short', year: 'numeric' })}
                    </span>
                  </div>
                </div>

                {activeCustomer.notes && (
                  <div className="p-3 rounded-lg bg-neutral-50 dark:bg-neutral-800/60 border border-neutral-100 dark:border-neutral-800 text-xs text-neutral-600 dark:text-neutral-300">
                    <span className="font-semibold text-neutral-900 dark:text-neutral-100">Internal Account Notes: </span>
                    {activeCustomer.notes}
                  </div>
                )}
              </div>

              {/* Ticket History */}
              <div className="bg-white dark:bg-neutral-900 border border-neutral-200 dark:border-neutral-800 rounded-xl p-5 shadow-2xs space-y-3">
                <div className="flex items-center justify-between pb-2 border-b border-neutral-100 dark:border-neutral-800">
                  <h4 className="text-xs font-semibold uppercase tracking-wider text-neutral-400 flex items-center gap-1.5">
                    <Ticket className="w-3.5 h-3.5" />
                    <span>Customer Support Conversations ({customerTickets.length})</span>
                  </h4>
                </div>

                <div className="space-y-2">
                  {customerTickets.length === 0 ? (
                    <p className="text-xs text-neutral-400 py-3 text-center">No previous tickets found for this account.</p>
                  ) : (
                    customerTickets.map((t) => (
                      <div
                        key={t.id}
                        onClick={() => onSelectConversation(t.id)}
                        className="p-3 rounded-lg border border-neutral-200 dark:border-neutral-800 hover:bg-neutral-50 dark:hover:bg-neutral-800 cursor-pointer transition-colors flex items-center justify-between gap-3"
                      >
                        <div className="min-w-0">
                          <div className="flex items-center gap-2">
                            <span className="text-xs font-semibold text-neutral-900 dark:text-neutral-100 truncate">
                              {t.title}
                            </span>
                            <span className="text-[10px] px-1.5 py-0.2 rounded bg-neutral-100 dark:bg-neutral-800 text-neutral-600 dark:text-neutral-400">
                              {t.category}
                            </span>
                          </div>
                          <p className="text-[11px] text-neutral-500 truncate mt-0.5">
                            {t.lastMessageText || 'No messages'}
                          </p>
                        </div>

                        <div className="flex items-center gap-2 shrink-0">
                          <span className={`text-[10px] font-semibold px-2 py-0.5 rounded ${
                            t.status === 'RESOLVED'
                              ? 'bg-emerald-50 text-emerald-700 dark:bg-emerald-950 dark:text-emerald-300'
                              : t.status === 'NEEDS_HUMAN'
                              ? 'bg-rose-50 text-rose-700 dark:bg-rose-950 dark:text-rose-300'
                              : 'bg-blue-50 text-blue-700 dark:bg-blue-950 dark:text-blue-300'
                          }`}>
                            {t.status}
                          </span>
                          <ChevronRight className="w-4 h-4 text-neutral-400" />
                        </div>
                      </div>
                    ))
                  )}
                </div>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
