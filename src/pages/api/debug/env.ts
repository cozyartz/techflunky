import type { APIRoute } from 'astro';

export const GET: APIRoute = async ({ locals }) => {
  // Access environment variables correctly for Cloudflare Pages
  const env = locals.runtime?.env || {};

  // Don't expose actual values, just show what keys are available
  const availableVars = Object.keys(env).map(key => ({
    key,
    hasValue: !!env[key],
    type: typeof env[key]
  }));

  return new Response(JSON.stringify({
    runtime: !!locals.runtime,
    envKeys: availableVars,
    githubAppConfigured: !!(env.GITHUB_APP_CLIENT_ID && env.GITHUB_APP_CLIENT_SECRET),
    databaseConfigured: !!env.DB
  }, null, 2), {
    headers: {
      'Content-Type': 'application/json'
    }
  });
};