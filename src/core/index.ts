// TechFlunky Multi-Stack Compatibility Core
// Main entry point for framework-agnostic marketplace functionality

// API Layer Exports
export { BaseAPIAdapter, APIAdapterFactory } from './api/base-adapter';
export { CloudflareAPIAdapter } from './api/adapters/cloudflare-adapter';
export { NextJSAPIAdapter } from './frameworks/nextjs-adapter';
export { openApiSpec, OpenAPIGenerator } from './api/openapi-spec';

// Database Layer Exports
export { BaseDatabaseAdapter, DatabaseAdapterFactory, QueryBuilder } from './database/base-adapter';
export { PostgreSQLAdapter } from './database/adapters/postgresql-adapter';

// Framework Detection & Configuration
export { FrameworkDetector, ConfigurationGenerator } from './config/framework-detector';

// Deployment & Docker Support
export { DockerGenerator } from './deployment/docker-generator';

// Type Definitions
export type {
  ApiResponse,
  ListingData,
  UserData,
  PaymentData,
  DeploymentConfig,
  DeploymentResult,
  FilterOptions,
  AnalyticsData,
  NotificationData,
  MessageData
} from './api/types';

export type {
  DatabaseConfig,
  QueryResult,
  TransactionContext,
  QueryOptions,
  Migration,
  TableSchema,
  ColumnDefinition,
  WhereCondition,
  DatabaseMetrics
} from './database/types';

export type {
  FrameworkDetectionResult,
  ProjectStructure
} from './config/framework-detector';

export type {
  DockerConfiguration
} from './deployment/docker-generator';

// TechFlunky Multi-Stack Platform Class
export class TechFlunkyPlatform {
  private apiAdapter?: BaseAPIAdapter;
  private dbAdapter?: BaseDatabaseAdapter;
  private frameworkDetector: FrameworkDetector;

  constructor(projectPath?: string) {
    this.frameworkDetector = new FrameworkDetector(projectPath);
  }

  /**
   * Auto-detect and configure the platform for the current project
   */
  async autoDetectAndConfigure(): Promise<{
    framework: FrameworkDetectionResult;
    apiAdapter: BaseAPIAdapter;
    dbAdapter: BaseDatabaseAdapter;
    dockerConfig: any;
  }> {
    // Detect the current framework
    const framework = await this.frameworkDetector.getBestMatch();

    if (!framework) {
      throw new Error('Could not detect a supported framework in the current project');
    }

    console.log(`🎯 Detected framework: ${framework.framework} (confidence: ${(framework.confidence * 100).toFixed(1)}%)`);

    // Configure API adapter based on framework
    this.apiAdapter = this.createAPIAdapter(framework);

    // Configure database adapter based on recommendations
    this.dbAdapter = this.createDatabaseAdapter(framework);

    // Generate Docker configuration
    const dockerConfig = DockerGenerator.generateConfiguration(framework, {
      framework: framework.framework as any,
      cloudProvider: framework.recommended.deployment[0] as any,
      database: framework.recommended.database[0] as any,
      storage: framework.recommended.storage[0] as any,
      environment: 'production'
    });

    return {
      framework,
      apiAdapter: this.apiAdapter,
      dbAdapter: this.dbAdapter,
      dockerConfig
    };
  }

  /**
   * Create API adapter based on detected framework
   */
  private createAPIAdapter(framework: FrameworkDetectionResult): BaseAPIAdapter {
    const config = {
      baseUrl: process.env.API_BASE_URL || 'http://localhost:3000',
      apiKey: process.env.API_SECRET_KEY
    };

    switch (framework.framework) {
      case 'nextjs':
        return new NextJSAPIAdapter({
          ...config,
          routerType: framework.config?.routerType || 'app',
          database: {
            type: framework.recommended.database[0] as any,
            url: process.env.DATABASE_URL || ''
          }
        });

      case 'astro':
        return new CloudflareAPIAdapter({
          ...config,
          d1Database: undefined, // Would be injected in real implementation
          r2Bucket: undefined,
          kvNamespace: undefined
        });

      default:
        // Fallback to Cloudflare adapter
        return new CloudflareAPIAdapter({
          ...config,
          d1Database: undefined,
          r2Bucket: undefined,
          kvNamespace: undefined
        });
    }
  }

  /**
   * Create database adapter based on framework recommendations
   */
  private createDatabaseAdapter(framework: FrameworkDetectionResult): BaseDatabaseAdapter {
    const dbType = framework.recommended.database[0];

    const config = {
      type: dbType as any,
      database: 'techflunky',
      connectionString: process.env.DATABASE_URL
    };

    switch (dbType) {
      case 'postgresql':
        return new PostgreSQLAdapter(config);

      case 'd1':
        return new CloudflareAPIAdapter({
          baseUrl: '',
          d1Database: undefined // Would be injected in real implementation
        }) as any; // Type assertion for demo

      default:
        return new PostgreSQLAdapter({
          ...config,
          type: 'postgresql'
        });
    }
  }

  /**
   * Generate complete project configuration
   */
  async generateProjectConfig(): Promise<{
    techflunkyConfig: string;
    envTemplate: string;
    dockerfile: string;
    dockerCompose: string;
    openApiSpec: object;
  }> {
    const framework = await this.frameworkDetector.getBestMatch();

    if (!framework) {
      throw new Error('No supported framework detected');
    }

    const deploymentConfig = {
      framework: framework.framework as any,
      cloudProvider: framework.recommended.deployment[0] as any,
      database: framework.recommended.database[0] as any,
      storage: framework.recommended.storage[0] as any,
      environment: 'production' as const
    };

    const dockerConfig = DockerGenerator.generateConfiguration(framework, deploymentConfig);

    return {
      techflunkyConfig: ConfigurationGenerator.generateTechFlunkyConfig(framework),
      envTemplate: ConfigurationGenerator.generateEnvTemplate(framework),
      dockerfile: dockerConfig.dockerfile,
      dockerCompose: dockerConfig.dockerCompose,
      openApiSpec: openApiSpec
    };
  }

  /**
   * Get current API adapter
   */
  getAPIAdapter(): BaseAPIAdapter {
    if (!this.apiAdapter) {
      throw new Error('API adapter not initialized. Call autoDetectAndConfigure() first.');
    }
    return this.apiAdapter;
  }

  /**
   * Get current database adapter
   */
  getDatabaseAdapter(): BaseDatabaseAdapter {
    if (!this.dbAdapter) {
      throw new Error('Database adapter not initialized. Call autoDetectAndConfigure() first.');
    }
    return this.dbAdapter;
  }

  /**
   * Check if the platform is ready for deployment
   */
  async isReadyForDeployment(): Promise<{
    ready: boolean;
    checks: Array<{ name: string; passed: boolean; message?: string }>;
  }> {
    const checks = [];

    // Check API health
    try {
      if (this.apiAdapter) {
        await this.apiAdapter.healthCheck();
        checks.push({ name: 'API Health', passed: true });
      } else {
        checks.push({ name: 'API Health', passed: false, message: 'API adapter not initialized' });
      }
    } catch (error) {
      checks.push({ name: 'API Health', passed: false, message: 'API health check failed' });
    }

    // Check database connection
    try {
      if (this.dbAdapter) {
        await this.dbAdapter.ping();
        checks.push({ name: 'Database Connection', passed: true });
      } else {
        checks.push({ name: 'Database Connection', passed: false, message: 'Database adapter not initialized' });
      }
    } catch (error) {
      checks.push({ name: 'Database Connection', passed: false, message: 'Database connection failed' });
    }

    // Check environment variables
    const requiredEnvVars = ['DATABASE_URL', 'API_SECRET_KEY', 'STRIPE_SECRET_KEY'];
    const missingVars = requiredEnvVars.filter(varName => !process.env[varName]);

    if (missingVars.length === 0) {
      checks.push({ name: 'Environment Variables', passed: true });
    } else {
      checks.push({
        name: 'Environment Variables',
        passed: false,
        message: `Missing: ${missingVars.join(', ')}`
      });
    }

    const allPassed = checks.every(check => check.passed);

    return {
      ready: allPassed,
      checks
    };
  }
}

// Convenience function for quick setup
export async function setupTechFlunky(projectPath?: string): Promise<TechFlunkyPlatform> {
  const platform = new TechFlunkyPlatform(projectPath);
  await platform.autoDetectAndConfigure();
  return platform;
}

// Export version
export const VERSION = '1.0.0';

// Export supported frameworks and databases
export const SUPPORTED_FRAMEWORKS = [
  'nextjs',
  'astro',
  'nuxt',
  'laravel',
  'django',
  'fastapi',
  'express',
  'nestjs'
];

export const SUPPORTED_DATABASES = [
  'postgresql',
  'mysql',
  'sqlite',
  'd1',
  'mongodb'
];

export const SUPPORTED_CLOUD_PROVIDERS = [
  'cloudflare',
  'aws',
  'gcp',
  'azure',
  'vercel',
  'netlify'
];