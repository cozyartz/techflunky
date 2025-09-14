import React, { useEffect, useState } from 'react';

interface AnimatedStatProps {
  value: string;
  label: string;
  prefix?: string;
  suffix?: string;
  duration?: number;
}

export const AnimatedStat: React.FC<AnimatedStatProps> = ({ 
  value, 
  label, 
  prefix = '', 
  suffix = '',
  duration = 2000 
}) => {
  const [displayValue, setDisplayValue] = useState('0');
  
  useEffect(() => {
    // Extract numeric value
    const numericValue = parseFloat(value.replace(/[^0-9.]/g, ''));
    const increment = numericValue / (duration / 50);
    let current = 0;
    
    const timer = setInterval(() => {
      current += increment;
      if (current >= numericValue) {
        setDisplayValue(value);
        clearInterval(timer);
      } else {
        setDisplayValue(Math.floor(current).toString());
      }
    }, 50);
    
    return () => clearInterval(timer);
  }, [value, duration]);
  
  return (
    <div className="text-center">
      <div className="text-3xl md:text-4xl font-bold text-indigo-900 animate-fade-in">
        {prefix}{displayValue}{suffix}
      </div>
      <div className="text-gray-600 mt-2">{label}</div>
    </div>
  );
};
