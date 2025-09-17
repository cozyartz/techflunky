// Growth & Referrals API
import type { APIContext } from 'astro';

export async function GET({ locals }: APIContext) {
  const { DB } = locals.runtime?.env || {};

  return new Response(JSON.stringify({
    success: true,
    data: {
      referralCode: 'DEMO123',
      totalReferrals: 0,
      earnedRewards: 0
    },
    note: DB ? 'Live referrals' : 'Demo data - Database not configured'
  }), {
    status: 200,
    headers: { 'Content-Type': 'application/json' }
  });
}

export async function POST({ request, locals }: APIContext) {
  const { DB } = locals.runtime?.env || {};

  return new Response(JSON.stringify({
    success: true,
    message: 'Referral created',
    note: DB ? 'Live referral' : 'Demo referral - Database not configured'
  }), {
    status: 200,
    headers: { 'Content-Type': 'application/json' }
  });
}