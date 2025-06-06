import React from 'react';

// demo
const DemoSidebar: React.FC = () => {
  return (
    <aside className="flex flex-col w-64 h-screen bg-white border-r dark:bg-gray-800 dark:border-gray-700">
      <div className="flex items-center justify-between h-16 px-4 border-b dark:border-gray-700">
        <h1 className="text-lg font-semibold text-gray-900 dark:text-white">Meet Copilot</h1>
      </div>
      <nav className="flex-1 px-2 py-4 overflow-y-auto">
        <a
          href="#"
          className="block px-2 py-2 mt-2 text-sm font-medium text-gray-700 rounded hover:bg-gray-200 dark:text-gray-300 dark:hover:bg-gray-700"
        >
          Dashboard
        </a>
        <a
          href="#"
          className="block px-2 py-2 mt-2 text-sm font-medium text-gray-700 rounded hover:bg-gray-200 dark:text-gray-300 dark:hover:bg-gray-700"
        >
          Sessions
        </a>
        <a
          href="#"
          className="block px-2 py-2 mt-2 text-sm font-medium text-gray-700 rounded hover:bg-gray-200 dark:text-gray-300 dark:hover:bg-gray-700"
        >
          Settings
        </a>
        <a
          href="#"
          className="block px-2 py-2 mt-2 text-sm font-medium text-gray-700 rounded hover:bg-gray-200 dark:text-gray-300 dark:hover:bg-gray-700"
        >
          Profile
        </a>
      </nav>
    </aside>
  );
};

export default DemoSidebar; 