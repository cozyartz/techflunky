import React from 'react';
import { motion } from 'framer-motion';
import { clsx } from 'clsx';
import { twMerge } from 'tailwind-merge';

interface BentoBoxProps {
  size?: 'small' | 'medium' | 'large' | 'wide' | 'tall';
  className?: string;
  children: React.ReactNode;
  hover?: boolean;
  glow?: boolean;
  gradient?: boolean;
  delay?: number;
}

export const BentoBox: React.FC<BentoBoxProps> = ({ 
  size = 'medium', 
  className = '', 
  children, 
  hover = true,
  glow = false,
  gradient = false,
  delay = 0
}) => {
  const sizeClasses = {
    small: 'col-span-1 row-span-1 lg:col-span-2 lg:row-span-1',
    medium: 'col-span-2 row-span-2 lg:col-span-3 lg:row-span-2',
    large: 'col-span-4 row-span-3 lg:col-span-6 lg:row-span-3',
    wide: 'col-span-4 row-span-2 lg:col-span-6 lg:row-span-1',
    tall: 'col-span-2 row-span-3 lg:col-span-3 lg:row-span-3',
  };

  const baseClasses = twMerge(clsx(
    'rounded-2xl p-6 transition-all duration-300',
    gradient ? 'bg-gradient-to-br' : 'bg-white',
    hover ? 'hover:shadow-xl hover:-translate-y-1' : '',
    glow ? 'animate-glow' : '',
    'border border-bento-border overflow-hidden relative'
  ));

  return (
    <motion.div 
      className={twMerge(baseClasses, sizeClasses[size], className)}
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.5, delay }}
      whileHover={hover ? { scale: 1.02 } : {}}
    >
      {glow && (
        <div className="absolute inset-0 bg-gradient-to-r from-purple-400 to-indigo-400 opacity-0 hover:opacity-20 transition-opacity duration-300 pointer-events-none" />
      )}
      {children}
    </motion.div>
  );
};

interface BentoGridProps {
  children: React.ReactNode;
  className?: string;
}

export const BentoGrid: React.FC<BentoGridProps> = ({ children, className = '' }) => {
  return (
    <div className={twMerge(
      'grid grid-cols-4 md:grid-cols-8 lg:grid-cols-12 gap-4 auto-rows-[120px]',
      className
    )}>
      {children}
    </div>
  );
};

// Interactive hover effect component
export const BentoHoverEffect: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  return (
    <motion.div
      className="h-full"
      whileHover={{ scale: 1.05 }}
      transition={{ type: "spring", stiffness: 300 }}
    >
      {children}
    </motion.div>
  );
};
