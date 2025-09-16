import type { APIRoute } from 'astro';

// In a real implementation, this would connect to a database
// For now, we'll simulate view tracking with in-memory storage
const viewCounts = new Map<string, number>();

export const POST: APIRoute = async ({ request }) => {
  try {
    const { platformId } = await request.json();

    if (!platformId) {
      return new Response(JSON.stringify({ error: 'Platform ID is required' }), {
        status: 400,
        headers: { 'Content-Type': 'application/json' }
      });
    }

    // Get current view count (in real app, this would be from database)
    const currentCount = viewCounts.get(platformId) || 0;
    const newCount = currentCount + 1;

    // Update view count (in real app, this would update database)
    viewCounts.set(platformId, newCount);

    // In production, you would:
    // 1. Update the database record
    // 2. Cache the result
    // 3. Possibly rate limit by IP to prevent spam

    return new Response(JSON.stringify({
      success: true,
      platformId,
      newCount
    }), {
      status: 200,
      headers: { 'Content-Type': 'application/json' }
    });

  } catch (error) {
    console.error('Error tracking view:', error);
    return new Response(JSON.stringify({ error: 'Failed to track view' }), {
      status: 500,
      headers: { 'Content-Type': 'application/json' }
    });
  }
};

export const GET: APIRoute = async ({ url }) => {
  try {
    const platformId = url.searchParams.get('platformId');

    if (!platformId) {
      return new Response(JSON.stringify({ error: 'Platform ID is required' }), {
        status: 400,
        headers: { 'Content-Type': 'application/json' }
      });
    }

    const count = viewCounts.get(platformId) || 0;

    return new Response(JSON.stringify({
      platformId,
      viewCount: count
    }), {
      status: 200,
      headers: { 'Content-Type': 'application/json' }
    });

  } catch (error) {
    console.error('Error getting view count:', error);
    return new Response(JSON.stringify({ error: 'Failed to get view count' }), {
      status: 500,
      headers: { 'Content-Type': 'application/json' }
    });
  }
};