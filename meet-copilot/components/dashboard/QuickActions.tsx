"use client";
import React from 'react';

const QuickActions: React.FC = () => {
  const handleStartSession = () => {
    console.log('Start Session clicked');
  };

  const handlePlanWithAvatar = () => {
    console.log('Plan With Avatar clicked');
  };

  const handleCreateTask = () => {
    console.log('Create Task clicked');
  };

  return (
    <div>
      <h2 className="text-lg font-semibold text-gray-900 dark:text-white mb-4">Quick Actions</h2>
      <div className="flex flex-col gap-3">
        <button 
          onClick={handleStartSession}
          className="flex items-center gap-3 p-3 bg-blue-600 hover:bg-blue-700 text-white rounded-lg transition-all duration-200 hover:-translate-y-0.5 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 dark:focus:ring-offset-gray-800"
        >
          <span className="text-lg">▶</span>
          Start Session
        </button>
        <button 
          onClick={handlePlanWithAvatar}
          className="flex items-center gap-3 p-3 bg-purple-100 hover:bg-purple-200 text-purple-700 dark:bg-purple-900 dark:hover:bg-purple-800 dark:text-purple-300 rounded-lg transition-all duration-200 hover:-translate-y-0.5 focus:outline-none focus:ring-2 focus:ring-purple-500 focus:ring-offset-2 dark:focus:ring-offset-gray-800"
        >
          <span className="text-lg">🎭</span>
          Plan With Avatar
        </button>
        <button 
          onClick={handleCreateTask}
          className="flex items-center gap-3 p-3 bg-green-100 hover:bg-green-200 text-green-700 dark:bg-green-900 dark:hover:bg-green-800 dark:text-green-300 rounded-lg transition-all duration-200 hover:-translate-y-0.5 focus:outline-none focus:ring-2 focus:ring-green-500 focus:ring-offset-2 dark:focus:ring-offset-gray-800"
        >
          <span className="text-lg">+</span>
          Create Task
        </button>
      </div>
    </div>
  );
};

export default QuickActions; 