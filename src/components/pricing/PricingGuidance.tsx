// Dynamic Pricing Guidance Component
import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';

interface PlatformData {
  platformType: string;
  techStack: string[];
  estimatedUsers: string;
  monthsInDevelopment: number;
  readinessItems: {
    hasLogo: boolean;
    hasBrandKit: boolean;
    hasBusinessPlan: boolean;
    hasFinancialProjections: boolean;
    hasSalesVideo: boolean;
    hasPitchDeck: boolean;
    hasExecutiveSummary: boolean;
    hasMarketingMaterials: boolean;
    hasLegalDocuments: boolean;
  };
}

interface PricingGuidanceProps {
  platformData: Partial<PlatformData>;
  currentPrice?: number;
  onPriceUpdate?: (suggestedPrice: number) => void;
}

interface PricingFactors {
  base: number;
  typeMultiplier: number;
  complexityBonus: number;
  readinessBonus: number;
  timeInvestmentBonus: number;
  userScaleBonus: number;
}

const PLATFORM_TYPE_VALUES = {
  'fintech': { base: 45000, multiplier: 1.4, description: 'High regulatory compliance value' },
  'healthtech': { base: 40000, multiplier: 1.3, description: 'Healthcare compliance premium' },
  'saas': { base: 25000, multiplier: 1.1, description: 'Proven business model' },
  'marketplace': { base: 35000, multiplier: 1.2, description: 'Network effects value' },
  'ecommerce': { base: 20000, multiplier: 1.0, description: 'Standard market value' },
  'edtech': { base: 22000, multiplier: 1.05, description: 'Educational sector demand' },
  'other': { base: 18000, multiplier: 0.9, description: 'Generic platform value' }
};

const TECH_STACK_VALUES = {
  'React': 2000, 'Vue.js': 1800, 'Angular': 2200, 'Next.js': 2500,
  'Node.js': 2000, 'Python': 1800, 'Django': 2200, 'Flask': 1500,
  'PostgreSQL': 1200, 'MongoDB': 1000, 'Redis': 800, 'Elasticsearch': 1500,
  'AWS': 1800, 'Google Cloud': 1600, 'Azure': 1400, 'Docker': 1200,
  'Kubernetes': 2000, 'TypeScript': 1500, 'GraphQL': 1800, 'REST API': 1000
};

const USER_SCALE_MULTIPLIERS = {
  '0-100': 0.8,
  '100-1K': 1.0,
  '1K-10K': 1.2,
  '10K-100K': 1.4,
  '100K+': 1.6
};

export default function PricingGuidance({ platformData, currentPrice, onPriceUpdate }: PricingGuidanceProps) {
  const [pricingFactors, setPricingFactors] = useState<PricingFactors>({
    base: 20000,
    typeMultiplier: 1.0,
    complexityBonus: 0,
    readinessBonus: 0,
    timeInvestmentBonus: 0,
    userScaleBonus: 0
  });

  const [suggestedPrice, setSuggestedPrice] = useState(20000);
  const [priceRange, setPriceRange] = useState({ min: 15000, max: 25000 });
  const [showBreakdown, setShowBreakdown] = useState(false);

  useEffect(() => {
    calculateDynamicPricing();
  }, [platformData]);

  const calculateDynamicPricing = () => {
    if (!platformData.platformType) return;

    const typeData = PLATFORM_TYPE_VALUES[platformData.platformType as keyof typeof PLATFORM_TYPE_VALUES] || PLATFORM_TYPE_VALUES.other;

    // Base price from platform type
    const base = typeData.base;
    const typeMultiplier = typeData.multiplier;

    // Tech stack complexity bonus
    const techStackValue = (platformData.techStack || []).reduce((total, tech) => {
      return total + (TECH_STACK_VALUES[tech as keyof typeof TECH_STACK_VALUES] || 0);
    }, 0);

    // Development time investment bonus
    const timeBonus = Math.min((platformData.monthsInDevelopment || 0) * 1500, 15000);

    // User scale bonus
    const userMultiplier = USER_SCALE_MULTIPLIERS[platformData.estimatedUsers as keyof typeof USER_SCALE_MULTIPLIERS] || 1.0;
    const userScaleBonus = base * (userMultiplier - 1);

    // Readiness assessment bonus
    const readinessItems = platformData.readinessItems || {};
    const readinessCount = Object.values(readinessItems).filter(Boolean).length;
    const readinessPercentage = readinessCount / 9; // 9 total items
    const readinessBonus = base * 0.4 * readinessPercentage; // Up to 40% bonus

    // Calculate final price
    const calculatedPrice = Math.round(
      (base * typeMultiplier) +
      techStackValue +
      timeBonus +
      userScaleBonus +
      readinessBonus
    );

    // Set price range (±20%)
    const minPrice = Math.round(calculatedPrice * 0.8);
    const maxPrice = Math.round(calculatedPrice * 1.2);

    setPricingFactors({
      base,
      typeMultiplier,
      complexityBonus: techStackValue,
      readinessBonus,
      timeInvestmentBonus: timeBonus,
      userScaleBonus
    });

    setSuggestedPrice(calculatedPrice);
    setPriceRange({ min: minPrice, max: maxPrice });

    // Notify parent component
    if (onPriceUpdate) {
      onPriceUpdate(calculatedPrice);
    }
  };

  const getReadinessScore = () => {
    if (!platformData.readinessItems) return 0;
    const items = Object.values(platformData.readinessItems).filter(Boolean).length;
    return Math.round((items / 9) * 100);
  };

  const getPriceConfidence = () => {
    const readinessScore = getReadinessScore();
    const hasTechStack = (platformData.techStack || []).length > 0;
    const hasTimeInvestment = (platformData.monthsInDevelopment || 0) > 0;

    if (readinessScore >= 70 && hasTechStack && hasTimeInvestment) return 'High';
    if (readinessScore >= 40 && (hasTechStack || hasTimeInvestment)) return 'Medium';
    return 'Low';
  };

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'USD',
      minimumFractionDigits: 0
    }).format(amount);
  };

  if (!platformData.platformType) {
    return (
      <div className="bg-gray-50 border border-gray-200 rounded-lg p-4">
        <p className="text-sm text-gray-600 text-center">
          📊 Complete platform details to see dynamic pricing guidance
        </p>
      </div>
    );
  }

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      className="bg-gradient-to-br from-blue-50 to-indigo-50 border border-blue-200 rounded-lg p-6"
    >
      <div className="flex items-center justify-between mb-4">
        <h4 className="text-lg font-semibold text-gray-900">💡 Smart Pricing Guidance</h4>
        <button
          onClick={() => setShowBreakdown(!showBreakdown)}
          className="text-sm text-blue-600 hover:text-blue-800 font-medium"
        >
          {showBreakdown ? 'Hide Details' : 'Show Breakdown'}
        </button>
      </div>

      {/* Main Price Recommendation */}
      <div className="text-center mb-6">
        <div className="text-3xl font-bold text-gray-900 mb-2">
          {formatCurrency(suggestedPrice)}
        </div>
        <div className="text-sm text-gray-600 mb-2">
          Suggested Price • Range: {formatCurrency(priceRange.min)} - {formatCurrency(priceRange.max)}
        </div>
        <div className={`inline-flex items-center px-3 py-1 rounded-full text-xs font-medium ${
          getPriceConfidence() === 'High' ? 'bg-green-100 text-green-800' :
          getPriceConfidence() === 'Medium' ? 'bg-yellow-100 text-yellow-800' :
          'bg-red-100 text-red-800'
        }`}>
          {getPriceConfidence()} Confidence
        </div>
      </div>

      {/* Key Factors */}
      <div className="grid grid-cols-2 gap-4 mb-4">
        <div className="text-center p-3 bg-white rounded-lg border border-gray-200">
          <div className="text-2xl font-bold text-blue-600">{getReadinessScore()}%</div>
          <div className="text-xs text-gray-600">Market Ready</div>
        </div>
        <div className="text-center p-3 bg-white rounded-lg border border-gray-200">
          <div className="text-2xl font-bold text-green-600">{(platformData.techStack || []).length}</div>
          <div className="text-xs text-gray-600">Tech Stack</div>
        </div>
      </div>

      {/* Price Breakdown */}
      <AnimatePresence>
        {showBreakdown && (
          <motion.div
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: 'auto', opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            className="border-t border-gray-200 pt-4 space-y-3"
          >
            <div className="text-sm font-medium text-gray-700 mb-3">Pricing Breakdown:</div>

            <div className="space-y-2 text-sm">
              <div className="flex justify-between">
                <span className="text-gray-600">
                  Base Value ({PLATFORM_TYPE_VALUES[platformData.platformType as keyof typeof PLATFORM_TYPE_VALUES]?.description})
                </span>
                <span className="font-medium">{formatCurrency(pricingFactors.base)}</span>
              </div>

              {pricingFactors.complexityBonus > 0 && (
                <div className="flex justify-between">
                  <span className="text-gray-600">Tech Stack Complexity</span>
                  <span className="font-medium text-green-600">+{formatCurrency(pricingFactors.complexityBonus)}</span>
                </div>
              )}

              {pricingFactors.timeInvestmentBonus > 0 && (
                <div className="flex justify-between">
                  <span className="text-gray-600">Development Investment ({platformData.monthsInDevelopment} months)</span>
                  <span className="font-medium text-green-600">+{formatCurrency(pricingFactors.timeInvestmentBonus)}</span>
                </div>
              )}

              {pricingFactors.userScaleBonus > 0 && (
                <div className="flex justify-between">
                  <span className="text-gray-600">User Base Scale</span>
                  <span className="font-medium text-green-600">+{formatCurrency(pricingFactors.userScaleBonus)}</span>
                </div>
              )}

              {pricingFactors.readinessBonus > 0 && (
                <div className="flex justify-between">
                  <span className="text-gray-600">Market Readiness ({getReadinessScore()}%)</span>
                  <span className="font-medium text-green-600">+{formatCurrency(pricingFactors.readinessBonus)}</span>
                </div>
              )}
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Actionable Recommendations */}
      <div className="mt-4 pt-4 border-t border-gray-200">
        <div className="text-sm font-medium text-gray-700 mb-2">💰 Increase Your Value:</div>
        <div className="space-y-1 text-xs text-gray-600">
          {getReadinessScore() < 80 && (
            <div>• Complete marketing materials for up to {formatCurrency(Math.round(pricingFactors.base * 0.4))} price boost</div>
          )}
          {(platformData.techStack || []).length < 5 && (
            <div>• Add modern tech stack components for higher valuations</div>
          )}
          {!platformData.readinessItems?.hasBusinessPlan && (
            <div>• Add business plan for 15% higher buyer confidence</div>
          )}
        </div>
      </div>
    </motion.div>
  );
}