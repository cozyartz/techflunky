import React, { useState, useEffect } from 'react';
import { useForm, FormProvider } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { motion, AnimatePresence } from 'framer-motion';
import { SmartTextInput } from './SmartTextInput';
import { SmartTextarea } from './SmartTextarea';
import { DraftManager } from './DraftManager';
import { RepositoryAnalyzer } from './RepositoryAnalyzer';
import { FormPersistence, AutoSave, type FormDraft } from '../../lib/utils/form-persistence';
import type { RepositoryAnalysis, RepositoryInfo } from '../../lib/utils/repository-integration';
import {
  basicInfoSchema,
  technicalSchema,
  businessMetricsSchema,
  marketPositionSchema,
  legalComplianceSchema,
  supportingMaterialsSchema,
  finalReviewSchema,
  stepSchemas,
  type BasicInfoData,
  type TechnicalData,
  type BusinessMetricsData,
  type MarketPositionData,
  type LegalComplianceData,
  type SupportingMaterialsData,
  type FinalReviewData,
  calculateCompletionPercentage,
  calculateQualityScore
} from '../../lib/validation/seller-schemas';

const STEP_TITLES = [
  'Basic Information',
  'Technical Details',
  'Business Metrics',
  'Market Position',
  'Legal & Compliance',
  'Supporting Materials',
  'Final Review'
];

const STEP_DESCRIPTIONS = [
  'Tell us about your platform and what makes it special',
  'Technical architecture, stack, and development practices',
  'Revenue, users, and key business performance metrics',
  'Market opportunity, competition, and customer insights',
  'Legal structure, compliance, and intellectual property',
  'Documentation, assets, and transition support level',
  'Review your submission and estimated platform value'
];

type StepData = BasicInfoData | TechnicalData | BusinessMetricsData | MarketPositionData | LegalComplianceData | SupportingMaterialsData | FinalReviewData;

interface EnhancedSellerIntakeProps {
  initialData?: Partial<any>;
  onSubmit?: (data: any) => void;
  onSave?: (data: any) => void;
}

export function EnhancedSellerIntake({ initialData, onSubmit, onSave }: EnhancedSellerIntakeProps) {
  const [currentStep, setCurrentStep] = useState(1);
  const [formData, setFormData] = useState(initialData || {});
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [showDraftManager, setShowDraftManager] = useState(false);
  const [currentDraftId, setCurrentDraftId] = useState<string>('');
  const [lastSaved, setLastSaved] = useState<string>('');

  const currentSchema = stepSchemas[currentStep as keyof typeof stepSchemas];
  const methods = useForm({
    resolver: zodResolver(currentSchema),
    defaultValues: formData[`step${currentStep}`] || {},
    mode: 'onChange'
  });

  const { handleSubmit, watch, formState: { errors, isValid } } = methods;
  const watchedValues = watch();

  // Auto-save functionality with debouncing
  useEffect(() => {
    if (Object.keys(watchedValues).length > 0) {
      const updatedData = {
        ...formData,
        [`step${currentStep}`]: watchedValues
      };

      AutoSave.schedule('seller-intake', () => {
        const completion = calculateCompletionPercentage(updatedData);
        const qualityScore = calculateQualityScore(updatedData);

        const draftId = FormPersistence.saveDraft(
          updatedData,
          currentStep,
          completion,
          qualityScore
        );

        setFormData(updatedData);
        setCurrentDraftId(draftId);
        setLastSaved(new Date().toISOString());
        onSave?.(updatedData);
      });
    }
  }, [watchedValues, currentStep, formData, onSave]);

  // Load from persistence on mount
  useEffect(() => {
    if (!initialData) {
      const savedDraft = FormPersistence.loadCurrentDraft();
      if (savedDraft) {
        setFormData(savedDraft.data);
        setCurrentStep(savedDraft.step);
        setCurrentDraftId(savedDraft.id);
        setLastSaved(savedDraft.lastSaved);
        methods.reset(savedDraft.data[`step${savedDraft.step}`] || {});
      }
    }

    return () => {
      AutoSave.cancelAll();
    };
  }, []);

  const completion = calculateCompletionPercentage(formData);
  const qualityScore = calculateQualityScore(formData);

  const handleNext = async (data: StepData) => {
    const updatedData = {
      ...formData,
      [`step${currentStep}`]: data
    };
    setFormData(updatedData);

    if (currentStep < 7) {
      setCurrentStep(currentStep + 1);
      methods.reset(updatedData[`step${currentStep + 1}`] || {});
    } else {
      setIsSubmitting(true);
      try {
        await onSubmit?.(updatedData);
        localStorage.removeItem('seller-intake-draft');
      } catch (error) {
        console.error('Submission error:', error);
      } finally {
        setIsSubmitting(false);
      }
    }
  };

  const handleBack = () => {
    if (currentStep > 1) {
      const updatedData = {
        ...formData,
        [`step${currentStep}`]: watchedValues
      };
      setFormData(updatedData);
      setCurrentStep(currentStep - 1);
      methods.reset(updatedData[`step${currentStep - 1}`] || {});
    }
  };

  const jumpToStep = (step: number) => {
    if (step >= 1 && step <= 7 && step !== currentStep) {
      const updatedData = {
        ...formData,
        [`step${currentStep}`]: watchedValues
      };
      setFormData(updatedData);
      setCurrentStep(step);
      methods.reset(updatedData[`step${step}`] || {});
    }
  };

  const handleLoadDraft = (draft: FormDraft) => {
    setFormData(draft.data);
    setCurrentStep(draft.step);
    setCurrentDraftId(draft.id);
    setLastSaved(draft.lastSaved);
    methods.reset(draft.data[`step${draft.step}`] || {});
  };

  const formatLastSaved = (dateString: string) => {
    if (!dateString) return '';
    try {
      const date = new Date(dateString);
      const now = new Date();
      const diffMs = now.getTime() - date.getTime();
      const diffMins = Math.floor(diffMs / (1000 * 60));

      if (diffMins < 1) return 'Just saved';
      if (diffMins < 60) return `Saved ${diffMins}m ago`;
      return `Saved ${Math.floor(diffMins / 60)}h ago`;
    } catch {
      return '';
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-900 via-blue-900 to-purple-900">
      <div className="max-w-4xl mx-auto px-4 py-8">
        {/* Header with Progress */}
        <div className="mb-8">
          <div className="flex items-center justify-between mb-4">
            <div className="flex-1">
              <div className="flex items-center gap-3 mb-1">
                <h1 className="text-2xl font-bold text-white">Sell Your Platform</h1>
                <button
                  onClick={() => setShowDraftManager(true)}
                  className="px-3 py-1 text-xs rounded-lg bg-gray-700 text-gray-300 hover:bg-gray-600 hover:text-white transition-colors"
                >
                  Manage Drafts
                </button>
              </div>
              <div className="flex items-center gap-4 text-sm text-gray-400">
                <span>Step {currentStep} of 7</span>
                {lastSaved && (
                  <span className="flex items-center gap-1">
                    <div className="w-2 h-2 rounded-full bg-green-400"></div>
                    {formatLastSaved(lastSaved)}
                  </span>
                )}
              </div>
            </div>
            <div className="flex items-center gap-4 text-sm">
              <div className="text-center">
                <div className="text-lg font-bold text-green-400">{completion}%</div>
                <div className="text-gray-400">Complete</div>
              </div>
              <div className="text-center">
                <div className="text-lg font-bold text-blue-400">{qualityScore}%</div>
                <div className="text-gray-400">Quality</div>
              </div>
            </div>
          </div>

          {/* Progress Bar */}
          <div className="relative">
            <div className="h-2 bg-gray-700 rounded-full overflow-hidden">
              <motion.div
                className="h-full bg-gradient-to-r from-blue-500 to-purple-500"
                initial={{ width: 0 }}
                animate={{ width: `${(currentStep / 7) * 100}%` }}
                transition={{ duration: 0.3 }}
              />
            </div>

            {/* Step indicators */}
            <div className="flex justify-between mt-2">
              {STEP_TITLES.map((title, index) => {
                const stepNumber = index + 1;
                const isComplete = stepNumber < currentStep;
                const isCurrent = stepNumber === currentStep;

                return (
                  <button
                    key={stepNumber}
                    onClick={() => jumpToStep(stepNumber)}
                    className={`flex flex-col items-center gap-1 text-xs transition-colors ${
                      isCurrent
                        ? 'text-blue-400'
                        : isComplete
                        ? 'text-green-400 hover:text-green-300'
                        : 'text-gray-500 hover:text-gray-400'
                    }`}
                  >
                    <div className={`w-6 h-6 rounded-full flex items-center justify-center text-xs font-bold ${
                      isCurrent
                        ? 'bg-blue-500 text-white'
                        : isComplete
                        ? 'bg-green-500 text-white'
                        : 'bg-gray-600 text-gray-300'
                    }`}>
                      {isComplete ? '✓' : stepNumber}
                    </div>
                    <span className="hidden sm:block max-w-16 text-center leading-tight">
                      {title.split(' ').slice(0, 2).join(' ')}
                    </span>
                  </button>
                );
              })}
            </div>
          </div>
        </div>

        {/* Form Content */}
        <FormProvider {...methods}>
          <motion.div
            key={currentStep}
            initial={{ opacity: 0, x: 20 }}
            animate={{ opacity: 1, x: 0 }}
            exit={{ opacity: 0, x: -20 }}
            transition={{ duration: 0.3 }}
            className="bg-black/20 backdrop-blur-sm border border-white/10 rounded-2xl p-6 mb-6"
          >
            <div className="mb-6">
              <h2 className="text-xl font-semibold text-white mb-2">
                {STEP_TITLES[currentStep - 1]}
              </h2>
              <p className="text-gray-400">
                {STEP_DESCRIPTIONS[currentStep - 1]}
              </p>
            </div>

            <form onSubmit={handleSubmit(handleNext)} className="space-y-6">
              <AnimatePresence mode="wait">
                <motion.div
                  key={currentStep}
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, y: -10 }}
                  transition={{ duration: 0.2 }}
                >
                  {renderStepContent(currentStep, methods)}
                </motion.div>
              </AnimatePresence>

              {/* Navigation Buttons */}
              <div className="flex items-center justify-between pt-6 border-t border-white/10">
                <button
                  type="button"
                  onClick={handleBack}
                  disabled={currentStep === 1}
                  className="px-6 py-3 rounded-xl bg-gray-700 text-white font-medium transition-colors hover:bg-gray-600 disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  Back
                </button>

                <div className="flex items-center gap-3">
                  <button
                    type="button"
                    onClick={() => localStorage.setItem('seller-intake-draft', JSON.stringify(formData))}
                    className="text-sm text-gray-400 hover:text-gray-300"
                  >
                    Save Draft
                  </button>

                  <button
                    type="submit"
                    disabled={!isValid || isSubmitting}
                    className="px-6 py-3 rounded-xl bg-gradient-to-r from-blue-500 to-purple-500 text-white font-medium transition-all hover:from-blue-600 hover:to-purple-600 disabled:opacity-50 disabled:cursor-not-allowed"
                  >
                    {isSubmitting ? (
                      <div className="flex items-center gap-2">
                        <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                        Submitting...
                      </div>
                    ) : currentStep === 7 ? (
                      'Submit for Review'
                    ) : (
                      'Continue'
                    )}
                  </button>
                </div>
              </div>
            </form>
          </motion.div>
        </FormProvider>

        {/* Help & Tips */}
        <div className="bg-black/10 backdrop-blur-sm border border-white/5 rounded-xl p-4">
          <div className="flex items-center gap-2 text-blue-400 mb-2">
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
            </svg>
            <span className="font-medium">Tips for Success</span>
          </div>
          <ul className="text-sm text-gray-400 space-y-1">
            <li>• Be specific and detailed in your descriptions - buyers want to understand exactly what they're getting</li>
            <li>• Follow the character guidelines for optimal presentation in search results</li>
            <li>• Your form auto-saves every few seconds, so you can safely come back later</li>
            <li>• Higher completion and quality scores lead to better marketplace visibility</li>
          </ul>
        </div>

        {/* Draft Manager Modal */}
        <AnimatePresence>
          {showDraftManager && (
            <DraftManager
              onLoadDraft={handleLoadDraft}
              onClose={() => setShowDraftManager(false)}
              currentDraftId={currentDraftId}
            />
          )}
        </AnimatePresence>
      </div>
    </div>
  );
}

function renderStepContent(step: number, methods: any) {
  const { register, watch, setValue } = methods;

  switch (step) {
    case 1: // Basic Information
      return <BasicInfoStep register={register} watch={watch} />;
    case 2: // Technical Details
      return <TechnicalStep register={register} watch={watch} setValue={setValue} />;
    case 3: // Business Metrics
      return <BusinessMetricsStep register={register} watch={watch} />;
    case 4: // Market Position
      return <MarketPositionStep register={register} watch={watch} />;
    case 5: // Legal & Compliance
      return <LegalComplianceStep register={register} watch={watch} />;
    case 6: // Supporting Materials
      return <SupportingMaterialsStep register={register} watch={watch} />;
    case 7: // Final Review
      return <FinalReviewStep register={register} watch={watch} />;
    default:
      return null;
  }
}

function BasicInfoStep({ register, watch }: { register: any; watch: any }) {
  return (
    <div className="space-y-6">
      <SmartTextInput
        label="Platform Name"
        fieldName="platformName"
        registration={register('platformName')}
        value={watch('platformName')}
        placeholder="e.g., TaskMaster Pro, ShopEasy, DevPortfolio"
        required
      />

      <SmartTextarea
        label="Elevator Pitch"
        fieldName="elevator_pitch"
        registration={register('elevatorPitch')}
        value={watch('elevatorPitch')}
        placeholder="A compelling one-sentence description of what your platform does and who it's for..."
        required
        minRows={2}
        maxRows={4}
      />

      <SmartTextarea
        label="Detailed Description"
        fieldName="description"
        registration={register('detailedDescription')}
        value={watch('detailedDescription')}
        placeholder="Provide a comprehensive description of your platform's features, benefits, and use cases..."
        required
        minRows={4}
        maxRows={8}
      />

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        <div className="space-y-2">
          <label className="block text-sm font-medium text-gray-300">
            Industry <span className="text-red-400">*</span>
          </label>
          <select
            {...register('industry')}
            className="w-full px-4 py-3 bg-black/30 border border-yellow-400/20 rounded-xl text-white focus:ring-2 focus:ring-yellow-400/20 focus:border-yellow-400"
          >
            <option value="">Select an industry</option>
            <option value="ecommerce">E-commerce</option>
            <option value="saas">SaaS/Software</option>
            <option value="education">Education</option>
            <option value="healthcare">Healthcare</option>
            <option value="finance">Finance</option>
            <option value="real-estate">Real Estate</option>
            <option value="food-beverage">Food & Beverage</option>
            <option value="professional-services">Professional Services</option>
            <option value="other">Other</option>
          </select>
        </div>

        <div className="space-y-2">
          <label className="block text-sm font-medium text-gray-300">
            Categories <span className="text-red-400">*</span>
          </label>
          <select
            {...register('category')}
            multiple
            className="w-full px-4 py-3 bg-black/30 border border-yellow-400/20 rounded-xl text-white focus:ring-2 focus:ring-yellow-400/20 focus:border-yellow-400"
          >
            <option value="web-app">Web Application</option>
            <option value="mobile-app">Mobile App</option>
            <option value="desktop-app">Desktop App</option>
            <option value="api">API/Service</option>
            <option value="extension">Browser Extension</option>
            <option value="template">Template/Theme</option>
          </select>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        <SmartTextInput
          label="Website URL"
          fieldName="platformName"
          registration={register('website')}
          value={watch('website')}
          type="url"
          placeholder="https://your-platform.com"
        />

        <SmartTextInput
          label="Demo URL"
          fieldName="platformName"
          registration={register('demoUrl')}
          value={watch('demoUrl')}
          type="url"
          placeholder="https://demo.your-platform.com"
        />
      </div>
    </div>
  );
}

function TechnicalStep({ register, watch, setValue }: { register: any; watch: any; setValue?: any }) {
  const handleRepositoryAnalysis = (analysis: RepositoryAnalysis, repoInfo: RepositoryInfo) => {
    if (setValue) {
      // Auto-fill form fields based on repository analysis
      setValue('repositoryUrl', repoInfo.url);
      setValue('repositoryType', repoInfo.type);
      setValue('repositoryAccess', repoInfo.isPrivate ? 'private' : 'public');
      setValue('hasTests', analysis.hasTests);
      setValue('hasDocumentation', analysis.hasDocumentation);
      setValue('hasDockerfile', analysis.hasDockerfile);
      setValue('hasCICD', analysis.hasCICD);

      if (analysis.testCoverage) {
        setValue('testCoverage', Math.round(analysis.testCoverage));
      }

      // Guess documentation quality
      if (analysis.hasDocumentation) {
        setValue('documentationQuality', 'good');
      }

      // Auto-fill tech stack arrays
      if (analysis.techStack.length > 0) {
        setValue('techStack', analysis.techStack.slice(0, 10));
      }
      if (analysis.frameworks.length > 0) {
        setValue('frameworks', analysis.frameworks);
      }

      // Set programming languages
      const languages = Object.keys(analysis.languages);
      if (languages.length > 0) {
        setValue('programmingLanguages', languages);
      }
    }
  };

  return (
    <div className="space-y-6">
      {/* Repository Analysis Section */}
      <div className="bg-blue-500/5 border border-blue-500/20 rounded-xl p-6">
        <div className="flex items-center gap-2 mb-4">
          <svg className="w-5 h-5 text-blue-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" />
          </svg>
          <h3 className="text-lg font-medium text-white">Repository Analysis</h3>
        </div>
        <p className="text-sm text-gray-400 mb-4">
          Analyze your repository to automatically populate technical details and get insights about your project
        </p>
        <RepositoryAnalyzer onAnalysisComplete={handleRepositoryAnalysis} />
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        <div className="space-y-2">
          <label className="block text-sm font-medium text-gray-300">
            Architecture Type <span className="text-red-400">*</span>
          </label>
          <select
            {...register('architecture')}
            className="w-full px-4 py-3 bg-black/30 border border-yellow-400/20 rounded-xl text-white focus:ring-2 focus:ring-yellow-400/20 focus:border-yellow-400"
          >
            <option value="">Select architecture</option>
            <option value="monolith">Monolithic</option>
            <option value="microservices">Microservices</option>
            <option value="serverless">Serverless</option>
            <option value="jamstack">JAMstack</option>
            <option value="other">Other</option>
          </select>
        </div>

        <div className="space-y-2">
          <label className="block text-sm font-medium text-gray-300">
            Repository Type <span className="text-red-400">*</span>
          </label>
          <select
            {...register('repositoryType')}
            className="w-full px-4 py-3 bg-black/30 border border-yellow-400/20 rounded-xl text-white focus:ring-2 focus:ring-yellow-400/20 focus:border-yellow-400"
          >
            <option value="">Select repository type</option>
            <option value="github">GitHub</option>
            <option value="gitlab">GitLab</option>
            <option value="bitbucket">Bitbucket</option>
            <option value="private">Private Repository</option>
            <option value="none">No Repository</option>
          </select>
        </div>
      </div>

      <SmartTextInput
        label="Repository URL"
        fieldName="platformName"
        registration={register('repositoryUrl')}
        value={watch('repositoryUrl')}
        type="url"
        placeholder="https://github.com/username/repo-name"
      />

      <SmartTextarea
        label="Technical Overview"
        fieldName="technical_overview"
        registration={register('technicalOverview')}
        value={watch('technicalOverview')}
        placeholder="Describe your technical architecture, key technologies used, and any notable implementation details..."
        minRows={3}
        maxRows={6}
      />

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        <div className="space-y-4">
          <h3 className="text-sm font-medium text-gray-300">Code Quality</h3>

          <label className="flex items-center gap-3">
            <input
              type="checkbox"
              {...register('hasTests')}
              className="w-4 h-4 rounded border-gray-600 bg-black/30 text-blue-500 focus:ring-blue-500/20"
            />
            <span className="text-sm text-gray-300">Has automated tests</span>
          </label>

          <label className="flex items-center gap-3">
            <input
              type="checkbox"
              {...register('hasDocumentation')}
              className="w-4 h-4 rounded border-gray-600 bg-black/30 text-blue-500 focus:ring-blue-500/20"
            />
            <span className="text-sm text-gray-300">Has documentation</span>
          </label>

          <label className="flex items-center gap-3">
            <input
              type="checkbox"
              {...register('hasDockerfile')}
              className="w-4 h-4 rounded border-gray-600 bg-black/30 text-blue-500 focus:ring-blue-500/20"
            />
            <span className="text-sm text-gray-300">Has Docker setup</span>
          </label>

          <label className="flex items-center gap-3">
            <input
              type="checkbox"
              {...register('hasCICD')}
              className="w-4 h-4 rounded border-gray-600 bg-black/30 text-blue-500 focus:ring-blue-500/20"
            />
            <span className="text-sm text-gray-300">Has CI/CD pipeline</span>
          </label>
        </div>

        <div className="space-y-4">
          <h3 className="text-sm font-medium text-gray-300">Optional Details</h3>

          {watch('hasTests') && (
            <div>
              <label className="block text-sm text-gray-400 mb-1">Test Coverage %</label>
              <input
                type="number"
                {...register('testCoverage', { valueAsNumber: true })}
                min="0"
                max="100"
                className="w-full px-3 py-2 bg-black/30 border border-gray-600 rounded-lg text-white text-sm"
                placeholder="85"
              />
            </div>
          )}

          {watch('hasDocumentation') && (
            <div>
              <label className="block text-sm text-gray-400 mb-1">Documentation Quality</label>
              <select
                {...register('documentationQuality')}
                className="w-full px-3 py-2 bg-black/30 border border-gray-600 rounded-lg text-white text-sm"
              >
                <option value="">Select quality level</option>
                <option value="basic">Basic</option>
                <option value="good">Good</option>
                <option value="comprehensive">Comprehensive</option>
              </select>
            </div>
          )}

          {watch('repositoryType') !== 'none' && watch('repositoryType') && (
            <div>
              <label className="block text-sm text-gray-400 mb-1">Repository Access</label>
              <select
                {...register('repositoryAccess')}
                className="w-full px-3 py-2 bg-black/30 border border-gray-600 rounded-lg text-white text-sm"
              >
                <option value="">Select access level</option>
                <option value="public">Public</option>
                <option value="private">Private</option>
                <option value="invite-only">Invite Only</option>
              </select>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

// Additional step components would go here...
function BusinessMetricsStep({ register, watch }: { register: any; watch: any }) {
  return (
    <div className="space-y-6">
      <div className="text-center p-6 bg-blue-500/10 border border-blue-500/20 rounded-xl">
        <h3 className="text-lg font-semibold text-blue-400 mb-2">Business Metrics Coming Soon</h3>
        <p className="text-gray-400">Revenue, user metrics, and business model details will be available in the next update.</p>
      </div>
    </div>
  );
}

function MarketPositionStep({ register, watch }: { register: any; watch: any }) {
  return (
    <div className="space-y-6">
      <SmartTextarea
        label="Target Market"
        fieldName="target_market"
        registration={register('targetMarket')}
        value={watch('targetMarket')}
        placeholder="Describe your ideal customers, market size, and specific segments you serve..."
        required
        minRows={3}
        maxRows={6}
      />

      <SmartTextarea
        label="Competitive Advantage"
        fieldName="competitive_advantage"
        registration={register('competitiveAdvantage')}
        value={watch('competitiveAdvantage')}
        placeholder="What makes your platform unique? How do you differentiate from competitors?"
        required
        minRows={3}
        maxRows={6}
      />
    </div>
  );
}

function LegalComplianceStep({ register, watch }: { register: any; watch: any }) {
  return (
    <div className="space-y-6">
      <div className="space-y-4">
        <h3 className="text-sm font-medium text-gray-300">Intellectual Property</h3>

        <div className="space-y-2">
          <label className="block text-sm text-gray-400">IP Ownership</label>
          <select
            {...register('ipOwnership')}
            className="w-full px-4 py-3 bg-black/30 border border-yellow-400/20 rounded-xl text-white focus:ring-2 focus:ring-yellow-400/20 focus:border-yellow-400"
          >
            <option value="">Select ownership status</option>
            <option value="full-ownership">Full Ownership</option>
            <option value="shared">Shared</option>
            <option value="licensed">Licensed</option>
            <option value="unclear">Unclear</option>
          </select>
        </div>

        <div className="grid grid-cols-2 gap-4">
          <label className="flex items-center gap-3">
            <input
              type="checkbox"
              {...register('hasPatents')}
              className="w-4 h-4 rounded border-gray-600 bg-black/30 text-blue-500 focus:ring-blue-500/20"
            />
            <span className="text-sm text-gray-300">Has patents</span>
          </label>

          <label className="flex items-center gap-3">
            <input
              type="checkbox"
              {...register('hasTrademarks')}
              className="w-4 h-4 rounded border-gray-600 bg-black/30 text-blue-500 focus:ring-blue-500/20"
            />
            <span className="text-sm text-gray-300">Has trademarks</span>
          </label>
        </div>
      </div>

      <SmartTextarea
        label="Compliance Notes"
        fieldName="compliance_notes"
        registration={register('complianceNotes')}
        value={watch('complianceNotes')}
        placeholder="Any additional legal or compliance considerations..."
        minRows={2}
        maxRows={4}
      />
    </div>
  );
}

function SupportingMaterialsStep({ register, watch }: { register: any; watch: any }) {
  return (
    <div className="space-y-6">
      <div className="space-y-4">
        <h3 className="text-sm font-medium text-gray-300">Documentation & Assets</h3>

        <div className="grid grid-cols-2 gap-4">
          <label className="flex items-center gap-3">
            <input
              type="checkbox"
              {...register('hasBusinessPlan')}
              className="w-4 h-4 rounded border-gray-600 bg-black/30 text-blue-500 focus:ring-blue-500/20"
            />
            <span className="text-sm text-gray-300">Business plan</span>
          </label>

          <label className="flex items-center gap-3">
            <input
              type="checkbox"
              {...register('hasLogo')}
              className="w-4 h-4 rounded border-gray-600 bg-black/30 text-blue-500 focus:ring-blue-500/20"
            />
            <span className="text-sm text-gray-300">Logo/branding</span>
          </label>
        </div>
      </div>

      <div className="space-y-2">
        <label className="block text-sm font-medium text-gray-300">Seller Experience Level</label>
        <select
          {...register('sellerExperience')}
          className="w-full px-4 py-3 bg-black/30 border border-yellow-400/20 rounded-xl text-white focus:ring-2 focus:ring-yellow-400/20 focus:border-yellow-400"
        >
          <option value="">Select experience level</option>
          <option value="first-time">First-time seller</option>
          <option value="some-experience">Some experience</option>
          <option value="experienced">Experienced</option>
          <option value="expert">Expert seller</option>
        </select>
      </div>
    </div>
  );
}

function FinalReviewStep({ register, watch }: { register: any; watch: any }) {
  return (
    <div className="space-y-6">
      <div className="space-y-4">
        <label className="flex items-start gap-3">
          <input
            type="checkbox"
            {...register('agreedToTerms')}
            className="w-4 h-4 mt-1 rounded border-gray-600 bg-black/30 text-blue-500 focus:ring-blue-500/20"
          />
          <span className="text-sm text-gray-300">
            I agree to the TechFlunky Terms of Service and confirm that I have the legal right to sell this platform
          </span>
        </label>

        <label className="flex items-start gap-3">
          <input
            type="checkbox"
            {...register('accurateInformation')}
            className="w-4 h-4 mt-1 rounded border-gray-600 bg-black/30 text-blue-500 focus:ring-blue-500/20"
          />
          <span className="text-sm text-gray-300">
            I confirm that all information provided is accurate and complete to the best of my knowledge
          </span>
        </label>

        <label className="flex items-start gap-3">
          <input
            type="checkbox"
            {...register('marketingOptIn')}
            className="w-4 h-4 mt-1 rounded border-gray-600 bg-black/30 text-blue-500 focus:ring-blue-500/20"
          />
          <span className="text-sm text-gray-300">
            I'd like to receive updates about TechFlunky marketplace features and selling tips (optional)
          </span>
        </label>
      </div>

      <div className="space-y-2">
        <label className="block text-sm font-medium text-gray-300">
          Estimated Platform Value (USD) <span className="text-red-400">*</span>
        </label>
        <input
          type="number"
          {...register('estimatedPlatformValue', { valueAsNumber: true })}
          min="1000"
          max="10000000"
          className="w-full px-4 py-3 bg-black/30 border border-yellow-400/20 rounded-xl text-white focus:ring-2 focus:ring-yellow-400/20 focus:border-yellow-400"
          placeholder="50000"
        />
        <p className="text-xs text-gray-400">Range: $1,000 - $10,000,000</p>
      </div>
    </div>
  );
}