// Business Analytics & Admin Dashboard API
import type { APIContext } from 'astro';

export async function GET({ url, locals }: APIContext) {
  const { DB } = locals.runtime.env;
  
  try {
    // TODO: Verify admin access
    const period = url.searchParams.get('period') || '30'; // days
    const startDate = Math.floor(Date.now() / 1000) - (parseInt(period) * 24 * 60 * 60);

    // Revenue Analytics
    const revenueData = await DB.prepare(`
      SELECT 
        transaction_type,
        SUM(gross_amount) as total_gross,
        SUM(platform_fee) as total_fees,
        SUM(net_amount) as total_net,
        COUNT(*) as transaction_count
      FROM revenue_analytics 
      WHERE created_at >= ?
      GROUP BY transaction_type
    `).bind(startDate).all();

    // Daily revenue trends
    const dailyRevenue = await DB.prepare(`
      SELECT 
        DATE(datetime(created_at, 'unixepoch')) as date,
        SUM(platform_fee) as daily_revenue,
        COUNT(*) as daily_transactions
      FROM revenue_analytics 
      WHERE created_at >= ?
      GROUP BY date
      ORDER BY date ASC
    `).bind(startDate).all();

    // User growth metrics
    const userMetrics = await DB.prepare(`
      SELECT 
        COUNT(*) as total_users,
        SUM(CASE WHEN subscription_status != 'free' THEN 1 ELSE 0 END) as paying_users,
        SUM(CASE WHEN created_at >= ? THEN 1 ELSE 0 END) as new_users_period
      FROM users
    `).bind(startDate).first();

    // Listing metrics
    const listingMetrics = await DB.prepare(`
      SELECT 
        COUNT(*) as total_listings,
        SUM(CASE WHEN status = 'active' THEN 1 ELSE 0 END) as active_listings,
        SUM(CASE WHEN status = 'sold' THEN 1 ELSE 0 END) as sold_listings,
        SUM(CASE WHEN created_at >= ? THEN 1 ELSE 0 END) as new_listings_period,
        AVG(price) as avg_listing_price
      FROM listings
    `).bind(startDate).first();

    // Top categories by revenue
    const topCategories = await DB.prepare(`
      SELECT 
        l.category,
        COUNT(o.id) as sales_count,
        SUM(o.amount) as total_revenue
      FROM offers o
      JOIN listings l ON o.listing_id = l.id
      WHERE o.status = 'completed' AND o.created_at >= ?
      GROUP BY l.category
      ORDER BY total_revenue DESC
      LIMIT 10
    `).bind(startDate).all();

    // Top sellers
    const topSellers = await DB.prepare(`
      SELECT 
        u.name,
        u.email,
        COUNT(l.id) as listings_count,
        SUM(CASE WHEN l.status = 'sold' THEN 1 ELSE 0 END) as sales_count,
        SUM(CASE WHEN o.status = 'completed' THEN o.amount ELSE 0 END) as total_revenue
      FROM users u
      LEFT JOIN listings l ON u.id = l.seller_id
      LEFT JOIN offers o ON l.id = o.listing_id
      WHERE l.created_at >= ?
      GROUP BY u.id
      ORDER BY total_revenue DESC
      LIMIT 10
    `).bind(startDate).all();

    // Service request analytics
    const serviceMetrics = await DB.prepare(`
      SELECT 
        service_type,
        COUNT(*) as request_count,
        SUM(quote_amount) as total_quoted,
        SUM(CASE WHEN status = 'completed' THEN final_amount ELSE 0 END) as total_completed,
        AVG(CASE WHEN feedback_rating IS NOT NULL THEN feedback_rating END) as avg_rating
      FROM service_requests
      WHERE created_at >= ?
      GROUP BY service_type
    `).bind(startDate).all();

    // Course analytics
    const courseMetrics = await DB.prepare(`
      SELECT 
        COUNT(DISTINCT c.id) as total_courses,
        COUNT(ce.id) as total_enrollments,
        SUM(ce.progress_percentage) / COUNT(ce.id) as avg_completion_rate,
        SUM(c.revenue_total) as total_course_revenue
      FROM courses c
      LEFT JOIN course_enrollments ce ON c.id = ce.course_id
      WHERE c.created_at >= ?
    `).bind(startDate).first();

    return new Response(JSON.stringify({
      period: parseInt(period),
      revenue: {
        byType: revenueData.results,
        daily: dailyRevenue.results,
        total: revenueData.results.reduce((sum, item) => sum + item.total_fees, 0)
      },
      users: userMetrics,
      listings: listingMetrics,
      categories: topCategories.results,
      sellers: topSellers.results,
      services: serviceMetrics.results,
      courses: courseMetrics
    }));

  } catch (error) {
    console.error('Error fetching analytics:', error);
    return new Response(JSON.stringify({ 
      error: 'Failed to fetch analytics' 
    }), { status: 500 });
  }
}
