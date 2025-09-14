// Cloudflare for SaaS integration for TechFlunky
import type { BusinessPackage, DeploymentConfig } from './types';

export class CloudflareForSaaSManager {
  private cfApi: string = 'https://api.cloudflare.com/client/v4';
  private platformZoneId: string;
  private platformApiToken: string;
  
  constructor(platformZoneId: string, platformApiToken: string) {
    this.platformZoneId = platformZoneId;
    this.platformApiToken = platformApiToken;
  }

  /**
   * Set up custom hostname for buyer
   */
  async setupCustomHostname(
    buyerDomain: string, 
    targetCname: string
  ): Promise<CustomHostnameResult> {
    console.log(`Setting up custom hostname: ${buyerDomain}`);
    
    const response = await fetch(
      `${this.cfApi}/zones/${this.platformZoneId}/custom_hostnames`,
      {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${this.platformApiToken}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          hostname: buyerDomain,
          ssl: {
            method: 'http',
            type: 'dv',
            settings: {
              ciphers: ['ECDHE-RSA-AES128-GCM-SHA256', 'AES128-SHA'],
              http2: 'on',
              min_tls_version: '1.2',
              tls_1_3: 'on'
            }
          },
          custom_metadata: {
            managed_by: 'techflunky',
            buyer_account: targetCname
          }
        })
      }
    );

    if (!response.ok) {
      const error = await response.json();
      throw new Error(`Failed to create custom hostname: ${error.errors?.[0]?.message || 'Unknown error'}`);
    }

    const result = await response.json();
    
    return {
      id: result.result.id,
      hostname: result.result.hostname,
      ssl: {
        status: result.result.ssl.status,
        validation_records: result.result.ssl.validation_records || []
      },
      status: result.result.status,
      verification_errors: result.result.verification_errors || []
    };
  }

  /**
   * Create fallback origin for custom hostnames
   */
  async createFallbackOrigin(originServer: string): Promise<void> {
    const response = await fetch(
      `${this.cfApi}/zones/${this.platformZoneId}/custom_hostnames/fallback_origin`,
      {
        method: 'PUT',
        headers: {
          'Authorization': `Bearer ${this.platformApiToken}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          origin: originServer
        })
      }
    );

    if (!response.ok) {
      throw new Error('Failed to set fallback origin');
    }
  }

  /**
   * Verify custom hostname SSL status
   */
  async verifySSLStatus(hostnameId: string): Promise<SSLStatus> {
    const response = await fetch(
      `${this.cfApi}/zones/${this.platformZoneId}/custom_hostnames/${hostnameId}`,
      {
        headers: {
          'Authorization': `Bearer ${this.platformApiToken}`,
          'Content-Type': 'application/json'
        }
      }
    );

    const result = await response.json();
    
    return {
      status: result.result.ssl.status,
      validationMethod: result.result.ssl.method,
      issuedOn: result.result.ssl.issued_on,
      expiresOn: result.result.ssl.expires_on
    };
  }

  /**
   * Create subdomain for buyer if they don't have custom domain
   */
  async createSubdomain(
    businessSlug: string,
    buyerId: string
  ): Promise<string> {
    // Generate unique subdomain
    const subdomain = `${businessSlug}-${buyerId.slice(0, 8)}.app.techflunky.com`;
    
    // Create DNS record
    const response = await fetch(
      `${this.cfApi}/zones/${this.platformZoneId}/dns_records`,
      {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${this.platformApiToken}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          type: 'CNAME',
          name: subdomain.replace('.techflunky.com', ''),
          content: 'app.techflunky.com',
          ttl: 1,
          proxied: true,
          comment: `Auto-generated for buyer ${buyerId}`
        })
      }
    );

    if (!response.ok) {
      throw new Error('Failed to create subdomain');
    }

    return subdomain;
  }

  /**
   * Configure routing rules for custom hostname
   */
  async configureRouting(
    hostname: string,
    workerId: string,
    routingRules: RoutingRule[]
  ): Promise<void> {
    // Create Page Rules or Worker Routes for the custom hostname
    for (const rule of routingRules) {
      await this.createWorkerRoute(hostname, workerId, rule);
    }
  }

  /**
   * Create Worker route for custom hostname
   */
  private async createWorkerRoute(
    hostname: string,
    workerId: string,
    rule: RoutingRule
  ): Promise<void> {
    const pattern = rule.pattern.replace('${hostname}', hostname);
    
    const response = await fetch(
      `${this.cfApi}/zones/${this.platformZoneId}/workers/routes`,
      {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${this.platformApiToken}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          pattern,
          script: workerId
        })
      }
    );

    if (!response.ok) {
      throw new Error(`Failed to create worker route for ${pattern}`);
    }
  }

  /**
   * Enable analytics for custom hostname
   */
  async enableAnalytics(hostnameId: string): Promise<void> {
    // Enable Web Analytics for the custom hostname
    const response = await fetch(
      `${this.cfApi}/accounts/${this.getAccountId()}/rum/site_info`,
      {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${this.platformApiToken}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          host: hostnameId,
          zone_tag: this.platformZoneId,
          auto_install: true
        })
      }
    );

    if (!response.ok) {
      console.warn('Failed to enable analytics for custom hostname');
    }
  }

  /**
   * Monitor custom hostname health
   */
  async monitorHealth(hostnames: string[]): Promise<HealthStatus[]> {
    const healthStatuses: HealthStatus[] = [];
    
    for (const hostname of hostnames) {
      try {
        const response = await fetch(`https://${hostname}/health`, {
          method: 'GET',
          headers: {
            'User-Agent': 'TechFlunky-Monitor/1.0'
          }
        });
        
        healthStatuses.push({
          hostname,
          status: response.ok ? 'healthy' : 'unhealthy',
          responseTime: response.headers.get('cf-ray') ? 
            parseInt(response.headers.get('cf-cache-status') || '0') : 0,
          sslValid: true,
          lastChecked: new Date().toISOString()
        });
      } catch (error) {
        healthStatuses.push({
          hostname,
          status: 'error',
          responseTime: 0,
          sslValid: false,
          lastChecked: new Date().toISOString(),
          error: error.message
        });
      }
    }
    
    return healthStatuses;
  }

  /**
   * Get account ID from zone
   */
  private async getAccountId(): Promise<string> {
    const response = await fetch(
      `${this.cfApi}/zones/${this.platformZoneId}`,
      {
        headers: {
          'Authorization': `Bearer ${this.platformApiToken}`,
          'Content-Type': 'application/json'
        }
      }
    );
    
    const data = await response.json();
    return data.result.account.id;
  }
}

// Type definitions
interface CustomHostnameResult {
  id: string;
  hostname: string;
  ssl: {
    status: string;
    validation_records: ValidationRecord[];
  };
  status: string;
  verification_errors: string[];
}

interface ValidationRecord {
  txt_name: string;
  txt_value: string;
}

interface SSLStatus {
  status: 'initializing' | 'pending_validation' | 'active' | 'inactive';
  validationMethod: string;
  issuedOn?: string;
  expiresOn?: string;
}

interface RoutingRule {
  pattern: string;
  enabled: boolean;
}

interface HealthStatus {
  hostname: string;
  status: 'healthy' | 'unhealthy' | 'error';
  responseTime: number;
  sslValid: boolean;
  lastChecked: string;
  error?: string;
}

export { CustomHostnameResult, SSLStatus, RoutingRule, HealthStatus };
