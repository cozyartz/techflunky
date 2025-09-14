// Industry Expert Management System
import type { APIContext } from 'astro';

interface ExpertApplication {
  userId: string;
  verticalId: string;
  expertiseLevel: 'consultant' | 'specialist' | 'expert' | 'authority';
  credentials: string[];
  hourlyRate: number; // in cents
  bio: string;
  specialties: string[];
  languages: string[];
  portfolioUrls?: string[];
  yearsExperience: number;
  certifications: string[];
}

// Apply to become an expert
export async function POST({ request, locals }: APIContext) {
  const { DB } = locals.runtime.env;

  try {
    const application: ExpertApplication = await request.json();
    const {
      userId,
      verticalId,
      expertiseLevel = 'consultant',
      credentials = [],
      hourlyRate = 0,
      bio,
      specialties = [],
      languages = ['English'],
      portfolioUrls = [],
      yearsExperience = 0,
      certifications = []
    } = application;

    if (!userId || !verticalId || !bio) {
      return new Response(JSON.stringify({
        error: 'User ID, vertical ID, and bio are required'
      }), {
        status: 400,
        headers: { 'Content-Type': 'application/json' }
      });
    }

    // Check if user already is an expert in this vertical
    const existingExpert = await DB.prepare(`
      SELECT * FROM industry_experts WHERE user_id = ? AND vertical_id = ?
    `).bind(userId, verticalId).first();

    if (existingExpert) {
      return new Response(JSON.stringify({
        error: 'Already an expert in this vertical',
        expertProfile: existingExpert
      }), {
        status: 400,
        headers: { 'Content-Type': 'application/json' }
      });
    }

    // Get vertical requirements
    const vertical = await DB.prepare(`
      SELECT * FROM industry_verticals WHERE id = ?
    `).bind(verticalId).first();

    if (!vertical) {
      return new Response(JSON.stringify({ error: 'Vertical not found' }), {
        status: 404,
        headers: { 'Content-Type': 'application/json' }
      });
    }

    // Validate expert application against requirements
    const requirements = JSON.parse(vertical.expert_requirements || '{}');
    const validationResult = validateExpertApplication(application, requirements);

    if (!validationResult.isValid) {
      return new Response(JSON.stringify({
        error: 'Application does not meet requirements',
        missingRequirements: validationResult.missingRequirements,
        requirements
      }), {
        status: 400,
        headers: { 'Content-Type': 'application/json' }
      });
    }

    const now = Math.floor(Date.now() / 1000);

    // Create expert profile
    const result = await DB.prepare(`
      INSERT INTO industry_experts
      (user_id, vertical_id, expertise_level, credentials, hourly_rate,
       availability_status, bio, specialties, languages, rating, total_sessions,
       created_at, updated_at)
      VALUES (?, ?, ?, ?, ?, 'available', ?, ?, ?, 0, 0, ?, ?)
    `).bind(
      userId,
      verticalId,
      expertiseLevel,
      JSON.stringify({
        credentials,
        portfolioUrls,
        yearsExperience,
        certifications
      }),
      hourlyRate,
      bio,
      JSON.stringify(specialties),
      JSON.stringify(languages),
      now,
      now
    ).run();

    // Award reputation points for becoming an expert
    await updateReputationForExpertStatus(DB, userId, verticalId, expertiseLevel);

    // Trigger achievement check
    await fetch('/api/gamification/achievements', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        userId,
        triggerType: 'expert_approved',
        data: { verticalId, expertiseLevel }
      })
    });

    return new Response(JSON.stringify({
      success: true,
      expertId: result.meta.last_row_id,
      message: 'Expert profile created successfully',
      expertiseLevel
    }), {
      headers: { 'Content-Type': 'application/json' }
    });

  } catch (error) {
    console.error('Error creating expert profile:', error);
    return new Response(JSON.stringify({ error: 'Failed to create expert profile' }), {
      status: 500,
      headers: { 'Content-Type': 'application/json' }
    });
  }
}

// Get expert profiles
export async function GET({ url, locals }: APIContext) {
  const { DB } = locals.runtime.env;
  const verticalId = url.searchParams.get('verticalId');
  const userId = url.searchParams.get('userId');
  const expertId = url.searchParams.get('expertId');

  try {
    if (expertId) {
      // Get specific expert profile
      const expert = await getExpertProfile(DB, expertId);
      return new Response(JSON.stringify({ expert }), {
        headers: { 'Content-Type': 'application/json' }
      });

    } else if (userId) {
      // Get user's expert profiles
      const profiles = await DB.prepare(`
        SELECT ie.*, iv.name as vertical_name, iv.slug as vertical_slug
        FROM industry_experts ie
        JOIN industry_verticals iv ON ie.vertical_id = iv.id
        WHERE ie.user_id = ?
        ORDER BY ie.created_at DESC
      `).bind(userId).all();

      return new Response(JSON.stringify({
        expertProfiles: profiles.map(p => ({
          ...p,
          credentials: JSON.parse(p.credentials || '{}'),
          specialties: JSON.parse(p.specialties || '[]'),
          languages: JSON.parse(p.languages || '[]')
        }))
      }), {
        headers: { 'Content-Type': 'application/json' }
      });

    } else if (verticalId) {
      // Get experts for a specific vertical
      const experts = await DB.prepare(`
        SELECT ie.*, u.name, p.avatar_url, p.company,
               ur.seller_score, ur.trust_level
        FROM industry_experts ie
        JOIN users u ON ie.user_id = u.id
        LEFT JOIN profiles p ON u.id = p.user_id
        LEFT JOIN user_reputation ur ON u.id = ur.user_id
        WHERE ie.vertical_id = ?
        ORDER BY ie.rating DESC, ie.total_sessions DESC
      `).bind(verticalId).all();

      return new Response(JSON.stringify({
        experts: experts.map(e => ({
          ...e,
          credentials: JSON.parse(e.credentials || '{}'),
          specialties: JSON.parse(e.specialties || '[]'),
          languages: JSON.parse(e.languages || '[]'),
          hourlyRateFormatted: e.hourly_rate ? `$${(e.hourly_rate / 100)}/hour` : 'Contact for rate'
        }))
      }), {
        headers: { 'Content-Type': 'application/json' }
      });

    } else {
      // Get all experts with pagination
      const page = parseInt(url.searchParams.get('page') || '1');
      const limit = parseInt(url.searchParams.get('limit') || '20');
      const offset = (page - 1) * limit;

      const experts = await DB.prepare(`
        SELECT ie.*, u.name, p.avatar_url, p.company,
               iv.name as vertical_name, iv.slug as vertical_slug,
               ur.seller_score, ur.trust_level
        FROM industry_experts ie
        JOIN users u ON ie.user_id = u.id
        JOIN industry_verticals iv ON ie.vertical_id = iv.id
        LEFT JOIN profiles p ON u.id = p.user_id
        LEFT JOIN user_reputation ur ON u.id = ur.user_id
        ORDER BY ie.rating DESC, ie.total_sessions DESC
        LIMIT ? OFFSET ?
      `).bind(limit, offset).all();

      const totalCount = await DB.prepare(`
        SELECT COUNT(*) as count FROM industry_experts
      `).first();

      return new Response(JSON.stringify({
        experts: experts.map(e => ({
          ...e,
          credentials: JSON.parse(e.credentials || '{}'),
          specialties: JSON.parse(e.specialties || '[]'),
          languages: JSON.parse(e.languages || '[]'),
          hourlyRateFormatted: e.hourly_rate ? `$${(e.hourly_rate / 100)}/hour` : 'Contact for rate'
        })),
        pagination: {
          page,
          limit,
          totalCount: totalCount.count,
          totalPages: Math.ceil(totalCount.count / limit)
        }
      }), {
        headers: { 'Content-Type': 'application/json' }
      });
    }

  } catch (error) {
    console.error('Error getting experts:', error);
    return new Response(JSON.stringify({ error: 'Failed to retrieve experts' }), {
      status: 500,
      headers: { 'Content-Type': 'application/json' }
    });
  }
}

// Update expert profile
export async function PUT({ request, locals }: APIContext) {
  const { DB } = locals.runtime.env;

  try {
    const {
      expertId,
      userId,
      hourlyRate,
      availabilityStatus,
      bio,
      specialties,
      languages,
      credentials
    } = await request.json();

    if (!expertId || !userId) {
      return new Response(JSON.stringify({
        error: 'Expert ID and User ID required'
      }), {
        status: 400,
        headers: { 'Content-Type': 'application/json' }
      });
    }

    // Verify ownership
    const expert = await DB.prepare(`
      SELECT * FROM industry_experts WHERE id = ? AND user_id = ?
    `).bind(expertId, userId).first();

    if (!expert) {
      return new Response(JSON.stringify({
        error: 'Expert profile not found or access denied'
      }), {
        status: 404,
        headers: { 'Content-Type': 'application/json' }
      });
    }

    const now = Math.floor(Date.now() / 1000);

    // Update expert profile
    await DB.prepare(`
      UPDATE industry_experts
      SET hourly_rate = COALESCE(?, hourly_rate),
          availability_status = COALESCE(?, availability_status),
          bio = COALESCE(?, bio),
          specialties = COALESCE(?, specialties),
          languages = COALESCE(?, languages),
          credentials = COALESCE(?, credentials),
          updated_at = ?
      WHERE id = ? AND user_id = ?
    `).bind(
      hourlyRate,
      availabilityStatus,
      bio,
      specialties ? JSON.stringify(specialties) : null,
      languages ? JSON.stringify(languages) : null,
      credentials ? JSON.stringify(credentials) : null,
      now,
      expertId,
      userId
    ).run();

    return new Response(JSON.stringify({
      success: true,
      message: 'Expert profile updated successfully'
    }), {
      headers: { 'Content-Type': 'application/json' }
    });

  } catch (error) {
    console.error('Error updating expert profile:', error);
    return new Response(JSON.stringify({ error: 'Failed to update expert profile' }), {
      status: 500,
      headers: { 'Content-Type': 'application/json' }
    });
  }
}

// Book expert session or rate expert
export async function PATCH({ request, locals }: APIContext) {
  const { DB } = locals.runtime.env;

  try {
    const { action, expertId, userId, rating, feedback } = await request.json();

    if (!action || !expertId || !userId) {
      return new Response(JSON.stringify({
        error: 'Action, expert ID, and user ID required'
      }), {
        status: 400,
        headers: { 'Content-Type': 'application/json' }
      });
    }

    if (action === 'rate') {
      if (!rating || rating < 1 || rating > 5) {
        return new Response(JSON.stringify({
          error: 'Rating must be between 1 and 5'
        }), {
          status: 400,
          headers: { 'Content-Type': 'application/json' }
        });
      }

      // Update expert rating
      const expert = await DB.prepare(`
        SELECT rating, total_sessions FROM industry_experts WHERE id = ?
      `).bind(expertId).first();

      if (!expert) {
        return new Response(JSON.stringify({ error: 'Expert not found' }), {
          status: 404,
          headers: { 'Content-Type': 'application/json' }
        });
      }

      // Calculate new average rating
      const currentTotal = expert.rating * expert.total_sessions;
      const newTotal = currentTotal + rating;
      const newSessionCount = expert.total_sessions + 1;
      const newAverageRating = newTotal / newSessionCount;

      await DB.prepare(`
        UPDATE industry_experts
        SET rating = ?, total_sessions = ?, updated_at = ?
        WHERE id = ?
      `).bind(
        newAverageRating,
        newSessionCount,
        Math.floor(Date.now() / 1000),
        expertId
      ).run();

      // Store individual rating
      await DB.prepare(`
        INSERT INTO reviews
        (reviewer_id, reviewed_id, rating, comment, created_at)
        VALUES (?, (SELECT user_id FROM industry_experts WHERE id = ?), ?, ?, ?)
      `).bind(
        userId,
        expertId,
        rating,
        feedback || '',
        Math.floor(Date.now() / 1000)
      ).run();

      // Update expert's reputation
      const expertUserId = await DB.prepare(`
        SELECT user_id FROM industry_experts WHERE id = ?
      `).bind(expertId).first();

      if (expertUserId) {
        await fetch('/api/gamification/reputation', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            userId: expertUserId.user_id,
            action: 'review_received',
            data: { rating, expertSession: true }
          })
        });
      }

      return new Response(JSON.stringify({
        success: true,
        newRating: newAverageRating,
        totalSessions: newSessionCount,
        message: 'Expert rated successfully'
      }), {
        headers: { 'Content-Type': 'application/json' }
      });

    } else if (action === 'book') {
      // In a full implementation, this would integrate with a scheduling system
      // For now, we'll just track the interest
      await DB.prepare(`
        INSERT INTO analytics
        (user_id, event_type, metadata, created_at)
        VALUES (?, 'expert_booking_interest', ?, ?)
      `).bind(
        userId,
        JSON.stringify({ expertId, timestamp: Date.now() }),
        Math.floor(Date.now() / 1000)
      ).run();

      return new Response(JSON.stringify({
        success: true,
        message: 'Booking interest recorded. Expert will be notified.',
        nextSteps: 'The expert will contact you within 24 hours to schedule.'
      }), {
        headers: { 'Content-Type': 'application/json' }
      });

    } else {
      return new Response(JSON.stringify({
        error: 'Invalid action. Supported actions: rate, book'
      }), {
        status: 400,
        headers: { 'Content-Type': 'application/json' }
      });
    }

  } catch (error) {
    console.error('Error processing expert action:', error);
    return new Response(JSON.stringify({ error: 'Failed to process expert action' }), {
      status: 500,
      headers: { 'Content-Type': 'application/json' }
    });
  }
}

async function getExpertProfile(DB: any, expertId: string) {
  const expert = await DB.prepare(`
    SELECT ie.*, u.name, u.email, p.avatar_url, p.company, p.website,
           iv.name as vertical_name, iv.slug as vertical_slug,
           ur.seller_score, ur.trust_level, ur.total_points
    FROM industry_experts ie
    JOIN users u ON ie.user_id = u.id
    JOIN industry_verticals iv ON ie.vertical_id = iv.id
    LEFT JOIN profiles p ON u.id = p.user_id
    LEFT JOIN user_reputation ur ON u.id = ur.user_id
    WHERE ie.id = ?
  `).bind(expertId).first();

  if (!expert) return null;

  // Get recent reviews
  const reviews = await DB.prepare(`
    SELECT r.*, u.name as reviewer_name, p.avatar_url as reviewer_avatar
    FROM reviews r
    JOIN users u ON r.reviewer_id = u.id
    LEFT JOIN profiles p ON u.id = p.user_id
    WHERE r.reviewed_id = ?
    ORDER BY r.created_at DESC
    LIMIT 5
  `).bind(expert.user_id).all();

  return {
    ...expert,
    credentials: JSON.parse(expert.credentials || '{}'),
    specialties: JSON.parse(expert.specialties || '[]'),
    languages: JSON.parse(expert.languages || '[]'),
    hourlyRateFormatted: expert.hourly_rate ? `$${(expert.hourly_rate / 100)}/hour` : 'Contact for rate',
    reviews: reviews.map(r => ({
      ...r,
      timeAgo: getTimeAgo(r.created_at)
    }))
  };
}

function validateExpertApplication(application: ExpertApplication, requirements: any): {
  isValid: boolean;
  missingRequirements: string[];
} {
  const missing: string[] = [];

  // Check minimum experience
  if (requirements.experience && application.yearsExperience < 1) {
    missing.push('Minimum 1 year of experience required');
  }

  // Check required certifications
  if (requirements.certifications && requirements.certifications.length > 0) {
    const hasRequiredCert = requirements.certifications.some((cert: string) =>
      application.certifications.some(userCert =>
        userCert.toLowerCase().includes(cert.toLowerCase())
      )
    );

    if (!hasRequiredCert) {
      missing.push(`Required certification in: ${requirements.certifications.join(', ')}`);
    }
  }

  // Check bio length
  if (!application.bio || application.bio.length < 100) {
    missing.push('Bio must be at least 100 characters');
  }

  // Check specialties
  if (!application.specialties || application.specialties.length === 0) {
    missing.push('At least one specialty is required');
  }

  return {
    isValid: missing.length === 0,
    missingRequirements: missing
  };
}

async function updateReputationForExpertStatus(DB: any, userId: string, verticalId: string, expertiseLevel: string) {
  const pointsMap = {
    consultant: 500,
    specialist: 1000,
    expert: 2000,
    authority: 5000
  };

  const points = pointsMap[expertiseLevel as keyof typeof pointsMap] || 500;

  await fetch('/api/gamification/reputation', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      userId,
      action: 'expert_status_achieved',
      data: { verticalId, expertiseLevel, pointsAwarded: points }
    })
  });
}

function getTimeAgo(timestamp: number): string {
  const seconds = Math.floor(Date.now() / 1000 - timestamp);

  if (seconds < 60) return `${seconds}s ago`;
  if (seconds < 3600) return `${Math.floor(seconds / 60)}m ago`;
  if (seconds < 86400) return `${Math.floor(seconds / 3600)}h ago`;
  if (seconds < 2592000) return `${Math.floor(seconds / 86400)}d ago`;
  return `${Math.floor(seconds / 2592000)}mo ago`;
}