// Marketing Package System for Developers/Sellers
import type { APIContext } from 'astro';

// Marketing package configurations
const MARKETING_PACKAGES = {
  diyStarter: {
    name: 'DIY Starter Package',
    slug: 'diy-starter',
    price: 4900, // $49
    features: [
      'AI-generated logo with human review',
      'Basic brand colors and fonts',
      '1 sales page template',
      'AI section assistance included',
      'Basic business canvas template',
      'Email support'
    ],
    includes: ['logo_design', 'brand_basics', 'sales_template', 'ai_assistance', 'canvas'],
    deliveryTime: '3-5 business days',
    aiAssistance: true
  },

  professional: {
    name: 'Professional Package',
    slug: 'professional',
    price: 19900, // $199
    features: [
      'Professional logo design',
      'Complete brand guidelines',
      '2 sales pages + email templates',
      'Basic video editing guidance',
      'Business plan template with guidance',
      'Unlimited AI section assistance',
      '1-hour strategy consultation',
      'Priority support'
    ],
    includes: ['professional_logo', 'brand_guidelines', 'sales_materials', 'video_guidance', 'business_plan_template', 'unlimited_ai', 'consultation'],
    deliveryTime: '5-7 business days',
    aiAssistance: true,
    unlimited: true
  },

  marketReady: {
    name: 'Market-Ready Package',
    slug: 'market-ready',
    price: 49900, // $499
    features: [
      'Everything in Professional',
      'Professional sales video (2-minute demo)',
      'Executive summary writing',
      'Market research report',
      'Financial projection templates',
      'Legal document templates',
      'Full AI business plan assistance',
      'Priority support and delivery'
    ],
    includes: ['professional_package', 'sales_video', 'executive_summary', 'market_research', 'financial_templates', 'legal_templates', 'full_ai_assistance'],
    deliveryTime: '7-10 business days',
    aiAssistance: true,
    unlimited: true,
    premium: true
  },

  investorGrade: {
    name: 'Investor-Grade Package',
    slug: 'investor-grade',
    price: 99900, // $999
    features: [
      'Everything in Market-Ready',
      'Professional video production (5-minute presentation)',
      'Complete investor presentation',
      'Detailed business plan (15-30 pages)',
      'Custom market analysis',
      'Due diligence preparation',
      '3 months ongoing marketing support',
      'Priority AI assistance for all materials',
      'Dedicated account manager'
    ],
    includes: ['market_ready_package', 'professional_video', 'investor_presentation', 'detailed_business_plan', 'custom_analysis', 'due_diligence', 'ongoing_support', 'priority_ai'],
    deliveryTime: '10-14 business days',
    aiAssistance: true,
    unlimited: true,
    premium: true,
    enterprise: true
  }
};

// Add-on services
const ADD_ON_SERVICES = {
  pitchDeck: {
    name: 'Professional Pitch Deck',
    slug: 'pitch-deck',
    price: 49900, // $499
    description: 'Investor-ready pitch deck (10-15 slides)',
    deliveryTime: '5-7 business days',
    includes: ['slide_design', 'content_writing', 'data_visualization', '2_rounds_revisions']
  },

  additionalVideo: {
    name: 'Additional Demo Video',
    slug: 'additional-video',
    price: 29900, // $299
    description: 'Extra 2-minute demo or explainer video',
    deliveryTime: '7-10 business days',
    includes: ['professional_production', 'script_writing', 'editing', '1_round_revisions']
  },

  rushDelivery: {
    name: 'Rush Delivery',
    slug: 'rush-delivery',
    priceMultiplier: 1.5, // 50% surcharge
    description: 'Cut delivery time in half',
    availableFor: ['diy-starter', 'professional', 'market-ready']
  },

  extraConsultation: {
    name: 'Additional Strategy Session',
    slug: 'extra-consultation',
    price: 14900, // $149
    description: '1-hour strategy consultation with expert',
    deliveryTime: '2-3 business days',
    includes: ['strategy_review', 'actionable_recommendations', 'follow_up_notes']
  }
};

// Get available packages
export async function GET({ url, locals }: APIContext) {
  const { DB } = locals.runtime.env;
  const userId = url.searchParams.get('userId');
  const packageSlug = url.searchParams.get('package');

  try {
    let response = {
      packages: Object.values(MARKETING_PACKAGES).map(pkg => ({
        ...pkg,
        priceFormatted: `$${(pkg.price / 100).toLocaleString()}`,
        memberSavings: calculateMemberSavings(pkg.price),
        roiExample: calculateROI(pkg.price)
      })),
      addOns: Object.values(ADD_ON_SERVICES).map(addon => ({
        ...addon,
        priceFormatted: addon.price ? `$${(addon.price / 100).toLocaleString()}` : 'Variable'
      }))
    };

    // Get user's package history if userId provided
    if (userId) {
      const userPackages = await DB.prepare(`
        SELECT mp.*, p.name as package_name, p.status as package_status
        FROM marketing_packages mp
        LEFT JOIN projects p ON mp.project_id = p.id
        WHERE mp.user_id = ?
        ORDER BY mp.created_at DESC
        LIMIT 10
      `).bind(userId).all();

      response = {
        ...response,
        userHistory: userPackages.map(pkg => ({
          ...pkg,
          priceFormatted: `$${(pkg.total_price / 100).toLocaleString()}`,
          createdAt: new Date(pkg.created_at * 1000).toLocaleDateString()
        }))
      };
    }

    // Get specific package details if requested
    if (packageSlug && MARKETING_PACKAGES[packageSlug]) {
      response = {
        ...response,
        packageDetails: {
          ...MARKETING_PACKAGES[packageSlug],
          priceFormatted: `$${(MARKETING_PACKAGES[packageSlug].price / 100).toLocaleString()}`,
          memberSavings: calculateMemberSavings(MARKETING_PACKAGES[packageSlug].price),
          compatibleAddOns: getCompatibleAddOns(packageSlug)
        }
      };
    }

    return new Response(JSON.stringify(response), {
      headers: { 'Content-Type': 'application/json' }
    });

  } catch (error) {
    console.error('Error getting marketing packages:', error);
    return new Response(JSON.stringify({ error: 'Failed to retrieve marketing packages' }), {
      status: 500,
      headers: { 'Content-Type': 'application/json' }
    });
  }
}

// Purchase marketing package
export async function POST({ request, locals }: APIContext) {
  const { DB } = locals.runtime.env;

  try {
    const {
      userId,
      packageSlug,
      addOns = [],
      projectDetails = {},
      rushDelivery = false,
      specialRequests = ''
    } = await request.json();

    if (!userId || !packageSlug) {
      return new Response(JSON.stringify({
        error: 'User ID and package slug are required'
      }), {
        status: 400,
        headers: { 'Content-Type': 'application/json' }
      });
    }

    // Validate package exists
    if (!MARKETING_PACKAGES[packageSlug]) {
      return new Response(JSON.stringify({
        error: 'Invalid package selection'
      }), {
        status: 400,
        headers: { 'Content-Type': 'application/json' }
      });
    }

    const selectedPackage = MARKETING_PACKAGES[packageSlug];
    const now = Math.floor(Date.now() / 1000);
    const packageId = generatePackageId();

    // Calculate total price with add-ons
    let totalPrice = selectedPackage.price;
    let calculatedAddOns = [];

    // Process add-ons
    for (const addonSlug of addOns) {
      if (ADD_ON_SERVICES[addonSlug]) {
        const addon = ADD_ON_SERVICES[addonSlug];
        let addonPrice = addon.price || 0;

        if (addon.priceMultiplier) {
          addonPrice = Math.round(totalPrice * (addon.priceMultiplier - 1));
        }

        totalPrice += addonPrice;
        calculatedAddOns.push({
          slug: addonSlug,
          name: addon.name,
          price: addonPrice
        });
      }
    }

    // Rush delivery surcharge
    if (rushDelivery && ADD_ON_SERVICES.rushDelivery.availableFor.includes(packageSlug)) {
      const rushFee = Math.round(selectedPackage.price * 0.5);
      totalPrice += rushFee;
      calculatedAddOns.push({
        slug: 'rush-delivery',
        name: 'Rush Delivery',
        price: rushFee
      });
    }

    // Calculate delivery date
    const baseDeliveryDays = parseInt(selectedPackage.deliveryTime.split('-')[1]) || 10;
    const deliveryDays = rushDelivery ? Math.ceil(baseDeliveryDays / 2) : baseDeliveryDays;
    const estimatedDelivery = now + (deliveryDays * 24 * 60 * 60);

    // Create package order
    await DB.prepare(`
      INSERT INTO marketing_packages (
        id, user_id, package_slug, package_config, total_price,
        add_ons, project_details, special_requests,
        estimated_delivery, status, created_at, updated_at
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, 'pending', ?, ?)
    `).bind(
      packageId,
      userId,
      packageSlug,
      JSON.stringify(selectedPackage),
      totalPrice,
      JSON.stringify(calculatedAddOns),
      JSON.stringify(projectDetails),
      specialRequests,
      estimatedDelivery,
      now,
      now
    ).run();

    // Record revenue
    await DB.prepare(`
      INSERT INTO revenue_analytics (
        transaction_type, transaction_id, gross_amount, platform_fee,
        net_amount, user_id, metadata, created_at
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?)
    `).bind(
      'marketing_package',
      packageId,
      totalPrice,
      totalPrice, // Full amount is platform revenue
      0,
      userId,
      JSON.stringify({
        packageSlug,
        addOns: calculatedAddOns,
        rushDelivery,
        deliveryDays
      }),
      now
    ).run();

    return new Response(JSON.stringify({
      success: true,
      packageOrder: {
        id: packageId,
        packageName: selectedPackage.name,
        totalPrice,
        totalPriceFormatted: `$${(totalPrice / 100).toLocaleString()}`,
        addOns: calculatedAddOns,
        estimatedDelivery: new Date(estimatedDelivery * 1000).toLocaleDateString(),
        status: 'pending'
      },
      message: 'Marketing package order created successfully',
      nextSteps: [
        'Our team will review your requirements within 4 hours',
        'You will receive a detailed project timeline',
        'Work begins immediately upon confirmation',
        `Expected delivery: ${new Date(estimatedDelivery * 1000).toLocaleDateString()}`
      ]
    }), {
      headers: { 'Content-Type': 'application/json' }
    });

  } catch (error) {
    console.error('Error creating marketing package order:', error);
    return new Response(JSON.stringify({ error: 'Failed to create marketing package order' }), {
      status: 500,
      headers: { 'Content-Type': 'application/json' }
    });
  }
}

// Helper functions
function generatePackageId(): string {
  return `mpkg_${crypto.getRandomValues(new Uint8Array(16)).reduce((str, byte) => str + byte.toString(16).padStart(2, '0'), '')}`;
}

function calculateMemberSavings(packagePrice: number): object {
  // Calculate how much they save in fees with membership vs non-member
  const salesNeededToBreakEven = packagePrice / 200; // $200 savings per $10K sale (2% difference)
  return {
    feeDiscount: '2%',
    savingsPerSale: '$200 per $10K sale',
    breakEvenSale: `$${(salesNeededToBreakEven * 10000 / 100).toLocaleString()}`,
    roiMultiplier: Math.round(10000 / (packagePrice / 100))
  };
}

function calculateROI(packagePrice: number): object {
  const packageCost = packagePrice / 100;
  return {
    sale10K: {
      savings: 200,
      roi: Math.round((200 / packageCost) * 100)
    },
    sale25K: {
      savings: 500,
      roi: Math.round((500 / packageCost) * 100)
    },
    sale50K: {
      savings: 1000,
      roi: Math.round((1000 / packageCost) * 100)
    }
  };
}

function getCompatibleAddOns(packageSlug: string): object[] {
  const compatible = [];

  for (const [slug, addon] of Object.entries(ADD_ON_SERVICES)) {
    if (slug === 'rushDelivery') {
      if (addon.availableFor.includes(packageSlug)) {
        compatible.push({ slug, ...addon });
      }
    } else {
      compatible.push({ slug, ...addon });
    }
  }

  return compatible;
}

// Export configurations
export { MARKETING_PACKAGES, ADD_ON_SERVICES };