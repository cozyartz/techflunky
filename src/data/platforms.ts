// Platform listings data for TechFlunky marketplace
// This data structure aligns with the database schema and seller packaging system
//
// SELLER INTEGRATION NOTES:
// - packageTier maps to business_blueprints.package_tier ('blueprint', 'launch_ready', 'enterprise')
// - aiScore comes from ai_analysis_results.overall_score
// - Seller data comes from users and profiles tables
// - New platforms added through BlueprintWizard -> BusinessCanvasWizard -> Certification flow
// - This static data represents approved, published platforms from marketplace_listings table
//
// Package Tiers (matching certification.astro pricing):
// - blueprint: FREE basic certification
// - launch_ready: $99-$299 enhanced certification
// - enterprise: $299-$599 premium certification with AI analysis

export const platforms = [
  {
    id: "hr-leave-administration-platform",
    slug: "ai-hr-leave-administration-platform",
    title: "AI-Powered HR Compliance Platform",
    description: "Complete multi-state leave administration system with automated compliance tracking. Built on Cloudflare with AI automation for FMLA, PTO, and benefits management.",
    elevator_pitch: "Complete multi-state leave administration system with automated compliance tracking. Built on Cloudflare with AI automation for FMLA, PTO, and benefits management.",
    longDescription: "Revolutionary HR compliance platform that automates leave administration across all 50 states. Features include automated FMLA calculations, real-time compliance monitoring, employee self-service portal, manager dashboards, and AI-powered policy recommendations. Built with modern cloud architecture for enterprise scale.",
    industry: "HR Technology",
    category: "hr-compliance",
    price: 3500000, // $35,000 in cents
    currency: "USD",
    packageTier: "enterprise",
    ai_score: 94, // Matches ai_analysis_results.overall_score
    views_count: 1247,
    isFeatured: true,

    // Technical details
    tech_stack: ["Cloudflare Workers", "D1 Database", "React", "TypeScript", "AI Integration"],
    architecture: "Serverless Cloud",
    deployment: "Cloudflare Pages + Workers",

    // Business metrics
    marketSize: "$800M+",
    profitMargin: "95%",
    developmentTime: "18+ months",
    revenueModel: "SaaS Subscription",
    targetCustomers: "Mid to Large Enterprises",
    projectedARR: "$1-3M",
    timeToMarket: "3-6 months",

    // Media
    thumbnailUrl: "/assets/platforms/hr-platform-thumb.jpg",
    screenshots: [
      "/assets/platforms/hr-platform-dashboard.jpg",
      "/assets/platforms/hr-platform-compliance.jpg",
      "/assets/platforms/hr-platform-reports.jpg"
    ],
    galleryImages: [
      {
        url: "/assets/platforms/hr-dashboard-main.jpg",
        alt: "Main dashboard showing compliance overview",
        caption: "Comprehensive compliance dashboard with real-time monitoring"
      },
      {
        url: "/assets/platforms/hr-employee-portal.jpg",
        alt: "Employee self-service portal",
        caption: "Intuitive employee portal for leave requests and tracking"
      },
      {
        url: "/assets/platforms/hr-admin-panel.jpg",
        alt: "Administrator management panel",
        caption: "Advanced admin controls for multi-state compliance management"
      }
    ],

    // Features
    features: [
      "Automated FMLA/ADA compliance tracking",
      "50-state leave law automation",
      "Employee self-service portal",
      "Manager approval workflows",
      "Real-time compliance alerts",
      "Custom policy engine",
      "Audit trail and reporting",
      "AI-powered recommendations",
      "Multi-tenant architecture",
      "Advanced analytics dashboard"
    ],

    // Package contents
    includes: [
      {
        category: "Market Research & Validation",
        items: [
          "42-page market analysis with data from 15+ authoritative sources",
          "Competitive landscape analysis of 8 existing solutions",
          "TAM/SAM/SOM calculations with growth projections",
          "Regulatory compliance requirements for all 50 states"
        ]
      },
      {
        category: "Technical Architecture",
        items: [
          "Complete Cloudflare stack architecture (Workers, D1, R2, AI)",
          "Database schema with multi-tenant support",
          "API documentation and integration guides",
          "AI automation workflows for compliance checking",
          "Estimated infrastructure costs: $2-8 per client/month"
        ]
      },
      {
        category: "Business Model & Financials",
        items: [
          "SaaS pricing model: $400-5,000/month based on company size",
          "Financial projections spreadsheet (5-year model)",
          "Unit economics breakdown showing 95%+ gross margins",
          "Customer acquisition cost (CAC) and LTV calculations"
        ]
      },
      {
        category: "Go-to-Market Strategy",
        items: [
          "Pilot customer identified: Encore (17-state healthcare group)",
          "List of 50+ target customers with contact information",
          "Sales deck and demo script",
          "Content marketing plan with SEO keywords"
        ]
      },
      {
        category: "Investor Package",
        items: [
          "Pitch deck (15 slides) with speaker notes",
          "List of 25 HR tech investors with warm intro strategies",
          "Executive summary and one-pager",
          "Due diligence preparation checklist"
        ]
      }
    ],

    // Seller info
    seller: {
      id: "cozyartz",
      name: "Cozyartz Media Group",
      avatar: "/assets/sellers/cozyartz-avatar.jpg",
      rating: 4.9,
      reviewsCount: 12,
      verified: true,
      expertise: ["SaaS Development", "HR Tech", "Compliance Systems"],
      description: "Serial entrepreneurs with expertise in AI automation and HR compliance. Successfully built and sold 3 SaaS companies."
    },

    // Status and availability
    status: "available",
    featured: true,
    urgency: null,
    exclusive: false,

    // SEO and metadata
    tags: ["HR", "Compliance", "AI", "SaaS", "Legal", "Enterprise"],
    created_at: "2024-09-15T10:00:00Z",
    updated_at: "2024-09-16T14:30:00Z"
  },

  {
    id: "restaurant-pos-system",
    slug: "modern-restaurant-pos-platform",
    title: "Modern Restaurant POS Platform",
    description: "Complete point-of-sale system with inventory management, staff scheduling, customer loyalty programs, and real-time analytics built for modern restaurants.",
    elevator_pitch: "Complete point-of-sale system with inventory management, staff scheduling, customer loyalty programs, and real-time analytics built for modern restaurants.",
    longDescription: "Comprehensive restaurant management platform featuring advanced POS capabilities, real-time inventory tracking, employee management, customer relationship tools, and detailed analytics. Supports online ordering, delivery integration, and multi-location management.",
    industry: "Restaurant Technology",
    category: "restaurant-tech",
    price: 2500000, // $25,000 in cents
    currency: "USD",
    packageTier: "launch_ready",
    ai_score: 89,
    views_count: 892,
    isFeatured: false,

    tech_stack: ["Next.js", "PostgreSQL", "Stripe", "React Native", "Node.js"],
    architecture: "Full-stack Application",
    deployment: "Docker + Cloud",

    marketSize: "$42B+",
    profitMargin: "88%",
    developmentTime: "14+ months",
    revenueModel: "SaaS + Transaction Fees",
    targetCustomers: "Independent Restaurants & Chains",
    projectedARR: "$500K-2M",
    timeToMarket: "2-4 months",

    thumbnailUrl: "/assets/platforms/restaurant-pos-thumb.jpg",
    galleryImages: [
      {
        url: "/assets/platforms/restaurant-pos-dashboard.jpg",
        alt: "Restaurant POS dashboard",
        caption: "Intuitive dashboard for order management and analytics"
      },
      {
        url: "/assets/platforms/restaurant-pos-orders.jpg",
        alt: "Order management interface",
        caption: "Real-time order tracking and kitchen communication"
      }
    ],

    features: [
      "Touch-screen POS interface",
      "Real-time inventory management",
      "Staff scheduling & payroll",
      "Customer loyalty programs",
      "Online ordering integration",
      "Delivery partner APIs",
      "Multi-location support",
      "Advanced reporting & analytics"
    ],

    includes: [
      {
        category: "Complete Platform",
        items: [
          "Full platform source code",
          "Mobile app (iOS/Android)",
          "Hardware specifications",
          "API documentation"
        ]
      },
      {
        category: "Business Package",
        items: [
          "Market research & analysis",
          "Customer testimonials",
          "Business model documentation",
          "Implementation support"
        ]
      }
    ],

    seller: {
      id: "techbuilder",
      name: "TechBuilder Solutions",
      avatar: "/assets/sellers/techbuilder-avatar.jpg",
      rating: 4.7,
      reviewsCount: 8,
      verified: true,
      expertise: ["POS Systems", "Restaurant Tech", "Mobile Development"],
      description: "Specialized in restaurant technology solutions with 8+ years of industry experience."
    },

    status: "available",
    featured: false,
    urgency: "limited_time",
    exclusive: false,

    tags: ["Restaurant", "POS", "Inventory", "Mobile", "SaaS"],
    created_at: "2024-09-10T09:00:00Z",
    updated_at: "2024-09-14T16:20:00Z"
  },

  {
    id: "fitness-membership-platform",
    slug: "ai-fitness-membership-platform",
    title: "AI Fitness Membership Platform",
    description: "Complete gym and fitness center management system with AI-powered workout recommendations, member tracking, and automated billing.",
    elevator_pitch: "Complete gym and fitness center management system with AI-powered workout recommendations, member tracking, and automated billing.",
    longDescription: "Advanced fitness center management platform featuring AI-driven personalized workout plans, comprehensive member management, automated billing and payment processing, equipment tracking, and detailed performance analytics.",
    industry: "Fitness Technology",
    category: "fitness-tech",
    price: 1800000, // $18,000 in cents
    currency: "USD",
    packageTier: "launch_ready",
    ai_score: 86,
    views_count: 654,
    isFeatured: false,

    tech_stack: ["React", "Node.js", "MongoDB", "AI/ML APIs", "Stripe"],
    architecture: "MERN Stack",
    deployment: "AWS/Azure",

    marketSize: "$96B+",
    profitMargin: "92%",
    developmentTime: "12+ months",
    revenueModel: "SaaS Subscription",
    targetCustomers: "Gyms & Fitness Centers",
    projectedARR: "$300K-1M",
    timeToMarket: "2-3 months",

    thumbnailUrl: "/assets/platforms/fitness-platform-thumb.jpg",
    galleryImages: [
      {
        url: "/assets/platforms/fitness-platform-dashboard.jpg",
        alt: "Fitness platform dashboard",
        caption: "Comprehensive member management dashboard"
      }
    ],

    features: [
      "AI-powered workout recommendations",
      "Member check-in/check-out system",
      "Automated billing & payments",
      "Equipment usage tracking",
      "Personal trainer scheduling",
      "Progress tracking & analytics",
      "Mobile app integration",
      "Class booking system"
    ],

    includes: [
      {
        category: "Technical Package",
        items: [
          "Complete platform source code",
          "Mobile companion app",
          "AI model training data",
          "Equipment integration guides"
        ]
      },
      {
        category: "Business Materials",
        items: [
          "Business plan & financials",
          "Marketing materials",
          "Member onboarding flows",
          "Support documentation"
        ]
      }
    ],

    seller: {
      id: "fittech-dev",
      name: "FitTech Developers",
      avatar: "/assets/sellers/fittech-avatar.jpg",
      rating: 4.6,
      reviewsCount: 5,
      verified: true,
      expertise: ["Fitness Tech", "AI/ML", "Member Management"],
      description: "Fitness technology specialists with deep understanding of gym operations and member engagement."
    },

    status: "available",
    featured: false,
    urgency: "limited_time",
    exclusive: false,

    tags: ["Fitness", "AI", "Membership", "Health", "SaaS"],
    created_at: "2024-09-08T11:30:00Z",
    updated_at: "2024-09-13T10:15:00Z"
  },

  {
    id: "legal-document-automation",
    slug: "ai-legal-document-platform",
    title: "AI Legal Document Automation",
    description: "Automated legal document generation platform for law firms with AI-powered contract analysis, template management, and client portal.",
    elevator_pitch: "Automated legal document generation platform for law firms with AI-powered contract analysis, template management, and client portal.",
    longDescription: "Comprehensive legal technology platform that automates document creation, contract review, and client communication. Features advanced AI for legal research, automated compliance checking, and seamless integration with existing law firm workflows.",
    industry: "Legal Technology",
    category: "legal-saas",
    price: 4200000, // $42,000 in cents
    currency: "USD",
    packageTier: "enterprise",
    ai_score: 91,
    views_count: 432,
    isFeatured: true,

    tech_stack: ["Python", "Django", "PostgreSQL", "AI/NLP", "React"],
    architecture: "Django + React",
    deployment: "Cloud Infrastructure",

    marketSize: "$17B+",
    profitMargin: "94%",
    developmentTime: "20+ months",
    revenueModel: "Enterprise SaaS",
    targetCustomers: "Law Firms & Legal Departments",
    projectedARR: "$2-5M",
    timeToMarket: "4-8 months",

    thumbnailUrl: "/assets/platforms/legal-platform-thumb.jpg",
    galleryImages: [
      {
        url: "/assets/platforms/legal-platform-dashboard.jpg",
        alt: "Legal platform dashboard",
        caption: "Advanced legal document management dashboard"
      }
    ],

    features: [
      "AI-powered document generation",
      "Contract analysis & review",
      "Legal research automation",
      "Client portal & communication",
      "Template library management",
      "Compliance checking",
      "Billing & time tracking",
      "Matter management"
    ],

    includes: [
      {
        category: "Technical Assets",
        items: [
          "Full platform source code",
          "AI models & training data",
          "Legal template library",
          "Integration documentation"
        ]
      },
      {
        category: "Business & Compliance",
        items: [
          "Compliance frameworks",
          "Security audit report",
          "Market analysis report",
          "Professional implementation"
        ]
      }
    ],

    seller: {
      id: "legaltech-pro",
      name: "LegalTech Professionals",
      avatar: "/assets/sellers/legaltech-avatar.jpg",
      rating: 4.8,
      reviewsCount: 15,
      verified: true,
      expertise: ["Legal Tech", "AI/NLP", "Document Automation"],
      description: "Legal technology experts with 15+ years of experience building solutions for top law firms."
    },

    status: "available",
    featured: true,
    urgency: null,
    exclusive: true,

    tags: ["Legal", "AI", "Automation", "Contracts", "Enterprise"],
    created_at: "2024-09-05T14:00:00Z",
    updated_at: "2024-09-15T09:45:00Z"
  },

  {
    id: "real-estate-crm-platform",
    slug: "ai-real-estate-crm-platform",
    title: "AI Real Estate CRM Platform",
    description: "Complete CRM solution for real estate agents and brokerages with AI-powered lead scoring, automated follow-ups, and market analytics.",
    elevator_pitch: "Complete CRM solution for real estate agents and brokerages with AI-powered lead scoring, automated follow-ups, and market analytics.",
    longDescription: "Comprehensive real estate CRM platform featuring intelligent lead management, automated marketing campaigns, property analytics, commission tracking, and seamless MLS integration. Built specifically for modern real estate professionals.",
    industry: "Real Estate Technology",
    category: "real-estate",
    price: 2800000, // $28,000 in cents
    currency: "USD",
    packageTier: "launch_ready",
    ai_score: 88,
    views_count: 743,
    isFeatured: false,

    tech_stack: ["Vue.js", "Laravel", "MySQL", "AI/ML APIs", "Twilio"],
    architecture: "LAMP + Vue",
    deployment: "Cloud Hosting",

    marketSize: "$12B+",
    profitMargin: "90%",
    developmentTime: "16+ months",
    revenueModel: "SaaS + Transaction Fees",
    targetCustomers: "Real Estate Agents & Brokerages",
    projectedARR: "$800K-2.5M",
    timeToMarket: "3-5 months",

    thumbnailUrl: "/assets/platforms/realestate-crm-thumb.jpg",
    galleryImages: [
      {
        url: "/assets/platforms/realestate-crm-dashboard.jpg",
        alt: "Real estate CRM dashboard",
        caption: "Comprehensive agent dashboard with lead tracking and analytics"
      }
    ],

    features: [
      "AI-powered lead scoring",
      "Automated follow-up campaigns",
      "MLS integration",
      "Commission tracking",
      "Market analytics & reports",
      "Client portal",
      "Document management",
      "Mobile app for agents"
    ],

    includes: [
      {
        category: "Platform & Mobile",
        items: [
          "Complete CRM platform source code",
          "iOS and Android mobile apps",
          "MLS integration documentation",
          "Third-party API connections"
        ]
      },
      {
        category: "Business Development",
        items: [
          "Real estate market research",
          "Agent onboarding materials",
          "Sales and marketing toolkit",
          "Training and support guides"
        ]
      }
    ],

    seller: {
      id: "proptech-solutions",
      name: "PropTech Solutions",
      avatar: "/assets/sellers/proptech-avatar.jpg",
      rating: 4.5,
      reviewsCount: 9,
      verified: true,
      expertise: ["Real Estate Tech", "CRM Systems", "Lead Management"],
      description: "PropTech specialists with deep real estate industry knowledge and proven track record in agent productivity tools."
    },

    status: "available",
    featured: false,
    urgency: null,
    exclusive: false,

    tags: ["Real Estate", "CRM", "AI", "Lead Management", "MLS"],
    created_at: "2024-09-12T13:15:00Z",
    updated_at: "2024-09-16T11:20:00Z"
  }
];

// Helper functions for filtering and sorting
export function filterPlatforms(platforms, filters = {}) {
  let filtered = [...platforms];

  // Filter by search query
  if (filters.query) {
    const query = filters.query.toLowerCase();
    filtered = filtered.filter(p =>
      p.title.toLowerCase().includes(query) ||
      p.description.toLowerCase().includes(query) ||
      p.industry.toLowerCase().includes(query) ||
      p.tags.some(tag => tag.toLowerCase().includes(query))
    );
  }

  // Filter by category
  if (filters.category) {
    filtered = filtered.filter(p => p.category === filters.category);
  }

  // Filter by price range
  if (filters.minPrice !== undefined) {
    filtered = filtered.filter(p => p.price >= filters.minPrice * 100);
  }
  if (filters.maxPrice !== undefined) {
    filtered = filtered.filter(p => p.price <= filters.maxPrice * 100);
  }

  // Filter by status
  if (filters.status) {
    filtered = filtered.filter(p => p.status === filters.status);
  }

  // Filter by featured
  if (filters.featured) {
    filtered = filtered.filter(p => p.featured);
  }

  return filtered;
}

export function sortPlatforms(platforms, sortBy = 'created_at', sortOrder = 'desc') {
  return [...platforms].sort((a, b) => {
    let aVal = a[sortBy];
    let bVal = b[sortBy];

    // Handle different data types
    if (sortBy === 'price' || sortBy === 'ai_score' || sortBy === 'views_count') {
      aVal = Number(aVal);
      bVal = Number(bVal);
    } else if (sortBy === 'created_at' || sortBy === 'updated_at') {
      aVal = new Date(aVal);
      bVal = new Date(bVal);
    }

    if (sortOrder === 'desc') {
      return bVal > aVal ? 1 : bVal < aVal ? -1 : 0;
    } else {
      return aVal > bVal ? 1 : aVal < bVal ? -1 : 0;
    }
  });
}

// Get paginated results
export function paginatePlatforms(platforms, page = 1, limit = 12) {
  const startIndex = (page - 1) * limit;
  const endIndex = startIndex + limit;

  return {
    data: platforms.slice(startIndex, endIndex),
    pagination: {
      page: page,
      limit: limit,
      total: platforms.length,
      totalPages: Math.ceil(platforms.length / limit),
      hasPrev: page > 1,
      hasNext: endIndex < platforms.length
    }
  };
}

// Get platform by slug
export function getPlatformBySlug(slug) {
  return platforms.find(p => p.slug === slug);
}

// Get featured platforms
export function getFeaturedPlatforms(limit = 3) {
  return platforms.filter(p => p.isFeatured).slice(0, limit);
}

// INTEGRATION FUNCTIONS FOR SELLER SYSTEM
// These functions would connect to the actual database in production

// Get platforms by seller ID (for seller dashboard)
export function getPlatformsBySeller(sellerId) {
  return platforms.filter(p => p.seller?.id === sellerId);
}

// Get platforms by package tier (for certification system)
export function getPlatformsByTier(tier) {
  return platforms.filter(p => p.packageTier === tier);
}

// Get platforms pending approval (for admin review)
export function getPendingPlatforms() {
  return platforms.filter(p => p.status === 'pending_review');
}

// Add new platform (called after seller completes BlueprintWizard + Certification)
export function addPlatform(platformData) {
  // In production, this would:
  // 1. Insert into business_blueprints table
  // 2. Create marketplace_listings entry
  // 3. Trigger AI analysis if enterprise tier
  // 4. Update seller's profile with new listing
  console.log('Would add platform to database:', platformData);
}