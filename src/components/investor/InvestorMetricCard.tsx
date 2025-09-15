import React from 'react';

interface BaseMetricProps {
  loading?: boolean;
  className?: string;
}

// Portfolio Value Card
interface PortfolioValueCardProps extends BaseMetricProps {
  totalValue: number;
  invested: number;
  unrealizedGains: number;
  realizedGains: number;
  trend: 'up' | 'down' | 'stable';
  trendPercentage: number;
}

export function PortfolioValueCard({
  totalValue,
  invested,
  unrealizedGains,
  realizedGains,
  trend,
  trendPercentage,
  loading = false,
  className = ''
}: PortfolioValueCardProps) {
  const totalROI = invested > 0 ? ((totalValue - invested) / invested) * 100 : 0;

  if (loading) {
    return (
      <div className={`metric-card ${className}`}>
        <div className="animate-pulse">
          <div className="h-4 bg-gray-700 rounded w-1/3 mb-2"></div>
          <div className="h-8 bg-gray-700 rounded w-2/3 mb-3"></div>
          <div className="space-y-2">
            <div className="h-3 bg-gray-700 rounded w-full"></div>
            <div className="h-3 bg-gray-700 rounded w-3/4"></div>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className={`metric-card border-blue-400/20 hover:border-blue-400/40 ${className}`}>
      <div className="flex items-center justify-between mb-4">
        <div className="w-12 h-12 bg-blue-400/10 rounded-xl flex items-center justify-center">
          <svg className="w-6 h-6 text-blue-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M21 13.255A23.931 23.931 0 0112 15c-3.183 0-6.22-.62-9-1.745M16 6V4a2 2 0 00-2-2h-4a2 2 0 00-2-2v2m8 0V6a2 2 0 012 2v6a2 2 0 01-2 2H6a2 2 0 01-2-2V8a2 2 0 012-2V6z"/>
          </svg>
        </div>
        <div className={`flex items-center space-x-1 px-2 py-1 rounded-full text-xs font-medium ${
          trend === 'up' ? 'bg-green-400/10 text-green-400' :
          trend === 'down' ? 'bg-red-400/10 text-red-400' :
          'bg-gray-400/10 text-gray-400'
        }`}>
          {trend === 'up' && <span>↗</span>}
          {trend === 'down' && <span>↘</span>}
          {trend === 'stable' && <span>→</span>}
          <span>{Math.abs(trendPercentage).toFixed(1)}%</span>
        </div>
      </div>

      <h3 className="text-sm font-medium text-gray-400 uppercase tracking-wider mb-1">Portfolio Value</h3>
      <div className="text-3xl font-bold text-white mb-2">${totalValue.toLocaleString()}</div>

      <div className="space-y-2">
        <div className="flex items-center justify-between text-sm">
          <span className="text-gray-400">Total Invested</span>
          <span className="text-white font-medium">${invested.toLocaleString()}</span>
        </div>
        <div className="flex items-center justify-between text-sm">
          <span className="text-gray-400">Unrealized Gains</span>
          <span className={`font-medium ${unrealizedGains >= 0 ? 'text-green-400' : 'text-red-400'}`}>
            ${Math.abs(unrealizedGains).toLocaleString()}
          </span>
        </div>
        <div className="flex items-center justify-between text-sm">
          <span className="text-gray-400">Realized Gains</span>
          <span className={`font-medium ${realizedGains >= 0 ? 'text-green-400' : 'text-red-400'}`}>
            ${Math.abs(realizedGains).toLocaleString()}
          </span>
        </div>
        <div className="pt-2 border-t border-gray-700">
          <div className="flex items-center justify-between text-sm">
            <span className="text-gray-400">Total ROI</span>
            <span className={`font-bold ${totalROI >= 0 ? 'text-green-400' : 'text-red-400'}`}>
              {totalROI >= 0 ? '+' : ''}{totalROI.toFixed(1)}%
            </span>
          </div>
        </div>
      </div>
    </div>
  );
}

// Active Investments Card
interface ActiveInvestmentsCardProps extends BaseMetricProps {
  totalInvestments: number;
  activeInvestments: number;
  successfulExits: number;
  averageHoldingPeriod: number; // in months
  onViewAll?: () => void;
}

export function ActiveInvestmentsCard({
  totalInvestments,
  activeInvestments,
  successfulExits,
  averageHoldingPeriod,
  onViewAll,
  loading = false,
  className = ''
}: ActiveInvestmentsCardProps) {
  const exitRate = totalInvestments > 0 ? (successfulExits / totalInvestments) * 100 : 0;

  if (loading) {
    return (
      <div className={`metric-card ${className}`}>
        <div className="animate-pulse">
          <div className="h-4 bg-gray-700 rounded w-1/3 mb-2"></div>
          <div className="h-8 bg-gray-700 rounded w-2/3 mb-3"></div>
          <div className="space-y-2">
            <div className="h-3 bg-gray-700 rounded w-full"></div>
            <div className="h-3 bg-gray-700 rounded w-3/4"></div>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className={`metric-card border-green-400/20 hover:border-green-400/40 ${className}`}>
      <div className="flex items-center justify-between mb-4">
        <div className="w-12 h-12 bg-green-400/10 rounded-xl flex items-center justify-center">
          <svg className="w-6 h-6 text-green-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z"/>
          </svg>
        </div>
        <div className="flex items-center space-x-1 px-2 py-1 rounded-full text-xs font-medium bg-green-400/10 text-green-400">
          <span>Active</span>
        </div>
      </div>

      <h3 className="text-sm font-medium text-gray-400 uppercase tracking-wider mb-1">Active Investments</h3>
      <div className="text-3xl font-bold text-white mb-2">{activeInvestments}</div>

      <div className="space-y-2">
        <div className="flex items-center justify-between text-sm">
          <span className="text-gray-400">Total Portfolio</span>
          <span className="text-white font-medium">{totalInvestments}</span>
        </div>
        <div className="flex items-center justify-between text-sm">
          <span className="text-gray-400">Successful Exits</span>
          <span className="text-green-400 font-medium">{successfulExits}</span>
        </div>
        <div className="flex items-center justify-between text-sm">
          <span className="text-gray-400">Exit Rate</span>
          <span className="text-white font-medium">{exitRate.toFixed(1)}%</span>
        </div>
        <div className="flex items-center justify-between text-sm">
          <span className="text-gray-400">Avg. Holding</span>
          <span className="text-white font-medium">{averageHoldingPeriod}mo</span>
        </div>
      </div>

      {onViewAll && (
        <button
          onClick={onViewAll}
          className="w-full mt-4 bg-green-400/10 border border-green-400/20 text-green-400 py-2 rounded-lg text-sm font-medium hover:bg-green-400/20 transition-colors"
        >
          View All Investments
        </button>
      )}
    </div>
  );
}

// Deal Flow Card
interface DealFlowCardProps extends BaseMetricProps {
  newDeals: number;
  dealsViewed: number;
  dealsInProgress: number;
  averageDealScore: number;
  onBrowseDeals?: () => void;
}

export function DealFlowCard({
  newDeals,
  dealsViewed,
  dealsInProgress,
  averageDealScore,
  onBrowseDeals,
  loading = false,
  className = ''
}: DealFlowCardProps) {
  if (loading) {
    return (
      <div className={`metric-card ${className}`}>
        <div className="animate-pulse">
          <div className="h-4 bg-gray-700 rounded w-1/3 mb-2"></div>
          <div className="h-8 bg-gray-700 rounded w-2/3 mb-3"></div>
          <div className="space-y-2">
            <div className="h-3 bg-gray-700 rounded w-full"></div>
            <div className="h-3 bg-gray-700 rounded w-3/4"></div>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className={`metric-card border-purple-400/20 hover:border-purple-400/40 ${className}`}>
      <div className="flex items-center justify-between mb-4">
        <div className="w-12 h-12 bg-purple-400/10 rounded-xl flex items-center justify-center">
          <svg className="w-6 h-6 text-purple-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M13 10V3L4 14h7v7l9-11h-7z"/>
          </svg>
        </div>
        <div className="flex items-center space-x-1 px-2 py-1 rounded-full text-xs font-medium bg-purple-400/10 text-purple-400">
          <span>Flow</span>
        </div>
      </div>

      <h3 className="text-sm font-medium text-gray-400 uppercase tracking-wider mb-1">Deal Flow</h3>
      <div className="text-3xl font-bold text-white mb-2">{newDeals}</div>
      <p className="text-sm text-gray-400 mb-3">New deals this week</p>

      <div className="space-y-2">
        <div className="flex items-center justify-between text-sm">
          <span className="text-gray-400">Deals Viewed</span>
          <span className="text-white font-medium">{dealsViewed}</span>
        </div>
        <div className="flex items-center justify-between text-sm">
          <span className="text-gray-400">In Progress</span>
          <span className="text-yellow-400 font-medium">{dealsInProgress}</span>
        </div>
        <div className="flex items-center justify-between text-sm">
          <span className="text-gray-400">Avg. Score</span>
          <span className="text-white font-medium">{averageDealScore}/10</span>
        </div>
      </div>

      {onBrowseDeals && (
        <button
          onClick={onBrowseDeals}
          className="w-full mt-4 bg-purple-400/10 border border-purple-400/20 text-purple-400 py-2 rounded-lg text-sm font-medium hover:bg-purple-400/20 transition-colors"
        >
          Browse New Deals
        </button>
      )}
    </div>
  );
}

// Performance Metrics Card
interface PerformanceMetricsCardProps extends BaseMetricProps {
  averageROI: number;
  bestPerformer: {
    name: string;
    roi: number;
  };
  worstPerformer: {
    name: string;
    roi: number;
  };
  riskScore: number; // 1-10 scale
  onViewAnalytics?: () => void;
}

export function PerformanceMetricsCard({
  averageROI,
  bestPerformer,
  worstPerformer,
  riskScore,
  onViewAnalytics,
  loading = false,
  className = ''
}: PerformanceMetricsCardProps) {
  const getRiskLevel = (score: number) => {
    if (score <= 3) return { label: 'Low', color: 'text-green-400' };
    if (score <= 6) return { label: 'Medium', color: 'text-yellow-400' };
    return { label: 'High', color: 'text-red-400' };
  };

  const risk = getRiskLevel(riskScore);

  if (loading) {
    return (
      <div className={`metric-card ${className}`}>
        <div className="animate-pulse">
          <div className="h-4 bg-gray-700 rounded w-1/3 mb-2"></div>
          <div className="h-8 bg-gray-700 rounded w-2/3 mb-3"></div>
          <div className="space-y-2">
            <div className="h-3 bg-gray-700 rounded w-full"></div>
            <div className="h-3 bg-gray-700 rounded w-3/4"></div>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className={`metric-card border-yellow-400/20 hover:border-yellow-400/40 ${className}`}>
      <div className="flex items-center justify-between mb-4">
        <div className="w-12 h-12 bg-yellow-400/10 rounded-xl flex items-center justify-center">
          <svg className="w-6 h-6 text-yellow-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z"/>
          </svg>
        </div>
        <div className={`flex items-center space-x-1 px-2 py-1 rounded-full text-xs font-medium bg-yellow-400/10 text-yellow-400`}>
          <span>Performance</span>
        </div>
      </div>

      <h3 className="text-sm font-medium text-gray-400 uppercase tracking-wider mb-1">Performance</h3>
      <div className="text-3xl font-bold text-white mb-2">
        {averageROI >= 0 ? '+' : ''}{averageROI.toFixed(1)}%
      </div>
      <p className="text-sm text-gray-400 mb-3">Average ROI</p>

      <div className="space-y-2">
        <div>
          <div className="flex items-center justify-between text-xs text-gray-400 mb-1">
            <span>Best Performer</span>
            <span className="text-green-400 font-medium">+{bestPerformer.roi.toFixed(1)}%</span>
          </div>
          <div className="text-sm text-white truncate">{bestPerformer.name}</div>
        </div>

        <div>
          <div className="flex items-center justify-between text-xs text-gray-400 mb-1">
            <span>Worst Performer</span>
            <span className="text-red-400 font-medium">{worstPerformer.roi.toFixed(1)}%</span>
          </div>
          <div className="text-sm text-white truncate">{worstPerformer.name}</div>
        </div>

        <div className="pt-2 border-t border-gray-700">
          <div className="flex items-center justify-between text-sm">
            <span className="text-gray-400">Risk Level</span>
            <span className={`font-medium ${risk.color}`}>{risk.label}</span>
          </div>
        </div>
      </div>

      {onViewAnalytics && (
        <button
          onClick={onViewAnalytics}
          className="w-full mt-4 bg-yellow-400/10 border border-yellow-400/20 text-yellow-400 py-2 rounded-lg text-sm font-medium hover:bg-yellow-400/20 transition-colors"
        >
          View Analytics
        </button>
      )}
    </div>
  );
}

// Syndicate Activity Card
interface SyndicateActivityCardProps extends BaseMetricProps {
  activeSyndicates: number;
  totalMembers: number;
  leaderboardPosition: number;
  currentInvestments: number;
  onManageSyndicates?: () => void;
}

export function SyndicateActivityCard({
  activeSyndicates,
  totalMembers,
  leaderboardPosition,
  currentInvestments,
  onManageSyndicates,
  loading = false,
  className = ''
}: SyndicateActivityCardProps) {
  if (loading) {
    return (
      <div className={`metric-card ${className}`}>
        <div className="animate-pulse">
          <div className="h-4 bg-gray-700 rounded w-1/3 mb-2"></div>
          <div className="h-8 bg-gray-700 rounded w-2/3 mb-3"></div>
          <div className="space-y-2">
            <div className="h-3 bg-gray-700 rounded w-full"></div>
            <div className="h-3 bg-gray-700 rounded w-3/4"></div>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className={`metric-card border-orange-400/20 hover:border-orange-400/40 ${className}`}>
      <div className="flex items-center justify-between mb-4">
        <div className="w-12 h-12 bg-orange-400/10 rounded-xl flex items-center justify-center">
          <svg className="w-6 h-6 text-orange-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 4.354a4 4 0 110 5.292M15 21H3v-1a6 6 0 0112 0v1zm0 0h6v-1a6 6 0 00-9-5.197m13.5-9a2.5 2.5 0 11-5 0 2.5 2.5 0 015 0z"/>
          </svg>
        </div>
        <div className="flex items-center space-x-1 px-2 py-1 rounded-full text-xs font-medium bg-orange-400/10 text-orange-400">
          <span>Syndicate</span>
        </div>
      </div>

      <h3 className="text-sm font-medium text-gray-400 uppercase tracking-wider mb-1">Syndicates</h3>
      <div className="text-3xl font-bold text-white mb-2">{activeSyndicates}</div>
      <p className="text-sm text-gray-400 mb-3">Active syndicates</p>

      <div className="space-y-2">
        <div className="flex items-center justify-between text-sm">
          <span className="text-gray-400">Total Members</span>
          <span className="text-white font-medium">{totalMembers}</span>
        </div>
        <div className="flex items-center justify-between text-sm">
          <span className="text-gray-400">Leaderboard</span>
          <span className="text-orange-400 font-medium">#{leaderboardPosition}</span>
        </div>
        <div className="flex items-center justify-between text-sm">
          <span className="text-gray-400">Current Deals</span>
          <span className="text-white font-medium">{currentInvestments}</span>
        </div>
      </div>

      {onManageSyndicates && (
        <button
          onClick={onManageSyndicates}
          className="w-full mt-4 bg-orange-400/10 border border-orange-400/20 text-orange-400 py-2 rounded-lg text-sm font-medium hover:bg-orange-400/20 transition-colors"
        >
          Manage Syndicates
        </button>
      )}
    </div>
  );
}

// Tax & Compliance Card
interface TaxComplianceCardProps extends BaseMetricProps {
  documentsGenerated: number;
  taxLiability: number;
  complianceStatus: 'up-to-date' | 'needs-attention' | 'overdue';
  nextDeadline: string;
  onTaxCenter?: () => void;
}

export function TaxComplianceCard({
  documentsGenerated,
  taxLiability,
  complianceStatus,
  nextDeadline,
  onTaxCenter,
  loading = false,
  className = ''
}: TaxComplianceCardProps) {
  const getStatusColor = (status: string) => {
    switch (status) {
      case 'up-to-date': return 'text-green-400 bg-green-400/10';
      case 'needs-attention': return 'text-yellow-400 bg-yellow-400/10';
      case 'overdue': return 'text-red-400 bg-red-400/10';
      default: return 'text-gray-400 bg-gray-400/10';
    }
  };

  if (loading) {
    return (
      <div className={`metric-card ${className}`}>
        <div className="animate-pulse">
          <div className="h-4 bg-gray-700 rounded w-1/3 mb-2"></div>
          <div className="h-8 bg-gray-700 rounded w-2/3 mb-3"></div>
          <div className="space-y-2">
            <div className="h-3 bg-gray-700 rounded w-full"></div>
            <div className="h-3 bg-gray-700 rounded w-3/4"></div>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className={`metric-card border-gray-400/20 hover:border-gray-400/40 ${className}`}>
      <div className="flex items-center justify-between mb-4">
        <div className="w-12 h-12 bg-gray-400/10 rounded-xl flex items-center justify-center">
          <svg className="w-6 h-6 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z"/>
          </svg>
        </div>
        <div className={`flex items-center space-x-1 px-2 py-1 rounded-full text-xs font-medium ${getStatusColor(complianceStatus)}`}>
          <span className="capitalize">{complianceStatus.replace('-', ' ')}</span>
        </div>
      </div>

      <h3 className="text-sm font-medium text-gray-400 uppercase tracking-wider mb-1">Tax & Compliance</h3>
      <div className="text-3xl font-bold text-white mb-2">{documentsGenerated}</div>
      <p className="text-sm text-gray-400 mb-3">Documents ready</p>

      <div className="space-y-2">
        <div className="flex items-center justify-between text-sm">
          <span className="text-gray-400">Est. Tax Liability</span>
          <span className="text-white font-medium">${taxLiability.toLocaleString()}</span>
        </div>
        <div className="flex items-center justify-between text-sm">
          <span className="text-gray-400">Next Deadline</span>
          <span className="text-yellow-400 font-medium">{nextDeadline}</span>
        </div>
      </div>

      {onTaxCenter && (
        <button
          onClick={onTaxCenter}
          className="w-full mt-4 bg-gray-400/10 border border-gray-400/20 text-gray-400 py-2 rounded-lg text-sm font-medium hover:bg-gray-400/20 transition-colors"
        >
          Open Tax Center
        </button>
      )}
    </div>
  );
}