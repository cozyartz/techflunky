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
    price: 22000, // $22,000
    currency: "USD",
    packageTier: "enterprise",
    ai_score: 94, // Matches ai_analysis_results.overall_score
    views_count: 89,
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
    updated_at: "2024-09-16T14:30:00Z",

    // Offer system fields
    acceptsOffers: true,
    minOfferAmount: 17600, // 80% of asking price
    offerCount: 5,
    lastOfferDate: "2024-09-16T09:15:00Z"
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
    price: 25000, // $25,000
    currency: "USD",
    packageTier: "launch_ready",
    ai_score: 89,
    views_count: 67,
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
    updated_at: "2024-09-14T16:20:00Z",

    // Offer system fields
    acceptsOffers: true,
    minOfferAmount: 20000, // 80% of asking price
    offerCount: 2,
    lastOfferDate: "2024-09-14T14:45:00Z"
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
    price: 18000, // $18,000
    currency: "USD",
    packageTier: "launch_ready",
    ai_score: 86,
    views_count: 42,
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
    updated_at: "2024-09-13T10:15:00Z",

    // Offer system fields
    acceptsOffers: false, // Fixed price only
    minOfferAmount: null,
    offerCount: 0,
    lastOfferDate: null
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
    price: 42000, // $42,000
    currency: "USD",
    packageTier: "enterprise",
    ai_score: 91,
    views_count: 156,
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
    updated_at: "2024-09-15T09:45:00Z",

    // Offer system fields
    acceptsOffers: true,
    minOfferAmount: 33600, // 80% of asking price
    offerCount: 8,
    lastOfferDate: "2024-09-15T16:20:00Z"
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
    price: 28000, // $28,000
    currency: "USD",
    packageTier: "launch_ready",
    ai_score: 88,
    views_count: 23,
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
    updated_at: "2024-09-16T11:20:00Z",

    // Offer system fields
    acceptsOffers: true,
    minOfferAmount: 22400, // 80% of asking price
    offerCount: 3,
    lastOfferDate: "2024-09-16T10:30:00Z"
  },

  {
    id: "fintech-payment-processor",
    slug: "advanced-payment-processing-platform",
    title: "Advanced Payment Processing Platform",
    description: "Complete payment processing solution with multi-currency support, fraud detection, and real-time analytics built for modern e-commerce.",
    elevator_pitch: "Complete payment processing solution with multi-currency support, fraud detection, and real-time analytics built for modern e-commerce.",
    longDescription: "Enterprise-grade payment processing platform featuring advanced fraud detection, multi-currency support, real-time transaction monitoring, and comprehensive merchant tools. Supports all major payment methods including credit cards, digital wallets, and cryptocurrency.",
    industry: "Financial Technology",
    category: "fintech",
    price: 28000, // $28,000
    currency: "USD",
    packageTier: "enterprise",
    ai_score: 92,
    views_count: 34,
    isFeatured: false,

    tech_stack: ["Node.js", "PostgreSQL", "Redis", "Stripe API", "Blockchain"],
    architecture: "Microservices",
    deployment: "Kubernetes + Cloud",

    marketSize: "$128B+",
    profitMargin: "96%",
    developmentTime: "22+ months",
    revenueModel: "Transaction Fees + SaaS",
    targetCustomers: "E-commerce & Online Businesses",
    projectedARR: "$1.5-4M",
    timeToMarket: "4-6 months",

    thumbnailUrl: "/assets/platforms/payment-platform-thumb.jpg",
    galleryImages: [
      {
        url: "/assets/platforms/payment-dashboard.jpg",
        alt: "Payment processing dashboard",
        caption: "Real-time transaction monitoring and analytics dashboard"
      }
    ],

    features: [
      "Multi-currency payment processing",
      "Advanced fraud detection",
      "Real-time transaction monitoring",
      "Merchant onboarding tools",
      "Cryptocurrency support",
      "API-first architecture",
      "Compliance management",
      "Analytics and reporting"
    ],

    includes: [
      {
        category: "Complete Platform",
        items: [
          "Full payment processing system",
          "Fraud detection algorithms",
          "Merchant dashboard",
          "API documentation and SDKs"
        ]
      },
      {
        category: "Business Package",
        items: [
          "FinTech compliance guidelines",
          "Merchant acquisition strategies",
          "Revenue model documentation",
          "Technical implementation guide"
        ]
      }
    ],

    seller: {
      id: "fintech-builders",
      name: "FinTech Builders",
      avatar: "/assets/sellers/fintech-avatar.jpg",
      rating: 4.8,
      reviewsCount: 11,
      verified: true,
      expertise: ["Payment Processing", "FinTech", "Compliance"],
      description: "FinTech specialists with deep payments industry experience and regulatory knowledge."
    },

    status: "available",
    featured: false,
    urgency: null,
    exclusive: false,

    tags: ["FinTech", "Payments", "E-commerce", "Fraud Detection", "API"],
    created_at: "2024-09-03T08:45:00Z",
    updated_at: "2024-09-15T14:30:00Z",

    // Offer system fields
    acceptsOffers: true,
    minOfferAmount: 22400, // 80% of asking price
    offerCount: 1,
    lastOfferDate: "2024-09-15T11:20:00Z"
  },

  {
    id: "telemedicine-platform",
    slug: "comprehensive-telemedicine-platform",
    title: "Comprehensive Telemedicine Platform",
    description: "HIPAA-compliant telemedicine platform with video consultations, patient management, prescription handling, and insurance billing.",
    elevator_pitch: "HIPAA-compliant telemedicine platform with video consultations, patient management, prescription handling, and insurance billing.",
    longDescription: "Complete telehealth solution featuring secure video consultations, electronic health records, prescription management, appointment scheduling, and integrated insurance billing. Built with enterprise-grade security and full HIPAA compliance.",
    industry: "Healthcare Technology",
    category: "healthtech",
    price: 32000, // $32,000
    currency: "USD",
    packageTier: "enterprise",
    ai_score: 90,
    views_count: 71,
    isFeatured: true,

    tech_stack: ["React", "Node.js", "PostgreSQL", "WebRTC", "AWS Health"],
    architecture: "Cloud-Native",
    deployment: "AWS Healthcare Cloud",

    marketSize: "$659B+",
    profitMargin: "93%",
    developmentTime: "24+ months",
    revenueModel: "SaaS Subscription + Transaction Fees",
    targetCustomers: "Healthcare Providers & Clinics",
    projectedARR: "$2-6M",
    timeToMarket: "6-8 months",

    thumbnailUrl: "/assets/platforms/telemedicine-thumb.jpg",
    galleryImages: [
      {
        url: "/assets/platforms/telemedicine-dashboard.jpg",
        alt: "Telemedicine platform dashboard",
        caption: "Comprehensive healthcare provider dashboard with patient management"
      }
    ],

    features: [
      "Secure video consultations",
      "Electronic health records",
      "Prescription management",
      "Insurance billing integration",
      "Appointment scheduling",
      "Patient portal",
      "HIPAA compliance",
      "Multi-provider support"
    ],

    includes: [
      {
        category: "Healthcare Platform",
        items: [
          "Complete telemedicine system",
          "HIPAA compliance documentation",
          "Security audit reports",
          "Medical device integrations"
        ]
      },
      {
        category: "Regulatory & Business",
        items: [
          "Healthcare compliance framework",
          "Provider onboarding materials",
          "Insurance integration guides",
          "Regulatory approval assistance"
        ]
      }
    ],

    seller: {
      id: "healthtech-innovators",
      name: "HealthTech Innovators",
      avatar: "/assets/sellers/healthtech-avatar.jpg",
      rating: 4.9,
      reviewsCount: 14,
      verified: true,
      expertise: ["Healthcare IT", "HIPAA Compliance", "Telemedicine"],
      description: "Healthcare technology experts with 12+ years experience in medical software and regulatory compliance."
    },

    status: "available",
    featured: true,
    urgency: null,
    exclusive: false,

    tags: ["Healthcare", "Telemedicine", "HIPAA", "Video Chat", "EHR"],
    created_at: "2024-09-01T11:20:00Z",
    updated_at: "2024-09-16T09:15:00Z",

    // Offer system fields
    acceptsOffers: true,
    minOfferAmount: 25600, // 80% of asking price
    offerCount: 4,
    lastOfferDate: "2024-09-16T07:30:00Z"
  },

  {
    id: "lms-education-platform",
    slug: "advanced-learning-management-system",
    title: "Advanced Learning Management System",
    description: "Comprehensive LMS with interactive content creation, student analytics, assessment tools, and certification management for educational institutions.",
    elevator_pitch: "Comprehensive LMS with interactive content creation, student analytics, assessment tools, and certification management for educational institutions.",
    longDescription: "Full-featured learning management system designed for modern education. Includes course authoring tools, student progress tracking, advanced analytics, assessment engine, certification management, and mobile learning support.",
    industry: "Education Technology",
    category: "edtech",
    price: 24000, // $24,000
    currency: "USD",
    packageTier: "launch_ready",
    ai_score: 87,
    views_count: 28,
    isFeatured: false,

    tech_stack: ["Vue.js", "Django", "PostgreSQL", "Redis", "Video APIs"],
    architecture: "MVC + APIs",
    deployment: "Docker Containers",

    marketSize: "$350B+",
    profitMargin: "91%",
    developmentTime: "18+ months",
    revenueModel: "SaaS Subscription",
    targetCustomers: "Educational Institutions & Corporate Training",
    projectedARR: "$800K-2.5M",
    timeToMarket: "3-5 months",

    thumbnailUrl: "/assets/platforms/lms-platform-thumb.jpg",
    galleryImages: [
      {
        url: "/assets/platforms/lms-dashboard.jpg",
        alt: "LMS dashboard interface",
        caption: "Comprehensive learning management dashboard with analytics"
      }
    ],

    features: [
      "Interactive course authoring",
      "Student progress tracking",
      "Advanced analytics dashboard",
      "Assessment and quiz engine",
      "Certification management",
      "Mobile learning support",
      "Video content delivery",
      "Multi-language support"
    ],

    includes: [
      {
        category: "Educational Platform",
        items: [
          "Complete LMS source code",
          "Mobile learning apps",
          "Content authoring tools",
          "Assessment engine"
        ]
      },
      {
        category: "Business Development",
        items: [
          "Educational market research",
          "Institution sales materials",
          "Training and support guides",
          "Implementation roadmap"
        ]
      }
    ],

    seller: {
      id: "edtech-solutions",
      name: "EdTech Solutions",
      avatar: "/assets/sellers/edtech-avatar.jpg",
      rating: 4.6,
      reviewsCount: 7,
      verified: true,
      expertise: ["Educational Technology", "LMS Development", "Student Analytics"],
      description: "Educational technology specialists with extensive experience in learning platforms and student engagement."
    },

    status: "available",
    featured: false,
    urgency: null,
    exclusive: false,

    tags: ["Education", "LMS", "E-learning", "Analytics", "Mobile"],
    created_at: "2024-09-07T16:30:00Z",
    updated_at: "2024-09-14T12:45:00Z",

    // Offer system fields
    acceptsOffers: false, // Educational sector prefers fixed pricing
    minOfferAmount: null,
    offerCount: 0,
    lastOfferDate: null
  },

  {
    id: "ecommerce-marketplace",
    slug: "multi-vendor-marketplace-platform",
    title: "Multi-Vendor Marketplace Platform",
    description: "Complete marketplace solution with vendor management, payment processing, order fulfillment, and advanced analytics for multi-seller environments.",
    elevator_pitch: "Complete marketplace solution with vendor management, payment processing, order fulfillment, and advanced analytics for multi-seller environments.",
    longDescription: "Comprehensive marketplace platform enabling multiple vendors to sell products through a unified storefront. Features include vendor onboarding, product management, order processing, payment splitting, analytics, and mobile apps.",
    industry: "E-commerce Technology",
    category: "ecommerce",
    price: 35000, // $35,000
    currency: "USD",
    packageTier: "enterprise",
    ai_score: 89,
    views_count: 45,
    isFeatured: false,

    tech_stack: ["React", "Node.js", "MongoDB", "Elasticsearch", "AWS"],
    architecture: "Microservices",
    deployment: "Cloud Infrastructure",

    marketSize: "$24.3T+",
    profitMargin: "89%",
    developmentTime: "20+ months",
    revenueModel: "Commission + Subscription Fees",
    targetCustomers: "Marketplace Operators & Retailers",
    projectedARR: "$1.2-3.8M",
    timeToMarket: "4-7 months",

    thumbnailUrl: "/assets/platforms/marketplace-thumb.jpg",
    galleryImages: [
      {
        url: "/assets/platforms/marketplace-dashboard.jpg",
        alt: "Marketplace management dashboard",
        caption: "Advanced vendor and product management dashboard"
      }
    ],

    features: [
      "Multi-vendor management",
      "Product catalog system",
      "Order processing automation",
      "Payment splitting",
      "Vendor analytics dashboard",
      "Mobile marketplace apps",
      "Review and rating system",
      "Commission management"
    ],

    includes: [
      {
        category: "Marketplace Platform",
        items: [
          "Complete marketplace system",
          "Vendor and admin dashboards",
          "Mobile apps (iOS/Android)",
          "Payment processing integration"
        ]
      },
      {
        category: "Business Operations",
        items: [
          "Vendor onboarding materials",
          "Commission structure templates",
          "Marketing toolkit",
          "Operations playbook"
        ]
      }
    ],

    seller: {
      id: "marketplace-experts",
      name: "Marketplace Experts",
      avatar: "/assets/sellers/marketplace-avatar.jpg",
      rating: 4.7,
      reviewsCount: 13,
      verified: true,
      expertise: ["E-commerce", "Marketplace Development", "Payment Systems"],
      description: "E-commerce platform specialists with proven experience building scalable marketplace solutions."
    },

    status: "available",
    featured: false,
    urgency: "limited_time",
    exclusive: false,

    tags: ["E-commerce", "Marketplace", "Multi-vendor", "Mobile", "Analytics"],
    created_at: "2024-08-28T09:15:00Z",
    updated_at: "2024-09-16T11:30:00Z",

    // Offer system fields
    acceptsOffers: true,
    minOfferAmount: 28000, // 80% of asking price
    offerCount: 3,
    lastOfferDate: "2024-09-16T08:45:00Z"
  },

  {
    id: "iot-device-management",
    slug: "smart-iot-device-platform",
    title: "Smart IoT Device Management Platform",
    description: "Comprehensive IoT platform for device management, real-time monitoring, data analytics, and automated control systems for smart buildings and homes.",
    elevator_pitch: "Comprehensive IoT platform for device management, real-time monitoring, data analytics, and automated control systems for smart buildings and homes.",
    longDescription: "Advanced IoT platform providing complete device lifecycle management, real-time monitoring, predictive analytics, and automated control systems. Supports thousands of device types with edge computing capabilities.",
    industry: "Internet of Things",
    category: "iot-platform",
    price: 29000, // $29,000
    currency: "USD",
    packageTier: "enterprise",
    ai_score: 91,
    views_count: 19,
    isFeatured: false,

    tech_stack: ["Python", "InfluxDB", "MQTT", "Docker", "Kubernetes"],
    architecture: "Edge + Cloud",
    deployment: "Hybrid Cloud",

    marketSize: "$1.1T+",
    profitMargin: "94%",
    developmentTime: "19+ months",
    revenueModel: "SaaS + Device Licensing",
    targetCustomers: "Smart Building & Home Automation",
    projectedARR: "$900K-2.8M",
    timeToMarket: "3-6 months",

    thumbnailUrl: "/assets/platforms/iot-platform-thumb.jpg",
    galleryImages: [
      {
        url: "/assets/platforms/iot-dashboard.jpg",
        alt: "IoT device management dashboard",
        caption: "Real-time IoT device monitoring and control interface"
      }
    ],

    features: [
      "Device lifecycle management",
      "Real-time monitoring",
      "Predictive analytics",
      "Automated control systems",
      "Edge computing support",
      "Data visualization",
      "Alert management",
      "API integration"
    ],

    includes: [
      {
        category: "IoT Platform",
        items: [
          "Complete IoT management system",
          "Edge computing modules",
          "Device integration protocols",
          "Analytics engine"
        ]
      },
      {
        category: "Implementation",
        items: [
          "Device integration guides",
          "Deployment documentation",
          "Training materials",
          "Technical support"
        ]
      }
    ],

    seller: {
      id: "iot-innovators",
      name: "IoT Innovators",
      avatar: "/assets/sellers/iot-avatar.jpg",
      rating: 4.8,
      reviewsCount: 9,
      verified: true,
      expertise: ["IoT Development", "Edge Computing", "Device Management"],
      description: "IoT platform specialists with extensive experience in smart building and industrial automation systems."
    },

    status: "available",
    featured: false,
    urgency: null,
    exclusive: false,

    tags: ["IoT", "Smart Home", "Device Management", "Analytics", "Edge Computing"],
    created_at: "2024-09-04T14:20:00Z",
    updated_at: "2024-09-15T16:45:00Z",

    // Offer system fields
    acceptsOffers: true,
    minOfferAmount: 23200, // 80% of asking price
    offerCount: 0,
    lastOfferDate: null
  },

  {
    id: "crypto-trading-platform",
    slug: "advanced-crypto-trading-platform",
    title: "Advanced Crypto Trading Platform",
    description: "Professional cryptocurrency trading platform with advanced charting, algorithmic trading, portfolio management, and institutional-grade security.",
    elevator_pitch: "Professional cryptocurrency trading platform with advanced charting, algorithmic trading, portfolio management, and institutional-grade security.",
    longDescription: "Comprehensive cryptocurrency trading platform featuring advanced trading tools, real-time market data, algorithmic trading capabilities, portfolio management, and bank-level security measures. Supports all major cryptocurrencies and trading pairs.",
    industry: "Cryptocurrency",
    category: "fintech",
    price: 45000, // $45,000
    currency: "USD",
    packageTier: "enterprise",
    ai_score: 93,
    views_count: 127,
    isFeatured: true,

    tech_stack: ["Node.js", "React", "PostgreSQL", "WebSocket", "Blockchain APIs"],
    architecture: "Real-time Trading",
    deployment: "High-Performance Cloud",

    marketSize: "$3.2T+",
    profitMargin: "97%",
    developmentTime: "26+ months",
    revenueModel: "Trading Fees + Premium Features",
    targetCustomers: "Crypto Traders & Institutions",
    projectedARR: "$2.5-8M",
    timeToMarket: "6-9 months",

    thumbnailUrl: "/assets/platforms/crypto-platform-thumb.jpg",
    galleryImages: [
      {
        url: "/assets/platforms/crypto-dashboard.jpg",
        alt: "Crypto trading dashboard",
        caption: "Professional trading interface with advanced charting and analytics"
      }
    ],

    features: [
      "Advanced trading interface",
      "Real-time market data",
      "Algorithmic trading bots",
      "Portfolio management",
      "Multi-exchange connectivity",
      "Security & compliance",
      "Mobile trading apps",
      "Institutional features"
    ],

    includes: [
      {
        category: "Trading Platform",
        items: [
          "Complete trading system",
          "Mobile trading apps",
          "API trading tools",
          "Security infrastructure"
        ]
      },
      {
        category: "Regulatory & Business",
        items: [
          "Compliance framework",
          "Regulatory documentation",
          "Exchange partnership guides",
          "Institutional sales materials"
        ]
      }
    ],

    seller: {
      id: "crypto-builders",
      name: "Crypto Platform Builders",
      avatar: "/assets/sellers/crypto-avatar.jpg",
      rating: 4.9,
      reviewsCount: 16,
      verified: true,
      expertise: ["Cryptocurrency", "Trading Systems", "Blockchain"],
      description: "Cryptocurrency platform experts with deep trading system experience and regulatory knowledge."
    },

    status: "available",
    featured: true,
    urgency: null,
    exclusive: true,

    tags: ["Cryptocurrency", "Trading", "Blockchain", "FinTech", "Security"],
    created_at: "2024-08-25T10:30:00Z",
    updated_at: "2024-09-16T08:20:00Z",

    // Offer system fields
    acceptsOffers: false, // Premium platform, fixed price only
    minOfferAmount: null,
    offerCount: 0,
    lastOfferDate: null
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