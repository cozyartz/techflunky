import { defineConfig } from 'astro/config';
import cloudflare from '@astrojs/cloudflare';
import react from '@astrojs/react';
import tailwind from '@astrojs/tailwind';

export default defineConfig({
  output: 'server',
  adapter: cloudflare({
    mode: 'directory',
    runtime: {
      mode: 'local',
      type: 'pages',
      bindings: {
        // D1 database binding
        DB: {
          type: 'd1',
          // This will be replaced with actual D1 database ID
          id: 'YOUR_D1_DATABASE_ID'
        },
        // R2 bucket binding for file storage
        BUCKET: {
          type: 'r2',
          // This will be replaced with actual R2 bucket name
          bucketName: 'techflunky-assets'
        },
        // Environment variables
        STRIPE_SECRET_KEY: {
          type: 'var',
          value: 'YOUR_STRIPE_SECRET_KEY'
        },
        CLAUDE_API_KEY: {
          type: 'var',
          value: 'YOUR_CLAUDE_API_KEY'
        }
      }
    }
  }),
  integrations: [
    react(),
    tailwind()
  ],
  vite: {
    ssr: {
      external: ['node:buffer', 'node:crypto', 'node:stream']
    }
  }
});
