// Core deployment manager for TechFlunky Business-in-a-Box
import type { 
  CloudflareAccount, 
  BusinessPackage, 
  DeploymentConfig,
  DeploymentResult 
} from './types';

export class BusinessDeploymentManager {
  private cfApi: string = 'https://api.cloudflare.com/client/v4';
  
  constructor(
    private buyerApiToken: string,
    private businessPackage: BusinessPackage
  ) {}

  /**
   * Deploy a complete business package to buyer's Cloudflare account
   */
  async deployToBuyerAccount(): Promise<DeploymentResult> {
    try {
      console.log(`Starting deployment of ${this.businessPackage.name}`);
      
      // 1. Verify buyer's account and permissions
      const account = await this.verifyBuyerAccount();
      
      // 2. Create namespace for this business
      const namespace = await this.createBusinessNamespace(account.id);
      
      // 3. Deploy Workers
      const workers = await this.deployWorkers(account.id, namespace);
      
      // 4. Create D1 databases
      const databases = await this.createDatabases(account.id);
      
      // 5. Create R2 buckets
      const buckets = await this.createR2Buckets(account.id);
      
      // 6. Set up custom domain
      const domain = await this.setupCustomDomain(account.id);
      
      // 7. Configure DNS records
      await this.configureDNS(account.id, domain);
      
      // 8. Deploy Pages (if included)
      const pages = await this.deployPages(account.id);
      
      // 9. Set up environment variables and secrets
      await this.configureEnvironment(account.id, workers, databases, buckets);
      
      // 10. Run post-deployment scripts
      await this.runPostDeploymentScripts(account.id);
      
      return {
        success: true,
        deploymentId: namespace.id,
        businessName: this.businessPackage.name,
        dashboardUrl: `https://${domain.hostname}/admin`,
        apiEndpoint: `https://api.${domain.hostname}`,
        resources: {
          workers: workers.map(w => w.name),
          databases: databases.map(d => d.name),
          buckets: buckets.map(b => b.name),
          customDomain: domain.hostname
        },
        deployedAt: new Date().toISOString()
      };
      
    } catch (error) {
      console.error('Deployment failed:', error);
      throw new Error(`Deployment failed: ${error.message}`);
    }
  }

  /**
   * Verify buyer's Cloudflare account has necessary permissions
   */
  private async verifyBuyerAccount(): Promise<CloudflareAccount> {
    const response = await fetch(`${this.cfApi}/accounts`, {
      headers: {
        'Authorization': `Bearer ${this.buyerApiToken}`,
        'Content-Type': 'application/json'
      }
    });
    
    if (!response.ok) {
      throw new Error('Failed to verify Cloudflare account');
    }
    
    const data = await response.json();
    if (!data.result || data.result.length === 0) {
      throw new Error('No Cloudflare accounts found');
    }
    
    // Return the first account (in production, might want to let buyer choose)
    return data.result[0];
  }

  /**
   * Create a namespace for this business deployment
   */
  private async createBusinessNamespace(accountId: string) {
    // Create a unique namespace for this business
    const namespaceName = `${this.businessPackage.slug}-${Date.now()}`;
    
    const response = await fetch(
      `${this.cfApi}/accounts/${accountId}/workers/dispatch/namespaces`,
      {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${this.buyerApiToken}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          name: namespaceName,
          metadata: {
            businessPackage: this.businessPackage.name,
            deployedBy: 'TechFlunky',
            version: this.businessPackage.version
          }
        })
      }
    );
    
    const data = await response.json();
    return data.result;
  }

  /**
   * Deploy all Workers in the package
   */
  private async deployWorkers(accountId: string, namespace: any) {
    const deployedWorkers = [];
    
    for (const worker of this.businessPackage.cloudflare.workers) {
      console.log(`Deploying worker: ${worker.name}`);
      
      // Upload worker script
      const formData = new FormData();
      formData.append('metadata', JSON.stringify({
        name: worker.name,
        main: worker.main || 'index.js',
        compatibility_date: '2024-01-01',
        bindings: worker.bindings || []
      }));
      
      // Add the worker code
      formData.append('script', new Blob([worker.code], { type: 'application/javascript' }));
      
      const response = await fetch(
        `${this.cfApi}/accounts/${accountId}/workers/scripts/${worker.name}`,
        {
          method: 'PUT',
          headers: {
            'Authorization': `Bearer ${this.buyerApiToken}`
          },
          body: formData
        }
      );
      
      if (!response.ok) {
        throw new Error(`Failed to deploy worker ${worker.name}`);
      }
      
      // Set up routes
      if (worker.routes) {
        for (const route of worker.routes) {
          await this.createWorkerRoute(accountId, worker.name, route);
        }
      }
      
      deployedWorkers.push({ name: worker.name, id: worker.name });
    }
    
    return deployedWorkers;
  }

  /**
   * Create D1 databases
   */
  private async createDatabases(accountId: string) {
    const databases = [];
    
    for (const db of this.businessPackage.cloudflare.d1_databases || []) {
      console.log(`Creating D1 database: ${db.name}`);
      
      // Create database
      const response = await fetch(
        `${this.cfApi}/accounts/${accountId}/d1/database`,
        {
          method: 'POST',
          headers: {
            'Authorization': `Bearer ${this.buyerApiToken}`,
            'Content-Type': 'application/json'
          },
          body: JSON.stringify({
            name: db.name,
            primary_location_hint: db.location || 'wnam'
          })
        }
      );
      
      const data = await response.json();
      const databaseId = data.result.uuid;
      
      // Run schema migrations
      if (db.schema) {
        await this.runD1Query(accountId, databaseId, db.schema);
      }
      
      // Seed initial data
      if (db.seedData) {
        await this.runD1Query(accountId, databaseId, db.seedData);
      }
      
      databases.push({ name: db.name, id: databaseId });
    }
    
    return databases;
  }

  /**
   * Create R2 buckets
   */
  private async createR2Buckets(accountId: string) {
    const buckets = [];
    
    for (const bucket of this.businessPackage.cloudflare.r2_buckets || []) {
      console.log(`Creating R2 bucket: ${bucket.name}`);
      
      const response = await fetch(
        `${this.cfApi}/accounts/${accountId}/r2/buckets`,
        {
          method: 'POST',
          headers: {
            'Authorization': `Bearer ${this.buyerApiToken}`,
            'Content-Type': 'application/json'
          },
          body: JSON.stringify({
            name: bucket.name,
            storageClass: bucket.storageClass || 'Standard'
          })
        }
      );
      
      if (!response.ok) {
        throw new Error(`Failed to create R2 bucket ${bucket.name}`);
      }
      
      // Configure CORS if needed
      if (bucket.corsEnabled) {
        await this.configureR2Cors(accountId, bucket.name);
      }
      
      buckets.push({ name: bucket.name });
    }
    
    return buckets;
  }

  /**
   * Set up custom domain using Cloudflare for SaaS
   */
  private async setupCustomDomain(accountId: string) {
    const domain = this.businessPackage.customDomain;
    
    if (!domain) {
      // Generate a subdomain if no custom domain specified
      const subdomain = `${this.businessPackage.slug}.techflunky.app`;
      return { hostname: subdomain };
    }
    
    console.log(`Setting up custom domain: ${domain.hostname}`);
    
    // Create custom hostname
    const response = await fetch(
      `${this.cfApi}/zones/${domain.zoneId}/custom_hostnames`,
      {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${this.buyerApiToken}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          hostname: domain.hostname,
          ssl: {
            method: 'http',
            type: 'dv',
            settings: {
              http2: 'on',
              min_tls_version: '1.2'
            }
          }
        })
      }
    );
    
    const data = await response.json();
    return data.result;
  }

  /**
   * Configure DNS records
   */
  private async configureDNS(accountId: string, domain: any) {
    const dnsRecords = this.businessPackage.cloudflare.dns_records || [];
    
    for (const record of dnsRecords) {
      console.log(`Creating DNS record: ${record.type} ${record.name}`);
      
      const response = await fetch(
        `${this.cfApi}/zones/${domain.zoneId}/dns_records`,
        {
          method: 'POST',
          headers: {
            'Authorization': `Bearer ${this.buyerApiToken}`,
            'Content-Type': 'application/json'
          },
          body: JSON.stringify({
            type: record.type,
            name: record.name.replace('${domain}', domain.hostname),
            content: record.content,
            ttl: record.ttl || 1,
            proxied: record.proxied !== false
          })
        }
      );
      
      if (!response.ok) {
        console.error(`Failed to create DNS record: ${record.name}`);
      }
    }
  }

  /**
   * Deploy Cloudflare Pages if included
   */
  private async deployPages(accountId: string) {
    if (!this.businessPackage.cloudflare.pages) {
      return [];
    }
    
    console.log('Deploying Pages project');
    
    // Create Pages project
    const response = await fetch(
      `${this.cfApi}/accounts/${accountId}/pages/projects`,
      {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${this.buyerApiToken}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          name: this.businessPackage.cloudflare.pages.name,
          production_branch: 'main'
        })
      }
    );
    
    const project = await response.json();
    
    // Deploy the Pages content
    // In production, this would upload the actual build artifacts
    
    return [project.result];
  }

  /**
   * Configure environment variables and bindings
   */
  private async configureEnvironment(
    accountId: string, 
    workers: any[], 
    databases: any[], 
    buckets: any[]
  ) {
    // Create bindings for each worker
    for (const worker of workers) {
      const bindings = [];
      
      // Add D1 bindings
      for (const db of databases) {
        bindings.push({
          type: 'd1',
          name: db.name.toUpperCase().replace(/-/g, '_'),
          database_id: db.id
        });
      }
      
      // Add R2 bindings
      for (const bucket of buckets) {
        bindings.push({
          type: 'r2_bucket',
          name: bucket.name.toUpperCase().replace(/-/g, '_'),
          bucket_name: bucket.name
        });
      }
      
      // Update worker with bindings
      await this.updateWorkerBindings(accountId, worker.name, bindings);
    }
  }

  /**
   * Run post-deployment scripts
   */
  private async runPostDeploymentScripts(accountId: string) {
    if (!this.businessPackage.postDeploymentScripts) {
      return;
    }
    
    console.log('Running post-deployment scripts');
    
    for (const script of this.businessPackage.postDeploymentScripts) {
      // Execute the script
      // This could trigger webhooks, send emails, etc.
      console.log(`Executing: ${script.name}`);
    }
  }

  // Helper methods
  private async createWorkerRoute(accountId: string, workerName: string, route: string) {
    // Implementation for creating worker routes
  }

  private async runD1Query(accountId: string, databaseId: string, query: string) {
    // Implementation for running D1 queries
  }

  private async configureR2Cors(accountId: string, bucketName: string) {
    // Implementation for configuring R2 CORS
  }

  private async updateWorkerBindings(accountId: string, workerName: string, bindings: any[]) {
    // Implementation for updating worker bindings
  }
}
