// AI-Powered Deal Flow Recommendations
// Smart platform discovery based on investor preferences and portfolio analysis
import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';

interface PlatformRecommendation {
  id: string;
  platformName: string;
  category: string;
  description: string;
  aiValidationScore: number;
  investmentRange: {
    min: number;
    max: number;
  };
  expectedROI: number;
  riskLevel: 'low' | 'medium' | 'high';
  compatibilityScore: number;
  reasonsForRecommendation: string[];
  marketOpportunity: string;
  competitiveAdvantage: string;
  deploymentComplexity: 'simple' | 'moderate' | 'complex';
  monthlyRevenue: number;
  customerCount: number;
  growthRate: number;
  listingDate: string;
  certificationLevel: 'basic' | 'standard' | 'premium' | 'elite';
}

interface InvestorPreferences {
  sectors: string[];
  riskTolerance: 'conservative' | 'moderate' | 'aggressive';
  investmentRange: { min: number; max: number };
  geographicFocus: string[];
  timeHorizon: string;
  preferredStage: string[];
}

interface AIMatchingCriteria {
  portfolioSynergy: number;
  sectorDiversification: number;
  riskBalance: number;
  growthPotential: number;
  marketTiming: number;
}

export default function AIDeaIFlowRecommendations() {
  const [recommendations, setRecommendations] = useState<PlatformRecommendation[]>([]);
  const [preferences, setPreferences] = useState<InvestorPreferences | null>(null);
  const [matchingCriteria, setMatchingCriteria] = useState<AIMatchingCriteria | null>(null);
  const [selectedPlatform, setSelectedPlatform] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [filterSettings, setFilterSettings] = useState({
    minAIScore: 7.0,
    maxRiskLevel: 'medium',
    minCompatibility: 70,
    sectors: [] as string[]
  });

  useEffect(() => {
    fetchRecommendations();
    const interval = setInterval(fetchRecommendations, 600000); // 10-minute updates
    return () => clearInterval(interval);
  }, [filterSettings]);

  const fetchRecommendations = async () => {
    try {
      setLoading(true);
      const response = await fetch(`/api/investors/deal-flow/recommendations?${new URLSearchParams({
        minAIScore: filterSettings.minAIScore.toString(),
        maxRiskLevel: filterSettings.maxRiskLevel,
        minCompatibility: filterSettings.minCompatibility.toString(),
        sectors: filterSettings.sectors.join(',')
      })}`);

      const data = await response.json();
      setRecommendations(data.recommendations || []);
      setPreferences(data.investorPreferences);
      setMatchingCriteria(data.matchingCriteria);
    } catch (error) {
      console.error('Failed to fetch recommendations:', error);
    } finally {
      setLoading(false);
    }
  };

  const requestDetailedAnalysis = async (platformId: string) => {
    try {
      const response = await fetch('/api/investors/deal-flow/detailed-analysis', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ platformId })
      });

      const data = await response.json();
      console.log('Detailed analysis:', data);
      // Handle detailed analysis response
    } catch (error) {
      console.error('Failed to request detailed analysis:', error);
    }
  };

  const expressInterest = async (platformId: string, investmentAmount: number) => {
    try {
      const response = await fetch('/api/investors/deal-flow/express-interest', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ platformId, investmentAmount })
      });

      const data = await response.json();
      if (data.success) {
        // Show success notification
        console.log('Interest expressed successfully');
      }
    } catch (error) {
      console.error('Failed to express interest:', error);
    }
  };

  const getRiskColor = (risk: string) => {
    switch (risk) {
      case 'low': return 'text-green-400 bg-green-400/10 border-green-400/20';
      case 'medium': return 'text-yellow-400 bg-yellow-400/10 border-yellow-400/20';
      case 'high': return 'text-red-400 bg-red-400/10 border-red-400/20';
      default: return 'text-gray-400 bg-gray-400/10 border-gray-400/20';
    }
  };

  const getCertificationColor = (level: string) => {
    switch (level) {
      case 'elite': return 'text-purple-400 bg-purple-400/10 border-purple-400/20';
      case 'premium': return 'text-blue-400 bg-blue-400/10 border-blue-400/20';
      case 'standard': return 'text-green-400 bg-green-400/10 border-green-400/20';
      case 'basic': return 'text-gray-400 bg-gray-400/10 border-gray-400/20';
      default: return 'text-gray-400 bg-gray-400/10 border-gray-400/20';
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
      {/* AI Matching Overview */}
      {matchingCriteria && (
        <motion.div
          className="bg-gradient-to-br from-gray-900/50 to-black/50 backdrop-blur-sm rounded-2xl border border-yellow-400/20 p-6"
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
        >
          <div className="flex items-center space-x-3 mb-6">
            <div className="w-12 h-12 bg-yellow-400/20 rounded-xl flex items-center justify-center">
              <svg className="w-6 h-6 text-yellow-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9.663 17h4.673M12 3v1m6.364 1.636l-.707.707M21 12h-1M4 12H3m3.343-5.657l-.707-.707m2.828 9.9a5 5 0 117.072 0l-.548.547A3.374 3.374 0 0014 18.469V19a2 2 0 11-4 0v-.531c0-.895-.356-1.754-.988-2.386l-.548-.547z" />
              </svg>
            </div>
            <div>
              <h3 className="text-xl font-semibold text-white">AI Matching Engine</h3>
              <p className="text-gray-400">Personalized recommendations based on your portfolio and preferences</p>
            </div>
          </div>

          <div className="grid grid-cols-2 md:grid-cols-5 gap-4">
            <div className="text-center">
              <div className="text-2xl font-bold text-green-400">{Math.round(matchingCriteria.portfolioSynergy)}%</div>
              <div className="text-xs text-gray-400">Portfolio Synergy</div>
            </div>
            <div className="text-center">
              <div className="text-2xl font-bold text-blue-400">{Math.round(matchingCriteria.sectorDiversification)}%</div>
              <div className="text-xs text-gray-400">Diversification</div>
            </div>
            <div className="text-center">
              <div className="text-2xl font-bold text-purple-400">{Math.round(matchingCriteria.riskBalance)}%</div>
              <div className="text-xs text-gray-400">Risk Balance</div>
            </div>
            <div className="text-center">
              <div className="text-2xl font-bold text-yellow-400">{Math.round(matchingCriteria.growthPotential)}%</div>
              <div className="text-xs text-gray-400">Growth Potential</div>
            </div>
            <div className="text-center">
              <div className="text-2xl font-bold text-orange-400">{Math.round(matchingCriteria.marketTiming)}%</div>
              <div className="text-xs text-gray-400">Market Timing</div>
            </div>
          </div>
        </motion.div>
      )}

      {/* Filter Controls */}
      <motion.div
        className="bg-gradient-to-br from-gray-900/50 to-black/50 backdrop-blur-sm rounded-2xl border border-gray-400/20 p-6"
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.1 }}
      >
        <h4 className="text-lg font-semibold text-white mb-4">Recommendation Filters</h4>
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
          <div>
            <label className="block text-sm text-gray-400 mb-2">Min AI Score</label>
            <select
              value={filterSettings.minAIScore}
              onChange={(e) => setFilterSettings(prev => ({ ...prev, minAIScore: parseFloat(e.target.value) }))}
              className="w-full bg-gray-800 border border-gray-700 rounded-lg px-3 py-2 text-white text-sm focus:border-yellow-400 transition-colors"
            >
              <option value={6.0}>6.0+</option>
              <option value={7.0}>7.0+</option>
              <option value={8.0}>8.0+</option>
              <option value={9.0}>9.0+</option>
            </select>
          </div>

          <div>
            <label className="block text-sm text-gray-400 mb-2">Max Risk Level</label>
            <select
              value={filterSettings.maxRiskLevel}
              onChange={(e) => setFilterSettings(prev => ({ ...prev, maxRiskLevel: e.target.value }))}
              className="w-full bg-gray-800 border border-gray-700 rounded-lg px-3 py-2 text-white text-sm focus:border-yellow-400 transition-colors"
            >
              <option value="low">Low Risk Only</option>
              <option value="medium">Up to Medium Risk</option>
              <option value="high">All Risk Levels</option>
            </select>
          </div>

          <div>
            <label className="block text-sm text-gray-400 mb-2">Min Compatibility</label>
            <select
              value={filterSettings.minCompatibility}
              onChange={(e) => setFilterSettings(prev => ({ ...prev, minCompatibility: parseInt(e.target.value) }))}
              className="w-full bg-gray-800 border border-gray-700 rounded-lg px-3 py-2 text-white text-sm focus:border-yellow-400 transition-colors"
            >
              <option value={50}>50%+</option>
              <option value={70}>70%+</option>
              <option value={80}>80%+</option>
              <option value={90}>90%+</option>
            </select>
          </div>

          <div>
            <label className="block text-sm text-gray-400 mb-2">Refresh Rate</label>
            <button
              onClick={fetchRecommendations}
              className="w-full bg-yellow-400/10 border border-yellow-400/20 text-yellow-400 px-3 py-2 rounded-lg text-sm font-medium hover:bg-yellow-400/20 transition-colors"
            >
              Refresh Now
            </button>
          </div>
        </div>
      </motion.div>

      {/* Platform Recommendations */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {recommendations.map((platform, index) => (
          <motion.div
            key={platform.id}
            className="bg-gradient-to-br from-gray-900/50 to-black/50 backdrop-blur-sm rounded-2xl border border-gray-400/20 hover:border-yellow-400/40 p-6 transition-all duration-300"
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: index * 0.1 }}
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
              <div className="flex flex-col items-end space-y-2">
                <span className={`px-2 py-1 rounded-full text-xs font-medium border ${getRiskColor(platform.riskLevel)}`}>
                  {platform.riskLevel.toUpperCase()} RISK
                </span>
                <span className={`px-2 py-1 rounded-full text-xs font-medium border ${getCertificationColor(platform.certificationLevel)}`}>
                  {platform.certificationLevel.toUpperCase()}
                </span>
              </div>
            </div>

            <div className="mb-4">
              <p className="text-gray-300 text-sm line-clamp-2">{platform.description}</p>
            </div>

            <div className="grid grid-cols-2 gap-4 mb-4">
              <div>
                <div className="text-sm text-gray-400">AI Score</div>
                <div className="text-lg font-semibold text-yellow-400">
                  {platform.aiValidationScore.toFixed(1)}/10
                </div>
              </div>
              <div>
                <div className="text-sm text-gray-400">Compatibility</div>
                <div className="text-lg font-semibold text-green-400">
                  {platform.compatibilityScore}%
                </div>
              </div>
              <div>
                <div className="text-sm text-gray-400">Expected ROI</div>
                <div className="text-lg font-semibold text-blue-400">
                  {platform.expectedROI}%
                </div>
              </div>
              <div>
                <div className="text-sm text-gray-400">Monthly Revenue</div>
                <div className="text-lg font-semibold text-white">
                  ${platform.monthlyRevenue.toLocaleString()}
                </div>
              </div>
            </div>

            <div className="mb-4">
              <div className="text-sm text-gray-400 mb-2">Investment Range</div>
              <div className="text-white font-medium">
                ${platform.investmentRange.min.toLocaleString()} - ${platform.investmentRange.max.toLocaleString()}
              </div>
            </div>

            <div className="mb-4">
              <div className="text-sm text-gray-400 mb-2">Why This Matches Your Portfolio</div>
              <ul className="text-xs text-gray-300 space-y-1">
                {platform.reasonsForRecommendation.slice(0, 2).map((reason, idx) => (
                  <li key={idx} className="flex items-start">
                    <span className="text-yellow-400 mr-2">•</span>
                    <span>{reason}</span>
                  </li>
                ))}
              </ul>
            </div>

            <div className="flex items-center justify-between space-x-3">
              <button
                onClick={() => requestDetailedAnalysis(platform.id)}
                className="flex-1 bg-blue-400/10 text-blue-400 border border-blue-400/20 py-2 px-3 rounded-lg text-sm font-medium hover:bg-blue-400/20 transition-colors"
              >
                Detailed Analysis
              </button>
              <button
                onClick={() => setSelectedPlatform(platform.id)}
                className="flex-1 bg-yellow-400/10 text-yellow-400 border border-yellow-400/20 py-2 px-3 rounded-lg text-sm font-medium hover:bg-yellow-400/20 transition-colors"
              >
                Express Interest
              </button>
            </div>
          </motion.div>
        ))}
      </div>

      {recommendations.length === 0 && !loading && (
        <div className="text-center py-12">
          <div className="w-16 h-16 bg-gray-400/10 rounded-full flex items-center justify-center mx-auto mb-4">
            <svg className="w-8 h-8 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
            </svg>
          </div>
          <h3 className="text-lg font-medium text-white mb-2">No Recommendations Found</h3>
          <p className="text-gray-400">Try adjusting your filter settings to see more opportunities.</p>
        </div>
      )}

      {/* Interest Expression Modal */}
      <AnimatePresence>
        {selectedPlatform && (
          <motion.div
            className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center z-50"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={() => setSelectedPlatform(null)}
          >
            <motion.div
              className="bg-gray-900 rounded-2xl border border-yellow-400/20 p-6 max-w-md w-full mx-4"
              initial={{ scale: 0.9, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.9, opacity: 0 }}
              onClick={(e) => e.stopPropagation()}
            >
              <h3 className="text-xl font-semibold text-white mb-4">Express Investment Interest</h3>
              <p className="text-gray-400 mb-6">
                This will notify the platform owner of your interest and initiate the due diligence process.
              </p>
              <div className="flex space-x-3">
                <button
                  onClick={() => setSelectedPlatform(null)}
                  className="flex-1 bg-gray-400/10 text-gray-400 border border-gray-400/20 py-2 px-4 rounded-lg font-medium hover:bg-gray-400/20 transition-colors"
                >
                  Cancel
                </button>
                <button
                  onClick={() => {
                    expressInterest(selectedPlatform, 0);
                    setSelectedPlatform(null);
                  }}
                  className="flex-1 bg-yellow-400 text-black py-2 px-4 rounded-lg font-medium hover:bg-yellow-300 transition-colors"
                >
                  Express Interest
                </button>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}