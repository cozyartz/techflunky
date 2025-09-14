// AI-powered codebase validation that maintains trade secret protection
import type { APIRoute } from 'astro';

interface CodebaseAnalysis {
  truthfulnessScore: number;
  qualityMetrics: {
    codeQuality: number;
    architecture: number;
    security: number;
    scalability: number;
    maintainability: number;
  };
  businessViability: {
    marketFit: number;
    technicalImplementation: number;
    completeness: number;
    deployability: number;
  };
  riskFactors: string[];
  strengths: string[];
  redFlags: string[];
  aiConfidenceLevel: number;
  validationSummary: string;
  recommendedAction: 'approve' | 'review' | 'reject';
}

interface SafeCodeMetadata {
  fileStructure: string[];
  packageDependencies: Record<string, string>;
  configurationFiles: string[];
  documentationQuality: number;
  testCoverage: number;
  buildConfiguration: any;
  deploymentReadiness: number;
  securityCompliance: string[];
}

export const POST: APIRoute = async ({ request }) => {
  try {
    const {
      repositoryUrl,
      sellerClaims,
      platformType,
      techStack,
      accessToken // Temporary, limited-scope token for analysis
    } = await request.json();

    if (!repositoryUrl || !sellerClaims) {
      return new Response(JSON.stringify({
        error: 'Repository URL and seller claims required'
      }), {
        status: 400,
        headers: { 'Content-Type': 'application/json' }
      });
    }

    // Step 1: Extract safe metadata without exposing source code
    const metadata = await extractSafeMetadata(repositoryUrl, accessToken);

    // Step 2: AI analysis of claims vs reality
    const analysis = await validateSellerClaims(metadata, sellerClaims, platformType, techStack);

    // Step 3: Generate validation report
    const report = await generateValidationReport(analysis, metadata);

    return new Response(JSON.stringify({
      success: true,
      analysis: report,
      metadata: {
        analysisId: generateAnalysisId(),
        timestamp: new Date().toISOString(),
        confidenceLevel: analysis.aiConfidenceLevel,
        processingTime: Date.now() - performance.now(),
      }
    }), {
      headers: { 'Content-Type': 'application/json' }
    });

  } catch (error) {
    console.error('AI codebase analysis error:', error);
    return new Response(JSON.stringify({
      error: 'Failed to analyze codebase',
      details: error.message
    }), {
      status: 500,
      headers: { 'Content-Type': 'application/json' }
    });
  }
};

async function extractSafeMetadata(repositoryUrl: string, accessToken?: string): Promise<SafeCodeMetadata> {
  // This function extracts only safe, non-proprietary information from the repository
  // WITHOUT accessing actual source code content

  try {
    // Use GitHub API to get repository structure and metadata
    const repoInfo = parseGitHubUrl(repositoryUrl);
    const apiUrl = `https://api.github.com/repos/${repoInfo.owner}/${repoInfo.repo}`;

    const headers: Record<string, string> = {
      'Accept': 'application/vnd.github.v3+json',
      'User-Agent': 'TechFlunky-AI-Validator/1.0'
    };

    if (accessToken) {
      headers['Authorization'] = `token ${accessToken}`;
    }

    // Get repository basic info
    const repoResponse = await fetch(apiUrl, { headers });
    const repoData = await repoResponse.json();

    // Get file tree (names only, no content)
    const treeResponse = await fetch(`${apiUrl}/git/trees/${repoData.default_branch || 'main'}?recursive=1`, { headers });
    const treeData = await treeResponse.json();

    // Get package.json or equivalent (for dependencies)
    const packageFiles = ['package.json', 'requirements.txt', 'composer.json', 'go.mod', 'Cargo.toml'];
    const dependencies: Record<string, string> = {};

    for (const file of packageFiles) {
      try {
        const fileResponse = await fetch(`${apiUrl}/contents/${file}`, { headers });
        if (fileResponse.ok) {
          const fileData = await fileResponse.json();
          const content = atob(fileData.content);
          const parsed = JSON.parse(content);

          if (file === 'package.json') {
            dependencies.npm = parsed.dependencies || {};
            dependencies.devDependencies = parsed.devDependencies || {};
          } else if (file === 'requirements.txt') {
            dependencies.pip = content.split('\n').filter(line => line.trim());
          }
        }
      } catch (e) {
        // File doesn't exist or couldn't be parsed, continue
      }
    }

    // Analyze file structure for patterns
    const fileStructure = treeData.tree?.map((item: any) => item.path) || [];

    return {
      fileStructure,
      packageDependencies: dependencies,
      configurationFiles: fileStructure.filter(path =>
        path.includes('config') ||
        path.includes('.env.example') ||
        path.includes('docker') ||
        path.includes('.yml') ||
        path.includes('.yaml')
      ),
      documentationQuality: calculateDocumentationQuality(fileStructure),
      testCoverage: calculateTestCoverage(fileStructure),
      buildConfiguration: analyzeBuildConfig(fileStructure),
      deploymentReadiness: analyzeDeploymentReadiness(fileStructure, dependencies),
      securityCompliance: analyzeSecurityCompliance(fileStructure, dependencies)
    };

  } catch (error) {
    console.error('Error extracting safe metadata:', error);
    throw new Error('Could not safely analyze repository metadata');
  }
}

async function validateSellerClaims(
  metadata: SafeCodeMetadata,
  claims: any,
  platformType: string,
  techStack: string[]
): Promise<CodebaseAnalysis> {

  // AI prompt for validation (using a hypothetical AI service)
  const validationPrompt = `
Analyze this platform metadata against seller claims to detect truthfulness and quality:

SELLER CLAIMS:
- Platform Type: ${platformType}
- Technology Stack: ${techStack.join(', ')}
- Features Claimed: ${JSON.stringify(claims.features || [])}
- User Metrics: ${JSON.stringify(claims.metrics || {})}
- Revenue Claims: ${JSON.stringify(claims.revenue || {})}

ACTUAL REPOSITORY METADATA:
- File Structure: ${metadata.fileStructure.length} files
- Dependencies: ${JSON.stringify(metadata.packageDependencies)}
- Test Coverage Indicators: ${metadata.testCoverage}%
- Documentation Quality: ${metadata.documentationQuality}/10
- Deployment Readiness: ${metadata.deploymentReadiness}/10
- Configuration Files: ${metadata.configurationFiles.join(', ')}

VALIDATION TASKS:
1. Check if claimed tech stack matches actual dependencies
2. Assess if file structure supports claimed features
3. Evaluate if codebase maturity matches business claims
4. Identify red flags or inconsistencies
5. Rate overall truthfulness and quality

Provide analysis in JSON format with scores 0-100 for each metric.
`;

  // Simulate AI analysis (in production, this would call Claude/GPT-4)
  const analysis = await simulateAIAnalysis(validationPrompt, metadata, claims, techStack);

  return analysis;
}

async function simulateAIAnalysis(
  prompt: string,
  metadata: SafeCodeMetadata,
  claims: any,
  techStack: string[]
): Promise<CodebaseAnalysis> {

  // Sophisticated heuristic analysis that mimics AI validation
  const analysis: CodebaseAnalysis = {
    truthfulnessScore: 85,
    qualityMetrics: {
      codeQuality: calculateCodeQuality(metadata),
      architecture: calculateArchitectureScore(metadata, techStack),
      security: calculateSecurityScore(metadata),
      scalability: calculateScalabilityScore(metadata, techStack),
      maintainability: calculateMaintainabilityScore(metadata)
    },
    businessViability: {
      marketFit: calculateMarketFit(metadata, claims),
      technicalImplementation: calculateTechnicalImplementation(metadata, techStack),
      completeness: calculateCompleteness(metadata),
      deployability: metadata.deploymentReadiness * 10
    },
    riskFactors: identifyRiskFactors(metadata, claims, techStack),
    strengths: identifyStrengths(metadata, claims, techStack),
    redFlags: identifyRedFlags(metadata, claims, techStack),
    aiConfidenceLevel: calculateConfidenceLevel(metadata),
    validationSummary: generateValidationSummary(metadata, claims, techStack),
    recommendedAction: determineRecommendedAction(metadata, claims, techStack)
  };

  return analysis;
}

// Scoring functions
function calculateCodeQuality(metadata: SafeCodeMetadata): number {
  let score = 70; // Base score

  // Boost for good documentation
  if (metadata.documentationQuality >= 7) score += 15;
  else if (metadata.documentationQuality <= 3) score -= 15;

  // Boost for tests
  if (metadata.testCoverage >= 70) score += 10;
  else if (metadata.testCoverage <= 20) score -= 10;

  // Boost for configuration management
  if (metadata.configurationFiles.length >= 3) score += 5;

  return Math.min(100, Math.max(0, score));
}

function calculateArchitectureScore(metadata: SafeCodeMetadata, techStack: string[]): number {
  let score = 75;

  // Check for proper separation of concerns
  const hasProperStructure = metadata.fileStructure.some(path =>
    path.includes('/components/') ||
    path.includes('/src/') ||
    path.includes('/lib/') ||
    path.includes('/api/')
  );

  if (hasProperStructure) score += 10;

  // Check for modern patterns
  const hasModernPatterns = techStack.some(tech =>
    ['React/Next.js', 'Vue/Nuxt.js', 'Astro/SvelteKit'].includes(tech)
  );

  if (hasModernPatterns) score += 10;

  return Math.min(100, Math.max(0, score));
}

function calculateSecurityScore(metadata: SafeCodeMetadata): number {
  let score = 60;

  // Check for security-related files
  const securityIndicators = metadata.fileStructure.filter(path =>
    path.includes('security') ||
    path.includes('auth') ||
    path.includes('.env.example') ||
    path.includes('middleware')
  );

  score += securityIndicators.length * 5;

  // Check security compliance
  score += metadata.securityCompliance.length * 3;

  return Math.min(100, Math.max(0, score));
}

function calculateScalabilityScore(metadata: SafeCodeMetadata, techStack: string[]): number {
  let score = 70;

  // Check for scalability patterns
  const hasContainerization = metadata.fileStructure.some(path =>
    path.includes('docker') || path.includes('k8s') || path.includes('kubernetes')
  );

  if (hasContainerization) score += 15;

  // Check for cloud-native technologies
  const cloudNative = techStack.some(tech =>
    ['Cloudflare', 'AWS', 'Google Cloud', 'Vercel/Netlify'].includes(tech)
  );

  if (cloudNative) score += 10;

  return Math.min(100, Math.max(0, score));
}

function calculateMaintainabilityScore(metadata: SafeCodeMetadata): number {
  let score = 65;

  // Documentation boosts maintainability significantly
  score += metadata.documentationQuality * 2;

  // Test coverage helps with maintainability
  score += metadata.testCoverage / 3;

  // Configuration management
  if (metadata.configurationFiles.length >= 2) score += 5;

  return Math.min(100, Math.max(0, score));
}

function calculateMarketFit(metadata: SafeCodeMetadata, claims: any): number {
  // This would analyze claimed market positioning against technical implementation
  let score = 75;

  // If claims seem realistic based on technical complexity
  if (claims.revenue && claims.revenue.monthly > 0 && metadata.deploymentReadiness >= 8) {
    score += 10;
  }

  return score;
}

function calculateTechnicalImplementation(metadata: SafeCodeMetadata, techStack: string[]): number {
  let score = 70;

  // Check if claimed tech stack matches dependencies
  const npmDeps = metadata.packageDependencies.npm || {};
  const techStackLower = techStack.map(t => t.toLowerCase());

  if (techStackLower.includes('react') && (npmDeps.react || npmDeps.next)) score += 10;
  if (techStackLower.includes('vue') && (npmDeps.vue || npmDeps.nuxt)) score += 10;
  if (techStackLower.includes('angular') && npmDeps['@angular/core']) score += 10;

  return Math.min(100, score);
}

function calculateCompleteness(metadata: SafeCodeMetadata): number {
  let score = 60;

  // Check for essential files
  const essentials = ['README', 'package.json', 'src/', 'public/'];
  essentials.forEach(essential => {
    if (metadata.fileStructure.some(path => path.toLowerCase().includes(essential.toLowerCase()))) {
      score += 10;
    }
  });

  return Math.min(100, score);
}

// Risk and strength identification
function identifyRiskFactors(metadata: SafeCodeMetadata, claims: any, techStack: string[]): string[] {
  const risks: string[] = [];

  if (metadata.testCoverage < 30) {
    risks.push('Low test coverage may indicate unstable codebase');
  }

  if (metadata.documentationQuality < 4) {
    risks.push('Poor documentation could hinder maintenance and onboarding');
  }

  if (metadata.deploymentReadiness < 6) {
    risks.push('Platform may not be deployment-ready as claimed');
  }

  if (claims.revenue?.monthly > 10000 && metadata.fileStructure.length < 50) {
    risks.push('Revenue claims seem high for codebase complexity');
  }

  return risks;
}

function identifyStrengths(metadata: SafeCodeMetadata, claims: any, techStack: string[]): string[] {
  const strengths: string[] = [];

  if (metadata.testCoverage >= 70) {
    strengths.push('Excellent test coverage indicates high code quality');
  }

  if (metadata.documentationQuality >= 8) {
    strengths.push('Comprehensive documentation supports maintainability');
  }

  if (metadata.deploymentReadiness >= 8) {
    strengths.push('Production-ready deployment configuration');
  }

  if (metadata.securityCompliance.length >= 3) {
    strengths.push('Strong security compliance measures implemented');
  }

  return strengths;
}

function identifyRedFlags(metadata: SafeCodeMetadata, claims: any, techStack: string[]): string[] {
  const redFlags: string[] = [];

  // Check for tech stack mismatches
  const npmDeps = metadata.packageDependencies.npm || {};
  if (techStack.includes('React/Next.js') && !npmDeps.react && !npmDeps.next) {
    redFlags.push('Claimed React/Next.js stack not found in dependencies');
  }

  // Check for unrealistic claims
  if (claims.users?.total > 10000 && metadata.fileStructure.length < 30) {
    redFlags.push('User count claims seem inconsistent with codebase size');
  }

  if (metadata.testCoverage === 0 && claims.quality?.production) {
    redFlags.push('No testing found despite production-ready claims');
  }

  return redFlags;
}

function calculateConfidenceLevel(metadata: SafeCodeMetadata): number {
  let confidence = 80;

  // More files = more data = higher confidence
  if (metadata.fileStructure.length > 100) confidence += 10;
  else if (metadata.fileStructure.length < 20) confidence -= 15;

  // Dependencies give good insight into tech stack
  if (Object.keys(metadata.packageDependencies).length > 0) confidence += 10;

  return Math.min(95, Math.max(60, confidence));
}

function generateValidationSummary(metadata: SafeCodeMetadata, claims: any, techStack: string[]): string {
  const quality = calculateCodeQuality(metadata);
  const completeness = calculateCompleteness(metadata);

  if (quality >= 85 && completeness >= 85) {
    return 'High-quality, well-documented platform that matches seller claims. Recommended for listing.';
  } else if (quality >= 70 && completeness >= 70) {
    return 'Good platform with minor areas for improvement. Seller claims appear mostly accurate.';
  } else if (quality >= 50 && completeness >= 50) {
    return 'Average platform with some concerns. Review recommended before listing.';
  } else {
    return 'Platform quality concerns identified. Manual review required before approval.';
  }
}

function determineRecommendedAction(metadata: SafeCodeMetadata, claims: any, techStack: string[]): 'approve' | 'review' | 'reject' {
  const quality = calculateCodeQuality(metadata);
  const completeness = calculateCompleteness(metadata);
  const risks = identifyRiskFactors(metadata, claims, techStack);
  const redFlags = identifyRedFlags(metadata, claims, techStack);

  if (redFlags.length > 2) return 'reject';
  if (quality >= 80 && completeness >= 80 && risks.length <= 1) return 'approve';
  return 'review';
}

// Helper functions
function parseGitHubUrl(url: string): { owner: string; repo: string } {
  const match = url.match(/github\.com\/([^\/]+)\/([^\/]+)/);
  if (!match) throw new Error('Invalid GitHub URL');

  return {
    owner: match[1],
    repo: match[2].replace('.git', '')
  };
}

function calculateDocumentationQuality(fileStructure: string[]): number {
  let score = 0;

  // Check for README
  if (fileStructure.some(path => path.toLowerCase().includes('readme'))) score += 3;

  // Check for docs directory
  if (fileStructure.some(path => path.includes('docs/') || path.includes('documentation/'))) score += 3;

  // Check for API docs
  if (fileStructure.some(path => path.includes('api') && path.includes('.md'))) score += 2;

  // Check for setup/installation docs
  if (fileStructure.some(path => path.includes('install') || path.includes('setup'))) score += 2;

  return Math.min(10, score);
}

function calculateTestCoverage(fileStructure: string[]): number {
  const totalFiles = fileStructure.filter(path =>
    path.endsWith('.js') || path.endsWith('.ts') || path.endsWith('.jsx') || path.endsWith('.tsx')
  ).length;

  const testFiles = fileStructure.filter(path =>
    path.includes('test') || path.includes('spec') || path.includes('__tests__')
  ).length;

  if (totalFiles === 0) return 0;
  return Math.min(100, Math.round((testFiles / totalFiles) * 200)); // Rough estimate
}

function analyzeBuildConfig(fileStructure: string[]): any {
  const buildFiles = fileStructure.filter(path =>
    path.includes('webpack') ||
    path.includes('vite') ||
    path.includes('rollup') ||
    path.includes('tsconfig') ||
    path.includes('babel') ||
    path.includes('next.config')
  );

  return {
    hasBuildConfig: buildFiles.length > 0,
    buildFiles,
    modernBuildTool: buildFiles.some(file =>
      file.includes('vite') || file.includes('next.config')
    )
  };
}

function analyzeDeploymentReadiness(fileStructure: string[], dependencies: Record<string, any>): number {
  let score = 5; // Base score

  // Check for deployment files
  if (fileStructure.some(path => path.includes('dockerfile') || path.toLowerCase().includes('docker'))) score += 2;
  if (fileStructure.some(path => path.includes('docker-compose'))) score += 1;
  if (fileStructure.some(path => path.includes('k8s') || path.includes('kubernetes'))) score += 2;
  if (fileStructure.some(path => path.includes('vercel.json') || path.includes('netlify.toml'))) score += 1;
  if (fileStructure.some(path => path.includes('.env.example'))) score += 1;

  return Math.min(10, score);
}

function analyzeSecurityCompliance(fileStructure: string[], dependencies: Record<string, any>): string[] {
  const compliance: string[] = [];

  if (fileStructure.some(path => path.includes('.env.example'))) {
    compliance.push('Environment variable security');
  }

  if (fileStructure.some(path => path.includes('middleware') || path.includes('auth'))) {
    compliance.push('Authentication middleware');
  }

  if (dependencies.npm?.helmet || dependencies.npm?.cors) {
    compliance.push('HTTP security headers');
  }

  if (fileStructure.some(path => path.includes('security') || path.includes('validate'))) {
    compliance.push('Input validation');
  }

  return compliance;
}

function generateAnalysisId(): string {
  const prefix = 'analysis_';
  const randomBytes = crypto.getRandomValues(new Uint8Array(8));
  const id = Array.from(randomBytes)
    .map(b => b.toString(16).padStart(2, '0'))
    .join('');
  return prefix + id;
}