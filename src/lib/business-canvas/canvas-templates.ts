export interface BusinessCanvasSection {
  id: string;
  title: string;
  description: string;
  prompts: string[];
  examples: string[];
  validation: {
    required: boolean;
    minLength?: number;
    maxLength?: number;
    format?: string;
  };
  weight: number; // For scoring
}

export interface BusinessCanvas {
  id: string;
  name: string;
  description: string;
  category: string;
  sections: BusinessCanvasSection[];
  estimatedTimeMinutes: number;
  difficulty: 'beginner' | 'intermediate' | 'advanced';
}

export class BusinessCanvasTemplates {
  private templates: BusinessCanvas[];

  constructor() {
    this.templates = this.initializeTemplates();
  }

  getTemplate(templateId: string): BusinessCanvas | null {
    return this.templates.find(template => template.id === templateId) || null;
  }

  getTemplatesByCategory(category: string): BusinessCanvas[] {
    return this.templates.filter(template => template.category === category);
  }

  getAllTemplates(): BusinessCanvas[] {
    return this.templates;
  }

  private initializeTemplates(): BusinessCanvas[] {
    return [
      {
        id: 'saas-platform',
        name: 'SaaS Platform Canvas',
        description: 'Comprehensive template for Software-as-a-Service business models',
        category: 'saas',
        estimatedTimeMinutes: 45,
        difficulty: 'intermediate',
        sections: [
          {
            id: 'problem-opportunity',
            title: 'Problem & Opportunity',
            description: 'Define the core problem you\'re solving and the market opportunity',
            prompts: [
              'What specific problem does your SaaS solve?',
              'How are people currently solving this problem?',
              'What makes this a significant opportunity now?',
              'What pain points do current solutions have?'
            ],
            examples: [
              'Small businesses struggle with managing customer relationships across multiple channels',
              'Marketing teams waste 60% of their time on manual reporting tasks',
              'Remote teams lack real-time collaboration tools for design feedback'
            ],
            validation: {
              required: true,
              minLength: 100,
              maxLength: 1000
            },
            weight: 20
          },
          {
            id: 'target-customers',
            title: 'Target Customers',
            description: 'Define your ideal customer personas and market segments',
            prompts: [
              'Who are your primary target customers?',
              'What are their demographics and psychographics?',
              'What job titles/roles are you targeting?',
              'What company sizes and industries?',
              'How do they currently make purchasing decisions?'
            ],
            examples: [
              'Marketing managers at B2B SaaS companies (50-500 employees)',
              'Small business owners in professional services ($1M-10M revenue)',
              'IT administrators at mid-market companies seeking compliance tools'
            ],
            validation: {
              required: true,
              minLength: 150,
              maxLength: 800
            },
            weight: 18
          },
          {
            id: 'value-proposition',
            title: 'Value Proposition',
            description: 'Articulate the unique value and benefits you provide',
            prompts: [
              'What unique value do you provide to customers?',
              'How do you differentiate from competitors?',
              'What specific outcomes do customers achieve?',
              'What\'s your core competitive advantage?'
            ],
            examples: [
              'Reduce customer support costs by 40% through AI-powered automation',
              'Launch marketing campaigns 10x faster with our template library',
              'Achieve SOC 2 compliance in 90 days vs 12 months with traditional methods'
            ],
            validation: {
              required: true,
              minLength: 100,
              maxLength: 600
            },
            weight: 22
          },
          {
            id: 'revenue-model',
            title: 'Revenue Model & Pricing',
            description: 'Define how you generate revenue and your pricing strategy',
            prompts: [
              'What is your primary revenue model?',
              'How will you price your solution?',
              'What pricing tiers will you offer?',
              'What\'s your customer acquisition cost vs lifetime value?',
              'How will pricing scale with usage/value?'
            ],
            examples: [
              'Freemium SaaS: $0 starter, $49/month pro, $149/month enterprise',
              'Usage-based: $0.10 per API call with volume discounts',
              'Seat-based: $25 per user per month with annual discounts'
            ],
            validation: {
              required: true,
              minLength: 200,
              maxLength: 1000
            },
            weight: 20
          },
          {
            id: 'go-to-market',
            title: 'Go-to-Market Strategy',
            description: 'Plan how you\'ll acquire and onboard customers',
            prompts: [
              'How will you acquire your first 100 customers?',
              'What marketing channels will you use?',
              'What\'s your sales process and cycle?',
              'How will you onboard and retain customers?',
              'What partnerships will help you grow?'
            ],
            examples: [
              'Content marketing + free trials targeting product managers on LinkedIn',
              'Partner with consultants who implement our solution for their clients',
              'Direct sales targeting enterprise accounts with 6-month sales cycles'
            ],
            validation: {
              required: true,
              minLength: 200,
              maxLength: 1200
            },
            weight: 15
          },
          {
            id: 'technology-stack',
            title: 'Technology & Implementation',
            description: 'Define the technical foundation and development approach',
            prompts: [
              'What technology stack will you use?',
              'How will you ensure scalability and performance?',
              'What are your security and compliance requirements?',
              'What\'s your MVP vs full product roadmap?',
              'How will you handle data and integrations?'
            ],
            examples: [
              'Next.js frontend, Node.js API, PostgreSQL database, deployed on AWS',
              'Multi-tenant SaaS architecture with tenant-level data isolation',
              'SOC 2 compliant infrastructure with end-to-end encryption'
            ],
            validation: {
              required: true,
              minLength: 150,
              maxLength: 800
            },
            weight: 5
          }
        ]
      },
      {
        id: 'marketplace-platform',
        name: 'Marketplace Platform Canvas',
        description: 'Template for two-sided marketplace business models',
        category: 'marketplace',
        estimatedTimeMinutes: 60,
        difficulty: 'advanced',
        sections: [
          {
            id: 'marketplace-dynamics',
            title: 'Marketplace Dynamics',
            description: 'Define your two-sided market and network effects',
            prompts: [
              'What are the two (or more) sides of your marketplace?',
              'What value does each side provide to the other?',
              'How will you solve the chicken-and-egg problem?',
              'What network effects will strengthen your platform?'
            ],
            examples: [
              'Freelance developers supply skills, startups demand development work',
              'Local restaurants provide food, busy professionals want convenient meals',
              'Property owners offer space, event planners need unique venues'
            ],
            validation: {
              required: true,
              minLength: 200,
              maxLength: 1000
            },
            weight: 25
          },
          {
            id: 'supply-side',
            title: 'Supply Side Strategy',
            description: 'How you\'ll attract and retain suppliers/sellers',
            prompts: [
              'Who are your suppliers/sellers?',
              'What motivates them to join your platform?',
              'How will you onboard and support them?',
              'What tools will you provide to help them succeed?'
            ],
            examples: [
              'Freelancers seeking steady work and fair payment terms',
              'Restaurants wanting to expand delivery without infrastructure costs',
              'Property owners looking to monetize unused space'
            ],
            validation: {
              required: true,
              minLength: 150,
              maxLength: 800
            },
            weight: 20
          },
          {
            id: 'demand-side',
            title: 'Demand Side Strategy',
            description: 'How you\'ll attract and retain buyers/customers',
            prompts: [
              'Who are your buyers/customers?',
              'What drives them to use your platform vs alternatives?',
              'How will you ensure great buyer experience?',
              'What search, discovery, and matching features will you provide?'
            ],
            examples: [
              'Startups needing vetted developers for specific projects',
              'Time-pressed professionals wanting quality food delivered quickly',
              'Event planners seeking unique, bookable venues with amenities'
            ],
            validation: {
              required: true,
              minLength: 150,
              maxLength: 800
            },
            weight: 20
          },
          {
            id: 'monetization-model',
            title: 'Monetization & Take Rate',
            description: 'How you\'ll generate revenue from marketplace transactions',
            prompts: [
              'What\'s your revenue model and take rate?',
              'Will you charge suppliers, buyers, or both?',
              'What additional revenue streams will you develop?',
              'How does your pricing compare to alternatives?'
            ],
            examples: [
              '8-12% commission on completed projects + payment processing fees',
              '8% delivery fee from customers + 3% commission from restaurants',
              '5% booking fee + payment processing + premium listing fees'
            ],
            validation: {
              required: true,
              minLength: 100,
              maxLength: 600
            },
            weight: 15
          },
          {
            id: 'trust-safety',
            title: 'Trust & Safety',
            description: 'How you\'ll ensure quality and build trust between parties',
            prompts: [
              'How will you verify and vet participants?',
              'What quality control measures will you implement?',
              'How will you handle disputes and issues?',
              'What insurance or guarantees will you provide?'
            ],
            examples: [
              'Developer skill assessments + client reviews + escrow payments',
              'Restaurant health ratings + delivery tracking + money-back guarantee',
              'Property verification + insurance coverage + 24/7 support'
            ],
            validation: {
              required: true,
              minLength: 150,
              maxLength: 800
            },
            weight: 10
          },
          {
            id: 'platform-features',
            title: 'Platform Features & Technology',
            description: 'Core platform capabilities and technical requirements',
            prompts: [
              'What are the essential platform features for each side?',
              'How will matching and discovery work?',
              'What communication and transaction tools will you provide?',
              'How will you handle payments, contracts, and fulfillment?'
            ],
            examples: [
              'Project posting, developer profiles, skill matching, milestone payments',
              'Restaurant menus, order tracking, delivery optimization, ratings',
              'Venue listings, availability calendar, booking system, payment processing'
            ],
            validation: {
              required: true,
              minLength: 200,
              maxLength: 1000
            },
            weight: 10
          }
        ]
      },
      {
        id: 'ai-platform',
        name: 'AI-Powered Platform Canvas',
        description: 'Template for AI and machine learning business models',
        category: 'ai',
        estimatedTimeMinutes: 50,
        difficulty: 'advanced',
        sections: [
          {
            id: 'ai-use-case',
            title: 'AI Use Case & Problem',
            description: 'Define the specific AI application and problem being solved',
            prompts: [
              'What specific task or decision does your AI automate or enhance?',
              'Why is AI the best solution for this problem?',
              'What type of AI/ML are you using (NLP, computer vision, prediction, etc.)?',
              'How does AI create 10x better outcomes than manual processes?'
            ],
            examples: [
              'AI analyzes customer support tickets and auto-generates responses',
              'Computer vision identifies defects in manufacturing with 99.9% accuracy',
              'NLP extracts key insights from legal documents in seconds vs hours'
            ],
            validation: {
              required: true,
              minLength: 150,
              maxLength: 800
            },
            weight: 25
          },
          {
            id: 'data-strategy',
            title: 'Data Strategy & Moats',
            description: 'How you\'ll acquire, process, and leverage data for competitive advantage',
            prompts: [
              'What data do you need to train and improve your AI?',
              'How will you acquire this data initially and ongoing?',
              'What data moats will you build over time?',
              'How will you ensure data quality and compliance?'
            ],
            examples: [
              'Customer interaction data creates better support responses over time',
              'Proprietary manufacturing data builds superior defect detection',
              'Legal document corpus enables domain-specific AI capabilities'
            ],
            validation: {
              required: true,
              minLength: 150,
              maxLength: 800
            },
            weight: 20
          },
          {
            id: 'ai-value-delivery',
            title: 'AI Value Delivery Model',
            description: 'How customers interact with and benefit from your AI',
            prompts: [
              'How do customers access and use your AI capabilities?',
              'What\'s the user experience and interface?',
              'How do you measure and communicate AI performance?',
              'What guarantees or SLAs do you provide?'
            ],
            examples: [
              'API-first platform with 99.9% uptime and sub-200ms response times',
              'No-code interface where users upload images and get instant analysis',
              'White-label solution integrated into customers\' existing workflows'
            ],
            validation: {
              required: true,
              minLength: 100,
              maxLength: 600
            },
            weight: 20
          },
          {
            id: 'ai-business-model',
            title: 'AI Business Model & Economics',
            description: 'How you monetize AI capabilities and scale economically',
            prompts: [
              'How do you price your AI solution?',
              'What are your unit economics (compute costs, inference costs)?',
              'How does pricing scale with usage or value created?',
              'What\'s your customer acquisition cost vs lifetime value?'
            ],
            examples: [
              'Usage-based: $0.10 per image analyzed + $100/month platform fee',
              'Value-based: 20% of cost savings generated by our AI recommendations',
              'Subscription: $500/month for unlimited document processing'
            ],
            validation: {
              required: true,
              minLength: 150,
              maxLength: 800
            },
            weight: 15
          },
          {
            id: 'ai-development',
            title: 'AI Development & Iteration',
            description: 'Technical approach and continuous improvement strategy',
            prompts: [
              'What\'s your AI/ML technology stack?',
              'How will you continuously improve model performance?',
              'What\'s your approach to model training, testing, and deployment?',
              'How will you handle model drift and retraining?'
            ],
            examples: [
              'PyTorch models deployed on AWS SageMaker with automated retraining',
              'Active learning pipeline that improves accuracy with each customer interaction',
              'A/B testing framework for comparing model versions in production'
            ],
            validation: {
              required: true,
              minLength: 150,
              maxLength: 800
            },
            weight: 10
          },
          {
            id: 'ai-ethics-compliance',
            title: 'AI Ethics & Compliance',
            description: 'Responsible AI practices and regulatory compliance',
            prompts: [
              'What ethical considerations apply to your AI use case?',
              'How do you ensure fairness, transparency, and accountability?',
              'What regulations (GDPR, CCPA, industry-specific) must you comply with?',
              'How do you handle bias detection and mitigation?'
            ],
            examples: [
              'Regular bias audits across demographic groups with public reporting',
              'Explainable AI features that show how decisions are made',
              'GDPR-compliant data handling with right to deletion and portability'
            ],
            validation: {
              required: true,
              minLength: 100,
              maxLength: 600
            },
            weight: 10
          }
        ]
      }
    ];
  }

  // Canvas evaluation and scoring methods
  evaluateCanvas(canvasData: Record<string, string>): {
    score: number;
    feedback: string[];
    completeness: number;
    strengths: string[];
    improvements: string[];
  } {
    const template = this.getTemplate(canvasData.templateId);
    if (!template) {
      throw new Error('Invalid template ID');
    }

    let totalScore = 0;
    let completedSections = 0;
    const feedback: string[] = [];
    const strengths: string[] = [];
    const improvements: string[] = [];

    for (const section of template.sections) {
      const sectionData = canvasData[section.id] || '';
      const sectionScore = this.evaluateSection(section, sectionData);

      totalScore += sectionScore.score * (section.weight / 100);

      if (sectionData.trim()) {
        completedSections++;
      }

      feedback.push(...sectionScore.feedback);

      if (sectionScore.score >= 80) {
        strengths.push(`Strong ${section.title.toLowerCase()}`);
      } else if (sectionScore.score < 60) {
        improvements.push(`Improve ${section.title.toLowerCase()}`);
      }
    }

    const completeness = (completedSections / template.sections.length) * 100;

    return {
      score: Math.round(totalScore),
      feedback,
      completeness: Math.round(completeness),
      strengths,
      improvements
    };
  }

  private evaluateSection(section: BusinessCanvasSection, data: string): {
    score: number;
    feedback: string[];
  } {
    const feedback: string[] = [];
    let score = 0;

    // Check if required section is completed
    if (section.validation.required && !data.trim()) {
      feedback.push(`${section.title} is required but missing`);
      return { score: 0, feedback };
    }

    if (!data.trim()) {
      return { score: 0, feedback: [] };
    }

    // Length validation
    if (section.validation.minLength && data.length < section.validation.minLength) {
      feedback.push(`${section.title} needs more detail (${data.length}/${section.validation.minLength} characters)`);
      score = Math.max(score, 30);
    } else if (section.validation.minLength) {
      score = Math.max(score, 60);
    }

    // Content quality heuristics
    const sentences = data.split(/[.!?]+/).filter(s => s.trim().length > 0);
    const words = data.split(/\s+/).filter(w => w.length > 0);

    if (sentences.length >= 3 && words.length >= 50) {
      score = Math.max(score, 75);
    }

    // Check for specific keywords based on section
    const hasRelevantKeywords = this.checkRelevantKeywords(section.id, data);
    if (hasRelevantKeywords) {
      score = Math.max(score, 85);
    }

    // Check for quantitative data
    const hasNumbers = /\$[\d,]+|\d+%|\d+x|\d+\/month|\d+ (days|months|years)/.test(data);
    if (hasNumbers) {
      score = Math.max(score, 90);
      feedback.push(`Great use of specific metrics in ${section.title}`);
    }

    return { score: Math.min(score, 100), feedback };
  }

  private checkRelevantKeywords(sectionId: string, data: string): boolean {
    const keywordSets: Record<string, string[]> = {
      'problem-opportunity': ['problem', 'pain', 'challenge', 'opportunity', 'market', 'solution'],
      'target-customers': ['customer', 'user', 'segment', 'persona', 'demographic', 'target'],
      'value-proposition': ['value', 'benefit', 'advantage', 'unique', 'differentiate', 'competitive'],
      'revenue-model': ['revenue', 'pricing', 'subscription', 'cost', 'profit', 'monetize'],
      'go-to-market': ['marketing', 'sales', 'channel', 'acquisition', 'growth', 'strategy'],
      'technology-stack': ['technology', 'platform', 'architecture', 'scalable', 'security', 'infrastructure']
    };

    const keywords = keywordSets[sectionId] || [];
    const lowerData = data.toLowerCase();

    return keywords.some(keyword => lowerData.includes(keyword));
  }
}