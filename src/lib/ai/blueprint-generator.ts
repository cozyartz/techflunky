import { Ai } from '@cloudflare/ai';

export interface BusinessBlueprint {
  id: string;
  title: string;
  problemStatement: string;
  targetCustomer: string;
  valueProposition: string;
  revenueModel: string;
  pricingStrategy: string;
  goToMarketPlan: string;
  competitiveAdvantage: string;
  techStack: string;
  mvpFeatures: string[];
  roadmap: string;
  marketSize: string;
  financialProjections: string;
  riskAssessment: string;
  legalConsiderations: string;
  ipStrategy: string;
  status: 'draft' | 'ai_generated' | 'expert_reviewed' | 'certified';
  tier: 'basic' | 'premium' | 'enterprise';
  createdAt: Date;
  updatedAt: Date;
}

export interface BlueprintGenerationRequest {
  ideaDescription: string;
  industry: string;
  targetMarket: string;
  businessModel: string;
  techPreference?: string;
  budgetRange?: string;
  timeline?: string;
  tier: 'basic' | 'premium' | 'enterprise';
}

export class CloudflareAIBlueprintGenerator {
  private ai: Ai;

  constructor(env: { AI: any }) {
    this.ai = new Ai(env.AI);
  }

  async generateBusinessBlueprint(request: BlueprintGenerationRequest): Promise<BusinessBlueprint> {
    const prompt = this.buildPrompt(request);

    // Use Cloudflare AI's Llama 3.1 70B for complex business reasoning
    const response = await this.ai.run('@cf/meta/llama-3.1-70b-instruct', {
      messages: [
        {
          role: 'system',
          content: `You are an expert business consultant and startup advisor. Generate comprehensive, actionable business blueprints that investors and entrepreneurs can trust. Focus on realistic market analysis, proven business models, and practical implementation strategies.`
        },
        {
          role: 'user',
          content: prompt
        }
      ],
      max_tokens: 4000,
      temperature: 0.7
    });

    const blueprintData = this.parseAIResponse(response.response);

    // Enhance with additional AI analysis if premium/enterprise tier
    if (request.tier !== 'basic') {
      await this.enhanceBlueprint(blueprintData, request);
    }

    return {
      id: this.generateId(),
      ...blueprintData,
      status: 'ai_generated',
      tier: request.tier,
      createdAt: new Date(),
      updatedAt: new Date()
    };
  }

  private buildPrompt(request: BlueprintGenerationRequest): string {
    return `
Generate a comprehensive business blueprint for the following idea:

**Idea Description**: ${request.ideaDescription}
**Industry**: ${request.industry}
**Target Market**: ${request.targetMarket}
**Business Model**: ${request.businessModel}
**Tech Preference**: ${request.techPreference || 'Modern web technologies'}
**Budget Range**: ${request.budgetRange || 'Not specified'}
**Timeline**: ${request.timeline || 'Not specified'}
**Service Tier**: ${request.tier}

Create a detailed business blueprint with the following sections:

1. **Problem Statement** (2-3 sentences)
   - Clear problem definition
   - Market pain points
   - Opportunity size

2. **Target Customer** (detailed persona)
   - Demographics and psychographics
   - Specific pain points
   - Buying behavior and decision factors

3. **Value Proposition** (compelling statement)
   - Unique value delivered
   - Differentiation from competitors
   - Quantifiable benefits

4. **Revenue Model** (detailed breakdown)
   - Primary revenue streams
   - Pricing strategy rationale
   - Revenue projections (monthly/annual)

5. **Go-to-Market Plan** (actionable strategy)
   - Customer acquisition channels
   - Marketing and sales strategy
   - Partnership opportunities

6. **Competitive Advantage** (sustainable moats)
   - Technology advantages
   - Market positioning
   - Barriers to entry

7. **Technology Stack** (specific recommendations)
   - Frontend and backend technologies
   - Database and infrastructure
   - Third-party integrations
   - Scalability considerations

8. **MVP Features** (prioritized list)
   - Core features for launch
   - Nice-to-have features
   - Future enhancement roadmap

9. **12-Month Roadmap** (quarterly milestones)
   - Development phases
   - Market validation checkpoints
   - Key metrics and goals

10. **Market Size Analysis** (TAM/SAM/SOM)
    - Total addressable market
    - Serviceable addressable market
    - Serviceable obtainable market

11. **Financial Projections** (realistic estimates)
    - Startup costs
    - Monthly burn rate
    - Revenue ramp-up timeline
    - Break-even analysis

12. **Risk Assessment** (major risks and mitigation)
    - Technical risks
    - Market risks
    - Competitive risks
    - Mitigation strategies

13. **Legal Considerations** (compliance requirements)
    - Business structure recommendations
    - Regulatory requirements
    - Data privacy compliance
    - Terms of service considerations

14. **IP Strategy** (intellectual property protection)
    - Patent opportunities
    - Trademark considerations
    - Trade secret protection
    - Copyright strategies

Format the response as a structured JSON object with each section clearly defined. Include specific, actionable recommendations rather than generic advice. Focus on ${request.tier === 'enterprise' ? 'comprehensive enterprise-grade analysis' : request.tier === 'premium' ? 'detailed market research and competitive analysis' : 'essential business fundamentals'}.
`;
  }

  private async enhanceBlueprint(blueprint: Partial<BusinessBlueprint>, request: BlueprintGenerationRequest): Promise<void> {
    // Premium tier: Add competitive analysis
    if (request.tier === 'premium' || request.tier === 'enterprise') {
      const competitiveAnalysis = await this.generateCompetitiveAnalysis(blueprint, request);
      blueprint.competitiveAdvantage = competitiveAnalysis;
    }

    // Enterprise tier: Add comprehensive market research
    if (request.tier === 'enterprise') {
      const marketResearch = await this.generateMarketResearch(blueprint, request);
      blueprint.marketSize = marketResearch;
    }
  }

  private async generateCompetitiveAnalysis(blueprint: Partial<BusinessBlueprint>, request: BlueprintGenerationRequest): Promise<string> {
    const prompt = `
Based on this business concept: "${request.ideaDescription}" in the ${request.industry} industry,
provide a comprehensive competitive analysis including:

1. Direct competitors (3-5 companies)
2. Indirect competitors (2-3 companies)
3. Competitive positioning matrix
4. Market gaps and opportunities
5. Differentiation strategies
6. Competitive pricing analysis
7. SWOT analysis vs top 2 competitors

Focus on actionable insights for market positioning and competitive strategy.
`;

    const response = await this.ai.run('@cf/meta/llama-3.1-70b-instruct', {
      messages: [
        {
          role: 'system',
          content: 'You are a market research analyst specializing in competitive intelligence. Provide detailed, data-driven competitive analysis.'
        },
        {
          role: 'user',
          content: prompt
        }
      ],
      max_tokens: 2000,
      temperature: 0.6
    });

    return response.response;
  }

  private async generateMarketResearch(blueprint: Partial<BusinessBlueprint>, request: BlueprintGenerationRequest): Promise<string> {
    const prompt = `
Conduct comprehensive market research for: "${request.ideaDescription}" in ${request.industry}

Include:
1. Market size analysis (TAM/SAM/SOM with specific numbers)
2. Growth trends and projections (5-year outlook)
3. Customer segmentation and personas
4. Market dynamics and trends
5. Regulatory environment impact
6. Technology adoption trends
7. Investment and funding landscape
8. Exit strategy opportunities

Provide specific data points, statistics, and actionable market insights.
`;

    const response = await this.ai.run('@cf/meta/llama-3.1-70b-instruct', {
      messages: [
        {
          role: 'system',
          content: 'You are a senior market research analyst with expertise in startup market analysis. Provide comprehensive, data-backed market research.'
        },
        {
          role: 'user',
          content: prompt
        }
      ],
      max_tokens: 2500,
      temperature: 0.5
    });

    return response.response;
  }

  private parseAIResponse(response: string): Partial<BusinessBlueprint> {
    try {
      // Try to parse as JSON first
      const parsed = JSON.parse(response);
      return parsed;
    } catch {
      // Fallback: parse structured text response
      return this.parseStructuredText(response);
    }
  }

  private parseStructuredText(text: string): Partial<BusinessBlueprint> {
    const sections: Record<string, string> = {};

    // Extract sections using regex patterns
    const patterns = {
      title: /(?:Title|Name|Business Name):\s*(.+)/i,
      problemStatement: /(?:Problem Statement|Problem):\s*([\s\S]*?)(?=\n\n|\n[A-Z])/i,
      targetCustomer: /(?:Target Customer|Customer):\s*([\s\S]*?)(?=\n\n|\n[A-Z])/i,
      valueProposition: /(?:Value Proposition|Value):\s*([\s\S]*?)(?=\n\n|\n[A-Z])/i,
      revenueModel: /(?:Revenue Model|Revenue):\s*([\s\S]*?)(?=\n\n|\n[A-Z])/i,
      goToMarketPlan: /(?:Go-to-Market|Marketing Plan):\s*([\s\S]*?)(?=\n\n|\n[A-Z])/i,
      techStack: /(?:Technology Stack|Tech Stack):\s*([\s\S]*?)(?=\n\n|\n[A-Z])/i,
      roadmap: /(?:Roadmap|Timeline):\s*([\s\S]*?)(?=\n\n|\n[A-Z])/i,
      marketSize: /(?:Market Size|Market Analysis):\s*([\s\S]*?)(?=\n\n|\n[A-Z])/i,
      financialProjections: /(?:Financial Projections|Financials):\s*([\s\S]*?)(?=\n\n|\n[A-Z])/i
    };

    Object.entries(patterns).forEach(([key, pattern]) => {
      const match = text.match(pattern);
      if (match) {
        sections[key] = match[1].trim();
      }
    });

    // Extract MVP features as array
    const mvpMatch = text.match(/(?:MVP Features|Core Features):\s*([\s\S]*?)(?=\n\n|\n[A-Z])/i);
    const mvpFeatures = mvpMatch ?
      mvpMatch[1].split('\n').map(line => line.replace(/^[-*•]\s*/, '').trim()).filter(Boolean) :
      [];

    return {
      title: sections.title || 'Generated Business Blueprint',
      problemStatement: sections.problemStatement || '',
      targetCustomer: sections.targetCustomer || '',
      valueProposition: sections.valueProposition || '',
      revenueModel: sections.revenueModel || '',
      goToMarketPlan: sections.goToMarketPlan || '',
      techStack: sections.techStack || '',
      roadmap: sections.roadmap || '',
      marketSize: sections.marketSize || '',
      financialProjections: sections.financialProjections || '',
      mvpFeatures
    };
  }

  private generateId(): string {
    return `bp_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
  }

  // Validation and scoring methods
  async validateBlueprint(blueprint: BusinessBlueprint): Promise<{
    score: number;
    feedback: string[];
    recommendations: string[];
  }> {
    const validationPrompt = `
Evaluate this business blueprint for completeness, feasibility, and market potential:

${JSON.stringify(blueprint, null, 2)}

Provide:
1. Overall score (0-100)
2. Specific feedback on weaknesses
3. Recommendations for improvement
4. Market viability assessment
5. Technical feasibility assessment

Focus on actionable insights for improvement.
`;

    const response = await this.ai.run('@cf/meta/llama-3.1-70b-instruct', {
      messages: [
        {
          role: 'system',
          content: 'You are a senior business consultant evaluating startup business plans. Provide constructive, actionable feedback.'
        },
        {
          role: 'user',
          content: validationPrompt
        }
      ],
      max_tokens: 1500,
      temperature: 0.3
    });

    return this.parseValidationResponse(response.response);
  }

  private parseValidationResponse(response: string): {
    score: number;
    feedback: string[];
    recommendations: string[];
  } {
    const scoreMatch = response.match(/(?:score|rating):\s*(\d+)/i);
    const score = scoreMatch ? parseInt(scoreMatch[1]) : 75;

    const feedbackMatch = response.match(/feedback:\s*([\s\S]*?)(?=recommendations:|$)/i);
    const feedback = feedbackMatch ?
      feedbackMatch[1].split('\n').map(line => line.replace(/^[-*•]\s*/, '').trim()).filter(Boolean) :
      [];

    const recommendationsMatch = response.match(/recommendations:\s*([\s\S]*?)$/i);
    const recommendations = recommendationsMatch ?
      recommendationsMatch[1].split('\n').map(line => line.replace(/^[-*•]\s*/, '').trim()).filter(Boolean) :
      [];

    return { score, feedback, recommendations };
  }
}