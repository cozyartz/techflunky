// AI validation using Claude API
export async function validateBusinessIdea(
  idea: {
    title: string;
    description: string;
    marketResearch: string;
    businessPlan: string;
  },
  claudeApiKey: string
): Promise<{
  score: number;
  feedback: string;
  suggestions: string[];
}> {
  const prompt = `
    Analyze this business idea and provide a validation score (0-100) based on:
    1. Market viability and size
    2. Business model clarity
    3. Revenue potential
    4. Competitive advantage
    5. Implementation feasibility
    
    Business Idea:
    Title: ${idea.title}
    Description: ${idea.description}
    Market Research: ${idea.marketResearch}
    Business Plan: ${idea.businessPlan}
    
    Respond in JSON format:
    {
      "score": number,
      "feedback": "overall assessment",
      "suggestions": ["improvement 1", "improvement 2", ...]
    }
  `;

  try {
    const response = await fetch('https://api.anthropic.com/v1/messages', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'x-api-key': claudeApiKey,
        'anthropic-version': '2023-06-01'
      },
      body: JSON.stringify({
        model: 'claude-3-sonnet-20240229',
        max_tokens: 1000,
        messages: [{
          role: 'user',
          content: prompt
        }]
      })
    });

    const data = await response.json();
    const result = JSON.parse(data.content[0].text);
    
    return {
      score: Math.min(100, Math.max(0, result.score)),
      feedback: result.feedback,
      suggestions: result.suggestions || []
    };
  } catch (error) {
    console.error('AI validation error:', error);
    return {
      score: 0,
      feedback: 'Unable to validate at this time',
      suggestions: []
    };
  }
}

// Generate pricing recommendations
export async function suggestPricing(
  packageTier: 'concept' | 'blueprint' | 'launch_ready',
  marketSize: number,
  completeness: number
): Promise<{ min: number; max: number; recommended: number }> {
  const basePricing = {
    concept: { min: 1000, max: 5000 },
    blueprint: { min: 5000, max: 25000 },
    launch_ready: { min: 25000, max: 100000 }
  };

  const tierPricing = basePricing[packageTier];
  const marketMultiplier = marketSize > 1000000000 ? 2 : marketSize > 100000000 ? 1.5 : 1;
  const completenessMultiplier = completeness / 100;

  return {
    min: tierPricing.min,
    max: tierPricing.max * marketMultiplier,
    recommended: Math.round(
      tierPricing.min + (tierPricing.max - tierPricing.min) * completenessMultiplier * marketMultiplier
    )
  };
}
