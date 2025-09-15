import { defineConfig } from 'astro/config';
import starlight from '@astrojs/starlight';

export default defineConfig({
  site: 'https://docs.techflunky.com',
  integrations: [
    starlight({
      title: 'TechFlunky Documentation',
      description: 'Complete documentation for the TechFlunky marketplace platform - the first marketplace for instantly deployable business platforms.',
      logo: {
        src: '/assets/techflunky-logo.png',
        replacesTitle: false,
      },
      favicon: '/favicon.ico',
      social: {
        github: 'https://github.com/cozyartz/techflunky',
        twitter: 'https://twitter.com/techflunky',
      },
      editLink: {
        baseUrl: 'https://github.com/cozyartz/techflunky/edit/main/docs/',
      },
      customCss: [
        './src/styles/custom.css',
      ],
      sidebar: [
        {
          label: 'Getting Started',
          items: [
            'getting-started/introduction',
            'getting-started/quick-start',
            'getting-started/platform-overview',
            'getting-started/supported-frameworks',
          ],
        },
        {
          label: 'For Sellers',
          items: [
            'sellers/overview',
            'sellers/onboarding',
            'sellers/platform-requirements',
            'sellers/packaging-guide',
            'sellers/security-escrow',
            'sellers/pricing-strategy',
          ],
        },
        {
          label: 'For Buyers',
          items: [
            'buyers/overview',
            'buyers/browsing-platforms',
            'buyers/evaluation-guide',
            'buyers/purchase-process',
            'buyers/deployment-options',
            'buyers/post-purchase-support',
          ],
        },
        {
          label: 'For Investors',
          items: [
            'investors/overview',
            'investors/investment-process',
            'investors/due-diligence',
            'investors/portfolio-management',
            'investors/syndicate-opportunities',
          ],
        },
        {
          label: 'Framework Guides',
          items: [
            'frameworks/nextjs',
            'frameworks/astro',
            'frameworks/nuxt',
            'frameworks/laravel',
            'frameworks/django',
            'frameworks/fastapi',
            'frameworks/express',
          ],
        },
        {
          label: 'Deployment',
          items: [
            'deployment/overview',
            'deployment/containerization',
            'deployment/cloud-providers',
            'deployment/kubernetes',
            'deployment/docker-compose',
            'deployment/environment-setup',
          ],
        },
        {
          label: 'API Reference',
          items: [
            'api/overview',
            'api/authentication',
            'api/listings',
            'api/users',
            'api/payments',
            'api/deployments',
            'api/webhooks',
          ],
        },
        {
          label: 'Multi-Stack Architecture',
          items: [
            'architecture/overview',
            'architecture/abstraction-layers',
            'architecture/framework-detection',
            'architecture/database-adapters',
            'architecture/containerization',
          ],
        },
        {
          label: 'Security',
          items: [
            'security/overview',
            'security/code-escrow',
            'security/access-control',
            'security/encryption',
            'security/compliance',
          ],
        },
        {
          label: 'Business Guide',
          items: [
            'business/marketplace-dynamics',
            'business/pricing-model',
            'business/legal-framework',
            'business/success-metrics',
          ],
        },
        {
          label: 'Contributing',
          items: [
            'contributing/overview',
            'contributing/development-setup',
            'contributing/framework-adapters',
            'contributing/documentation',
          ],
        },
      ],
      components: {
        Head: './src/components/Head.astro',
        PageFrame: './src/components/PageFrame.astro',
      },
    }),
  ],
});