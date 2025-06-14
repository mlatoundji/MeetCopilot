"use client";
import React from 'react';
import StatisticCard from '../components/dashboard/StatisticCard';
import QuickActions from '../components/dashboard/QuickActions';
import Timeline from '../components/dashboard/Timeline';
import ActivityFeed from '../components/dashboard/ActivityFeed';

export default function HomeDashboard() {
  return (
    <div className="flex flex-col gap-6 w-full p-6 md:p-8 max-w-7xl mx-auto bg-white dark:bg-gray-900 min-h-full" data-testid="dashboard-page">
      {/* Welcome & Stats */}
      <section className="flex flex-col md:flex-row md:items-center md:justify-between gap-4 mb-2">
        <div>
          <h1 className="text-2xl font-semibold text-gray-900 dark:text-white">Welcome back, Sarah! 👋</h1>
          <p className="text-sm text-gray-600 dark:text-gray-400 mt-1">Here's what's happening with your meetings today.</p>
        </div>
        <div className="flex gap-8">
          <div className="flex flex-col items-end">
            <span className="text-3xl font-bold text-blue-600 dark:text-blue-400">47</span>
            <span className="text-xs text-gray-600 dark:text-gray-400">Sessions Run</span>
          </div>
          <div className="flex flex-col items-end">
            <span className="text-3xl font-bold text-green-600 dark:text-green-400">12.5h</span>
            <span className="text-xs text-gray-600 dark:text-gray-400">Time Saved</span>
          </div>
        </div>
      </section>

      {/* Metric Cards */}
      <section className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 mb-6" aria-label="Key metrics">
        <StatisticCard title="Active Sessions" value={3} trend="+1 from yesterday" icon="🎯" />
        <StatisticCard title="Incoming Meetings" value={8} trend="+2 this week" icon="📅" />
        <StatisticCard title="Latest Summaries" value={12} trend="+4 today" icon="📄" />
        <StatisticCard title="Pending Actions" value={5} trend="-2 completed" icon="✅" />
      </section>

      {/* Main Two-Column Area */}
      <section className="grid grid-cols-1 xl:grid-cols-[2fr_1fr] gap-6 items-start">
        {/* Left column */}
        <div className="bg-white dark:bg-gray-800 rounded-lg shadow-sm border border-gray-200 dark:border-gray-700 p-6 w-full">
          <Timeline />
        </div>
        {/* Right column */}
        <div className="flex flex-col gap-6 w-full">
          <div className="bg-white dark:bg-gray-800 rounded-lg shadow-sm border border-gray-200 dark:border-gray-700 p-6">
            <QuickActions />
          </div>
          <div className="bg-white dark:bg-gray-800 rounded-lg shadow-sm border border-gray-200 dark:border-gray-700 p-6">
            <ActivityFeed />
          </div>
        </div>
      </section>
    </div>
  );
}
