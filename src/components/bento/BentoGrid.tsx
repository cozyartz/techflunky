import React from 'react';

interface BentoBoxProps {
  size?: 'small' | 'medium' | 'large' | 'wide' | 'tall';
  className?: string;
  children: React.ReactNode;
  hover?: boolean;
  glow?: boolean;
  gradient?: boolean;
}

export const BentoBox: React.FC<BentoBoxProps> = ({ 
  size = 'medium', 
  className = '', 
  children, 
  hover = true,
  glow = false,
  gradient = false
}) => {
  const sizeClasses = {
    small: 'col-span-1 row-span-1',
    medium: 'col-span-2 row-span-2',
    large: 'col-span-3 row-span-3',
    wide: 'col-span-3 row-span-2',
    tall: 'col-span-2 row-span-3',
  };

  const baseClasses = `
    rounded-2xl p-6 transition-all duration-300
    ${gradient ? 'bg-gradient-to-br' : 'bg-white'}
    ${hover ? 'hover:shadow-xl hover:-translate-y-1' : ''}
    ${glow ? 'animate-glow' : ''}
    border border-bento-border
  `;

  return (
    <div className={`${baseClasses} ${sizeClasses[size]} ${className}`}>
      {children}
    </div>
  );
};

interface BentoGridProps {
  children: React.ReactNode;
  className?: string;
}

export const BentoGrid: React.FC<BentoGridProps> = ({ children, className = '' }) => {
  return (
    <div className={`grid grid-cols-4 md:grid-cols-8 lg:grid-cols-12 gap-4 auto-rows-[120px] ${className}`}>
      {children}
    </div>
  );
};
