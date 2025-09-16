import React, { useState, useEffect, useMemo } from 'react';
import { platforms, filterPlatforms, sortPlatforms, getFeaturedPlatforms } from '../data/platforms.js';

interface Platform {
  id: string;
  title: string;
  slug: string;
  elevator_pitch: string;
  description: string;
  industry: string;
  price: number;
  ai_score: number;
  views_count: number;
  created_at: string;
  tech_stack: string[];
  category: string;
  isFeatured?: boolean;
}

interface FilterState {
  query: string;
  category: string;
  minPrice: number | null;
  maxPrice: number | null;
  sortBy: string;
  sortOrder: string;
}

export default function BrowsePlatforms() {
  const [filters, setFilters] = useState<FilterState>({
    query: '',
    category: '',
    minPrice: null,
    maxPrice: null,
    sortBy: 'created_at',
    sortOrder: 'desc'
  });

  const [loading, setLoading] = useState(false);

  // Get filtered and sorted platforms
  const filteredPlatforms = useMemo(() => {
    let filtered = filterPlatforms(platforms, filters);
    return sortPlatforms(filtered, filters.sortBy, filters.sortOrder);
  }, [filters]);

  const featuredPlatforms = useMemo(() => getFeaturedPlatforms(), []);

  const handleSearchChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setFilters(prev => ({ ...prev, query: e.target.value }));
  };

  const handleCategoryChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
    setFilters(prev => ({ ...prev, category: e.target.value }));
  };

  const handlePriceChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
    const value = e.target.value;
    let minPrice = null, maxPrice = null;

    if (value === '0-25000') {
      minPrice = 0;
      maxPrice = 25000;
    } else if (value === '25000-75000') {
      minPrice = 25000;
      maxPrice = 75000;
    } else if (value === '75000+') {
      minPrice = 75000;
      maxPrice = null;
    }

    setFilters(prev => ({ ...prev, minPrice, maxPrice }));
  };

  const handleSortChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
    const [sortBy, sortOrder] = e.target.value.split('-');
    setFilters(prev => ({ ...prev, sortBy, sortOrder }));
  };

  const resetFilters = () => {
    setFilters({
      query: '',
      category: '',
      minPrice: null,
      maxPrice: null,
      sortBy: 'created_at',
      sortOrder: 'desc'
    });
  };

  const formatPrice = (price: number) => {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'USD',
      minimumFractionDigits: 0,
    }).format(price);
  };

  const truncateText = (text: string, maxLength: number) => {
    if (text.length <= maxLength) return text;
    return text.substring(0, maxLength).trim() + '...';
  };

  const PlatformCard = ({ platform, featured = false }: { platform: Platform; featured?: boolean }) => (
    <div className={`bg-gray-900/50 backdrop-blur-md rounded-2xl border transition-all duration-300 hover:scale-105 hover:border-yellow-400/50 h-full flex flex-col ${
      featured ? 'border-yellow-400/30 ring-1 ring-yellow-400/20' : 'border-gray-700/50 hover:border-yellow-400/50'
    }`}>
      {/* Header */}
      <div className="p-6 flex-1 flex flex-col">
        <div className="flex items-center justify-between mb-4">
          <span className="text-xs font-medium px-3 py-1 rounded-full bg-blue-500/20 text-blue-300 border border-blue-500/30">
            {platform.category.replace('-', ' ').replace(/\b\w/g, l => l.toUpperCase())}
          </span>
          {featured && (
            <span className="text-xs font-medium px-2 py-1 rounded-full bg-yellow-400/20 text-yellow-300 border border-yellow-400/30">
              Featured
            </span>
          )}
          <div className="flex items-center gap-1">
            <svg className="w-4 h-4 text-yellow-400" fill="currentColor" viewBox="0 0 20 20">
              <path d="M9.049 2.927c.3-.921 1.603-.921 1.902 0l1.07 3.292a1 1 0 00.95.69h3.462c.969 0 1.371 1.24.588 1.81l-2.8 2.034a1 1 0 00-.364 1.118l1.07 3.292c.3.921-.755 1.688-1.54 1.118l-2.8-2.034a1 1 0 00-1.175 0l-2.8 2.034c-.784.57-1.838-.197-1.539-1.118l1.07-3.292a1 1 0 00-.364-1.118L2.98 8.72c-.783-.57-.38-1.81.588-1.81h3.461a1 1 0 00.951-.69l1.07-3.292z"/>
            </svg>
            <span className="text-sm font-bold text-white">{platform.ai_score}</span>
          </div>
        </div>

        <h3 className="text-lg font-bold text-white mb-2 line-clamp-1">{platform.title}</h3>
        <p className="text-sm text-gray-300 mb-4 flex-1 line-clamp-2">
          {truncateText(platform.elevator_pitch, 100)}
        </p>

        {/* Metrics */}
        <div className="grid grid-cols-2 gap-3 mb-4">
          <div className="bg-black/30 rounded-lg p-3 border border-gray-700/50">
            <div className="text-xs text-gray-400 mb-1">Industry</div>
            <div className="font-semibold text-white text-sm">
              {platform.industry.replace('-', ' ').replace(/\b\w/g, l => l.toUpperCase())}
            </div>
          </div>
          <div className="bg-black/30 rounded-lg p-3 border border-gray-700/50">
            <div className="text-xs text-gray-400 mb-1">Views</div>
            <div className="font-semibold text-white text-sm">{platform.views_count.toLocaleString()}</div>
          </div>
        </div>

        {/* Tech Stack */}
        <div className="mb-4">
          <div className="text-xs text-gray-400 mb-2">Tech Stack</div>
          <div className="flex flex-wrap gap-1">
            {platform.tech_stack.slice(0, 3).map((tech, index) => (
              <span
                key={index}
                className="text-xs px-2 py-1 rounded bg-gray-800/50 text-gray-300 border border-gray-700/50"
              >
                {tech}
              </span>
            ))}
            {platform.tech_stack.length > 3 && (
              <span className="text-xs px-2 py-1 rounded bg-gray-800/50 text-gray-400 border border-gray-700/50">
                +{platform.tech_stack.length - 3}
              </span>
            )}
          </div>
        </div>

        {/* Stats */}
        <div className="flex justify-between items-center text-xs text-gray-400 mb-4">
          <span>Listed {new Date(platform.created_at).toLocaleDateString()}</span>
          <span>{platform.views_count} views</span>
        </div>
      </div>

      {/* Footer */}
      <div className="p-6 pt-0 mt-auto">
        <div className="flex items-center justify-between">
          <div>
            <div className="text-xs text-gray-400">Starting at</div>
            <div className="text-xl font-bold text-white">{formatPrice(platform.price)}</div>
          </div>
          <a
            href={`/listing/${platform.slug}`}
            className="bg-yellow-400 text-black px-4 py-2 rounded-lg font-semibold text-sm hover:bg-yellow-300 transition-colors"
          >
            View Details
          </a>
        </div>
      </div>
    </div>
  );

  return (
    <div className="min-h-screen bg-black text-white">
      {/* Search and Filter Bar */}
      <div className="container mx-auto px-4 pt-32 pb-8">
        <div className="max-w-4xl mx-auto text-center mb-8">
          <h1 className="text-4xl md:text-5xl lg:text-6xl font-black leading-tight mb-6">
            <span className="block text-white">Browse Complete</span>
            <span className="block text-yellow-400">Business Platforms</span>
          </h1>
          <p className="text-xl md:text-2xl text-gray-300 mb-8">
            AI-validated platforms with complete business foundations, fair AI-powered pricing, and instant deployment capabilities.
          </p>

          <div className="bg-black/50 backdrop-blur-sm rounded-xl p-6 border border-yellow-400/20">
            <div className="flex flex-col md:flex-row gap-4">
              <input
                type="text"
                placeholder="Search platforms..."
                value={filters.query}
                onChange={handleSearchChange}
                className="flex-grow px-4 py-3 rounded-lg bg-gray-900/50 backdrop-blur-sm border border-yellow-400/30 text-white placeholder-gray-400 focus:outline-none focus:border-yellow-400/60 focus:bg-gray-900/70"
              />
              <select
                value={filters.category}
                onChange={handleCategoryChange}
                className="px-4 py-3 rounded-lg bg-gray-900/50 backdrop-blur-sm border border-yellow-400/30 text-white focus:outline-none focus:border-yellow-400/60"
              >
                <option value="">All Categories</option>
                <option value="hr-compliance">HR Compliance</option>
                <option value="legal-saas">Legal SaaS</option>
                <option value="fintech">FinTech</option>
                <option value="healthcare">Healthcare</option>
                <option value="marketing-tools">Marketing Tools</option>
                <option value="restaurant-tech">Restaurant Tech</option>
                <option value="real-estate">Real Estate</option>
                <option value="fitness-tech">Fitness Tech</option>
                <option value="education-tech">Education Tech</option>
                <option value="iot-platform">IoT Platform</option>
              </select>
              <select
                onChange={handlePriceChange}
                className="px-4 py-3 rounded-lg bg-gray-900/50 backdrop-blur-sm border border-yellow-400/30 text-white focus:outline-none focus:border-yellow-400/60"
              >
                <option value="">All Prices</option>
                <option value="0-25000">Under $25K</option>
                <option value="25000-75000">$25K - $75K</option>
                <option value="75000+">$75K+</option>
              </select>
              <select
                value={`${filters.sortBy}-${filters.sortOrder}`}
                onChange={handleSortChange}
                className="px-4 py-3 rounded-lg bg-gray-900/50 backdrop-blur-sm border border-yellow-400/30 text-white focus:outline-none focus:border-yellow-400/60"
              >
                <option value="created_at-desc">Newest First</option>
                <option value="created_at-asc">Oldest First</option>
                <option value="price-asc">Price: Low to High</option>
                <option value="price-desc">Price: High to Low</option>
                <option value="ai_score-desc">Highest AI Score</option>
                <option value="views_count-desc">Most Popular</option>
              </select>
            </div>
          </div>
        </div>
      </div>

      {/* Featured Platforms */}
      {featuredPlatforms.length > 0 && (
        <section className="py-16 bg-gradient-to-r from-black via-gray-900 to-black">
          <div className="container mx-auto px-4">
            <div className="text-center mb-12">
              <h2 className="text-3xl md:text-4xl font-bold text-white mb-4">Featured Platforms</h2>
              <p className="text-xl text-gray-300 max-w-2xl mx-auto">
                AI-certified, market-validated platforms with comprehensive business foundations
              </p>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8 max-w-7xl mx-auto">
              {featuredPlatforms.map((platform) => (
                <PlatformCard key={platform.id} platform={platform} featured={true} />
              ))}
            </div>
          </div>
        </section>
      )}

      {/* All Platforms */}
      <section className="py-24 bg-gradient-to-br from-black to-gray-900">
        <div className="container mx-auto px-4">
          <div className="text-center mb-12">
            <h2 className="text-3xl md:text-4xl font-bold text-white mb-4">All Platforms</h2>
            <p className="text-lg text-gray-300 max-w-2xl mx-auto">
              Discover AI-validated business platforms with complete foundations, fair pricing, and instant deployment
            </p>
          </div>

          {/* Results Summary */}
          <div className="flex justify-between items-center mb-6">
            <div className="text-gray-300 text-sm">
              Showing {filteredPlatforms.length} platform{filteredPlatforms.length !== 1 ? 's' : ''}
            </div>
            {(filters.query || filters.category || filters.minPrice !== null || filters.maxPrice !== null) && (
              <button
                onClick={resetFilters}
                className="text-sm text-yellow-400 hover:text-yellow-300 underline"
              >
                Clear filters
              </button>
            )}
          </div>

          {/* Platforms Grid */}
          {filteredPlatforms.length === 0 ? (
            <div className="text-center py-16">
              <div className="mx-auto w-24 h-24 bg-gray-800/50 rounded-full flex items-center justify-center mb-6">
                <svg className="w-12 h-12 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M19 11H5m14 0a2 2 0 012 2v6a2 2 0 01-2 2H5a2 2 0 01-2-2v-6a2 2 0 012-2m14 0V9a2 2 0 00-2-2M5 11V9a2 2 0 012-2m0 0V5a2 2 0 012-2h6a2 2 0 012 2v2M7 7h10"/>
                </svg>
              </div>
              <h3 className="text-xl font-bold text-white mb-2">No platforms found</h3>
              <p className="text-gray-400 mb-6">Try adjusting your search criteria or browse all categories</p>
              <button
                onClick={resetFilters}
                className="inline-flex items-center gap-2 bg-yellow-400 text-black px-6 py-3 rounded-lg font-semibold hover:bg-yellow-300 transition-colors"
              >
                Reset Filters
              </button>
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
              {filteredPlatforms.map((platform, index) => (
                <div
                  key={platform.id}
                  className="animate-fade-in"
                  style={{ animationDelay: `${index * 100}ms` }}
                >
                  <PlatformCard platform={platform} />
                </div>
              ))}
            </div>
          )}
        </div>
      </section>
    </div>
  );
}