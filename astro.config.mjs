import { defineConfig } from 'astro/config';
import cloudflare from '@astrojs/cloudflare';
import react from '@astrojs/react';
import tailwind from '@astrojs/tailwind';

export default defineConfig({
  output: 'server',
  adapter: cloudflare({
    mode: 'directory',
    // For Cloudflare Pages, bindings are configured in the dashboard
    // No runtime configuration needed - environment variables and bindings
    // are automatically available via locals.runtime.env
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
        external: ['@cloudflare/ai', 'https', 'http', 'net', 'tls', 'url', 'querystring', 'stream', 'assert']
      }
    },
    define: {
      global: 'globalThis'
    }
  }
});
