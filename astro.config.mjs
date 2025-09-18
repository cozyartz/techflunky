import { defineConfig } from 'astro/config';
import cloudflare from '@astrojs/cloudflare';
import react from '@astrojs/react';
import tailwind from '@astrojs/tailwind';

export default defineConfig({
  output: 'server',
  adapter: cloudflare({
    // Use advanced mode for proper Cloudflare Pages SSR
    mode: 'advanced',
    // For Cloudflare Pages, bindings are configured in the dashboard
    // No runtime configuration needed - environment variables and bindings
    // are automatically available via locals.runtime.env
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
        ]
      }
    },
    optimizeDeps: {
      exclude: ['gaxios', 'https-proxy-agent', 'agent-base']
    },
    define: {
      global: 'globalThis'
    }
  }
});
