// Smart Platform Discovery System for Buyers
import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';

interface DiscoveryFilters {
  businessType: string;
  budget: string;
  timeline: string;
  industry: string;
  techPreference: string;
  teamSize: string;
  experience: string;
}

interface PlatformListing {
  id: string;
  name: string;
  description: string;
  price: number;
  seller: string;
  rating: number;
  readinessScore: number;
  techStack: string[];
  industry: string;
  features: string[];
  screenshots: string[];
  aiMatchScore: number;
  estimatedRevenue: string;
  userBase: string;
  launchTime: string;
}

const BUSINESS_TYPES = [
  { id: 'startup', name: 'Startup', description: 'New business venture' },
  { id: 'existing', name: 'Existing Business', description: 'Expanding current operations' },
  { id: 'investor', name: 'Investment Portfolio', description: 'Adding to investment portfolio' },
  { id: 'enterprise', name: 'Enterprise', description: 'Large organization initiative' }
];

const INDUSTRIES = [
  'FinTech', 'HealthTech', 'EdTech', 'E-commerce', 'SaaS', 'Marketplace',
  'Real Estate', 'Food & Beverage', 'Travel', 'Media', 'Legal Tech', 'HR Tech'
];

const BUDGET_RANGES = [
  { id: 'under-25k', name: 'Under $25K', min: 0, max: 25000 },
  { id: '25k-50k', name: '$25K - $50K', min: 25000, max: 50000 },
  { id: '50k-100k', name: '$50K - $100K', min: 50000, max: 100000 },
  { id: '100k-250k', name: '$100K - $250K', min: 100000, max: 250000 },
  { id: '250k+', name: '$250K+', min: 250000, max: 1000000 }
];

export default function PlatformDiscovery() {
  const [currentStep, setCurrentStep] = useState(1);
  const [filters, setFilters] = useState<DiscoveryFilters>({
    businessType: '',
    budget: '',
    timeline: '',
    industry: '',
    techPreference: '',
    teamSize: '',
    experience: ''
  });
  const [matchedPlatforms, setMatchedPlatforms] = useState<PlatformListing[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [viewMode, setViewMode] = useState<'cards' | 'list'>('cards');

  useEffect(() => {
    if (Object.values(filters).some(v => v)) {
      searchPlatforms();
    }
  }, [filters]);

  const searchPlatforms = async () => {
    setIsLoading(true);
    try {
      const response = await fetch('/api/buyer/discover', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(filters)
      });

      if (response.ok) {
        const platforms = await response.json();
        setMatchedPlatforms(platforms);
      }
    } catch (error) {
      console.error('Platform search failed:', error);
    }
    setIsLoading(false);
  };

  const updateFilter = (key: keyof DiscoveryFilters, value: string) => {
    setFilters(prev => ({ ...prev, [key]: value }));
  };

  const getMatchColor = (score: number) => {
    if (score >= 90) return 'text-green-600 bg-green-100';
    if (score >= 75) return 'text-blue-600 bg-blue-100';
    if (score >= 60) return 'text-yellow-600 bg-yellow-100';
    return 'text-gray-600 bg-gray-100';
  };

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'USD',
      minimumFractionDigits: 0
    }).format(amount);
  };

  return (
    <div className="max-w-7xl mx-auto p-6">
      {/* Discovery Header */}
      <div className="text-center mb-8">
        <h1 className="text-4xl font-bold text-gray-900 mb-4">
          🚀 Discover Your Perfect Platform
        </h1>
        <p className="text-xl text-gray-600 max-w-3xl mx-auto">
          Our AI matches you with platforms based on your business needs, budget, and goals.
          Find validated, ready-to-launch solutions in minutes.
        </p>
      </div>

      {/* Smart Discovery Wizard */}
      <div className="bg-white rounded-2xl shadow-lg border border-gray-200 mb-8">
        <div className="p-6 border-b border-gray-200">
          <h2 className="text-2xl font-semibold text-gray-900 mb-2">Smart Discovery</h2>
          <p className="text-gray-600">Answer a few questions to get personalized recommendations</p>
        </div>

        <div className="p-6 space-y-6">
          {/* Business Type Selection */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-3">
              What type of business initiative is this?
            </label>
            <div className="grid md:grid-cols-2 lg:grid-cols-4 gap-3">
              {BUSINESS_TYPES.map(type => (
                <label
                  key={type.id}
                  className={`p-4 border-2 rounded-lg cursor-pointer transition-all ${
                    filters.businessType === type.id
                      ? 'border-blue-500 bg-blue-50'
                      : 'border-gray-200 hover:border-blue-300'
                  }`}
                >
                  <input
                    type="radio"
                    value={type.id}
                    checked={filters.businessType === type.id}
                    onChange={(e) => updateFilter('businessType', e.target.value)}
                    className="sr-only"
                  />
                  <div className="font-medium text-gray-900 mb-1">{type.name}</div>
                  <div className="text-sm text-gray-600">{type.description}</div>
                </label>
              ))}
            </div>
          </div>

          {/* Budget and Timeline */}
          <div className="grid md:grid-cols-2 gap-6">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">Investment Budget</label>
              <select
                value={filters.budget}
                onChange={(e) => updateFilter('budget', e.target.value)}
                className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              >
                <option value="">Select budget range</option>
                {BUDGET_RANGES.map(range => (
                  <option key={range.id} value={range.id}>{range.name}</option>
                ))}
              </select>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">Launch Timeline</label>
              <select
                value={filters.timeline}
                onChange={(e) => updateFilter('timeline', e.target.value)}
                className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              >
                <option value="">Select timeline</option>
                <option value="immediate">Immediate (1-2 weeks)</option>
                <option value="fast">Fast (1-2 months)</option>
                <option value="standard">Standard (3-6 months)</option>
                <option value="flexible">Flexible (6+ months)</option>
              </select>
            </div>
          </div>

          {/* Industry and Team */}
          <div className="grid md:grid-cols-2 gap-6">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">Target Industry</label>
              <select
                value={filters.industry}
                onChange={(e) => updateFilter('industry', e.target.value)}
                className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              >
                <option value="">Any industry</option>
                {INDUSTRIES.map(industry => (
                  <option key={industry} value={industry}>{industry}</option>
                ))}
              </select>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">Team Size</label>
              <select
                value={filters.teamSize}
                onChange={(e) => updateFilter('teamSize', e.target.value)}
                className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              >
                <option value="">Select team size</option>
                <option value="solo">Solo entrepreneur</option>
                <option value="small">Small team (2-5)</option>
                <option value="medium">Medium team (6-20)</option>
                <option value="large">Large team (20+)</option>
              </select>
            </div>
          </div>

          {/* Experience Level */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">Technical Experience</label>
            <div className="grid grid-cols-3 gap-3">
              {[
                { id: 'beginner', name: 'Beginner', desc: 'Need simple setup' },
                { id: 'intermediate', name: 'Intermediate', desc: 'Some tech knowledge' },
                { id: 'advanced', name: 'Advanced', desc: 'Can handle complexity' }
              ].map(level => (
                <label
                  key={level.id}
                  className={`p-3 border-2 rounded-lg cursor-pointer text-center transition-all ${
                    filters.experience === level.id
                      ? 'border-blue-500 bg-blue-50'
                      : 'border-gray-200 hover:border-blue-300'
                  }`}
                >
                  <input
                    type="radio"
                    value={level.id}
                    checked={filters.experience === level.id}
                    onChange={(e) => updateFilter('experience', e.target.value)}
                    className="sr-only"
                  />
                  <div className="font-medium text-gray-900">{level.name}</div>
                  <div className="text-xs text-gray-600">{level.desc}</div>
                </label>
              ))}
            </div>
          </div>
        </div>
      </div>

      {/* AI Matching Summary */}
      {Object.values(filters).some(v => v) && (
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="bg-gradient-to-r from-blue-50 to-indigo-50 rounded-xl p-6 mb-8"
        >
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-lg font-semibold text-gray-900">🤖 AI Match Analysis</h3>
            <div className="flex items-center space-x-4">
              <button
                onClick={() => setViewMode('cards')}
                className={`p-2 rounded-lg ${viewMode === 'cards' ? 'bg-blue-600 text-white' : 'bg-white text-gray-600'}`}
              >
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M4 6a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2H6a2 2 0 01-2-2V6zM14 6a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2h-2a2 2 0 01-2-2V6zM4 16a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2H6a2 2 0 01-2-2v-2zM14 16a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2h-2a2 2 0 01-2-2v-2z" />
                </svg>
              </button>
              <button
                onClick={() => setViewMode('list')}
                className={`p-2 rounded-lg ${viewMode === 'list' ? 'bg-blue-600 text-white' : 'bg-white text-gray-600'}`}
              >
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M4 6h16M4 10h16M4 14h16M4 18h16" />
                </svg>
              </button>
            </div>
          </div>

          <div className="grid grid-cols-4 gap-4 text-center">
            <div className="bg-white rounded-lg p-4">
              <div className="text-2xl font-bold text-blue-600">{matchedPlatforms.length}</div>
              <div className="text-sm text-gray-600">Matches Found</div>
            </div>
            <div className="bg-white rounded-lg p-4">
              <div className="text-2xl font-bold text-green-600">
                {matchedPlatforms.length > 0 ? Math.round(matchedPlatforms.reduce((acc, p) => acc + p.aiMatchScore, 0) / matchedPlatforms.length) : 0}%
              </div>
              <div className="text-sm text-gray-600">Avg Match Score</div>
            </div>
            <div className="bg-white rounded-lg p-4">
              <div className="text-2xl font-bold text-purple-600">
                {matchedPlatforms.length > 0 ? formatCurrency(Math.min(...matchedPlatforms.map(p => p.price))) : '-'}
              </div>
              <div className="text-sm text-gray-600">Starting Price</div>
            </div>
            <div className="bg-white rounded-lg p-4">
              <div className="text-2xl font-bold text-orange-600">2-4 weeks</div>
              <div className="text-sm text-gray-600">Est. Launch Time</div>
            </div>
          </div>
        </motion.div>
      )}

      {/* Platform Results */}
      {isLoading ? (
        <div className="flex items-center justify-center py-12">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div>
          <span className="ml-3 text-lg text-gray-600">Finding perfect matches...</span>
        </div>
      ) : matchedPlatforms.length > 0 ? (
        <div className={viewMode === 'cards' ? 'grid lg:grid-cols-2 xl:grid-cols-3 gap-6' : 'space-y-4'}>
          {matchedPlatforms.map(platform => (
            <motion.div
              key={platform.id}
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              className={`bg-white rounded-xl border border-gray-200 shadow-sm hover:shadow-lg transition-all ${
                viewMode === 'list' ? 'flex items-center p-4 space-x-6' : 'overflow-hidden'
              }`}
            >
              {viewMode === 'cards' ? (
                <>
                  {/* Card Header */}
                  <div className="p-6 pb-0">
                    <div className="flex items-start justify-between mb-4">
                      <div>
                        <h3 className="text-xl font-semibold text-gray-900 mb-1">{platform.name}</h3>
                        <p className="text-gray-600 text-sm">{platform.seller}</p>
                      </div>
                      <div className={`px-3 py-1 rounded-full text-sm font-medium ${getMatchColor(platform.aiMatchScore)}`}>
                        {platform.aiMatchScore}% match
                      </div>
                    </div>

                    <p className="text-gray-700 text-sm leading-relaxed mb-4">{platform.description}</p>

                    <div className="flex items-center space-x-4 text-sm text-gray-600">
                      <span className="flex items-center">
                        <svg className="w-4 h-4 mr-1 text-yellow-500" fill="currentColor" viewBox="0 0 20 20">
                          <path d="M9.049 2.927c.3-.921 1.603-.921 1.902 0l1.07 3.292a1 1 0 00.95.69h3.462c.969 0 1.371 1.24.588 1.81l-2.8 2.034a1 1 0 00-.364 1.118l1.07 3.292c.3.921-.755 1.688-1.54 1.118l-2.8-2.034a1 1 0 00-1.175 0l-2.8 2.034c-.784.57-1.838-.197-1.539-1.118l1.07-3.292a1 1 0 00-.364-1.118L2.98 8.72c-.783-.57-.38-1.81.588-1.81h3.461a1 1 0 00.951-.69l1.07-3.292z" />
                        </svg>
                        {platform.rating}/5
                      </span>
                      <span>{platform.readinessScore}% ready</span>
                      <span>{platform.userBase}</span>
                    </div>
                  </div>

                  {/* Tech Stack */}
                  <div className="px-6 py-3">
                    <div className="flex flex-wrap gap-2">
                      {platform.techStack.slice(0, 4).map(tech => (
                        <span key={tech} className="px-2 py-1 bg-gray-100 text-gray-700 text-xs rounded-full">
                          {tech}
                        </span>
                      ))}
                      {platform.techStack.length > 4 && (
                        <span className="px-2 py-1 bg-gray-100 text-gray-500 text-xs rounded-full">
                          +{platform.techStack.length - 4} more
                        </span>
                      )}
                    </div>
                  </div>

                  {/* Card Footer */}
                  <div className="p-6 pt-0 border-t border-gray-100">
                    <div className="flex items-center justify-between mb-4">
                      <div>
                        <div className="text-2xl font-bold text-gray-900">{formatCurrency(platform.price)}</div>
                        <div className="text-sm text-gray-600">Est. revenue: {platform.estimatedRevenue}/month</div>
                      </div>
                      <div className="text-right">
                        <div className="text-sm font-medium text-green-600">{platform.launchTime}</div>
                        <div className="text-xs text-gray-600">to launch</div>
                      </div>
                    </div>

                    <div className="flex space-x-3">
                      <button className="flex-1 bg-blue-600 text-white py-2 px-4 rounded-lg font-medium hover:bg-blue-700 transition-colors">
                        View Details
                      </button>
                      <button className="px-4 py-2 border border-gray-300 rounded-lg text-gray-700 hover:bg-gray-50 transition-colors">
                        Save
                      </button>
                    </div>
                  </div>
                </>
              ) : (
                /* List View */
                <>
                  <div className="flex-1">
                    <div className="flex items-start justify-between">
                      <div>
                        <h3 className="text-lg font-semibold text-gray-900">{platform.name}</h3>
                        <p className="text-gray-600 text-sm mb-2">{platform.description}</p>
                        <div className="flex items-center space-x-4 text-sm text-gray-600">
                          <span>{platform.rating}/5 ⭐</span>
                          <span>{platform.readinessScore}% ready</span>
                          <span>{platform.userBase}</span>
                        </div>
                      </div>
                      <div className={`px-3 py-1 rounded-full text-sm font-medium ${getMatchColor(platform.aiMatchScore)}`}>
                        {platform.aiMatchScore}% match
                      </div>
                    </div>
                  </div>

                  <div className="text-right">
                    <div className="text-xl font-bold text-gray-900">{formatCurrency(platform.price)}</div>
                    <div className="text-sm text-gray-600">{platform.launchTime} to launch</div>
                    <div className="flex space-x-2 mt-2">
                      <button className="bg-blue-600 text-white py-1 px-3 rounded text-sm font-medium hover:bg-blue-700">
                        View Details
                      </button>
                      <button className="border border-gray-300 py-1 px-3 rounded text-sm text-gray-700 hover:bg-gray-50">
                        Save
                      </button>
                    </div>
                  </div>
                </>
              )}
            </motion.div>
          ))}
        </div>
      ) : Object.values(filters).some(v => v) ? (
        <div className="text-center py-12">
          <div className="text-6xl mb-4">🔍</div>
          <h3 className="text-xl font-semibold text-gray-900 mb-2">No matches found</h3>
          <p className="text-gray-600 mb-6">Try adjusting your filters to see more options</p>
          <button
            onClick={() => setFilters({
              businessType: '', budget: '', timeline: '', industry: '',
              techPreference: '', teamSize: '', experience: ''
            })}
            className="bg-blue-600 text-white py-2 px-6 rounded-lg font-medium hover:bg-blue-700"
          >
            Reset Filters
          </button>
        </div>
      ) : (
        <div className="text-center py-12">
          <div className="text-6xl mb-4">🚀</div>
          <h3 className="text-xl font-semibold text-gray-900 mb-2">Start Your Discovery</h3>
          <p className="text-gray-600">Fill out the form above to find platforms that match your needs</p>
        </div>
      )}
    </div>
  );
}