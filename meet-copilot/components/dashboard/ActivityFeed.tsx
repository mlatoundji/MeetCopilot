"use client";
import React from 'react';

interface ActivityItem {
  id: string;
  type: 'session' | 'summary' | 'task';
  title: string;
  time: string;
  description?: string;
}

const ActivityFeed: React.FC = () => {
  const activities: ActivityItem[] = [
    {
      id: '1',
      type: 'session',
      title: 'Weekly Team Standup session completed',
      time: '2 hours ago',
      description: 'Session lasted 45 minutes with 12 participants'
    },
    {
      id: '2',
      type: 'summary',
      title: 'New summary generated for Design Review',
      time: '5 hours ago',
      description: 'AI-generated summary with 3 action items created'
    },
    {
      id: '3',
      type: 'task',
      title: 'Task created: Update user interface mockups',
      time: '1 day ago',
      description: 'Assigned to design team, due next Friday'
    }
  ];

  const getActivityIcon = (type: ActivityItem['type']) => {
    switch (type) {
      case 'session':
        return '🎯';
      case 'summary':
        return '📄';
      case 'task':
        return '✓';
      default:
        return '•';
    }
  };

  const getIconStyles = (type: ActivityItem['type']) => {
    switch (type) {
      case 'session':
        return 'bg-blue-100 text-blue-600 dark:bg-blue-900 dark:text-blue-300';
      case 'summary':
        return 'bg-green-100 text-green-600 dark:bg-green-900 dark:text-green-300';
      case 'task':
        return 'bg-orange-100 text-orange-600 dark:bg-orange-900 dark:text-orange-300';
      default:
        return 'bg-gray-100 text-gray-600 dark:bg-gray-900 dark:text-gray-300';
    }
  };

  const handleActivityClick = (activity: ActivityItem) => {
    console.log('Activity clicked:', activity.title);
  };

  return (
    <div>
      <h2 className="text-lg font-semibold text-gray-900 dark:text-white mb-4">Activity Feed</h2>
      <div className="space-y-4">
        {activities.map((activity) => (
          <div 
            key={activity.id}
            onClick={() => handleActivityClick(activity)}
            className="flex items-start gap-3 p-3 hover:bg-gray-50 dark:hover:bg-gray-700 rounded-lg transition-colors duration-200 cursor-pointer border-b border-gray-100 dark:border-gray-600 last:border-b-0 last:pb-0"
          >
            <div className={`w-8 h-8 rounded-lg flex items-center justify-center text-sm flex-shrink-0 mt-1 ${getIconStyles(activity.type)}`}>
              {getActivityIcon(activity.type)}
            </div>
            <div className="flex-1 min-w-0">
              <div className="font-medium text-gray-900 dark:text-white text-sm mb-1">
                {activity.title}
              </div>
              <div className="text-xs text-gray-500 dark:text-gray-400">
                {activity.time}
              </div>
              {activity.description && (
                <div className="text-xs text-gray-600 dark:text-gray-300 mt-1 leading-relaxed">
                  {activity.description}
                </div>
              )}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
};

export default ActivityFeed; 