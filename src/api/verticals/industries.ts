// Industry-Specific Verticals Management
import type { APIContext } from 'astro';

const DEFAULT_VERTICALS = [
  {
    name: 'HealthTech & MedTech',
    slug: 'healthtech',
    description: 'Medical devices, digital health solutions, telehealth platforms, and healthcare software',
    iconUrl: '/icons/health.svg',
    bannerUrl: '/banners/healthtech.jpg',
    expertRequirements: {
      certifications: ['Healthcare', 'Medical', 'FDA Regulatory'],
      experience: 'Minimum 3 years in healthcare industry',
      compliance: ['HIPAA', 'FDA', 'Clinical Trials']
    },
    specializedFields: [
      'Medical Devices',
      'Telemedicine',
      'Health Analytics',
      'Digital Therapeutics',
      'Healthcare AI',
      'Clinical Software'
    ],
    complianceRequirements: [
      'HIPAA Compliance',
      'FDA Regulations',
      'Clinical Trial Standards',
      'Medical Data Privacy',
      'Healthcare Cybersecurity'
    ]
  },
  {
    name: 'FinTech & Financial Services',
    slug: 'fintech',
    description: 'Digital banking, payment solutions, cryptocurrency, investment platforms, and financial software',
    iconUrl: '/icons/finance.svg',
    bannerUrl: '/banners/fintech.jpg',
    expertRequirements: {
      certifications: ['Financial Services', 'Securities', 'Banking'],
      experience: 'Minimum 3 years in financial services',
      compliance: ['SEC', 'FINRA', 'PCI DSS', 'AML/KYC']
    },
    specializedFields: [
      'Digital Banking',
      'Payment Processing',
      'Cryptocurrency',
      'Robo-Advisors',
      'InsurTech',
      'RegTech',
      'Blockchain'
    ],
    complianceRequirements: [
      'SEC Regulations',
      'FINRA Compliance',
      'PCI DSS Standards',
      'AML/KYC Requirements',
      'Data Protection (PII)',
      'Consumer Financial Protection'
    ]
  },
  {
    name: 'SaaS & Enterprise Software',
    slug: 'saas',
    description: 'B2B software solutions, enterprise platforms, productivity tools, and cloud services',
    iconUrl: '/icons/software.svg',
    bannerUrl: '/banners/saas.jpg',
    expertRequirements: {
      certifications: ['Software Architecture', 'Cloud Computing', 'Enterprise Sales'],
      experience: 'Minimum 2 years in SaaS development or sales',
      compliance: ['SOC 2', 'GDPR', 'Enterprise Security']
    },
    specializedFields: [
      'CRM Systems',
      'Project Management',
      'HR Software',
      'Marketing Automation',
      'Analytics Platforms',
      'DevOps Tools',
      'API Management'
    ],
    complianceRequirements: [
      'SOC 2 Type II',
      'GDPR Compliance',
      'Enterprise Security Standards',
      'Data Residency Requirements',
      'API Security Standards'
    ]
  },
  {
    name: 'E-commerce & Retail Tech',
    slug: 'ecommerce',
    description: 'Online retail platforms, marketplace solutions, retail analytics, and consumer applications',
    iconUrl: '/icons/ecommerce.svg',
    bannerUrl: '/banners/ecommerce.jpg',
    expertRequirements: {
      certifications: ['E-commerce', 'Digital Marketing', 'Retail Management'],
      experience: 'Minimum 2 years in e-commerce or retail',
      compliance: ['Consumer Protection', 'Tax Compliance', 'Payment Security']
    },
    specializedFields: [
      'Marketplace Platforms',
      'Inventory Management',
      'Customer Analytics',
      'Mobile Commerce',
      'Social Commerce',
      'Subscription Commerce',
      'Fulfillment Tech'
    ],
    complianceRequirements: [
      'Consumer Protection Laws',
      'Sales Tax Compliance',
      'Payment Card Security',
      'Return/Refund Policies',
      'Accessibility Standards'
    ]
  },
  {
    name: 'EdTech & Training',
    slug: 'edtech',
    description: 'Educational technology, online learning platforms, corporate training, and skill development',
    iconUrl: '/icons/education.svg',
    bannerUrl: '/banners/edtech.jpg',
    expertRequirements: {
      certifications: ['Education Technology', 'Instructional Design', 'Corporate Training'],
      experience: 'Minimum 2 years in education or training',
      compliance: ['FERPA', 'COPPA', 'Educational Privacy']
    },
    specializedFields: [
      'Learning Management Systems',
      'Corporate Training',
      'Skill Assessment',
      'Virtual Classrooms',
      'Educational Games',
      'Certification Platforms'
    ],
    complianceRequirements: [
      'FERPA Compliance',
      'COPPA Requirements',
      'Student Data Privacy',
      'Accessibility (Section 508)',
      'Educational Content Standards'
    ]
  },
  {
    name: 'PropTech & Real Estate',
    slug: 'proptech',
    description: 'Real estate technology, property management, construction tech, and smart building solutions',
    iconUrl: '/icons/property.svg',
    bannerUrl: '/banners/proptech.jpg',
    expertRequirements: {
      certifications: ['Real Estate', 'Property Management', 'Construction'],
      experience: 'Minimum 2 years in real estate or construction',
      compliance: ['Real Estate Regulations', 'Building Codes', 'Fair Housing']
    },
    specializedFields: [
      'Property Management',
      'Real Estate Marketplaces',
      'Construction Management',
      'Smart Buildings',
      'Rental Platforms',
      'Property Analytics'
    ],
    complianceRequirements: [
      'Real Estate License Requirements',
      'Fair Housing Compliance',
      'Local Building Codes',
      'Tenant Rights Laws',
      'Property Disclosure Requirements'
    ]
  }
];

// Get all industry verticals
export async function GET({ locals }: APIContext) {
  const { DB } = locals.runtime.env;

  try {
    // Initialize default verticals if not exists
    await initializeVerticals(DB);

    const verticals = await DB.prepare(`
      SELECT * FROM industry_verticals WHERE is_active = 1 ORDER BY name
    `).all();

    // Get expert count for each vertical
    const verticalsWithStats = await Promise.all(
      verticals.map(async (vertical) => {
        const stats = await getVerticalStats(DB, vertical.id);
        return {
          ...vertical,
          expertRequirements: JSON.parse(vertical.expert_requirements || '{}'),
          specializedFields: JSON.parse(vertical.specialized_fields || '[]'),
          complianceRequirements: JSON.parse(vertical.compliance_requirements || '[]'),
          ...stats
        };
      })
    );

    return new Response(JSON.stringify({
      verticals: verticalsWithStats
    }), {
      headers: { 'Content-Type': 'application/json' }
    });

  } catch (error) {
    console.error('Error getting verticals:', error);
    return new Response(JSON.stringify({ error: 'Failed to retrieve verticals' }), {
      status: 500,
      headers: { 'Content-Type': 'application/json' }
    });
  }
}

// Create or update vertical
export async function POST({ request, locals }: APIContext) {
  const { DB } = locals.runtime.env;

  try {
    const data = await request.json();
    const {
      id,
      name,
      slug,
      description,
      iconUrl,
      bannerUrl,
      expertRequirements = {},
      specializedFields = [],
      complianceRequirements = [],
      isActive = true
    } = data;

    if (!name || !slug || !description) {
      return new Response(JSON.stringify({
        error: 'Name, slug, and description are required'
      }), {
        status: 400,
        headers: { 'Content-Type': 'application/json' }
      });
    }

    const now = Math.floor(Date.now() / 1000);

    if (id) {
      // Update existing vertical
      await DB.prepare(`
        UPDATE industry_verticals
        SET name = ?, description = ?, icon_url = ?, banner_url = ?,
            expert_requirements = ?, specialized_fields = ?, compliance_requirements = ?,
            is_active = ?, updated_at = ?
        WHERE id = ?
      `).bind(
        name,
        description,
        iconUrl,
        bannerUrl,
        JSON.stringify(expertRequirements),
        JSON.stringify(specializedFields),
        JSON.stringify(complianceRequirements),
        isActive,
        now,
        id
      ).run();

      return new Response(JSON.stringify({
        success: true,
        message: 'Vertical updated successfully',
        verticalId: id
      }), {
        headers: { 'Content-Type': 'application/json' }
      });

    } else {
      // Create new vertical
      const result = await DB.prepare(`
        INSERT INTO industry_verticals
        (name, slug, description, icon_url, banner_url, expert_requirements,
         specialized_fields, compliance_requirements, is_active, created_at)
        VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
      `).bind(
        name,
        slug,
        description,
        iconUrl,
        bannerUrl,
        JSON.stringify(expertRequirements),
        JSON.stringify(specializedFields),
        JSON.stringify(complianceRequirements),
        isActive,
        now
      ).run();

      return new Response(JSON.stringify({
        success: true,
        message: 'Vertical created successfully',
        verticalId: result.meta.last_row_id
      }), {
        headers: { 'Content-Type': 'application/json' }
      });
    }

  } catch (error) {
    console.error('Error creating/updating vertical:', error);
    return new Response(JSON.stringify({ error: 'Failed to save vertical' }), {
      status: 500,
      headers: { 'Content-Type': 'application/json' }
    });
  }
}

// Get vertical-specific listings and experts
export async function PUT({ request, locals }: APIContext) {
  const { DB } = locals.runtime.env;

  try {
    const { verticalSlug, userId } = await request.json();

    if (!verticalSlug) {
      return new Response(JSON.stringify({ error: 'Vertical slug required' }), {
        status: 400,
        headers: { 'Content-Type': 'application/json' }
      });
    }

    // Get vertical details
    const vertical = await DB.prepare(`
      SELECT * FROM industry_verticals WHERE slug = ? AND is_active = 1
    `).bind(verticalSlug).first();

    if (!vertical) {
      return new Response(JSON.stringify({ error: 'Vertical not found' }), {
        status: 404,
        headers: { 'Content-Type': 'application/json' }
      });
    }

    // Get vertical-specific listings
    const listings = await DB.prepare(`
      SELECT l.*, u.name as seller_name, p.company, p.avatar_url,
             AVG(r.rating) as seller_rating
      FROM listings l
      JOIN users u ON l.seller_id = u.id
      LEFT JOIN profiles p ON u.id = p.user_id
      LEFT JOIN reviews r ON r.reviewed_id = u.id
      WHERE l.category = ? OR l.industry LIKE '%' || ? || '%'
        AND l.status = 'active'
      GROUP BY l.id
      ORDER BY l.created_at DESC
      LIMIT 20
    `).bind(vertical.name, vertical.slug).all();

    // Get vertical experts
    const experts = await DB.prepare(`
      SELECT ie.*, u.name, p.avatar_url, p.bio, p.company,
             ur.seller_score, ur.trust_level
      FROM industry_experts ie
      JOIN users u ON ie.user_id = u.id
      LEFT JOIN profiles p ON u.id = p.user_id
      LEFT JOIN user_reputation ur ON u.id = ur.user_id
      WHERE ie.vertical_id = ? AND ie.availability_status != 'unavailable'
      ORDER BY ie.rating DESC, ie.total_sessions DESC
      LIMIT 10
    `).bind(vertical.id).all();

    // Get AI-powered market insights for this vertical
    const marketInsights = await getVerticalMarketInsights(DB, vertical.id);

    // Check if user is an expert in this vertical
    let userExpertStatus = null;
    if (userId) {
      userExpertStatus = await DB.prepare(`
        SELECT * FROM industry_experts WHERE user_id = ? AND vertical_id = ?
      `).bind(userId, vertical.id).first();
    }

    return new Response(JSON.stringify({
      vertical: {
        ...vertical,
        expertRequirements: JSON.parse(vertical.expert_requirements || '{}'),
        specializedFields: JSON.parse(vertical.specialized_fields || '[]'),
        complianceRequirements: JSON.parse(vertical.compliance_requirements || '[]')
      },
      listings: listings.map(l => ({
        ...l,
        formattedPrice: `$${(l.price / 100).toLocaleString()}`,
        sellerRating: l.seller_rating || 0
      })),
      experts: experts.map(e => ({
        ...e,
        credentials: JSON.parse(e.credentials || '[]'),
        specialties: JSON.parse(e.specialties || '[]'),
        languages: JSON.parse(e.languages || '[]'),
        hourlyRateFormatted: e.hourly_rate ? `$${(e.hourly_rate / 100)}/hour` : 'Contact for rate'
      })),
      marketInsights,
      userExpertStatus,
      stats: await getVerticalStats(DB, vertical.id)
    }), {
      headers: { 'Content-Type': 'application/json' }
    });

  } catch (error) {
    console.error('Error getting vertical details:', error);
    return new Response(JSON.stringify({ error: 'Failed to retrieve vertical details' }), {
      status: 500,
      headers: { 'Content-Type': 'application/json' }
    });
  }
}

async function initializeVerticals(DB: any) {
  for (const vertical of DEFAULT_VERTICALS) {
    await DB.prepare(`
      INSERT OR IGNORE INTO industry_verticals
      (name, slug, description, icon_url, banner_url, expert_requirements,
       specialized_fields, compliance_requirements, is_active, created_at)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, 1, ?)
    `).bind(
      vertical.name,
      vertical.slug,
      vertical.description,
      vertical.iconUrl,
      vertical.bannerUrl,
      JSON.stringify(vertical.expertRequirements),
      JSON.stringify(vertical.specializedFields),
      JSON.stringify(vertical.complianceRequirements),
      Math.floor(Date.now() / 1000)
    ).run();
  }
}

async function getVerticalStats(DB: any, verticalId: string) {
  // Get expert count
  const expertCount = await DB.prepare(`
    SELECT COUNT(*) as count FROM industry_experts WHERE vertical_id = ?
  `).bind(verticalId).first();

  // Get listing count (approximate based on category matching)
  const vertical = await DB.prepare(`
    SELECT name FROM industry_verticals WHERE id = ?
  `).bind(verticalId).first();

  const listingCount = await DB.prepare(`
    SELECT COUNT(*) as count FROM listings
    WHERE (category = ? OR industry LIKE '%' || ? || '%') AND status = 'active'
  `).bind(vertical.name, vertical.name).first();

  // Get recent activity
  const recentActivity = await DB.prepare(`
    SELECT COUNT(*) as count FROM listings
    WHERE (category = ? OR industry LIKE '%' || ? || '%')
      AND created_at > ?
  `).bind(
    vertical.name,
    vertical.name,
    Math.floor(Date.now() / 1000) - (7 * 24 * 60 * 60)
  ).first();

  return {
    expertCount: expertCount.count || 0,
    listingCount: listingCount.count || 0,
    recentActivity: recentActivity.count || 0
  };
}

async function getVerticalMarketInsights(DB: any, verticalId: string) {
  // Get vertical info for market analysis
  const vertical = await DB.prepare(`
    SELECT name, slug FROM industry_verticals WHERE id = ?
  `).bind(verticalId).first();

  // Get price trends for this vertical
  const priceTrends = await DB.prepare(`
    SELECT AVG(price) as avg_price, COUNT(*) as listing_count,
           MIN(price) as min_price, MAX(price) as max_price
    FROM listings
    WHERE (category = ? OR industry LIKE '%' || ? || '%')
      AND status IN ('active', 'sold')
      AND created_at > ?
  `).bind(
    vertical.name,
    vertical.name,
    Math.floor(Date.now() / 1000) - (90 * 24 * 60 * 60) // Last 90 days
  ).first();

  // Get success rate
  const successRate = await DB.prepare(`
    SELECT
      COUNT(CASE WHEN status = 'sold' THEN 1 END) * 100.0 / COUNT(*) as success_rate
    FROM listings
    WHERE (category = ? OR industry LIKE '%' || ? || '%')
      AND created_at > ?
  `).bind(
    vertical.name,
    vertical.name,
    Math.floor(Date.now() / 1000) - (180 * 24 * 60 * 60) // Last 180 days
  ).first();

  return {
    avgPrice: priceTrends.avg_price || 0,
    priceRange: {
      min: priceTrends.min_price || 0,
      max: priceTrends.max_price || 0
    },
    listingCount: priceTrends.listing_count || 0,
    successRate: successRate.success_rate || 0,
    marketTrend: calculateMarketTrend(priceTrends),
    recommendedPricing: generatePricingRecommendations(priceTrends)
  };
}

function calculateMarketTrend(priceTrends: any): 'hot' | 'warm' | 'cool' | 'emerging' {
  const { listing_count, avg_price } = priceTrends;

  if (!listing_count || listing_count < 5) return 'emerging';
  if (listing_count > 20 && avg_price > 500000) return 'hot'; // $5K+ average
  if (listing_count > 10 && avg_price > 200000) return 'warm'; // $2K+ average
  return 'cool';
}

function generatePricingRecommendations(priceTrends: any) {
  const { avg_price, min_price, max_price } = priceTrends;

  if (!avg_price) {
    return {
      concept: { min: 100000, max: 500000 }, // $1K-$5K
      blueprint: { min: 500000, max: 2500000 }, // $5K-$25K
      launchReady: { min: 2500000, max: 10000000 } // $25K-$100K
    };
  }

  // Base recommendations on market data
  return {
    concept: {
      min: Math.max(100000, Math.round(avg_price * 0.2)),
      max: Math.max(500000, Math.round(avg_price * 0.5))
    },
    blueprint: {
      min: Math.max(500000, Math.round(avg_price * 0.5)),
      max: Math.max(2500000, Math.round(avg_price * 1.2))
    },
    launchReady: {
      min: Math.max(2500000, Math.round(avg_price * 1.2)),
      max: Math.max(10000000, Math.round(avg_price * 3))
    }
  };
}