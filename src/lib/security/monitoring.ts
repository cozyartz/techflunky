// Enterprise Security Monitoring & Threat Detection System
// Real-time security event analysis and automated incident response

import { SecurityLogger } from './auth';

export interface SecurityEvent {
  id: string;
  type: 'auth_success' | 'auth_failure' | 'rate_limit' | 'suspicious_activity' | 'permission_denied' | 'data_access' | 'security_breach' | 'system_alert';
  userId?: string;
  ipAddress?: string;
  userAgent?: string;
  details: any;
  severity: 'low' | 'medium' | 'high' | 'critical';
  timestamp: number;
  location?: {
    country?: string;
    region?: string;
    city?: string;
  };
  riskScore: number;
  automated: boolean;
}

export interface ThreatPattern {
  id: string;
  name: string;
  description: string;
  conditions: ThreatCondition[];
  riskScore: number;
  responseAction: 'log' | 'alert' | 'block' | 'investigate';
  enabled: boolean;
}

export interface ThreatCondition {
  field: string;
  operator: 'equals' | 'contains' | 'matches' | 'gt' | 'lt' | 'in_range' | 'time_window';
  value: any;
  weight: number;
}

export interface SecurityMetrics {
  totalEvents: number;
  threatLevel: 'low' | 'medium' | 'high' | 'critical';
  activeThreats: number;
  blockedIPs: number;
  suspiciousUsers: number;
  systemHealth: 'healthy' | 'warning' | 'critical';
  lastUpdate: number;
}

export interface IncidentResponse {
  id: string;
  type: 'auto_block' | 'manual_review' | 'escalation' | 'system_alert';
  triggerEventId: string;
  action: string;
  status: 'pending' | 'active' | 'resolved' | 'escalated';
  createdAt: number;
  resolvedAt?: number;
  notes?: string;
}

// Main Security Monitoring Engine
export class SecurityMonitor {
  private events: Map<string, SecurityEvent> = new Map();
  private threatPatterns: Map<string, ThreatPattern> = new Map();
  private blockedIPs: Set<string> = new Set();
  private suspiciousUsers: Set<string> = new Set();
  private incidents: Map<string, IncidentResponse> = new Map();
  private metrics: SecurityMetrics;

  constructor() {
    this.metrics = {
      totalEvents: 0,
      threatLevel: 'low',
      activeThreats: 0,
      blockedIPs: 0,
      suspiciousUsers: 0,
      systemHealth: 'healthy',
      lastUpdate: Date.now()
    };

    this.initializeThreatPatterns();
    this.startMonitoring();
  }

  // Initialize predefined threat detection patterns
  private initializeThreatPatterns(): void {
    const patterns: ThreatPattern[] = [
      {
        id: 'brute_force_login',
        name: 'Brute Force Login Attack',
        description: 'Multiple failed login attempts from same IP',
        conditions: [
          { field: 'type', operator: 'equals', value: 'auth_failure', weight: 1 },
          { field: 'ipAddress', operator: 'time_window', value: { count: 5, minutes: 15 }, weight: 2 }
        ],
        riskScore: 85,
        responseAction: 'block',
        enabled: true
      },
      {
        id: 'credential_stuffing',
        name: 'Credential Stuffing Attack',
        description: 'Login attempts with common passwords across multiple accounts',
        conditions: [
          { field: 'type', operator: 'equals', value: 'auth_failure', weight: 1 },
          { field: 'details.reason', operator: 'contains', value: 'invalid_password', weight: 1 },
          { field: 'ipAddress', operator: 'time_window', value: { count: 10, minutes: 30 }, weight: 3 }
        ],
        riskScore: 90,
        responseAction: 'block',
        enabled: true
      },
      {
        id: 'sql_injection_attempt',
        name: 'SQL Injection Attack',
        description: 'Potential SQL injection in request parameters',
        conditions: [
          { field: 'type', operator: 'equals', value: 'suspicious_activity', weight: 1 },
          { field: 'details.error', operator: 'matches', value: /sql|injection|union|select|insert|drop/i, weight: 3 }
        ],
        riskScore: 95,
        responseAction: 'alert',
        enabled: true
      },
      {
        id: 'xss_attempt',
        name: 'Cross-Site Scripting Attempt',
        description: 'Potential XSS payload in user input',
        conditions: [
          { field: 'type', operator: 'equals', value: 'suspicious_activity', weight: 1 },
          { field: 'details.violations', operator: 'contains', value: 'script', weight: 2 }
        ],
        riskScore: 80,
        responseAction: 'alert',
        enabled: true
      },
      {
        id: 'privilege_escalation',
        name: 'Privilege Escalation Attempt',
        description: 'User attempting to access unauthorized resources',
        conditions: [
          { field: 'type', operator: 'equals', value: 'permission_denied', weight: 1 },
          { field: 'details.attemptedAccess', operator: 'contains', value: 'admin', weight: 2 },
          { field: 'userId', operator: 'time_window', value: { count: 3, minutes: 10 }, weight: 2 }
        ],
        riskScore: 85,
        responseAction: 'investigate',
        enabled: true
      },
      {
        id: 'data_exfiltration',
        name: 'Potential Data Exfiltration',
        description: 'Unusual data access patterns suggesting data theft',
        conditions: [
          { field: 'type', operator: 'equals', value: 'data_access', weight: 1 },
          { field: 'userId', operator: 'time_window', value: { count: 50, minutes: 60 }, weight: 3 }
        ],
        riskScore: 90,
        responseAction: 'investigate',
        enabled: true
      },
      {
        id: 'api_abuse',
        name: 'API Abuse Pattern',
        description: 'Excessive API calls indicating scraping or abuse',
        conditions: [
          { field: 'details.path', operator: 'contains', value: '/api/', weight: 1 },
          { field: 'ipAddress', operator: 'time_window', value: { count: 100, minutes: 15 }, weight: 3 }
        ],
        riskScore: 75,
        responseAction: 'block',
        enabled: true
      },
      {
        id: 'payment_fraud',
        name: 'Payment Fraud Pattern',
        description: 'Suspicious payment activity patterns',
        conditions: [
          { field: 'details.path', operator: 'contains', value: 'payment', weight: 1 },
          { field: 'type', operator: 'equals', value: 'suspicious_activity', weight: 2 },
          { field: 'ipAddress', operator: 'time_window', value: { count: 5, minutes: 60 }, weight: 2 }
        ],
        riskScore: 95,
        responseAction: 'investigate',
        enabled: true
      }
    ];

    patterns.forEach(pattern => {
      this.threatPatterns.set(pattern.id, pattern);
    });
  }

  // Process incoming security event
  async processEvent(event: Omit<SecurityEvent, 'id' | 'timestamp' | 'riskScore' | 'automated'>): Promise<void> {
    const securityEvent: SecurityEvent = {
      ...event,
      id: this.generateEventId(),
      timestamp: Date.now(),
      riskScore: this.calculateRiskScore(event),
      automated: true
    };

    // Store event
    this.events.set(securityEvent.id, securityEvent);

    // Update metrics
    this.updateMetrics(securityEvent);

    // Analyze for threat patterns
    await this.analyzeThreatPatterns(securityEvent);

    // Log to persistent storage
    await SecurityLogger.logEvent({
      type: event.type,
      userId: event.userId,
      ipAddress: event.ipAddress,
      userAgent: event.userAgent,
      details: {
        ...event.details,
        eventId: securityEvent.id,
        riskScore: securityEvent.riskScore
      },
      severity: event.severity
    });

    // Trigger real-time alerts for critical events
    if (securityEvent.severity === 'critical' || securityEvent.riskScore > 90) {
      await this.triggerCriticalAlert(securityEvent);
    }
  }

  // Analyze event against threat patterns
  private async analyzeThreatPatterns(event: SecurityEvent): Promise<void> {
    for (const [patternId, pattern] of this.threatPatterns) {
      if (!pattern.enabled) continue;

      const matches = await this.evaluatePattern(event, pattern);
      if (matches) {
        await this.handleThreatDetection(event, pattern);
      }
    }
  }

  // Evaluate if event matches threat pattern
  private async evaluatePattern(event: SecurityEvent, pattern: ThreatPattern): Promise<boolean> {
    let totalWeight = 0;
    let matchedWeight = 0;

    for (const condition of pattern.conditions) {
      totalWeight += condition.weight;

      if (await this.evaluateCondition(event, condition)) {
        matchedWeight += condition.weight;
      }
    }

    // Require at least 70% match confidence
    return (matchedWeight / totalWeight) >= 0.7;
  }

  // Evaluate individual condition
  private async evaluateCondition(event: SecurityEvent, condition: ThreatCondition): Promise<boolean> {
    const fieldValue = this.getFieldValue(event, condition.field);

    switch (condition.operator) {
      case 'equals':
        return fieldValue === condition.value;

      case 'contains':
        return typeof fieldValue === 'string' && fieldValue.includes(condition.value);

      case 'matches':
        return condition.value instanceof RegExp && condition.value.test(fieldValue);

      case 'gt':
        return typeof fieldValue === 'number' && fieldValue > condition.value;

      case 'lt':
        return typeof fieldValue === 'number' && fieldValue < condition.value;

      case 'time_window':
        return await this.evaluateTimeWindow(event, condition);

      default:
        return false;
    }
  }

  // Evaluate time window conditions
  private async evaluateTimeWindow(event: SecurityEvent, condition: ThreatCondition): Promise<boolean> {
    const { count, minutes } = condition.value;
    const windowStart = Date.now() - (minutes * 60 * 1000);

    const relatedEvents = Array.from(this.events.values()).filter(e => {
      return e.timestamp >= windowStart &&
             e.ipAddress === event.ipAddress &&
             this.getFieldValue(e, condition.field) === this.getFieldValue(event, condition.field);
    });

    return relatedEvents.length >= count;
  }

  // Get field value from event object
  private getFieldValue(event: SecurityEvent, fieldPath: string): any {
    const parts = fieldPath.split('.');
    let value: any = event;

    for (const part of parts) {
      value = value?.[part];
    }

    return value;
  }

  // Handle threat detection
  private async handleThreatDetection(event: SecurityEvent, pattern: ThreatPattern): Promise<void> {
    const incident: IncidentResponse = {
      id: this.generateIncidentId(),
      type: this.mapResponseToIncidentType(pattern.responseAction),
      triggerEventId: event.id,
      action: pattern.responseAction,
      status: 'pending',
      createdAt: Date.now(),
      notes: `Threat pattern detected: ${pattern.name}`
    };

    this.incidents.set(incident.id, incident);

    switch (pattern.responseAction) {
      case 'block':
        await this.blockIP(event.ipAddress);
        incident.status = 'active';
        break;

      case 'alert':
        await this.sendSecurityAlert(event, pattern);
        incident.status = 'active';
        break;

      case 'investigate':
        await this.flagForInvestigation(event, pattern);
        incident.status = 'pending';
        break;

      default:
        incident.status = 'active';
    }

    // Log threat detection
    await SecurityLogger.logEvent({
      type: 'security_breach',
      userId: event.userId,
      ipAddress: event.ipAddress,
      details: {
        patternId: pattern.id,
        patternName: pattern.name,
        incidentId: incident.id,
        action: pattern.responseAction,
        riskScore: pattern.riskScore
      },
      severity: 'critical'
    });
  }

  // Block IP address
  private async blockIP(ipAddress?: string): Promise<void> {
    if (!ipAddress || ipAddress === 'unknown') return;

    this.blockedIPs.add(ipAddress);
    this.metrics.blockedIPs = this.blockedIPs.size;

    // In production, update firewall rules
    console.log(`🚫 IP ${ipAddress} has been automatically blocked due to threat detection`);
  }

  // Send security alert
  private async sendSecurityAlert(event: SecurityEvent, pattern: ThreatPattern): Promise<void> {
    const alertData = {
      timestamp: new Date().toISOString(),
      threatLevel: pattern.riskScore > 90 ? 'CRITICAL' : 'HIGH',
      patternName: pattern.name,
      eventId: event.id,
      details: event.details,
      ipAddress: event.ipAddress,
      userId: event.userId
    };

    // In production, send to alerting system (email, Slack, PagerDuty)
    console.log('🚨 SECURITY ALERT:', JSON.stringify(alertData, null, 2));
  }

  // Flag for manual investigation
  private async flagForInvestigation(event: SecurityEvent, pattern: ThreatPattern): Promise<void> {
    if (event.userId) {
      this.suspiciousUsers.add(event.userId);
      this.metrics.suspiciousUsers = this.suspiciousUsers.size;
    }

    console.log(`🔍 Security incident flagged for investigation: ${pattern.name}`);
  }

  // Calculate risk score for event
  private calculateRiskScore(event: Omit<SecurityEvent, 'id' | 'timestamp' | 'riskScore' | 'automated'>): number {
    let score = 0;

    // Base severity score
    const severityScores = { low: 10, medium: 30, high: 60, critical: 90 };
    score += severityScores[event.severity];

    // Event type modifiers
    const typeModifiers = {
      auth_failure: 20,
      permission_denied: 25,
      suspicious_activity: 30,
      rate_limit: 15,
      data_access: 10,
      auth_success: 5
    };
    score += typeModifiers[event.type] || 0;

    // Additional risk factors
    if (event.details?.error?.includes('injection')) score += 20;
    if (event.details?.violations?.length > 0) score += 15;
    if (event.details?.attemptedAccess === 'admin') score += 25;

    return Math.min(score, 100);
  }

  // Update security metrics
  private updateMetrics(event: SecurityEvent): void {
    this.metrics.totalEvents++;
    this.metrics.lastUpdate = Date.now();

    // Update threat level based on recent events
    const recentEvents = Array.from(this.events.values())
      .filter(e => e.timestamp > Date.now() - (60 * 60 * 1000)) // Last hour
      .sort((a, b) => b.riskScore - a.riskScore);

    if (recentEvents.length > 0) {
      const maxRisk = recentEvents[0].riskScore;
      if (maxRisk > 90) this.metrics.threatLevel = 'critical';
      else if (maxRisk > 70) this.metrics.threatLevel = 'high';
      else if (maxRisk > 40) this.metrics.threatLevel = 'medium';
      else this.metrics.threatLevel = 'low';
    }

    // Update active threats count
    this.metrics.activeThreats = this.incidents.size;

    // Update system health
    if (this.metrics.threatLevel === 'critical' || this.metrics.blockedIPs > 100) {
      this.metrics.systemHealth = 'critical';
    } else if (this.metrics.threatLevel === 'high' || this.metrics.suspiciousUsers > 50) {
      this.metrics.systemHealth = 'warning';
    } else {
      this.metrics.systemHealth = 'healthy';
    }
  }

  // Trigger critical alert
  private async triggerCriticalAlert(event: SecurityEvent): Promise<void> {
    const alert = {
      timestamp: new Date().toISOString(),
      level: 'CRITICAL',
      eventId: event.id,
      type: event.type,
      riskScore: event.riskScore,
      details: event.details,
      recommendedAction: 'Immediate investigation required'
    };

    // In production, trigger immediate alerts
    console.log('🚨 CRITICAL SECURITY ALERT:', JSON.stringify(alert, null, 2));

    // Auto-block for severe threats
    if (event.riskScore > 95 && event.ipAddress) {
      await this.blockIP(event.ipAddress);
    }
  }

  // Start monitoring background tasks
  private startMonitoring(): void {
    // Clean up old events every hour
    setInterval(() => {
      this.cleanupOldEvents();
    }, 60 * 60 * 1000);

    // Generate security reports every 24 hours
    setInterval(() => {
      this.generateSecurityReport();
    }, 24 * 60 * 60 * 1000);
  }

  // Cleanup old events
  private cleanupOldEvents(): void {
    const cutoff = Date.now() - (7 * 24 * 60 * 60 * 1000); // 7 days

    for (const [id, event] of this.events) {
      if (event.timestamp < cutoff) {
        this.events.delete(id);
      }
    }
  }

  // Generate security report
  private async generateSecurityReport(): Promise<void> {
    const report = {
      timestamp: new Date().toISOString(),
      period: '24 hours',
      metrics: this.metrics,
      topThreats: this.getTopThreats(),
      recommendations: this.getSecurityRecommendations()
    };

    console.log('📊 Daily Security Report:', JSON.stringify(report, null, 2));

    // Store report in database for historical analysis
    await SecurityLogger.logEvent({
      type: 'system_alert',
      details: { type: 'security_report', data: report },
      severity: 'low'
    });
  }

  // Get top threats from recent events
  private getTopThreats(): any[] {
    const recent = Array.from(this.events.values())
      .filter(e => e.timestamp > Date.now() - (24 * 60 * 60 * 1000))
      .sort((a, b) => b.riskScore - a.riskScore)
      .slice(0, 10);

    return recent.map(event => ({
      id: event.id,
      type: event.type,
      riskScore: event.riskScore,
      timestamp: event.timestamp,
      details: event.details
    }));
  }

  // Get security recommendations
  private getSecurityRecommendations(): string[] {
    const recommendations: string[] = [];

    if (this.metrics.blockedIPs > 50) {
      recommendations.push('High number of blocked IPs detected. Consider reviewing firewall rules.');
    }

    if (this.metrics.suspiciousUsers > 20) {
      recommendations.push('Multiple suspicious users identified. Consider enforcing MFA.');
    }

    if (this.metrics.threatLevel === 'critical') {
      recommendations.push('System under active threat. Immediate security review recommended.');
    }

    return recommendations;
  }

  // Utility methods
  private generateEventId(): string {
    return `evt_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
  }

  private generateIncidentId(): string {
    return `inc_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
  }

  private mapResponseToIncidentType(action: string): IncidentResponse['type'] {
    switch (action) {
      case 'block': return 'auto_block';
      case 'alert': return 'system_alert';
      case 'investigate': return 'manual_review';
      default: return 'escalation';
    }
  }

  // Public getters
  getMetrics(): SecurityMetrics {
    return { ...this.metrics };
  }

  getRecentEvents(limit = 50): SecurityEvent[] {
    return Array.from(this.events.values())
      .sort((a, b) => b.timestamp - a.timestamp)
      .slice(0, limit);
  }

  getActiveIncidents(): IncidentResponse[] {
    return Array.from(this.incidents.values())
      .filter(incident => incident.status === 'active' || incident.status === 'pending');
  }

  isIPBlocked(ip: string): boolean {
    return this.blockedIPs.has(ip);
  }

  isUserSuspicious(userId: string): boolean {
    return this.suspiciousUsers.has(userId);
  }
}

// Export singleton instance
export const securityMonitor = new SecurityMonitor();

// Enhanced SecurityLogger that integrates with monitoring
export class EnhancedSecurityLogger extends SecurityLogger {
  static async logEvent(event: Parameters<typeof SecurityLogger.logEvent>[0]): Promise<void> {
    // Log to original system
    await super.logEvent(event);

    // Process through security monitor
    await securityMonitor.processEvent({
      type: event.type,
      userId: event.userId,
      ipAddress: event.ipAddress,
      userAgent: event.userAgent,
      details: event.details,
      severity: event.severity
    });
  }
}