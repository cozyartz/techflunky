import React from 'react';

interface SellerMetricCardProps {
  title: string;
  value: string | number;
  subtitle?: string;
  trend?: {
    value: number;
    isPositive: boolean;
    label: string;
  };
  icon: React.ReactNode;
  color?: 'yellow' | 'green' | 'blue' | 'purple' | 'red' | 'orange';
  loading?: boolean;
  actionButton?: {
    label: string;
    onClick: () => void;
    color?: 'primary' | 'secondary';
  };
}

export default function SellerMetricCard({
  title,
  value,
  subtitle,
  trend,
  icon,
  color = 'yellow',
  loading = false,
  actionButton
}: SellerMetricCardProps) {
  const colorClasses = {
    yellow: {
      bg: 'bg-yellow-400/10',
      border: 'border-yellow-400/20',
      hoverBorder: 'hover:border-yellow-400/40',
      icon: 'text-yellow-400',
      accent: 'text-yellow-400',
      glow: 'hover:shadow-yellow-500/20'
    },
    green: {
      bg: 'bg-green-400/10',
      border: 'border-green-400/20',
      hoverBorder: 'hover:border-green-400/40',
      icon: 'text-green-400',
      accent: 'text-green-400',
      glow: 'hover:shadow-green-500/20'
    },
    blue: {
      bg: 'bg-blue-400/10',
      border: 'border-blue-400/20',
      hoverBorder: 'hover:border-blue-400/40',
      icon: 'text-blue-400',
      accent: 'text-blue-400',
      glow: 'hover:shadow-blue-500/20'
    },
    purple: {
      bg: 'bg-purple-400/10',
      border: 'border-purple-400/20',
      hoverBorder: 'hover:border-purple-400/40',
      icon: 'text-purple-400',
      accent: 'text-purple-400',
      glow: 'hover:shadow-purple-500/20'
    },
    red: {
      bg: 'bg-red-400/10',
      border: 'border-red-400/20',
      hoverBorder: 'hover:border-red-400/40',
      icon: 'text-red-400',
      accent: 'text-red-400',
      glow: 'hover:shadow-red-500/20'
    },
    orange: {
      bg: 'bg-orange-400/10',
      border: 'border-orange-400/20',
      hoverBorder: 'hover:border-orange-400/40',
      icon: 'text-orange-400',
      accent: 'text-orange-400',
      glow: 'hover:shadow-orange-500/20'
    }
  };

  const colorClass = colorClasses[color];

  if (loading) {
    return (
      <div className="bg-gradient-to-br from-gray-900/50 to-black/50 backdrop-blur-sm rounded-2xl border border-gray-700/50 p-6 animate-pulse">
        <div className="flex items-start justify-between mb-4">
          <div className="w-12 h-12 bg-gray-700 rounded-xl"></div>
          <div className="w-6 h-6 bg-gray-700 rounded"></div>
        </div>
        <div className="space-y-2">
          <div className="w-24 h-4 bg-gray-700 rounded"></div>
          <div className="w-32 h-8 bg-gray-700 rounded"></div>
          <div className="w-20 h-3 bg-gray-700 rounded"></div>
        </div>
      </div>
    );
  }

  return (
    <div className={`group bg-gradient-to-br from-gray-900/50 to-black/50 backdrop-blur-sm rounded-2xl border ${colorClass.border} ${colorClass.hoverBorder} p-6 transition-all duration-300 hover:transform hover:scale-[1.02] hover:shadow-xl ${colorClass.glow} relative overflow-hidden`}>
      {/* Animated border top */}
      <div className={`absolute top-0 left-0 right-0 h-1 ${colorClass.bg} opacity-0 group-hover:opacity-100 transition-opacity duration-300`}></div>

      {/* Header */}
      <div className="flex items-start justify-between mb-4">
        <div className={`w-12 h-12 ${colorClass.bg} rounded-xl flex items-center justify-center group-hover:scale-110 transition-transform duration-300`}>
          <div className={`w-6 h-6 ${colorClass.icon}`}>
            {icon}
          </div>
        </div>

        {trend && (
          <div className={`flex items-center space-x-1 px-2 py-1 rounded-full text-xs font-medium ${
            trend.isPositive
              ? 'bg-green-400/10 text-green-400 border border-green-400/20'
              : 'bg-red-400/10 text-red-400 border border-red-400/20'
          }`}>
            <svg
              className={`w-3 h-3 ${trend.isPositive ? 'rotate-0' : 'rotate-180'}`}
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
            >
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 7h8m0 0v8m0-8l-8 8-4-4-6 6" />
            </svg>
            <span>{Math.abs(trend.value)}%</span>
          </div>
        )}
      </div>

      {/* Content */}
      <div className="space-y-1">
        <h3 className="text-sm font-medium text-gray-400 uppercase tracking-wider">
          {title}
        </h3>

        <div className="flex items-baseline space-x-2">
          <span className={`text-3xl font-bold text-white group-hover:${colorClass.accent} transition-colors duration-300`}>
            {typeof value === 'number' ? value.toLocaleString() : value}
          </span>
        </div>

        {subtitle && (
          <p className="text-sm text-gray-400">
            {subtitle}
          </p>
        )}

        {trend && (
          <p className={`text-xs ${trend.isPositive ? 'text-green-400' : 'text-red-400'}`}>
            {trend.label}
          </p>
        )}
      </div>

      {/* Action Button */}
      {actionButton && (
        <div className="mt-4 pt-4 border-t border-gray-700">
          <button
            onClick={actionButton.onClick}
            className={`w-full py-2 px-4 rounded-lg text-sm font-medium transition-all duration-200 ${
              actionButton.color === 'primary'
                ? `${colorClass.bg} ${colorClass.accent} border ${colorClass.border} hover:bg-opacity-20`
                : 'bg-gray-800/50 text-gray-300 border border-gray-700 hover:bg-gray-700/50 hover:text-white'
            }`}
          >
            {actionButton.label}
          </button>
        </div>
      )}

      {/* Hover glow effect */}
      <div className={`absolute inset-0 ${colorClass.bg} rounded-2xl opacity-0 group-hover:opacity-10 transition-opacity duration-300 -z-10`}></div>
    </div>
  );
}

// Specialized seller metric cards
export function EarningsCard({
  totalEarnings,
  monthlyEarnings,
  trend,
  loading,
  onViewDetails
}: {
  totalEarnings: number;
  monthlyEarnings: number;
  trend?: SellerMetricCardProps['trend'];
  loading?: boolean;
  onViewDetails?: () => void;
}) {
  return (
    <SellerMetricCard
      title="Total Earnings"
      value={`$${(totalEarnings / 1000).toFixed(1)}K`}
      subtitle={`$${monthlyEarnings.toLocaleString()} this month`}
      trend={trend}
      loading={loading}
      color="green"
      actionButton={onViewDetails ? {
        label: "View Details",
        onClick: onViewDetails,
        color: "primary"
      } : undefined}
      icon={
        <svg fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8c-1.657 0-3 .895-3 2s1.343 2 3 2 3 .895 3 2-1.343 2-3 2m0-8c1.11 0 2.08.402 2.599 1M12 8V7m0 1v8m0 0v1m0-1c-1.11 0-2.08-.402-2.599-1M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
        </svg>
      }
    />
  );
}

export function PlatformsCard({
  total,
  active,
  trend,
  loading,
  onManagePlatforms
}: {
  total: number;
  active: number;
  trend?: SellerMetricCardProps['trend'];
  loading?: boolean;
  onManagePlatforms?: () => void;
}) {
  return (
    <SellerMetricCard
      title="My Platforms"
      value={total}
      subtitle={`${active} active listings`}
      trend={trend}
      loading={loading}
      color="blue"
      actionButton={onManagePlatforms ? {
        label: "Manage",
        onClick: onManagePlatforms,
        color: "primary"
      } : undefined}
      icon={
        <svg fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 11H5m14 0a2 2 0 012 2v6a2 2 0 01-2 2H5a2 2 0 01-2-2v-6a2 2 0 012-2m14 0V9a2 2 0 00-2-2M5 11V9a2 2 0 012-2m0 0V5a2 2 0 012-2h6a2 2 0 012 2v2M7 7h10" />
        </svg>
      }
    />
  );
}

export function ViewsCard({
  totalViews,
  weeklyViews,
  trend,
  loading,
  onOptimize
}: {
  totalViews: number;
  weeklyViews: number;
  trend?: SellerMetricCardProps['trend'];
  loading?: boolean;
  onOptimize?: () => void;
}) {
  return (
    <SellerMetricCard
      title="Platform Views"
      value={`${(totalViews / 1000).toFixed(1)}K`}
      subtitle={`${weeklyViews} this week`}
      trend={trend}
      loading={loading}
      color="purple"
      actionButton={onOptimize ? {
        label: "Optimize",
        onClick: onOptimize,
        color: "primary"
      } : undefined}
      icon={
        <svg fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z" />
        </svg>
      }
    />
  );
}

export function PerformanceCard({
  score,
  rating,
  trend,
  loading,
  onImprove
}: {
  score: number;
  rating: number;
  trend?: SellerMetricCardProps['trend'];
  loading?: boolean;
  onImprove?: () => void;
}) {
  const getScoreColor = (score: number) => {
    if (score >= 90) return 'green';
    if (score >= 70) return 'yellow';
    if (score >= 50) return 'orange';
    return 'red';
  };

  return (
    <SellerMetricCard
      title="Seller Score"
      value={`${score}/100`}
      subtitle={`${rating}/5.0 rating`}
      trend={trend}
      loading={loading}
      color={getScoreColor(score)}
      actionButton={onImprove ? {
        label: "Improve",
        onClick: onImprove,
        color: "primary"
      } : undefined}
      icon={
        <svg fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11.049 2.927c.3-.921 1.603-.921 1.902 0l1.519 4.674a1 1 0 00.95.69h4.915c.969 0 1.371 1.24.588 1.81l-3.976 2.888a1 1 0 00-.363 1.118l1.518 4.674c.3.922-.755 1.688-1.538 1.118l-3.976-2.888a1 1 0 00-1.176 0l-3.976 2.888c-.783.57-1.838-.197-1.538-1.118l1.518-4.674a1 1 0 00-.363-1.118l-3.976-2.888c-.784-.57-.38-1.81.588-1.81h4.914a1 1 0 00.951-.69l1.519-4.674z" />
        </svg>
      }
    />
  );
}

export function ValidationCard({
  pendingCount,
  approvedCount,
  trend,
  loading,
  onViewPending
}: {
  pendingCount: number;
  approvedCount: number;
  trend?: SellerMetricCardProps['trend'];
  loading?: boolean;
  onViewPending?: () => void;
}) {
  return (
    <SellerMetricCard
      title="AI Validation"
      value={`${pendingCount}`}
      subtitle={`${approvedCount} approved total`}
      trend={trend}
      loading={loading}
      color={pendingCount > 0 ? 'orange' : 'green'}
      actionButton={onViewPending && pendingCount > 0 ? {
        label: "Review",
        onClick: onViewPending,
        color: "primary"
      } : undefined}
      icon={
        <svg fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
        </svg>
      }
    />
  );
}

export function MessagesCard({
  unreadCount,
  totalMessages,
  trend,
  loading,
  onViewMessages
}: {
  unreadCount: number;
  totalMessages: number;
  trend?: SellerMetricCardProps['trend'];
  loading?: boolean;
  onViewMessages?: () => void;
}) {
  return (
    <SellerMetricCard
      title="Messages"
      value={unreadCount}
      subtitle={`${totalMessages} total conversations`}
      trend={trend}
      loading={loading}
      color={unreadCount > 0 ? 'blue' : 'gray'}
      actionButton={onViewMessages && unreadCount > 0 ? {
        label: "Reply",
        onClick: onViewMessages,
        color: "primary"
      } : undefined}
      icon={
        <svg fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 12h.01M12 12h.01M16 12h.01M21 12c0 4.418-4.03 8-9 8a9.863 9.863 0 01-4.255-.949L3 20l1.395-3.72C3.512 15.042 3 13.574 3 12c0-4.418 4.03-8 9-8s9 3.582 9 8z" />
        </svg>
      }
    />
  );
}