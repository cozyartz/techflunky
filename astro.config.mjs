import { defineConfig } from 'astro/config';
import cloudflare from '@astrojs/cloudflare';
import react from '@astrojs/react';
import tailwind from '@astrojs/tailwind';

export default defineConfig({
  output: 'server',
  adapter: cloudflare({
    mode: 'directory',
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
