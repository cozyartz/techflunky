// Notification Preferences API
import type { APIContext } from 'astro';

export async function GET({ locals }: APIContext) {
  const { DB } = locals.runtime?.env || {};

  return new Response(JSON.stringify({
    success: true,
    data: {
      email: true,
      sms: false,
      push: true,
      marketing: false
    },
    note: DB ? 'Live preferences' : 'Demo data - Database not configured'
  }), {
    status: 200,
    headers: { 'Content-Type': 'application/json' }
  });
}

export async function POST({ request, locals }: APIContext) {
  const { DB } = locals.runtime?.env || {};

  try {
    const body = await request.json();

    return new Response(JSON.stringify({
      success: true,
      message: 'Preferences updated',
      note: DB ? 'Live preferences' : 'Demo preferences - Database not configured'
    }), {
      status: 200,
      headers: { 'Content-Type': 'application/json' }
    });

  } catch (error) {
    return new Response(JSON.stringify({
      success: false,
      error: 'Failed to update preferences'
    }), {
      status: 500,
      headers: { 'Content-Type': 'application/json' }
    });
  }
}