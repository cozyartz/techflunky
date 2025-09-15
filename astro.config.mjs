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
        // D1 database binding (configured in wrangler.toml)
        DB: {
          type: 'd1'
        },
        // R2 bucket binding for file storage (configured in wrangler.toml)
        BUCKET: {
          type: 'r2'
        },
        // KV namespace for caching (configured in wrangler.toml)
        CACHE: {
          type: 'kv'
        },
        // Analytics Engine (configured in wrangler.toml)
        ANALYTICS: {
          type: 'analytics'
        },
        // Cloudflare AI binding (configured in wrangler.toml)
        AI: {
          type: 'ai'
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
      external: ['node:buffer', 'node:crypto', 'node:stream', '@cloudflare/ai']
    },
    build: {
      rollupOptions: {
        external: ['@cloudflare/ai']
      }
    }
  }
});
