// Seamless Buyer Purchase and Deployment Workflow
import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';

interface PlatformDetails {
  id: string;
  name: string;
  description: string;
  price: number;
  seller: string;
  techStack: string[];
  features: string[];
  estimatedDeploymentTime: string;
  supportLevel: 'basic' | 'premium' | 'enterprise';
  includesHosting: boolean;
  customizationLevel: 'minimal' | 'moderate' | 'extensive';
}

interface DeploymentOptions {
  hosting: 'cloudflare' | 'aws' | 'self-hosted';
  domain: string;
  customization: string[];
  supportPackage: 'basic' | 'premium' | 'enterprise';
  launchTimeline: 'immediate' | 'standard' | 'custom';
}

interface PurchaseData {
  buyerInfo: {
    firstName: string;
    lastName: string;
    email: string;
    company: string;
    phone: string;
  };
  deploymentOptions: DeploymentOptions;
  additionalServices: string[];
  specialRequests: string;
}

const HOSTING_OPTIONS = [
  {
    id: 'cloudflare',
    name: 'Cloudflare Pages + Workers',
    description: 'Ultra-fast global deployment with edge computing',
    monthlyPrice: 20,
    features: ['Global CDN', 'Serverless functions', 'SSL included', 'DDoS protection'],
    setupTime: '24 hours'
  },
  {
    id: 'aws',
    name: 'AWS Professional Setup',
    description: 'Enterprise-grade infrastructure with full control',
    monthlyPrice: 50,
    features: ['EC2 instances', 'RDS database', 'Load balancing', 'Auto-scaling'],
    setupTime: '3-5 days'
  },
  {
    id: 'self-hosted',
    name: 'Self-Hosted Setup',
    description: 'Complete code transfer to your infrastructure',
    monthlyPrice: 0,
    features: ['Full source code', 'Documentation', 'Setup guide', 'Basic support'],
    setupTime: '1-2 weeks'
  }
];

const SUPPORT_PACKAGES = [
  {
    id: 'basic',
    name: 'Basic Support',
    price: 0,
    features: ['Email support', 'Knowledge base', 'Community forum'],
    responseTime: '48 hours'
  },
  {
    id: 'premium',
    name: 'Premium Support',
    price: 199,
    features: ['Priority email/chat', 'Video calls', 'Custom training', 'Monthly check-ins'],
    responseTime: '4 hours'
  },
  {
    id: 'enterprise',
    name: 'Enterprise Support',
    price: 499,
    features: ['Dedicated success manager', '24/7 support', 'Custom development', 'SLA guarantee'],
    responseTime: '1 hour'
  }
];

interface PurchaseWorkflowProps {
  platform: PlatformDetails;
  onComplete?: (data: any) => void;
}

export default function PurchaseWorkflow({ platform, onComplete }: PurchaseWorkflowProps) {
  const [currentStep, setCurrentStep] = useState(1);
  const [purchaseData, setPurchaseData] = useState<PurchaseData>({
    buyerInfo: {
      firstName: '',
      lastName: '',
      email: '',
      company: '',
      phone: ''
    },
    deploymentOptions: {
      hosting: 'cloudflare',
      domain: '',
      customization: [],
      supportPackage: 'basic',
      launchTimeline: 'standard'
    },
    additionalServices: [],
    specialRequests: ''
  });
  const [isProcessing, setIsProcessing] = useState(false);
  const [totalCost, setTotalCost] = useState(0);

  const steps = [
    { id: 1, name: 'Your Information', icon: '👤' },
    { id: 2, name: 'Deployment Setup', icon: '🚀' },
    { id: 3, name: 'Support & Services', icon: '🛠️' },
    { id: 4, name: 'Review & Payment', icon: '💳' }
  ];

  useEffect(() => {
    calculateTotalCost();
  }, [purchaseData]);

  const calculateTotalCost = () => {
    let cost = platform.price;

    // Add hosting costs (first 3 months)
    const hostingOption = HOSTING_OPTIONS.find(h => h.id === purchaseData.deploymentOptions.hosting);
    if (hostingOption) {
      cost += hostingOption.monthlyPrice * 3;
    }

    // Add support package cost (annual)
    const supportOption = SUPPORT_PACKAGES.find(s => s.id === purchaseData.deploymentOptions.supportPackage);
    if (supportOption) {
      cost += supportOption.price * 12;
    }

    // Add additional services
    const servicesCost = purchaseData.additionalServices.length * 299; // $299 per additional service
    cost += servicesCost;

    setTotalCost(cost);
  };

  const updateBuyerInfo = (field: string, value: string) => {
    setPurchaseData(prev => ({
      ...prev,
      buyerInfo: { ...prev.buyerInfo, [field]: value }
    }));
  };

  const updateDeploymentOptions = (field: string, value: any) => {
    setPurchaseData(prev => ({
      ...prev,
      deploymentOptions: { ...prev.deploymentOptions, [field]: value }
    }));
  };

  const handleNext = () => {
    if (currentStep < 4) {
      setCurrentStep(currentStep + 1);
    }
  };

  const handlePrevious = () => {
    if (currentStep > 1) {
      setCurrentStep(currentStep - 1);
    }
  };

  const handlePurchase = async () => {
    setIsProcessing(true);
    try {
      const response = await fetch('/api/buyer/purchase', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          platformId: platform.id,
          purchaseData,
          totalCost
        })
      });

      if (response.ok) {
        const result = await response.json();
        onComplete?.(result);
      }
    } catch (error) {
      console.error('Purchase failed:', error);
    }
    setIsProcessing(false);
  };

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'USD',
      minimumFractionDigits: 0
    }).format(amount);
  };

  return (
    <div className="max-w-4xl mx-auto p-6">
      {/* Header */}
      <div className="text-center mb-8">
        <h1 className="text-3xl font-bold text-gray-900 mb-2">Complete Your Purchase</h1>
        <p className="text-gray-600">Secure your platform and get ready for launch</p>
      </div>

      {/* Platform Summary */}
      <div className="bg-gradient-to-r from-blue-50 to-indigo-50 rounded-xl p-6 mb-8">
        <div className="flex items-start justify-between">
          <div>
            <h3 className="text-xl font-semibold text-gray-900 mb-2">{platform.name}</h3>
            <p className="text-gray-600 mb-4">{platform.description}</p>
            <div className="flex flex-wrap gap-2">
              {platform.techStack.slice(0, 5).map(tech => (
                <span key={tech} className="px-2 py-1 bg-blue-100 text-blue-800 text-xs rounded-full">
                  {tech}
                </span>
              ))}
            </div>
          </div>
          <div className="text-right">
            <div className="text-2xl font-bold text-gray-900">{formatCurrency(platform.price)}</div>
            <div className="text-sm text-gray-600">Base Platform Price</div>
          </div>
        </div>
      </div>

      {/* Progress Indicator */}
      <div className="flex items-center justify-between mb-8">
        {steps.map((step, index) => (
          <div key={step.id} className="flex items-center">
            <div className={`flex items-center justify-center w-10 h-10 rounded-full ${
              currentStep >= step.id
                ? 'bg-blue-600 text-white'
                : 'bg-gray-200 text-gray-600'
            }`}>
              {currentStep > step.id ? '✓' : step.icon}
            </div>
            <div className="ml-3">
              <div className={`text-sm font-medium ${
                currentStep >= step.id ? 'text-blue-600' : 'text-gray-600'
              }`}>
                {step.name}
              </div>
            </div>
            {index < steps.length - 1 && (
              <div className={`flex-1 mx-4 h-1 rounded-full ${
                currentStep > step.id ? 'bg-blue-600' : 'bg-gray-200'
              }`} />
            )}
          </div>
        ))}
      </div>

      {/* Step Content */}
      <div className="bg-white rounded-xl border border-gray-200 p-8 mb-8">
        <AnimatePresence mode="wait">
          {/* Step 1: Buyer Information */}
          {currentStep === 1 && (
            <motion.div
              key="step1"
              initial={{ opacity: 0, x: 50 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: -50 }}
              className="space-y-6"
            >
              <h3 className="text-xl font-semibold text-gray-900 mb-6">👤 Your Information</h3>

              <div className="grid md:grid-cols-2 gap-6">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">First Name</label>
                  <input
                    type="text"
                    value={purchaseData.buyerInfo.firstName}
                    onChange={(e) => updateBuyerInfo('firstName', e.target.value)}
                    className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                    placeholder="John"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">Last Name</label>
                  <input
                    type="text"
                    value={purchaseData.buyerInfo.lastName}
                    onChange={(e) => updateBuyerInfo('lastName', e.target.value)}
                    className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                    placeholder="Smith"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">Email Address</label>
                  <input
                    type="email"
                    value={purchaseData.buyerInfo.email}
                    onChange={(e) => updateBuyerInfo('email', e.target.value)}
                    className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                    placeholder="john@company.com"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">Phone Number</label>
                  <input
                    type="tel"
                    value={purchaseData.buyerInfo.phone}
                    onChange={(e) => updateBuyerInfo('phone', e.target.value)}
                    className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                    placeholder="(555) 123-4567"
                  />
                </div>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">Company/Organization</label>
                <input
                  type="text"
                  value={purchaseData.buyerInfo.company}
                  onChange={(e) => updateBuyerInfo('company', e.target.value)}
                  className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  placeholder="Your Company Name"
                />
              </div>
            </motion.div>
          )}

          {/* Step 2: Deployment Setup */}
          {currentStep === 2 && (
            <motion.div
              key="step2"
              initial={{ opacity: 0, x: 50 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: -50 }}
              className="space-y-6"
            >
              <h3 className="text-xl font-semibold text-gray-900 mb-6">🚀 Deployment Setup</h3>

              {/* Hosting Options */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-4">Choose Your Hosting</label>
                <div className="grid md:grid-cols-3 gap-4">
                  {HOSTING_OPTIONS.map(option => (
                    <label
                      key={option.id}
                      className={`p-4 border-2 rounded-lg cursor-pointer transition-all ${
                        purchaseData.deploymentOptions.hosting === option.id
                          ? 'border-blue-500 bg-blue-50'
                          : 'border-gray-200 hover:border-blue-300'
                      }`}
                    >
                      <input
                        type="radio"
                        value={option.id}
                        checked={purchaseData.deploymentOptions.hosting === option.id}
                        onChange={(e) => updateDeploymentOptions('hosting', e.target.value)}
                        className="sr-only"
                      />
                      <div className="font-semibold text-gray-900 mb-1">{option.name}</div>
                      <div className="text-sm text-gray-600 mb-3">{option.description}</div>
                      <div className="text-lg font-bold text-blue-600 mb-2">
                        {option.monthlyPrice > 0 ? `${formatCurrency(option.monthlyPrice)}/month` : 'One-time setup'}
                      </div>
                      <div className="space-y-1">
                        {option.features.slice(0, 2).map(feature => (
                          <div key={feature} className="text-xs text-gray-600 flex items-center">
                            <span className="text-green-500 mr-1">✓</span>
                            {feature}
                          </div>
                        ))}
                      </div>
                      <div className="text-xs text-gray-500 mt-2">Setup: {option.setupTime}</div>
                    </label>
                  ))}
                </div>
              </div>

              {/* Domain Configuration */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">Custom Domain (Optional)</label>
                <input
                  type="text"
                  value={purchaseData.deploymentOptions.domain}
                  onChange={(e) => updateDeploymentOptions('domain', e.target.value)}
                  className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  placeholder="your-platform.com"
                />
                <p className="mt-1 text-sm text-gray-600">
                  We'll help configure your custom domain. Leave blank to use a TechFlunky subdomain.
                </p>
              </div>

              {/* Launch Timeline */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-4">Launch Timeline</label>
                <div className="grid grid-cols-3 gap-4">
                  {[
                    { id: 'immediate', name: 'ASAP', desc: '24-48 hours', extra: '+$500 rush fee' },
                    { id: 'standard', name: 'Standard', desc: '3-7 days', extra: 'Recommended' },
                    { id: 'custom', name: 'Custom', desc: 'Schedule later', extra: 'Flexible timing' }
                  ].map(timeline => (
                    <label
                      key={timeline.id}
                      className={`p-4 border-2 rounded-lg cursor-pointer text-center transition-all ${
                        purchaseData.deploymentOptions.launchTimeline === timeline.id
                          ? 'border-blue-500 bg-blue-50'
                          : 'border-gray-200 hover:border-blue-300'
                      }`}
                    >
                      <input
                        type="radio"
                        value={timeline.id}
                        checked={purchaseData.deploymentOptions.launchTimeline === timeline.id}
                        onChange={(e) => updateDeploymentOptions('launchTimeline', e.target.value)}
                        className="sr-only"
                      />
                      <div className="font-semibold text-gray-900">{timeline.name}</div>
                      <div className="text-sm text-gray-600">{timeline.desc}</div>
                      <div className="text-xs text-blue-600 mt-1">{timeline.extra}</div>
                    </label>
                  ))}
                </div>
              </div>
            </motion.div>
          )}

          {/* Step 3: Support & Services */}
          {currentStep === 3 && (
            <motion.div
              key="step3"
              initial={{ opacity: 0, x: 50 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: -50 }}
              className="space-y-6"
            >
              <h3 className="text-xl font-semibold text-gray-900 mb-6">🛠️ Support & Services</h3>

              {/* Support Packages */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-4">Support Package</label>
                <div className="space-y-4">
                  {SUPPORT_PACKAGES.map(pkg => (
                    <label
                      key={pkg.id}
                      className={`flex items-start p-4 border-2 rounded-lg cursor-pointer transition-all ${
                        purchaseData.deploymentOptions.supportPackage === pkg.id
                          ? 'border-blue-500 bg-blue-50'
                          : 'border-gray-200 hover:border-blue-300'
                      }`}
                    >
                      <input
                        type="radio"
                        value={pkg.id}
                        checked={purchaseData.deploymentOptions.supportPackage === pkg.id}
                        onChange={(e) => updateDeploymentOptions('supportPackage', e.target.value)}
                        className="mt-1 rounded border-gray-300 text-blue-600 focus:ring-blue-500"
                      />
                      <div className="ml-4 flex-1">
                        <div className="flex items-center justify-between">
                          <div className="font-semibold text-gray-900">{pkg.name}</div>
                          <div className="text-lg font-bold text-blue-600">
                            {pkg.price > 0 ? `${formatCurrency(pkg.price)}/year` : 'Free'}
                          </div>
                        </div>
                        <div className="text-sm text-gray-600 mb-2">Response time: {pkg.responseTime}</div>
                        <div className="flex flex-wrap gap-2">
                          {pkg.features.map(feature => (
                            <span key={feature} className="text-xs bg-gray-100 text-gray-700 px-2 py-1 rounded-full">
                              {feature}
                            </span>
                          ))}
                        </div>
                      </div>
                    </label>
                  ))}
                </div>
              </div>

              {/* Additional Services */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-4">Additional Services ($299 each)</label>
                <div className="grid md:grid-cols-2 gap-4">
                  {[
                    'Custom branding & design',
                    'SEO optimization setup',
                    'Analytics integration',
                    'Email marketing setup',
                    'Payment gateway integration',
                    'Social media integration',
                    'Advanced security hardening',
                    'Performance optimization'
                  ].map(service => (
                    <label key={service} className="flex items-center p-3 border border-gray-200 rounded-lg cursor-pointer hover:border-blue-300">
                      <input
                        type="checkbox"
                        value={service}
                        checked={purchaseData.additionalServices.includes(service)}
                        onChange={(e) => {
                          if (e.target.checked) {
                            setPurchaseData(prev => ({
                              ...prev,
                              additionalServices: [...prev.additionalServices, service]
                            }));
                          } else {
                            setPurchaseData(prev => ({
                              ...prev,
                              additionalServices: prev.additionalServices.filter(s => s !== service)
                            }));
                          }
                        }}
                        className="rounded border-gray-300 text-blue-600 focus:ring-blue-500"
                      />
                      <span className="ml-3 text-sm text-gray-700">{service}</span>
                    </label>
                  ))}
                </div>
              </div>

              {/* Special Requests */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">Special Requests or Custom Requirements</label>
                <textarea
                  value={purchaseData.specialRequests}
                  onChange={(e) => setPurchaseData(prev => ({ ...prev, specialRequests: e.target.value }))}
                  rows={4}
                  className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  placeholder="Describe any specific customizations, integrations, or requirements..."
                />
              </div>
            </motion.div>
          )}

          {/* Step 4: Review & Payment */}
          {currentStep === 4 && (
            <motion.div
              key="step4"
              initial={{ opacity: 0, x: 50 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: -50 }}
              className="space-y-6"
            >
              <h3 className="text-xl font-semibold text-gray-900 mb-6">💳 Review & Payment</h3>

              {/* Order Summary */}
              <div className="bg-gray-50 rounded-lg p-6">
                <h4 className="font-semibold text-gray-900 mb-4">Order Summary</h4>
                <div className="space-y-3">
                  <div className="flex justify-between">
                    <span className="text-gray-600">Platform: {platform.name}</span>
                    <span className="font-medium">{formatCurrency(platform.price)}</span>
                  </div>

                  {purchaseData.deploymentOptions.hosting !== 'self-hosted' && (
                    <div className="flex justify-between">
                      <span className="text-gray-600">
                        Hosting (3 months) - {HOSTING_OPTIONS.find(h => h.id === purchaseData.deploymentOptions.hosting)?.name}
                      </span>
                      <span className="font-medium">
                        {formatCurrency((HOSTING_OPTIONS.find(h => h.id === purchaseData.deploymentOptions.hosting)?.monthlyPrice || 0) * 3)}
                      </span>
                    </div>
                  )}

                  {purchaseData.deploymentOptions.supportPackage !== 'basic' && (
                    <div className="flex justify-between">
                      <span className="text-gray-600">
                        Support (1 year) - {SUPPORT_PACKAGES.find(s => s.id === purchaseData.deploymentOptions.supportPackage)?.name}
                      </span>
                      <span className="font-medium">
                        {formatCurrency((SUPPORT_PACKAGES.find(s => s.id === purchaseData.deploymentOptions.supportPackage)?.price || 0) * 12)}
                      </span>
                    </div>
                  )}

                  {purchaseData.additionalServices.length > 0 && (
                    <div className="flex justify-between">
                      <span className="text-gray-600">Additional Services ({purchaseData.additionalServices.length})</span>
                      <span className="font-medium">{formatCurrency(purchaseData.additionalServices.length * 299)}</span>
                    </div>
                  )}

                  {purchaseData.deploymentOptions.launchTimeline === 'immediate' && (
                    <div className="flex justify-between">
                      <span className="text-gray-600">Rush Delivery Fee</span>
                      <span className="font-medium">{formatCurrency(500)}</span>
                    </div>
                  )}

                  <div className="border-t pt-3">
                    <div className="flex justify-between text-lg font-bold">
                      <span>Total</span>
                      <span>{formatCurrency(totalCost + (purchaseData.deploymentOptions.launchTimeline === 'immediate' ? 500 : 0))}</span>
                    </div>
                  </div>
                </div>
              </div>

              {/* Payment Method */}
              <div>
                <h4 className="font-semibold text-gray-900 mb-4">Payment Method</h4>
                <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-4">
                  <div className="flex">
                    <svg className="w-5 h-5 text-yellow-400 mr-3 mt-0.5" fill="currentColor" viewBox="0 0 20 20">
                      <path fillRule="evenodd" d="M8.257 3.099c.765-1.36 2.722-1.36 3.486 0l5.58 9.92c.75 1.334-.213 2.98-1.742 2.98H4.42c-1.53 0-2.493-1.646-1.743-2.98l5.58-9.92zM11 13a1 1 0 11-2 0 1 1 0 012 0zm-1-8a1 1 0 00-1 1v3a1 1 0 002 0V6a1 1 0 00-1-1z" clipRule="evenodd" />
                    </svg>
                    <div>
                      <h5 className="font-medium text-yellow-800">Secure Escrow Payment</h5>
                      <p className="text-sm text-yellow-700 mt-1">
                        Your payment is held securely until you confirm the platform meets your expectations (3-day review period).
                      </p>
                    </div>
                  </div>
                </div>
              </div>

              {/* Terms Agreement */}
              <div className="space-y-4">
                <label className="flex items-start">
                  <input
                    type="checkbox"
                    className="mt-1 rounded border-gray-300 text-blue-600 focus:ring-blue-500"
                  />
                  <div className="ml-3">
                    <span className="font-medium text-gray-900">Terms and Conditions</span>
                    <p className="text-sm text-gray-600 mt-1">
                      I have read and agree to the <a href="/terms" className="text-blue-600 hover:underline">Terms of Service</a> and{' '}
                      <a href="/purchase-agreement" className="text-blue-600 hover:underline">Purchase Agreement</a>.
                    </p>
                  </div>
                </label>

                <label className="flex items-start">
                  <input
                    type="checkbox"
                    className="mt-1 rounded border-gray-300 text-blue-600 focus:ring-blue-500"
                  />
                  <div className="ml-3">
                    <span className="font-medium text-gray-900">Escrow Agreement</span>
                    <p className="text-sm text-gray-600 mt-1">
                      I understand that payment will be held in escrow until I confirm receipt and satisfaction with the platform delivery.
                    </p>
                  </div>
                </label>
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </div>

      {/* Navigation */}
      <div className="flex justify-between">
        <button
          onClick={handlePrevious}
          disabled={currentStep === 1}
          className="px-6 py-3 border border-gray-300 rounded-lg font-medium text-gray-700 hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed"
        >
          Previous
        </button>

        <div className="text-right">
          <div className="text-sm text-gray-600 mb-2">
            Total: <span className="text-xl font-bold text-gray-900">
              {formatCurrency(totalCost + (purchaseData.deploymentOptions.launchTimeline === 'immediate' ? 500 : 0))}
            </span>
          </div>
          {currentStep < 4 ? (
            <button
              onClick={handleNext}
              className="px-8 py-3 bg-blue-600 text-white rounded-lg font-medium hover:bg-blue-700"
            >
              Continue
            </button>
          ) : (
            <button
              onClick={handlePurchase}
              disabled={isProcessing}
              className="px-8 py-3 bg-green-600 text-white rounded-lg font-medium hover:bg-green-700 disabled:opacity-50 flex items-center"
            >
              {isProcessing ? (
                <>
                  <svg className="animate-spin -ml-1 mr-2 h-4 w-4 text-white" fill="none" viewBox="0 0 24 24">
                    <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                    <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" />
                  </svg>
                  Processing...
                </>
              ) : (
                'Complete Purchase'
              )}
            </button>
          )}
        </div>
      </div>
    </div>
  );
}