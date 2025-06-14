import React from 'react';
import ThemeToggle from './ThemeToggle';

const Header: React.FC = () => (
  <header className="w-full h-14 bg-white dark:bg-gray-800 border-b border-gray-200 dark:border-gray-700 shadow-sm flex items-center px-4 gap-4 sticky top-0 z-10">
    <button className="md:hidden text-2xl text-gray-900 dark:text-white" aria-label="Toggle Sidebar">☰</button>
    <input
      type="search"
      placeholder="Search sessions, documents, meetings…"
      className="flex-1 max-w-lg px-3 py-2 rounded-md bg-gray-50 dark:bg-gray-700 border border-gray-200 dark:border-gray-600 text-sm text-gray-900 dark:text-white placeholder-gray-500 dark:placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
    />
    <ThemeToggle />
    <button className="relative text-gray-700 dark:text-gray-300 hover:text-blue-600 dark:hover:text-blue-400 transition-all duration-200" aria-label="Notifications">
      🔔
      <span className="absolute -top-1 -right-1 w-2 h-2 bg-red-500 rounded-full"></span>
    </button>
    <div className="flex items-center gap-2">
      <div className="hidden sm:block text-right">
        <div className="text-sm font-medium text-gray-900 dark:text-white">Sarah Johnson</div>
        <div className="text-xs text-gray-600 dark:text-gray-400">sarah.johnson@company.com</div>
      </div>
      <button className="w-8 h-8 rounded-full bg-blue-600 text-white font-medium flex items-center justify-center hover:bg-blue-700 transition-all duration-200" aria-label="Profile">
        S
      </button>
    </div>
  </header>
);

export default Header; 