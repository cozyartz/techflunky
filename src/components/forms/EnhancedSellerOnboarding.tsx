import React, { useState, useEffect } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { motion, AnimatePresence } from 'framer-motion';
import PricingGuidance from '../pricing/PricingGuidance';

// Enhanced validation schemas
const basicInfoSchema = z.object({
  firstName: z.string().min(2, 'First name required'),
  lastName: z.string().min(2, 'Last name required'),
  email: z.string().email('Valid email required'),
  businessType: z.enum(['individual', 'company']),
  businessName: z.string().optional(),
});

const platformDetailsSchema = z.object({
  platformName: z.string().min(3, 'Platform name required'),
  platformDescription: z.string().min(50, 'Please provide a detailed description (min 50 characters)'),
  techStack: z.array(z.string()).min(1, 'Select at least one technology'),
  platformType: z.enum(['saas', 'ecommerce', 'marketplace', 'fintech', 'healthtech', 'edtech', 'other']),
  estimatedUsers: z.string(),
  monthsInDevelopment: z.number().min(1, 'Development time required'),
});

const readinessAssessmentSchema = z.object({
  hasLogo: z.boolean(),
  hasBrandKit: z.boolean(),
  hasBusinessPlan: z.boolean(),
  hasFinancialProjections: z.boolean(),
  hasSalesVideo: z.boolean(),
  hasPitchDeck: z.boolean(),
  hasExecutiveSummary: z.boolean(),
  hasMarketingMaterials: z.boolean(),
  hasLegalDocuments: z.boolean(),
});

const pricingSchema = z.object({
  suggestedPrice: z.number().min(1000, 'Minimum price is $1,000'),
  priceFlexible: z.boolean(),
  acceptsEscrow: z.boolean(),
  membershipTier: z.enum(['none', 'starter-investor', 'professional-investor', 'enterprise-investor']),
});

const liabilitySchema = z.object({
  agreesToTerms: z.boolean().refine(val => val, 'You must agree to the terms'),
  understandsRisks: z.boolean().refine(val => val, 'You must acknowledge the risks'),
  holdsHarmless: z.boolean().refine(val => val, 'You must agree to hold TechFlunky harmless'),
  noGuarantees: z.boolean().refine(val => val, 'You must acknowledge no guarantees'),
});

const TECH_STACKS = [
  'React', 'Vue.js', 'Angular', 'Next.js', 'Nuxt.js', 'Astro',
  'Node.js', 'Python', 'Django', 'FastAPI', 'Ruby on Rails', 'Laravel',
  'PostgreSQL', 'MySQL', 'MongoDB', 'Redis', 'Cloudflare', 'AWS', 'Vercel'
];

interface ReadinessScore {
  score: number;
  missing: string[];
  recommendations: string[];
  suggestedPackage: string | null;
  feeRate: number; // 8% for members, 10-12% for incomplete profiles
}

export default function EnhancedSellerOnboarding() {
  const [currentStep, setCurrentStep] = useState(1);
  const [readinessScore, setReadinessScore] = useState<ReadinessScore | null>(null);
  const [recommendedPackage, setRecommendedPackage] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [membershipBenefits, setMembershipBenefits] = useState<any>(null);

  const { register, handleSubmit, watch, formState: { errors }, setValue, getValues } = useForm({
    resolver: zodResolver(getCurrentSchema()),
    mode: 'onChange'
  });

  const watchedData = watch(); // Watch all form values for dynamic pricing guidance

  function getCurrentSchema() {
    switch (currentStep) {
      case 1: return basicInfoSchema;
      case 2: return platformDetailsSchema;
      case 3: return readinessAssessmentSchema;
      case 4: return pricingSchema;
      case 5: return liabilitySchema;
      default: return basicInfoSchema;
    }
  }

  // Calculate readiness score when assessment is complete
  useEffect(() => {
    if (currentStep === 3) {
      const assessmentData = getValues();
      const score = calculateReadinessScore(assessmentData);
      setReadinessScore(score);
      setRecommendedPackage(score.suggestedPackage);
    }
  }, [currentStep, watch()]);

  function calculateReadinessScore(data: any): ReadinessScore {
    const items = [
      { key: 'hasLogo', weight: 10, name: 'Logo & Branding' },
      { key: 'hasBrandKit', weight: 8, name: 'Brand Guidelines' },
      { key: 'hasBusinessPlan', weight: 20, name: 'Business Plan' },
      { key: 'hasFinancialProjections', weight: 15, name: 'Financial Projections' },
      { key: 'hasSalesVideo', weight: 12, name: 'Demo/Sales Video' },
      { key: 'hasPitchDeck', weight: 15, name: 'Investor Pitch Deck' },
      { key: 'hasExecutiveSummary', weight: 10, name: 'Executive Summary' },
      { key: 'hasMarketingMaterials', weight: 5, name: 'Marketing Materials' },
      { key: 'hasLegalDocuments', weight: 5, name: 'Legal Documentation' }
    ];

    let score = 0;
    const missing: string[] = [];

    items.forEach(item => {
      if (data[item.key]) {
        score += item.weight;
      } else {
        missing.push(item.name);
      }
    });

    // Determine fee rate and package recommendation
    let feeRate = 0.10; // 10% base
    let suggestedPackage = null;
    const recommendations: string[] = [];

    if (score >= 80) {
      feeRate = 0.08; // 8% for well-prepared sellers
      recommendations.push('Your platform is market-ready! Consider joining as a member for 8% fees.');
      suggestedPackage = null; // No package needed
    } else if (score >= 60) {
      feeRate = 0.09; // 9% for partially prepared
      recommendations.push('You\'re close to market-ready. Consider our Professional Package to complete your materials.');
      suggestedPackage = 'professional';
    } else if (score >= 40) {
      feeRate = 0.10; // 10% standard
      recommendations.push('Your platform needs significant marketing materials. Our Market-Ready Package would be perfect.');
      suggestedPackage = 'market-ready';
    } else {
      feeRate = 0.12; // 12% for incomplete platforms
      recommendations.push('We recommend starting with our Investor-Grade Package to create all necessary materials.');
      suggestedPackage = 'investor-grade';
    }

    return {
      score,
      missing,
      recommendations,
      suggestedPackage,
      feeRate
    };
  }

  const nextStep = () => {
    if (currentStep < 5) {
      setCurrentStep(currentStep + 1);
    }
  };

  const prevStep = () => {
    if (currentStep > 1) {
      setCurrentStep(currentStep - 1);
    }
  };

  const onSubmit = async (data: any) => {
    if (currentStep < 5) {
      nextStep();
      return;
    }

    setIsSubmitting(true);
    try {
      // Submit the complete onboarding data
      const response = await fetch('/api/seller/onboarding', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          ...data,
          readinessScore,
          recommendedPackage,
          step: 'complete'
        })
      });

      const result = await response.json();

      if (result.success) {
        // Redirect to dashboard or payment flow
        window.location.href = result.redirectUrl || '/seller/dashboard';
      } else {
        throw new Error(result.error || 'Onboarding failed');
      }
    } catch (error) {
      console.error('Onboarding error:', error);
      alert('There was an error completing your onboarding. Please try again.');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="max-w-4xl mx-auto bg-white rounded-xl shadow-lg overflow-hidden">
      {/* Progress Bar */}
      <div className="bg-gradient-to-r from-yellow-400 to-yellow-600 px-6 py-4">
        <div className="flex justify-between items-center mb-2">
          <h2 className="text-xl font-bold text-black">Seller Onboarding</h2>
          <span className="text-sm text-black font-medium">Step {currentStep} of 5</span>
        </div>
        <div className="w-full bg-black/20 rounded-full h-2">
          <div
            className="bg-black rounded-full h-2 transition-all duration-500"
            style={{ width: `${(currentStep / 5) * 100}%` }}
          />
        </div>
      </div>

      <form onSubmit={handleSubmit(onSubmit)} className="p-8">
        <AnimatePresence mode="wait">
          {/* Step 1: Basic Information */}
          {currentStep === 1 && (
            <motion.div
              key="step1"
              initial={{ opacity: 0, x: 50 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: -50 }}
              className="space-y-6"
            >
              <div className="text-center mb-8">
                <h3 className="text-2xl font-bold text-gray-900 mb-2">Let's Get Started</h3>
                <p className="text-gray-600">First, tell us about yourself</p>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">First Name</label>
                  <input
                    {...register('firstName')}
                    className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-yellow-400 focus:border-transparent"
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
                    className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-yellow-400 focus:border-transparent"
                    placeholder="Smith"
                  />
                  {errors.lastName && (
                    <p className="mt-1 text-sm text-red-600">{errors.lastName.message as string}</p>
                  )}
                </div>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">Email Address</label>
                <input
                  {...register('email')}
                  type="email"
                  className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-yellow-400 focus:border-transparent"
                  placeholder="john@example.com"
                />
                {errors.email && (
                  <p className="mt-1 text-sm text-red-600">{errors.email.message as string}</p>
                )}
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">Business Type</label>
                <div className="grid grid-cols-2 gap-4">
                  <label className="flex items-center p-4 border-2 border-gray-200 rounded-lg cursor-pointer hover:border-yellow-400">
                    <input
                      {...register('businessType')}
                      type="radio"
                      value="individual"
                      className="sr-only"
                    />
                    <div className="flex items-center">
                      <div className="w-4 h-4 border-2 border-gray-300 rounded-full mr-3"></div>
                      <span className="font-medium">Individual Seller</span>
                    </div>
                  </label>
                  <label className="flex items-center p-4 border-2 border-gray-200 rounded-lg cursor-pointer hover:border-yellow-400">
                    <input
                      {...register('businessType')}
                      type="radio"
                      value="company"
                      className="sr-only"
                    />
                    <div className="flex items-center">
                      <div className="w-4 h-4 border-2 border-gray-300 rounded-full mr-3"></div>
                      <span className="font-medium">Company/Team</span>
                    </div>
                  </label>
                </div>
                {errors.businessType && (
                  <p className="mt-1 text-sm text-red-600">{errors.businessType.message as string}</p>
                )}
              </div>
            </motion.div>
          )}

          {/* Step 2: Platform Details */}
          {currentStep === 2 && (
            <motion.div
              key="step2"
              initial={{ opacity: 0, x: 50 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: -50 }}
              className="space-y-6"
            >
              <div className="text-center mb-8">
                <h3 className="text-2xl font-bold text-gray-900 mb-2">About Your Platform</h3>
                <p className="text-gray-600">Tell us about what you've built</p>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">Platform Name</label>
                <input
                  {...register('platformName')}
                  className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-yellow-400 focus:border-transparent"
                  placeholder="My Awesome Platform"
                />
                {errors.platformName && (
                  <p className="mt-1 text-sm text-red-600">{errors.platformName.message as string}</p>
                )}
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">Platform Description</label>
                <textarea
                  {...register('platformDescription')}
                  rows={4}
                  className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-yellow-400 focus:border-transparent"
                  placeholder="Describe what your platform does, who it's for, and what problems it solves..."
                />
                {errors.platformDescription && (
                  <p className="mt-1 text-sm text-red-600">{errors.platformDescription.message as string}</p>
                )}
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">Platform Type</label>
                <select
                  {...register('platformType')}
                  className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-yellow-400 focus:border-transparent"
                >
                  <option value="">Select platform type</option>
                  <option value="saas">SaaS Application</option>
                  <option value="ecommerce">E-commerce Platform</option>
                  <option value="marketplace">Marketplace</option>
                  <option value="fintech">FinTech Solution</option>
                  <option value="healthtech">HealthTech Platform</option>
                  <option value="edtech">EdTech Solution</option>
                  <option value="other">Other</option>
                </select>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">Tech Stack (Select all that apply)</label>
                <div className="grid grid-cols-3 md:grid-cols-4 gap-3 max-h-48 overflow-y-auto border border-gray-200 rounded-lg p-4">
                  {TECH_STACKS.map(tech => (
                    <label key={tech} className="flex items-center">
                      <input
                        type="checkbox"
                        value={tech}
                        {...register('techStack')}
                        className="rounded border-gray-300 text-yellow-600 focus:ring-yellow-400"
                      />
                      <span className="ml-2 text-sm">{tech}</span>
                    </label>
                  ))}
                </div>
              </div>

              <div className="grid md:grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">Estimated Current Users</label>
                  <select
                    {...register('estimatedUsers')}
                    className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-yellow-400 focus:border-transparent"
                  >
                    <option value="">Select user count</option>
                    <option value="0-100">0-100 users</option>
                    <option value="100-1K">100-1K users</option>
                    <option value="1K-10K">1K-10K users</option>
                    <option value="10K-100K">10K-100K users</option>
                    <option value="100K+">100K+ users</option>
                  </select>
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">Months in Development</label>
                  <input
                    {...register('monthsInDevelopment', { valueAsNumber: true })}
                    type="number"
                    min="1"
                    max="120"
                    className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-yellow-400 focus:border-transparent"
                    placeholder="12"
                  />
                </div>
              </div>
            </motion.div>
          )}

          {/* Step 3: Readiness Assessment */}
          {currentStep === 3 && (
            <motion.div
              key="step3"
              initial={{ opacity: 0, x: 50 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: -50 }}
              className="space-y-6"
            >
              <div className="text-center mb-8">
                <h3 className="text-2xl font-bold text-gray-900 mb-2">Market Readiness Assessment</h3>
                <p className="text-gray-600">Help us understand what materials you already have</p>
              </div>

              <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-4 mb-6">
                <div className="flex">
                  <svg className="w-5 h-5 text-yellow-400 mr-3 mt-0.5" fill="currentColor" viewBox="0 0 20 20">
                    <path fillRule="evenodd" d="M8.257 3.099c.765-1.36 2.722-1.36 3.486 0l5.58 9.92c.75 1.334-.213 2.98-1.742 2.98H4.42c-1.53 0-2.493-1.646-1.743-2.98l5.58-9.92zM11 13a1 1 0 11-2 0 1 1 0 012 0zm-1-8a1 1 0 00-1 1v3a1 1 0 002 0V6a1 1 0 00-1-1z" clipRule="evenodd" />
                  </svg>
                  <div>
                    <h4 className="font-medium text-yellow-800">Why This Matters</h4>
                    <p className="text-sm text-yellow-700 mt-1">
                      The more marketing materials you have, the lower your platform fees and the faster your platform will sell.
                      Don't worry - we can help create anything you're missing!
                    </p>
                  </div>
                </div>
              </div>

              <div className="space-y-4">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  {[
                    { key: 'hasLogo', label: 'Professional Logo & Branding', impact: 'High' },
                    { key: 'hasBrandKit', label: 'Brand Guidelines (colors, fonts)', impact: 'Medium' },
                    { key: 'hasBusinessPlan', label: 'Complete Business Plan', impact: 'Very High' },
                    { key: 'hasFinancialProjections', label: 'Financial Projections', impact: 'High' },
                    { key: 'hasSalesVideo', label: 'Demo/Sales Video', impact: 'High' },
                    { key: 'hasPitchDeck', label: 'Investor Pitch Deck', impact: 'High' },
                    { key: 'hasExecutiveSummary', label: 'Executive Summary', impact: 'Medium' },
                    { key: 'hasMarketingMaterials', label: 'Marketing Materials', impact: 'Medium' },
                    { key: 'hasLegalDocuments', label: 'Legal Documentation', impact: 'Low' }
                  ].map(item => (
                    <label key={item.key} className="flex items-start p-4 border border-gray-200 rounded-lg hover:border-yellow-300 cursor-pointer">
                      <input
                        type="checkbox"
                        {...register(item.key)}
                        className="mt-1 rounded border-gray-300 text-yellow-600 focus:ring-yellow-400"
                      />
                      <div className="ml-3 flex-1">
                        <span className="font-medium text-gray-900">{item.label}</span>
                        <div className="flex items-center mt-1">
                          <span className={`text-xs px-2 py-1 rounded-full ${
                            item.impact === 'Very High' ? 'bg-red-100 text-red-800' :
                            item.impact === 'High' ? 'bg-orange-100 text-orange-800' :
                            item.impact === 'Medium' ? 'bg-yellow-100 text-yellow-800' :
                            'bg-green-100 text-green-800'
                          }`}>
                            {item.impact} Impact
                          </span>
                        </div>
                      </div>
                    </label>
                  ))}
                </div>
              </div>

              {readinessScore && (
                <motion.div
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  className="mt-8 p-6 bg-gradient-to-r from-blue-50 to-indigo-50 border border-blue-200 rounded-lg"
                >
                  <h4 className="text-lg font-bold text-gray-900 mb-4">Your Readiness Score</h4>

                  <div className="flex items-center mb-4">
                    <div className="w-full bg-gray-200 rounded-full h-3 mr-4">
                      <div
                        className={`h-3 rounded-full transition-all duration-1000 ${
                          readinessScore.score >= 80 ? 'bg-green-500' :
                          readinessScore.score >= 60 ? 'bg-yellow-500' :
                          readinessScore.score >= 40 ? 'bg-orange-500' : 'bg-red-500'
                        }`}
                        style={{ width: `${readinessScore.score}%` }}
                      />
                    </div>
                    <span className="text-2xl font-bold text-gray-900">{readinessScore.score}%</span>
                  </div>

                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div>
                      <h5 className="font-semibold text-gray-900 mb-2">Your Platform Fee</h5>
                      <div className="text-3xl font-bold text-blue-600">
                        {Math.round(readinessScore.feeRate * 100)}%
                      </div>
                      <p className="text-sm text-gray-600">
                        {readinessScore.feeRate === 0.08 && "Congratulations! You qualify for our lowest member rate."}
                        {readinessScore.feeRate === 0.09 && "Great job! Close to our best rate."}
                        {readinessScore.feeRate === 0.10 && "Standard rate. Consider our packages to reduce fees."}
                        {readinessScore.feeRate === 0.12 && "Higher rate due to incomplete materials. Our packages can help!"}
                      </p>
                    </div>

                    <div>
                      <h5 className="font-semibold text-gray-900 mb-2">Recommendations</h5>
                      <ul className="text-sm text-gray-700 space-y-1">
                        {readinessScore.recommendations.map((rec, idx) => (
                          <li key={idx} className="flex items-start">
                            <span className="text-blue-500 mr-2">•</span>
                            {rec}
                          </li>
                        ))}
                      </ul>
                    </div>
                  </div>

                  {recommendedPackage && (
                    <div className="mt-6 p-4 bg-white border border-blue-200 rounded-lg">
                      <h6 className="font-bold text-gray-900 mb-2">Recommended Package</h6>
                      <div className="flex items-center justify-between">
                        <div>
                          <span className="font-semibold capitalize">{recommendedPackage.replace('-', ' ')} Package</span>
                          <p className="text-sm text-gray-600">This package will create the missing materials and help reduce your fees</p>
                        </div>
                        <div className="text-right">
                          <div className="text-lg font-bold text-gray-900">
                            ${
                              recommendedPackage === 'professional' ? '199' :
                              recommendedPackage === 'market-ready' ? '499' :
                              recommendedPackage === 'investor-grade' ? '999' : '49'
                            }
                          </div>
                          <div className="text-sm text-green-600">Pays for itself with first sale!</div>
                        </div>
                      </div>
                    </div>
                  )}
                </motion.div>
              )}
            </motion.div>
          )}

          {/* Step 4: Pricing & Membership */}
          {currentStep === 4 && (
            <motion.div
              key="step4"
              initial={{ opacity: 0, x: 50 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: -50 }}
              className="space-y-6"
            >
              <div className="text-center mb-8">
                <h3 className="text-2xl font-bold text-gray-900 mb-2">Pricing & Membership</h3>
                <p className="text-gray-600">Set your price and choose membership benefits</p>
              </div>

              <div className="bg-gradient-to-r from-yellow-50 to-yellow-100 border border-yellow-200 rounded-lg p-6">
                <h4 className="font-bold text-gray-900 mb-4">Member Benefits Summary</h4>
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                  <div className="text-center">
                    <div className="text-2xl font-bold text-green-600">8%</div>
                    <div className="text-sm text-gray-600">Member fee vs 10% non-member</div>
                  </div>
                  <div className="text-center">
                    <div className="text-2xl font-bold text-blue-600">FREE</div>
                    <div className="text-sm text-gray-600">Unlimited AI assistance</div>
                  </div>
                  <div className="text-center">
                    <div className="text-2xl font-bold text-purple-600">2x</div>
                    <div className="text-sm text-gray-600">Faster sales with certification</div>
                  </div>
                </div>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">Choose Your Membership</label>
                <div className="space-y-3">
                  {[
                    { id: 'starter-investor', name: 'Starter Member', price: '$19/month', benefits: '8% fees, basic AI tools', popular: false },
                    { id: 'professional-investor', name: 'Professional Member', price: '$49/month', benefits: '8% fees, unlimited AI, advanced analytics', popular: true },
                    { id: 'enterprise-investor', name: 'Enterprise Member', price: '$149/month', benefits: '8% fees, white-label tools, priority support', popular: false }
                  ].map(tier => (
                    <label key={tier.id} className={`relative flex items-center p-4 border-2 rounded-lg cursor-pointer hover:border-yellow-400 ${tier.popular ? 'border-yellow-400 bg-yellow-50' : 'border-gray-200'}`}>
                      {tier.popular && (
                        <span className="absolute -top-2 left-4 bg-yellow-400 text-black px-2 py-1 text-xs font-bold rounded">POPULAR</span>
                      )}
                      <input
                        {...register('membershipTier')}
                        type="radio"
                        value={tier.id}
                        className="sr-only"
                      />
                      <div className="flex-1">
                        <div className="flex items-center justify-between">
                          <div>
                            <span className="font-semibold text-gray-900">{tier.name}</span>
                            <p className="text-sm text-gray-600">{tier.benefits}</p>
                          </div>
                          <div className="text-right">
                            <div className="font-bold text-gray-900">{tier.price}</div>
                            <div className="text-sm text-green-600">Saves $200+ per $10K sale</div>
                          </div>
                        </div>
                      </div>
                    </label>
                  ))}
                </div>
              </div>

              {/* Dynamic Pricing Guidance */}
              <PricingGuidance
                platformData={{
                  platformType: watchedData.platformType,
                  techStack: watchedData.techStack || [],
                  estimatedUsers: watchedData.estimatedUsers,
                  monthsInDevelopment: watchedData.monthsInDevelopment,
                  readinessItems: {
                    hasLogo: watchedData.hasLogo || false,
                    hasBrandKit: watchedData.hasBrandKit || false,
                    hasBusinessPlan: watchedData.hasBusinessPlan || false,
                    hasFinancialProjections: watchedData.hasFinancialProjections || false,
                    hasSalesVideo: watchedData.hasSalesVideo || false,
                    hasPitchDeck: watchedData.hasPitchDeck || false,
                    hasExecutiveSummary: watchedData.hasExecutiveSummary || false,
                    hasMarketingMaterials: watchedData.hasMarketingMaterials || false,
                    hasLegalDocuments: watchedData.hasLegalDocuments || false,
                  }
                }}
                currentPrice={watchedData.suggestedPrice}
                onPriceUpdate={(price) => setValue('suggestedPrice', price)}
              />

              <div className="mt-6">
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Your Asking Price (USD)
                  <span className="text-sm text-gray-500 ml-2">You can adjust based on the guidance above</span>
                </label>
                <div className="relative">
                  <span className="absolute left-4 top-1/2 transform -translate-y-1/2 text-gray-500">$</span>
                  <input
                    {...register('suggestedPrice', { valueAsNumber: true })}
                    type="number"
                    min="1000"
                    step="1000"
                    className="w-full pl-8 pr-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-yellow-400 focus:border-transparent"
                    placeholder="25000"
                  />
                </div>
                {errors.suggestedPrice && (
                  <p className="mt-1 text-sm text-red-600">{errors.suggestedPrice.message as string}</p>
                )}
              </div>
            </motion.div>
          )}

          {/* Step 5: Legal & Liability */}
          {currentStep === 5 && (
            <motion.div
              key="step5"
              initial={{ opacity: 0, x: 50 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: -50 }}
              className="space-y-6"
            >
              <div className="text-center mb-8">
                <h3 className="text-2xl font-bold text-gray-900 mb-2">Legal Agreements</h3>
                <p className="text-gray-600">Please review and accept our terms</p>
              </div>

              <div className="bg-red-50 border border-red-200 rounded-lg p-6">
                <div className="flex">
                  <svg className="w-6 h-6 text-red-400 mr-3 mt-1" fill="currentColor" viewBox="0 0 20 20">
                    <path fillRule="evenodd" d="M8.257 3.099c.765-1.36 2.722-1.36 3.486 0l5.58 9.92c.75 1.334-.213 2.98-1.742 2.98H4.42c-1.53 0-2.493-1.646-1.743-2.98l5.58-9.92zM11 13a1 1 0 11-2 0 1 1 0 012 0zm-1-8a1 1 0 00-1 1v3a1 1 0 002 0V6a1 1 0 00-1-1z" clipRule="evenodd" />
                  </svg>
                  <div>
                    <h4 className="font-bold text-red-800 text-lg mb-2">Important Legal Notice</h4>
                    <p className="text-red-700 mb-4">
                      By using TechFlunky's marketplace, you acknowledge and agree to the following terms that protect both you and our platform.
                    </p>
                  </div>
                </div>
              </div>

              <div className="space-y-4">
                <label className="flex items-start p-4 border border-gray-200 rounded-lg">
                  <input
                    {...register('agreesToTerms')}
                    type="checkbox"
                    className="mt-1 rounded border-gray-300 text-yellow-600 focus:ring-yellow-400"
                  />
                  <div className="ml-3">
                    <span className="font-medium text-gray-900">I agree to the Terms of Service and Privacy Policy</span>
                    <p className="text-sm text-gray-600 mt-1">
                      I have read and agree to TechFlunky's <a href="/terms" className="text-blue-600 hover:underline" target="_blank">Terms of Service</a> and <a href="/privacy" className="text-blue-600 hover:underline" target="_blank">Privacy Policy</a>.
                    </p>
                  </div>
                </label>

                <label className="flex items-start p-4 border border-gray-200 rounded-lg">
                  <input
                    {...register('understandsRisks')}
                    type="checkbox"
                    className="mt-1 rounded border-gray-300 text-yellow-600 focus:ring-yellow-400"
                  />
                  <div className="ml-3">
                    <span className="font-medium text-gray-900">I understand the risks of selling software platforms</span>
                    <p className="text-sm text-gray-600 mt-1">
                      I understand that selling software involves inherent risks including but not limited to: technical issues, market changes, buyer disputes, and no guarantee of sale.
                    </p>
                  </div>
                </label>

                <label className="flex items-start p-4 border border-red-200 rounded-lg bg-red-50">
                  <input
                    {...register('holdsHarmless')}
                    type="checkbox"
                    className="mt-1 rounded border-gray-300 text-yellow-600 focus:ring-yellow-400"
                  />
                  <div className="ml-3">
                    <span className="font-medium text-gray-900">Hold Harmless Agreement</span>
                    <p className="text-sm text-gray-600 mt-1">
                      <strong>I agree to hold TechFlunky harmless</strong> from any and all claims, damages, losses, or legal issues arising from:
                      my platform's code, functionality, security vulnerabilities, intellectual property disputes,
                      user data handling, regulatory compliance, or any other aspect of my platform's operation.
                    </p>
                  </div>
                </label>

                <label className="flex items-start p-4 border border-red-200 rounded-lg bg-red-50">
                  <input
                    {...register('noGuarantees')}
                    type="checkbox"
                    className="mt-1 rounded border-gray-300 text-yellow-600 focus:ring-yellow-400"
                  />
                  <div className="ml-3">
                    <span className="font-medium text-gray-900">No Guarantees Acknowledgment</span>
                    <p className="text-sm text-gray-600 mt-1">
                      <strong>I acknowledge that TechFlunky provides no guarantees</strong> regarding:
                      sale of my platform, timeline for sale, final sale price, buyer satisfaction,
                      platform performance, or any business outcomes. All sales are "as-is" transactions.
                    </p>
                  </div>
                </label>
              </div>

              {Object.keys(errors).length > 0 && (
                <div className="bg-red-50 border border-red-200 rounded-lg p-4">
                  <p className="text-red-800 font-medium">Please check all required agreements to continue.</p>
                </div>
              )}
            </motion.div>
          )}
        </AnimatePresence>

        {/* Navigation Buttons */}
        <div className="flex justify-between pt-8 border-t border-gray-200">
          <button
            type="button"
            onClick={prevStep}
            disabled={currentStep === 1}
            className={`px-6 py-3 border border-gray-300 text-gray-700 rounded-lg font-medium ${
              currentStep === 1
                ? 'opacity-50 cursor-not-allowed'
                : 'hover:bg-gray-50'
            }`}
          >
            Previous
          </button>

          <div className="flex space-x-3">
            {currentStep < 5 ? (
              <button
                type="submit"
                className="px-8 py-3 bg-yellow-400 text-black rounded-lg font-medium hover:bg-yellow-300 transition-colors"
              >
                Next Step
              </button>
            ) : (
              <button
                type="submit"
                disabled={isSubmitting}
                className={`px-8 py-3 bg-green-600 text-white rounded-lg font-medium ${
                  isSubmitting
                    ? 'opacity-50 cursor-not-allowed'
                    : 'hover:bg-green-700'
                } transition-colors`}
              >
                {isSubmitting ? 'Creating Account...' : 'Complete Onboarding'}
              </button>
            )}
          </div>
        </div>
      </form>
    </div>
  );
}