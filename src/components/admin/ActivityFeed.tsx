import React, { useState, useEffect } from 'react';

interface Activity {
  id: string;
  type: 'sale' | 'listing' | 'user' | 'service' | 'deployment' | 'payment';
  title: string;
  description: string;
  timestamp: string;
  user?: {
    name: string;
    avatar?: string;
  };
  metadata?: {
    amount?: number;
    status?: string;
    platform?: string;
  };
}

interface ActivityFeedProps {
  activities?: Activity[];
  loading?: boolean;
  showHeader?: boolean;
  maxItems?: number;
  autoRefresh?: boolean;
}

export default function ActivityFeed({
  activities = [],
  loading = false,
  showHeader = true,
  maxItems = 10,
  autoRefresh = true
}: ActivityFeedProps) {
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [displayedActivities, setDisplayedActivities] = useState<Activity[]>([]);

  // Mock data for demonstration
  const mockActivities: Activity[] = [
    {
      id: '1',
      type: 'sale',
      title: 'Platform Purchase',
      description: 'AI HR Compliance Platform sold',
      timestamp: new Date(Date.now() - 5 * 60 * 1000).toISOString(),
      user: { name: 'Sarah Johnson' },
      metadata: { amount: 35000, platform: 'HR Compliance' }
    },
    {
      id: '2',
      type: 'listing',
      title: 'New Platform Listed',
      description: 'Healthcare Analytics Platform submitted for review',
      timestamp: new Date(Date.now() - 15 * 60 * 1000).toISOString(),
      user: { name: 'Mike Chen' },
      metadata: { platform: 'Healthcare Analytics' }
    },
    {
      id: '3',
      type: 'user',
      title: 'New User Registration',
      description: 'Investor account created',
      timestamp: new Date(Date.now() - 30 * 60 * 1000).toISOString(),
      user: { name: 'Alex Rodriguez' }
    },
    {
      id: '4',
      type: 'service',
      title: 'White-Glove Service Request',
      description: 'Platform customization requested',
      timestamp: new Date(Date.now() - 45 * 60 * 1000).toISOString(),
      user: { name: 'Emma Wilson' },
      metadata: { amount: 5000, platform: 'E-commerce Platform' }
    },
    {
      id: '5',
      type: 'deployment',
      title: 'Platform Deployed',
      description: 'AI HR Compliance Platform successfully deployed',
      timestamp: new Date(Date.now() - 60 * 60 * 1000).toISOString(),
      user: { name: 'System' },
      metadata: { status: 'success', platform: 'HR Compliance' }
    },
    {
      id: '6',
      type: 'payment',
      title: 'Payment Processed',
      description: 'Escrow payment released to seller',
      timestamp: new Date(Date.now() - 75 * 60 * 1000).toISOString(),
      user: { name: 'Payment System' },
      metadata: { amount: 33250 }
    }
  ];

  useEffect(() => {
    const currentActivities = activities.length > 0 ? activities : mockActivities;
    setDisplayedActivities(currentActivities.slice(0, maxItems));
  }, [activities, maxItems]);

  const getActivityIcon = (type: Activity['type']) => {
    const iconClasses = "w-4 h-4";
    switch (type) {
      case 'sale':
        return (
          <svg className={`${iconClasses} text-green-400`} fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8c-1.657 0-3 .895-3 2s1.343 2 3 2 3 .895 3 2-1.343 2-3 2m0-8c1.11 0 2.08.402 2.599 1M12 8V7m0 1v8m0 0v1m0-1c-1.11 0-2.08-.402-2.599-1M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
          </svg>
        );
      case 'listing':
        return (
          <svg className={`${iconClasses} text-blue-400`} fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 11H5m14 0a2 2 0 012 2v6a2 2 0 01-2 2H5a2 2 0 01-2-2v-6a2 2 0 012-2m14 0V9a2 2 0 00-2-2M5 11V9a2 2 0 012-2m0 0V5a2 2 0 012-2h6a2 2 0 012 2v2M7 7h10" />
          </svg>
        );
      case 'user':
        return (
          <svg className={`${iconClasses} text-purple-400`} fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
          </svg>
        );
      case 'service':
        return (
          <svg className={`${iconClasses} text-yellow-400`} fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 13.255A23.931 23.931 0 0112 15c-3.183 0-6.22-.62-9-1.745M16 6V4a2 2 0 00-2-2h-4a2 2 0 00-2-2v2m8 0V6a2 2 0 012 2v6a2 2 0 01-2 2H8a2 2 0 01-2-2V8a2 2 0 012-2V6" />
          </svg>
        );
      case 'deployment':
        return (
          <svg className={`${iconClasses} text-orange-400`} fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 12h14M5 12a2 2 0 01-2-2V6a2 2 0 012-2h14a2 2 0 012 2v4a2 2 0 01-2 2M5 12a2 2 0 00-2 2v4a2 2 0 002 2h14a2 2 0 002-2v-4a2 2 0 00-2-2m-2-4h.01M17 16h.01" />
          </svg>
        );
      case 'payment':
        return (
          <svg className={`${iconClasses} text-green-400`} fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 10h18M7 15h1m4 0h1m-7 4h12a3 3 0 003-3V8a3 3 0 00-3-3H6a3 3 0 00-3 3v8a3 3 0 003 3z" />
          </svg>
        );
      default:
        return (
          <svg className={`${iconClasses} text-gray-400`} fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
          </svg>
        );
    }
  };

  const getTypeLabel = (type: Activity['type']) => {
    const labels = {
      sale: 'Sale',
      listing: 'Listing',
      user: 'User',
      service: 'Service',
      deployment: 'Deploy',
      payment: 'Payment'
    };
    return labels[type];
  };

  const formatTimeAgo = (timestamp: string) => {
    const now = new Date();
    const time = new Date(timestamp);
    const diffInMinutes = Math.floor((now.getTime() - time.getTime()) / (1000 * 60));

    if (diffInMinutes < 1) return 'Just now';
    if (diffInMinutes < 60) return `${diffInMinutes}m ago`;
    if (diffInMinutes < 1440) return `${Math.floor(diffInMinutes / 60)}h ago`;
    return `${Math.floor(diffInMinutes / 1440)}d ago`;
  };

  const handleRefresh = async () => {
    setIsRefreshing(true);
    // Simulate API call
    await new Promise(resolve => setTimeout(resolve, 1000));
    setIsRefreshing(false);
  };

  if (loading) {
    return (
      <div className="bg-gradient-to-br from-gray-900/50 to-black/50 backdrop-blur-sm rounded-2xl border border-yellow-400/20 p-6">
        <div className="animate-pulse space-y-4">
          {[...Array(5)].map((_, i) => (
            <div key={i} className="flex items-start space-x-3">
              <div className="w-8 h-8 bg-gray-700 rounded-full"></div>
              <div className="flex-1 space-y-2">
                <div className="w-32 h-4 bg-gray-700 rounded"></div>
                <div className="w-48 h-3 bg-gray-700 rounded"></div>
              </div>
              <div className="w-12 h-3 bg-gray-700 rounded"></div>
            </div>
          ))}
        </div>
      </div>
    );
  }

  return (
    <div className="bg-gradient-to-br from-gray-900/50 to-black/50 backdrop-blur-sm rounded-2xl border border-yellow-400/20 p-6 hover:border-yellow-400/40 transition-all duration-300">
      {showHeader && (
        <div className="flex items-center justify-between mb-6">
          <div>
            <h3 className="text-lg font-semibold text-white">Recent Activity</h3>
            <p className="text-sm text-gray-400">Live platform updates</p>
          </div>
          <button
            onClick={handleRefresh}
            disabled={isRefreshing}
            className="p-2 text-gray-400 hover:text-yellow-400 transition-colors disabled:opacity-50"
          >
            <svg
              className={`w-5 h-5 ${isRefreshing ? 'animate-spin' : ''}`}
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
            >
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
            </svg>
          </button>
        </div>
      )}

      <div className="space-y-4">
        {displayedActivities.map((activity) => (
          <div
            key={activity.id}
            className="group flex items-start space-x-3 p-3 rounded-lg hover:bg-gray-800/30 transition-all duration-200"
          >
            {/* Activity Icon */}
            <div className="flex-shrink-0 w-8 h-8 bg-gray-800 rounded-full flex items-center justify-center group-hover:scale-110 transition-transform duration-200">
              {getActivityIcon(activity.type)}
            </div>

            {/* Activity Content */}
            <div className="flex-1 min-w-0">
              <div className="flex items-center justify-between">
                <h4 className="text-sm font-medium text-white group-hover:text-yellow-400 transition-colors">
                  {activity.title}
                </h4>
                <div className="flex items-center space-x-2">
                  <span className={`px-2 py-1 text-xs font-medium rounded-full ${
                    activity.type === 'sale' ? 'bg-green-400/10 text-green-400' :
                    activity.type === 'listing' ? 'bg-blue-400/10 text-blue-400' :
                    activity.type === 'user' ? 'bg-purple-400/10 text-purple-400' :
                    activity.type === 'service' ? 'bg-yellow-400/10 text-yellow-400' :
                    activity.type === 'deployment' ? 'bg-orange-400/10 text-orange-400' :
                    'bg-green-400/10 text-green-400'
                  }`}>
                    {getTypeLabel(activity.type)}
                  </span>
                  <span className="text-xs text-gray-400">
                    {formatTimeAgo(activity.timestamp)}
                  </span>
                </div>
              </div>

              <p className="text-sm text-gray-400 mt-1">
                {activity.description}
              </p>

              {/* Metadata */}
              {activity.metadata && (
                <div className="flex items-center space-x-4 mt-2 text-xs">
                  {activity.metadata.amount && (
                    <span className="text-green-400 font-medium">
                      ${activity.metadata.amount.toLocaleString()}
                    </span>
                  )}
                  {activity.metadata.platform && (
                    <span className="text-gray-500">
                      {activity.metadata.platform}
                    </span>
                  )}
                  {activity.metadata.status && (
                    <span className={`font-medium ${
                      activity.metadata.status === 'success' ? 'text-green-400' :
                      activity.metadata.status === 'pending' ? 'text-yellow-400' :
                      'text-red-400'
                    }`}>
                      {activity.metadata.status}
                    </span>
                  )}
                </div>
              )}

              {/* User Info */}
              {activity.user && activity.user.name !== 'System' && activity.user.name !== 'Payment System' && (
                <div className="flex items-center space-x-2 mt-2">
                  <div className="w-4 h-4 bg-yellow-400 rounded-full flex items-center justify-center">
                    <span className="text-black text-xs font-bold">
                      {activity.user.name.charAt(0)}
                    </span>
                  </div>
                  <span className="text-xs text-gray-500">
                    {activity.user.name}
                  </span>
                </div>
              )}
            </div>
          </div>
        ))}
      </div>

      {displayedActivities.length === 0 && (
        <div className="text-center py-8">
          <svg className="w-12 h-12 text-gray-600 mx-auto mb-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 4V2a1 1 0 011-1h8a1 1 0 011 1v2m-9 2v14a2 2 0 002 2h6a2 2 0 002-2V6M9 6h6M9 10h6m-3 4h3" />
          </svg>
          <p className="text-gray-400 text-sm">No recent activity</p>
        </div>
      )}

      {/* Live indicator */}
      {autoRefresh && (
        <div className="flex items-center justify-center mt-4 pt-4 border-t border-gray-700">
          <div className="flex items-center space-x-2 text-xs text-gray-400">
            <div className="w-2 h-2 bg-green-400 rounded-full animate-pulse"></div>
            <span>Live updates</span>
          </div>
        </div>
      )}
    </div>
  );
}