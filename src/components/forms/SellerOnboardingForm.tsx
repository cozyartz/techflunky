import React, { useState } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { motion, AnimatePresence } from 'framer-motion';
import Confetti from 'react-confetti';

// Validation schemas for each step
const step1Schema = z.object({
  firstName: z.string().min(2, 'First name must be at least 2 characters'),
  lastName: z.string().min(2, 'Last name must be at least 2 characters'),
  email: z.string().email('Please enter a valid email address'),
});

const step2Schema = z.object({
  businessType: z.enum(['individual', 'company'], {
    required_error: 'Please select a business type',
  }),
  businessName: z.string().optional(),
  country: z.string().min(1, 'Please select your country'),
  hasExperience: z.boolean(),
});

const step3Schema = z.object({
  platformType: z.array(z.string()).min(1, 'Please select at least one platform type'),
  techStack: z.array(z.string()).min(1, 'Please select at least one technology'),
  estimatedValue: z.string().min(1, 'Please select an estimated value range'),
  hasDocumentation: z.boolean(),
});

const step4Schema = z.object({
  repositoryType: z.enum(['github', 'gitlab', 'private'], {
    required_error: 'Please select how you want to share your code',
  }),
  repositoryUrl: z.string().optional(),
  githubUsername: z.string().optional(),
  accessMethod: z.enum(['private_invite', 'demo_deploy', 'video_demo'], {
    required_error: 'Please select how buyers can preview your platform',
  }),
  hasReadme: z.boolean(),
});

const step5Schema = z.object({
  needsContainerization: z.boolean(),
  currentDeployment: z.string().optional(),
  environmentVariables: z.boolean(),
  databaseRequired: z.boolean(),
  hasDockerfile: z.boolean(),
});

const step6Schema = z.object({
  agreeToTerms: z.boolean().refine(val => val === true, 'You must agree to the terms'),
  marketingEmails: z.boolean(),
});

type Step1Data = z.infer<typeof step1Schema>;
type Step2Data = z.infer<typeof step2Schema>;
type Step3Data = z.infer<typeof step3Schema>;
type Step4Data = z.infer<typeof step4Schema>;
type Step5Data = z.infer<typeof step5Schema>;
type Step6Data = z.infer<typeof step6Schema>;

type FormData = Step1Data & Step2Data & Step3Data & Step4Data & Step5Data & Step6Data;

const steps = [
  { id: 1, title: 'Personal Info', description: 'Tell us about yourself' },
  { id: 2, title: 'Business Details', description: 'Business information' },
  { id: 3, title: 'Platform Details', description: 'About your platforms' },
  { id: 4, title: 'Code Repository', description: 'Secure code linking' },
  { id: 5, title: 'Containerization', description: 'Deployment setup' },
  { id: 6, title: 'Final Steps', description: 'Complete your application' },
];

const platformTypes = [
  { id: 'saas', label: 'SaaS Platform', description: 'Software as a Service applications' },
  { id: 'ecommerce', label: 'E-commerce', description: 'Online stores and marketplaces' },
  { id: 'ai-ml', label: 'AI/ML Platform', description: 'Artificial intelligence applications' },
  { id: 'fintech', label: 'FinTech', description: 'Financial technology solutions' },
  { id: 'healthcare', label: 'HealthTech', description: 'Healthcare and medical platforms' },
  { id: 'edtech', label: 'EdTech', description: 'Educational technology platforms' },
  { id: 'other', label: 'Other', description: 'Custom or specialized platforms' },
];

const techStacks = [
  'React/Next.js', 'Vue/Nuxt.js', 'Angular', 'Astro/SvelteKit',
  'Node.js', 'Python', 'Go/Rust', 'PHP',
  'PostgreSQL', 'MySQL', 'MongoDB', 'Redis',
  'Cloudflare', 'AWS', 'Google Cloud', 'Vercel/Netlify'
];

const countries = [
  'United States', 'Canada', 'United Kingdom', 'Germany', 'France',
  'Australia', 'Netherlands', 'Sweden', 'Switzerland', 'Other'
];

export default function SellerOnboardingForm() {
  const [currentStep, setCurrentStep] = useState(1);
  const [showConfetti, setShowConfetti] = useState(false);
  const [formData, setFormData] = useState<Partial<FormData>>({});
  const [isSubmitting, setIsSubmitting] = useState(false);

  const {
    register,
    handleSubmit,
    formState: { errors },
    watch,
    setValue,
    trigger,
  } = useForm<FormData>({
    resolver: zodResolver(
      currentStep === 1 ? step1Schema :
      currentStep === 2 ? step2Schema :
      currentStep === 3 ? step3Schema :
      currentStep === 4 ? step4Schema :
      currentStep === 5 ? step5Schema :
      step6Schema
    ),
    defaultValues: formData,
  });

  const nextStep = async () => {
    const isValid = await trigger();
    if (isValid) {
      setFormData(prev => ({ ...prev, ...watch() }));
      setCurrentStep(prev => Math.min(prev + 1, 6));
    }
  };

  const prevStep = () => {
    setCurrentStep(prev => Math.max(prev - 1, 1));
  };

  const onSubmit = async (data: FormData) => {
    setIsSubmitting(true);
    try {
      const fullData = { ...formData, ...data };

      // First, analyze repository and generate containerization if needed
      if (fullData.needsContainerization || fullData.repositoryUrl) {
        const analysisResponse = await fetch('/api/seller/analyze-repository', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            repositoryUrl: fullData.repositoryUrl,
            techStack: fullData.techStack,
            needsContainerization: fullData.needsContainerization,
          }),
        });

        const analysisResult = await analysisResponse.json();
        fullData.analysis = analysisResult.analysis;
        fullData.containerization = analysisResult.containerization;
      }

      // Create seller account with all data
      const response = await fetch('/api/seller/create-account', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(fullData),
      });

      const result = await response.json();

      if (result.accountLinkUrl) {
        setShowConfetti(true);
        setTimeout(() => {
          window.location.href = result.accountLinkUrl;
        }, 2000);
      }
    } catch (error) {
      console.error('Onboarding error:', error);
      alert('Failed to create seller account. Please try again.');
    } finally {
      setIsSubmitting(false);
    }
  };

  const platformTypeValues = watch('platformType') || [];
  const techStackValues = watch('techStack') || [];

  const toggleArrayValue = (fieldName: keyof FormData, value: string) => {
    const currentValues = watch(fieldName) as string[] || [];
    const newValues = currentValues.includes(value)
      ? currentValues.filter(v => v !== value)
      : [...currentValues, value];
    setValue(fieldName, newValues);
  };

  return (
    <div className="max-w-4xl mx-auto">
      {showConfetti && <Confetti recycle={false} numberOfPieces={200} />}

      {/* Progress Bar */}
      <div className="mb-8">
        <div className="flex items-center justify-between">
          {steps.map((step, index) => (
            <div key={step.id} className="flex items-center flex-1">
              <div className="flex items-center">
                <div className={`w-10 h-10 rounded-full flex items-center justify-center font-bold transition-all duration-300 ${
                  currentStep > step.id
                    ? 'bg-yellow-400 text-black'
                    : currentStep === step.id
                    ? 'bg-yellow-400 text-black animate-pulse'
                    : 'bg-gray-700 text-gray-400'
                }`}>
                  {currentStep > step.id ? (
                    <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 20 20">
                      <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd"/>
                    </svg>
                  ) : (
                    step.id
                  )}
                </div>
                <div className="ml-3 hidden sm:block">
                  <p className={`text-sm font-semibold ${
                    currentStep >= step.id ? 'text-white' : 'text-gray-400'
                  }`}>
                    {step.title}
                  </p>
                  <p className={`text-xs ${
                    currentStep >= step.id ? 'text-gray-300' : 'text-gray-500'
                  }`}>
                    {step.description}
                  </p>
                </div>
              </div>
              {index < steps.length - 1 && (
                <div className={`flex-1 h-0.5 mx-4 transition-all duration-300 ${
                  currentStep > step.id ? 'bg-yellow-400' : 'bg-gray-700'
                }`} />
              )}
            </div>
          ))}
        </div>
      </div>

      {/* Form Content */}
      <motion.div
        className="card-glass p-8"
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.3 }}
      >
        <form onSubmit={handleSubmit(onSubmit)} className="space-y-6">
          <AnimatePresence mode="wait">
            {/* Step 1: Personal Information */}
            {currentStep === 1 && (
              <motion.div
                key="step1"
                initial={{ opacity: 0, x: 20 }}
                animate={{ opacity: 1, x: 0 }}
                exit={{ opacity: 0, x: -20 }}
                className="space-y-6"
              >
                <div className="text-center mb-8">
                  <h2 className="text-3xl font-bold text-white mb-2">Welcome to TechFlunky!</h2>
                  <p className="text-gray-300">Let's start with your basic information</p>
                </div>

                <div className="grid md:grid-cols-2 gap-6">
                  <div>
                    <label className="block text-sm font-medium text-gray-300 mb-2">
                      First Name *
                    </label>
                    <input
                      {...register('firstName')}
                      className="w-full px-4 py-3 bg-black/30 border border-yellow-400/20 rounded-xl text-white placeholder-gray-400 focus:border-yellow-400 focus:ring-2 focus:ring-yellow-400/20 transition-all duration-300"
                      placeholder="Your first name"
                    />
                    {errors.firstName && (
                      <p className="mt-1 text-sm text-red-400">{errors.firstName.message}</p>
                    )}
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-300 mb-2">
                      Last Name *
                    </label>
                    <input
                      {...register('lastName')}
                      className="w-full px-4 py-3 bg-black/30 border border-yellow-400/20 rounded-xl text-white placeholder-gray-400 focus:border-yellow-400 focus:ring-2 focus:ring-yellow-400/20 transition-all duration-300"
                      placeholder="Your last name"
                    />
                    {errors.lastName && (
                      <p className="mt-1 text-sm text-red-400">{errors.lastName.message}</p>
                    )}
                  </div>
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-300 mb-2">
                    Email Address *
                  </label>
                  <input
                    type="email"
                    {...register('email')}
                    className="w-full px-4 py-3 bg-black/30 border border-yellow-400/20 rounded-xl text-white placeholder-gray-400 focus:border-yellow-400 focus:ring-2 focus:ring-yellow-400/20 transition-all duration-300"
                    placeholder="your@email.com"
                  />
                  {errors.email && (
                    <p className="mt-1 text-sm text-red-400">{errors.email.message}</p>
                  )}
                </div>
              </motion.div>
            )}

            {/* Step 2: Business Details */}
            {currentStep === 2 && (
              <motion.div
                key="step2"
                initial={{ opacity: 0, x: 20 }}
                animate={{ opacity: 1, x: 0 }}
                exit={{ opacity: 0, x: -20 }}
                className="space-y-6"
              >
                <div className="text-center mb-8">
                  <h2 className="text-3xl font-bold text-white mb-2">Business Information</h2>
                  <p className="text-gray-300">Tell us about your business structure</p>
                </div>

                <div className="grid md:grid-cols-2 gap-6">
                  <div>
                    <label className="block text-sm font-medium text-gray-300 mb-2">
                      Business Type *
                    </label>
                    <select
                      {...register('businessType')}
                      className="w-full px-4 py-3 bg-black/30 border border-yellow-400/20 rounded-xl text-white focus:border-yellow-400 focus:ring-2 focus:ring-yellow-400/20 transition-all duration-300"
                    >
                      <option value="">Select business type</option>
                      <option value="individual">Individual / Sole Proprietor</option>
                      <option value="company">Company / Corporation</option>
                    </select>
                    {errors.businessType && (
                      <p className="mt-1 text-sm text-red-400">{errors.businessType.message}</p>
                    )}
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-300 mb-2">
                      Country *
                    </label>
                    <select
                      {...register('country')}
                      className="w-full px-4 py-3 bg-black/30 border border-yellow-400/20 rounded-xl text-white focus:border-yellow-400 focus:ring-2 focus:ring-yellow-400/20 transition-all duration-300"
                    >
                      <option value="">Select your country</option>
                      {countries.map(country => (
                        <option key={country} value={country}>{country}</option>
                      ))}
                    </select>
                    {errors.country && (
                      <p className="mt-1 text-sm text-red-400">{errors.country.message}</p>
                    )}
                  </div>
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-300 mb-2">
                    Business Name <span className="text-gray-500">(if applicable)</span>
                  </label>
                  <input
                    {...register('businessName')}
                    className="w-full px-4 py-3 bg-black/30 border border-yellow-400/20 rounded-xl text-white placeholder-gray-400 focus:border-yellow-400 focus:ring-2 focus:ring-yellow-400/20 transition-all duration-300"
                    placeholder="e.g., Acme Technologies Inc."
                  />
                </div>

                <div className="card-glass p-6">
                  <label className="flex items-start gap-3">
                    <input
                      type="checkbox"
                      {...register('hasExperience')}
                      className="mt-1 h-4 w-4 text-yellow-400 bg-black/30 border-yellow-400/20 rounded focus:ring-yellow-400"
                    />
                    <div>
                      <span className="text-white font-medium">I have experience building and selling platforms</span>
                      <p className="text-sm text-gray-400 mt-1">
                        This helps us understand your background and provide better support
                      </p>
                    </div>
                  </label>
                </div>
              </motion.div>
            )}

            {/* Step 3: Platform Details */}
            {currentStep === 3 && (
              <motion.div
                key="step3"
                initial={{ opacity: 0, x: 20 }}
                animate={{ opacity: 1, x: 0 }}
                exit={{ opacity: 0, x: -20 }}
                className="space-y-6"
              >
                <div className="text-center mb-8">
                  <h2 className="text-3xl font-bold text-white mb-2">Platform Details</h2>
                  <p className="text-gray-300">Tell us about the platforms you want to sell</p>
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-300 mb-4">
                    What type of platforms do you have? *
                  </label>
                  <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-4">
                    {platformTypes.map(type => (
                      <label
                        key={type.id}
                        className={`card-glass p-4 cursor-pointer transition-all duration-300 hover:border-yellow-400/40 ${
                          platformTypeValues.includes(type.id)
                            ? 'border-yellow-400 bg-yellow-400/10'
                            : 'border-yellow-400/20'
                        }`}
                      >
                        <input
                          type="checkbox"
                          className="sr-only"
                          onChange={() => toggleArrayValue('platformType', type.id)}
                        />
                        <div className="text-white font-medium mb-1">{type.label}</div>
                        <div className="text-sm text-gray-400">{type.description}</div>
                      </label>
                    ))}
                  </div>
                  {errors.platformType && (
                    <p className="mt-2 text-sm text-red-400">{errors.platformType.message}</p>
                  )}
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-300 mb-4">
                    Technology Stack *
                  </label>
                  <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
                    {techStacks.map(tech => (
                      <label
                        key={tech}
                        className={`px-3 py-2 rounded-lg border cursor-pointer text-center text-sm transition-all duration-300 ${
                          techStackValues.includes(tech)
                            ? 'border-yellow-400 bg-yellow-400/20 text-yellow-400'
                            : 'border-yellow-400/20 text-gray-300 hover:border-yellow-400/40'
                        }`}
                      >
                        <input
                          type="checkbox"
                          className="sr-only"
                          onChange={() => toggleArrayValue('techStack', tech)}
                        />
                        {tech}
                      </label>
                    ))}
                  </div>
                  {errors.techStack && (
                    <p className="mt-2 text-sm text-red-400">{errors.techStack.message}</p>
                  )}
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-300 mb-2">
                    Estimated Platform Value *
                  </label>
                  <select
                    {...register('estimatedValue')}
                    className="w-full px-4 py-3 bg-black/30 border border-yellow-400/20 rounded-xl text-white focus:border-yellow-400 focus:ring-2 focus:ring-yellow-400/20 transition-all duration-300"
                  >
                    <option value="">Select value range</option>
                    <option value="5k-15k">$5K - $15K</option>
                    <option value="15k-25k">$15K - $25K</option>
                    <option value="25k-40k">$25K - $40K</option>
                    <option value="40k+">$40K+</option>
                  </select>
                  {errors.estimatedValue && (
                    <p className="mt-1 text-sm text-red-400">{errors.estimatedValue.message}</p>
                  )}
                </div>

                <div className="card-glass p-6">
                  <label className="flex items-start gap-3">
                    <input
                      type="checkbox"
                      {...register('hasDocumentation')}
                      className="mt-1 h-4 w-4 text-yellow-400 bg-black/30 border-yellow-400/20 rounded focus:ring-yellow-400"
                    />
                    <div>
                      <span className="text-white font-medium">My platforms have comprehensive documentation</span>
                      <p className="text-sm text-gray-400 mt-1">
                        Including setup guides, API documentation, and architecture overviews
                      </p>
                    </div>
                  </label>
                </div>
              </motion.div>
            )}

            {/* Step 4: Code Repository */}
            {currentStep === 4 && (
              <motion.div
                key="step4"
                initial={{ opacity: 0, x: 20 }}
                animate={{ opacity: 1, x: 0 }}
                exit={{ opacity: 0, x: -20 }}
                className="space-y-6"
              >
                <div className="text-center mb-8">
                  <h2 className="text-3xl font-bold text-white mb-2">Secure Code Repository</h2>
                  <p className="text-gray-300">How will buyers safely preview your platform?</p>
                </div>

                <div className="card-glass p-6 mb-6">
                  <div className="flex items-start gap-3 mb-4">
                    <svg className="w-6 h-6 text-yellow-400 mt-1" fill="currentColor" viewBox="0 0 20 20">
                      <path fillRule="evenodd" d="M2.166 4.999A11.954 11.954 0 0010 1.944 11.954 11.954 0 0017.834 5c.11.65.166 1.32.166 2.001 0 5.225-3.34 9.67-8 11.317C5.34 16.67 2 12.225 2 7c0-.682.057-1.35.166-2.001zm11.541 3.708a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd"/>
                    </svg>
                    <div>
                      <h3 className="text-white font-semibold mb-2">🔐 Your Code is Protected</h3>
                      <p className="text-sm text-gray-300">
                        We never store your actual source code. We only access metadata, README files, and deployment configurations.
                        Buyers see demos and documentation, not your proprietary code.
                      </p>
                    </div>
                  </div>
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-300 mb-4">
                    How do you want to share your code? *
                  </label>
                  <div className="grid md:grid-cols-3 gap-4">
                    <label className={`card-glass p-4 cursor-pointer transition-all duration-300 ${
                      watch('repositoryType') === 'github' ? 'border-yellow-400 bg-yellow-400/10' : 'hover:border-yellow-400/40'
                    }`}>
                      <input
                        type="radio"
                        value="github"
                        {...register('repositoryType')}
                        className="sr-only"
                      />
                      <div className="text-center">
                        <svg className="w-8 h-8 mx-auto mb-2 text-white" fill="currentColor" viewBox="0 0 24 24">
                          <path d="M12 0c-6.626 0-12 5.373-12 12 0 5.302 3.438 9.8 8.207 11.387.599.111.793-.261.793-.577v-2.234c-3.338.726-4.033-1.416-4.033-1.416-.546-1.387-1.333-1.756-1.333-1.756-1.089-.745.083-.729.083-.729 1.205.084 1.839 1.237 1.839 1.237 1.07 1.834 2.807 1.304 3.492.997.107-.775.418-1.305.762-1.604-2.665-.305-5.467-1.334-5.467-5.931 0-1.311.469-2.381 1.236-3.221-.124-.303-.535-1.524.117-3.176 0 0 1.008-.322 3.301 1.23.957-.266 1.983-.399 3.003-.404 1.02.005 2.047.138 3.006.404 2.291-1.552 3.297-1.23 3.297-1.23.653 1.653.242 2.874.118 3.176.77.84 1.235 1.911 1.235 3.221 0 4.609-2.807 5.624-5.479 5.921.43.372.823 1.102.823 2.222v3.293c0 .319.192.694.801.576 4.765-1.589 8.199-6.086 8.199-11.386 0-6.627-5.373-12-12-12z"/>
                        </svg>
                        <div className="font-semibold text-white mb-1">GitHub Repository</div>
                        <div className="text-xs text-gray-400">Private invite access</div>
                      </div>
                    </label>

                    <label className={`card-glass p-4 cursor-pointer transition-all duration-300 ${
                      watch('repositoryType') === 'gitlab' ? 'border-yellow-400 bg-yellow-400/10' : 'hover:border-yellow-400/40'
                    }`}>
                      <input
                        type="radio"
                        value="gitlab"
                        {...register('repositoryType')}
                        className="sr-only"
                      />
                      <div className="text-center">
                        <svg className="w-8 h-8 mx-auto mb-2 text-white" fill="currentColor" viewBox="0 0 24 24">
                          <path d="M23.955 13.587l-1.342-4.135-2.664-8.189c-.135-.423-.73-.423-.867 0L16.418 9.45H7.582L4.919 1.263c-.135-.423-.73-.423-.867 0L1.388 9.452.046 13.587a.905.905 0 00.331 1.013L12 23.054l11.624-8.454a.905.905 0 00.331-1.013"/>
                        </svg>
                        <div className="font-semibold text-white mb-1">GitLab Repository</div>
                        <div className="text-xs text-gray-400">Private access control</div>
                      </div>
                    </label>

                    <label className={`card-glass p-4 cursor-pointer transition-all duration-300 ${
                      watch('repositoryType') === 'private' ? 'border-yellow-400 bg-yellow-400/10' : 'hover:border-yellow-400/40'
                    }`}>
                      <input
                        type="radio"
                        value="private"
                        {...register('repositoryType')}
                        className="sr-only"
                      />
                      <div className="text-center">
                        <svg className="w-8 h-8 mx-auto mb-2 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z"/>
                        </svg>
                        <div className="font-semibold text-white mb-1">Private/Other</div>
                        <div className="text-xs text-gray-400">Demo videos only</div>
                      </div>
                    </label>
                  </div>
                  {errors.repositoryType && (
                    <p className="mt-2 text-sm text-red-400">{errors.repositoryType.message}</p>
                  )}
                </div>

                {(watch('repositoryType') === 'github' || watch('repositoryType') === 'gitlab') && (
                  <div className="space-y-4">
                    <div>
                      <label className="block text-sm font-medium text-gray-300 mb-2">
                        Repository URL (Optional - for reference)
                      </label>
                      <input
                        {...register('repositoryUrl')}
                        placeholder="https://github.com/yourname/platform-name"
                        className="w-full px-4 py-3 bg-black/30 border border-yellow-400/20 rounded-xl text-white placeholder-gray-400 focus:border-yellow-400 focus:ring-2 focus:ring-yellow-400/20 transition-all duration-300"
                      />
                      <p className="text-xs text-gray-400 mt-1">
                        We'll never access this directly. Used only for verification and setup help.
                      </p>
                    </div>

                    <div>
                      <label className="block text-sm font-medium text-gray-300 mb-2">
                        {watch('repositoryType') === 'github' ? 'GitHub' : 'GitLab'} Username
                      </label>
                      <input
                        {...register('githubUsername')}
                        placeholder="your-username"
                        className="w-full px-4 py-3 bg-black/30 border border-yellow-400/20 rounded-xl text-white placeholder-gray-400 focus:border-yellow-400 focus:ring-2 focus:ring-yellow-400/20 transition-all duration-300"
                      />
                    </div>
                  </div>
                )}

                <div>
                  <label className="block text-sm font-medium text-gray-300 mb-4">
                    How should buyers preview your platform? *
                  </label>
                  <div className="space-y-3">
                    <label className={`card-glass p-4 cursor-pointer transition-all duration-300 flex items-start gap-3 ${
                      watch('accessMethod') === 'private_invite' ? 'border-yellow-400 bg-yellow-400/10' : 'hover:border-yellow-400/40'
                    }`}>
                      <input
                        type="radio"
                        value="private_invite"
                        {...register('accessMethod')}
                        className="mt-1 h-4 w-4 text-yellow-400"
                      />
                      <div>
                        <div className="font-semibold text-white">🔐 Private Repository Invite (Recommended)</div>
                        <div className="text-sm text-gray-400 mt-1">
                          We invite pre-qualified buyers to a private repository with limited, time-based access
                        </div>
                      </div>
                    </label>

                    <label className={`card-glass p-4 cursor-pointer transition-all duration-300 flex items-start gap-3 ${
                      watch('accessMethod') === 'demo_deploy' ? 'border-yellow-400 bg-yellow-400/10' : 'hover:border-yellow-400/40'
                    }`}>
                      <input
                        type="radio"
                        value="demo_deploy"
                        {...register('accessMethod')}
                        className="mt-1 h-4 w-4 text-yellow-400"
                      />
                      <div>
                        <div className="font-semibold text-white">🚀 Live Demo Deployment</div>
                        <div className="text-sm text-gray-400 mt-1">
                          We deploy a sandboxed version for buyers to interact with (no source code exposed)
                        </div>
                      </div>
                    </label>

                    <label className={`card-glass p-4 cursor-pointer transition-all duration-300 flex items-start gap-3 ${
                      watch('accessMethod') === 'video_demo' ? 'border-yellow-400 bg-yellow-400/10' : 'hover:border-yellow-400/40'
                    }`}>
                      <input
                        type="radio"
                        value="video_demo"
                        {...register('accessMethod')}
                        className="mt-1 h-4 w-4 text-yellow-400"
                      />
                      <div>
                        <div className="font-semibold text-white">📹 Video Demo Only</div>
                        <div className="text-sm text-gray-400 mt-1">
                          Buyers see detailed video walkthrough and documentation only
                        </div>
                      </div>
                    </label>
                  </div>
                  {errors.accessMethod && (
                    <p className="mt-2 text-sm text-red-400">{errors.accessMethod.message}</p>
                  )}
                </div>

                <div className="card-glass p-6">
                  <label className="flex items-start gap-3">
                    <input
                      type="checkbox"
                      {...register('hasReadme')}
                      className="mt-1 h-4 w-4 text-yellow-400 bg-black/30 border-yellow-400/20 rounded focus:ring-yellow-400"
                    />
                    <div>
                      <span className="text-white font-medium">My repository has comprehensive README and documentation</span>
                      <p className="text-sm text-gray-400 mt-1">
                        Including installation instructions, environment setup, and feature overview
                      </p>
                    </div>
                  </label>
                </div>
              </motion.div>
            )}

            {/* Step 5: Containerization */}
            {currentStep === 5 && (
              <motion.div
                key="step5"
                initial={{ opacity: 0, x: 20 }}
                animate={{ opacity: 1, x: 0 }}
                exit={{ opacity: 0, x: -20 }}
                className="space-y-6"
              >
                <div className="text-center mb-8">
                  <h2 className="text-3xl font-bold text-white mb-2">Deployment & Containerization</h2>
                  <p className="text-gray-300">Let's make your platform deployment-ready</p>
                </div>

                <div className="card-glass p-6 mb-6">
                  <div className="flex items-start gap-3">
                    <svg className="w-6 h-6 text-yellow-400 mt-1" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M19 11H5m14 0a2 2 0 012 2v6a2 2 0 01-2 2H5a2 2 0 01-2-2v-6a2 2 0 012-2m14 0V9a2 2 0 00-2-2M5 9a2 2 0 012-2m0 0V5a2 2 0 012-2h6a2 2 0 012 2v2M7 7h10"/>
                    </svg>
                    <div>
                      <h3 className="text-white font-semibold mb-2">🐳 Containerization Benefits</h3>
                      <p className="text-sm text-gray-300">
                        We'll help containerize your platform for consistent deployment across any infrastructure.
                        This increases buyer confidence and platform value.
                      </p>
                    </div>
                  </div>
                </div>

                <div className="space-y-6">
                  <div className="card-glass p-6">
                    <label className="flex items-start gap-3 mb-4">
                      <input
                        type="checkbox"
                        {...register('needsContainerization')}
                        className="mt-1 h-4 w-4 text-yellow-400 bg-black/30 border-yellow-400/20 rounded focus:ring-yellow-400"
                      />
                      <div>
                        <span className="text-white font-medium">I need help containerizing my platform</span>
                        <p className="text-sm text-gray-400 mt-1">
                          We'll analyze your codebase and generate Docker configurations automatically
                        </p>
                      </div>
                    </label>

                    {watch('needsContainerization') && (
                      <div className="ml-7 mt-4 p-4 bg-yellow-400/10 rounded-lg border border-yellow-400/20">
                        <h4 className="text-yellow-400 font-semibold mb-2">What we'll provide:</h4>
                        <ul className="text-sm text-gray-300 space-y-1">
                          <li>• Multi-stage Dockerfile optimized for your tech stack</li>
                          <li>• Docker Compose configuration for local development</li>
                          <li>• Kubernetes manifests for production deployment</li>
                          <li>• CI/CD pipeline configurations (GitHub Actions/GitLab CI)</li>
                          <li>• Security hardening and best practices</li>
                        </ul>
                      </div>
                    )}
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-300 mb-2">
                      Current deployment method (if any)
                    </label>
                    <select
                      {...register('currentDeployment')}
                      className="w-full px-4 py-3 bg-black/30 border border-yellow-400/20 rounded-xl text-white focus:border-yellow-400 focus:ring-2 focus:ring-yellow-400/20 transition-all duration-300"
                    >
                      <option value="">Select current deployment</option>
                      <option value="none">Not deployed yet</option>
                      <option value="manual">Manual deployment</option>
                      <option value="heroku">Heroku</option>
                      <option value="vercel">Vercel/Netlify</option>
                      <option value="aws">AWS (EC2, Lambda, etc.)</option>
                      <option value="gcp">Google Cloud</option>
                      <option value="azure">Microsoft Azure</option>
                      <option value="docker">Already containerized</option>
                      <option value="other">Other</option>
                    </select>
                  </div>

                  <div className="grid md:grid-cols-2 gap-6">
                    <div className="card-glass p-4">
                      <label className="flex items-start gap-3">
                        <input
                          type="checkbox"
                          {...register('environmentVariables')}
                          className="mt-1 h-4 w-4 text-yellow-400 bg-black/30 border-yellow-400/20 rounded focus:ring-yellow-400"
                        />
                        <div>
                          <span className="text-white font-medium">Uses environment variables</span>
                          <p className="text-sm text-gray-400 mt-1">API keys, database URLs, etc.</p>
                        </div>
                      </label>
                    </div>

                    <div className="card-glass p-4">
                      <label className="flex items-start gap-3">
                        <input
                          type="checkbox"
                          {...register('databaseRequired')}
                          className="mt-1 h-4 w-4 text-yellow-400 bg-black/30 border-yellow-400/20 rounded focus:ring-yellow-400"
                        />
                        <div>
                          <span className="text-white font-medium">Requires database</span>
                          <p className="text-sm text-gray-400 mt-1">PostgreSQL, MySQL, MongoDB, etc.</p>
                        </div>
                      </label>
                    </div>

                    <div className="card-glass p-4">
                      <label className="flex items-start gap-3">
                        <input
                          type="checkbox"
                          {...register('hasDockerfile')}
                          className="mt-1 h-4 w-4 text-yellow-400 bg-black/30 border-yellow-400/20 rounded focus:ring-yellow-400"
                        />
                        <div>
                          <span className="text-white font-medium">Already has Dockerfile</span>
                          <p className="text-sm text-gray-400 mt-1">We'll review and optimize it</p>
                        </div>
                      </label>
                    </div>
                  </div>

                  {watch('needsContainerization') && (
                    <div className="card-glass p-6">
                      <h3 className="text-lg font-semibold text-yellow-400 mb-4">Next Steps</h3>
                      <div className="space-y-3 text-sm text-gray-300">
                        <div className="flex items-start gap-3">
                          <span className="text-yellow-400 font-bold mt-0.5">1.</span>
                          <span>Our system will analyze your repository structure and dependencies</span>
                        </div>
                        <div className="flex items-start gap-3">
                          <span className="text-yellow-400 font-bold mt-0.5">2.</span>
                          <span>Generate optimized Docker configurations for your specific tech stack</span>
                        </div>
                        <div className="flex items-start gap-3">
                          <span className="text-yellow-400 font-bold mt-0.5">3.</span>
                          <span>Create deployment manifests for multiple cloud platforms</span>
                        </div>
                        <div className="flex items-start gap-3">
                          <span className="text-yellow-400 font-bold mt-0.5">4.</span>
                          <span>Test the containerized version and provide deployment instructions</span>
                        </div>
                      </div>
                    </div>
                  )}
                </div>
              </motion.div>
            )}

            {/* Step 6: Final Steps */}
            {currentStep === 6 && (
              <motion.div
                key="step6"
                initial={{ opacity: 0, x: 20 }}
                animate={{ opacity: 1, x: 0 }}
                exit={{ opacity: 0, x: -20 }}
                className="space-y-6"
              >
                <div className="text-center mb-8">
                  <h2 className="text-3xl font-bold text-white mb-2">Almost Done!</h2>
                  <p className="text-gray-300">Just a few final details</p>
                </div>

                <div className="card-glass p-6 space-y-4">
                  <label className="flex items-start gap-3">
                    <input
                      type="checkbox"
                      {...register('agreeToTerms')}
                      className="mt-1 h-4 w-4 text-yellow-400 bg-black/30 border-yellow-400/20 rounded focus:ring-yellow-400"
                    />
                    <div>
                      <span className="text-white font-medium">
                        I agree to the Terms of Service and Privacy Policy *
                      </span>
                      <p className="text-sm text-gray-400 mt-1">
                        By creating a seller account, you agree to our platform policies and commission structure
                      </p>
                    </div>
                  </label>
                  {errors.agreeToTerms && (
                    <p className="text-sm text-red-400">{errors.agreeToTerms.message}</p>
                  )}

                  <label className="flex items-start gap-3">
                    <input
                      type="checkbox"
                      {...register('marketingEmails')}
                      className="mt-1 h-4 w-4 text-yellow-400 bg-black/30 border-yellow-400/20 rounded focus:ring-yellow-400"
                    />
                    <div>
                      <span className="text-white font-medium">
                        Send me updates about TechFlunky
                      </span>
                      <p className="text-sm text-gray-400 mt-1">
                        Occasional emails about platform updates, seller tips, and success stories
                      </p>
                    </div>
                  </label>
                </div>

                <div className="card-glass p-6">
                  <h3 className="text-lg font-semibold text-yellow-400 mb-3">What happens next?</h3>
                  <ol className="space-y-2 text-sm text-gray-300">
                    <li className="flex items-start gap-3">
                      <span className="text-yellow-400 font-bold mt-0.5">1.</span>
                      <span>We'll create your Stripe Connected Account for secure payments</span>
                    </li>
                    <li className="flex items-start gap-3">
                      <span className="text-yellow-400 font-bold mt-0.5">2.</span>
                      <span>Complete identity verification with Stripe (required by law)</span>
                    </li>
                    <li className="flex items-start gap-3">
                      <span className="text-yellow-400 font-bold mt-0.5">3.</span>
                      <span>Start listing your platforms and get paid when they sell</span>
                    </li>
                  </ol>
                </div>
              </motion.div>
            )}
          </AnimatePresence>

          {/* Navigation Buttons */}
          <div className="flex justify-between items-center pt-8 border-t border-yellow-400/20">
            <button
              type="button"
              onClick={prevStep}
              className={`px-6 py-3 rounded-xl font-medium transition-all duration-300 ${
                currentStep === 1
                  ? 'invisible'
                  : 'bg-gray-700 text-white hover:bg-gray-600'
              }`}
              disabled={currentStep === 1}
            >
              ← Previous
            </button>

            <div className="text-center">
              <span className="text-sm text-gray-400">
                Step {currentStep} of {steps.length}
              </span>
            </div>

            {currentStep < 6 ? (
              <button
                type="button"
                onClick={nextStep}
                className="px-6 py-3 bg-yellow-400 text-black rounded-xl font-bold hover:bg-yellow-300 transition-all duration-300 transform hover:scale-105"
              >
                Next →
              </button>
            ) : (
              <button
                type="submit"
                disabled={isSubmitting}
                className="px-8 py-3 bg-yellow-400 text-black rounded-xl font-bold hover:bg-yellow-300 transition-all duration-300 transform hover:scale-105 disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {isSubmitting ? (
                  <div className="flex items-center gap-2">
                    <div className="w-4 h-4 border-2 border-black border-t-transparent rounded-full animate-spin"></div>
                    Creating Account...
                  </div>
                ) : (
                  'Complete Setup →'
                )}
              </button>
            )}
          </div>
        </form>
      </motion.div>
    </div>
  );
}