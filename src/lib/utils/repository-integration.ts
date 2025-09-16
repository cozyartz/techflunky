export interface RepositoryInfo {
  url: string;
  type: 'github' | 'gitlab' | 'bitbucket';
  owner: string;
  repo: string;
  branch?: string;
  isPrivate: boolean;
}

export interface RepositoryAnalysis {
  languages: { [key: string]: number };
  frameworks: string[];
  dependencies: string[];
  hasTests: boolean;
  hasDocumentation: boolean;
  hasDockerfile: boolean;
  hasCICD: boolean;
  lastCommit: string;
  commitCount: number;
  contributors: number;
  stars?: number;
  forks?: number;
  openIssues?: number;
  license?: string;
  readme?: string;
  techStack: string[];
  estimatedComplexity: 'low' | 'medium' | 'high' | 'very-high';
}

export class RepositoryIntegration {
  private static readonly GITHUB_API = 'https://api.github.com';
  private static readonly GITLAB_API = 'https://gitlab.com/api/v4';

  static parseRepositoryUrl(url: string): RepositoryInfo | null {
    try {
      const cleanUrl = url.replace(/\.git$/, '');

      // GitHub pattern
      const githubMatch = cleanUrl.match(/github\.com[\/:]([^\/]+)\/([^\/\?#]+)/);
      if (githubMatch) {
        return {
          url: cleanUrl,
          type: 'github',
          owner: githubMatch[1],
          repo: githubMatch[2],
          isPrivate: false // Will be determined by API call
        };
      }

      // GitLab pattern
      const gitlabMatch = cleanUrl.match(/gitlab\.com[\/:]([^\/]+)\/([^\/\?#]+)/);
      if (gitlabMatch) {
        return {
          url: cleanUrl,
          type: 'gitlab',
          owner: gitlabMatch[1],
          repo: gitlabMatch[2],
          isPrivate: false
        };
      }

      // Bitbucket pattern
      const bitbucketMatch = cleanUrl.match(/bitbucket\.org[\/:]([^\/]+)\/([^\/\?#]+)/);
      if (bitbucketMatch) {
        return {
          url: cleanUrl,
          type: 'bitbucket',
          owner: bitbucketMatch[1],
          repo: bitbucketMatch[2],
          isPrivate: false
        };
      }

      return null;
    } catch (error) {
      console.warn('Error parsing repository URL:', error);
      return null;
    }
  }

  static async analyzeRepository(repoInfo: RepositoryInfo): Promise<RepositoryAnalysis | null> {
    try {
      switch (repoInfo.type) {
        case 'github':
          return await this.analyzeGitHubRepository(repoInfo);
        case 'gitlab':
          return await this.analyzeGitLabRepository(repoInfo);
        case 'bitbucket':
          return await this.analyzeBitbucketRepository(repoInfo);
        default:
          return null;
      }
    } catch (error) {
      console.warn('Error analyzing repository:', error);
      return null;
    }
  }

  private static async analyzeGitHubRepository(repoInfo: RepositoryInfo): Promise<RepositoryAnalysis | null> {
    try {
      // Get repository info
      const repoResponse = await fetch(`${this.GITHUB_API}/repos/${repoInfo.owner}/${repoInfo.repo}`);
      if (!repoResponse.ok) {
        throw new Error(`GitHub API error: ${repoResponse.status}`);
      }
      const repo = await repoResponse.json();

      // Get languages
      const languagesResponse = await fetch(`${this.GITHUB_API}/repos/${repoInfo.owner}/${repoInfo.repo}/languages`);
      const languages = languagesResponse.ok ? await languagesResponse.json() : {};

      // Get repository contents to check for files
      const contentsResponse = await fetch(`${this.GITHUB_API}/repos/${repoInfo.owner}/${repoInfo.repo}/contents`);
      const contents = contentsResponse.ok ? await contentsResponse.json() : [];

      // Analyze file structure
      const fileNames = Array.isArray(contents) ? contents.map((file: any) => file.name.toLowerCase()) : [];

      const hasDockerfile = fileNames.includes('dockerfile') || fileNames.some(name => name.startsWith('dockerfile'));
      const hasTests = fileNames.some(name =>
        name.includes('test') ||
        name.includes('spec') ||
        name === '__tests__' ||
        name === 'tests'
      );
      const hasDocumentation = fileNames.includes('readme.md') || fileNames.includes('readme.txt') || fileNames.includes('docs');

      // Check for CI/CD files
      const hasCICD = fileNames.some(name =>
        name === '.github' ||
        name === '.gitlab-ci.yml' ||
        name === 'jenkins' ||
        name === '.circleci' ||
        name === '.travis.yml' ||
        name === 'azure-pipelines.yml'
      );

      // Get package.json or similar for dependencies
      let dependencies: string[] = [];
      let frameworks: string[] = [];

      try {
        if (fileNames.includes('package.json')) {
          const packageResponse = await fetch(`${this.GITHUB_API}/repos/${repoInfo.owner}/${repoInfo.repo}/contents/package.json`);
          if (packageResponse.ok) {
            const packageData = await packageResponse.json();
            const packageJson = JSON.parse(atob(packageData.content));
            dependencies = [
              ...Object.keys(packageJson.dependencies || {}),
              ...Object.keys(packageJson.devDependencies || {})
            ];
            frameworks = this.detectFrameworks(dependencies, languages);
          }
        }
      } catch (error) {
        console.warn('Could not analyze package.json:', error);
      }

      // Get commits info
      const commitsResponse = await fetch(`${this.GITHUB_API}/repos/${repoInfo.owner}/${repoInfo.repo}/commits?per_page=1`);
      let lastCommit = '';
      let commitCount = 0;

      if (commitsResponse.ok) {
        const commits = await commitsResponse.json();
        if (commits.length > 0) {
          lastCommit = commits[0].commit.committer.date;
        }
        // Get commit count from repo data
        commitCount = repo.size || 0; // Approximation
      }

      // Get contributors
      const contributorsResponse = await fetch(`${this.GITHUB_API}/repos/${repoInfo.owner}/${repoInfo.repo}/contributors`);
      let contributors = 1;
      if (contributorsResponse.ok) {
        const contributorsList = await contributorsResponse.json();
        contributors = Array.isArray(contributorsList) ? contributorsList.length : 1;
      }

      const techStack = this.buildTechStack(languages, frameworks, dependencies);
      const estimatedComplexity = this.estimateComplexity(languages, dependencies.length, commitCount, contributors);

      return {
        languages,
        frameworks,
        dependencies: dependencies.slice(0, 20), // Limit to top 20
        hasTests,
        hasDocumentation,
        hasDockerfile,
        hasCICD,
        lastCommit,
        commitCount,
        contributors,
        stars: repo.stargazers_count,
        forks: repo.forks_count,
        openIssues: repo.open_issues_count,
        license: repo.license?.name,
        readme: hasDocumentation ? 'Available' : 'None',
        techStack,
        estimatedComplexity
      };

    } catch (error) {
      console.warn('Error analyzing GitHub repository:', error);
      return null;
    }
  }

  private static async analyzeGitLabRepository(repoInfo: RepositoryInfo): Promise<RepositoryAnalysis | null> {
    // Simplified GitLab analysis - would need GitLab API token for full analysis
    return {
      languages: {},
      frameworks: [],
      dependencies: [],
      hasTests: false,
      hasDocumentation: false,
      hasDockerfile: false,
      hasCICD: false,
      lastCommit: '',
      commitCount: 0,
      contributors: 1,
      techStack: [],
      estimatedComplexity: 'medium'
    };
  }

  private static async analyzeBitbucketRepository(repoInfo: RepositoryInfo): Promise<RepositoryAnalysis | null> {
    // Simplified Bitbucket analysis - would need Bitbucket API integration
    return {
      languages: {},
      frameworks: [],
      dependencies: [],
      hasTests: false,
      hasDocumentation: false,
      hasDockerfile: false,
      hasCICD: false,
      lastCommit: '',
      commitCount: 0,
      contributors: 1,
      techStack: [],
      estimatedComplexity: 'medium'
    };
  }

  private static detectFrameworks(dependencies: string[], languages: { [key: string]: number }): string[] {
    const frameworks: string[] = [];

    // React ecosystem
    if (dependencies.some(dep => ['react', '@types/react'].includes(dep))) {
      frameworks.push('React');
    }
    if (dependencies.includes('next')) {
      frameworks.push('Next.js');
    }
    if (dependencies.includes('astro')) {
      frameworks.push('Astro');
    }

    // Vue ecosystem
    if (dependencies.includes('vue')) {
      frameworks.push('Vue.js');
    }
    if (dependencies.includes('nuxt')) {
      frameworks.push('Nuxt.js');
    }

    // Node.js frameworks
    if (dependencies.includes('express')) {
      frameworks.push('Express.js');
    }
    if (dependencies.includes('fastify')) {
      frameworks.push('Fastify');
    }
    if (dependencies.includes('@nestjs/core')) {
      frameworks.push('NestJS');
    }

    // CSS frameworks
    if (dependencies.includes('tailwindcss')) {
      frameworks.push('Tailwind CSS');
    }
    if (dependencies.some(dep => dep.includes('bootstrap'))) {
      frameworks.push('Bootstrap');
    }

    // Database/ORM
    if (dependencies.some(dep => ['prisma', '@prisma/client'].includes(dep))) {
      frameworks.push('Prisma');
    }
    if (dependencies.includes('mongoose')) {
      frameworks.push('Mongoose');
    }

    // Testing
    if (dependencies.some(dep => ['jest', 'vitest', 'mocha', 'cypress', '@testing-library/react'].includes(dep))) {
      frameworks.push('Testing Framework');
    }

    return frameworks;
  }

  private static buildTechStack(languages: { [key: string]: number }, frameworks: string[], dependencies: string[]): string[] {
    const techStack = new Set<string>();

    // Add primary languages
    Object.keys(languages).forEach(lang => techStack.add(lang));

    // Add frameworks
    frameworks.forEach(fw => techStack.add(fw));

    // Add notable dependencies
    const notableDeps = [
      'typescript', 'webpack', 'vite', 'rollup', 'babel',
      'eslint', 'prettier', 'docker', 'kubernetes'
    ];

    dependencies.forEach(dep => {
      if (notableDeps.some(notable => dep.toLowerCase().includes(notable))) {
        techStack.add(dep);
      }
    });

    return Array.from(techStack).slice(0, 15); // Limit to top 15
  }

  private static estimateComplexity(
    languages: { [key: string]: number },
    depCount: number,
    commitCount: number,
    contributors: number
  ): 'low' | 'medium' | 'high' | 'very-high' {
    let score = 0;

    // Language diversity
    score += Object.keys(languages).length * 5;

    // Dependencies
    if (depCount > 50) score += 20;
    else if (depCount > 20) score += 10;
    else if (depCount > 5) score += 5;

    // Commit activity
    if (commitCount > 1000) score += 15;
    else if (commitCount > 100) score += 10;
    else if (commitCount > 50) score += 5;

    // Team size
    if (contributors > 10) score += 15;
    else if (contributors > 5) score += 10;
    else if (contributors > 2) score += 5;

    if (score >= 60) return 'very-high';
    if (score >= 40) return 'high';
    if (score >= 20) return 'medium';
    return 'low';
  }

  static generateRepositoryInsights(analysis: RepositoryAnalysis): string[] {
    const insights: string[] = [];

    if (analysis.hasTests) {
      insights.push('✅ Has automated testing setup');
    } else {
      insights.push('⚠️ No automated tests detected - consider adding tests for better quality assurance');
    }

    if (analysis.hasDocumentation) {
      insights.push('✅ Well documented with README');
    } else {
      insights.push('⚠️ Limited documentation - adding comprehensive docs increases buyer confidence');
    }

    if (analysis.hasDockerfile) {
      insights.push('✅ Docker-ready for easy deployment');
    }

    if (analysis.hasCICD) {
      insights.push('✅ Has CI/CD pipeline for automated deployment');
    }

    if (analysis.contributors > 1) {
      insights.push(`👥 Collaborative project with ${analysis.contributors} contributors`);
    }

    if (analysis.stars && analysis.stars > 0) {
      insights.push(`⭐ ${analysis.stars} GitHub stars indicate community interest`);
    }

    const complexityMessages = {
      'low': '🟢 Simple, focused project - easy to understand and maintain',
      'medium': '🟡 Moderate complexity - good balance of features and maintainability',
      'high': '🟠 Complex project with extensive features - requires technical expertise',
      'very-high': '🔴 Highly complex enterprise-level project - significant technical depth'
    };

    insights.push(complexityMessages[analysis.estimatedComplexity]);

    return insights;
  }
}