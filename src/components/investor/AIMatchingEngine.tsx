// AI-Powered Investment Matching Engine for Investors
import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';

interface InvestmentOpportunity {
  id: string;
  platformName: string;
  seller: string;
  industry: string;
  askingPrice: number;
  revenue: string;
  growth: string;
  stage: string;
  readinessScore: number;
  aiScore: number;
  riskLevel: 'low' | 'medium' | 'high';
  timeToExit: string;
  projectedROI: string;
  highlights: string[];
  concerns: string[];
  financials: {
    monthlyRevenue: number;
    userGrowth: string;
    churnRate: string;
    marketSize: string;
  };
  dueDiligence: {
    technicalAudit: number;
    marketValidation: number;
    financialHealth: number;
    teamAssessment: number;
  };
}

interface MatchingCriteria {
  investmentRange: string;
  riskTolerance: string;
  preferredSectors: string[];
  investmentHorizon: string;
  minReadinessScore: number;
  requiresRevenue: boolean;
}

const RISK_COLORS = {
  low: 'text-green-600 bg-green-100',
  medium: 'text-yellow-600 bg-yellow-100',
  high: 'text-red-600 bg-red-100'
};

export default function AIMatchingEngine() {
  const [opportunities, setOpportunities] = useState<InvestmentOpportunity[]>([]);
  const [criteria, setCriteria] = useState<MatchingCriteria>({
    investmentRange: '25k-100k',
    riskTolerance: 'moderate',
    preferredSectors: ['SaaS', 'FinTech'],
    investmentHorizon: 'medium',
    minReadinessScore: 70,
    requiresRevenue: true
  });
  const [isLoading, setIsLoading] = useState(false);
  const [selectedDeal, setSelectedDeal] = useState<InvestmentOpportunity | null>(null);
  const [viewMode, setViewMode] = useState<'matches' | 'portfolio' | 'analytics'>('matches');

  useEffect(() => {
    loadMatchingOpportunities();
  }, [criteria]);

  const loadMatchingOpportunities = async () => {
    setIsLoading(true);
    try {
      const response = await fetch('/api/investor/matching', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(criteria)
      });

      if (response.ok) {
        const data = await response.json();
        setOpportunities(data.opportunities);
      }
    } catch (error) {
      console.error('Failed to load opportunities:', error);
    }
    setIsLoading(false);
  };

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'USD',
      minimumFractionDigits: 0,
      maximumFractionDigits: 0
    }).format(amount);
  };

  const getRiskColor = (risk: string) => RISK_COLORS[risk as keyof typeof RISK_COLORS];

  const getScoreColor = (score: number) => {
    if (score >= 90) return 'text-green-600';
    if (score >= 75) return 'text-blue-600';
    if (score >= 60) return 'text-yellow-600';
    return 'text-gray-600';
  };

  return (
    <div className="max-w-7xl mx-auto p-6">
      {/* Header with AI Insights */}
      <div className="bg-gradient-to-r from-blue-600 to-purple-600 rounded-2xl text-white p-8 mb-8">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-bold mb-2">🤖 AI Investment Matching</h1>
            <p className="text-blue-100 text-lg">
              Personalized deal discovery powered by machine learning and market analysis
            </p>
          </div>
          <div className="text-right">
            <div className="text-4xl font-bold">{opportunities.length}</div>
            <div className="text-blue-200">Active Matches</div>
          </div>
        </div>

        {/* Quick Stats */}
        <div className="grid grid-cols-4 gap-6 mt-8">
          <div className="bg-white/10 rounded-lg p-4 text-center">
            <div className="text-2xl font-bold">
              {opportunities.length > 0 ? Math.round(opportunities.reduce((acc, op) => acc + op.aiScore, 0) / opportunities.length) : 0}%
            </div>
            <div className="text-blue-200 text-sm">Avg AI Score</div>
          </div>
          <div className="bg-white/10 rounded-lg p-4 text-center">
            <div className="text-2xl font-bold">
              {opportunities.filter(op => op.riskLevel === 'low').length}
            </div>
            <div className="text-blue-200 text-sm">Low Risk</div>
          </div>
          <div className="bg-white/10 rounded-lg p-4 text-center">
            <div className="text-2xl font-bold">
              {opportunities.filter(op => op.financials.monthlyRevenue > 0).length}
            </div>
            <div className="text-blue-200 text-sm">Revenue+</div>
          </div>
          <div className="bg-white/10 rounded-lg p-4 text-center">
            <div className="text-2xl font-bold">
              {formatCurrency(opportunities.length > 0 ? Math.min(...opportunities.map(op => op.askingPrice)) : 0)}
            </div>
            <div className="text-blue-200 text-sm">Min Entry</div>
          </div>
        </div>
      </div>

      {/* Navigation Tabs */}
      <div className="flex space-x-1 bg-gray-100 p-1 rounded-lg mb-8">
        {[
          { id: 'matches', name: 'AI Matches', icon: '🎯' },
          { id: 'portfolio', name: 'Portfolio', icon: '📊' },
          { id: 'analytics', name: 'Analytics', icon: '📈' }
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

      {/* AI Matching Criteria */}
      {viewMode === 'matches' && (
        <div className="bg-white rounded-xl border border-gray-200 p-6 mb-8">
          <h3 className="text-lg font-semibold text-gray-900 mb-4">⚙️ Matching Preferences</h3>
          <div className="grid md:grid-cols-3 lg:grid-cols-6 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Investment Range</label>
              <select
                value={criteria.investmentRange}
                onChange={(e) => setCriteria(prev => ({ ...prev, investmentRange: e.target.value }))}
                className="w-full px-3 py-2 border border-gray-300 rounded-md text-sm focus:ring-2 focus:ring-blue-500"
              >
                <option value="5k-25k">$5K - $25K</option>
                <option value="25k-100k">$25K - $100K</option>
                <option value="100k-500k">$100K - $500K</option>
                <option value="500k+">$500K+</option>
              </select>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Risk Tolerance</label>
              <select
                value={criteria.riskTolerance}
                onChange={(e) => setCriteria(prev => ({ ...prev, riskTolerance: e.target.value }))}
                className="w-full px-3 py-2 border border-gray-300 rounded-md text-sm focus:ring-2 focus:ring-blue-500"
              >
                <option value="conservative">Conservative</option>
                <option value="moderate">Moderate</option>
                <option value="aggressive">Aggressive</option>
              </select>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Time Horizon</label>
              <select
                value={criteria.investmentHorizon}
                onChange={(e) => setCriteria(prev => ({ ...prev, investmentHorizon: e.target.value }))}
                className="w-full px-3 py-2 border border-gray-300 rounded-md text-sm focus:ring-2 focus:ring-blue-500"
              >
                <option value="short">1-2 years</option>
                <option value="medium">3-5 years</option>
                <option value="long">5+ years</option>
              </select>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Min Readiness</label>
              <select
                value={criteria.minReadinessScore}
                onChange={(e) => setCriteria(prev => ({ ...prev, minReadinessScore: parseInt(e.target.value) }))}
                className="w-full px-3 py-2 border border-gray-300 rounded-md text-sm focus:ring-2 focus:ring-blue-500"
              >
                <option value="50">50%+</option>
                <option value="70">70%+</option>
                <option value="80">80%+</option>
                <option value="90">90%+</option>
              </select>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Revenue Status</label>
              <select
                value={criteria.requiresRevenue ? 'revenue' : 'any'}
                onChange={(e) => setCriteria(prev => ({ ...prev, requiresRevenue: e.target.value === 'revenue' }))}
                className="w-full px-3 py-2 border border-gray-300 rounded-md text-sm focus:ring-2 focus:ring-blue-500"
              >
                <option value="any">Any Stage</option>
                <option value="revenue">Revenue Only</option>
              </select>
            </div>

            <div className="flex items-end">
              <button
                onClick={loadMatchingOpportunities}
                className="w-full bg-blue-600 text-white py-2 px-4 rounded-md text-sm font-medium hover:bg-blue-700 transition-colors"
              >
                Refresh
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Investment Opportunities */}
      {viewMode === 'matches' && (
        <div className="space-y-6">
          {isLoading ? (
            <div className="flex items-center justify-center py-12">
              <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div>
              <span className="ml-3 text-lg text-gray-600">Analyzing opportunities...</span>
            </div>
          ) : opportunities.length > 0 ? (
            opportunities.map(opportunity => (
              <motion.div
                key={opportunity.id}
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                className="bg-white rounded-xl border border-gray-200 overflow-hidden hover:shadow-lg transition-all"
              >
                <div className="p-6">
                  <div className="flex items-start justify-between mb-4">
                    <div className="flex-1">
                      <div className="flex items-center space-x-3 mb-2">
                        <h3 className="text-xl font-semibold text-gray-900">{opportunity.platformName}</h3>
                        <span className="px-2 py-1 bg-blue-100 text-blue-800 text-xs font-medium rounded-full">
                          {opportunity.industry}
                        </span>
                        <span className={`px-2 py-1 text-xs font-medium rounded-full ${getRiskColor(opportunity.riskLevel)}`}>
                          {opportunity.riskLevel} risk
                        </span>
                      </div>
                      <p className="text-gray-600 mb-2">By {opportunity.seller}</p>
                      <div className="flex items-center space-x-4 text-sm text-gray-600">
                        <span>{opportunity.stage}</span>
                        <span>•</span>
                        <span>{opportunity.revenue} revenue</span>
                        <span>•</span>
                        <span>{opportunity.growth} growth</span>
                      </div>
                    </div>

                    <div className="text-right">
                      <div className={`text-3xl font-bold ${getScoreColor(opportunity.aiScore)} mb-1`}>
                        {opportunity.aiScore}%
                      </div>
                      <div className="text-sm text-gray-600">AI Match</div>
                      <div className="text-2xl font-bold text-gray-900 mt-2">
                        {formatCurrency(opportunity.askingPrice)}
                      </div>
                    </div>
                  </div>

                  {/* Key Metrics */}
                  <div className="grid grid-cols-4 gap-4 mb-6">
                    <div className="bg-gray-50 rounded-lg p-3 text-center">
                      <div className="text-lg font-semibold text-gray-900">{opportunity.readinessScore}%</div>
                      <div className="text-xs text-gray-600">Ready</div>
                    </div>
                    <div className="bg-gray-50 rounded-lg p-3 text-center">
                      <div className="text-lg font-semibold text-gray-900">{opportunity.projectedROI}</div>
                      <div className="text-xs text-gray-600">Proj. ROI</div>
                    </div>
                    <div className="bg-gray-50 rounded-lg p-3 text-center">
                      <div className="text-lg font-semibold text-gray-900">{opportunity.timeToExit}</div>
                      <div className="text-xs text-gray-600">Exit Time</div>
                    </div>
                    <div className="bg-gray-50 rounded-lg p-3 text-center">
                      <div className="text-lg font-semibold text-gray-900">
                        {formatCurrency(opportunity.financials.monthlyRevenue)}
                      </div>
                      <div className="text-xs text-gray-600">Monthly Rev</div>
                    </div>
                  </div>

                  {/* Due Diligence Scores */}
                  <div className="mb-6">
                    <h4 className="text-sm font-medium text-gray-700 mb-3">🔍 Due Diligence Analysis</h4>
                    <div className="grid grid-cols-4 gap-4">
                      {Object.entries(opportunity.dueDiligence).map(([key, score]) => (
                        <div key={key} className="text-center">
                          <div className={`text-lg font-semibold ${getScoreColor(score)}`}>{score}%</div>
                          <div className="text-xs text-gray-600 capitalize">
                            {key.replace(/([A-Z])/g, ' $1').trim()}
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>

                  {/* Highlights and Concerns */}
                  <div className="grid md:grid-cols-2 gap-6 mb-6">
                    <div>
                      <h4 className="text-sm font-medium text-green-700 mb-2">✅ Key Highlights</h4>
                      <ul className="space-y-1">
                        {opportunity.highlights.map((highlight, idx) => (
                          <li key={idx} className="text-sm text-gray-700 flex items-start">
                            <span className="text-green-500 mr-2">•</span>
                            {highlight}
                          </li>
                        ))}
                      </ul>
                    </div>

                    <div>
                      <h4 className="text-sm font-medium text-red-700 mb-2">⚠️ Risk Factors</h4>
                      <ul className="space-y-1">
                        {opportunity.concerns.map((concern, idx) => (
                          <li key={idx} className="text-sm text-gray-700 flex items-start">
                            <span className="text-red-500 mr-2">•</span>
                            {concern}
                          </li>
                        ))}
                      </ul>
                    </div>
                  </div>

                  {/* Action Buttons */}
                  <div className="flex space-x-3 pt-4 border-t border-gray-200">
                    <button
                      onClick={() => setSelectedDeal(opportunity)}
                      className="flex-1 bg-blue-600 text-white py-2 px-4 rounded-lg font-medium hover:bg-blue-700 transition-colors"
                    >
                      View Full Analysis
                    </button>
                    <button className="px-6 py-2 border border-blue-600 text-blue-600 rounded-lg font-medium hover:bg-blue-50 transition-colors">
                      Request Meeting
                    </button>
                    <button className="px-6 py-2 border border-gray-300 text-gray-700 rounded-lg font-medium hover:bg-gray-50 transition-colors">
                      Save Deal
                    </button>
                  </div>
                </div>
              </motion.div>
            ))
          ) : (
            <div className="text-center py-12">
              <div className="text-6xl mb-4">🎯</div>
              <h3 className="text-xl font-semibold text-gray-900 mb-2">No matching opportunities</h3>
              <p className="text-gray-600 mb-6">Try adjusting your investment criteria to see more deals</p>
            </div>
          )}
        </div>
      )}

      {/* Portfolio View */}
      {viewMode === 'portfolio' && (
        <div className="bg-white rounded-xl border border-gray-200 p-6">
          <h3 className="text-xl font-semibold text-gray-900 mb-6">📊 Investment Portfolio</h3>
          <div className="text-center py-12">
            <div className="text-6xl mb-4">🚀</div>
            <h4 className="text-lg font-semibold text-gray-900 mb-2">Your investment journey starts here</h4>
            <p className="text-gray-600">Complete your first investment to see portfolio tracking</p>
          </div>
        </div>
      )}

      {/* Analytics View */}
      {viewMode === 'analytics' && (
        <div className="bg-white rounded-xl border border-gray-200 p-6">
          <h3 className="text-xl font-semibold text-gray-900 mb-6">📈 Investment Analytics</h3>
          <div className="text-center py-12">
            <div className="text-6xl mb-4">📊</div>
            <h4 className="text-lg font-semibold text-gray-900 mb-2">Market insights coming soon</h4>
            <p className="text-gray-600">Advanced analytics and market trends will be available here</p>
          </div>
        </div>
      )}

      {/* Deal Detail Modal */}
      <AnimatePresence>
        {selectedDeal && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50"
            onClick={() => setSelectedDeal(null)}
          >
            <motion.div
              initial={{ scale: 0.95, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.95, opacity: 0 }}
              onClick={(e) => e.stopPropagation()}
              className="bg-white rounded-2xl max-w-4xl w-full max-h-[90vh] overflow-y-auto"
            >
              <div className="p-8">
                <div className="flex items-start justify-between mb-6">
                  <div>
                    <h2 className="text-2xl font-bold text-gray-900 mb-2">{selectedDeal.platformName}</h2>
                    <p className="text-gray-600">Detailed Investment Analysis</p>
                  </div>
                  <button
                    onClick={() => setSelectedDeal(null)}
                    className="text-gray-400 hover:text-gray-600"
                  >
                    <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M6 18L18 6M6 6l12 12" />
                    </svg>
                  </button>
                </div>

                <div className="space-y-6">
                  <div className="grid grid-cols-2 gap-6">
                    <div>
                      <h4 className="font-semibold text-gray-900 mb-3">Financial Overview</h4>
                      <div className="space-y-2 text-sm">
                        <div className="flex justify-between">
                          <span className="text-gray-600">Monthly Revenue:</span>
                          <span className="font-medium">{formatCurrency(selectedDeal.financials.monthlyRevenue)}</span>
                        </div>
                        <div className="flex justify-between">
                          <span className="text-gray-600">User Growth:</span>
                          <span className="font-medium">{selectedDeal.financials.userGrowth}</span>
                        </div>
                        <div className="flex justify-between">
                          <span className="text-gray-600">Churn Rate:</span>
                          <span className="font-medium">{selectedDeal.financials.churnRate}</span>
                        </div>
                        <div className="flex justify-between">
                          <span className="text-gray-600">Market Size:</span>
                          <span className="font-medium">{selectedDeal.financials.marketSize}</span>
                        </div>
                      </div>
                    </div>

                    <div>
                      <h4 className="font-semibold text-gray-900 mb-3">Investment Terms</h4>
                      <div className="space-y-2 text-sm">
                        <div className="flex justify-between">
                          <span className="text-gray-600">Asking Price:</span>
                          <span className="font-medium">{formatCurrency(selectedDeal.askingPrice)}</span>
                        </div>
                        <div className="flex justify-between">
                          <span className="text-gray-600">Projected ROI:</span>
                          <span className="font-medium text-green-600">{selectedDeal.projectedROI}</span>
                        </div>
                        <div className="flex justify-between">
                          <span className="text-gray-600">Time to Exit:</span>
                          <span className="font-medium">{selectedDeal.timeToExit}</span>
                        </div>
                        <div className="flex justify-between">
                          <span className="text-gray-600">Risk Level:</span>
                          <span className={`font-medium capitalize`}>{selectedDeal.riskLevel}</span>
                        </div>
                      </div>
                    </div>
                  </div>

                  <div className="flex space-x-4 pt-6 border-t border-gray-200">
                    <button className="flex-1 bg-blue-600 text-white py-3 px-6 rounded-lg font-semibold hover:bg-blue-700 transition-colors">
                      Start Investment Process
                    </button>
                    <button className="px-6 py-3 border border-blue-600 text-blue-600 rounded-lg font-semibold hover:bg-blue-50 transition-colors">
                      Schedule Call
                    </button>
                  </div>
                </div>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}