// Success Acceleration Programs
import type { APIContext } from 'astro';

const DEFAULT_PROGRAMS = [
  {
    name: 'Idea to Launch Bootcamp',
    description: 'Comprehensive 90-day program to transform your business idea into a market-ready venture',
    programType: 'bootcamp',
    durationDays: 90,
    price: 299900, // $2,999
    maxParticipants: 20,
    curriculum: {
      modules: [
        {
          title: 'Week 1-2: Idea Validation & Market Research',
          topics: ['Market sizing', 'Customer interviews', 'Competitive analysis', 'Problem-solution fit'],
          deliverables: ['Market research report', 'Customer persona profiles']
        },
        {
          title: 'Week 3-4: Business Model Design',
          topics: ['Revenue streams', 'Cost structure', 'Value proposition canvas'],
          deliverables: ['Business model canvas', 'Financial projections']
        },
        {
          title: 'Week 5-8: MVP Development',
          topics: ['Product development', 'Technical architecture', 'UI/UX design'],
          deliverables: ['Working prototype', 'Technical documentation']
        },
        {
          title: 'Week 9-10: Go-to-Market Strategy',
          topics: ['Marketing plan', 'Sales funnel', 'Launch strategy'],
          deliverables: ['Marketing plan', 'Launch checklist']
        },
        {
          title: 'Week 11-12: Funding & Legal',
          topics: ['Pitch deck creation', 'Legal structure', 'Intellectual property'],
          deliverables: ['Investor pitch deck', 'Legal documents']
        }
      ],
      includedServices: ['Weekly group sessions', '1-on-1 mentoring', 'Expert reviews', 'Peer networking'],
      bonusFeatures: ['Lifetime access to materials', 'Alumni network', '90-day post-program support']
    },
    requirements: [
      'Serious commitment to building a business',
      'Available for weekly sessions',
      'Have a business idea to work on',
      'Basic computer skills'
    ]
  },
  {
    name: 'Expert Mentor Matching',
    description: 'Get paired with industry experts for personalized guidance and strategic advice',
    programType: 'mentorship',
    durationDays: 30,
    price: 19900, // $199/month
    maxParticipants: null, // Unlimited
    curriculum: {
      modules: [
        {
          title: 'Mentor Matching Process',
          topics: ['Skills assessment', 'Goal setting', 'Mentor selection'],
          deliverables: ['Matched mentor', 'Development plan']
        },
        {
          title: 'Monthly Mentoring Sessions',
          topics: ['Strategic guidance', 'Problem solving', 'Network introductions'],
          deliverables: ['Monthly progress reports', 'Action items']
        }
      ],
      includedServices: ['2 hours of mentoring per month', 'Email support', 'Resource library access'],
      bonusFeatures: ['Industry event invites', 'Peer mentor network']
    },
    requirements: [
      'Clear business goals',
      'Commitment to monthly sessions',
      'Openness to feedback'
    ]
  },
  {
    name: 'Investor Introduction Program',
    description: 'Connect with vetted investors and get your startup funding-ready',
    programType: 'investor_intro',
    durationDays: 60,
    price: 499900, // $4,999
    maxParticipants: 10,
    curriculum: {
      modules: [
        {
          title: 'Funding Readiness Assessment',
          topics: ['Business evaluation', 'Funding strategy', 'Valuation basics'],
          deliverables: ['Readiness report', 'Funding roadmap']
        },
        {
          title: 'Pitch Deck Perfection',
          topics: ['Storytelling', 'Financial modeling', 'Pitch practice'],
          deliverables: ['Investor-ready pitch deck', 'Financial model']
        },
        {
          title: 'Investor Matching & Introductions',
          topics: ['Investor research', 'Warm introductions', 'Due diligence prep'],
          deliverables: ['Investor target list', 'Introduction emails']
        }
      ],
      includedServices: ['Pitch coaching', 'Investor database access', 'Introduction facilitation'],
      bonusFeatures: ['Success fee structure', 'Post-funding support', 'Alumni investor network']
    },
    requirements: [
      'Working product or clear prototype',
      'Revenue or strong traction metrics',
      'Seeking $100K+ funding',
      'Full-time commitment to business'
    ]
  },
  {
    name: 'Patent & IP Protection Workshop',
    description: 'Learn to protect your intellectual property and navigate the patent process',
    programType: 'patent_assistance',
    durationDays: 14,
    price: 99900, // $999
    maxParticipants: 15,
    curriculum: {
      modules: [
        {
          title: 'IP Fundamentals',
          topics: ['Types of IP protection', 'Patent vs trademark vs copyright', 'Prior art search'],
          deliverables: ['IP assessment', 'Protection strategy']
        },
        {
          title: 'Patent Application Process',
          topics: ['Patent writing', 'Claims drafting', 'Filing procedures'],
          deliverables: ['Patent draft', 'Filing checklist']
        }
      ],
      includedServices: ['Legal expert sessions', 'IP database access', 'Filing assistance'],
      bonusFeatures: ['Patent attorney network', 'Ongoing IP monitoring']
    },
    requirements: [
      'Novel business idea or invention',
      'Technical documentation available',
      'Budget for patent filing fees'
    ]
  }
];

// Get all programs
export async function GET({ url, locals }: APIContext) {
  const { DB } = locals.runtime.env;
  const programType = url.searchParams.get('type');
  const userId = url.searchParams.get('userId');

  try {
    // Initialize programs if not exists
    await initializePrograms(DB);

    let query = `
      SELECT ap.*,
             COUNT(pe.id) as current_participants,
             COUNT(pe_completed.id) as completed_participants
      FROM acceleration_programs ap
      LEFT JOIN program_enrollments pe ON ap.id = pe.program_id AND pe.status IN ('enrolled', 'in_progress')
      LEFT JOIN program_enrollments pe_completed ON ap.id = pe_completed.program_id AND pe_completed.status = 'completed'
      WHERE ap.status = 'published'
    `;

    const params = [];

    if (programType) {
      query += ' AND ap.program_type = ?';
      params.push(programType);
    }

    query += ' GROUP BY ap.id ORDER BY ap.created_at DESC';

    const programs = await DB.prepare(query).bind(...params).all();

    // Get user enrollments if userId provided
    let userEnrollments = {};
    if (userId) {
      const enrollments = await DB.prepare(`
        SELECT program_id, status, progress_percentage, created_at
        FROM program_enrollments WHERE user_id = ?
      `).bind(userId).all();

      userEnrollments = enrollments.reduce((acc: any, enrollment: any) => {
        acc[enrollment.program_id] = enrollment;
        return acc;
      }, {});
    }

    return new Response(JSON.stringify({
      programs: programs.map(p => ({
        ...p,
        curriculum: JSON.parse(p.curriculum || '{}'),
        requirements: JSON.parse(p.requirements || '[]'),
        formattedPrice: `$${(p.price / 100).toLocaleString()}`,
        spotsRemaining: p.max_participants ? Math.max(0, p.max_participants - p.current_participants) : null,
        userEnrollment: userEnrollments[p.id] || null,
        successRate: p.completed_participants > 0 ? Math.round((p.completed_participants / (p.current_participants + p.completed_participants)) * 100) : null
      }))
    }), {
      headers: { 'Content-Type': 'application/json' }
    });

  } catch (error) {
    console.error('Error getting programs:', error);
    return new Response(JSON.stringify({ error: 'Failed to retrieve programs' }), {
      status: 500,
      headers: { 'Content-Type': 'application/json' }
    });
  }
}

// Enroll in program
export async function POST({ request, locals }: APIContext) {
  const { DB, STRIPE_SECRET_KEY } = locals.runtime.env;

  try {
    const { programId, userId } = await request.json();

    if (!programId || !userId) {
      return new Response(JSON.stringify({
        error: 'Program ID and User ID required'
      }), {
        status: 400,
        headers: { 'Content-Type': 'application/json' }
      });
    }

    // Get program details
    const program = await DB.prepare(`
      SELECT * FROM acceleration_programs WHERE id = ? AND status = 'published'
    `).bind(programId).first();

    if (!program) {
      return new Response(JSON.stringify({ error: 'Program not found' }), {
        status: 404,
        headers: { 'Content-Type': 'application/json' }
      });
    }

    // Check if user already enrolled
    const existingEnrollment = await DB.prepare(`
      SELECT * FROM program_enrollments WHERE program_id = ? AND user_id = ?
    `).bind(programId, userId).first();

    if (existingEnrollment) {
      return new Response(JSON.stringify({
        error: 'Already enrolled in this program',
        enrollment: existingEnrollment
      }), {
        status: 400,
        headers: { 'Content-Type': 'application/json' }
      });
    }

    // Check capacity
    if (program.max_participants) {
      const currentEnrollments = await DB.prepare(`
        SELECT COUNT(*) as count FROM program_enrollments
        WHERE program_id = ? AND status IN ('enrolled', 'in_progress')
      `).bind(programId).first();

      if (currentEnrollments.count >= program.max_participants) {
        return new Response(JSON.stringify({
          error: 'Program is full',
          waitlistAvailable: true
        }), {
          status: 400,
          headers: { 'Content-Type': 'application/json' }
        });
      }
    }

    // Create Stripe payment intent
    const paymentIntent = await createStripePaymentIntent(
      program.price,
      userId,
      programId,
      program.name,
      STRIPE_SECRET_KEY
    );

    // Create enrollment record
    const enrollmentResult = await DB.prepare(`
      INSERT INTO program_enrollments
      (program_id, user_id, status, progress_percentage, stripe_payment_intent_id, created_at, updated_at)
      VALUES (?, ?, 'enrolled', 0, ?, ?, ?)
    `).bind(
      programId,
      userId,
      paymentIntent.id,
      Math.floor(Date.now() / 1000),
      Math.floor(Date.now() / 1000)
    ).run();

    return new Response(JSON.stringify({
      success: true,
      enrollmentId: enrollmentResult.meta.last_row_id,
      paymentIntentId: paymentIntent.id,
      clientSecret: paymentIntent.client_secret,
      program: {
        name: program.name,
        price: program.price,
        formattedPrice: `$${(program.price / 100).toLocaleString()}`
      }
    }), {
      headers: { 'Content-Type': 'application/json' }
    });

  } catch (error) {
    console.error('Error enrolling in program:', error);
    return new Response(JSON.stringify({ error: 'Failed to enroll in program' }), {
      status: 500,
      headers: { 'Content-Type': 'application/json' }
    });
  }
}

// Update enrollment progress
export async function PUT({ request, locals }: APIContext) {
  const { DB } = locals.runtime.env;

  try {
    const { enrollmentId, userId, progressPercentage, status, feedbackRating, feedbackComment } = await request.json();

    if (!enrollmentId || !userId) {
      return new Response(JSON.stringify({
        error: 'Enrollment ID and User ID required'
      }), {
        status: 400,
        headers: { 'Content-Type': 'application/json' }
      });
    }

    // Verify enrollment ownership
    const enrollment = await DB.prepare(`
      SELECT * FROM program_enrollments WHERE id = ? AND user_id = ?
    `).bind(enrollmentId, userId).first();

    if (!enrollment) {
      return new Response(JSON.stringify({
        error: 'Enrollment not found or access denied'
      }), {
        status: 404,
        headers: { 'Content-Type': 'application/json' }
      });
    }

    const now = Math.floor(Date.now() / 1000);
    const updates: any = { updated_at: now };

    if (progressPercentage !== undefined) {
      updates.progress_percentage = Math.max(0, Math.min(100, progressPercentage));

      // Auto-update status based on progress
      if (progressPercentage >= 100 && enrollment.status !== 'completed') {
        updates.status = 'completed';
        updates.completion_date = now;
      } else if (progressPercentage > 0 && enrollment.status === 'enrolled') {
        updates.status = 'in_progress';
      }
    }

    if (status) updates.status = status;
    if (feedbackRating) updates.feedback_rating = feedbackRating;
    if (feedbackComment) updates.feedback_comment = feedbackComment;

    // Build dynamic update query
    const updateFields = Object.keys(updates).map(key => `${key} = ?`).join(', ');
    const updateValues = Object.values(updates);

    await DB.prepare(`
      UPDATE program_enrollments SET ${updateFields} WHERE id = ? AND user_id = ?
    `).bind(...updateValues, enrollmentId, userId).run();

    // Award points for completion
    if (updates.status === 'completed') {
      await awardCompletionReward(DB, userId, enrollment.program_id);
    }

    return new Response(JSON.stringify({
      success: true,
      message: 'Enrollment updated successfully',
      status: updates.status || enrollment.status,
      progressPercentage: updates.progress_percentage || enrollment.progress_percentage
    }), {
      headers: { 'Content-Type': 'application/json' }
    });

  } catch (error) {
    console.error('Error updating enrollment:', error);
    return new Response(JSON.stringify({ error: 'Failed to update enrollment' }), {
      status: 500,
      headers: { 'Content-Type': 'application/json' }
    });
  }
}

// Get user's enrollments
export async function PATCH({ request, locals }: APIContext) {
  const { DB } = locals.runtime.env;

  try {
    const { userId } = await request.json();

    if (!userId) {
      return new Response(JSON.stringify({ error: 'User ID required' }), {
        status: 400,
        headers: { 'Content-Type': 'application/json' }
      });
    }

    const enrollments = await DB.prepare(`
      SELECT pe.*, ap.name as program_name, ap.description, ap.program_type,
             ap.duration_days, ap.price, ap.curriculum
      FROM program_enrollments pe
      JOIN acceleration_programs ap ON pe.program_id = ap.id
      WHERE pe.user_id = ?
      ORDER BY pe.created_at DESC
    `).bind(userId).all();

    return new Response(JSON.stringify({
      enrollments: enrollments.map(e => ({
        ...e,
        curriculum: JSON.parse(e.curriculum || '{}'),
        formattedPrice: `$${(e.price / 100).toLocaleString()}`,
        createdAt: new Date(e.created_at * 1000).toISOString(),
        updatedAt: new Date(e.updated_at * 1000).toISOString(),
        completionDate: e.completion_date ? new Date(e.completion_date * 1000).toISOString() : null
      }))
    }), {
      headers: { 'Content-Type': 'application/json' }
    });

  } catch (error) {
    console.error('Error getting enrollments:', error);
    return new Response(JSON.stringify({ error: 'Failed to retrieve enrollments' }), {
      status: 500,
      headers: { 'Content-Type': 'application/json' }
    });
  }
}

async function initializePrograms(DB: any) {
  for (const program of DEFAULT_PROGRAMS) {
    await DB.prepare(`
      INSERT OR IGNORE INTO acceleration_programs
      (name, description, program_type, duration_days, price, max_participants,
       current_participants, curriculum, requirements, status, created_at, updated_at)
      VALUES (?, ?, ?, ?, ?, ?, 0, ?, ?, 'published', ?, ?)
    `).bind(
      program.name,
      program.description,
      program.programType,
      program.durationDays,
      program.price,
      program.maxParticipants,
      JSON.stringify(program.curriculum),
      JSON.stringify(program.requirements),
      Math.floor(Date.now() / 1000),
      Math.floor(Date.now() / 1000)
    ).run();
  }
}

async function createStripePaymentIntent(
  amount: number,
  userId: string,
  programId: string,
  programName: string,
  stripeSecretKey: string
) {
  if (!stripeSecretKey) {
    throw new Error('Stripe secret key not configured');
  }

  const response = await fetch('https://api.stripe.com/v1/payment_intents', {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${stripeSecretKey}`,
      'Content-Type': 'application/x-www-form-urlencoded'
    },
    body: new URLSearchParams({
      amount: amount.toString(),
      currency: 'usd',
      automatic_payment_methods: JSON.stringify({ enabled: true }),
      description: `TechFlunky Program: ${programName}`,
      metadata: JSON.stringify({
        userId,
        programId,
        type: 'program_enrollment'
      })
    })
  });

  if (!response.ok) {
    throw new Error('Failed to create payment intent');
  }

  return await response.json();
}

async function awardCompletionReward(DB: any, userId: string, programId: string) {
  // Get program details for reward calculation
  const program = await DB.prepare(`
    SELECT program_type, price FROM acceleration_programs WHERE id = ?
  `).bind(programId).first();

  if (!program) return;

  // Award reputation points based on program type and investment
  const basePoints = Math.min(5000, Math.round(program.price / 100)); // 1 point per dollar, max 5000
  const typeMultiplier = {
    bootcamp: 2.0,
    investor_intro: 1.5,
    mentorship: 1.2,
    patent_assistance: 1.3
  };

  const points = Math.round(basePoints * (typeMultiplier[program.program_type as keyof typeof typeMultiplier] || 1.0));

  // Update reputation
  await fetch('/api/gamification/reputation', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      userId,
      action: 'program_completed',
      data: { programId, programType: program.program_type, pointsAwarded: points }
    })
  });

  // Trigger achievement check
  await fetch('/api/gamification/achievements', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      userId,
      triggerType: 'program_completed',
      data: { programId, programType: program.program_type }
    })
  });
}