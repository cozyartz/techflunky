// Security Dashboard API - Real-time security metrics and monitoring
import type { APIContext } from 'astro';
import { createSecureAPIHandler, APIResponse } from '../../../lib/security/api-validation';
import { securityMonitor } from '../../../lib/security/monitoring';
import { requireRole } from '../../../lib/security/auth';

// GET /api/security/dashboard - Get security metrics
export const GET = createSecureAPIHandler(async ({ locals }: APIContext) => {
  try {
    // Only admins can access security dashboard
    const user = requireRole(locals.user, 'admin');

    const metrics = securityMonitor.getMetrics();
    const recentEvents = securityMonitor.getRecentEvents(20);
    const activeIncidents = securityMonitor.getActiveIncidents();

    // Calculate additional statistics
    const hourlyStats = calculateHourlyStats(recentEvents);
    const threatBreakdown = calculateThreatBreakdown(recentEvents);
    const topRiskIPs = getTopRiskIPs(recentEvents);

    return APIResponse.success({
      metrics,
      recentEvents: recentEvents.map(event => ({
        id: event.id,
        type: event.type,
        severity: event.severity,
        riskScore: event.riskScore,
        timestamp: event.timestamp,
        ipAddress: event.ipAddress,
        userId: event.userId,
        summary: generateEventSummary(event)
      })),
      activeIncidents: activeIncidents.map(incident => ({
        id: incident.id,
        type: incident.type,
        action: incident.action,
        status: incident.status,
        createdAt: incident.createdAt,
        notes: incident.notes
      })),
      statistics: {
        hourlyStats,
        threatBreakdown,
        topRiskIPs,
        systemStatus: calculateSystemStatus(metrics)
      }
    });

  } catch (error) {
    return APIResponse.error('Failed to retrieve security dashboard data', error.message, 500);
  }
}, {
  requireAuth: true,
  requiredRole: 'admin',
  allowedMethods: ['GET'],
  rateLimitKey: 'security_dashboard'
});

// POST /api/security/dashboard/action - Execute security action
export const POST = createSecureAPIHandler(async ({ locals, request }: APIContext) => {
  try {
    const user = requireRole(locals.user, 'admin');
    const { action, target, reason } = await request.json();

    let result;

    switch (action) {
      case 'block_ip':
        result = await blockIPAddress(target, user.id, reason);
        break;

      case 'unblock_ip':
        result = await unblockIPAddress(target, user.id, reason);
        break;

      case 'flag_user':
        result = await flagUser(target, user.id, reason);
        break;

      case 'clear_incidents':
        result = await clearIncidents(user.id);
        break;

      default:
        return APIResponse.error('Invalid action specified');
    }

    return APIResponse.success(result);

  } catch (error) {
    return APIResponse.error('Failed to execute security action', error.message, 500);
  }
}, {
  requireAuth: true,
  requiredRole: 'admin',
  allowedMethods: ['POST'],
  rateLimitKey: 'security_actions'
});

// Helper functions
function calculateHourlyStats(events: any[]): any[] {
  const hours = Array.from({ length: 24 }, (_, i) => {
    const hour = new Date();
    hour.setHours(hour.getHours() - i, 0, 0, 0);
    return {
      hour: hour.toISOString(),
      events: 0,
      threats: 0,
      avgRisk: 0
    };
  }).reverse();

  events.forEach(event => {
    const eventHour = new Date(event.timestamp);
    eventHour.setMinutes(0, 0, 0);

    const hourStat = hours.find(h =>
      new Date(h.hour).getTime() === eventHour.getTime()
    );

    if (hourStat) {
      hourStat.events++;
      if (event.riskScore > 50) hourStat.threats++;
      hourStat.avgRisk = (hourStat.avgRisk + event.riskScore) / hourStat.events;
    }
  });

  return hours;
}

function calculateThreatBreakdown(events: any[]): any {
  const breakdown = {
    auth_failure: 0,
    suspicious_activity: 0,
    permission_denied: 0,
    rate_limit: 0,
    data_access: 0,
    other: 0
  };

  events.forEach(event => {
    if (breakdown.hasOwnProperty(event.type)) {
      breakdown[event.type]++;
    } else {
      breakdown.other++;
    }
  });

  return breakdown;
}

function getTopRiskIPs(events: any[]): any[] {
  const ipRisks = new Map<string, { count: number; maxRisk: number; lastSeen: number }>();

  events.forEach(event => {
    if (event.ipAddress && event.ipAddress !== 'unknown') {
      const existing = ipRisks.get(event.ipAddress) || { count: 0, maxRisk: 0, lastSeen: 0 };
      ipRisks.set(event.ipAddress, {
        count: existing.count + 1,
        maxRisk: Math.max(existing.maxRisk, event.riskScore),
        lastSeen: Math.max(existing.lastSeen, event.timestamp)
      });
    }
  });

  return Array.from(ipRisks.entries())
    .map(([ip, data]) => ({ ip, ...data }))
    .sort((a, b) => b.maxRisk - a.maxRisk)
    .slice(0, 10);
}

function calculateSystemStatus(metrics: any): any {
  const status = {
    overall: metrics.systemHealth,
    alerts: [],
    recommendations: []
  };

  if (metrics.threatLevel === 'critical') {
    status.alerts.push('System under critical threat level');
    status.recommendations.push('Immediate security review required');
  }

  if (metrics.blockedIPs > 100) {
    status.alerts.push(`High number of blocked IPs: ${metrics.blockedIPs}`);
    status.recommendations.push('Review and optimize blocking rules');
  }

  if (metrics.suspiciousUsers > 50) {
    status.alerts.push(`Many suspicious users detected: ${metrics.suspiciousUsers}`);
    status.recommendations.push('Consider enforcing additional authentication measures');
  }

  return status;
}

function generateEventSummary(event: any): string {
  switch (event.type) {
    case 'auth_failure':
      return `Failed login attempt from ${event.ipAddress}`;
    case 'suspicious_activity':
      return `Suspicious activity detected: ${event.details?.error || 'Unknown'}`;
    case 'permission_denied':
      return `Unauthorized access attempt to ${event.details?.path || 'protected resource'}`;
    case 'rate_limit':
      return `Rate limit exceeded for ${event.ipAddress}`;
    case 'data_access':
      return `Data access by user ${event.userId}`;
    default:
      return `Security event: ${event.type}`;
  }
}

async function blockIPAddress(ip: string, adminId: string, reason: string): Promise<any> {
  // In production, update firewall rules
  console.log(`Admin ${adminId} blocked IP ${ip}: ${reason}`);

  return {
    action: 'block_ip',
    target: ip,
    status: 'success',
    timestamp: Date.now(),
    adminId,
    reason
  };
}

async function unblockIPAddress(ip: string, adminId: string, reason: string): Promise<any> {
  // In production, remove from firewall rules
  console.log(`Admin ${adminId} unblocked IP ${ip}: ${reason}`);

  return {
    action: 'unblock_ip',
    target: ip,
    status: 'success',
    timestamp: Date.now(),
    adminId,
    reason
  };
}

async function flagUser(userId: string, adminId: string, reason: string): Promise<any> {
  // In production, add user to watchlist
  console.log(`Admin ${adminId} flagged user ${userId}: ${reason}`);

  return {
    action: 'flag_user',
    target: userId,
    status: 'success',
    timestamp: Date.now(),
    adminId,
    reason
  };
}

async function clearIncidents(adminId: string): Promise<any> {
  // In production, mark incidents as resolved
  console.log(`Admin ${adminId} cleared security incidents`);

  return {
    action: 'clear_incidents',
    status: 'success',
    timestamp: Date.now(),
    adminId
  };
}