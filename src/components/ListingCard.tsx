import React from 'react';

interface ListingCardProps {
  listing: {
    id: string;
    title: string;
    slug: string;
    description: string;
    category: string;
    price: number;
    packageTier: 'concept' | 'blueprint' | 'launch_ready';
    aiScore?: number;
    sellerName: string;
    avatarUrl?: string;
  };
}

const tierColors = {
  concept: 'text-green-600 bg-green-100',
  blueprint: 'text-blue-600 bg-blue-100',
  launch_ready: 'text-purple-600 bg-purple-100'
};

const tierLabels = {
  concept: 'Concept',
  blueprint: 'Blueprint',
  launch_ready: 'Launch Ready'
};

export default function ListingCard({ listing }: ListingCardProps) {
  const formattedPrice = new Intl.NumberFormat('en-US', {
    style: 'currency',
    currency: 'USD',
    maximumFractionDigits: 0
  }).format(listing.price / 100);

  return (
    <div className="border rounded-lg p-6 hover:shadow-lg transition-shadow duration-200 bg-white">
      <div className="flex justify-between items-start mb-3">
        <span className={`text-xs font-semibold px-2 py-1 rounded ${tierColors[listing.packageTier]}`}>
          {tierLabels[listing.packageTier]}
        </span>
        {listing.aiScore && (
          <div className="text-sm text-gray-600">
            Score: {listing.aiScore}/100
          </div>
        )}
      </div>
      
      <h3 className="text-xl font-bold mb-2 text-gray-900">
        {listing.title}
      </h3>
      
      <p className="text-gray-600 mb-4 line-clamp-2">
        {listing.description}
      </p>
      
      <div className="flex items-center text-sm text-gray-500 mb-4">
        <span className="capitalize">{listing.category}</span>
      </div>
      
      <div className="flex justify-between items-end">
        <div className="flex items-center gap-2">
          {listing.avatarUrl ? (
            <img 
              src={listing.avatarUrl} 
              alt={listing.sellerName}
              className="w-8 h-8 rounded-full"
            />
          ) : (
            <div className="w-8 h-8 rounded-full bg-gray-300 flex items-center justify-center text-sm">
              {listing.sellerName[0]}
            </div>
          )}
          <span className="text-sm text-gray-600">{listing.sellerName}</span>
        </div>
        
        <div className="text-right">
          <div className="text-2xl font-bold text-indigo-900">
            {formattedPrice}
          </div>
          <a 
            href={`/listing/${listing.slug}`}
            className="text-indigo-600 hover:text-indigo-800 text-sm font-medium"
          >
            View Details →
          </a>
        </div>
      </div>
    </div>
  );
}
