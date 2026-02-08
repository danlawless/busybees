'use client';

import { useState } from 'react';
import { motion } from 'framer-motion';
import { OverviewSection } from './OverviewSection';
import { RevenueSection } from './RevenueSection';
import { CustomerSection } from './CustomerSection';
import { PassSection } from './PassSection';
import { PartySection } from './PartySection';
import { SessionSection } from './SessionSection';
import { MarketingSection } from './MarketingSection';

type TabKey =
  | 'overview'
  | 'revenue'
  | 'customers'
  | 'passes'
  | 'parties'
  | 'sessions'
  | 'marketing';

const TABS: Array<{ key: TabKey; label: string; icon: string }> = [
  { key: 'overview', label: 'Overview', icon: '📊' },
  { key: 'revenue', label: 'Revenue', icon: '💰' },
  { key: 'customers', label: 'Customers', icon: '👥' },
  { key: 'passes', label: 'Passes', icon: '🎫' },
  { key: 'parties', label: 'Parties', icon: '🎂' },
  { key: 'sessions', label: 'Sessions', icon: '🎮' },
  { key: 'marketing', label: 'Marketing', icon: '📣' },
];

export function ReportsDashboard() {
  const [activeTab, setActiveTab] = useState<TabKey>('overview');

  return (
    <div className="space-y-6">
      {/* Tab Navigation */}
      <div className="flex overflow-x-auto gap-1 border-b border-neutral-200 pb-px -mb-px scrollbar-hide">
        {TABS.map((tab) => (
          <button
            key={tab.key}
            onClick={() => setActiveTab(tab.key)}
            className={`flex items-center gap-1.5 px-4 py-3 text-sm font-medium whitespace-nowrap transition-colors ${
              activeTab === tab.key
                ? 'text-honey-600 border-b-2 border-honey-500'
                : 'text-neutral-600 hover:text-neutral-800'
            }`}
          >
            <span>{tab.icon}</span>
            <span>{tab.label}</span>
          </button>
        ))}
      </div>

      {/* Tab Content */}
      <motion.div
        key={activeTab}
        initial={{ opacity: 0, y: 10 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.2 }}
      >
        {activeTab === 'overview' && <OverviewSection />}
        {activeTab === 'revenue' && <RevenueSection />}
        {activeTab === 'customers' && <CustomerSection />}
        {activeTab === 'passes' && <PassSection />}
        {activeTab === 'parties' && <PartySection />}
        {activeTab === 'sessions' && <SessionSection />}
        {activeTab === 'marketing' && <MarketingSection />}
      </motion.div>
    </div>
  );
}
