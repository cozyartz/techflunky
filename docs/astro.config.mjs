import { defineConfig } from 'astro/config';
import starlight from '@astrojs/starlight';

export default defineConfig({
  site: 'https://docs.techflunky.com',
  integrations: [
    starlight({
      title: 'TechFlunky Documentation',
      description: 'Complete documentation for the TechFlunky marketplace platform',
      favicon: '/favicon.ico',
      social: [
        {
          label: 'GitHub',
          icon: 'github',
          href: 'https://github.com/cozyartz/techflunky',
        },
        {
          label: 'Twitter',
          icon: 'twitter',
          href: 'https://twitter.com/techflunky',
        },
      ],
      customCss: [
        './src/styles/custom.css',
      ],
      sidebar: [
        {
          label: 'Getting Started',
          items: [
            { label: 'Introduction', link: '/getting-started/introduction/' },
            { label: 'Quick Start Guide', link: '/getting-started/quick-start/' },
          ],
        },
        {
          label: 'For Sellers',
          items: [
            { label: 'Seller Overview', link: '/sellers/overview/' },
            { label: 'Seller Onboarding', link: '/sellers/onboarding/' },
          ],
        },
        {
          label: 'For Buyers',
          items: [
            { label: 'Buyer Guide', link: '/buyers/overview/' },
          ],
        },
        {
          label: 'Framework Guides',
          items: [
            { label: 'Next.js Integration', link: '/frameworks/nextjs/' },
          ],
        },
        {
          label: 'Deployment',
          items: [
            { label: 'Deployment Overview', link: '/deployment/overview/' },
            { label: 'Workers for Platforms', link: '/deployment/workers-for-platforms/' },
          ],
        },
        {
          label: 'API Reference',
          items: [
            { label: 'API Overview', link: '/api/overview/' },
            { label: 'Tenant Isolation API', link: '/api/tenant-isolation/' },
          ],
        },
        {
          label: 'Architecture',
          items: [
            { label: 'Platform Architecture', link: '/architecture/overview/' },
          ],
        },
      ],
    }),
  ],
});