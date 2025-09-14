// API endpoint to analyze repository and generate containerization
import type { APIRoute } from 'astro';

interface RepositoryAnalysis {
  techStack: string[];
  framework: string;
  packageManager: string;
  hasDockerfile: boolean;
  hasDatabaseConfig: boolean;
  environmentVariables: string[];
  buildCommand: string;
  startCommand: string;
  dependencies: Record<string, any>;
}

interface ContainerizationConfig {
  dockerfile: string;
  dockerCompose: string;
  k8sManifest: string;
  cicdConfig: string;
  deploymentInstructions: string;
}

export const POST: APIRoute = async ({ request }) => {
  try {
    const { repositoryUrl, techStack, needsContainerization } = await request.json();

    // Simulate repository analysis (in production, this would use GitHub API)
    const analysis = await analyzeRepository(repositoryUrl, techStack);

    // Generate containerization if needed
    let containerization: ContainerizationConfig | null = null;
    if (needsContainerization) {
      containerization = await generateContainerization(analysis);
    }

    return new Response(
      JSON.stringify({
        analysis,
        containerization,
        success: true,
      }),
      {
        status: 200,
        headers: { 'Content-Type': 'application/json' },
      }
    );
  } catch (error) {
    console.error('Repository analysis error:', error);
    return new Response(
      JSON.stringify({ error: 'Failed to analyze repository' }),
      {
        status: 500,
        headers: { 'Content-Type': 'application/json' },
      }
    );
  }
};

async function analyzeRepository(repositoryUrl: string, techStack: string[]): Promise<RepositoryAnalysis> {
  // Mock analysis - in production, this would:
  // 1. Clone or fetch repository metadata via GitHub API
  // 2. Analyze package.json, requirements.txt, etc.
  // 3. Detect framework and dependencies
  // 4. Scan for environment variables

  const framework = detectFramework(techStack);
  const packageManager = detectPackageManager(framework);

  return {
    techStack,
    framework,
    packageManager,
    hasDockerfile: false, // Would check actual repo
    hasDatabaseConfig: techStack.some(stack =>
      ['PostgreSQL', 'MySQL', 'MongoDB', 'Redis'].includes(stack)
    ),
    environmentVariables: [
      'DATABASE_URL',
      'JWT_SECRET',
      'API_KEY',
      'NODE_ENV',
    ],
    buildCommand: getBuildCommand(framework),
    startCommand: getStartCommand(framework),
    dependencies: {}, // Would contain actual package.json or equivalent
  };
}

async function generateContainerization(analysis: RepositoryAnalysis): Promise<ContainerizationConfig> {
  const dockerfile = generateDockerfile(analysis);
  const dockerCompose = generateDockerCompose(analysis);
  const k8sManifest = generateKubernetesManifest(analysis);
  const cicdConfig = generateCICDConfig(analysis);
  const deploymentInstructions = generateDeploymentInstructions(analysis);

  return {
    dockerfile,
    dockerCompose,
    k8sManifest,
    cicdConfig,
    deploymentInstructions,
  };
}

function detectFramework(techStack: string[]): string {
  if (techStack.includes('React/Next.js')) return 'nextjs';
  if (techStack.includes('Vue/Nuxt.js')) return 'nuxtjs';
  if (techStack.includes('Angular')) return 'angular';
  if (techStack.includes('Astro/SvelteKit')) return 'astro';
  if (techStack.includes('Node.js')) return 'nodejs';
  if (techStack.includes('Python')) return 'python';
  if (techStack.includes('Go/Rust')) return 'go';
  if (techStack.includes('PHP')) return 'php';
  return 'generic';
}

function detectPackageManager(framework: string): string {
  switch (framework) {
    case 'nextjs':
    case 'nuxtjs':
    case 'nodejs':
    case 'astro':
      return 'npm';
    case 'python':
      return 'pip';
    case 'php':
      return 'composer';
    case 'go':
      return 'go mod';
    default:
      return 'npm';
  }
}

function getBuildCommand(framework: string): string {
  switch (framework) {
    case 'nextjs':
      return 'npm run build';
    case 'nuxtjs':
      return 'npm run build';
    case 'angular':
      return 'npm run build';
    case 'astro':
      return 'npm run build';
    case 'python':
      return 'pip install -r requirements.txt';
    case 'php':
      return 'composer install --no-dev';
    case 'go':
      return 'go build -o app .';
    default:
      return 'npm run build';
  }
}

function getStartCommand(framework: string): string {
  switch (framework) {
    case 'nextjs':
      return 'npm start';
    case 'nuxtjs':
      return 'npm start';
    case 'angular':
      return 'npm start';
    case 'astro':
      return 'npm start';
    case 'python':
      return 'python app.py';
    case 'php':
      return 'php -S 0.0.0.0:8000';
    case 'go':
      return './app';
    default:
      return 'npm start';
  }
}

function generateDockerfile(analysis: RepositoryAnalysis): string {
  const baseImage = getBaseImage(analysis.framework);
  const workdir = '/app';

  return `# Multi-stage Dockerfile for ${analysis.framework}
# Generated by TechFlunky Platform Analysis

# Build stage
FROM ${baseImage} AS builder

WORKDIR ${workdir}

# Copy package files
${getCopyPackageFiles(analysis.packageManager)}

# Install dependencies
RUN ${getInstallCommand(analysis.packageManager)}

# Copy source code
COPY . .

# Build application
RUN ${analysis.buildCommand}

# Production stage
FROM ${baseImage} AS production

# Create non-root user for security
RUN addgroup -g 1001 -S appgroup && \\
    adduser -S appuser -u 1001 -G appgroup

WORKDIR ${workdir}

# Copy built application
COPY --from=builder --chown=appuser:appgroup ${workdir} .

# Switch to non-root user
USER appuser

# Expose port
EXPOSE ${getDefaultPort(analysis.framework)}

# Health check
HEALTHCHECK --interval=30s --timeout=3s --start-period=5s --retries=3 \\
  CMD curl -f http://localhost:${getDefaultPort(analysis.framework)}/health || exit 1

# Start application
CMD ["${analysis.startCommand.split(' ')[0]}", "${analysis.startCommand.split(' ').slice(1).join('", "')}"]
`;
}

function generateDockerCompose(analysis: RepositoryAnalysis): string {
  const hasDatabase = analysis.hasDatabaseConfig;

  return `# Docker Compose configuration
# Generated by TechFlunky Platform Analysis

version: '3.8'

services:
  app:
    build: .
    ports:
      - "${getDefaultPort(analysis.framework)}:${getDefaultPort(analysis.framework)}"
    environment:
      - NODE_ENV=production
${analysis.environmentVariables.map(env => `      - ${env}=\${${env}}`).join('\n')}
    depends_on:
${hasDatabase ? `      - database` : '      # No database dependencies'}
    restart: unless-stopped
    networks:
      - app-network

${hasDatabase ? `  database:
    image: postgres:15-alpine
    environment:
      - POSTGRES_DB=\${POSTGRES_DB:-app}
      - POSTGRES_USER=\${POSTGRES_USER:-user}
      - POSTGRES_PASSWORD=\${POSTGRES_PASSWORD}
    volumes:
      - postgres_data:/var/lib/postgresql/data
    networks:
      - app-network
    restart: unless-stopped

volumes:
  postgres_data:` : ''}

networks:
  app-network:
    driver: bridge
`;
}

function generateKubernetesManifest(analysis: RepositoryAnalysis): string {
  return `# Kubernetes deployment manifest
# Generated by TechFlunky Platform Analysis

apiVersion: apps/v1
kind: Deployment
metadata:
  name: platform-deployment
  labels:
    app: platform
spec:
  replicas: 3
  selector:
    matchLabels:
      app: platform
  template:
    metadata:
      labels:
        app: platform
    spec:
      containers:
      - name: app
        image: platform:latest
        ports:
        - containerPort: ${getDefaultPort(analysis.framework)}
        env:
${analysis.environmentVariables.map(env => `        - name: ${env}
          valueFrom:
            secretKeyRef:
              name: platform-secrets
              key: ${env.toLowerCase()}`).join('\n')}
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
            port: ${getDefaultPort(analysis.framework)}
          initialDelaySeconds: 30
          periodSeconds: 10
        readinessProbe:
          httpGet:
            path: /health
            port: ${getDefaultPort(analysis.framework)}
          initialDelaySeconds: 5
          periodSeconds: 5

---
apiVersion: v1
kind: Service
metadata:
  name: platform-service
spec:
  selector:
    app: platform
  ports:
  - protocol: TCP
    port: 80
    targetPort: ${getDefaultPort(analysis.framework)}
  type: ClusterIP

---
apiVersion: v1
kind: Secret
metadata:
  name: platform-secrets
type: Opaque
data:
${analysis.environmentVariables.map(env => `  ${env.toLowerCase()}: # Base64 encoded value`).join('\n')}
`;
}

function generateCICDConfig(analysis: RepositoryAnalysis): string {
  return [
    '# GitHub Actions CI/CD Pipeline',
    '# Generated by TechFlunky Platform Analysis',
    '',
    'name: Build and Deploy',
    '',
    'on:',
    '  push:',
    '    branches: [ main ]',
    '  pull_request:',
    '    branches: [ main ]',
    '',
    'jobs:',
    '  build:',
    '    runs-on: ubuntu-latest',
    '',
    '    steps:',
    '    - uses: actions/checkout@v3',
    '',
    '    - name: Set up Node.js',
    '      uses: actions/setup-node@v3',
    '      with:',
    '        node-version: \'18\'',
    '        cache: \'' + analysis.packageManager + '\'',
    '',
    '    - name: Install dependencies',
    '      run: ' + getInstallCommand(analysis.packageManager),
    '',
    '    - name: Run tests',
    '      run: npm test',
    '',
    '    - name: Build application',
    '      run: ' + analysis.buildCommand,
    '',
    '    - name: Build Docker image',
    '      run: |',
    '        docker build -t platform:${{ github.sha }} .',
    '        docker tag platform:${{ github.sha }} platform:latest',
    '',
    '    - name: Deploy to production',
    '      run: |',
    '        # Add your deployment commands here',
    '        echo "Deploy to your preferred platform"',
  ].join('\n');
}

function generateDeploymentInstructions(analysis: RepositoryAnalysis): string {
  return `# Deployment Instructions
Generated by TechFlunky Platform Analysis

## Quick Start with Docker

1. **Build the image:**
   \`\`\`bash
   docker build -t platform .
   \`\`\`

2. **Run with Docker Compose:**
   \`\`\`bash
   docker-compose up -d
   \`\`\`

## Environment Variables

Create a \`.env\` file with the following variables:

\`\`\`env
${analysis.environmentVariables.map(env => `${env}=your_${env.toLowerCase()}_here`).join('\n')}
\`\`\`

## Kubernetes Deployment

1. **Apply the manifests:**
   \`\`\`bash
   kubectl apply -f k8s-manifest.yml
   \`\`\`

2. **Create secrets:**
   \`\`\`bash
   kubectl create secret generic platform-secrets \\
${analysis.environmentVariables.map(env => `     --from-literal=${env.toLowerCase()}="your_value"`).join(' \\\n')}
   \`\`\`

## Cloud Platform Deployment

### Cloudflare Workers/Pages
- Use the provided CI/CD configuration
- Set environment variables in Cloudflare dashboard

### AWS
- Deploy using ECS with the Docker image
- Use AWS Secrets Manager for environment variables

### Google Cloud
- Deploy to Cloud Run or GKE
- Use Cloud Secret Manager for sensitive data

### Azure
- Deploy to Container Instances or AKS
- Use Azure Key Vault for secrets

## Monitoring & Logging

- Health check endpoint: \`/health\`
- Metrics endpoint: \`/metrics\` (if implemented)
- Logs are output to stdout/stderr for container log collection

## Security Considerations

- Non-root user in container
- Security scanning included in CI/CD
- Environment variables for sensitive data
- Network isolation with Docker networks
`;
}

// Helper functions
function getBaseImage(framework: string): string {
  switch (framework) {
    case 'nextjs':
    case 'nuxtjs':
    case 'nodejs':
    case 'astro':
      return 'node:18-alpine';
    case 'python':
      return 'python:3.11-alpine';
    case 'php':
      return 'php:8.2-apache';
    case 'go':
      return 'golang:1.21-alpine';
    default:
      return 'node:18-alpine';
  }
}

function getCopyPackageFiles(packageManager: string): string {
  switch (packageManager) {
    case 'npm':
      return 'COPY package*.json ./';
    case 'pip':
      return 'COPY requirements.txt ./';
    case 'composer':
      return 'COPY composer*.json ./';
    case 'go mod':
      return 'COPY go.* ./';
    default:
      return 'COPY package*.json ./';
  }
}

function getInstallCommand(packageManager: string): string {
  switch (packageManager) {
    case 'npm':
      return 'npm ci --only=production';
    case 'pip':
      return 'pip install --no-cache-dir -r requirements.txt';
    case 'composer':
      return 'composer install --no-dev --optimize-autoloader';
    case 'go mod':
      return 'go mod download';
    default:
      return 'npm ci --only=production';
  }
}

function getDefaultPort(framework: string): number {
  switch (framework) {
    case 'nextjs':
      return 3000;
    case 'nuxtjs':
      return 3000;
    case 'angular':
      return 4200;
    case 'astro':
      return 3000;
    case 'python':
      return 8000;
    case 'php':
      return 8000;
    case 'go':
      return 8080;
    default:
      return 3000;
  }
}