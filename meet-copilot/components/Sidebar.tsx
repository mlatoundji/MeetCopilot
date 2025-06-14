import Link from 'next/link';
import React from 'react';

interface NavItem {
  href: string;
  label: string;
  icon: React.ReactNode;
}

const navItems: NavItem[] = [
  { href: '/', label: 'Dashboard', icon: '🏠' },
  { href: '/calendar', label: 'Calendar', icon: '📅' },
  { href: '/sessions', label: 'Sessions', icon: '🧾' },
  { href: '/documents', label: 'Documents', icon: '📂' },
  { href: '/settings', label: 'Settings', icon: '⚙️' },
];

const Sidebar: React.FC = () => (
  <aside className="h-screen bg-gray-50 dark:bg-gray-900 border-r border-gray-200 dark:border-gray-700 w-60 flex-shrink-0 hidden md:block">
    <div className="p-4 text-lg font-semibold text-gray-900 dark:text-white border-b border-gray-200 dark:border-gray-700">
      <div className="flex items-center gap-2">
        <span className="text-blue-600 dark:text-blue-400 text-xl">MC</span>
        Meet Copilot
      </div>
    </div>
    <nav className="mt-4 flex flex-col gap-1 px-2">
      {navItems.map(({ href, label, icon }) => (
        <Link
          key={href}
          href={href}
          className="flex items-center gap-3 px-3 py-2.5 text-gray-700 dark:text-gray-300 hover:bg-blue-600 hover:text-white rounded-md transition-all duration-200"
        >
          <span aria-hidden>{icon}</span>
          <span>{label}</span>
        </Link>
      ))}
    </nav>
    <div className="absolute bottom-4 left-4 right-4">
      <button className="flex items-center gap-2 text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-white transition-all duration-200">
        <span>⬅</span>
        <span>Collapse</span>
      </button>
    </div>
  </aside>
);

export default Sidebar; 