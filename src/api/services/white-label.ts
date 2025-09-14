// White-Label Portal Management System
import type { APIContext } from 'astro';

interface WhiteLabelConfig {
  organizationName: string;
  customDomain?: string;
  branding: {
    logo?: string;
    primaryColor: string;
    secondaryColor: string;
    fontFamily?: string;
  };
  features: string[];
  customizations: Record<string, any>;
}

// Create white-label portal
export async function POST({ request, locals }: APIContext) {
  const { DB, CLOUDFLARE_ZONE_ID, CLOUDFLARE_API_TOKEN } = locals.runtime.env;

  try {
    const {
      userId,
      organizationName,
      customDomain,
      branding = {},
      tier = 'basic',
      customizations = {}
    } = await request.json();

    if (!userId || !organizationName) {
      return new Response(JSON.stringify({
        error: 'User ID and organization name are required'
      }), {
        status: 400,
        headers: { 'Content-Type': 'application/json' }
      });
    }

    // Validate user has active white-label subscription
    const subscription = await DB.prepare(`
      SELECT * FROM premium_service_subscriptions
      WHERE user_id = ? AND service_type = 'whiteLabelPortal' AND status = 'active'
    `).bind(userId).first();

    if (!subscription) {
      return new Response(JSON.stringify({
        error: 'Active white-label subscription required'
      }), {
        status: 403,
        headers: { 'Content-Type': 'application/json' }
      });
    }

    const now = Math.floor(Date.now() / 1000);
    const portalId = generatePortalId();
    const subdomain = generateSubdomain(organizationName);

    // Create white-label portal configuration
    const portalConfig: WhiteLabelConfig = {
      organizationName,
      customDomain,
      branding: {
        primaryColor: branding.primaryColor || '#1a1a1a',
        secondaryColor: branding.secondaryColor || '#ffd700',
        logo: branding.logo,
        fontFamily: branding.fontFamily || 'Inter'
      },
      features: getFeaturesByTier(subscription.service_tier),
      customizations
    };

    // Setup custom domain if provided and user has permission
    let domainStatus = 'pending';
    if (customDomain && ['premium', 'enterprise'].includes(subscription.service_tier)) {
      domainStatus = await setupCustomDomain(customDomain, CLOUDFLARE_ZONE_ID, CLOUDFLARE_API_TOKEN);
    }

    // Create portal record
    await DB.prepare(`
      INSERT INTO white_label_portals (
        id, user_id, organization_name, subdomain, custom_domain,
        domain_status, portal_config, tier, status, created_at, updated_at
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, 'active', ?, ?)
    `).bind(
      portalId,
      userId,
      organizationName,
      subdomain,
      customDomain || null,
      domainStatus,
      JSON.stringify(portalConfig),
      subscription.service_tier,
      now,
      now
    ).run();

    // Create default portal user (admin)
    await createPortalUser(DB, portalId, userId, 'admin', portalConfig);

    const portalUrl = customDomain && domainStatus === 'active'
      ? `https://${customDomain}`
      : `https://${subdomain}.techflunky.io`;

    return new Response(JSON.stringify({
      success: true,
      portal: {
        id: portalId,
        organizationName,
        url: portalUrl,
        subdomain,
        customDomain,
        domainStatus,
        tier: subscription.service_tier,
        config: portalConfig,
        adminAccess: {
          username: 'admin',
          setupRequired: true
        }
      },
      message: 'White-label portal created successfully',
      nextSteps: [
        'Complete admin account setup',
        'Configure team members and roles',
        'Customize branding and features',
        customDomain ? 'Complete custom domain verification' : 'Consider upgrading for custom domain'
      ]
    }), {
      headers: { 'Content-Type': 'application/json' }
    });

  } catch (error) {
    console.error('Error creating white-label portal:', error);
    return new Response(JSON.stringify({ error: 'Failed to create white-label portal' }), {
      status: 500,
      headers: { 'Content-Type': 'application/json' }
    });
  }
}

// Get portal configuration and status
export async function GET({ url, locals }: APIContext) {
  const { DB } = locals.runtime.env;
  const userId = url.searchParams.get('userId');
  const portalId = url.searchParams.get('portalId');
  const domain = url.searchParams.get('domain');

  try {
    let portal;

    if (portalId) {
      // Get specific portal by ID
      portal = await DB.prepare(`
        SELECT * FROM white_label_portals
        WHERE id = ? AND (user_id = ? OR ? IS NULL)
      `).bind(portalId, userId || null, userId || null).first();
    } else if (domain) {
      // Get portal by domain (for routing)
      portal = await DB.prepare(`
        SELECT * FROM white_label_portals
        WHERE custom_domain = ? OR subdomain = ? AND status = 'active'
      `).bind(domain, domain.split('.')[0]).first();
    } else if (userId) {
      // Get all portals for user
      const portals = await DB.prepare(`
        SELECT * FROM white_label_portals WHERE user_id = ? ORDER BY created_at DESC
      `).bind(userId).all();

      return new Response(JSON.stringify({
        portals: portals.map(p => ({
          ...p,
          portal_config: JSON.parse(p.portal_config),
          url: p.custom_domain && p.domain_status === 'active'
            ? `https://${p.custom_domain}`
            : `https://${p.subdomain}.techflunky.io`
        }))
      }), {
        headers: { 'Content-Type': 'application/json' }
      });
    }

    if (!portal) {
      return new Response(JSON.stringify({
        error: 'Portal not found'
      }), {
        status: 404,
        headers: { 'Content-Type': 'application/json' }
      });
    }

    // Get portal users and analytics
    const [portalUsers, analytics] = await Promise.all([
      DB.prepare(`
        SELECT user_id, role, permissions, created_at FROM white_label_portal_users
        WHERE portal_id = ?
      `).bind(portal.id).all(),

      DB.prepare(`
        SELECT
          COUNT(DISTINCT user_id) as total_users,
          COUNT(DISTINCT CASE WHEN last_active_date > ? THEN user_id END) as active_users,
          COUNT(*) as total_sessions
        FROM white_label_analytics
        WHERE portal_id = ?
      `).bind(
        Math.floor(Date.now() / 1000) - (30 * 24 * 60 * 60), // 30 days
        portal.id
      ).first()
    ]);

    return new Response(JSON.stringify({
      portal: {
        ...portal,
        portal_config: JSON.parse(portal.portal_config),
        url: portal.custom_domain && portal.domain_status === 'active'
          ? `https://${portal.custom_domain}`
          : `https://${portal.subdomain}.techflunky.io`,
        users: portalUsers,
        analytics: {
          totalUsers: analytics.total_users || 0,
          activeUsers: analytics.active_users || 0,
          totalSessions: analytics.total_sessions || 0
        }
      }
    }), {
      headers: { 'Content-Type': 'application/json' }
    });

  } catch (error) {
    console.error('Error getting white-label portal:', error);
    return new Response(JSON.stringify({ error: 'Failed to retrieve portal' }), {
      status: 500,
      headers: { 'Content-Type': 'application/json' }
    });
  }
}

// Update portal configuration
export async function PUT({ request, locals }: APIContext) {
  const { DB } = locals.runtime.env;

  try {
    const {
      portalId,
      userId,
      updates = {}
    } = await request.json();

    if (!portalId || !userId) {
      return new Response(JSON.stringify({
        error: 'Portal ID and User ID are required'
      }), {
        status: 400,
        headers: { 'Content-Type': 'application/json' }
      });
    }

    // Verify ownership
    const portal = await DB.prepare(`
      SELECT * FROM white_label_portals WHERE id = ? AND user_id = ?
    `).bind(portalId, userId).first();

    if (!portal) {
      return new Response(JSON.stringify({
        error: 'Portal not found or access denied'
      }), {
        status: 404,
        headers: { 'Content-Type': 'application/json' }
      });
    }

    const currentConfig = JSON.parse(portal.portal_config);
    const now = Math.floor(Date.now() / 1000);

    // Update configuration
    const updatedConfig = {
      ...currentConfig,
      ...updates,
      branding: {
        ...currentConfig.branding,
        ...(updates.branding || {})
      },
      customizations: {
        ...currentConfig.customizations,
        ...(updates.customizations || {})
      }
    };

    // Update database
    await DB.prepare(`
      UPDATE white_label_portals SET
        portal_config = ?,
        updated_at = ?
      WHERE id = ?
    `).bind(
      JSON.stringify(updatedConfig),
      now,
      portalId
    ).run();

    return new Response(JSON.stringify({
      success: true,
      updatedConfig,
      message: 'Portal configuration updated successfully'
    }), {
      headers: { 'Content-Type': 'application/json' }
    });

  } catch (error) {
    console.error('Error updating white-label portal:', error);
    return new Response(JSON.stringify({ error: 'Failed to update portal' }), {
      status: 500,
      headers: { 'Content-Type': 'application/json' }
    });
  }
}

// Add user to white-label portal
export async function OPTIONS({ request, locals }: APIContext) {
  const { DB } = locals.runtime.env;

  try {
    const {
      portalId,
      adminUserId,
      newUserEmail,
      role = 'user',
      permissions = []
    } = await request.json();

    if (!portalId || !adminUserId || !newUserEmail) {
      return new Response(JSON.stringify({
        error: 'Portal ID, admin user ID, and new user email are required'
      }), {
        status: 400,
        headers: { 'Content-Type': 'application/json' }
      });
    }

    // Verify admin access
    const adminAccess = await DB.prepare(`
      SELECT * FROM white_label_portal_users
      WHERE portal_id = ? AND user_id = ? AND role IN ('admin', 'owner')
    `).bind(portalId, adminUserId).first();

    if (!adminAccess) {
      return new Response(JSON.stringify({
        error: 'Admin access required'
      }), {
        status: 403,
        headers: { 'Content-Type': 'application/json' }
      });
    }

    // Check if user exists in main system
    const existingUser = await DB.prepare(`
      SELECT id FROM users WHERE email = ?
    `).bind(newUserEmail).first();

    let newUserId = existingUser?.id;

    // Create invitation if user doesn't exist
    if (!newUserId) {
      const inviteId = generateInviteId();
      await DB.prepare(`
        INSERT INTO white_label_invitations (
          id, portal_id, email, role, permissions, invited_by, status, created_at, expires_at
        ) VALUES (?, ?, ?, ?, ?, ?, 'pending', ?, ?)
      `).bind(
        inviteId,
        portalId,
        newUserEmail,
        role,
        JSON.stringify(permissions),
        adminUserId,
        Math.floor(Date.now() / 1000),
        Math.floor(Date.now() / 1000) + (7 * 24 * 60 * 60) // 7 days
      ).run();

      return new Response(JSON.stringify({
        success: true,
        inviteId,
        message: 'Invitation sent to user',
        inviteUrl: `https://techflunky.io/portal/invite/${inviteId}`
      }), {
        headers: { 'Content-Type': 'application/json' }
      });
    }

    // Add existing user directly
    await createPortalUser(DB, portalId, newUserId, role, null, permissions);

    return new Response(JSON.stringify({
      success: true,
      message: 'User added to portal successfully'
    }), {
      headers: { 'Content-Type': 'application/json' }
    });

  } catch (error) {
    console.error('Error adding portal user:', error);
    return new Response(JSON.stringify({ error: 'Failed to add portal user' }), {
      status: 500,
      headers: { 'Content-Type': 'application/json' }
    });
  }
}

// Helper functions
function generatePortalId(): string {
  return `wl_${crypto.getRandomValues(new Uint8Array(12)).reduce((str, byte) => str + byte.toString(16).padStart(2, '0'), '')}`;
}

function generateSubdomain(organizationName: string): string {
  const clean = organizationName.toLowerCase()
    .replace(/[^a-z0-9]/g, '')
    .slice(0, 20);
  const random = crypto.getRandomValues(new Uint8Array(4))
    .reduce((str, byte) => str + byte.toString(16), '');
  return `${clean}${random}`;
}

function generateInviteId(): string {
  return `inv_${crypto.getRandomValues(new Uint8Array(16)).reduce((str, byte) => str + byte.toString(16).padStart(2, '0'), '')}`;
}

function getFeaturesByTier(tier: string): string[] {
  const features = {
    basic: ['custom_branding', 'custom_domain', 'basic_analytics', 'email_support'],
    premium: ['custom_branding', 'custom_domain', 'advanced_analytics', 'priority_support', 'custom_features', 'api_access'],
    enterprise: ['full_customization', 'dedicated_infrastructure', 'advanced_analytics', 'dedicated_support', 'sla', 'unlimited_users', 'advanced_integrations']
  };

  return features[tier] || features.basic;
}

async function setupCustomDomain(domain: string, zoneId: string, apiToken: string): Promise<string> {
  // In production, this would set up Cloudflare DNS records
  // For now, return pending status
  try {
    // Would make API call to Cloudflare to add DNS records
    console.log(`Setting up custom domain: ${domain}`);
    return 'pending_verification';
  } catch (error) {
    console.error('Error setting up custom domain:', error);
    return 'failed';
  }
}

async function createPortalUser(
  DB: any,
  portalId: string,
  userId: string,
  role: string,
  portalConfig: WhiteLabelConfig | null,
  permissions: string[] = []
) {
  const now = Math.floor(Date.now() / 1000);

  await DB.prepare(`
    INSERT OR IGNORE INTO white_label_portal_users (
      portal_id, user_id, role, permissions, created_at
    ) VALUES (?, ?, ?, ?, ?)
  `).bind(
    portalId,
    userId,
    role,
    JSON.stringify(permissions),
    now
  ).run();
}