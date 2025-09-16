import React from 'react';

interface MetricCardProps {
  title: string;
  value: string | number;
  subtitle?: string;
  trend?: {
    value: number;
    isPositive: boolean;
    label: string;
  };
  icon: React.ReactNode;
  color?: 'yellow' | 'green' | 'blue' | 'purple' | 'red';
  loading?: boolean;
}

export default function MetricCard({
  title,
  value,
  subtitle,
  trend,
  icon,
  color = 'yellow',
  loading = false
}: MetricCardProps) {
  const colorClasses = {
    yellow: {
      bg: 'bg-yellow-400/10',
      border: 'border-yellow-400/20',
      icon: 'text-yellow-400',
      accent: 'text-yellow-400'
    },
    green: {
      bg: 'bg-green-400/10',
      border: 'border-green-400/20',
      icon: 'text-green-400',
      accent: 'text-green-400'
    },
    blue: {
      bg: 'bg-blue-400/10',
      border: 'border-blue-400/20',
      icon: 'text-blue-400',
      accent: 'text-blue-400'
    },
    purple: {
      bg: 'bg-purple-400/10',
      border: 'border-purple-400/20',
      icon: 'text-purple-400',
      accent: 'text-purple-400'
    },
    red: {
      bg: 'bg-red-400/10',
      border: 'border-red-400/20',
      icon: 'text-red-400',
      accent: 'text-red-400'
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
    <div className={`group bg-gradient-to-br from-gray-900/50 to-black/50 backdrop-blur-sm rounded-2xl border ${colorClass.border} p-6 hover:border-opacity-40 transition-all duration-300 hover:transform hover:scale-[1.02] hover:shadow-xl`}>
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
              ? 'bg-green-400/10 text-green-400'
              : 'bg-red-400/10 text-red-400'
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
          <span className="text-3xl font-bold text-white group-hover:text-yellow-400 transition-colors duration-300">
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

      {/* Animated background glow */}
      <div className={`absolute inset-0 ${colorClass.bg} rounded-2xl opacity-0 group-hover:opacity-20 transition-opacity duration-300 -z-10`}></div>
    </div>
  );
}

// Specialized metric cards for common use cases
export function RevenueCard({ value, trend, loading }: { value: number; trend?: MetricCardProps['trend']; loading?: boolean }) {
  return (
    <MetricCard
      title="Total Revenue"
      value={`$${(value / 1000).toFixed(1)}K`}
      subtitle="Platform earnings"
      trend={trend}
      loading={loading}
      color="green"
      icon={
        <svg fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8c-1.657 0-3 .895-3 2s1.343 2 3 2 3 .895 3 2-1.343 2-3 2m0-8c1.11 0 2.08.402 2.599 1M12 8V7m0 1v8m0 0v1m0-1c-1.11 0-2.08-.402-2.599-1M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
        </svg>
      }
    />
  );
}

export function UsersCard({ value, trend, loading }: { value: number; trend?: MetricCardProps['trend']; loading?: boolean }) {
  return (
    <MetricCard
      title="Total Users"
      value={value}
      subtitle="Registered accounts"
      trend={trend}
      loading={loading}
      color="blue"
      icon={
        <svg fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4.354a4 4 0 110 5.292M15 21H3v-1a6 6 0 0112 0v1zm0 0h6v-1a6 6 0 00-9-5.197m13.5-9a2.5 2.5 0 11-5 0 2.5 2.5 0 015 0z" />
        </svg>
      }
    />
  );
}

export function ListingsCard({ value, trend, loading }: { value: number; trend?: MetricCardProps['trend']; loading?: boolean }) {
  return (
    <MetricCard
      title="Active Listings"
      value={value}
      subtitle="Available platforms"
      trend={trend}
      loading={loading}
      color="purple"
      icon={
        <svg fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 11H5m14 0a2 2 0 012 2v6a2 2 0 01-2 2H5a2 2 0 01-2-2v-6a2 2 0 012-2m14 0V9a2 2 0 00-2-2M5 11V9a2 2 0 012-2m0 0V5a2 2 0 012-2h6a2 2 0 012 2v2M7 7h10" />
        </svg>
      }
    />
  );
}

export function ServicesCard({ value, trend, loading }: { value: number; trend?: MetricCardProps['trend']; loading?: boolean }) {
  return (
    <MetricCard
      title="Service Requests"
      value={value}
      subtitle="Active projects"
      trend={trend}
      loading={loading}
      color="yellow"
      icon={
        <svg fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 13.255A23.931 23.931 0 0112 15c-3.183 0-6.22-.62-9-1.745M16 6V4a2 2 0 00-2-2h-4a2 2 0 00-2-2v2m8 0V6a2 2 0 012 2v6a2 2 0 01-2 2H8a2 2 0 01-2-2V8a2 2 0 012-2V6" />
        </svg>
      }
    />
  );
}

// Email validation metric cards
export function EmailValidationsCard({ value, trend, loading }: { value: number; trend?: MetricCardProps['trend']; loading?: boolean }) {
  return (
    <MetricCard
      title="Email Validations"
      value={value}
      subtitle="Verified addresses"
      trend={trend}
      loading={loading}
      color="green"
      icon={
        <svg fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 8l7.89 4.26a2 2 0 002.22 0L21 8M5 19h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" />
        </svg>
      }
    />
  );
}

export function EmailQualityCard({ value, trend, loading }: { value: number; trend?: MetricCardProps['trend']; loading?: boolean }) {
  const getScoreColor = (score: number): 'green' | 'blue' | 'yellow' | 'red' => {
    if (score >= 90) return 'green';
    if (score >= 70) return 'blue';
    if (score >= 50) return 'yellow';
    return 'red';
  };

  return (
    <MetricCard
      title="Avg Email Score"
      value={value}
      subtitle="0-100 quality scale"
      trend={trend}
      loading={loading}
      color={getScoreColor(value)}
      icon={
        <svg fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
        </svg>
      }
    />
  );
}

export function SpamBlockedCard({ value, trend, loading }: { value: number; trend?: MetricCardProps['trend']; loading?: boolean }) {
  return (
    <MetricCard
      title="Spam Blocked"
      value={value}
      subtitle="Invalid emails stopped"
      trend={trend}
      loading={loading}
      color="red"
      icon={
        <svg fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M18.364 18.364A9 9 0 005.636 5.636m12.728 12.728L5.636 5.636m12.728 12.728L5.636 5.636" />
        </svg>
      }
    />
  );
}

export function UserTypeBreakdownCard({
  sellers,
  buyers,
  investors,
  superAdmins,
  trend,
  loading
}: {
  sellers: number;
  buyers: number;
  investors: number;
  superAdmins: number;
  trend?: MetricCardProps['trend'];
  loading?: boolean;
}) {
  const total = sellers + buyers + investors + superAdmins;

  return (
    <div className="group bg-gradient-to-br from-gray-900/50 to-black/50 backdrop-blur-sm rounded-2xl border border-purple-400/20 p-6 hover:border-opacity-40 transition-all duration-300 hover:transform hover:scale-[1.02] hover:shadow-xl">
      {/* Header */}
      <div className="flex items-start justify-between mb-4">
        <div className="w-12 h-12 bg-purple-400/10 rounded-xl flex items-center justify-center group-hover:scale-110 transition-transform duration-300">
          <div className="w-6 h-6 text-purple-400">
            <svg fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0zm6 3a2 2 0 11-4 0 2 2 0 014 0zM7 10a2 2 0 11-4 0 2 2 0 014 0z" />
            </svg>
          </div>
        </div>

        {trend && (
          <div className={`flex items-center space-x-1 px-2 py-1 rounded-full text-xs font-medium ${
            trend.isPositive
              ? 'bg-green-400/10 text-green-400'
              : 'bg-red-400/10 text-red-400'
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
      <div className="space-y-3">
        <h3 className="text-sm font-medium text-gray-400 uppercase tracking-wider">
          User Breakdown
        </h3>

        <div className="flex items-baseline space-x-2 mb-4">
          <span className="text-3xl font-bold text-white group-hover:text-purple-400 transition-colors duration-300">
            {total.toLocaleString()}
          </span>
          <span className="text-sm text-gray-400">total users</span>
        </div>

        {/* User type breakdown */}
        <div className="space-y-2">
          <div className="flex items-center justify-between text-sm">
            <span className="text-blue-400">👥 Sellers</span>
            <span className="text-white font-medium">{sellers}</span>
          </div>
          <div className="flex items-center justify-between text-sm">
            <span className="text-green-400">🛒 Buyers</span>
            <span className="text-white font-medium">{buyers}</span>
          </div>
          <div className="flex items-center justify-between text-sm">
            <span className="text-purple-400">💰 Investors</span>
            <span className="text-white font-medium">{investors}</span>
          </div>
          <div className="flex items-center justify-between text-sm border-t border-gray-700 pt-2">
            <span className="text-yellow-400">👑 Super Admins</span>
            <span className="text-white font-medium">{superAdmins} (You)</span>
          </div>
        </div>

        {trend && (
          <p className={`text-xs ${trend.isPositive ? 'text-green-400' : 'text-red-400'}`}>
            {trend.label}
          </p>
        )}
      </div>

      {/* Animated background glow */}
      <div className="absolute inset-0 bg-purple-400/10 rounded-2xl opacity-0 group-hover:opacity-20 transition-opacity duration-300 -z-10"></div>
    </div>
  );
}