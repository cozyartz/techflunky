// Investor Portal - Deal Discovery and Management
import type { APIContext } from 'astro';

// Get personalized deal feed for investors
export async function GET({ url, locals }: APIContext) {
  const { DB, ANTHROPIC_API_KEY } = locals.runtime?.env || {};

  if (!DB) {
    return new Response(JSON.stringify({
      success: true,
      deals: [],
      total: 0,
      investor: null,
      note: 'Database not configured - showing demo data'
    }), {
      status: 200,
      headers: { 'Content-Type': 'application/json' }
    });
  }
  const investorId = url.searchParams.get('investorId');
  const filters = url.searchParams.get('filters'); // JSON string
  const limit = parseInt(url.searchParams.get('limit') || '20');
  const offset = parseInt(url.searchParams.get('offset') || '0');

  if (!investorId) {
    return new Response(JSON.stringify({ error: 'Investor ID required' }), {
      status: 400,
      headers: { 'Content-Type': 'application/json' }
    });
  }

  try {
    // Get investor preferences and history
    const investor = await DB.prepare(`
      SELECT ip.*, u.name, u.email
      FROM investor_profiles ip
      JOIN users u ON ip.user_id = u.id
      WHERE ip.user_id = ?
    `).bind(investorId).first();

    if (!investor) {
      return new Response(JSON.stringify({
        error: 'Investor profile not found'
      }), {
        status: 404,
        headers: { 'Content-Type': 'application/json' }
      });
    }

    const preferences = JSON.parse(investor.investment_preferences || '{}');
    const parsedFilters = filters ? JSON.parse(filters) : {};

    // Build dynamic query based on preferences and filters
    let whereClause = 'WHERE l.status = "active" AND l.seller_id IS NOT NULL';
    let params = [];

    // Apply investor preferences
    if (preferences.industries && preferences.industries.length > 0) {
      whereClause += ' AND l.category IN (' + preferences.industries.map(() => '?').join(',') + ')';
      params.push(...preferences.industries);
    }

    if (preferences.budgetMin || preferences.budgetMax) {
      if (preferences.budgetMin) {
        whereClause += ' AND l.price >= ?';
        params.push(preferences.budgetMin * 100); // Convert to cents
      }
      if (preferences.budgetMax) {
        whereClause += ' AND l.price <= ?';
        params.push(preferences.budgetMax * 100);
      }
    }

    if (preferences.businessStages && preferences.businessStages.length > 0) {
      whereClause += ' AND l.business_stage IN (' + preferences.businessStages.map(() => '?').join(',') + ')';
      params.push(...preferences.businessStages);
    }

    // Apply additional filters
    if (parsedFilters.category) {
      whereClause += ' AND l.category = ?';
      params.push(parsedFilters.category);
    }

    if (parsedFilters.hasContainer) {
      whereClause += ' AND l.has_container = 1';
    }

    if (parsedFilters.verified) {
      whereClause += ' AND EXISTS (SELECT 1 FROM identity_verifications iv WHERE iv.user_id = l.seller_id AND iv.status = "approved")';
    }

    // Get deals with AI scoring
    const deals = await DB.prepare(`
      SELECT
        l.*,
        u.name as seller_name,
        COALESCE(ur.overall_score, 0) as seller_reputation,
        COALESCE(ds.ai_score, 0) as ai_deal_score,
        COALESCE(ds.investment_potential, 0) as investment_potential,
        COALESCE(ds.risk_assessment, 'unknown') as risk_level,
        COALESCE(cc.deployment_url, null) as demo_url,
        COALESCE(iv.status, 'unverified') as verification_status
      FROM listings l
      JOIN users u ON l.seller_id = u.id
      LEFT JOIN user_reputation ur ON l.seller_id = ur.user_id
      LEFT JOIN deal_scores ds ON l.id = ds.listing_id
      LEFT JOIN code_containers cc ON l.id = cc.listing_id AND cc.status = 'ready'
      LEFT JOIN identity_verifications iv ON l.seller_id = iv.user_id
      ${whereClause}
      ORDER BY
        CASE WHEN ds.ai_score IS NOT NULL THEN ds.ai_score ELSE 0 END DESC,
        l.created_at DESC
      LIMIT ? OFFSET ?
    `).bind(...params, limit, offset).all();

    // Get investment history for context
    const investmentHistory = await DB.prepare(`
      SELECT
        ii.listing_id,
        ii.amount_invested,
        ii.investment_type,
        ii.created_at
      FROM investor_investments ii
      WHERE ii.investor_id = ?
      ORDER BY ii.created_at DESC
      LIMIT 10
    `).bind(investorId).all();

    // Generate AI insights if API key available
    let aiInsights = null;
    if (ANTHROPIC_API_KEY && deals.length > 0) {
      aiInsights = await generateDealInsights(deals, preferences, ANTHROPIC_API_KEY);
    }

    return new Response(JSON.stringify({
      deals: deals.map(deal => ({
        ...deal,
        price_formatted: `$${(deal.price / 100).toLocaleString()}`,
        ai_score_percentage: Math.round((deal.ai_deal_score || 0) * 100),
        risk_badge: getRiskBadge(deal.risk_level),
        investment_signals: generateInvestmentSignals(deal)
      })),
      pagination: {
        limit,
        offset,
        hasMore: deals.length === limit
      },
      investorProfile: {
        name: investor.name,
        investmentFocus: preferences.industries || [],
        totalInvestments: investmentHistory.length,
        portfolioValue: investmentHistory.reduce((sum, inv) => sum + (inv.amount_invested || 0), 0)
      },
      marketInsights: aiInsights,
      appliedFilters: parsedFilters
    }), {
      headers: { 'Content-Type': 'application/json' }
    });

  } catch (error) {
    console.error('Error getting investor deal feed:', error);
    return new Response(JSON.stringify({ error: 'Failed to retrieve deal feed' }), {
      status: 500,
      headers: { 'Content-Type': 'application/json' }
    });
  }
}

// Record investor interest in a deal
export async function POST({ request, locals }: APIContext) {
  const { DB } = locals.runtime.env;

  try {
    const {
      investorId,
      listingId,
      interestLevel, // interested, very_interested, want_meeting
      notes,
      investmentAmount,
      investmentType = 'acquire' // acquire, partner, license
    } = await request.json();

    if (!investorId || !listingId || !interestLevel) {
      return new Response(JSON.stringify({
        error: 'Investor ID, listing ID, and interest level required'
      }), {
        status: 400,
        headers: { 'Content-Type': 'application/json' }
      });
    }

    const now = Math.floor(Date.now() / 1000);
    const interestId = generateInterestId();

    // Record investor interest
    await DB.prepare(`
      INSERT OR REPLACE INTO investor_interests
      (id, investor_id, listing_id, interest_level, notes, investment_amount, investment_type, created_at, updated_at)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
    `).bind(
      interestId,
      investorId,
      listingId,
      interestLevel,
      notes || null,
      investmentAmount || null,
      investmentType,
      now,
      now
    ).run();

    // Update deal analytics
    await DB.prepare(`
      INSERT INTO deal_interactions (id, listing_id, user_id, interaction_type, created_at)
      VALUES (?, ?, ?, 'investor_interest', ?)
    `).bind(generateId(), listingId, investorId, now).run();

    // Notify seller if high interest
    if (interestLevel === 'very_interested' || interestLevel === 'want_meeting') {
      await createInvestorNotification(listingId, investorId, interestLevel, DB);
    }

    return new Response(JSON.stringify({
      success: true,
      interestId,
      message: 'Interest recorded successfully'
    }), {
      headers: { 'Content-Type': 'application/json' }
    });

  } catch (error) {
    console.error('Error recording investor interest:', error);
    return new Response(JSON.stringify({ error: 'Failed to record interest' }), {
      status: 500,
      headers: { 'Content-Type': 'application/json' }
    });
  }
}

async function generateDealInsights(deals: any[], preferences: any, apiKey: string) {
  try {
    const dealSummary = deals.slice(0, 5).map(deal => ({
      category: deal.category,
      price: deal.price / 100,
      businessStage: deal.business_stage,
      sellerReputation: deal.seller_reputation
    }));

    const prompt = `As an AI investment advisor, analyze these business opportunities for an angel investor:

Investor Profile:
- Focus Industries: ${preferences.industries?.join(', ') || 'All'}
- Budget Range: $${preferences.budgetMin || 0}k - $${preferences.budgetMax || 1000}k
- Preferred Stages: ${preferences.businessStages?.join(', ') || 'All stages'}

Top Deals Available:
${dealSummary.map((deal, i) => `${i + 1}. ${deal.category} business - $${deal.price}k - Stage: ${deal.businessStage}`).join('\n')}

Provide:
1. Market trends analysis (2-3 sentences)
2. Investment opportunities summary (2-3 sentences)
3. Risk factors to consider (2-3 sentences)

Keep response concise and actionable.`;

    const response = await fetch('https://api.anthropic.com/v1/messages', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'x-api-key': apiKey,
        'anthropic-version': '2023-06-01'
      },
      body: JSON.stringify({
        model: 'claude-3-haiku-20240307',
        max_tokens: 300,
        messages: [{ role: 'user', content: prompt }]
      })
    });

    if (response.ok) {
      const data = await response.json();
      return data.content[0].text;
    }
  } catch (error) {
    console.warn('AI insights generation failed:', error);
  }

  return null;
}

function getRiskBadge(riskLevel: string) {
  const badges = {
    'low': { color: 'green', text: 'Low Risk' },
    'medium': { color: 'yellow', text: 'Medium Risk' },
    'high': { color: 'red', text: 'High Risk' },
    'unknown': { color: 'gray', text: 'Unassessed' }
  };
  return badges[riskLevel] || badges.unknown;
}

function generateInvestmentSignals(deal: any) {
  const signals = [];

  if (deal.verification_status === 'approved') {
    signals.push({ type: 'positive', text: 'Verified Seller' });
  }

  if (deal.seller_reputation > 80) {
    signals.push({ type: 'positive', text: 'High Reputation' });
  }

  if (deal.demo_url) {
    signals.push({ type: 'positive', text: 'Live Demo Available' });
  }

  if (deal.ai_deal_score > 0.8) {
    signals.push({ type: 'positive', text: 'AI Recommended' });
  }

  if (deal.created_at > Date.now() / 1000 - 7 * 24 * 60 * 60) {
    signals.push({ type: 'neutral', text: 'New Listing' });
  }

  return signals;
}

async function createInvestorNotification(listingId: string, investorId: string, interestLevel: string, DB: any) {
  // Get listing and seller info
  const listing = await DB.prepare(`
    SELECT l.title, l.seller_id, u.name as seller_name
    FROM listings l
    JOIN users u ON l.seller_id = u.id
    WHERE l.id = ?
  `).bind(listingId).first();

  if (!listing) return;

  const investor = await DB.prepare(`
    SELECT u.name FROM users u WHERE u.id = ?
  `).bind(investorId).first();

  const message = interestLevel === 'want_meeting'
    ? `${investor?.name || 'An investor'} wants to schedule a meeting about "${listing.title}"`
    : `${investor?.name || 'An investor'} expressed strong interest in "${listing.title}"`;

  await DB.prepare(`
    INSERT INTO notifications (id, user_id, type, title, message, data, created_at)
    VALUES (?, ?, 'investor_interest', 'Investor Interest', ?, ?, ?)
  `).bind(
    generateId(),
    listing.seller_id,
    message,
    JSON.stringify({ listingId, investorId, interestLevel }),
    Math.floor(Date.now() / 1000)
  ).run();
}

function generateInterestId(): string {
  const prefix = 'int_';
  const randomBytes = crypto.getRandomValues(new Uint8Array(8));
  const id = Array.from(randomBytes)
    .map(b => b.toString(16).padStart(2, '0'))
    .join('');
  return prefix + id;
}

function generateId(): string {
  const randomBytes = crypto.getRandomValues(new Uint8Array(16));
  return Array.from(randomBytes)
    .map(b => b.toString(16).padStart(2, '0'))
    .join('');
}