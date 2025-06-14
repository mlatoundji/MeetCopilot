"use client";
import React from 'react';

interface TimelineItem {
  id: string;
  title: string;
  time: string;
  participants: number;
  status: 'upcoming' | 'completed' | 'in-progress';
}

const Timeline: React.FC = () => {
  const timelineData: TimelineItem[] = [
    {
      id: '1',
      title: 'Product Strategy Review',
      time: '2:00 PM',
      participants: 8,
      status: 'upcoming'
    },
    {
      id: '2',
      title: 'Weekly Team Standup',
      time: '10:00 AM',
      participants: 12,
      status: 'completed'
    },
    {
      id: '3',
      title: 'Design Review Session',
      time: '11:30 AM',
      participants: 5,
      status: 'in-progress'
    }
  ];

  const getStatusStyles = (status: TimelineItem['status']) => {
    switch (status) {
      case 'upcoming':
        return {
          border: 'border-l-blue-500',
          dot: 'bg-blue-500',
          badge: 'bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-300'
        };
      case 'completed':
        return {
          border: 'border-l-green-500',
          dot: 'bg-green-500',
          badge: 'bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-300'
        };
      case 'in-progress':
        return {
          border: 'border-l-orange-500',
          dot: 'bg-orange-500',
          badge: 'bg-orange-100 text-orange-800 dark:bg-orange-900 dark:text-orange-300'
        };
      default:
        return {
          border: 'border-l-gray-300',
          dot: 'bg-gray-300',
          badge: 'bg-gray-100 text-gray-800 dark:bg-gray-900 dark:text-gray-300'
        };
    }
  };

  const handleItemClick = (item: TimelineItem) => {
    console.log('Timeline item clicked:', item.title);
  };

  return (
    <div>
      <div className="flex items-center justify-between mb-6">
        <h2 className="text-lg font-semibold text-gray-900 dark:text-white">Meeting Timeline</h2>
        <span className="text-lg text-gray-500">📅</span>
      </div>
      
      <div className="text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wide mb-4 pb-2 border-b border-gray-200 dark:border-gray-600">
        Today
      </div>
      
      <div className="space-y-3">
        {timelineData.map((item) => {
          const styles = getStatusStyles(item.status);
          return (
            <div
              key={item.id}
              onClick={() => handleItemClick(item)}
              className={`flex items-center p-3 border-l-4 ${styles.border} hover:bg-gray-50 dark:hover:bg-gray-700 hover:translate-x-1 transition-all duration-200 cursor-pointer rounded-r-lg ${
                item.status === 'completed' ? 'opacity-80' : ''
              }`}
            >
              <div className={`w-3 h-3 rounded-full ${styles.dot} mr-4 flex-shrink-0`}></div>
              <div className="flex-1 min-w-0">
                <div className={`font-medium text-gray-900 dark:text-white ${
                  item.status === 'completed' ? 'line-through' : ''
                }`}>
                  {item.title}
                </div>
                <div className="text-sm text-gray-500 dark:text-gray-400">{item.time}</div>
              </div>
              <div className="flex items-center gap-3 ml-auto flex-shrink-0">
                <span className="text-sm text-gray-500 dark:text-gray-400 flex items-center gap-1">
                  👥 {item.participants}
                </span>
                <span className={`px-2 py-1 text-xs font-medium rounded-full ${styles.badge}`}>
                  {item.status.replace('-', ' ')}
                </span>
              </div>
            </div>
          );
        })}
      </div>
      
      <div className="text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wide mt-6 mb-4 pb-2 border-b border-gray-200 dark:border-gray-600">
        Tomorrow
      </div>
    </div>
  );
};

export default Timeline; 