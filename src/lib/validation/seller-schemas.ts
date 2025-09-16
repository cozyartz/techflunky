import { z } from 'zod';

// Character limits for optimal UX and SEO
export const FIELD_LIMITS = {
  platformName: { optimal: 40, maximum: 60 },
  elevator_pitch: { optimal: 120, maximum: 160 },
  description: { optimal: 400, maximum: 800 },
  technical_overview: { optimal: 250, maximum: 500 },
  competitive_advantage: { optimal: 200, maximum: 400 },
  target_market: { optimal: 150, maximum: 300 },
  business_model: { optimal: 200, maximum: 400 },
  revenue_streams: { optimal: 180, maximum: 350 },
  compliance_notes: { optimal: 100, maximum: 200 }
} as const;

// Helper function to create string validation with character limits
const createLimitedString = (fieldName: keyof typeof FIELD_LIMITS, required = true) => {
  const limits = FIELD_LIMITS[fieldName];
  const schema = z.string()
    .max(limits.maximum, `Maximum ${limits.maximum} characters allowed`)
    .refine(
      (val) => val.length <= limits.optimal || val.length <= limits.maximum,
      {
        message: `For best results, keep under ${limits.optimal} characters (current: optimal range)`
      }
    );

  return required ? schema.min(1, 'This field is required') : schema.optional();
};

// Step 1: Basic Information
export const basicInfoSchema = z.object({
  platformName: createLimitedString('platformName')
    .refine(
      (val) => /^[a-zA-Z0-9\s\-_&.]+$/.test(val),
      'Platform name can only contain letters, numbers, spaces, and basic symbols'
    ),
  elevatorPitch: createLimitedString('elevator_pitch')
    .refine(
      (val) => val.split(' ').length >= 10,
      'Elevator pitch should be at least 10 words to be compelling'
    ),
  detailedDescription: createLimitedString('description'),
  industry: z.string().min(1, 'Please select an industry'),
  category: z.array(z.string()).min(1, 'Select at least one category'),
  website: z.string().url('Please enter a valid URL').optional().or(z.literal('')),
  demoUrl: z.string().url('Please enter a valid URL').optional().or(z.literal(''))
});

// Step 2: Technical Details
export const technicalSchema = z.object({
  techStack: z.array(z.string()).min(1, 'Select at least one technology'),
  architecture: z.enum(['monolith', 'microservices', 'serverless', 'jamstack', 'other']),
  database: z.array(z.string()).optional(),
  cloudProviders: z.array(z.string()).optional(),
  programmingLanguages: z.array(z.string()).min(1, 'Select at least one programming language'),
  frameworks: z.array(z.string()).optional(),

  // Repository information
  repositoryType: z.enum(['github', 'gitlab', 'bitbucket', 'private', 'none']),
  repositoryUrl: z.string().url().optional().or(z.literal('')),
  repositoryAccess: z.enum(['public', 'private', 'invite-only']).optional(),

  // Technical health
  hasTests: z.boolean(),
  testCoverage: z.number().min(0).max(100).optional(),
  hasDocumentation: z.boolean(),
  documentationQuality: z.enum(['basic', 'good', 'comprehensive']).optional(),
  hasDockerfile: z.boolean(),
  hasCICD: z.boolean(),

  technicalOverview: createLimitedString('technical_overview', false)
});

// Step 3: Business Metrics
export const businessMetricsSchema = z.object({
  // Revenue metrics
  hasRevenue: z.boolean(),
  monthlyRevenue: z.number().min(0).optional(),
  annualRevenue: z.number().min(0).optional(),
  revenueGrowthRate: z.number().min(-100).max(1000).optional(), // percentage

  // User metrics
  totalUsers: z.number().min(0).optional(),
  activeUsers: z.number().min(0).optional(),
  userGrowthRate: z.number().min(-100).max(1000).optional(), // percentage
  userRetentionRate: z.number().min(0).max(100).optional(),

  // Business model
  businessModel: z.enum(['b2b', 'b2c', 'b2b2c', 'marketplace', 'freemium', 'saas', 'other']),
  revenueStreams: createLimitedString('revenue_streams', false),
  pricingModel: z.enum(['subscription', 'one-time', 'freemium', 'transaction-fee', 'advertising', 'other']),

  // Market metrics
  customerAcquisitionCost: z.number().min(0).optional(),
  customerLifetimeValue: z.number().min(0).optional(),
  averageOrderValue: z.number().min(0).optional(),
  churnRate: z.number().min(0).max(100).optional()
});

// Step 4: Market Position
export const marketPositionSchema = z.object({
  targetMarket: createLimitedString('target_market'),
  competitiveAdvantage: createLimitedString('competitive_advantage'),

  // Market analysis
  marketSize: z.enum(['under-10m', '10m-100m', '100m-1b', 'over-1b']),
  competitorCount: z.enum(['none', 'few-1-3', 'moderate-4-10', 'many-10plus']),
  marketMaturity: z.enum(['emerging', 'growing', 'mature', 'declining']),

  // Customer data
  primaryCustomerType: z.enum(['enterprise', 'smb', 'consumer', 'developer', 'startup', 'other']),
  customerPaymentWillingness: z.enum(['high', 'medium', 'low', 'unknown']),
  hasCustomerTestimonials: z.boolean(),
  hasPressCoverage: z.boolean(),

  // Marketing
  marketingChannels: z.array(z.string()).optional(),
  hasMarketingMaterials: z.boolean()
});

// Step 5: Legal & Compliance
export const legalComplianceSchema = z.object({
  // Intellectual property
  ipOwnership: z.enum(['full-ownership', 'shared', 'licensed', 'unclear']),
  hasPatents: z.boolean(),
  hasTrademarks: z.boolean(),

  // Legal structure
  hasTermsOfService: z.boolean(),
  hasPrivacyPolicy: z.boolean(),
  complianceRequirements: z.array(z.string()).optional(), // GDPR, HIPAA, etc.

  // Open source and licensing
  usesOpenSource: z.boolean(),
  openSourceLicenses: z.array(z.string()).optional(),
  hasProprietaryCode: z.boolean(),

  // Data and security
  handlesPersonalData: z.boolean(),
  hasSecurityAudit: z.boolean(),
  securityCertifications: z.array(z.string()).optional(),

  complianceNotes: createLimitedString('compliance_notes', false)
});

// Step 6: Supporting Materials
export const supportingMaterialsSchema = z.object({
  // Documentation
  hasBusinessPlan: z.boolean(),
  hasFinancialProjections: z.boolean(),
  hasTechnicalSpecs: z.boolean(),
  hasUserManual: z.boolean(),

  // Media assets
  screenshots: z.array(z.string()).optional(),
  videos: z.array(z.string()).optional(),
  hasLogo: z.boolean(),

  // Additional materials
  hasCustomerReferences: z.boolean(),
  hasMarketResearch: z.boolean(),
  hasCompetitorAnalysis: z.boolean(),

  // Seller information
  sellerExperience: z.enum(['first-time', 'some-experience', 'experienced', 'expert']),
  timeAvailableForTransition: z.enum(['immediate', '1-month', '2-3-months', 'flexible']),
  supportLevel: z.enum(['minimal', 'moderate', 'comprehensive', 'full-handover']),

  additionalNotes: z.string().max(500).optional()
});

// Final review schema
export const finalReviewSchema = z.object({
  agreedToTerms: z.boolean().refine(val => val === true, 'You must agree to the terms'),
  accurateInformation: z.boolean().refine(val => val === true, 'You must confirm information accuracy'),
  marketingOptIn: z.boolean(),
  estimatedPlatformValue: z.number().min(1000).max(10000000) // $1K to $10M range
});

// Complete form schema
export const completeSellerFormSchema = z.object({
  step1: basicInfoSchema,
  step2: technicalSchema,
  step3: businessMetricsSchema,
  step4: marketPositionSchema,
  step5: legalComplianceSchema,
  step6: supportingMaterialsSchema,
  finalReview: finalReviewSchema
});

// Individual step schemas for validation
export const stepSchemas = {
  1: basicInfoSchema,
  2: technicalSchema,
  3: businessMetricsSchema,
  4: marketPositionSchema,
  5: legalComplianceSchema,
  6: supportingMaterialsSchema,
  7: finalReviewSchema
} as const;

// Type exports
export type BasicInfoData = z.infer<typeof basicInfoSchema>;
export type TechnicalData = z.infer<typeof technicalSchema>;
export type BusinessMetricsData = z.infer<typeof businessMetricsSchema>;
export type MarketPositionData = z.infer<typeof marketPositionSchema>;
export type LegalComplianceData = z.infer<typeof legalComplianceSchema>;
export type SupportingMaterialsData = z.infer<typeof supportingMaterialsSchema>;
export type FinalReviewData = z.infer<typeof finalReviewSchema>;

export type CompleteSellerFormData = z.infer<typeof completeSellerFormSchema>;

// Helper function to calculate completion percentage
export function calculateCompletionPercentage(data: Partial<CompleteSellerFormData>): number {
  const totalFields = 50; // Approximate total number of fields
  let completedFields = 0;

  // Count completed fields across all steps
  Object.values(data).forEach(stepData => {
    if (stepData && typeof stepData === 'object') {
      Object.values(stepData).forEach(fieldValue => {
        if (fieldValue !== undefined && fieldValue !== null && fieldValue !== '' &&
            (!Array.isArray(fieldValue) || fieldValue.length > 0)) {
          completedFields++;
        }
      });
    }
  });

  return Math.round((completedFields / totalFields) * 100);
}

// Quality score calculation
export function calculateQualityScore(data: Partial<CompleteSellerFormData>): number {
  let score = 0;
  let maxScore = 0;

  // Check character count optimization for key fields
  if (data.step1) {
    maxScore += 30;

    // Platform name optimization
    if (data.step1.platformName) {
      const length = data.step1.platformName.length;
      if (length >= FIELD_LIMITS.platformName.optimal && length <= FIELD_LIMITS.platformName.maximum) {
        score += 10;
      } else if (length <= FIELD_LIMITS.platformName.maximum) {
        score += 7;
      }
    }

    // Description quality
    if (data.step1.detailedDescription) {
      const length = data.step1.detailedDescription.length;
      if (length >= FIELD_LIMITS.description.optimal && length <= FIELD_LIMITS.description.maximum) {
        score += 15;
      } else if (length >= 200) {
        score += 10;
      }
    }

    // Website/demo bonus
    if (data.step1.website || data.step1.demoUrl) {
      score += 5;
    }
  }

  // Technical completeness
  if (data.step2) {
    maxScore += 25;

    if (data.step2.techStack && data.step2.techStack.length >= 3) score += 8;
    if (data.step2.hasTests) score += 5;
    if (data.step2.hasDocumentation) score += 7;
    if (data.step2.repositoryUrl) score += 5;
  }

  // Business metrics quality
  if (data.step3) {
    maxScore += 25;

    if (data.step3.hasRevenue && data.step3.monthlyRevenue) score += 10;
    if (data.step3.totalUsers && data.step3.totalUsers > 0) score += 8;
    if (data.step3.customerLifetimeValue && data.step3.customerAcquisitionCost) score += 7;
  }

  // Market position
  if (data.step4) {
    maxScore += 20;

    if (data.step4.competitiveAdvantage && data.step4.competitiveAdvantage.length > 50) score += 10;
    if (data.step4.hasCustomerTestimonials) score += 5;
    if (data.step4.hasPressCoverage) score += 5;
  }

  return maxScore > 0 ? Math.round((score / maxScore) * 100) : 0;
}