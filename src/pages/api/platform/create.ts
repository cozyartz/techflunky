// Platform Creation API with Tenant Isolation
import type { APIContext } from 'astro';
import { withTenantIsolation, validateTenantAccess, sanitizeForTenant, createTenantDb } from '../../../lib/tenant-isolation.js';

export const POST = withTenantIsolation(async (request, locals, ctx, tenant) => {
  const { DB, CACHE } = locals.runtime?.env || {};

  try {
    // Validate tenant has permission to create platforms
    if (!validateTenantAccess(tenant, 'platform', undefined, 'create')) {
      return new Response(JSON.stringify({
        success: false,
        error: 'Insufficient permissions to create platforms'
      }), {
        status: 403,
        headers: { 'Content-Type': 'application/json' }
      });
    }

    const body = await request.json();
    let { name, description, category, price, technologies, features } = body;

    // Sanitize data for tenant context
    const sanitizedData = sanitizeForTenant({
      name,
      description,
      category,
      price,
      technologies,
      features,
      seller_id: tenant?.sellerId
    }, tenant, 'platform');

    if (!sanitizedData.name || !sanitizedData.description || !sanitizedData.category || !sanitizedData.price) {
      return new Response(JSON.stringify({
        success: false,
        error: 'Missing required fields'
      }), {
        status: 400,
        headers: { 'Content-Type': 'application/json' }
      });
    }

    const platformId = crypto.randomUUID();
    const slug = sanitizedData.name.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '');

    if (DB) {
      // Use tenant-aware database
      const tenantDb = createTenantDb(DB, tenant);

      // Insert into listings table (the main table for platforms)
      await DB.prepare(`
        INSERT INTO listings (
          id,
          seller_id,
          title,
          slug,
          description,
          category,
          industry,
          price,
          technical_specs,
          status,
          package_tier,
          created_at,
          updated_at
        ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
      `).bind(
        platformId,
        sanitizedData.seller_id,
        sanitizedData.name,
        slug,
        sanitizedData.description,
        sanitizedData.category,
        sanitizedData.category, // Use category as industry for now
        Math.round(sanitizedData.price * 100), // Convert to cents
        JSON.stringify({
          technologies: sanitizedData.technologies || [],
          features: sanitizedData.features || []
        }),
        'draft',
        'concept',
        Date.now(),
        Date.now()
      ).run();
    }

    return new Response(JSON.stringify({
      success: true,
      data: {
        id: platformId,
        seller_id: sanitizedData.seller_id,
        title: sanitizedData.name,
        slug,
        description: sanitizedData.description,
        category: sanitizedData.category,
        price: Math.round(sanitizedData.price * 100),
        status: 'draft',
        package_tier: 'concept'
      },
      tenant: tenant ? {
        id: tenant.id,
        type: tenant.type
      } : null,
      message: 'Platform created successfully',
      note: DB ? 'Live platform creation with tenant isolation' : 'Demo platform creation - Database not configured'
    }), {
      status: 201,
      headers: { 'Content-Type': 'application/json' }
    });

  } catch (error) {
    console.error('Platform creation error:', error);
    return new Response(JSON.stringify({
      success: false,
      error: 'Platform creation failed',
      details: error.message
    }), {
      status: 500,
      headers: { 'Content-Type': 'application/json' }
    });
  }
});