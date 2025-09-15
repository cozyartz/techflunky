import { defineMiddleware } from 'astro:middleware';
import { getCurrentUser } from './lib/auth';

export const onRequest = defineMiddleware(async (context, next) => {
  // Add user to locals for API routes
  if (context.url.pathname.startsWith('/api/')) {
    const user = await getCurrentUser(context.request, context.locals.runtime.env);
    context.locals.user = user;
  }

  return next();
});