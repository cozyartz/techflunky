import React, { useState } from 'react';

interface Platform {
  id: string;
  title: string;
  category: string;
  price: number;
  status: 'draft' | 'pending' | 'active' | 'sold' | 'rejected';
  views: number;
  inquiries: number;
  aiScore: number;
  listedDate: string;
  thumbnail?: string;
  description: string;
  technologies: string[];
}

interface ListingManagerProps {
  platforms?: Platform[];
  loading?: boolean;
  onEditPlatform?: (platformId: string) => void;
  onDeletePlatform?: (platformId: string) => void;
  onPromotePlatform?: (platformId: string) => void;
  onViewAnalytics?: (platformId: string) => void;
}

const mockPlatforms: Platform[] = [
  {
    id: '1',
    title: 'AI HR Compliance Platform',
    category: 'HR & Compliance',
    price: 35000,
    status: 'active',
    views: 1245,
    inquiries: 8,
    aiScore: 9.2,
    listedDate: '2024-01-15',
    description: 'Complete multi-state leave administration system with AI automation',
    technologies: ['React', 'Node.js', 'Cloudflare', 'AI/ML']
  },
  {
    id: '2',
    title: 'Healthcare Analytics Suite',
    category: 'Healthcare',
    price: 28500,
    status: 'sold',
    views: 892,
    inquiries: 12,
    aiScore: 8.9,
    listedDate: '2024-01-08',
    description: 'Medical data analysis and reporting platform',
    technologies: ['Vue.js', 'Python', 'PostgreSQL', 'D3.js']
  },
  {
    id: '3',
    title: 'E-commerce Marketplace',
    category: 'E-commerce',
    price: 18000,
    status: 'pending',
    views: 234,
    inquiries: 3,
    aiScore: 7.8,
    listedDate: '2024-01-20',
    description: 'Multi-vendor marketplace with payment integration',
    technologies: ['Next.js', 'Stripe', 'MongoDB', 'Redis']
  },
  {
    id: '4',
    title: 'Financial Trading Bot',
    category: 'FinTech',
    price: 42000,
    status: 'draft',
    views: 0,
    inquiries: 0,
    aiScore: 0,
    listedDate: '2024-01-22',
    description: 'Automated cryptocurrency trading system',
    technologies: ['Python', 'WebSocket', 'Docker', 'API Integration']
  }
];

export default function ListingManager({
  platforms = mockPlatforms,
  loading = false,
  onEditPlatform,
  onDeletePlatform,
  onPromotePlatform,
  onViewAnalytics
}: ListingManagerProps) {
  const [filterStatus, setFilterStatus] = useState<string>('all');
  const [sortBy, setSortBy] = useState<string>('newest');
  const [searchTerm, setSearchTerm] = useState('');

  const getStatusColor = (status: Platform['status']) => {
    switch (status) {
      case 'active':
        return 'bg-green-400/10 text-green-400 border-green-400/20';
      case 'pending':
        return 'bg-orange-400/10 text-orange-400 border-orange-400/20';
      case 'sold':
        return 'bg-blue-400/10 text-blue-400 border-blue-400/20';
      case 'rejected':
        return 'bg-red-400/10 text-red-400 border-red-400/20';
      case 'draft':
        return 'bg-gray-400/10 text-gray-400 border-gray-400/20';
      default:
        return 'bg-gray-400/10 text-gray-400 border-gray-400/20';
    }
  };

  const getStatusIcon = (status: Platform['status']) => {
    switch (status) {
      case 'active':
        return (
          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
          </svg>
        );
      case 'pending':
        return (
          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
          </svg>
        );
      case 'sold':
        return (
          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8c-1.657 0-3 .895-3 2s1.343 2 3 2 3 .895 3 2-1.343 2-3 2m0-8c1.11 0 2.08.402 2.599 1M12 8V7m0 1v8m0 0v1m0-1c-1.11 0-2.08-.402-2.599-1M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
          </svg>
        );
      case 'rejected':
        return (
          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
          </svg>
        );
      case 'draft':
        return (
          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
          </svg>
        );
      default:
        return null;
    }
  };

  const filteredPlatforms = platforms
    .filter(platform => {
      if (filterStatus !== 'all' && platform.status !== filterStatus) return false;
      if (searchTerm && !platform.title.toLowerCase().includes(searchTerm.toLowerCase())) return false;
      return true;
    })
    .sort((a, b) => {
      switch (sortBy) {
        case 'newest':
          return new Date(b.listedDate).getTime() - new Date(a.listedDate).getTime();
        case 'oldest':
          return new Date(a.listedDate).getTime() - new Date(b.listedDate).getTime();
        case 'price-high':
          return b.price - a.price;
        case 'price-low':
          return a.price - b.price;
        case 'views':
          return b.views - a.views;
        case 'score':
          return b.aiScore - a.aiScore;
        default:
          return 0;
      }
    });

  if (loading) {
    return (
      <div className="space-y-4">
        {[...Array(3)].map((_, i) => (
          <div key={i} className="bg-gradient-to-br from-gray-900/50 to-black/50 backdrop-blur-sm rounded-2xl border border-gray-700 p-6 animate-pulse">
            <div className="flex items-start space-x-4">
              <div className="w-20 h-20 bg-gray-700 rounded-lg"></div>
              <div className="flex-1 space-y-3">
                <div className="w-48 h-5 bg-gray-700 rounded"></div>
                <div className="w-32 h-4 bg-gray-700 rounded"></div>
                <div className="w-64 h-4 bg-gray-700 rounded"></div>
              </div>
              <div className="w-24 h-8 bg-gray-700 rounded"></div>
            </div>
          </div>
        ))}
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Filters and Search */}
      <div className="bg-gradient-to-br from-gray-900/50 to-black/50 backdrop-blur-sm rounded-2xl border border-yellow-400/20 p-6">
        <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between space-y-4 lg:space-y-0">
          {/* Search */}
          <div className="flex-1 lg:max-w-md">
            <div className="relative">
              <input
                type="text"
                placeholder="Search platforms..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="w-full bg-gray-800 border border-gray-700 rounded-lg px-4 py-2 pl-10 text-white placeholder-gray-400 focus:border-yellow-400 focus:ring-1 focus:ring-yellow-400 transition-colors"
              />
              <svg className="absolute left-3 top-3 w-4 h-4 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
              </svg>
            </div>
          </div>

          {/* Filters */}
          <div className="flex space-x-3">
            <select
              value={filterStatus}
              onChange={(e) => setFilterStatus(e.target.value)}
              className="bg-gray-800 border border-gray-700 rounded-lg px-3 py-2 text-white text-sm focus:border-yellow-400 focus:ring-1 focus:ring-yellow-400 transition-colors"
            >
              <option value="all">All Status</option>
              <option value="active">Active</option>
              <option value="pending">Pending</option>
              <option value="sold">Sold</option>
              <option value="draft">Draft</option>
              <option value="rejected">Rejected</option>
            </select>

            <select
              value={sortBy}
              onChange={(e) => setSortBy(e.target.value)}
              className="bg-gray-800 border border-gray-700 rounded-lg px-3 py-2 text-white text-sm focus:border-yellow-400 focus:ring-1 focus:ring-yellow-400 transition-colors"
            >
              <option value="newest">Newest First</option>
              <option value="oldest">Oldest First</option>
              <option value="price-high">Price: High to Low</option>
              <option value="price-low">Price: Low to High</option>
              <option value="views">Most Views</option>
              <option value="score">Highest Score</option>
            </select>
          </div>
        </div>
      </div>

      {/* Platform List */}
      <div className="space-y-4">
        {filteredPlatforms.length === 0 ? (
          <div className="bg-gradient-to-br from-gray-900/50 to-black/50 backdrop-blur-sm rounded-2xl border border-gray-700 p-12 text-center">
            <svg className="w-16 h-16 text-gray-600 mx-auto mb-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 11H5m14 0a2 2 0 012 2v6a2 2 0 01-2 2H5a2 2 0 01-2-2v-6a2 2 0 012-2m14 0V9a2 2 0 00-2-2M5 11V9a2 2 0 012-2m0 0V5a2 2 0 012-2h6a2 2 0 012 2v2M7 7h10" />
            </svg>
            <h3 className="text-lg font-medium text-white mb-2">No platforms found</h3>
            <p className="text-gray-400 mb-6">Try adjusting your search or filters</p>
            <button className="bg-yellow-400 text-black px-6 py-3 rounded-lg font-medium hover:bg-yellow-300 transition-colors">
              Create New Platform
            </button>
          </div>
        ) : (
          filteredPlatforms.map((platform) => (
            <div
              key={platform.id}
              className="bg-gradient-to-br from-gray-900/50 to-black/50 backdrop-blur-sm rounded-2xl border border-gray-700 hover:border-yellow-400/40 p-6 transition-all duration-300 group"
            >
              <div className="flex items-start space-x-6">
                {/* Platform Thumbnail */}
                <div className="flex-shrink-0">
                  <div className="w-20 h-20 bg-gradient-to-br from-yellow-400/20 to-yellow-400/10 border border-yellow-400/30 rounded-lg flex items-center justify-center group-hover:scale-105 transition-transform">
                    <svg className="w-8 h-8 text-yellow-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 11H5m14 0a2 2 0 012 2v6a2 2 0 01-2 2H5a2 2 0 01-2-2v-6a2 2 0 012-2m14 0V9a2 2 0 00-2-2M5 11V9a2 2 0 012-2m0 0V5a2 2 0 012-2h6a2 2 0 012 2v2M7 7h10" />
                    </svg>
                  </div>
                </div>

                {/* Platform Details */}
                <div className="flex-1 min-w-0">
                  <div className="flex items-start justify-between mb-3">
                    <div>
                      <h3 className="text-lg font-semibold text-white group-hover:text-yellow-400 transition-colors">
                        {platform.title}
                      </h3>
                      <p className="text-sm text-gray-400">{platform.category}</p>
                    </div>

                    <div className="text-right">
                      <div className="text-2xl font-bold text-green-400">
                        ${platform.price.toLocaleString()}
                      </div>
                      <div className={`inline-flex items-center space-x-1 px-2 py-1 rounded-full text-xs font-medium border ${getStatusColor(platform.status)}`}>
                        {getStatusIcon(platform.status)}
                        <span className="capitalize">{platform.status}</span>
                      </div>
                    </div>
                  </div>

                  <p className="text-gray-300 mb-4 line-clamp-2">{platform.description}</p>

                  {/* Technologies */}
                  <div className="flex flex-wrap gap-2 mb-4">
                    {platform.technologies.map((tech) => (
                      <span
                        key={tech}
                        className="px-2 py-1 text-xs bg-gray-800 text-gray-300 rounded-full border border-gray-700"
                      >
                        {tech}
                      </span>
                    ))}
                  </div>

                  {/* Stats */}
                  <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-4">
                    <div className="text-center">
                      <div className="text-lg font-semibold text-white">{platform.views.toLocaleString()}</div>
                      <div className="text-xs text-gray-400">Views</div>
                    </div>
                    <div className="text-center">
                      <div className="text-lg font-semibold text-white">{platform.inquiries}</div>
                      <div className="text-xs text-gray-400">Inquiries</div>
                    </div>
                    <div className="text-center">
                      <div className="text-lg font-semibold text-yellow-400">
                        {platform.aiScore > 0 ? platform.aiScore.toFixed(1) : 'N/A'}
                      </div>
                      <div className="text-xs text-gray-400">AI Score</div>
                    </div>
                    <div className="text-center">
                      <div className="text-lg font-semibold text-white">
                        {new Date(platform.listedDate).toLocaleDateString()}
                      </div>
                      <div className="text-xs text-gray-400">Listed</div>
                    </div>
                  </div>

                  {/* Actions */}
                  <div className="flex flex-wrap gap-2">
                    {onEditPlatform && (
                      <button
                        onClick={() => onEditPlatform(platform.id)}
                        className="px-3 py-1 text-sm bg-yellow-400/10 text-yellow-400 border border-yellow-400/20 rounded-lg hover:bg-yellow-400/20 transition-colors"
                      >
                        Edit
                      </button>
                    )}

                    {onViewAnalytics && platform.status === 'active' && (
                      <button
                        onClick={() => onViewAnalytics(platform.id)}
                        className="px-3 py-1 text-sm bg-blue-400/10 text-blue-400 border border-blue-400/20 rounded-lg hover:bg-blue-400/20 transition-colors"
                      >
                        Analytics
                      </button>
                    )}

                    {onPromotePlatform && platform.status === 'active' && (
                      <button
                        onClick={() => onPromotePlatform(platform.id)}
                        className="px-3 py-1 text-sm bg-purple-400/10 text-purple-400 border border-purple-400/20 rounded-lg hover:bg-purple-400/20 transition-colors"
                      >
                        Promote
                      </button>
                    )}

                    {platform.status === 'draft' && (
                      <button className="px-3 py-1 text-sm bg-green-400/10 text-green-400 border border-green-400/20 rounded-lg hover:bg-green-400/20 transition-colors">
                        Publish
                      </button>
                    )}

                    {onDeletePlatform && platform.status === 'draft' && (
                      <button
                        onClick={() => onDeletePlatform(platform.id)}
                        className="px-3 py-1 text-sm bg-red-400/10 text-red-400 border border-red-400/20 rounded-lg hover:bg-red-400/20 transition-colors"
                      >
                        Delete
                      </button>
                    )}
                  </div>
                </div>
              </div>
            </div>
          ))
        )}
      </div>

      {/* Pagination */}
      {filteredPlatforms.length > 0 && (
        <div className="flex items-center justify-center space-x-2">
          <button className="px-4 py-2 text-sm text-gray-400 hover:text-white border border-gray-700 rounded-lg hover:border-gray-600 transition-colors">
            Previous
          </button>
          <button className="px-4 py-2 text-sm bg-yellow-400 text-black rounded-lg font-medium">
            1
          </button>
          <button className="px-4 py-2 text-sm text-gray-400 hover:text-white border border-gray-700 rounded-lg hover:border-gray-600 transition-colors">
            2
          </button>
          <button className="px-4 py-2 text-sm text-gray-400 hover:text-white border border-gray-700 rounded-lg hover:border-gray-600 transition-colors">
            Next
          </button>
        </div>
      )}
    </div>
  );
}