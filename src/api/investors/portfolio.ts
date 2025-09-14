// Investor Portfolio Analytics and Tracking
import type { APIContext } from 'astro';

// Get comprehensive portfolio analytics
export async function GET({ url, locals }: APIContext) {
  const { DB } = locals.runtime.env;
  const investorId = url.searchParams.get('investorId');
  const timeframe = url.searchParams.get('timeframe') || '12'; // months
  const view = url.searchParams.get('view') || 'overview'; // overview, performance, deals

  if (!investorId) {
    return new Response(JSON.stringify({ error: 'Investor ID required' }), {
      status: 400,
      headers: { 'Content-Type': 'application/json' }
    });
  }

  try {
    const cutoffTime = Math.floor(Date.now() / 1000) - (parseInt(timeframe) * 30 * 24 * 60 * 60);

    if (view === 'overview') {
      return await getPortfolioOverview(investorId, cutoffTime, DB);
    } else if (view === 'performance') {
      return await getPortfolioPerformance(investorId, cutoffTime, DB);
    } else if (view === 'deals') {
      return await getInvestmentDeals(investorId, cutoffTime, DB);
    }

    return new Response(JSON.stringify({ error: 'Invalid view parameter' }), {
      status: 400,
      headers: { 'Content-Type': 'application/json' }
    });

  } catch (error) {
    console.error('Error getting portfolio analytics:', error);
    return new Response(JSON.stringify({ error: 'Failed to retrieve portfolio analytics' }), {
      status: 500,
      headers: { 'Content-Type': 'application/json' }
    });
  }
}

// Record new investment
export async function POST({ request, locals }: APIContext) {
  const { DB } = locals.runtime.env;

  try {
    const {
      investorId,
      listingId,
      investmentAmount,
      investmentType, // acquire, partner, license, equity
      terms,
      notes,
      syndicateId
    } = await request.json();

    if (!investorId || !listingId || !investmentAmount || !investmentType) {
      return new Response(JSON.stringify({
        error: 'Investor ID, listing ID, amount, and type required'
      }), {
        status: 400,
        headers: { 'Content-Type': 'application/json' }
      });
    }

    // Verify listing exists
    const listing = await DB.prepare(`
      SELECT * FROM listings WHERE id = ?
    `).bind(listingId).first();

    if (!listing) {
      return new Response(JSON.stringify({
        error: 'Listing not found'
      }), {
        status: 404,
        headers: { 'Content-Type': 'application/json' }
      });
    }

    const now = Math.floor(Date.now() / 1000);
    const investmentId = generateInvestmentId();

    // Record investment
    await DB.prepare(`
      INSERT INTO investor_investments
      (id, investor_id, listing_id, amount_invested, investment_type, terms, notes,
       syndicate_id, status, investment_date, created_at)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, 'active', ?, ?)
    `).bind(
      investmentId,
      investorId,
      listingId,
      investmentAmount * 100, // Convert to cents
      investmentType,
      terms ? JSON.stringify(terms) : null,
      notes,
      syndicateId,
      now,
      now
    ).run();

    // Update listing if acquired
    if (investmentType === 'acquire' && investmentAmount >= listing.price / 100) {
      await DB.prepare(`
        UPDATE listings SET
          status = 'sold',
          buyer_id = ?,
          sold_at = ?
        WHERE id = ?
      `).bind(investorId, now, listingId).run();
    }

    // Create portfolio tracking entry
    await createPortfolioEntry(investmentId, investorId, listingId, investmentAmount, investmentType, DB);

    return new Response(JSON.stringify({
      success: true,
      investmentId,
      message: 'Investment recorded successfully'
    }), {
      headers: { 'Content-Type': 'application/json' }
    });

  } catch (error) {
    console.error('Error recording investment:', error);
    return new Response(JSON.stringify({ error: 'Failed to record investment' }), {
      status: 500,
      headers: { 'Content-Type': 'application/json' }
    });
  }
}

// Update investment status or add performance data
export async function PUT({ request, locals }: APIContext) {
  const { DB } = locals.runtime.env;

  try {
    const {
      investmentId,
      investorId,
      status, // active, successful_exit, failed, partial_return
      currentValue,
      exitValue,
      exitDate,
      performanceNotes,
      updateType = 'status' // status, valuation, exit
    } = await request.json();

    if (!investmentId || !investorId) {
      return new Response(JSON.stringify({
        error: 'Investment ID and investor ID required'
      }), {
        status: 400,
        headers: { 'Content-Type': 'application/json' }
      });
    }

    // Verify investment ownership
    const investment = await DB.prepare(`
      SELECT * FROM investor_investments WHERE id = ? AND investor_id = ?
    `).bind(investmentId, investorId).first();

    if (!investment) {
      return new Response(JSON.stringify({
        error: 'Investment not found or access denied'
      }), {
        status: 404,
        headers: { 'Content-Type': 'application/json' }
      });
    }

    const now = Math.floor(Date.now() / 1000);

    if (updateType === 'status' && status) {
      await DB.prepare(`
        UPDATE investor_investments SET
          status = ?,
          updated_at = ?
        WHERE id = ? AND investor_id = ?
      `).bind(status, now, investmentId, investorId).run();

    } else if (updateType === 'valuation' && currentValue !== undefined) {
      await DB.prepare(`
        UPDATE investor_investments SET
          current_value = ?,
          updated_at = ?
        WHERE id = ? AND investor_id = ?
      `).bind(currentValue * 100, now, investmentId, investorId).run();

      // Record valuation history
      await DB.prepare(`
        INSERT INTO investment_valuations
        (id, investment_id, valuation_amount, valuation_date, notes, created_at)
        VALUES (?, ?, ?, ?, ?, ?)
      `).bind(
        generateValuationId(),
        investmentId,
        currentValue * 100,
        now,
        performanceNotes || null,
        now
      ).run();

    } else if (updateType === 'exit' && exitValue !== undefined) {
      await DB.prepare(`
        UPDATE investor_investments SET
          status = 'successful_exit',
          exit_value = ?,
          exit_date = ?,
          updated_at = ?
        WHERE id = ? AND investor_id = ?
      `).bind(
        exitValue * 100,
        exitDate || now,
        now,
        investmentId,
        investorId
      ).run();
    }

    return new Response(JSON.stringify({
      success: true,
      message: 'Investment updated successfully'
    }), {
      headers: { 'Content-Type': 'application/json' }
    });

  } catch (error) {
    console.error('Error updating investment:', error);
    return new Response(JSON.stringify({ error: 'Failed to update investment' }), {
      status: 500,
      headers: { 'Content-Type': 'application/json' }
    });
  }
}

async function getPortfolioOverview(investorId: string, cutoffTime: number, DB: any) {
  // Get basic portfolio metrics
  const [portfolioMetrics, categoryBreakdown, stageBreakdown, performanceMetrics] = await Promise.all([
    DB.prepare(`
      SELECT
        COUNT(*) as total_investments,
        SUM(amount_invested) as total_invested,
        SUM(COALESCE(current_value, amount_invested)) as current_portfolio_value,
        SUM(CASE WHEN status = 'successful_exit' THEN exit_value ELSE 0 END) as total_exits,
        COUNT(CASE WHEN status = 'successful_exit' THEN 1 END) as successful_exits,
        COUNT(CASE WHEN status = 'failed' THEN 1 END) as failed_investments,
        AVG(amount_invested) as avg_investment_size
      FROM investor_investments
      WHERE investor_id = ? AND created_at > ?
    `).bind(investorId, cutoffTime).first(),

    DB.prepare(`
      SELECT
        l.category,
        COUNT(*) as investment_count,
        SUM(ii.amount_invested) as total_amount,
        AVG(ii.amount_invested) as avg_amount
      FROM investor_investments ii
      JOIN listings l ON ii.listing_id = l.id
      WHERE ii.investor_id = ? AND ii.created_at > ?
      GROUP BY l.category
      ORDER BY total_amount DESC
    `).bind(investorId, cutoffTime).all(),

    DB.prepare(`
      SELECT
        l.business_stage,
        COUNT(*) as investment_count,
        SUM(ii.amount_invested) as total_amount
      FROM investor_investments ii
      JOIN listings l ON ii.listing_id = l.id
      WHERE ii.investor_id = ? AND ii.created_at > ?
      GROUP BY l.business_stage
      ORDER BY total_amount DESC
    `).bind(investorId, cutoffTime).all(),

    calculatePerformanceMetrics(investorId, cutoffTime, DB)
  ]);

  // Recent activity
  const recentActivity = await DB.prepare(`
    SELECT
      ii.*,
      l.title as investment_title,
      l.category,
      u.name as seller_name
    FROM investor_investments ii
    JOIN listings l ON ii.listing_id = l.id
    JOIN users u ON l.seller_id = u.id
    WHERE ii.investor_id = ?
    ORDER BY ii.created_at DESC
    LIMIT 5
  `).bind(investorId).all();

  return new Response(JSON.stringify({
    portfolio: {
      metrics: {
        ...portfolioMetrics,
        total_invested_formatted: `$${(portfolioMetrics.total_invested / 100).toLocaleString()}`,
        current_value_formatted: `$${(portfolioMetrics.current_portfolio_value / 100).toLocaleString()}`,
        roi_percentage: portfolioMetrics.total_invested > 0
          ? Math.round(((portfolioMetrics.current_portfolio_value - portfolioMetrics.total_invested) / portfolioMetrics.total_invested) * 100)
          : 0,
        success_rate: portfolioMetrics.total_investments > 0
          ? Math.round((portfolioMetrics.successful_exits / portfolioMetrics.total_investments) * 100)
          : 0
      },
      breakdown: {
        byCategory: categoryBreakdown.map(cat => ({
          ...cat,
          total_amount_formatted: `$${(cat.total_amount / 100).toLocaleString()}`,
          percentage: portfolioMetrics.total_invested > 0
            ? Math.round((cat.total_amount / portfolioMetrics.total_invested) * 100)
            : 0
        })),
        byStage: stageBreakdown.map(stage => ({
          ...stage,
          total_amount_formatted: `$${(stage.total_amount / 100).toLocaleString()}`,
          percentage: portfolioMetrics.total_invested > 0
            ? Math.round((stage.total_amount / portfolioMetrics.total_invested) * 100)
            : 0
        }))
      },
      performance: performanceMetrics,
      recentActivity: recentActivity.map(activity => ({
        ...activity,
        amount_invested_formatted: `$${(activity.amount_invested / 100).toLocaleString()}`,
        investment_date_formatted: new Date(activity.investment_date * 1000).toLocaleDateString()
      }))
    }
  }), {
    headers: { 'Content-Type': 'application/json' }
  });
}

async function getPortfolioPerformance(investorId: string, cutoffTime: number, DB: any) {
  // Performance over time
  const performanceHistory = await DB.prepare(`
    SELECT
      strftime('%Y-%m', datetime(ii.investment_date, 'unixepoch')) as month,
      SUM(ii.amount_invested) as invested_amount,
      SUM(COALESCE(ii.current_value, ii.amount_invested)) as current_value,
      COUNT(*) as investment_count
    FROM investor_investments ii
    WHERE ii.investor_id = ? AND ii.investment_date > ?
    GROUP BY month
    ORDER BY month ASC
  `).bind(investorId, cutoffTime).all();

  // Individual investment performance
  const investments = await DB.prepare(`
    SELECT
      ii.*,
      l.title,
      l.category,
      l.business_stage,
      u.name as seller_name,
      CASE
        WHEN ii.status = 'successful_exit' THEN ((ii.exit_value - ii.amount_invested) / ii.amount_invested) * 100
        ELSE ((COALESCE(ii.current_value, ii.amount_invested) - ii.amount_invested) / ii.amount_invested) * 100
      END as roi_percentage
    FROM investor_investments ii
    JOIN listings l ON ii.listing_id = l.id
    JOIN users u ON l.seller_id = u.id
    WHERE ii.investor_id = ? AND ii.investment_date > ?
    ORDER BY roi_percentage DESC
  `).bind(investorId, cutoffTime).all();

  return new Response(JSON.stringify({
    performance: {
      history: performanceHistory.map(period => ({
        ...period,
        invested_amount_formatted: `$${(period.invested_amount / 100).toLocaleString()}`,
        current_value_formatted: `$${(period.current_value / 100).toLocaleString()}`,
        roi_percentage: period.invested_amount > 0
          ? Math.round(((period.current_value - period.invested_amount) / period.invested_amount) * 100)
          : 0
      })),
      investments: investments.map(investment => ({
        ...investment,
        amount_invested_formatted: `$${(investment.amount_invested / 100).toLocaleString()}`,
        current_value_formatted: investment.current_value
          ? `$${(investment.current_value / 100).toLocaleString()}`
          : null,
        exit_value_formatted: investment.exit_value
          ? `$${(investment.exit_value / 100).toLocaleString()}`
          : null,
        roi_percentage: Math.round(investment.roi_percentage),
        performance_badge: getPerformanceBadge(investment.roi_percentage)
      }))
    }
  }), {
    headers: { 'Content-Type': 'application/json' }
  });
}

async function getInvestmentDeals(investorId: string, cutoffTime: number, DB: any) {
  const deals = await DB.prepare(`
    SELECT
      ii.*,
      l.title,
      l.description,
      l.category,
      l.business_stage,
      l.price as listing_price,
      u.name as seller_name,
      COALESCE(ur.overall_score, 0) as seller_reputation,
      COALESCE(ds.ai_score, 0) as deal_score,
      COALESCE(iv.status, 'unverified') as seller_verification
    FROM investor_investments ii
    JOIN listings l ON ii.listing_id = l.id
    JOIN users u ON l.seller_id = u.id
    LEFT JOIN user_reputation ur ON l.seller_id = ur.user_id
    LEFT JOIN deal_scores ds ON l.id = ds.listing_id
    LEFT JOIN identity_verifications iv ON l.seller_id = iv.user_id
    WHERE ii.investor_id = ? AND ii.investment_date > ?
    ORDER BY ii.investment_date DESC
  `).bind(investorId, cutoffTime).all();

  return new Response(JSON.stringify({
    deals: deals.map(deal => ({
      ...deal,
      amount_invested_formatted: `$${(deal.amount_invested / 100).toLocaleString()}`,
      listing_price_formatted: `$${(deal.listing_price / 100).toLocaleString()}`,
      investment_date_formatted: new Date(deal.investment_date * 1000).toLocaleDateString(),
      deal_score_percentage: Math.round((deal.deal_score || 0) * 100),
      status_badge: getStatusBadge(deal.status),
      terms: deal.terms ? JSON.parse(deal.terms) : null
    }))
  }), {
    headers: { 'Content-Type': 'application/json' }
  });
}

async function calculatePerformanceMetrics(investorId: string, cutoffTime: number, DB: any) {
  const metrics = await DB.prepare(`
    SELECT
      SUM(amount_invested) as total_invested,
      SUM(COALESCE(current_value, amount_invested)) as current_value,
      SUM(CASE WHEN status = 'successful_exit' THEN exit_value ELSE 0 END) as realized_returns,
      COUNT(CASE WHEN status = 'successful_exit' THEN 1 END) as exits,
      COUNT(*) as total_investments,
      AVG(CASE
        WHEN status = 'successful_exit' THEN ((exit_value - amount_invested) / amount_invested) * 100
        ELSE ((COALESCE(current_value, amount_invested) - amount_invested) / amount_invested) * 100
      END) as avg_roi
    FROM investor_investments
    WHERE investor_id = ? AND investment_date > ?
  `).bind(investorId, cutoffTime).first();

  return {
    totalInvested: metrics.total_invested / 100,
    currentValue: metrics.current_value / 100,
    realizedReturns: metrics.realized_returns / 100,
    unrealizedGains: (metrics.current_value - metrics.total_invested - metrics.realized_returns) / 100,
    totalReturn: metrics.total_invested > 0
      ? Math.round(((metrics.current_value + metrics.realized_returns - metrics.total_invested) / metrics.total_invested) * 100)
      : 0,
    avgROI: Math.round(metrics.avg_roi || 0),
    exitRate: metrics.total_investments > 0 ? Math.round((metrics.exits / metrics.total_investments) * 100) : 0
  };
}

async function createPortfolioEntry(investmentId: string, investorId: string, listingId: string, amount: number, type: string, DB: any) {
  const portfolioId = generatePortfolioId();
  const now = Math.floor(Date.now() / 1000);

  await DB.prepare(`
    INSERT INTO portfolio_tracking
    (id, investor_id, investment_id, listing_id, initial_amount, investment_type, status, created_at)
    VALUES (?, ?, ?, ?, ?, ?, 'active', ?)
  `).bind(
    portfolioId,
    investorId,
    investmentId,
    listingId,
    amount * 100,
    type,
    now
  ).run();
}

function getPerformanceBadge(roiPercentage: number) {
  if (roiPercentage >= 100) return { color: 'green', text: 'Excellent', icon: '🚀' };
  if (roiPercentage >= 50) return { color: 'light-green', text: 'Great', icon: '📈' };
  if (roiPercentage >= 20) return { color: 'blue', text: 'Good', icon: '👍' };
  if (roiPercentage >= 0) return { color: 'gray', text: 'Break Even', icon: '➡️' };
  if (roiPercentage >= -20) return { color: 'orange', text: 'Poor', icon: '👎' };
  return { color: 'red', text: 'Loss', icon: '📉' };
}

function getStatusBadge(status: string) {
  const badges = {
    'active': { color: 'blue', text: 'Active' },
    'successful_exit': { color: 'green', text: 'Successful Exit' },
    'failed': { color: 'red', text: 'Failed' },
    'partial_return': { color: 'orange', text: 'Partial Return' }
  };
  return badges[status] || badges.active;
}

function generateInvestmentId(): string {
  const prefix = 'inv_';
  const randomBytes = crypto.getRandomValues(new Uint8Array(8));
  const id = Array.from(randomBytes)
    .map(b => b.toString(16).padStart(2, '0'))
    .join('');
  return prefix + id;
}

function generateValuationId(): string {
  const prefix = 'val_';
  const randomBytes = crypto.getRandomValues(new Uint8Array(8));
  const id = Array.from(randomBytes)
    .map(b => b.toString(16).padStart(2, '0'))
    .join('');
  return prefix + id;
}

function generatePortfolioId(): string {
  const prefix = 'port_';
  const randomBytes = crypto.getRandomValues(new Uint8Array(8));
  const id = Array.from(randomBytes)
    .map(b => b.toString(16).padStart(2, '0'))
    .join('');
  return prefix + id;
}