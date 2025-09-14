// Docker Containerization System for Multi-Stack Deployments
// Generates optimized Docker configurations for different frameworks

import type { DeploymentConfig } from '../api/types';
import type { FrameworkDetectionResult } from '../config/framework-detector';

export interface DockerConfiguration {
  dockerfile: string;
  dockerCompose: string;
  dockerIgnore: string;
  buildArgs?: Record<string, string>;
  environmentVariables?: Record<string, string>;
  healthCheck?: {
    test: string[];
    interval: string;
    timeout: string;
    retries: number;
  };
}

export class DockerGenerator {
  static generateConfiguration(
    framework: FrameworkDetectionResult,
    deploymentConfig: DeploymentConfig
  ): DockerConfiguration {
    switch (framework.framework) {
      case 'nextjs':
        return this.generateNextJSDocker(framework, deploymentConfig);
      case 'astro':
        return this.generateAstroDocker(framework, deploymentConfig);
      case 'laravel':
        return this.generateLaravelDocker(framework, deploymentConfig);
      case 'django':
        return this.generateDjangoDocker(framework, deploymentConfig);
      case 'fastapi':
        return this.generateFastAPIDocker(framework, deploymentConfig);
      case 'express':
        return this.generateExpressDocker(framework, deploymentConfig);
      default:
        return this.generateGenericNodeDocker(framework, deploymentConfig);
    }
  }

  private static generateNextJSDocker(
    framework: FrameworkDetectionResult,
    config: DeploymentConfig
  ): DockerConfiguration {
    const dockerfile = `# Next.js Production Dockerfile
FROM node:18-alpine AS base

# Install dependencies only when needed
FROM base AS deps
RUN apk add --no-cache libc6-compat
WORKDIR /app

# Install dependencies based on the preferred package manager
COPY package.json package-lock.json* ./
RUN npm ci

# Rebuild the source code only when needed
FROM base AS builder
WORKDIR /app
COPY --from=deps /app/node_modules ./node_modules
COPY . .

# Build arguments
ARG NEXT_PUBLIC_API_URL
ARG DATABASE_URL
ARG STRIPE_PUBLISHABLE_KEY

ENV NEXT_PUBLIC_API_URL=\${NEXT_PUBLIC_API_URL}
ENV DATABASE_URL=\${DATABASE_URL}
ENV STRIPE_PUBLISHABLE_KEY=\${STRIPE_PUBLISHABLE_KEY}
ENV NEXT_TELEMETRY_DISABLED=1

# Build the application
RUN npm run build

# Production image, copy all the files and run next
FROM base AS runner
WORKDIR /app

ENV NODE_ENV=production
ENV NEXT_TELEMETRY_DISABLED=1

RUN addgroup --system --gid 1001 nodejs
RUN adduser --system --uid 1001 nextjs

COPY --from=builder /app/public ./public

# Set the correct permission for prerender cache
RUN mkdir .next
RUN chown nextjs:nodejs .next

# Automatically leverage output traces to reduce image size
COPY --from=builder --chown=nextjs:nodejs /app/.next/standalone ./
COPY --from=builder --chown=nextjs:nodejs /app/.next/static ./.next/static

USER nextjs

EXPOSE 3000

ENV PORT=3000
ENV HOSTNAME="0.0.0.0"

# Health check
HEALTHCHECK --interval=30s --timeout=3s --start-period=5s --retries=3 \\
  CMD curl -f http://localhost:3000/api/health || exit 1

CMD ["node", "server.js"]`;

    const dockerCompose = this.generateDockerCompose('nextjs', config);
    const dockerIgnore = this.generateDockerIgnore('nextjs');

    return {
      dockerfile,
      dockerCompose,
      dockerIgnore,
      buildArgs: {
        NEXT_PUBLIC_API_URL: process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3000',
        DATABASE_URL: process.env.DATABASE_URL || '',
        STRIPE_PUBLISHABLE_KEY: process.env.STRIPE_PUBLISHABLE_KEY || ''
      },
      healthCheck: {
        test: ['CMD', 'curl', '-f', 'http://localhost:3000/api/health'],
        interval: '30s',
        timeout: '3s',
        retries: 3
      }
    };
  }

  private static generateAstroDocker(
    framework: FrameworkDetectionResult,
    config: DeploymentConfig
  ): DockerConfiguration {
    const dockerfile = `# Astro Production Dockerfile
FROM node:18-alpine AS base

# Install dependencies
FROM base AS deps
RUN apk add --no-cache libc6-compat
WORKDIR /app

COPY package.json package-lock.json* ./
RUN npm ci

# Build the source code
FROM base AS builder
WORKDIR /app
COPY --from=deps /app/node_modules ./node_modules
COPY . .

# Build arguments
ARG PUBLIC_API_URL
ARG DATABASE_URL

ENV PUBLIC_API_URL=\${PUBLIC_API_URL}
ENV DATABASE_URL=\${DATABASE_URL}

RUN npm run build

# Production image
FROM nginx:alpine AS runner

# Copy the built app to nginx
COPY --from=builder /app/dist /usr/share/nginx/html

# Copy nginx configuration
COPY nginx.conf /etc/nginx/nginx.conf

EXPOSE 80

# Health check
HEALTHCHECK --interval=30s --timeout=3s --start-period=5s --retries=3 \\
  CMD curl -f http://localhost/health || exit 1

CMD ["nginx", "-g", "daemon off;"]`;

    const dockerCompose = this.generateDockerCompose('astro', config);
    const dockerIgnore = this.generateDockerIgnore('astro');

    return {
      dockerfile,
      dockerCompose,
      dockerIgnore,
      buildArgs: {
        PUBLIC_API_URL: process.env.PUBLIC_API_URL || 'http://localhost:3000',
        DATABASE_URL: process.env.DATABASE_URL || ''
      },
      healthCheck: {
        test: ['CMD', 'curl', '-f', 'http://localhost/health'],
        interval: '30s',
        timeout: '3s',
        retries: 3
      }
    };
  }

  private static generateLaravelDocker(
    framework: FrameworkDetectionResult,
    config: DeploymentConfig
  ): DockerConfiguration {
    const dockerfile = `# Laravel Production Dockerfile
FROM php:8.2-fpm AS base

# Install system dependencies
RUN apt-get update && apt-get install -y \\
    git \\
    curl \\
    libpng-dev \\
    libonig-dev \\
    libxml2-dev \\
    libzip-dev \\
    zip \\
    unzip \\
    nginx \\
    supervisor

# Clear cache
RUN apt-get clean && rm -rf /var/lib/apt/lists/*

# Install PHP extensions
RUN docker-php-ext-install pdo_mysql mbstring exif pcntl bcmath gd zip

# Get latest Composer
COPY --from=composer:latest /usr/bin/composer /usr/bin/composer

# Set working directory
WORKDIR /var/www

# Copy composer files
COPY composer.json composer.lock ./

# Install dependencies
RUN composer install --no-scripts --no-autoloader --prefer-dist

# Copy application code
COPY . .

# Generate autoloader and run scripts
RUN composer dump-autoload --optimize && \\
    php artisan config:cache && \\
    php artisan route:cache && \\
    php artisan view:cache

# Set permissions
RUN chown -R www-data:www-data /var/www && \\
    chmod -R 755 /var/www/storage

# Copy nginx configuration
COPY docker/nginx.conf /etc/nginx/sites-available/default

# Copy supervisor configuration
COPY docker/supervisord.conf /etc/supervisor/conf.d/supervisord.conf

EXPOSE 80

# Health check
HEALTHCHECK --interval=30s --timeout=3s --start-period=10s --retries=3 \\
  CMD curl -f http://localhost/health || exit 1

CMD ["/usr/bin/supervisord", "-c", "/etc/supervisor/conf.d/supervisord.conf"]`;

    const dockerCompose = this.generateDockerCompose('laravel', config);
    const dockerIgnore = this.generateDockerIgnore('laravel');

    return {
      dockerfile,
      dockerCompose,
      dockerIgnore,
      environmentVariables: {
        APP_NAME: 'TechFlunky',
        APP_ENV: 'production',
        APP_DEBUG: 'false',
        LOG_CHANNEL: 'stderr'
      },
      healthCheck: {
        test: ['CMD', 'curl', '-f', 'http://localhost/health'],
        interval: '30s',
        timeout: '3s',
        retries: 3
      }
    };
  }

  private static generateDjangoDocker(
    framework: FrameworkDetectionResult,
    config: DeploymentConfig
  ): DockerConfiguration {
    const dockerfile = `# Django Production Dockerfile
FROM python:3.11-slim AS base

# Set environment variables
ENV PYTHONDONTWRITEBYTECODE=1
ENV PYTHONUNBUFFERED=1

# Install system dependencies
RUN apt-get update && apt-get install -y \\
    build-essential \\
    libpq-dev \\
    curl \\
    && rm -rf /var/lib/apt/lists/*

# Set work directory
WORKDIR /app

# Install Python dependencies
COPY requirements.txt .
RUN pip install --no-cache-dir -r requirements.txt

# Copy project
COPY . .

# Collect static files
RUN python manage.py collectstatic --noinput

# Create non-root user
RUN adduser --disabled-password --gecos '' django && \\
    chown -R django:django /app

USER django

EXPOSE 8000

# Health check
HEALTHCHECK --interval=30s --timeout=3s --start-period=10s --retries=3 \\
  CMD curl -f http://localhost:8000/health/ || exit 1

CMD ["gunicorn", "--bind", "0.0.0.0:8000", "techflunky.wsgi:application"]`;

    const dockerCompose = this.generateDockerCompose('django', config);
    const dockerIgnore = this.generateDockerIgnore('django');

    return {
      dockerfile,
      dockerCompose,
      dockerIgnore,
      environmentVariables: {
        DJANGO_SETTINGS_MODULE: 'techflunky.settings.production',
        DJANGO_SECRET_KEY: process.env.DJANGO_SECRET_KEY || '',
        DJANGO_DEBUG: 'False'
      },
      healthCheck: {
        test: ['CMD', 'curl', '-f', 'http://localhost:8000/health/'],
        interval: '30s',
        timeout: '3s',
        retries: 3
      }
    };
  }

  private static generateFastAPIDocker(
    framework: FrameworkDetectionResult,
    config: DeploymentConfig
  ): DockerConfiguration {
    const dockerfile = `# FastAPI Production Dockerfile
FROM python:3.11-slim AS base

# Set environment variables
ENV PYTHONDONTWRITEBYTECODE=1
ENV PYTHONUNBUFFERED=1

# Install system dependencies
RUN apt-get update && apt-get install -y \\
    build-essential \\
    libpq-dev \\
    curl \\
    && rm -rf /var/lib/apt/lists/*

# Set work directory
WORKDIR /app

# Install Python dependencies
COPY requirements.txt .
RUN pip install --no-cache-dir -r requirements.txt

# Copy project
COPY . .

# Create non-root user
RUN adduser --disabled-password --gecos '' fastapi && \\
    chown -R fastapi:fastapi /app

USER fastapi

EXPOSE 8000

# Health check
HEALTHCHECK --interval=30s --timeout=3s --start-period=5s --retries=3 \\
  CMD curl -f http://localhost:8000/health || exit 1

CMD ["uvicorn", "main:app", "--host", "0.0.0.0", "--port", "8000", "--workers", "4"]`;

    const dockerCompose = this.generateDockerCompose('fastapi', config);
    const dockerIgnore = this.generateDockerIgnore('python');

    return {
      dockerfile,
      dockerCompose,
      dockerIgnore,
      healthCheck: {
        test: ['CMD', 'curl', '-f', 'http://localhost:8000/health'],
        interval: '30s',
        timeout: '3s',
        retries: 3
      }
    };
  }

  private static generateExpressDocker(
    framework: FrameworkDetectionResult,
    config: DeploymentConfig
  ): DockerConfiguration {
    const dockerfile = `# Express.js Production Dockerfile
FROM node:18-alpine AS base

# Install dependencies
FROM base AS deps
RUN apk add --no-cache libc6-compat
WORKDIR /app

COPY package.json package-lock.json* ./
RUN npm ci

# Build the source code (if TypeScript)
FROM base AS builder
WORKDIR /app
COPY --from=deps /app/node_modules ./node_modules
COPY . .

${framework.config?.typescript ? 'RUN npm run build' : '# No build step needed for JavaScript'}

# Production image
FROM base AS runner
WORKDIR /app

ENV NODE_ENV=production

RUN addgroup --system --gid 1001 nodejs
RUN adduser --system --uid 1001 express

COPY --from=deps /app/node_modules ./node_modules
${framework.config?.typescript ?
  'COPY --from=builder --chown=express:nodejs /app/dist ./dist' :
  'COPY --chown=express:nodejs . .'
}

USER express

EXPOSE 3000

# Health check
HEALTHCHECK --interval=30s --timeout=3s --start-period=5s --retries=3 \\
  CMD curl -f http://localhost:3000/health || exit 1

CMD ["npm", "start"]`;

    const dockerCompose = this.generateDockerCompose('express', config);
    const dockerIgnore = this.generateDockerIgnore('nodejs');

    return {
      dockerfile,
      dockerCompose,
      dockerIgnore,
      healthCheck: {
        test: ['CMD', 'curl', '-f', 'http://localhost:3000/health'],
        interval: '30s',
        timeout: '3s',
        retries: 3
      }
    };
  }

  private static generateGenericNodeDocker(
    framework: FrameworkDetectionResult,
    config: DeploymentConfig
  ): DockerConfiguration {
    const dockerfile = `# Generic Node.js Application Dockerfile
FROM node:18-alpine

WORKDIR /app

# Install dependencies
COPY package*.json ./
RUN npm ci --only=production

# Copy app source
COPY . .

# Create non-root user
RUN addgroup -g 1001 -S nodejs
RUN adduser -S nodejs -u 1001

# Change ownership
RUN chown -R nodejs:nodejs /app
USER nodejs

EXPOSE 3000

# Health check
HEALTHCHECK --interval=30s --timeout=3s --start-period=5s --retries=3 \\
  CMD curl -f http://localhost:3000/health || exit 1

CMD ["npm", "start"]`;

    const dockerCompose = this.generateDockerCompose('nodejs', config);
    const dockerIgnore = this.generateDockerIgnore('nodejs');

    return {
      dockerfile,
      dockerCompose,
      dockerIgnore,
      healthCheck: {
        test: ['CMD', 'curl', '-f', 'http://localhost:3000/health'],
        interval: '30s',
        timeout: '3s',
        retries: 3
      }
    };
  }

  private static generateDockerCompose(framework: string, config: DeploymentConfig): string {
    const dbService = this.generateDatabaseService(config.database);
    const redisService = this.generateRedisService();
    const appService = this.generateAppService(framework, config);

    return `version: '3.8'

services:
  app:
${appService}

  database:
${dbService}

  redis:
${redisService}

  nginx:
    image: nginx:alpine
    ports:
      - "80:80"
      - "443:443"
    volumes:
      - ./docker/nginx.conf:/etc/nginx/nginx.conf:ro
      - ./docker/ssl:/etc/nginx/ssl:ro
    depends_on:
      - app
    networks:
      - techflunky

networks:
  techflunky:
    driver: bridge

volumes:
  postgres_data:
  redis_data:`;
  }

  private static generateAppService(framework: string, config: DeploymentConfig): string {
    const port = this.getDefaultPort(framework);

    return `    build:
      context: .
      dockerfile: Dockerfile
    ports:
      - "${port}:${port}"
    environment:
      - NODE_ENV=production
      - DATABASE_URL=\${DATABASE_URL}
      - REDIS_URL=redis://redis:6379
      - API_SECRET_KEY=\${API_SECRET_KEY}
      - STRIPE_SECRET_KEY=\${STRIPE_SECRET_KEY}
    depends_on:
      - database
      - redis
    volumes:
      - ./uploads:/app/uploads
    networks:
      - techflunky
    restart: unless-stopped
    healthcheck:
      test: ["CMD", "curl", "-f", "http://localhost:${port}/health"]
      interval: 30s
      timeout: 10s
      retries: 3`;
  }

  private static generateDatabaseService(dbType: string): string {
    switch (dbType) {
      case 'postgresql':
        return `    image: postgres:15-alpine
    environment:
      - POSTGRES_DB=techflunky
      - POSTGRES_USER=\${DB_USER:-techflunky}
      - POSTGRES_PASSWORD=\${DB_PASSWORD}
    volumes:
      - postgres_data:/var/lib/postgresql/data
      - ./database/init.sql:/docker-entrypoint-initdb.d/init.sql:ro
    ports:
      - "5432:5432"
    networks:
      - techflunky
    restart: unless-stopped
    healthcheck:
      test: ["CMD-SHELL", "pg_isready -U \${DB_USER:-techflunky}"]
      interval: 10s
      timeout: 5s
      retries: 5`;

      case 'mysql':
        return `    image: mysql:8.0
    environment:
      - MYSQL_DATABASE=techflunky
      - MYSQL_USER=\${DB_USER:-techflunky}
      - MYSQL_PASSWORD=\${DB_PASSWORD}
      - MYSQL_ROOT_PASSWORD=\${DB_ROOT_PASSWORD}
    volumes:
      - postgres_data:/var/lib/mysql
      - ./database/init.sql:/docker-entrypoint-initdb.d/init.sql:ro
    ports:
      - "3306:3306"
    networks:
      - techflunky
    restart: unless-stopped
    healthcheck:
      test: ["CMD", "mysqladmin", "ping", "-h", "localhost"]
      interval: 10s
      timeout: 5s
      retries: 5`;

      case 'mongodb':
        return `    image: mongo:6.0
    environment:
      - MONGO_INITDB_DATABASE=techflunky
      - MONGO_INITDB_ROOT_USERNAME=\${DB_USER:-techflunky}
      - MONGO_INITDB_ROOT_PASSWORD=\${DB_PASSWORD}
    volumes:
      - postgres_data:/data/db
    ports:
      - "27017:27017"
    networks:
      - techflunky
    restart: unless-stopped
    healthcheck:
      test: echo 'db.runCommand("ping").ok' | mongosh localhost:27017/test --quiet
      interval: 10s
      timeout: 5s
      retries: 5`;

      default:
        return this.generateDatabaseService('postgresql');
    }
  }

  private static generateRedisService(): string {
    return `    image: redis:7-alpine
    volumes:
      - redis_data:/data
    ports:
      - "6379:6379"
    networks:
      - techflunky
    restart: unless-stopped
    healthcheck:
      test: ["CMD", "redis-cli", "ping"]
      interval: 10s
      timeout: 5s
      retries: 5`;
  }

  private static generateDockerIgnore(framework: string): string {
    const common = [
      'node_modules',
      'npm-debug.log*',
      'yarn-debug.log*',
      'yarn-error.log*',
      '.git',
      '.gitignore',
      'README.md',
      '.env',
      '.env.local',
      '.env.development.local',
      '.env.test.local',
      '.env.production.local',
      'coverage',
      '.nyc_output',
      '.cache',
      '.parcel-cache',
      '.tmp',
      '.temp'
    ];

    switch (framework) {
      case 'nextjs':
        return [...common, '.next', 'out'].join('\n');
      case 'astro':
        return [...common, 'dist', '.astro'].join('\n');
      case 'laravel':
        return [
          ...common,
          'vendor',
          'storage/app/*',
          'storage/framework/cache/*',
          'storage/framework/sessions/*',
          'storage/framework/views/*',
          'storage/logs/*',
          'bootstrap/cache/*',
          '.env',
          '.env.*',
          '.phpunit.result.cache'
        ].join('\n');
      case 'django':
      case 'fastapi':
        return [
          '__pycache__',
          '*.pyc',
          '*.pyo',
          '*.pyd',
          '.Python',
          'env',
          'venv',
          '.venv',
          'pip-log.txt',
          'pip-delete-this-directory.txt',
          '.tox',
          '.coverage',
          '.coverage.*',
          '.cache',
          'nosetests.xml',
          'coverage.xml',
          '*.cover',
          '*.log',
          '.git',
          '.gitignore',
          'README.md',
          '.env',
          '.env.*',
          'db.sqlite3',
          'media'
        ].join('\n');
      default:
        return common.join('\n');
    }
  }

  private static getDefaultPort(framework: string): number {
    switch (framework) {
      case 'nextjs':
      case 'astro':
      case 'express':
        return 3000;
      case 'laravel':
        return 80;
      case 'django':
      case 'fastapi':
        return 8000;
      default:
        return 3000;
    }
  }

  // Generate Kubernetes manifests for production deployment
  static generateKubernetesManifests(
    framework: FrameworkDetectionResult,
    config: DeploymentConfig
  ): { deployment: string; service: string; ingress: string; configMap: string } {
    const appName = 'techflunky';
    const namespace = config.environment || 'default';

    const deployment = `apiVersion: apps/v1
kind: Deployment
metadata:
  name: ${appName}
  namespace: ${namespace}
  labels:
    app: ${appName}
    framework: ${framework.framework}
spec:
  replicas: 3
  selector:
    matchLabels:
      app: ${appName}
  template:
    metadata:
      labels:
        app: ${appName}
    spec:
      containers:
      - name: ${appName}
        image: ${appName}:latest
        ports:
        - containerPort: ${this.getDefaultPort(framework.framework)}
        env:
        - name: NODE_ENV
          value: "production"
        - name: DATABASE_URL
          valueFrom:
            secretKeyRef:
              name: ${appName}-secrets
              key: database-url
        - name: API_SECRET_KEY
          valueFrom:
            secretKeyRef:
              name: ${appName}-secrets
              key: api-secret
        resources:
          requests:
            memory: "256Mi"
            cpu: "250m"
          limits:
            memory: "512Mi"
            cpu: "500m"
        livenessProbe:
          httpGet:
            path: /health
            port: ${this.getDefaultPort(framework.framework)}
          initialDelaySeconds: 30
          periodSeconds: 10
        readinessProbe:
          httpGet:
            path: /health
            port: ${this.getDefaultPort(framework.framework)}
          initialDelaySeconds: 5
          periodSeconds: 5`;

    const service = `apiVersion: v1
kind: Service
metadata:
  name: ${appName}-service
  namespace: ${namespace}
spec:
  selector:
    app: ${appName}
  ports:
  - protocol: TCP
    port: 80
    targetPort: ${this.getDefaultPort(framework.framework)}
  type: ClusterIP`;

    const ingress = `apiVersion: networking.k8s.io/v1
kind: Ingress
metadata:
  name: ${appName}-ingress
  namespace: ${namespace}
  annotations:
    kubernetes.io/ingress.class: "nginx"
    cert-manager.io/cluster-issuer: "letsencrypt-prod"
    nginx.ingress.kubernetes.io/ssl-redirect: "true"
spec:
  tls:
  - hosts:
    - ${config.domain || 'techflunky.com'}
    secretName: ${appName}-tls
  rules:
  - host: ${config.domain || 'techflunky.com'}
    http:
      paths:
      - path: /
        pathType: Prefix
        backend:
          service:
            name: ${appName}-service
            port:
              number: 80`;

    const configMap = `apiVersion: v1
kind: ConfigMap
metadata:
  name: ${appName}-config
  namespace: ${namespace}
data:
  app.name: "${appName}"
  app.framework: "${framework.framework}"
  app.version: "${framework.version || '1.0.0'}"
  deployment.environment: "${config.environment}"`;

    return { deployment, service, ingress, configMap };
  }
}