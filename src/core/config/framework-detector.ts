// Framework Detection and Configuration System
// Automatically detects and configures TechFlunky for different technology stacks

import { readFileSync, existsSync } from 'fs';
import { join } from 'path';

export interface FrameworkDetectionResult {
  framework: string;
  version?: string;
  confidence: number;
  features: string[];
  recommended: {
    database: string[];
    deployment: string[];
    storage: string[];
  };
  config: Record<string, any>;
}

export interface ProjectStructure {
  packageJson?: any;
  files: string[];
  directories: string[];
  configFiles: string[];
}

export class FrameworkDetector {
  private projectPath: string;

  constructor(projectPath: string = process.cwd()) {
    this.projectPath = projectPath;
  }

  async detectFramework(): Promise<FrameworkDetectionResult[]> {
    const structure = await this.analyzeProjectStructure();
    const detectors = [
      this.detectNextJS.bind(this),
      this.detectAstro.bind(this),
      this.detectNuxt.bind(this),
      this.detectVite.bind(this),
      this.detectRemix.bind(this),
      this.detectSvelteKit.bind(this),
      this.detectLaravel.bind(this),
      this.detectDjango.bind(this),
      this.detectFastAPI.bind(this),
      this.detectExpress.bind(this),
      this.detectNestJS.bind(this)
    ];

    const results: FrameworkDetectionResult[] = [];

    for (const detector of detectors) {
      try {
        const result = await detector(structure);
        if (result && result.confidence > 0.3) {
          results.push(result);
        }
      } catch (error) {
        console.warn(`Framework detection error: ${error}`);
      }
    }

    return results.sort((a, b) => b.confidence - a.confidence);
  }

  async getBestMatch(): Promise<FrameworkDetectionResult | null> {
    const results = await this.detectFramework();
    return results.length > 0 ? results[0] : null;
  }

  private async analyzeProjectStructure(): Promise<ProjectStructure> {
    const packageJsonPath = join(this.projectPath, 'package.json');
    let packageJson;

    try {
      if (existsSync(packageJsonPath)) {
        packageJson = JSON.parse(readFileSync(packageJsonPath, 'utf-8'));
      }
    } catch (error) {
      console.warn('Could not read package.json');
    }

    // In a real implementation, these would use fs.readdir
    const files = this.mockGetFiles();
    const directories = this.mockGetDirectories();
    const configFiles = this.mockGetConfigFiles();

    return {
      packageJson,
      files,
      directories,
      configFiles
    };
  }

  // Next.js Detection
  private async detectNextJS(structure: ProjectStructure): Promise<FrameworkDetectionResult | null> {
    let confidence = 0;
    const features: string[] = [];

    // Check package.json dependencies
    if (structure.packageJson) {
      const deps = { ...structure.packageJson.dependencies, ...structure.packageJson.devDependencies };

      if (deps.next) {
        confidence += 0.8;
        features.push('Next.js framework');
      }

      if (deps.react) {
        confidence += 0.2;
        features.push('React components');
      }

      if (deps['next-auth']) {
        features.push('NextAuth authentication');
      }

      if (deps['@vercel/analytics']) {
        features.push('Vercel analytics');
      }
    }

    // Check for Next.js specific files
    if (structure.configFiles.includes('next.config.js') || structure.configFiles.includes('next.config.mjs')) {
      confidence += 0.3;
      features.push('Next.js configuration');
    }

    // Check for App Router
    if (structure.directories.includes('app')) {
      features.push('App Router');
      confidence += 0.1;
    }

    // Check for Pages Router
    if (structure.directories.includes('pages')) {
      features.push('Pages Router');
      confidence += 0.1;
    }

    if (confidence < 0.3) return null;

    return {
      framework: 'nextjs',
      version: structure.packageJson?.dependencies?.next || structure.packageJson?.devDependencies?.next,
      confidence: Math.min(confidence, 1.0),
      features,
      recommended: {
        database: ['postgresql', 'mysql', 'sqlite'],
        deployment: ['vercel', 'aws', 'netlify'],
        storage: ['s3', 'cloudinary', 'uploadthing']
      },
      config: {
        routerType: structure.directories.includes('app') ? 'app' : 'pages',
        typescript: structure.configFiles.includes('tsconfig.json'),
        tailwind: structure.configFiles.includes('tailwind.config.js') || structure.configFiles.includes('tailwind.config.ts')
      }
    };
  }

  // Astro Detection
  private async detectAstro(structure: ProjectStructure): Promise<FrameworkDetectionResult | null> {
    let confidence = 0;
    const features: string[] = [];

    if (structure.packageJson) {
      const deps = { ...structure.packageJson.dependencies, ...structure.packageJson.devDependencies };

      if (deps.astro) {
        confidence += 0.8;
        features.push('Astro framework');
      }

      if (deps['@astrojs/react']) {
        features.push('React integration');
      }

      if (deps['@astrojs/vue']) {
        features.push('Vue integration');
      }

      if (deps['@astrojs/svelte']) {
        features.push('Svelte integration');
      }
    }

    if (structure.configFiles.includes('astro.config.mjs') || structure.configFiles.includes('astro.config.js')) {
      confidence += 0.3;
      features.push('Astro configuration');
    }

    if (confidence < 0.3) return null;

    return {
      framework: 'astro',
      version: structure.packageJson?.dependencies?.astro || structure.packageJson?.devDependencies?.astro,
      confidence: Math.min(confidence, 1.0),
      features,
      recommended: {
        database: ['d1', 'postgresql', 'sqlite'],
        deployment: ['cloudflare', 'vercel', 'netlify'],
        storage: ['r2', 's3', 'cloudinary']
      },
      config: {
        ssr: structure.packageJson?.dependencies?.['@astrojs/node'] || false,
        typescript: structure.configFiles.includes('tsconfig.json')
      }
    };
  }

  // Nuxt.js Detection
  private async detectNuxt(structure: ProjectStructure): Promise<FrameworkDetectionResult | null> {
    let confidence = 0;
    const features: string[] = [];

    if (structure.packageJson) {
      const deps = { ...structure.packageJson.dependencies, ...structure.packageJson.devDependencies };

      if (deps.nuxt) {
        confidence += 0.8;
        features.push('Nuxt.js framework');
      }

      if (deps.vue) {
        confidence += 0.2;
        features.push('Vue.js');
      }

      if (deps['@nuxtjs/tailwindcss']) {
        features.push('Tailwind CSS integration');
      }
    }

    if (structure.configFiles.includes('nuxt.config.js') || structure.configFiles.includes('nuxt.config.ts')) {
      confidence += 0.3;
      features.push('Nuxt configuration');
    }

    if (confidence < 0.3) return null;

    return {
      framework: 'nuxt',
      version: structure.packageJson?.dependencies?.nuxt || structure.packageJson?.devDependencies?.nuxt,
      confidence: Math.min(confidence, 1.0),
      features,
      recommended: {
        database: ['postgresql', 'mysql', 'sqlite'],
        deployment: ['vercel', 'netlify', 'aws'],
        storage: ['s3', 'cloudinary']
      },
      config: {
        typescript: structure.configFiles.includes('tsconfig.json'),
        ssr: true
      }
    };
  }

  // Laravel Detection
  private async detectLaravel(structure: ProjectStructure): Promise<FrameworkDetectionResult | null> {
    let confidence = 0;
    const features: string[] = [];

    // Check for composer.json
    const composerPath = join(this.projectPath, 'composer.json');
    let composerJson;

    try {
      if (existsSync(composerPath)) {
        composerJson = JSON.parse(readFileSync(composerPath, 'utf-8'));
      }
    } catch (error) {
      // Ignore
    }

    if (composerJson?.require?.['laravel/framework']) {
      confidence += 0.8;
      features.push('Laravel framework');
    }

    if (structure.files.includes('artisan')) {
      confidence += 0.3;
      features.push('Artisan CLI');
    }

    if (structure.directories.includes('app') && structure.directories.includes('routes')) {
      confidence += 0.2;
      features.push('Laravel directory structure');
    }

    if (confidence < 0.3) return null;

    return {
      framework: 'laravel',
      version: composerJson?.require?.['laravel/framework'],
      confidence: Math.min(confidence, 1.0),
      features,
      recommended: {
        database: ['mysql', 'postgresql', 'sqlite'],
        deployment: ['aws', 'gcp', 'forge'],
        storage: ['s3', 'minio']
      },
      config: {
        php: true,
        eloquent: true,
        blade: true
      }
    };
  }

  // Django Detection
  private async detectDjango(structure: ProjectStructure): Promise<FrameworkDetectionResult | null> {
    let confidence = 0;
    const features: string[] = [];

    // Check for requirements.txt or Pipfile
    if (structure.files.includes('requirements.txt') || structure.files.includes('Pipfile')) {
      // In real implementation, would parse these files
      confidence += 0.4;
    }

    if (structure.files.includes('manage.py')) {
      confidence += 0.5;
      features.push('Django management script');
    }

    if (structure.files.includes('settings.py') || structure.directories.includes('settings')) {
      confidence += 0.3;
      features.push('Django settings');
    }

    if (confidence < 0.3) return null;

    return {
      framework: 'django',
      confidence: Math.min(confidence, 1.0),
      features,
      recommended: {
        database: ['postgresql', 'mysql', 'sqlite'],
        deployment: ['aws', 'gcp', 'heroku'],
        storage: ['s3', 'gcs']
      },
      config: {
        python: true,
        orm: 'django',
        templates: 'django'
      }
    };
  }

  // FastAPI Detection
  private async detectFastAPI(structure: ProjectStructure): Promise<FrameworkDetectionResult | null> {
    let confidence = 0;
    const features: string[] = [];

    // Check for requirements.txt or pyproject.toml
    if (structure.files.includes('requirements.txt') || structure.files.includes('pyproject.toml')) {
      // In real implementation, would parse these files for fastapi dependency
      confidence += 0.6;
      features.push('FastAPI framework');
    }

    if (structure.files.includes('main.py') || structure.files.includes('app.py')) {
      confidence += 0.3;
    }

    if (confidence < 0.3) return null;

    return {
      framework: 'fastapi',
      confidence: Math.min(confidence, 1.0),
      features,
      recommended: {
        database: ['postgresql', 'mysql', 'mongodb'],
        deployment: ['aws', 'gcp', 'docker'],
        storage: ['s3', 'gcs']
      },
      config: {
        python: true,
        async: true,
        openapi: true
      }
    };
  }

  // Additional framework detectors would follow similar patterns...
  private async detectVite(structure: ProjectStructure): Promise<FrameworkDetectionResult | null> {
    // Vite detection logic
    return null;
  }

  private async detectRemix(structure: ProjectStructure): Promise<FrameworkDetectionResult | null> {
    // Remix detection logic
    return null;
  }

  private async detectSvelteKit(structure: ProjectStructure): Promise<FrameworkDetectionResult | null> {
    // SvelteKit detection logic
    return null;
  }

  private async detectExpress(structure: ProjectStructure): Promise<FrameworkDetectionResult | null> {
    // Express detection logic
    return null;
  }

  private async detectNestJS(structure: ProjectStructure): Promise<FrameworkDetectionResult | null> {
    // NestJS detection logic
    return null;
  }

  // Mock methods for file system operations (in real implementation, use fs)
  private mockGetFiles(): string[] {
    return ['package.json', 'next.config.js', 'artisan', 'manage.py', 'main.py', 'requirements.txt'];
  }

  private mockGetDirectories(): string[] {
    return ['src', 'app', 'pages', 'components', 'lib', 'public', 'routes'];
  }

  private mockGetConfigFiles(): string[] {
    return ['next.config.js', 'astro.config.mjs', 'nuxt.config.js', 'vite.config.js', 'tailwind.config.js', 'tsconfig.json'];
  }
}

// Configuration generator for detected frameworks
export class ConfigurationGenerator {
  static generateTechFlunkyConfig(detection: FrameworkDetectionResult): string {
    const config = {
      framework: detection.framework,
      version: detection.version,
      features: detection.features,
      database: {
        type: detection.recommended.database[0],
        migrations: true,
        seeders: detection.framework === 'laravel' || detection.framework === 'django'
      },
      deployment: {
        provider: detection.recommended.deployment[0],
        environment: 'production',
        customDomain: true
      },
      storage: {
        provider: detection.recommended.storage[0],
        publicAccess: true
      },
      api: {
        version: 'v1',
        authentication: true,
        rateLimit: true
      },
      monitoring: {
        analytics: true,
        errorTracking: true,
        performance: true
      },
      ...detection.config
    };

    return JSON.stringify(config, null, 2);
  }

  static generateEnvTemplate(detection: FrameworkDetectionResult): string {
    const envVars = [
      '# Database Configuration',
      'DATABASE_URL="postgresql://user:password@localhost:5432/techflunky"',
      '',
      '# API Configuration',
      'API_BASE_URL="http://localhost:3000"',
      'API_SECRET_KEY="your-secret-key-here"',
      '',
      '# Payment Processing (Stripe)',
      'STRIPE_PUBLISHABLE_KEY="pk_test_..."',
      'STRIPE_SECRET_KEY="sk_test_..."',
      'STRIPE_WEBHOOK_SECRET="whsec_..."',
      '',
      '# File Storage',
      'STORAGE_PROVIDER="s3"',
      'AWS_ACCESS_KEY_ID="your-access-key"',
      'AWS_SECRET_ACCESS_KEY="your-secret-key"',
      'AWS_REGION="us-east-1"',
      'AWS_BUCKET="techflunky-uploads"',
      ''
    ];

    // Framework-specific environment variables
    switch (detection.framework) {
      case 'nextjs':
        envVars.push(
          '# Next.js Configuration',
          'NEXTAUTH_URL="http://localhost:3000"',
          'NEXTAUTH_SECRET="your-nextauth-secret"',
          ''
        );
        break;
      case 'laravel':
        envVars.push(
          '# Laravel Configuration',
          'APP_NAME="TechFlunky"',
          'APP_ENV="production"',
          'APP_KEY="base64:..."',
          'APP_DEBUG="false"',
          'APP_URL="http://localhost"',
          ''
        );
        break;
      case 'django':
        envVars.push(
          '# Django Configuration',
          'DJANGO_SECRET_KEY="your-django-secret-key"',
          'DJANGO_DEBUG="False"',
          'DJANGO_ALLOWED_HOSTS="localhost,127.0.0.1"',
          ''
        );
        break;
    }

    return envVars.join('\n');
  }

  static generateDockerfile(detection: FrameworkDetectionResult): string {
    switch (detection.framework) {
      case 'nextjs':
        return `FROM node:18-alpine AS base

# Install dependencies only when needed
FROM base AS deps
RUN apk add --no-cache libc6-compat
WORKDIR /app

COPY package.json package-lock.json* ./
RUN npm ci

# Rebuild the source code only when needed
FROM base AS builder
WORKDIR /app
COPY --from=deps /app/node_modules ./node_modules
COPY . .

ENV NEXT_TELEMETRY_DISABLED 1
RUN npm run build

# Production image, copy all the files and run next
FROM base AS runner
WORKDIR /app

ENV NODE_ENV production
ENV NEXT_TELEMETRY_DISABLED 1

RUN addgroup --system --gid 1001 nodejs
RUN adduser --system --uid 1001 nextjs

COPY --from=builder /app/public ./public
COPY --from=builder --chown=nextjs:nodejs /app/.next/standalone ./
COPY --from=builder --chown=nextjs:nodejs /app/.next/static ./.next/static

USER nextjs

EXPOSE 3000
ENV PORT 3000

CMD ["node", "server.js"]`;

      case 'laravel':
        return `FROM php:8.2-fpm

# Install system dependencies
RUN apt-get update && apt-get install -y \\
    git \\
    curl \\
    libpng-dev \\
    libonig-dev \\
    libxml2-dev \\
    zip \\
    unzip

# Clear cache
RUN apt-get clean && rm -rf /var/lib/apt/lists/*

# Install PHP extensions
RUN docker-php-ext-install pdo_mysql mbstring exif pcntl bcmath gd

# Get latest Composer
COPY --from=composer:latest /usr/bin/composer /usr/bin/composer

# Set working directory
WORKDIR /var/www

# Copy application files
COPY . .

# Install dependencies
RUN composer install --optimize-autoloader --no-dev

# Set permissions
RUN chown -R www-data:www-data /var/www

EXPOSE 8000

CMD ["php", "artisan", "serve", "--host=0.0.0.0", "--port=8000"]`;

      default:
        return `FROM node:18-alpine

WORKDIR /app

COPY package*.json ./
RUN npm ci --only=production

COPY . .

EXPOSE 3000

CMD ["npm", "start"]`;
    }
  }
}