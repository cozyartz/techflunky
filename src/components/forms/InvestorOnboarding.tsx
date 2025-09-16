// Enhanced Investor Onboarding - Multi-tier workflow
import React, { useState, useEffect } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { motion, AnimatePresence } from 'framer-motion';

// Validation schemas for different investor tiers
const basicInvestorSchema = z.object({
  firstName: z.string().min(2, 'First name required'),
  lastName: z.string().min(2, 'Last name required'),
  email: z.string().email('Valid email required'),
  phone: z.string().min(10, 'Valid phone number required'),
  investorType: z.enum(['angel', 'accredited', 'vc-fund', 'beta-partner']),
});

const investmentProfileSchema = z.object({
  investmentRange: z.string(),
  preferredSectors: z.array(z.string()).min(1, 'Select at least one sector'),
  riskTolerance: z.enum(['conservative', 'moderate', 'aggressive']),
  investmentHorizon: z.enum(['short', 'medium', 'long']),
  diversificationGoals: z.string(),
  previousExperience: z.enum(['none', 'some', 'experienced', 'expert']),
});

const accreditationSchema = z.object({
  accreditationType: z.enum(['income', 'net-worth', 'professional', 'entity']),
  annualIncome: z.number().optional(),
  netWorth: z.number().optional(),
  professionalCertification: z.string().optional(),
  employerVerification: z.boolean().optional(),
  entityType: z.string().optional(),
  verificationDocuments: z.boolean(),
  agreesToTerms: z.boolean().refine(val => val === true, 'Must agree to terms'),
});

const INVESTOR_TIERS = {
  'angel': {
    name: 'Angel Investor',
    range: '$5K - $250K',
    description: 'Individual investors supporting early-stage platforms',
    benefits: ['Deal discovery dashboard', 'Basic due diligence reports', 'Direct founder communication'],
    requirements: ['Valid ID', 'Investment capacity verification'],
    onboardingSteps: 3
  },
  'accredited': {
    name: 'Accredited Investor',
    range: '$25K - $1M',
    description: 'Qualified investors with higher investment capacity',
    benefits: ['Advanced analytics', 'Syndicate participation', 'Priority deal access', 'Detailed financials'],
    requirements: ['Accreditation verification', 'SEC compliance documents'],
    onboardingSteps: 4
  },
  'vc-fund': {
    name: 'VC Fund Manager',
    range: '$100K - $10M',
    description: 'Professional fund managers and institutional investors',
    benefits: ['Portfolio management tools', 'Fund syndication', 'White-label solutions', 'API access'],
    requirements: ['Fund documentation', 'Professional credentials', 'AUM verification'],
    onboardingSteps: 5
  },
  'beta-partner': {
    name: 'Beta Revenue Partner',
    range: '$10K - $500K + Revenue Share',
    description: 'Strategic partners who provide ongoing value beyond capital',
    benefits: ['Revenue sharing', 'Platform co-development', 'Market expertise', 'Operational support'],
    requirements: ['Strategic value proposition', 'Operational expertise demonstration'],
    onboardingSteps: 4
  }
};

const INVESTMENT_SECTORS = [
  'FinTech', 'HealthTech', 'EdTech', 'E-commerce', 'SaaS', 'Marketplace',
  'AI/ML', 'Blockchain', 'Real Estate Tech', 'Media & Content',
  'Travel & Hospitality', 'Food & Beverage', 'Legal Tech', 'HR Tech'
];

interface InvestorOnboardingProps {
  onComplete?: (data: any) => void;
}

export default function InvestorOnboarding({ onComplete }: InvestorOnboardingProps) {
  const [currentStep, setCurrentStep] = useState(1);
  const [selectedTier, setSelectedTier] = useState<string>('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [investmentProfile, setInvestmentProfile] = useState<any>(null);

  const { register, handleSubmit, watch, formState: { errors }, setValue, getValues } = useForm({
    resolver: zodResolver(getCurrentSchema()),
    mode: 'onChange'
  });

  const watchedData = watch();

  function getCurrentSchema() {
    switch (currentStep) {
      case 1: return basicInvestorSchema;
      case 2: return investmentProfileSchema;
      case 3: return accreditationSchema;
      default: return basicInvestorSchema;
    }
  }

  const maxSteps = selectedTier ? INVESTOR_TIERS[selectedTier as keyof typeof INVESTOR_TIERS].onboardingSteps : 3;

  const handleNext = () => {
    if (currentStep < maxSteps) {
      setCurrentStep(currentStep + 1);
    }
  };

  const handlePrevious = () => {
    if (currentStep > 1) {
      setCurrentStep(currentStep - 1);
    }
  };

  const onSubmit = async (data: any) => {
    if (currentStep < maxSteps) {
      handleNext();
      return;
    }

    setIsSubmitting(true);
    try {
      // Submit to API
      const response = await fetch('/api/investor/onboarding', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          ...data,
          investorTier: selectedTier,
          investmentProfile
        })
      });

      if (response.ok) {
        const result = await response.json();
        onComplete?.(result);
      }
    } catch (error) {
      console.error('Investor onboarding failed:', error);
    }
    setIsSubmitting(false);
  };

  // Calculate investment matching score
  const calculateMatchingScore = () => {
    if (!watchedData.preferredSectors || !watchedData.investmentRange) return 0;

    let score = 60; // Base score

    // Sector diversity bonus
    if (watchedData.preferredSectors?.length >= 3) score += 15;

    // Experience bonus
    const experienceBonus = {
      'expert': 20,
      'experienced': 15,
      'some': 10,
      'none': 5
    };
    score += experienceBonus[watchedData.previousExperience as keyof typeof experienceBonus] || 0;

    // Risk tolerance alignment
    if (watchedData.riskTolerance === 'moderate') score += 5;

    return Math.min(score, 100);
  };

  return (
    <div className="max-w-4xl mx-auto">
      {/* Progress Header */}
      <div className="mb-8">
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-3xl font-bold text-gray-900">Investor Onboarding</h2>
          <div className="text-sm text-gray-600">
            Step {currentStep} of {maxSteps}
          </div>
        </div>

        {/* Progress Bar */}
        <div className="w-full bg-gray-200 rounded-full h-2">
          <div
            className="bg-blue-600 h-2 rounded-full transition-all duration-300"
            style={{ width: `${(currentStep / maxSteps) * 100}%` }}
          />
        </div>
      </div>

      <form onSubmit={handleSubmit(onSubmit)} className="space-y-8">
        <AnimatePresence mode="wait">
          {/* Step 1: Basic Information & Tier Selection */}
          {currentStep === 1 && (
            <motion.div
              key="step1"
              initial={{ opacity: 0, x: 50 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: -50 }}
              className="space-y-6"
            >
              <div className="text-center mb-8">
                <h3 className="text-2xl font-bold text-gray-900 mb-2">Welcome to TechFlunky Investments</h3>
                <p className="text-gray-600">Choose your investor tier and provide basic information</p>
              </div>

              {/* Investor Tier Selection */}
              <div className="space-y-4">
                <label className="block text-sm font-medium text-gray-700 mb-4">Choose Your Investor Tier</label>
                <div className="grid md:grid-cols-2 gap-4">
                  {Object.entries(INVESTOR_TIERS).map(([key, tier]) => (
                    <label
                      key={key}
                      className={`relative flex flex-col p-6 border-2 rounded-lg cursor-pointer transition-all ${
                        selectedTier === key
                          ? 'border-blue-500 bg-blue-50'
                          : 'border-gray-200 hover:border-blue-300'
                      }`}
                    >
                      <input
                        {...register('investorType')}
                        type="radio"
                        value={key}
                        className="sr-only"
                        onChange={() => setSelectedTier(key)}
                      />
                      <div className="flex items-center justify-between mb-2">
                        <h4 className="font-semibold text-gray-900">{tier.name}</h4>
                        <span className="text-sm font-medium text-blue-600">{tier.range}</span>
                      </div>
                      <p className="text-sm text-gray-600 mb-3">{tier.description}</p>
                      <div className="space-y-1">
                        {tier.benefits.slice(0, 2).map((benefit, idx) => (
                          <div key={idx} className="flex items-center text-xs text-gray-500">
                            <svg className="w-3 h-3 text-green-500 mr-2" fill="currentColor" viewBox="0 0 20 20">
                              <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" />
                            </svg>
                            {benefit}
                          </div>
                        ))}
                      </div>
                    </label>
                  ))}
                </div>
              </div>

              {/* Basic Information */}
              <div className="grid md:grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">First Name</label>
                  <input
                    {...register('firstName')}
                    className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                    placeholder="John"
                  />
                  {errors.firstName && (
                    <p className="mt-1 text-sm text-red-600">{errors.firstName.message as string}</p>
                  )}
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">Last Name</label>
                  <input
                    {...register('lastName')}
                    className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                    placeholder="Smith"
                  />
                  {errors.lastName && (
                    <p className="mt-1 text-sm text-red-600">{errors.lastName.message as string}</p>
                  )}
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">Email Address</label>
                  <input
                    {...register('email')}
                    type="email"
                    className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                    placeholder="john@example.com"
                  />
                  {errors.email && (
                    <p className="mt-1 text-sm text-red-600">{errors.email.message as string}</p>
                  )}
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">Phone Number</label>
                  <input
                    {...register('phone')}
                    type="tel"
                    className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                    placeholder="(555) 123-4567"
                  />
                  {errors.phone && (
                    <p className="mt-1 text-sm text-red-600">{errors.phone.message as string}</p>
                  )}
                </div>
              </div>
            </motion.div>
          )}

          {/* Step 2: Investment Profile */}
          {currentStep === 2 && (
            <motion.div
              key="step2"
              initial={{ opacity: 0, x: 50 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: -50 }}
              className="space-y-6"
            >
              <div className="text-center mb-8">
                <h3 className="text-2xl font-bold text-gray-900 mb-2">Investment Profile</h3>
                <p className="text-gray-600">Help us understand your investment preferences</p>
              </div>

              <div className="grid md:grid-cols-2 gap-6">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">Investment Range</label>
                  <select
                    {...register('investmentRange')}
                    className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  >
                    <option value="">Select range</option>
                    <option value="5k-25k">$5K - $25K</option>
                    <option value="25k-100k">$25K - $100K</option>
                    <option value="100k-500k">$100K - $500K</option>
                    <option value="500k-1m">$500K - $1M</option>
                    <option value="1m+">$1M+</option>
                  </select>
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">Risk Tolerance</label>
                  <select
                    {...register('riskTolerance')}
                    className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  >
                    <option value="">Select tolerance</option>
                    <option value="conservative">Conservative - Stable returns, lower risk</option>
                    <option value="moderate">Moderate - Balanced risk/reward</option>
                    <option value="aggressive">Aggressive - High growth potential</option>
                  </select>
                </div>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">Preferred Sectors (Select all that interest you)</label>
                <div className="grid grid-cols-3 md:grid-cols-4 gap-3 max-h-48 overflow-y-auto border border-gray-200 rounded-lg p-4">
                  {INVESTMENT_SECTORS.map(sector => (
                    <label key={sector} className="flex items-center">
                      <input
                        type="checkbox"
                        value={sector}
                        {...register('preferredSectors')}
                        className="rounded border-gray-300 text-blue-600 focus:ring-blue-500"
                      />
                      <span className="ml-2 text-sm">{sector}</span>
                    </label>
                  ))}
                </div>
              </div>

              <div className="grid md:grid-cols-2 gap-6">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">Investment Horizon</label>
                  <select
                    {...register('investmentHorizon')}
                    className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  >
                    <option value="">Select horizon</option>
                    <option value="short">Short-term (1-2 years)</option>
                    <option value="medium">Medium-term (3-5 years)</option>
                    <option value="long">Long-term (5+ years)</option>
                  </select>
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">Previous Experience</label>
                  <select
                    {...register('previousExperience')}
                    className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  >
                    <option value="">Select experience</option>
                    <option value="none">First-time investor</option>
                    <option value="some">Some experience (1-5 investments)</option>
                    <option value="experienced">Experienced (5+ investments)</option>
                    <option value="expert">Expert/Professional investor</option>
                  </select>
                </div>
              </div>

              {/* AI Matching Preview */}
              {watchedData.preferredSectors?.length > 0 && (
                <div className="bg-gradient-to-r from-blue-50 to-indigo-50 border border-blue-200 rounded-lg p-6">
                  <h4 className="font-semibold text-gray-900 mb-3">🤖 AI Investment Matching</h4>
                  <div className="grid grid-cols-3 gap-4 text-center">
                    <div>
                      <div className="text-2xl font-bold text-blue-600">{calculateMatchingScore()}%</div>
                      <div className="text-xs text-gray-600">Match Score</div>
                    </div>
                    <div>
                      <div className="text-2xl font-bold text-green-600">{watchedData.preferredSectors?.length || 0}</div>
                      <div className="text-xs text-gray-600">Sectors</div>
                    </div>
                    <div>
                      <div className="text-2xl font-bold text-purple-600">12</div>
                      <div className="text-xs text-gray-600">Available Deals</div>
                    </div>
                  </div>
                </div>
              )}
            </motion.div>
          )}

          {/* Step 3: Accreditation (for qualified investors) */}
          {currentStep === 3 && ['accredited', 'vc-fund'].includes(selectedTier) && (
            <motion.div
              key="step3"
              initial={{ opacity: 0, x: 50 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: -50 }}
              className="space-y-6"
            >
              <div className="text-center mb-8">
                <h3 className="text-2xl font-bold text-gray-900 mb-2">Accreditation Verification</h3>
                <p className="text-gray-600">Required for accredited investor status</p>
              </div>

              <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-4 mb-6">
                <div className="flex">
                  <svg className="w-5 h-5 text-yellow-400 mr-3 mt-0.5" fill="currentColor" viewBox="0 0 20 20">
                    <path fillRule="evenodd" d="M8.257 3.099c.765-1.36 2.722-1.36 3.486 0l5.58 9.92c.75 1.334-.213 2.98-1.742 2.98H4.42c-1.53 0-2.493-1.646-1.743-2.98l5.58-9.92zM11 13a1 1 0 11-2 0 1 1 0 012 0zm-1-8a1 1 0 00-1 1v3a1 1 0 002 0V6a1 1 0 00-1-1z" clipRule="evenodd" />
                  </svg>
                  <div>
                    <h4 className="font-medium text-yellow-800">SEC Compliance Required</h4>
                    <p className="text-sm text-yellow-700 mt-1">
                      As an accredited investor, you must meet SEC requirements for income, net worth, or professional qualifications.
                    </p>
                  </div>
                </div>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-4">Accreditation Type</label>
                <div className="space-y-3">
                  {[
                    { id: 'income', name: 'Income Test', description: '$200K+ annual income (individual) or $300K+ (joint)' },
                    { id: 'net-worth', name: 'Net Worth Test', description: '$1M+ net worth excluding primary residence' },
                    { id: 'professional', name: 'Professional Certification', description: 'Series 7, 65, or 82 licenses' },
                    { id: 'entity', name: 'Qualified Entity', description: 'Investment company, bank, or qualified institutional buyer' }
                  ].map(type => (
                    <label key={type.id} className="flex items-start p-4 border border-gray-200 rounded-lg cursor-pointer hover:border-blue-300">
                      <input
                        {...register('accreditationType')}
                        type="radio"
                        value={type.id}
                        className="mt-1 rounded border-gray-300 text-blue-600 focus:ring-blue-500"
                      />
                      <div className="ml-3">
                        <div className="font-medium text-gray-900">{type.name}</div>
                        <div className="text-sm text-gray-600">{type.description}</div>
                      </div>
                    </label>
                  ))}
                </div>
              </div>

              <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
                <label className="flex items-start">
                  <input
                    {...register('verificationDocuments')}
                    type="checkbox"
                    className="mt-1 rounded border-gray-300 text-blue-600 focus:ring-blue-500"
                  />
                  <div className="ml-3">
                    <span className="font-medium text-blue-900">Document Upload Required</span>
                    <p className="text-sm text-blue-700 mt-1">
                      You'll need to upload supporting documentation (tax returns, bank statements, or professional licenses) in the next step.
                    </p>
                  </div>
                </label>
              </div>
            </motion.div>
          )}

          {/* Final Step: Terms Agreement */}
          {currentStep === maxSteps && (
            <motion.div
              key="final"
              initial={{ opacity: 0, x: 50 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: -50 }}
              className="space-y-6"
            >
              <div className="text-center mb-8">
                <h3 className="text-2xl font-bold text-gray-900 mb-2">Complete Your Registration</h3>
                <p className="text-gray-600">Review and accept terms to activate your investor account</p>
              </div>

              {/* Summary Card */}
              <div className="bg-gradient-to-r from-green-50 to-blue-50 border border-green-200 rounded-lg p-6">
                <h4 className="font-semibold text-gray-900 mb-4">Your Investor Profile</h4>
                <div className="grid grid-cols-2 gap-4 text-sm">
                  <div>
                    <span className="text-gray-600">Tier:</span>
                    <span className="ml-2 font-medium">{INVESTOR_TIERS[selectedTier as keyof typeof INVESTOR_TIERS]?.name}</span>
                  </div>
                  <div>
                    <span className="text-gray-600">Investment Range:</span>
                    <span className="ml-2 font-medium">{watchedData.investmentRange}</span>
                  </div>
                  <div>
                    <span className="text-gray-600">Sectors:</span>
                    <span className="ml-2 font-medium">{watchedData.preferredSectors?.length || 0} selected</span>
                  </div>
                  <div>
                    <span className="text-gray-600">Match Score:</span>
                    <span className="ml-2 font-medium text-green-600">{calculateMatchingScore()}%</span>
                  </div>
                </div>
              </div>

              <div className="space-y-4">
                <label className="flex items-start">
                  <input
                    {...register('agreesToTerms')}
                    type="checkbox"
                    className="mt-1 rounded border-gray-300 text-blue-600 focus:ring-blue-500"
                  />
                  <div className="ml-3">
                    <span className="font-medium text-gray-900">Terms and Conditions</span>
                    <p className="text-sm text-gray-600 mt-1">
                      I have read and agree to the <a href="/terms" className="text-blue-600 hover:underline">Terms of Service</a>,{' '}
                      <a href="/privacy" className="text-blue-600 hover:underline">Privacy Policy</a>, and{' '}
                      <a href="/investor-agreement" className="text-blue-600 hover:underline">Investor Agreement</a>.
                    </p>
                  </div>
                </label>
              </div>

              {errors.agreesToTerms && (
                <p className="text-sm text-red-600">{errors.agreesToTerms.message as string}</p>
              )}
            </motion.div>
          )}
        </AnimatePresence>

        {/* Navigation Buttons */}
        <div className="flex justify-between pt-8 border-t border-gray-200">
          <button
            type="button"
            onClick={handlePrevious}
            disabled={currentStep === 1}
            className="px-6 py-3 border border-gray-300 rounded-lg font-medium text-gray-700 hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed"
          >
            Previous
          </button>

          <button
            type="submit"
            disabled={isSubmitting}
            className="px-8 py-3 bg-blue-600 text-white rounded-lg font-medium hover:bg-blue-700 disabled:opacity-50 flex items-center"
          >
            {isSubmitting ? (
              <>
                <svg className="animate-spin -ml-1 mr-2 h-4 w-4 text-white" fill="none" viewBox="0 0 24 24">
                  <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                  <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" />
                </svg>
                Processing...
              </>
            ) : currentStep === maxSteps ? (
              'Complete Registration'
            ) : (
              'Continue'
            )}
          </button>
        </div>
      </form>
    </div>
  );
}