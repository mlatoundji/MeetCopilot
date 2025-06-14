"use client";
import React from 'react';

interface StatisticCardProps {
  title: string;
  value: number;
  trend: string;
  icon: string;
}

const StatisticCard: React.FC<StatisticCardProps> = ({ title, value, trend, icon }) => {
  const getTrendClass = (trendText: string) => {
    if (trendText.includes('+')) return 'text-green-600 dark:text-green-400';
    if (trendText.includes('-') && !trendText.includes('completed')) return 'text-red-600 dark:text-red-400';
    return 'text-gray-600 dark:text-gray-400';
  };

  return (
    <div className="bg-white dark:bg-gray-800 rounded-lg shadow-sm border border-gray-200 dark:border-gray-700 p-4 lg:p-6 transition-all duration-200 hover:-translate-y-0.5 hover:shadow-md cursor-pointer">
      <div className="flex items-center justify-between mb-2">
        <h3 className="text-sm font-medium text-gray-600 dark:text-gray-400">{title}</h3>
        <span className="text-lg opacity-80">{icon}</span>
      </div>
      <div className="text-2xl font-bold text-gray-900 dark:text-white mb-1">{value}</div>
      <div className={`text-sm ${getTrendClass(trend)}`}>
        {trend}
      </div>
    </div>
  );
};

export default StatisticCard; 