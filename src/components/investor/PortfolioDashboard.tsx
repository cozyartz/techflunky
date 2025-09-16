// Advanced Investor Portfolio Management and Analytics Dashboard
import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';

interface PortfolioInvestment {
  id: string;
  platformName: string;
  industry: string;
  investmentAmount: number;
  currentValuation: number;
  investmentDate: string;
  status: 'active' | 'exited' | 'pending' | 'underperforming';
  roi: number;
  monthlyRevenue: number;
  growthRate: number;
  riskLevel: 'low' | 'medium' | 'high';
  nextMilestone: string;
  exitStrategy: string;
  lastUpdate: string;
}

interface PortfolioMetrics {
  totalInvested: number;
  currentValue: number;
  totalROI: number;
  activeInvestments: number;
  avgGrowthRate: number;
  topPerformer: string;
  worstPerformer: string;
  sectorAllocation: { [key: string]: number };
  riskDistribution: { [key: string]: number };
}

interface MarketInsight {
  id: string;
  title: string;
  type: 'opportunity' | 'warning' | 'trend' | 'recommendation';
  description: string;
  impact: 'high' | 'medium' | 'low';
  actionRequired: boolean;
  relatedInvestments: string[];
}

export default function PortfolioDashboard() {
  const [investments, setInvestments] = useState<PortfolioInvestment[]>([]);
  const [metrics, setMetrics] = useState<PortfolioMetrics | null>(null);
  const [insights, setInsights] = useState<MarketInsight[]>([]);
  const [timeframe, setTimeframe] = useState<'1M' | '3M' | '6M' | '1Y' | 'ALL'>('6M');
  const [viewMode, setViewMode] = useState<'overview' | 'investments' | 'analytics' | 'insights'>('overview');
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    loadPortfolioData();
  }, [timeframe]);

  const loadPortfolioData = async () => {
    setIsLoading(true);
    try {
      // Simulate API calls
      await new Promise(resolve => setTimeout(resolve, 1000));

      // Mock data
      setInvestments([
        {
          id: 'inv_1',
          platformName: 'FinTech Express',
          industry: 'FinTech',
          investmentAmount: 75000,
          currentValuation: 105000,
          investmentDate: '2024-01-15',
          status: 'active',
          roi: 40,
          monthlyRevenue: 8500,
          growthRate: 15,
          riskLevel: 'medium',
          nextMilestone: 'Series A Round',
          exitStrategy: '3-5 year acquisition',
          lastUpdate: '2024-08-15'
        },
        {
          id: 'inv_2',
          platformName: 'HealthTracker Pro',
          industry: 'HealthTech',
          investmentAmount: 50000,
          currentValuation: 85000,
          investmentDate: '2023-11-20',
          status: 'active',
          roi: 70,
          monthlyRevenue: 12000,
          growthRate: 25,
          riskLevel: 'low',
          nextMilestone: 'HIPAA Certification',
          exitStrategy: 'IPO Track',
          lastUpdate: '2024-08-10'
        },
        {
          id: 'inv_3',
          platformName: 'EduLearn Platform',
          industry: 'EdTech',
          investmentAmount: 30000,
          currentValuation: 28000,
          investmentDate: '2024-03-01',
          status: 'underperforming',
          roi: -6.7,
          monthlyRevenue: 2800,
          growthRate: -5,
          riskLevel: 'high',
          nextMilestone: 'Pivot Strategy',
          exitStrategy: 'Strategic Sale',
          lastUpdate: '2024-08-12'
        }
      ]);

      setMetrics({
        totalInvested: 155000,
        currentValue: 218000,
        totalROI: 40.6,
        activeInvestments: 3,
        avgGrowthRate: 11.7,
        topPerformer: 'HealthTracker Pro',
        worstPerformer: 'EduLearn Platform',
        sectorAllocation: {
          'FinTech': 35,
          'HealthTech': 40,
          'EdTech': 25
        },
        riskDistribution: {
          'low': 40,
          'medium': 35,
          'high': 25
        }
      });

      setInsights([
        {
          id: 'insight_1',
          title: 'HealthTech Sector Surge',
          type: 'opportunity',
          description: 'Healthcare technology investments are showing 35% higher returns than market average',
          impact: 'high',
          actionRequired: true,
          relatedInvestments: ['inv_2']
        },
        {
          id: 'insight_2',
          title: 'EdTech Market Volatility',
          type: 'warning',
          description: 'Educational technology sector facing headwinds due to funding slowdown',
          impact: 'medium',
          actionRequired: false,
          relatedInvestments: ['inv_3']
        }
      ]);

    } catch (error) {
      console.error('Failed to load portfolio data:', error);
    }
    setIsLoading(false);
  };

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'USD',
      minimumFractionDigits: 0
    }).format(amount);
  };

  const formatPercentage = (value: number) => {
    return `${value >= 0 ? '+' : ''}${value.toFixed(1)}%`;
  };

  const getStatusColor = (status: string) => {
    const colors = {
      active: 'text-green-600 bg-green-100',
      exited: 'text-blue-600 bg-blue-100',
      pending: 'text-yellow-600 bg-yellow-100',
      underperforming: 'text-red-600 bg-red-100'
    };
    return colors[status as keyof typeof colors] || 'text-gray-600 bg-gray-100';
  };

  const getRiskColor = (risk: string) => {
    const colors = {
      low: 'text-green-600',
      medium: 'text-yellow-600',
      high: 'text-red-600'
    };
    return colors[risk as keyof typeof colors] || 'text-gray-600';
  };

  const getInsightIcon = (type: string) => {
    const icons = {
      opportunity: '🚀',
      warning: '⚠️',
      trend: '📈',
      recommendation: '💡'
    };
    return icons[type as keyof typeof icons] || '📊';
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center py-12">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div>
        <span className="ml-3 text-lg text-gray-600">Loading portfolio...</span>
      </div>
    );
  }

  return (
    <div className="max-w-7xl mx-auto p-6 space-y-8">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold text-gray-900">Investment Portfolio</h1>
          <p className="text-gray-600 mt-1">Track performance and manage your TechFlunky investments</p>
        </div>

        <div className="flex items-center space-x-4">
          {/* Timeframe Selector */}
          <div className="flex space-x-1 bg-gray-100 p-1 rounded-lg">
            {(['1M', '3M', '6M', '1Y', 'ALL'] as const).map(period => (
              <button
                key={period}
                onClick={() => setTimeframe(period)}
                className={`px-3 py-2 rounded-md text-sm font-medium transition-all ${
                  timeframe === period
                    ? 'bg-white text-blue-600 shadow-sm'
                    : 'text-gray-600 hover:text-blue-600'
                }`}
              >
                {period}
              </button>
            ))}
          </div>
        </div>
      </div>

      {/* Navigation Tabs */}
      <div className="flex space-x-1 bg-gray-100 p-1 rounded-lg">
        {[
          { id: 'overview', name: 'Overview', icon: '📊' },
          { id: 'investments', name: 'Investments', icon: '💼' },
          { id: 'analytics', name: 'Analytics', icon: '📈' },
          { id: 'insights', name: 'AI Insights', icon: '🤖' }
        ].map(tab => (
          <button
            key={tab.id}
            onClick={() => setViewMode(tab.id as any)}
            className={`flex-1 flex items-center justify-center space-x-2 py-3 px-4 rounded-md font-medium transition-all ${
              viewMode === tab.id
                ? 'bg-white text-blue-600 shadow-sm'
                : 'text-gray-600 hover:text-blue-600'
            }`}
          >
            <span>{tab.icon}</span>
            <span>{tab.name}</span>
          </button>
        ))}
      </div>

      {/* Overview */}
      {viewMode === 'overview' && metrics && (
        <div className="space-y-8">
          {/* Key Metrics */}
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-6">
            <div className="bg-gradient-to-br from-blue-50 to-blue-100 rounded-xl p-6">
              <div className="flex items-center justify-between">
                <div>
                  <div className="text-2xl font-bold text-blue-900">{formatCurrency(metrics.totalInvested)}</div>
                  <div className="text-blue-700 text-sm">Total Invested</div>
                </div>
                <div className="w-12 h-12 bg-blue-600 rounded-lg flex items-center justify-center">
                  <span className="text-white text-xl">💰</span>
                </div>
              </div>
            </div>

            <div className="bg-gradient-to-br from-green-50 to-green-100 rounded-xl p-6">
              <div className="flex items-center justify-between">
                <div>
                  <div className="text-2xl font-bold text-green-900">{formatCurrency(metrics.currentValue)}</div>
                  <div className="text-green-700 text-sm">Current Value</div>
                </div>
                <div className="w-12 h-12 bg-green-600 rounded-lg flex items-center justify-center">
                  <span className="text-white text-xl">📈</span>
                </div>
              </div>
            </div>

            <div className="bg-gradient-to-br from-purple-50 to-purple-100 rounded-xl p-6">
              <div className="flex items-center justify-between">
                <div>
                  <div className="text-2xl font-bold text-purple-900">{formatPercentage(metrics.totalROI)}</div>
                  <div className="text-purple-700 text-sm">Total ROI</div>
                </div>
                <div className="w-12 h-12 bg-purple-600 rounded-lg flex items-center justify-center">
                  <span className="text-white text-xl">🎯</span>
                </div>
              </div>
            </div>

            <div className="bg-gradient-to-br from-orange-50 to-orange-100 rounded-xl p-6">
              <div className="flex items-center justify-between">
                <div>
                  <div className="text-2xl font-bold text-orange-900">{metrics.activeInvestments}</div>
                  <div className="text-orange-700 text-sm">Active Deals</div>
                </div>
                <div className="w-12 h-12 bg-orange-600 rounded-lg flex items-center justify-center">
                  <span className="text-white text-xl">🚀</span>
                </div>
              </div>
            </div>
          </div>

          {/* Performance Charts */}
          <div className="grid lg:grid-cols-2 gap-8">
            {/* Sector Allocation */}
            <div className="bg-white rounded-xl border border-gray-200 p-6">
              <h3 className="text-lg font-semibold text-gray-900 mb-6">Sector Allocation</h3>
              <div className="space-y-4">
                {Object.entries(metrics.sectorAllocation).map(([sector, percentage]) => (
                  <div key={sector} className="flex items-center justify-between">
                    <span className="text-gray-700">{sector}</span>
                    <div className="flex items-center space-x-3">
                      <div className="w-32 bg-gray-200 rounded-full h-2">
                        <div
                          className="bg-blue-600 h-2 rounded-full"
                          style={{ width: `${percentage}%` }}
                        />
                      </div>
                      <span className="text-sm font-medium text-gray-900 w-12">{percentage}%</span>
                    </div>
                  </div>
                ))}
              </div>
            </div>

            {/* Risk Distribution */}
            <div className="bg-white rounded-xl border border-gray-200 p-6">
              <h3 className="text-lg font-semibold text-gray-900 mb-6">Risk Distribution</h3>
              <div className="space-y-4">
                {Object.entries(metrics.riskDistribution).map(([risk, percentage]) => (
                  <div key={risk} className="flex items-center justify-between">
                    <span className={`text-gray-700 capitalize ${getRiskColor(risk)}`}>{risk} Risk</span>
                    <div className="flex items-center space-x-3">
                      <div className="w-32 bg-gray-200 rounded-full h-2">
                        <div
                          className={`h-2 rounded-full ${
                            risk === 'low' ? 'bg-green-500' :
                            risk === 'medium' ? 'bg-yellow-500' : 'bg-red-500'
                          }`}
                          style={{ width: `${percentage}%` }}
                        />
                      </div>
                      <span className="text-sm font-medium text-gray-900 w-12">{percentage}%</span>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>

          {/* Top Investments */}
          <div className="bg-white rounded-xl border border-gray-200 p-6">
            <h3 className="text-lg font-semibold text-gray-900 mb-6">Recent Performance</h3>
            <div className="space-y-4">
              {investments.slice(0, 3).map(investment => (
                <div key={investment.id} className="flex items-center justify-between p-4 bg-gray-50 rounded-lg">
                  <div className="flex items-center space-x-4">
                    <div className="w-12 h-12 bg-gradient-to-br from-blue-500 to-purple-600 rounded-lg flex items-center justify-center">
                      <span className="text-white font-bold text-lg">
                        {investment.platformName.charAt(0)}
                      </span>
                    </div>
                    <div>
                      <div className="font-semibold text-gray-900">{investment.platformName}</div>
                      <div className="text-sm text-gray-600">{investment.industry}</div>
                    </div>
                  </div>

                  <div className="text-right">
                    <div className={`text-lg font-bold ${investment.roi >= 0 ? 'text-green-600' : 'text-red-600'}`}>
                      {formatPercentage(investment.roi)}
                    </div>
                    <div className="text-sm text-gray-600">{formatCurrency(investment.currentValuation)}</div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}

      {/* Detailed Investments */}
      {viewMode === 'investments' && (
        <div className="space-y-6">
          {investments.map(investment => (
            <motion.div
              key={investment.id}
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              className="bg-white rounded-xl border border-gray-200 p-6"
            >
              <div className="flex items-start justify-between mb-6">
                <div className="flex items-start space-x-4">
                  <div className="w-16 h-16 bg-gradient-to-br from-blue-500 to-purple-600 rounded-xl flex items-center justify-center">
                    <span className="text-white font-bold text-xl">
                      {investment.platformName.charAt(0)}
                    </span>
                  </div>
                  <div>
                    <h3 className="text-xl font-semibold text-gray-900 mb-1">{investment.platformName}</h3>
                    <div className="flex items-center space-x-3 text-sm text-gray-600">
                      <span>{investment.industry}</span>
                      <span>•</span>
                      <span>Invested {new Date(investment.investmentDate).toLocaleDateString()}</span>
                    </div>
                    <div className="flex items-center space-x-2 mt-2">
                      <span className={`px-2 py-1 text-xs font-medium rounded-full ${getStatusColor(investment.status)}`}>
                        {investment.status}
                      </span>
                      <span className={`text-sm font-medium ${getRiskColor(investment.riskLevel)}`}>
                        {investment.riskLevel} risk
                      </span>
                    </div>
                  </div>
                </div>

                <div className="text-right">
                  <div className={`text-2xl font-bold ${investment.roi >= 0 ? 'text-green-600' : 'text-red-600'}`}>
                    {formatPercentage(investment.roi)}
                  </div>
                  <div className="text-sm text-gray-600">ROI</div>
                </div>
              </div>

              <div className="grid grid-cols-2 lg:grid-cols-4 gap-6 mb-6">
                <div>
                  <div className="text-lg font-semibold text-gray-900">{formatCurrency(investment.investmentAmount)}</div>
                  <div className="text-sm text-gray-600">Invested</div>
                </div>
                <div>
                  <div className="text-lg font-semibold text-gray-900">{formatCurrency(investment.currentValuation)}</div>
                  <div className="text-sm text-gray-600">Current Value</div>
                </div>
                <div>
                  <div className="text-lg font-semibold text-gray-900">{formatCurrency(investment.monthlyRevenue)}</div>
                  <div className="text-sm text-gray-600">Monthly Revenue</div>
                </div>
                <div>
                  <div className={`text-lg font-semibold ${investment.growthRate >= 0 ? 'text-green-600' : 'text-red-600'}`}>
                    {formatPercentage(investment.growthRate)}
                  </div>
                  <div className="text-sm text-gray-600">Growth Rate</div>
                </div>
              </div>

              <div className="grid md:grid-cols-2 gap-6 pt-6 border-t border-gray-200">
                <div>
                  <h4 className="font-medium text-gray-900 mb-2">Next Milestone</h4>
                  <p className="text-sm text-gray-600">{investment.nextMilestone}</p>
                </div>
                <div>
                  <h4 className="font-medium text-gray-900 mb-2">Exit Strategy</h4>
                  <p className="text-sm text-gray-600">{investment.exitStrategy}</p>
                </div>
              </div>

              <div className="flex space-x-3 mt-6 pt-6 border-t border-gray-200">
                <button className="flex-1 bg-blue-600 text-white py-2 px-4 rounded-lg font-medium hover:bg-blue-700 transition-colors">
                  View Details
                </button>
                <button className="px-6 py-2 border border-gray-300 text-gray-700 rounded-lg font-medium hover:bg-gray-50 transition-colors">
                  Request Update
                </button>
                <button className="px-6 py-2 border border-red-300 text-red-700 rounded-lg font-medium hover:bg-red-50 transition-colors">
                  Exit Position
                </button>
              </div>
            </motion.div>
          ))}
        </div>
      )}

      {/* AI Insights */}
      {viewMode === 'insights' && (
        <div className="space-y-6">
          <div className="bg-gradient-to-r from-purple-50 to-blue-50 rounded-xl p-6">
            <h3 className="text-xl font-semibold text-gray-900 mb-2">🤖 AI-Powered Market Insights</h3>
            <p className="text-gray-600">
              Our AI analyzes market trends, portfolio performance, and industry data to provide personalized recommendations.
            </p>
          </div>

          {insights.map(insight => (
            <motion.div
              key={insight.id}
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              className="bg-white rounded-xl border border-gray-200 p-6"
            >
              <div className="flex items-start space-x-4">
                <div className="text-3xl">{getInsightIcon(insight.type)}</div>
                <div className="flex-1">
                  <div className="flex items-center justify-between mb-2">
                    <h4 className="text-lg font-semibold text-gray-900">{insight.title}</h4>
                    <div className="flex items-center space-x-2">
                      <span className={`px-2 py-1 text-xs font-medium rounded-full ${
                        insight.impact === 'high' ? 'bg-red-100 text-red-800' :
                        insight.impact === 'medium' ? 'bg-yellow-100 text-yellow-800' :
                        'bg-green-100 text-green-800'
                      }`}>
                        {insight.impact} impact
                      </span>
                      {insight.actionRequired && (
                        <span className="px-2 py-1 text-xs font-medium rounded-full bg-blue-100 text-blue-800">
                          Action Required
                        </span>
                      )}
                    </div>
                  </div>
                  <p className="text-gray-600 mb-4">{insight.description}</p>
                  {insight.relatedInvestments.length > 0 && (
                    <div className="flex items-center space-x-2">
                      <span className="text-sm text-gray-500">Related investments:</span>
                      {insight.relatedInvestments.map(investmentId => {
                        const investment = investments.find(inv => inv.id === investmentId);
                        return investment ? (
                          <span key={investmentId} className="px-2 py-1 bg-gray-100 text-gray-700 text-xs rounded-full">
                            {investment.platformName}
                          </span>
                        ) : null;
                      })}
                    </div>
                  )}
                </div>
              </div>
            </motion.div>
          ))}
        </div>
      )}

      {/* Analytics placeholder */}
      {viewMode === 'analytics' && (
        <div className="bg-white rounded-xl border border-gray-200 p-12 text-center">
          <div className="text-6xl mb-4">📊</div>
          <h3 className="text-xl font-semibold text-gray-900 mb-2">Advanced Analytics Coming Soon</h3>
          <p className="text-gray-600">
            Detailed performance analytics, market comparisons, and predictive insights will be available here.
          </p>
        </div>
      )}
    </div>
  );
}