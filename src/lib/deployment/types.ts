// Type definitions for TechFlunky deployment system

export interface CloudflareAccount {
  id: string;
  name: string;
  type: string;
  settings?: Record<string, any>;
}

export interface BusinessPackage {
  id: string;
  name: string;
  slug: string;
  version: string;
  description: string;
  price: number;
  tier: 'concept' | 'blueprint' | 'launch_ready';
  
  // Cloudflare resources
  cloudflare: {
    workers: WorkerConfig[];
    d1_databases?: D1DatabaseConfig[];
    r2_buckets?: R2BucketConfig[];
    pages?: PagesConfig;
    dns_records?: DNSRecordConfig[];
    kv_namespaces?: KVNamespaceConfig[];
  };
  
  // Business assets
  businessAssets: {
    marketResearch?: string;
    businessPlan?: string;
    financialModel?: string;
    pitchDeck?: string;
    customerList?: string;
    additionalDocs?: DocumentAsset[];
  };
  
  // Custom domain configuration
  customDomain?: {
    hostname: string;
    zoneId?: string;
  };
  
  // Post-deployment scripts
  postDeploymentScripts?: PostDeploymentScript[];
}

export interface WorkerConfig {
  name: string;
  code: string;
  main?: string;
  routes?: string[];
  cron?: string;
  bindings?: WorkerBinding[];
  environment?: Record<string, string>;
}

export interface WorkerBinding {
  type: 'd1' | 'r2' | 'kv' | 'durable_object' | 'service';
  name: string;
  id?: string;
  bucket_name?: string;
  database_id?: string;
  namespace_id?: string;
  service?: string;
  class_name?: string;
}

export interface D1DatabaseConfig {
  name: string;
  location?: string;
  schema?: string;
  seedData?: string;
}

export interface R2BucketConfig {
  name: string;
  storageClass?: 'Standard' | 'InfrequentAccess';
  corsEnabled?: boolean;
  corsRules?: R2CorsRule[];
}

export interface R2CorsRule {
  allowedOrigins: string[];
  allowedMethods: string[];
  allowedHeaders?: string[];
  exposeHeaders?: string[];
  maxAgeSeconds?: number;
}

export interface PagesConfig {
  name: string;
  buildCommand?: string;
  buildOutputDirectory?: string;
  environmentVariables?: Record<string, string>;
  deploymentSource?: {
    type: 'direct' | 'github';
    branch?: string;
    repo?: string;
  };
}

export interface DNSRecordConfig {
  type: 'A' | 'AAAA' | 'CNAME' | 'TXT' | 'MX' | 'SRV';
  name: string;
  content: string;
  ttl?: number;
  priority?: number;
  proxied?: boolean;
}

export interface KVNamespaceConfig {
  name: string;
  title: string;
}

export interface DocumentAsset {
  name: string;
  type: string;
  url: string;
  size?: number;
}

export interface PostDeploymentScript {
  name: string;
  type: 'webhook' | 'email' | 'function';
  config: Record<string, any>;
}

export interface DeploymentConfig {
  buyerAccountId: string;
  buyerApiToken: string;
  packageId: string;
  customizations?: {
    domain?: string;
    branding?: {
      logo?: string;
      primaryColor?: string;
      companyName?: string;
    };
    environment?: Record<string, string>;
  };
}

export interface DeploymentResult {
  success: boolean;
  deploymentId: string;
  businessName: string;
  dashboardUrl: string;
  apiEndpoint: string;
  resources: {
    workers: string[];
    databases: string[];
    buckets: string[];
    customDomain: string;
  };
  deployedAt: string;
  error?: string;
}

export interface DeploymentStatus {
  deploymentId: string;
  status: 'pending' | 'in_progress' | 'completed' | 'failed';
  progress: number;
  currentStep: string;
  logs: DeploymentLog[];
}

export interface DeploymentLog {
  timestamp: string;
  level: 'info' | 'warning' | 'error';
  message: string;
  metadata?: Record<string, any>;
}
