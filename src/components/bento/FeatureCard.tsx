import React from 'react';

interface FeatureCardProps {
  icon?: React.ReactNode;
  title: string;
  description: string;
  color?: 'indigo' | 'purple' | 'blue' | 'green' | 'orange';
  animate?: boolean;
}

export const FeatureCard: React.FC<FeatureCardProps> = ({ 
  icon, 
  title, 
  description, 
  color = 'indigo',
  animate = false 
}) => {
  const colorClasses = {
    indigo: 'from-indigo-500 to-indigo-600 text-indigo-900',
    purple: 'from-purple-500 to-purple-600 text-purple-900',
    blue: 'from-blue-500 to-blue-600 text-blue-900',
    green: 'from-green-500 to-green-600 text-green-900',
    orange: 'from-orange-500 to-orange-600 text-orange-900',
  };

  return (
    <div className={`h-full flex flex-col ${animate ? 'animate-slide-up' : ''}`}>
      {icon && (
        <div className={`w-16 h-16 rounded-2xl bg-gradient-to-br ${colorClasses[color]} bg-opacity-10 flex items-center justify-center mb-4`}>
          <div className="text-3xl">{icon}</div>
        </div>
      )}
      <h3 className="text-xl font-bold mb-2">{title}</h3>
      <p className="text-gray-600 flex-grow">{description}</p>
    </div>
  );
};

interface IdeaPreviewProps {
  category: string;
  title: string;
  description: string;
  price: string;
  marketSize?: string;
  color?: 'indigo' | 'purple' | 'blue' | 'green' | 'orange';
}

export const IdeaPreview: React.FC<IdeaPreviewProps> = ({ 
  category, 
  title, 
  description, 
  price,
  marketSize,
  color = 'indigo' 
}) => {
  const colorClasses = {
    indigo: 'text-indigo-600 bg-indigo-50',
    purple: 'text-purple-600 bg-purple-50',
    blue: 'text-blue-600 bg-blue-50',
    green: 'text-green-600 bg-green-50',
    orange: 'text-orange-600 bg-orange-50',
  };

  return (
    <div className="h-full flex flex-col">
      <span className={`text-sm font-semibold px-3 py-1 rounded-full inline-block mb-3 ${colorClasses[color]}`}>
        {category}
      </span>
      <h3 className="text-lg font-bold mb-2 line-clamp-2">{title}</h3>
      <p className="text-gray-600 text-sm mb-4 flex-grow line-clamp-3">{description}</p>
      {marketSize && (
        <p className="text-sm text-gray-500 mb-2">Market: {marketSize}</p>
      )}
      <div className="flex justify-between items-center mt-auto">
        <span className="text-2xl font-bold text-indigo-900">{price}</span>
        <button className="text-indigo-600 hover:text-indigo-800 font-medium text-sm">
          View Details →
        </button>
      </div>
    </div>
  );
};
