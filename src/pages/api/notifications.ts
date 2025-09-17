// Notifications API
import type { APIContext } from 'astro';

export async function GET({ locals }: APIContext) {
  const { DB } = locals.runtime?.env || {};

  return new Response(JSON.stringify({
    success: true,
    data: [],
    note: DB ? 'Live notifications' : 'Demo data - Database not configured'
  }), {
    status: 200,
    headers: { 'Content-Type': 'application/json' }
  });
}

export async function POST({ request, locals }: APIContext) {
  const { DB } = locals.runtime?.env || {};

  try {
    const body = await request.json();
    const { message, type = 'info', userId } = body;

    if (!message) {
      return new Response(JSON.stringify({
        success: false,
        error: 'Message required'
      }), {
        status: 400,
        headers: { 'Content-Type': 'application/json' }
      });
    }

    return new Response(JSON.stringify({
      success: true,
      message: 'Notification created',
      note: DB ? 'Live notification' : 'Demo notification - Database not configured'
    }), {
      status: 201,
      headers: { 'Content-Type': 'application/json' }
    });

  } catch (error) {
    return new Response(JSON.stringify({
      success: false,
      error: 'Failed to create notification'
    }), {
      status: 500,
      headers: { 'Content-Type': 'application/json' }
    });
  }
}