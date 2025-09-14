// Package builder for creating business packages
import type { BusinessPackage } from './types';
import { readFile, writeFile } from 'fs/promises';
import { join } from 'path';

export class PackageBuilder {
  private package: Partial<BusinessPackage>;
  
  constructor(name: string, slug: string) {
    this.package = {
      id: `pkg_${Date.now()}`,
      name,
      slug,
      version: '1.0.0',
      cloudflare: {
        workers: [],
        d1_databases: [],
        r2_buckets: [],
        dns_records: [],
        kv_namespaces: []
      },
      businessAssets: {}
    };
  }

  /**
   * Set basic package information
   */
  setInfo(info: {
    description: string;
    price: number;
    tier: 'concept' | 'blueprint' | 'launch_ready';
  }) {
    this.package = { ...this.package, ...info };
    return this;
  }

  /**
   * Add a Worker to the package
   */
  async addWorker(config: {
    name: string;
    codePath: string;
    routes?: string[];
    cron?: string;
    environment?: Record<string, string>;
  }) {
    const code = await readFile(config.codePath, 'utf-8');
    
    this.package.cloudflare!.workers.push({
      name: config.name,
      code,
      routes: config.routes,
      cron: config.cron,
      environment: config.environment
    });
    
    return this;
  }

  /**
   * Add a D1 database
   */
  async addDatabase(config: {
    name: string;
    schemaPath?: string;
    seedDataPath?: string;
    location?: string;
  }) {
    const schema = config.schemaPath ? 
      await readFile(config.schemaPath, 'utf-8') : undefined;
    const seedData = config.seedDataPath ? 
      await readFile(config.seedDataPath, 'utf-8') : undefined;
    
    this.package.cloudflare!.d1_databases!.push({
      name: config.name,
      schema,
      seedData,
      location: config.location
    });
    
    return this;
  }

  /**
   * Add an R2 bucket
   */
  addR2Bucket(config: {
    name: string;
    corsEnabled?: boolean;
    storageClass?: 'Standard' | 'InfrequentAccess';
  }) {
    this.package.cloudflare!.r2_buckets!.push(config);
    return this;
  }

  /**
   * Add Pages configuration
   */
  addPages(config: {
    name: string;
    buildCommand?: string;
    buildOutputDirectory?: string;
    environmentVariables?: Record<string, string>;
  }) {
    this.package.cloudflare!.pages = config;
    return this;
  }

  /**
   * Add DNS records
   */
  addDNSRecord(record: {
    type: 'A' | 'AAAA' | 'CNAME' | 'TXT' | 'MX' | 'SRV';
    name: string;
    content: string;
    ttl?: number;
    proxied?: boolean;
  }) {
    this.package.cloudflare!.dns_records!.push(record);
    return this;
  }

  /**
   * Add business assets
   */
  addBusinessAssets(assets: {
    marketResearch?: string;
    businessPlan?: string;
    financialModel?: string;
    pitchDeck?: string;
    customerList?: string;
  }) {
    this.package.businessAssets = { ...this.package.businessAssets, ...assets };
    return this;
  }

  /**
   * Set custom domain configuration
   */
  setCustomDomain(hostname: string, zoneId?: string) {
    this.package.customDomain = { hostname, zoneId };
    return this;
  }

  /**
   * Add post-deployment script
   */
  addPostDeploymentScript(script: {
    name: string;
    type: 'webhook' | 'email' | 'function';
    config: Record<string, any>;
  }) {
    if (!this.package.postDeploymentScripts) {
      this.package.postDeploymentScripts = [];
    }
    this.package.postDeploymentScripts.push(script);
    return this;
  }

  /**
   * Validate the package
   */
  validate(): string[] {
    const errors: string[] = [];
    
    if (!this.package.name) errors.push('Package name is required');
    if (!this.package.slug) errors.push('Package slug is required');
    if (!this.package.description) errors.push('Package description is required');
    if (!this.package.price || this.package.price <= 0) {
      errors.push('Package price must be greater than 0');
    }
    if (!this.package.tier) errors.push('Package tier is required');
    
    // Validate Workers
    if (this.package.cloudflare!.workers.length === 0) {
      errors.push('At least one Worker is required');
    }
    
    // Validate each Worker
    this.package.cloudflare!.workers.forEach((worker, index) => {
      if (!worker.name) errors.push(`Worker ${index} is missing a name`);
      if (!worker.code) errors.push(`Worker ${worker.name} is missing code`);
    });
    
    return errors;
  }

  /**
   * Build the final package
   */
  build(): BusinessPackage {
    const errors = this.validate();
    if (errors.length > 0) {
      throw new Error(`Package validation failed:\n${errors.join('\n')}`);
    }
    
    return this.package as BusinessPackage;
  }

  /**
   * Export package to JSON
   */
  async export(outputPath: string) {
    const pkg = this.build();
    await writeFile(outputPath, JSON.stringify(pkg, null, 2));
    return pkg;
  }

  /**
   * Create package from template
   */
  static async fromTemplate(templateName: string): Promise<PackageBuilder> {
    const templates = {
      'saas-starter': {
        name: 'SaaS Starter Kit',
        slug: 'saas-starter',
        description: 'Complete SaaS foundation with auth, billing, and admin',
        price: 15000,
        tier: 'blueprint' as const
      },
      'marketplace': {
        name: 'Marketplace Platform',
        slug: 'marketplace-platform',
        description: 'Multi-vendor marketplace with payments',
        price: 35000,
        tier: 'launch_ready' as const
      },
      'ai-chatbot': {
        name: 'AI Customer Service Bot',
        slug: 'ai-chatbot',
        description: 'Intelligent chatbot with training dashboard',
        price: 25000,
        tier: 'launch_ready' as const
      }
    };
    
    const template = templates[templateName];
    if (!template) {
      throw new Error(`Template ${templateName} not found`);
    }
    
    const builder = new PackageBuilder(template.name, template.slug);
    builder.setInfo({
      description: template.description,
      price: template.price,
      tier: template.tier
    });
    
    // Add template-specific resources
    // This would be expanded with actual template configurations
    
    return builder;
  }
}

// Helper function to create packages from YAML
export async function createPackageFromYAML(yamlPath: string): Promise<BusinessPackage> {
  // In production, this would parse YAML and create package
  // For now, returning a placeholder
  throw new Error('YAML parsing not implemented yet');
}
