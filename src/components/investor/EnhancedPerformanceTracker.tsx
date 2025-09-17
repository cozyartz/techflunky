// Enhanced Performance Tracker - Advanced Analytics for TechFlunky Investor Portal
// Competitive advantage over Visible.vc with AI-powered platform-specific insights
import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';

interface PlatformPerformance {
  id: string;
  platformName: string;
  category: string;
  investmentAmount: number;
  currentValuation: number;
  monthlyRecurringRevenue: number;
  customerCount: number;
  churnRate: number;
  deploymentHealth: number;
  aiValidationScore: number;
  technicalDebt: number;
  competitivePosition: string;
  marketShare: number;
  growthTrajectory: 'accelerating' | 'steady' | 'declining';
  riskFactors: string[];
  upcomingMilestones: Milestone[];
  lastUpdate: string;
}

interface Milestone {
  id: string;
  title: string;
  description: string;
  targetDate: string;
  status: 'pending' | 'in_progress' | 'completed' | 'delayed';
  impact: 'high' | 'medium' | 'low';
  progressPercent: number;
}

interface AIInsight {
  id: string;
  type: 'opportunity' | 'warning' | 'optimization' | 'market_trend';
  title: string;
  description: string;
  confidence: number;
  actionRequired: boolean;
  estimatedImpact: string;
  timeframe: string;
  platformIds: string[];
}

interface PerformanceMetrics {
  totalPortfolioValue: number;
  monthlyGrowthRate: number;
  averageAIScore: number;
  platformsOutperforming: number;
  criticalRisks: number;
  upcomingMilestones: number;
  averageDeploymentHealth: number;
  totalMRR: number;
}

export default function EnhancedPerformanceTracker() {
  const [platforms, setPlatforms] = useState<PlatformPerformance[]>([]);
  const [insights, setInsights] = useState<AIInsight[]>([]);
  const [metrics, setMetrics] = useState<PerformanceMetrics | null>(null);
  const [selectedPlatform, setSelectedPlatform] = useState<string | null>(null);
  const [timeframe, setTimeframe] = useState<'7d' | '30d' | '90d' | '1y'>('30d');
  const [loading, setLoading] = useState(true);
  const [autoReportsEnabled, setAutoReportsEnabled] = useState(true);

  useEffect(() => {
    fetchPerformanceData();
    const interval = setInterval(fetchPerformanceData, 300000); // 5-minute updates
    return () => clearInterval(interval);
  }, [timeframe]);

  const fetchPerformanceData = async () => {
    try {
      setLoading(true);
      const [platformsRes, insightsRes, metricsRes] = await Promise.all([
        fetch(`/api/investors/performance/platforms?timeframe=${timeframe}`),
        fetch('/api/investors/performance/ai-insights'),
        fetch(`/api/investors/performance/metrics?timeframe=${timeframe}`)
      ]);

      const platformsData = await platformsRes.json();
      const insightsData = await insightsRes.json();
      const metricsData = await metricsRes.json();

      setPlatforms(platformsData.platforms || []);
      setInsights(insightsData.insights || []);
      setMetrics(metricsData.metrics);
    } catch (error) {
      console.error('Failed to fetch performance data:', error);
    } finally {
      setLoading(false);
    }
  };

  const generateAutomatedReport = async (platformId: string) => {
    try {
      const response = await fetch('/api/investors/reports/automated', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ platformId, includeAIInsights: true })
      });

      if (response.ok) {
        const result = await response.json();
        console.log('Automated report generated:', result);
        // Show success notification
      }
    } catch (error) {
      console.error('Failed to generate automated report:', error);
    }
  };

  const getHealthColor = (score: number) => {
    if (score >= 80) return 'text-green-400';
    if (score >= 60) return 'text-yellow-400';
    return 'text-red-400';
  };

  const getGrowthIcon = (trajectory: string) => {
    switch (trajectory) {
      case 'accelerating':
        return (
          <svg className="w-5 h-5 text-green-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 7h8m0 0v8m0-8l-8 8-4-4-6 6" />
          </svg>
        );
      case 'steady':
        return (
          <svg className="w-5 h-5 text-yellow-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" />
          </svg>
        );
      case 'declining':
        return (
          <svg className="w-5 h-5 text-red-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 17h8m0 0V9m0 8l-8-8-4 4-6-6" />
          </svg>
        );
      default:
        return null;
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-96">
        <div className="animate-spin rounded-full h-32 w-32 border-b-2 border-brand-yellow-400"></div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Enhanced Metrics Overview */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        <motion.div
          className="bg-gradient-to-br from-gray-900/50 to-black/50 backdrop-blur-sm rounded-2xl border border-green-400/20 p-6"
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.1 }}
        >
          <div className="flex items-center justify-between mb-4">
            <div className="w-12 h-12 bg-green-400/20 rounded-xl flex items-center justify-center">
              <svg className="w-6 h-6 text-green-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8c-1.657 0-3 .895-3 2s1.343 2 3 2 3 .895 3 2-1.343 2-3 2m0-8c1.11 0 2.08.402 2.599 1M12 8V7m0 1v8m0 0v1m0-1c-1.11 0-2.08-.402-2.599-1" />
              </svg>
            </div>
            <span className="text-xs text-green-400 font-medium">+12.4%</span>
          </div>
          <div className="text-2xl font-bold text-white mb-1">
            ${metrics?.totalPortfolioValue.toLocaleString() || '0'}
          </div>
          <div className="text-sm text-gray-400">Total Portfolio Value</div>
        </motion.div>

        <motion.div
          className="bg-gradient-to-br from-gray-900/50 to-black/50 backdrop-blur-sm rounded-2xl border border-yellow-400/20 p-6"
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.2 }}
        >
          <div className="flex items-center justify-between mb-4">
            <div className="w-12 h-12 bg-yellow-400/20 rounded-xl flex items-center justify-center">
              <svg className="w-6 h-6 text-yellow-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9.663 17h4.673M12 3v1m6.364 1.636l-.707.707M21 12h-1M4 12H3m3.343-5.657l-.707-.707m2.828 9.9a5 5 0 117.072 0l-.548.547A3.374 3.374 0 0014 18.469V19a2 2 0 11-4 0v-.531c0-.895-.356-1.754-.988-2.386l-.548-.547z" />
              </svg>
            </div>
            <span className="text-xs text-yellow-400 font-medium">AI Score</span>
          </div>
          <div className="text-2xl font-bold text-white mb-1">
            {metrics?.averageAIScore.toFixed(1) || '0.0'}/10
          </div>
          <div className="text-sm text-gray-400">Average AI Validation</div>
        </motion.div>

        <motion.div
          className="bg-gradient-to-br from-gray-900/50 to-black/50 backdrop-blur-sm rounded-2xl border border-blue-400/20 p-6"
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.3 }}
        >
          <div className="flex items-center justify-between mb-4">
            <div className="w-12 h-12 bg-blue-400/20 rounded-xl flex items-center justify-center">
              <svg className="w-6 h-6 text-blue-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 10V3L4 14h7v7l9-11h-7z" />
              </svg>
            </div>
            <span className="text-xs text-blue-400 font-medium">{metrics?.averageDeploymentHealth.toFixed(0) || '0'}%</span>
          </div>
          <div className="text-2xl font-bold text-white mb-1">
            ${metrics?.totalMRR.toLocaleString() || '0'}
          </div>
          <div className="text-sm text-gray-400">Total Monthly Revenue</div>
        </motion.div>

        <motion.div
          className="bg-gradient-to-br from-gray-900/50 to-black/50 backdrop-blur-sm rounded-2xl border border-purple-400/20 p-6"
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.4 }}
        >
          <div className="flex items-center justify-between mb-4">
            <div className="w-12 h-12 bg-purple-400/20 rounded-xl flex items-center justify-center">
              <svg className="w-6 h-6 text-purple-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" />
              </svg>
            </div>
            <span className="text-xs text-purple-400 font-medium">Active</span>
          </div>
          <div className="text-2xl font-bold text-white mb-1">
            {metrics?.upcomingMilestones || 0}
          </div>
          <div className="text-sm text-gray-400">Upcoming Milestones</div>
        </motion.div>
      </div>

      {/* AI Insights Panel */}
      <motion.div
        className="bg-gradient-to-br from-gray-900/50 to-black/50 backdrop-blur-sm rounded-2xl border border-yellow-400/20 p-6"
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.5 }}
      >
        <div className="flex items-center justify-between mb-6">
          <div className="flex items-center space-x-3">
            <div className="w-10 h-10 bg-yellow-400/20 rounded-xl flex items-center justify-center">
              <svg className="w-5 h-5 text-yellow-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9.663 17h4.673M12 3v1m6.364 1.636l-.707.707M21 12h-1M4 12H3m3.343-5.657l-.707-.707m2.828 9.9a5 5 0 117.072 0l-.548.547A3.374 3.374 0 0014 18.469V19a2 2 0 11-4 0v-.531c0-.895-.356-1.754-.988-2.386l-.548-.547z" />
              </svg>
            </div>
            <div>
              <h3 className="text-lg font-semibold text-white">AI-Powered Insights</h3>
              <p className="text-sm text-gray-400">Smart recommendations based on platform analysis</p>
            </div>
          </div>
          <button
            onClick={() => setAutoReportsEnabled(!autoReportsEnabled)}
            className={`px-4 py-2 rounded-lg text-sm font-medium transition-colors ${
              autoReportsEnabled
                ? 'bg-green-400/10 text-green-400 border border-green-400/20'
                : 'bg-gray-400/10 text-gray-400 border border-gray-400/20'
            }`}
          >
            Auto Reports: {autoReportsEnabled ? 'On' : 'Off'}
          </button>
        </div>

        <div className="space-y-4">
          {insights.slice(0, 3).map((insight) => (
            <div
              key={insight.id}
              className={`p-4 rounded-xl border transition-all hover:border-opacity-60 ${
                insight.type === 'opportunity' ? 'bg-green-400/5 border-green-400/20' :
                insight.type === 'warning' ? 'bg-red-400/5 border-red-400/20' :
                insight.type === 'optimization' ? 'bg-blue-400/5 border-blue-400/20' :
                'bg-purple-400/5 border-purple-400/20'
              }`}
            >
              <div className="flex items-start justify-between mb-2">
                <div className="flex items-center space-x-3">
                  <div className={`w-2 h-2 rounded-full ${
                    insight.type === 'opportunity' ? 'bg-green-400' :
                    insight.type === 'warning' ? 'bg-red-400' :
                    insight.type === 'optimization' ? 'bg-blue-400' :
                    'bg-purple-400'
                  }`}></div>
                  <h4 className="text-white font-medium">{insight.title}</h4>
                </div>
                <div className="flex items-center space-x-2">
                  <span className="text-xs text-gray-400">
                    {insight.confidence}% confidence
                  </span>
                  {insight.actionRequired && (
                    <span className="px-2 py-1 bg-yellow-400/10 text-yellow-400 rounded-full text-xs font-medium">
                      Action Required
                    </span>
                  )}
                </div>
              </div>
              <p className="text-gray-300 text-sm mb-3">{insight.description}</p>
              <div className="flex items-center justify-between text-xs text-gray-400">
                <span>Impact: {insight.estimatedImpact}</span>
                <span>Timeframe: {insight.timeframe}</span>
              </div>
            </div>
          ))}
        </div>
      </motion.div>

      {/* Platform Performance Cards */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {platforms.map((platform) => (
          <motion.div
            key={platform.id}
            className="bg-gradient-to-br from-gray-900/50 to-black/50 backdrop-blur-sm rounded-2xl border border-gray-400/20 hover:border-yellow-400/40 p-6 transition-all duration-300"
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            whileHover={{ y: -4 }}
          >
            <div className="flex items-start justify-between mb-4">
              <div className="flex items-center space-x-3">
                <div className="w-12 h-12 bg-gradient-to-br from-blue-400 to-purple-600 rounded-xl flex items-center justify-center">
                  <span className="text-white font-bold text-sm">
                    {platform.platformName.slice(0, 2).toUpperCase()}
                  </span>
                </div>
                <div>
                  <h3 className="text-white font-semibold">{platform.platformName}</h3>
                  <p className="text-sm text-gray-400">{platform.category}</p>
                </div>
              </div>
              <div className="flex items-center space-x-2">
                {getGrowthIcon(platform.growthTrajectory)}
                <span className={`text-sm font-medium ${getHealthColor(platform.deploymentHealth)}`}>
                  {platform.deploymentHealth}%
                </span>
              </div>
            </div>

            <div className="grid grid-cols-2 gap-4 mb-4">
              <div>
                <div className="text-sm text-gray-400">Monthly Revenue</div>
                <div className="text-lg font-semibold text-green-400">
                  ${platform.monthlyRecurringRevenue.toLocaleString()}
                </div>
              </div>
              <div>
                <div className="text-sm text-gray-400">AI Score</div>
                <div className="text-lg font-semibold text-yellow-400">
                  {platform.aiValidationScore.toFixed(1)}/10
                </div>
              </div>
              <div>
                <div className="text-sm text-gray-400">Customers</div>
                <div className="text-lg font-semibold text-white">
                  {platform.customerCount.toLocaleString()}
                </div>
              </div>
              <div>
                <div className="text-sm text-gray-400">Churn Rate</div>
                <div className={`text-lg font-semibold ${platform.churnRate < 5 ? 'text-green-400' : platform.churnRate < 10 ? 'text-yellow-400' : 'text-red-400'}`}>
                  {platform.churnRate.toFixed(1)}%
                </div>
              </div>
            </div>

            <div className="flex items-center justify-between">
              <button
                onClick={() => setSelectedPlatform(platform.id)}
                className="px-4 py-2 bg-yellow-400/10 text-yellow-400 border border-yellow-400/20 rounded-lg text-sm font-medium hover:bg-yellow-400/20 transition-colors"
              >
                View Details
              </button>
              <button
                onClick={() => generateAutomatedReport(platform.id)}
                className="px-4 py-2 bg-blue-400/10 text-blue-400 border border-blue-400/20 rounded-lg text-sm font-medium hover:bg-blue-400/20 transition-colors"
              >
                Generate Report
              </button>
            </div>
          </motion.div>
        ))}
      </div>
    </div>
  );
}