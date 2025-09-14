// AI-Powered Matching System
// Smart buyer-seller matching with Claude AI integration
import type { APIContext } from 'astro';

interface UserPreferences {
  industries: string[];
  budgetRangeMin: number;
  budgetRangeMax: number;
  businessStages: string[];
  investmentTypes: string[];
  communicationPreferences: Record<string, any>;
}

interface MatchingCriteria {
  industryMatch: number;
  budgetCompatibility: number;
  stageAlignment: number;
  investmentTypeMatch: number;
  userBehaviorScore: number;
  temporalRelevance: number;
}

export async function POST({ request, locals }: APIContext) {
  const { DB, CLAUDE_API_KEY } = locals.runtime.env;

  try {
    const { userId, forceRefresh = false } = await request.json();

    if (!userId) {
      return new Response(JSON.stringify({ error: 'User ID required' }), {
        status: 400,
        headers: { 'Content-Type': 'application/json' }
      });
    }

    // Get user preferences
    const userPrefs = await DB.prepare(`
      SELECT * FROM user_preferences WHERE user_id = ?
    `).bind(userId).first() as UserPreferences | null;

    if (!userPrefs) {
      return new Response(JSON.stringify({
        error: 'User preferences not found',
        action: 'setup_preferences'
      }), {
        status: 404,
        headers: { 'Content-Type': 'application/json' }
      });
    }

    // Check if we have recent matches and don't need refresh
    if (!forceRefresh) {
      const recentMatches = await DB.prepare(`
        SELECT COUNT(*) as count FROM ai_matches
        WHERE user_id = ? AND created_at > ?
      `).bind(userId, Math.floor(Date.now() / 1000) - 3600).first(); // 1 hour

      if (recentMatches.count > 0) {
        const existingMatches = await getExistingMatches(DB, userId);
        return new Response(JSON.stringify({ matches: existingMatches }), {
          headers: { 'Content-Type': 'application/json' }
        });
      }
    }

    // Get active listings for matching
    const listings = await DB.prepare(`
      SELECT l.*, p.company, p.bio, u.name as seller_name,
             AVG(r.rating) as seller_rating
      FROM listings l
      JOIN users u ON l.seller_id = u.id
      LEFT JOIN profiles p ON u.id = p.user_id
      LEFT JOIN reviews r ON r.reviewed_id = u.id
      WHERE l.status = 'active' AND l.seller_id != ?
      GROUP BY l.id
      ORDER BY l.created_at DESC
      LIMIT 100
    `).bind(userId).all();

    // Calculate matching scores
    const matches = [];

    for (const listing of listings) {
      const matchScore = await calculateMatchScore(listing, userPrefs, CLAUDE_API_KEY);

      if (matchScore.totalScore >= 0.3) { // Minimum threshold
        matches.push({
          listingId: listing.id,
          userId,
          matchScore: matchScore.totalScore,
          matchReasons: matchScore.reasons,
          listing: listing
        });
      }
    }

    // Sort by match score
    matches.sort((a, b) => b.matchScore - a.matchScore);

    // Take top 20 matches
    const topMatches = matches.slice(0, 20);

    // Store matches in database
    const insertPromises = topMatches.map(match =>
      DB.prepare(`
        INSERT OR REPLACE INTO ai_matches
        (user_id, listing_id, match_score, match_reasons, created_at, updated_at)
        VALUES (?, ?, ?, ?, ?, ?)
      `).bind(
        match.userId,
        match.listingId,
        match.matchScore,
        JSON.stringify(match.matchReasons),
        Math.floor(Date.now() / 1000),
        Math.floor(Date.now() / 1000)
      ).run()
    );

    await Promise.all(insertPromises);

    // Enhanced matching with AI insights
    const aiEnhancedMatches = await enhanceMatchesWithAI(topMatches, CLAUDE_API_KEY);

    return new Response(JSON.stringify({
      matches: aiEnhancedMatches,
      totalMatches: topMatches.length,
      refreshedAt: new Date().toISOString()
    }), {
      headers: { 'Content-Type': 'application/json' }
    });

  } catch (error) {
    console.error('AI Matching error:', error);
    return new Response(JSON.stringify({ error: 'Internal server error' }), {
      status: 500,
      headers: { 'Content-Type': 'application/json' }
    });
  }
}

async function calculateMatchScore(listing: any, userPrefs: UserPreferences, claudeApiKey: string): Promise<{
  totalScore: number;
  reasons: string[];
  breakdown: MatchingCriteria;
}> {
  const breakdown: MatchingCriteria = {
    industryMatch: 0,
    budgetCompatibility: 0,
    stageAlignment: 0,
    investmentTypeMatch: 0,
    userBehaviorScore: 0,
    temporalRelevance: 0
  };

  const reasons: string[] = [];

  // Industry matching
  if (userPrefs.industries.includes(listing.industry)) {
    breakdown.industryMatch = 1.0;
    reasons.push(`Perfect industry match: ${listing.industry}`);
  } else if (userPrefs.industries.some(industry =>
    listing.category.toLowerCase().includes(industry.toLowerCase()))) {
    breakdown.industryMatch = 0.7;
    reasons.push(`Related industry alignment`);
  }

  // Budget compatibility
  if (listing.price >= userPrefs.budgetRangeMin && listing.price <= userPrefs.budgetRangeMax) {
    breakdown.budgetCompatibility = 1.0;
    reasons.push(`Within your budget range`);
  } else if (listing.price <= userPrefs.budgetRangeMax * 1.2) {
    breakdown.budgetCompatibility = 0.6;
    reasons.push(`Slightly above budget but negotiable`);
  }

  // Business stage alignment
  if (userPrefs.businessStages.includes(listing.package_tier)) {
    breakdown.stageAlignment = 1.0;
    reasons.push(`Matches your preferred business stage: ${listing.package_tier}`);
  }

  // Temporal relevance (newer listings score higher)
  const daysSinceListing = (Date.now() / 1000 - listing.created_at) / (24 * 60 * 60);
  breakdown.temporalRelevance = Math.max(0, 1 - (daysSinceListing / 30)); // Decay over 30 days

  if (daysSinceListing < 7) {
    reasons.push('Recently listed and fresh');
  }

  // User behavior score (placeholder for future ML model)
  breakdown.userBehaviorScore = 0.5; // Default neutral score

  // Calculate weighted total score
  const weights = {
    industryMatch: 0.3,
    budgetCompatibility: 0.25,
    stageAlignment: 0.2,
    investmentTypeMatch: 0.1,
    userBehaviorScore: 0.1,
    temporalRelevance: 0.05
  };

  const totalScore = Object.keys(weights).reduce((score, key) => {
    return score + (breakdown[key as keyof MatchingCriteria] * weights[key as keyof typeof weights]);
  }, 0);

  return { totalScore, reasons, breakdown };
}

async function enhanceMatchesWithAI(matches: any[], claudeApiKey: string) {
  if (!claudeApiKey) return matches;

  try {
    const enhancedMatches = [];

    for (const match of matches.slice(0, 5)) { // Enhance top 5 with AI
      const aiInsight = await getAIInsights(match, claudeApiKey);
      enhancedMatches.push({
        ...match,
        aiInsights: aiInsight
      });
    }

    return [...enhancedMatches, ...matches.slice(5)];
  } catch (error) {
    console.error('AI enhancement error:', error);
    return matches; // Return original matches if AI fails
  }
}

async function getAIInsights(match: any, claudeApiKey: string) {
  const prompt = `
    Analyze this business idea match and provide insights:

    Business Idea: ${match.listing.title}
    Description: ${match.listing.description}
    Industry: ${match.listing.industry}
    Price: $${(match.listing.price / 100).toLocaleString()}
    Match Score: ${(match.matchScore * 100).toFixed(1)}%

    Provide:
    1. Key value propositions (2-3 points)
    2. Potential concerns or risks (1-2 points)
    3. Strategic recommendations (1-2 points)

    Keep response concise and actionable.
  `;

  const response = await fetch('https://api.anthropic.com/v1/messages', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'x-api-key': claudeApiKey,
      'anthropic-version': '2023-06-01'
    },
    body: JSON.stringify({
      model: 'claude-3-haiku-20240307',
      max_tokens: 200,
      messages: [{
        role: 'user',
        content: prompt
      }]
    })
  });

  const data = await response.json();
  return data.content[0].text;
}

async function getExistingMatches(DB: any, userId: string) {
  return await DB.prepare(`
    SELECT m.*, l.title, l.description, l.price, l.industry, l.category,
           u.name as seller_name, p.company
    FROM ai_matches m
    JOIN listings l ON m.listing_id = l.id
    JOIN users u ON l.seller_id = u.id
    LEFT JOIN profiles p ON u.id = p.user_id
    WHERE m.user_id = ? AND m.interaction_status != 'dismissed'
    ORDER BY m.match_score DESC
    LIMIT 20
  `).bind(userId).all();
}

// GET endpoint to retrieve user's matches
export async function GET({ url, locals }: APIContext) {
  const { DB } = locals.runtime.env;
  const userId = url.searchParams.get('userId');

  if (!userId) {
    return new Response(JSON.stringify({ error: 'User ID required' }), {
      status: 400,
      headers: { 'Content-Type': 'application/json' }
    });
  }

  try {
    const matches = await getExistingMatches(DB, userId);

    return new Response(JSON.stringify({ matches }), {
      headers: { 'Content-Type': 'application/json' }
    });
  } catch (error) {
    return new Response(JSON.stringify({ error: 'Failed to retrieve matches' }), {
      status: 500,
      headers: { 'Content-Type': 'application/json' }
    });
  }
}