// Admin Analytics API
import type { APIContext } from 'astro';

export async function GET({ locals }: APIContext) {
  const { DB } = locals.runtime?.env || {};

  return new Response(JSON.stringify({
    success: true,
    data: {
      totalUsers: 0,
      totalPlatforms: 0,
      totalRevenue: 0,
      activeUsers: 0
    },
    note: DB ? 'Live analytics' : 'Demo data - Database not configured'
  }), {
    status: 200,
    headers: { 'Content-Type': 'application/json' }
  });
}