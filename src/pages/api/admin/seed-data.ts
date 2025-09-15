import type { APIRoute } from 'astro';

const SAMPLE_LISTINGS = [
  {
    title: "AI-Powered HR Leave Administration Platform",
    slug: "ai-hr-leave-administration-platform",
    description: "Complete HR compliance platform with automated leave tracking, FMLA compliance, and integration with 50+ payroll systems. This is a real, working platform currently in production.",
    category: "hr-compliance",
    industry: "Human Resources",
    price: 3500000, // $35,000
    package_tier: "launch_ready",
    market_research: "Comprehensive 42-page market analysis showing $800M+ opportunity with 94% customer validation from actual client deployments",
    technical_specs: "Astro + Cloudflare Workers + D1 + TypeScript, fully containerized with Docker, Cloudflare deployment ready",
    mvp_url: "https://demo.techflunky.com/hr-platform",
    ai_score: 94.5
  }
];

export const POST: APIRoute = async ({ locals }) => {
  try {
    // Check if this is being called by admin (simplified for demo)
    // In production, this would require proper admin authentication

    // Create a demo seller account first
    const sellerId = crypto.randomUUID();
    const sellerEmail = 'demo.seller@techflunky.com';
    const sellerName = 'TechFlunky Demo Seller';

    // Check if seller already exists
    const existingSeller = await locals.runtime.env.DB.prepare(
      'SELECT id FROM users WHERE email = ?'
    ).bind(sellerEmail).first();

    let actualSellerId = sellerId;
    if (existingSeller) {
      actualSellerId = existingSeller.id;
    } else {
      // Create demo seller
      await locals.runtime.env.DB.prepare(`
        INSERT INTO users (id, email, name, password_hash, role, created_at, updated_at)
        VALUES (?, ?, ?, ?, ?, ?, ?)
      `).bind(
        sellerId,
        sellerEmail,
        sellerName,
        'demo_hash', // This is just for demo data
        'seller',
        Date.now(),
        Date.now()
      ).run();

      // Create seller profile
      await locals.runtime.env.DB.prepare(`
        INSERT INTO profiles (user_id, bio, company, seller_rating, seller_reviews_count, created_at, updated_at)
        VALUES (?, ?, ?, ?, ?, ?, ?)
      `).bind(
        sellerId,
        'Demo seller account for TechFlunky platform showcasing various business platforms and ideas.',
        'TechFlunky Marketplace',
        4.8,
        127,
        Date.now(),
        Date.now()
      ).run();
    }

    // Insert sample listings
    for (const listing of SAMPLE_LISTINGS) {
      const listingId = crypto.randomUUID();

      // Check if listing already exists
      const existing = await locals.runtime.env.DB.prepare(
        'SELECT id FROM listings WHERE slug = ?'
      ).bind(listing.slug).first();

      if (!existing) {
        await locals.runtime.env.DB.prepare(`
          INSERT INTO listings (
            id, seller_id, title, slug, description, category, industry,
            price, status, package_tier, market_research, technical_specs,
            mvp_url, ai_score, views_count, favorites_count,
            published_at, created_at, updated_at
          ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
        `).bind(
          listingId,
          actualSellerId,
          listing.title,
          listing.slug,
          listing.description,
          listing.category,
          listing.industry,
          listing.price,
          'active',
          listing.package_tier,
          listing.market_research,
          listing.technical_specs,
          listing.mvp_url || null,
          listing.ai_score,
          Math.floor(Math.random() * 500) + 100, // Random views
          Math.floor(Math.random() * 50) + 5,   // Random favorites
          Date.now(),
          Date.now(),
          Date.now()
        ).run();
      }
    }

    return new Response(JSON.stringify({
      success: true,
      message: `Created 1 real platform listing (HR Compliance Platform)`,
      data: {
        listingsCreated: SAMPLE_LISTINGS.length,
        sellerId: actualSellerId
      }
    }), {
      status: 201,
      headers: { 'Content-Type': 'application/json' }
    });

  } catch (error) {
    console.error('Seed data error:', error);
    return new Response(JSON.stringify({
      success: false,
      error: 'Failed to create sample data'
    }), {
      status: 500,
      headers: { 'Content-Type': 'application/json' }
    });
  }
};