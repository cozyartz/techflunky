import { CloudflareAIBlueprintGenerator, type BusinessBlueprint } from '../ai/blueprint-generator';

export interface CertificationCriteria {
  id: string;
  category: string;
  requirement: string;
  weight: number;
  evaluationMethod: 'automated' | 'expert' | 'hybrid';
  passingScore: number;
}

export interface CertificationResult {
  blueprintId: string;
  overallScore: number;
  categoryScores: Record<string, number>;
  certificationLevel: 'none' | 'basic' | 'verified' | 'premium' | 'elite';
  badge: string;
  feedback: string[];
  recommendations: string[];
  certifiedAt?: Date;
  expiresAt?: Date;
  expertReviewRequired: boolean;
}

export interface MarketplaceCertification {
  id: string;
  blueprintId: string;
  level: 'basic' | 'verified' | 'premium' | 'elite';
  badge: string;
  trustScore: number;
  validatedBy: string[];
  certificationDate: Date;
  features: string[];
  guarantees: string[];
}

export class MarketplaceCertificationSystem {
  private ai: any;
  private criteria: CertificationCriteria[];

  constructor(env: { AI: any }) {
    this.ai = new CloudflareAIBlueprintGenerator(env);
    this.criteria = this.initializeCriteria();
  }

  private initializeCriteria(): CertificationCriteria[] {
    return [
      // Technical Viability
      {
        id: 'tech_feasibility',
        category: 'Technical',
        requirement: 'Technology stack is modern, scalable, and well-documented',
        weight: 20,
        evaluationMethod: 'hybrid',
        passingScore: 75
      },
      {
        id: 'tech_architecture',
        category: 'Technical',
        requirement: 'System architecture supports projected user load and growth',
        weight: 15,
        evaluationMethod: 'expert',
        passingScore: 80
      },
      {
        id: 'tech_security',
        category: 'Technical',
        requirement: 'Security measures meet industry standards and compliance requirements',
        weight: 15,
        evaluationMethod: 'automated',
        passingScore: 85
      },

      // Market Viability
      {
        id: 'market_size',
        category: 'Market',
        requirement: 'Total addressable market (TAM) is substantial and well-researched',
        weight: 15,
        evaluationMethod: 'hybrid',
        passingScore: 70
      },
      {
        id: 'market_competition',
        category: 'Market',
        requirement: 'Competitive analysis is thorough and positioning is clear',
        weight: 10,
        evaluationMethod: 'expert',
        passingScore: 75
      },
      {
        id: 'market_timing',
        category: 'Market',
        requirement: 'Market timing and trends support business opportunity',
        weight: 10,
        evaluationMethod: 'automated',
        passingScore: 70
      },

      // Business Model
      {
        id: 'revenue_model',
        category: 'Business',
        requirement: 'Revenue model is clearly defined and financially viable',
        weight: 15,
        evaluationMethod: 'hybrid',
        passingScore: 80
      },
      {
        id: 'financial_projections',
        category: 'Business',
        requirement: 'Financial projections are realistic and well-supported',
        weight: 10,
        evaluationMethod: 'expert',
        passingScore: 75
      },
      {
        id: 'business_scalability',
        category: 'Business',
        requirement: 'Business model demonstrates clear path to scalability',
        weight: 10,
        evaluationMethod: 'hybrid',
        passingScore: 70
      }
    ];
  }

  async evaluateBlueprint(blueprint: BusinessBlueprint): Promise<CertificationResult> {
    const categoryScores: Record<string, number> = {};
    const feedback: string[] = [];
    const recommendations: string[] = [];

    // Group criteria by category
    const categorizedCriteria = this.groupCriteriaByCategory();

    // Evaluate each category
    for (const [category, criteria] of Object.entries(categorizedCriteria)) {
      const categoryResult = await this.evaluateCategory(blueprint, criteria);
      categoryScores[category] = categoryResult.score;
      feedback.push(...categoryResult.feedback);
      recommendations.push(...categoryResult.recommendations);
    }

    // Calculate overall score
    const overallScore = this.calculateOverallScore(categoryScores);

    // Determine certification level
    const certificationLevel = this.determineCertificationLevel(overallScore, categoryScores);

    // Check if expert review is required
    const expertReviewRequired = this.requiresExpertReview(certificationLevel, categoryScores);

    return {
      blueprintId: blueprint.id,
      overallScore,
      categoryScores,
      certificationLevel,
      badge: this.generateBadge(certificationLevel),
      feedback,
      recommendations,
      expertReviewRequired
    };
  }

  private groupCriteriaByCategory(): Record<string, CertificationCriteria[]> {
    return this.criteria.reduce((acc, criterion) => {
      if (!acc[criterion.category]) {
        acc[criterion.category] = [];
      }
      acc[criterion.category].push(criterion);
      return acc;
    }, {} as Record<string, CertificationCriteria[]>);
  }

  private async evaluateCategory(
    blueprint: BusinessBlueprint,
    criteria: CertificationCriteria[]
  ): Promise<{ score: number; feedback: string[]; recommendations: string[] }> {
    const evaluationPrompt = this.buildCategoryEvaluationPrompt(blueprint, criteria);

    const response = await this.ai.ai.run('@cf/meta/llama-3.1-70b-instruct', {
      messages: [
        {
          role: 'system',
          content: 'You are an expert business plan evaluator. Assess business blueprints against specific criteria and provide detailed feedback.'
        },
        {
          role: 'user',
          content: evaluationPrompt
        }
      ],
      max_tokens: 2000,
      temperature: 0.3
    });

    return this.parseCategoryEvaluation(response.response);
  }

  private buildCategoryEvaluationPrompt(blueprint: BusinessBlueprint, criteria: CertificationCriteria[]): string {
    return `
Evaluate this business blueprint against the following criteria:

BLUEPRINT INFORMATION:
Title: ${blueprint.title}
Industry: Technology/SaaS
Problem Statement: ${blueprint.problemStatement}
Target Customer: ${blueprint.targetCustomer}
Value Proposition: ${blueprint.valueProposition}
Revenue Model: ${blueprint.revenueModel}
Technology Stack: ${blueprint.techStack}
Market Size: ${blueprint.marketSize}
Financial Projections: ${blueprint.financialProjections}
Risk Assessment: ${blueprint.riskAssessment}

EVALUATION CRITERIA:
${criteria.map(c => `
- ${c.requirement} (Weight: ${c.weight}%, Passing Score: ${c.passingScore}%)
`).join('')}

For each criterion, provide:
1. Score (0-100)
2. Specific feedback on strengths and weaknesses
3. Actionable recommendations for improvement

Format your response as:
CRITERION: [criterion_id]
SCORE: [0-100]
FEEDBACK: [specific feedback]
RECOMMENDATION: [actionable recommendation]

[Repeat for each criterion]

OVERALL_CATEGORY_SCORE: [weighted average]
CATEGORY_SUMMARY: [overall assessment]
`;
  }

  private parseCategoryEvaluation(response: string): { score: number; feedback: string[]; recommendations: string[] } {
    const feedback: string[] = [];
    const recommendations: string[] = [];

    // Extract overall category score
    const scoreMatch = response.match(/OVERALL_CATEGORY_SCORE:\s*(\d+)/);
    const score = scoreMatch ? parseInt(scoreMatch[1]) : 70;

    // Extract feedback and recommendations
    const criterionBlocks = response.split('CRITERION:').slice(1);

    criterionBlocks.forEach(block => {
      const feedbackMatch = block.match(/FEEDBACK:\s*(.*?)(?=RECOMMENDATION:|$)/s);
      const recommendationMatch = block.match(/RECOMMENDATION:\s*(.*?)(?=CRITERION:|$)/s);

      if (feedbackMatch) {
        feedback.push(feedbackMatch[1].trim());
      }
      if (recommendationMatch) {
        recommendations.push(recommendationMatch[1].trim());
      }
    });

    return { score, feedback, recommendations };
  }

  private calculateOverallScore(categoryScores: Record<string, number>): number {
    const categoryWeights = {
      'Technical': 0.4,
      'Market': 0.35,
      'Business': 0.25
    };

    let weightedSum = 0;
    let totalWeight = 0;

    Object.entries(categoryScores).forEach(([category, score]) => {
      const weight = categoryWeights[category as keyof typeof categoryWeights] || 0.1;
      weightedSum += score * weight;
      totalWeight += weight;
    });

    return Math.round(weightedSum / totalWeight);
  }

  private determineCertificationLevel(overallScore: number, categoryScores: Record<string, number>): CertificationResult['certificationLevel'] {
    const minCategoryScore = Math.min(...Object.values(categoryScores));

    if (overallScore >= 90 && minCategoryScore >= 85) {
      return 'elite';
    } else if (overallScore >= 80 && minCategoryScore >= 75) {
      return 'premium';
    } else if (overallScore >= 70 && minCategoryScore >= 65) {
      return 'verified';
    } else if (overallScore >= 60 && minCategoryScore >= 55) {
      return 'basic';
    } else {
      return 'none';
    }
  }

  private requiresExpertReview(level: CertificationResult['certificationLevel'], categoryScores: Record<string, number>): boolean {
    // Premium and Elite certifications require expert review
    if (level === 'premium' || level === 'elite') {
      return true;
    }

    // If any category score is borderline, require expert review
    const borderlineThreshold = 5; // Within 5 points of next level
    return Object.values(categoryScores).some(score => {
      return (score >= 70 - borderlineThreshold && score <= 70 + borderlineThreshold) ||
             (score >= 80 - borderlineThreshold && score <= 80 + borderlineThreshold);
    });
  }

  private generateBadge(level: CertificationResult['certificationLevel']): string {
    const badges = {
      'none': '',
      'basic': '🥉 TechFlunky Basic',
      'verified': '🥈 TechFlunky Verified',
      'premium': '🥇 TechFlunky Premium',
      'elite': '💎 TechFlunky Elite'
    };

    return badges[level];
  }

  async createMarketplaceCertification(
    certificationResult: CertificationResult,
    expertValidation?: { validatedBy: string; notes: string }
  ): Promise<MarketplaceCertification> {
    const certification: MarketplaceCertification = {
      id: this.generateCertificationId(),
      blueprintId: certificationResult.blueprintId,
      level: certificationResult.certificationLevel as 'basic' | 'verified' | 'premium' | 'elite',
      badge: certificationResult.badge,
      trustScore: this.calculateTrustScore(certificationResult),
      validatedBy: expertValidation ? [expertValidation.validatedBy] : ['AI System'],
      certificationDate: new Date(),
      features: this.getCertificationFeatures(certificationResult.certificationLevel),
      guarantees: this.getCertificationGuarantees(certificationResult.certificationLevel)
    };

    return certification;
  }

  private calculateTrustScore(result: CertificationResult): number {
    const baseScore = result.overallScore;
    const consistencyBonus = this.calculateConsistencyBonus(result.categoryScores);
    const expertBonus = result.expertReviewRequired ? 0 : 5; // AI-only gets slight bonus for efficiency

    return Math.min(100, baseScore + consistencyBonus + expertBonus);
  }

  private calculateConsistencyBonus(categoryScores: Record<string, number>): number {
    const scores = Object.values(categoryScores);
    const average = scores.reduce((sum, score) => sum + score, 0) / scores.length;
    const variance = scores.reduce((sum, score) => sum + Math.pow(score - average, 2), 0) / scores.length;
    const standardDeviation = Math.sqrt(variance);

    // Lower standard deviation = more consistent = higher bonus
    return Math.max(0, 10 - standardDeviation / 2);
  }

  private getCertificationFeatures(level: CertificationResult['certificationLevel']): string[] {
    const features = {
      'basic': [
        'AI-validated business model',
        'Basic market analysis verified',
        'Technical feasibility confirmed'
      ],
      'verified': [
        'Comprehensive AI evaluation',
        'Market opportunity validated',
        'Revenue model verified',
        'Technology stack approved'
      ],
      'premium': [
        'Expert human review completed',
        'Detailed competitive analysis',
        'Financial projections validated',
        'Investment readiness confirmed'
      ],
      'elite': [
        'Elite expert panel review',
        'Comprehensive market research',
        'Investment committee approved',
        'Success prediction model applied'
      ]
    };

    return features[level as keyof typeof features] || [];
  }

  private getCertificationGuarantees(level: CertificationResult['certificationLevel']): string[] {
    const guarantees = {
      'basic': [
        '30-day satisfaction guarantee',
        'Basic technical support'
      ],
      'verified': [
        '60-day satisfaction guarantee',
        'Priority technical support',
        'Free minor revisions'
      ],
      'premium': [
        '90-day satisfaction guarantee',
        'Dedicated success manager',
        'Free major revisions',
        'Performance tracking'
      ],
      'elite': [
        '180-day satisfaction guarantee',
        'White-glove success service',
        'Unlimited revisions for 6 months',
        'Success milestone tracking',
        'Investment introduction support'
      ]
    };

    return guarantees[level as keyof typeof guarantees] || [];
  }

  private generateCertificationId(): string {
    return `cert_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
  }

  // Expert review workflow methods
  async queueForExpertReview(certificationResult: CertificationResult, env: any): Promise<void> {
    const priority = this.getExpertReviewPriority(certificationResult.certificationLevel);

    await env.DB.prepare(`
      INSERT INTO expert_review_queue (
        certification_id, blueprint_id, priority, status, created_at
      ) VALUES (?, ?, ?, ?, ?)
    `).bind(
      certificationResult.blueprintId,
      certificationResult.blueprintId,
      priority,
      'pending',
      new Date().toISOString()
    ).run();

    // Notify expert reviewers
    await this.notifyExpertReviewers(certificationResult, env);
  }

  private getExpertReviewPriority(level: CertificationResult['certificationLevel']): string {
    const priorities = {
      'elite': 'urgent',
      'premium': 'high',
      'verified': 'normal',
      'basic': 'low',
      'none': 'low'
    };

    return priorities[level];
  }

  private async notifyExpertReviewers(result: CertificationResult, env: any): Promise<void> {
    const notification = {
      to: 'experts@techflunky.com',
      subject: `Expert Review Required: ${result.certificationLevel.toUpperCase()} Certification`,
      template: 'expert-certification-review',
      data: {
        blueprintId: result.blueprintId,
        level: result.certificationLevel,
        score: result.overallScore,
        reviewUrl: `https://admin.techflunky.com/certifications/${result.blueprintId}/review`
      }
    };

    await env.EMAIL_QUEUE.send(notification);
  }

  // Public certification verification
  async verifyCertification(certificationId: string, env: any): Promise<MarketplaceCertification | null> {
    const result = await env.DB.prepare(`
      SELECT * FROM marketplace_certifications WHERE id = ?
    `).bind(certificationId).first();

    if (!result) {
      return null;
    }

    return {
      id: result.id,
      blueprintId: result.blueprint_id,
      level: result.level,
      badge: result.badge,
      trustScore: result.trust_score,
      validatedBy: JSON.parse(result.validated_by),
      certificationDate: new Date(result.certification_date),
      features: JSON.parse(result.features),
      guarantees: JSON.parse(result.guarantees)
    };
  }
}