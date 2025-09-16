import type { APIRoute } from 'astro';
import { createAppAuth } from '@octokit/auth-app';
import { Octokit } from '@octokit/rest';

export const POST: APIRoute = async ({ request, locals }) => {
  try {
    const payload = await request.json();
    const event = request.headers.get('x-github-event');
    const signature = request.headers.get('x-hub-signature-256');

    // Access environment variables correctly for Cloudflare Pages
    const env = locals.runtime?.env || {};

    // Verify webhook signature
    const webhookSecret = env.GITHUB_WEBHOOK_SECRET;
    if (!verifySignature(signature, JSON.stringify(payload), webhookSecret)) {
      return new Response('Invalid signature', { status: 401 });
    }

    switch (event) {
      case 'push':
        await handlePushEvent(payload, env);
        break;

      case 'repository':
        await handleRepositoryEvent(payload, env);
        break;

      case 'installation':
        await handleInstallationEvent(payload, env);
        break;

      case 'installation_repositories':
        await handleInstallationRepositoriesEvent(payload, env);
        break;

      case 'release':
        await handleReleaseEvent(payload, env);
        break;
    }

    return new Response('OK', { status: 200 });
  } catch (error) {
    console.error('Webhook error:', error);
    return new Response('Internal error', { status: 500 });
  }
};

async function handlePushEvent(payload: any, env: any) {
  const { repository, pusher } = payload;

  // Find listings for this repository
  const listings = await env.DB.prepare(`
    SELECT id, seller_id FROM listings
    WHERE github_repo_url = ?
  `).bind(repository.html_url).all();

  for (const listing of listings.results) {
    // Trigger AI re-validation for updated code
    await env.DB.prepare(`
      UPDATE listings
      SET needs_revalidation = TRUE, updated_at = ?
      WHERE id = ?
    `).bind(Date.now(), listing.id).run();

    // Log the update
    await env.DB.prepare(`
      INSERT INTO listing_updates (listing_id, update_type, github_commit_sha, updated_at)
      VALUES (?, ?, ?, ?)
    `).bind(listing.id, 'code_push', payload.head_commit?.id, Date.now()).run();
  }
}

async function handleRepositoryEvent(payload: any, env: any) {
  const { action, repository } = payload;

  if (action === 'deleted' || action === 'archived') {
    // Automatically delist repositories that are deleted/archived
    await env.DB.prepare(`
      UPDATE listings
      SET status = 'delisted', updated_at = ?
      WHERE github_repo_url = ?
    `).bind(Date.now(), repository.html_url).run();
  }
}

async function handleInstallationEvent(payload: any, env: any) {
  const { action, installation } = payload;

  if (action === 'created') {
    // User installed the app - track installation
    await env.DB.prepare(`
      INSERT INTO github_installations (installation_id, account_id, account_login, created_at)
      VALUES (?, ?, ?, ?)
    `).bind(
      installation.id,
      installation.account.id,
      installation.account.login,
      Date.now()
    ).run();
  } else if (action === 'deleted') {
    // User uninstalled - remove access
    await env.DB.prepare(`
      DELETE FROM github_installations WHERE installation_id = ?
    `).bind(installation.id).run();
  }
}

async function handleInstallationRepositoriesEvent(payload: any, env: any) {
  const { action, installation, repositories_added, repositories_removed } = payload;

  if (repositories_added) {
    for (const repo of repositories_added) {
      await env.DB.prepare(`
        INSERT INTO installation_repositories (installation_id, repo_id, repo_name, repo_url)
        VALUES (?, ?, ?, ?)
      `).bind(installation.id, repo.id, repo.full_name, repo.html_url).run();
    }
  }

  if (repositories_removed) {
    for (const repo of repositories_removed) {
      await env.DB.prepare(`
        DELETE FROM installation_repositories
        WHERE installation_id = ? AND repo_id = ?
      `).bind(installation.id, repo.id).run();
    }
  }
}

async function handleReleaseEvent(payload: any, env: any) {
  const { action, release, repository } = payload;

  if (action === 'published') {
    // Update listings with new version
    await env.DB.prepare(`
      UPDATE listings
      SET version = ?, changelog = ?, updated_at = ?
      WHERE github_repo_url = ?
    `).bind(
      release.tag_name,
      release.body,
      Date.now(),
      repository.html_url
    ).run();
  }
}

function verifySignature(signature: string | null, payload: string, secret: string): boolean {
  if (!signature) return false;

  const expectedSignature = 'sha256=' +
    Array.from(new Uint8Array(
      crypto.subtle.digestSync('SHA-256', new TextEncoder().encode(secret + payload))
    ))
    .map(b => b.toString(16).padStart(2, '0'))
    .join('');

  return signature === expectedSignature;
}