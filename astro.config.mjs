import { defineConfig } from 'astro/config';
import cloudflare from '@astrojs/cloudflare';
import react from '@astrojs/react';
import tailwind from '@astrojs/tailwind';

export default defineConfig({
  output: 'hybrid',
  adapter: cloudflare({
    platformProxy: {
      enabled: true,
      configPath: 'wrangler.toml',
      persist: { path: './.cache/wrangler/v3' }
    }
  }),
  integrations: [
    react(),
    tailwind()
  ],
  build: {
    assets: '_astro'
  },
  vite: {
    ssr: {
      external: ['node:buffer', 'node:crypto', 'node:stream', '@cloudflare/ai']
    },
    build: {
      rollupOptions: {
        external: [
          '@cloudflare/ai',
          'https', 'http', 'net', 'tls', 'url', 'querystring', 'stream', 'assert',
          'gaxios', 'https-proxy-agent', 'agent-base',
          'node:https', 'node:http', 'node:net', 'node:tls', 'node:url', 'node:querystring', 'node:stream', 'node:assert'
        ],
        output: {
          assetFileNames: (assetInfo) => {
            return '_astro/[name].[hash][extname]';
          }
        }
      },
      ssrEmitAssets: true
    },
    optimizeDeps: {
      exclude: ['gaxios', 'https-proxy-agent', 'agent-base']
    },
    define: {
      global: 'globalThis'
    }
  }
});
