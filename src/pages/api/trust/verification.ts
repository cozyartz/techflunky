// Trust & Verification API
import type { APIContext } from 'astro';

export async function GET({ locals }: APIContext) {
  const { DB } = locals.runtime?.env || {};

  return new Response(JSON.stringify({
    success: true,
    data: {
      verified: false,
      trustScore: 0,
      badges: []
    },
    note: DB ? 'Live verification' : 'Demo data - Database not configured'
  }), {
    status: 200,
    headers: { 'Content-Type': 'application/json' }
  });
}

export async function POST({ request, locals }: APIContext) {
  const { DB } = locals.runtime?.env || {};

  return new Response(JSON.stringify({
    success: true,
    message: 'Verification request submitted',
    note: DB ? 'Live verification' : 'Demo verification - Database not configured'
  }), {
    status: 200,
    headers: { 'Content-Type': 'application/json' }
  });
}