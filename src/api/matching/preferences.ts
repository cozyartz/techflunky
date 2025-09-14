// User Preferences Management for AI Matching
import type { APIContext } from 'astro';

// GET user preferences
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
    const preferences = await DB.prepare(`
      SELECT * FROM user_preferences WHERE user_id = ?
    `).bind(userId).first();

    if (!preferences) {
      // Return default preferences structure
      return new Response(JSON.stringify({
        userId,
        industries: [],
        budgetRangeMin: 100000, // $1,000
        budgetRangeMax: 1000000, // $10,000
        businessStages: ['concept'],
        investmentTypes: ['acquire'],
        communicationPreferences: {
          emailNotifications: true,
          smsNotifications: false,
          weeklyDigest: true
        },
        aiMatchingEnabled: true,
        isNew: true
      }), {
        headers: { 'Content-Type': 'application/json' }
      });
    }

    return new Response(JSON.stringify({
      userId: preferences.user_id,
      industries: JSON.parse(preferences.industries || '[]'),
      budgetRangeMin: preferences.budget_range_min,
      budgetRangeMax: preferences.budget_range_max,
      businessStages: JSON.parse(preferences.business_stages || '[]'),
      investmentTypes: JSON.parse(preferences.investment_types || '[]'),
      communicationPreferences: JSON.parse(preferences.communication_preferences || '{}'),
      aiMatchingEnabled: preferences.ai_matching_enabled,
      createdAt: preferences.created_at,
      updatedAt: preferences.updated_at
    }), {
      headers: { 'Content-Type': 'application/json' }
    });

  } catch (error) {
    return new Response(JSON.stringify({ error: 'Failed to retrieve preferences' }), {
      status: 500,
      headers: { 'Content-Type': 'application/json' }
    });
  }
}

// POST/PUT user preferences
export async function POST({ request, locals }: APIContext) {
  const { DB } = locals.runtime.env;

  try {
    const data = await request.json();
    const {
      userId,
      industries = [],
      budgetRangeMin = 100000,
      budgetRangeMax = 1000000,
      businessStages = ['concept'],
      investmentTypes = ['acquire'],
      communicationPreferences = {},
      aiMatchingEnabled = true
    } = data;

    if (!userId) {
      return new Response(JSON.stringify({ error: 'User ID required' }), {
        status: 400,
        headers: { 'Content-Type': 'application/json' }
      });
    }

    // Validate data
    if (budgetRangeMin >= budgetRangeMax) {
      return new Response(JSON.stringify({
        error: 'Budget minimum must be less than maximum'
      }), {
        status: 400,
        headers: { 'Content-Type': 'application/json' }
      });
    }

    const now = Math.floor(Date.now() / 1000);

    // Insert or update preferences
    await DB.prepare(`
      INSERT OR REPLACE INTO user_preferences
      (user_id, industries, budget_range_min, budget_range_max, business_stages,
       investment_types, communication_preferences, ai_matching_enabled,
       created_at, updated_at)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?,
              COALESCE((SELECT created_at FROM user_preferences WHERE user_id = ?), ?), ?)
    `).bind(
      userId,
      JSON.stringify(industries),
      budgetRangeMin,
      budgetRangeMax,
      JSON.stringify(businessStages),
      JSON.stringify(investmentTypes),
      JSON.stringify(communicationPreferences),
      aiMatchingEnabled,
      userId, // for the COALESCE subquery
      now, // default created_at
      now  // updated_at
    ).run();

    // Clear old matches to trigger refresh
    await DB.prepare(`
      DELETE FROM ai_matches WHERE user_id = ?
    `).bind(userId).run();

    return new Response(JSON.stringify({
      success: true,
      message: 'Preferences updated successfully',
      updatedAt: now
    }), {
      headers: { 'Content-Type': 'application/json' }
    });

  } catch (error) {
    console.error('Error updating preferences:', error);
    return new Response(JSON.stringify({ error: 'Failed to update preferences' }), {
      status: 500,
      headers: { 'Content-Type': 'application/json' }
    });
  }
}

// GET available options for preferences
export async function OPTIONS({ locals }: APIContext) {
  const { DB } = locals.runtime.env;

  try {
    // Get unique industries from listings
    const industries = await DB.prepare(`
      SELECT DISTINCT industry FROM listings
      WHERE status = 'active'
      ORDER BY industry
    `).all();

    // Get unique categories
    const categories = await DB.prepare(`
      SELECT DISTINCT category FROM listings
      WHERE status = 'active'
      ORDER BY category
    `).all();

    const options = {
      industries: industries.map(i => i.industry),
      categories: categories.map(c => c.category),
      businessStages: [
        { value: 'concept', label: 'Concept ($1K-$5K)', description: 'Early idea with basic validation' },
        { value: 'blueprint', label: 'Blueprint ($5K-$25K)', description: 'Detailed plan with market research' },
        { value: 'launch_ready', label: 'Launch-Ready ($25K-$100K)', description: 'Full package with MVP and validation' }
      ],
      investmentTypes: [
        { value: 'acquire', label: 'Acquire', description: 'Purchase the complete business idea' },
        { value: 'partner', label: 'Partner', description: 'Joint venture or partnership' },
        { value: 'license', label: 'License', description: 'License the idea for specific regions/markets' }
      ],
      budgetRanges: [
        { min: 100000, max: 500000, label: '$1K - $5K' },
        { min: 500000, max: 2500000, label: '$5K - $25K' },
        { min: 2500000, max: 10000000, label: '$25K - $100K' },
        { min: 10000000, max: 50000000, label: '$100K - $500K' },
        { min: 50000000, max: 100000000, label: '$500K+' }
      ]
    };

    return new Response(JSON.stringify(options), {
      headers: { 'Content-Type': 'application/json' }
    });

  } catch (error) {
    return new Response(JSON.stringify({ error: 'Failed to retrieve options' }), {
      status: 500,
      headers: { 'Content-Type': 'application/json' }
    });
  }
}