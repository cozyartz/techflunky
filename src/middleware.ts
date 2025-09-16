import { defineMiddleware } from 'astro:middleware';
import { getCurrentUser } from './lib/auth';

export const onRequest = defineMiddleware(async (context, next) => {
  // Add user to locals for API routes
  if (context.url.pathname.startsWith('/api/')) {
    // Access environment variables correctly for Cloudflare Pages
    const env = context.locals.runtime?.env || {};
    const user = await getCurrentUser(context.request, env);
    context.locals.user = user;
  }

  return next();
});