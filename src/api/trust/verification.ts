// Trust & Safety: Identity Verification System
import type { APIContext } from 'astro';

interface VerificationRequest {
  userId: string;
  verificationType: 'email' | 'phone' | 'id_document' | 'business_license' | 'bank_account';
  verificationData: Record<string, any>;
}

// Submit verification request
export async function POST({ request, locals }: APIContext) {
  const { DB } = locals.runtime.env;

  try {
    const data: VerificationRequest = await request.json();
    const { userId, verificationType, verificationData } = data;

    if (!userId || !verificationType) {
      return new Response(JSON.stringify({
        error: 'User ID and verification type required'
      }), {
        status: 400,
        headers: { 'Content-Type': 'application/json' }
      });
    }

    const now = Math.floor(Date.now() / 1000);
    let expiresAt = null;

    // Set expiration dates based on verification type
    switch (verificationType) {
      case 'email':
      case 'phone':
        expiresAt = now + (24 * 60 * 60); // 24 hours
        break;
      case 'id_document':
        expiresAt = now + (365 * 24 * 60 * 60); // 1 year
        break;
      case 'business_license':
        expiresAt = now + (2 * 365 * 24 * 60 * 60); // 2 years
        break;
      case 'bank_account':
        expiresAt = now + (90 * 24 * 60 * 60); // 90 days
        break;
    }

    // Check if verification already exists
    const existingVerification = await DB.prepare(`
      SELECT * FROM identity_verifications
      WHERE user_id = ? AND verification_type = ?
      ORDER BY created_at DESC LIMIT 1
    `).bind(userId, verificationType).first();

    if (existingVerification && existingVerification.status === 'verified') {
      return new Response(JSON.stringify({
        error: 'Already verified for this type',
        verification: existingVerification
      }), {
        status: 400,
        headers: { 'Content-Type': 'application/json' }
      });
    }

    let status = 'pending';
    let verifiedAt = null;

    // Auto-verify certain types (for demo purposes)
    if (verificationType === 'email') {
      status = 'verified';
      verifiedAt = now;
    }

    // Store verification request
    const result = await DB.prepare(`
      INSERT INTO identity_verifications
      (user_id, verification_type, status, verification_data, verified_at, expires_at, created_at, updated_at)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?)
    `).bind(
      userId,
      verificationType,
      status,
      JSON.stringify(verificationData),
      verifiedAt,
      expiresAt,
      now,
      now
    ).run();

    // Award reputation points for verification
    if (status === 'verified') {
      await updateReputationForVerification(DB, userId, verificationType);
    }

    return new Response(JSON.stringify({
      success: true,
      verificationId: result.meta.last_row_id,
      status,
      message: getVerificationMessage(verificationType, status)
    }), {
      headers: { 'Content-Type': 'application/json' }
    });

  } catch (error) {
    console.error('Error submitting verification:', error);
    return new Response(JSON.stringify({ error: 'Failed to submit verification' }), {
      status: 500,
      headers: { 'Content-Type': 'application/json' }
    });
  }
}

// Get user verifications
export async function GET({ url, locals }: APIContext) {
  const { DB } = locals.runtime.env;
  const userId = url.searchParams.get('userId');

  if (!userId) {
    return new Response(JSON.stringify({ error: 'User ID required' }), {
      status: 400,
      headers: { 'Content-Type': 'application/json' }
    });
  }

  try {
    const verifications = await DB.prepare(`
      SELECT id, verification_type, status, verified_at, expires_at, created_at, updated_at
      FROM identity_verifications
      WHERE user_id = ?
      ORDER BY created_at DESC
    `).bind(userId).all();

    // Get verification status summary
    const verificationStatus = {
      email: false,
      phone: false,
      identity: false,
      business: false,
      bankAccount: false
    };

    verifications.forEach(v => {
      if (v.status === 'verified') {
        switch (v.verification_type) {
          case 'email':
            verificationStatus.email = true;
            break;
          case 'phone':
            verificationStatus.phone = true;
            break;
          case 'id_document':
            verificationStatus.identity = true;
            break;
          case 'business_license':
            verificationStatus.business = true;
            break;
          case 'bank_account':
            verificationStatus.bankAccount = true;
            break;
        }
      }
    });

    // Calculate trust score
    const trustScore = calculateTrustScore(verificationStatus);
    const trustLevel = getTrustLevel(trustScore);

    return new Response(JSON.stringify({
      verifications,
      verificationStatus,
      trustScore,
      trustLevel,
      benefits: getTrustBenefits(trustLevel)
    }), {
      headers: { 'Content-Type': 'application/json' }
    });

  } catch (error) {
    console.error('Error getting verifications:', error);
    return new Response(JSON.stringify({ error: 'Failed to retrieve verifications' }), {
      status: 500,
      headers: { 'Content-Type': 'application/json' }
    });
  }
}

// Admin: Update verification status
export async function PUT({ request, locals }: APIContext) {
  const { DB } = locals.runtime.env;

  try {
    const { verificationId, status, adminNotes } = await request.json();

    if (!verificationId || !status) {
      return new Response(JSON.stringify({
        error: 'Verification ID and status required'
      }), {
        status: 400,
        headers: { 'Content-Type': 'application/json' }
      });
    }

    const now = Math.floor(Date.now() / 1000);
    const verifiedAt = status === 'verified' ? now : null;

    // Update verification status
    await DB.prepare(`
      UPDATE identity_verifications
      SET status = ?, verified_at = ?, updated_at = ?
      WHERE id = ?
    `).bind(status, verifiedAt, now, verificationId).run();

    // Get verification details for reputation update
    const verification = await DB.prepare(`
      SELECT user_id, verification_type FROM identity_verifications WHERE id = ?
    `).bind(verificationId).first();

    if (verification && status === 'verified') {
      await updateReputationForVerification(DB, verification.user_id, verification.verification_type);
    }

    return new Response(JSON.stringify({
      success: true,
      message: `Verification ${status} successfully`
    }), {
      headers: { 'Content-Type': 'application/json' }
    });

  } catch (error) {
    console.error('Error updating verification:', error);
    return new Response(JSON.stringify({ error: 'Failed to update verification' }), {
      status: 500,
      headers: { 'Content-Type': 'application/json' }
    });
  }
}

async function updateReputationForVerification(DB: any, userId: string, verificationType: string) {
  const pointsMap = {
    email: 50,
    phone: 75,
    id_document: 200,
    business_license: 300,
    bank_account: 150
  };

  const points = pointsMap[verificationType as keyof typeof pointsMap] || 0;

  if (points > 0) {
    // Update reputation points
    await DB.prepare(`
      INSERT OR REPLACE INTO user_reputation
      (user_id, total_points, created_at, updated_at)
      VALUES (
        ?,
        COALESCE((SELECT total_points FROM user_reputation WHERE user_id = ?), 0) + ?,
        COALESCE((SELECT created_at FROM user_reputation WHERE user_id = ?), ?),
        ?
      )
    `).bind(userId, userId, points, userId, Math.floor(Date.now() / 1000), Math.floor(Date.now() / 1000)).run();

    // Trigger achievement check
    try {
      await fetch('/api/gamification/achievements', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          userId,
          triggerType: 'verification_completed',
          data: { verificationType, pointsAwarded: points }
        })
      });
    } catch (error) {
      console.error('Error triggering achievement check:', error);
    }
  }
}

function getVerificationMessage(type: string, status: string): string {
  const messages = {
    email: {
      pending: 'Please check your email and click the verification link.',
      verified: 'Email address verified successfully!',
      rejected: 'Email verification failed. Please try again.'
    },
    phone: {
      pending: 'We\'ve sent a verification code to your phone.',
      verified: 'Phone number verified successfully!',
      rejected: 'Phone verification failed. Please check the code and try again.'
    },
    id_document: {
      pending: 'Your ID document is being reviewed. This may take 1-3 business days.',
      verified: 'Identity document verified successfully!',
      rejected: 'ID document verification failed. Please submit a clear, valid document.'
    },
    business_license: {
      pending: 'Your business license is being reviewed. This may take 2-5 business days.',
      verified: 'Business license verified successfully!',
      rejected: 'Business license verification failed. Please submit valid documentation.'
    },
    bank_account: {
      pending: 'Bank account verification in progress. Small test deposits will be made.',
      verified: 'Bank account verified successfully!',
      rejected: 'Bank account verification failed. Please check your details.'
    }
  };

  return messages[type as keyof typeof messages]?.[status as keyof typeof messages[typeof type]] ||
         `Verification ${status}.`;
}

function calculateTrustScore(verificationStatus: Record<string, boolean>): number {
  const weights = {
    email: 10,
    phone: 15,
    identity: 30,
    business: 25,
    bankAccount: 20
  };

  let score = 0;
  Object.entries(verificationStatus).forEach(([key, verified]) => {
    if (verified) {
      score += weights[key as keyof typeof weights];
    }
  });

  return score;
}

function getTrustLevel(trustScore: number): string {
  if (trustScore >= 90) return 'Highly Trusted';
  if (trustScore >= 70) return 'Trusted';
  if (trustScore >= 40) return 'Verified';
  if (trustScore >= 10) return 'Basic';
  return 'Unverified';
}

function getTrustBenefits(trustLevel: string): string[] {
  const benefits = {
    'Highly Trusted': [
      'All verification badges',
      'Priority customer support',
      'Featured listing placement',
      'Reduced escrow holds',
      'Higher transaction limits',
      'Beta feature access'
    ],
    'Trusted': [
      'Most verification badges',
      'Priority support',
      'Featured placement eligible',
      'Standard escrow terms',
      'Higher limits'
    ],
    'Verified': [
      'Basic verification badges',
      'Standard support',
      'Normal transaction limits'
    ],
    'Basic': [
      'Email verification badge',
      'Standard features'
    ],
    'Unverified': [
      'Limited features',
      'Transaction restrictions'
    ]
  };

  return benefits[trustLevel as keyof typeof benefits] || [];
}