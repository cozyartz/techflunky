import type { APIRoute } from 'astro';
import { createAppAuth } from '@octokit/auth-app';
import { Octokit } from '@octokit/rest';

export const GET: APIRoute = async ({ url, locals, redirect }) => {
  const code = url.searchParams.get('code');
  const installation_id = url.searchParams.get('installation_id');
  const setup_action = url.searchParams.get('setup_action');
  const state = url.searchParams.get('state');

  if (!code) {
    // Redirect to GitHub App installation
    const clientId = locals.runtime.env.GITHUB_APP_CLIENT_ID;
    const redirectUri = `${url.origin}/api/auth/github`;
    const stateParam = Math.random().toString(36).substring(7);

    // For GitHub Apps, we redirect to installation URL using App ID
    const githubUrl = `https://github.com/login/oauth/authorize?client_id=${clientId}&redirect_uri=${encodeURIComponent(redirectUri)}&state=${stateParam}`;

    return redirect(githubUrl);
  }

  try {
    // Create App authentication
    const appAuth = createAppAuth({
      appId: locals.runtime.env.GITHUB_APP_ID,
      privateKey: locals.runtime.env.GITHUB_APP_PRIVATE_KEY,
      clientId: locals.runtime.env.GITHUB_APP_CLIENT_ID,
      clientSecret: locals.runtime.env.GITHUB_APP_CLIENT_SECRET,
    });

    // Exchange code for user access token
    const userAuth = await appAuth({
      type: "oauth-user",
      code,
      state,
    });

    // Create Octokit instance with user token
    const octokit = new Octokit({
      auth: userAuth.token,
    });

    // Get user data from GitHub
    const { data: userData } = await octokit.rest.users.getAuthenticated();

    // Get user email (primary email)
    const { data: emailData } = await octokit.rest.users.listEmailsForAuthenticated();
    const primaryEmail = emailData.find((email: any) => email.primary)?.email || userData.email;

    // Get user installations to access repositories
    const { data: installations } = await octokit.rest.apps.listInstallationsForAuthenticatedUser();

    // Store access token and installation info for later use
    const githubData = {
      access_token: userAuth.token,
      installations: installations,
      github_id: userData.id,
      login: userData.login
    };

    // Check if user exists
    let user = await locals.runtime.env.DB.prepare(
      'SELECT id, email, name, role FROM users WHERE email = ?'
    ).bind(primaryEmail).first();

    if (!user) {
      // Create new user - make first GitHub user an admin/seller
      const userId = crypto.randomUUID();
      const isFirstUser = true; // You can check if this is the first user in the system

      await locals.runtime.env.DB.prepare(`
        INSERT INTO users (id, email, name, password_hash, role, created_at, updated_at)
        VALUES (?, ?, ?, ?, ?, ?, ?)
      `).bind(
        userId,
        primaryEmail,
        userData.name || userData.login,
        'github_app', // GitHub App authentication
        isFirstUser ? 'admin' : 'seller', // Default to seller for marketplace
        Date.now(),
        Date.now()
      ).run();

      // Create profile with GitHub data
      await locals.runtime.env.DB.prepare(`
        INSERT INTO profiles (user_id, bio, company, website, avatar_url, github_id, github_login, created_at, updated_at)
        VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
      `).bind(
        userId,
        userData.bio || 'Developer on TechFlunky',
        userData.company || null,
        userData.blog || userData.html_url,
        userData.avatar_url,
        userData.id,
        userData.login,
        Date.now(),
        Date.now()
      ).run();

      user = {
        id: userId,
        email: primaryEmail,
        name: userData.name || userData.login,
        role: isFirstUser ? 'admin' : 'seller'
      };
    }

    // Store GitHub App data for repository access
    await locals.runtime.env.DB.prepare(`
      INSERT OR REPLACE INTO github_integrations
      (user_id, access_token, github_id, github_login, installations, updated_at)
      VALUES (?, ?, ?, ?, ?, ?)
    `).bind(
      user.id,
      githubData.access_token,
      githubData.github_id,
      githubData.login,
      JSON.stringify(githubData.installations),
      Date.now()
    ).run();

    // Create session
    const sessionToken = crypto.randomUUID();
    const expiresAt = Date.now() + (30 * 24 * 60 * 60 * 1000); // 30 days

    await locals.runtime.env.DB.prepare(`
      INSERT INTO user_sessions (user_id, token, expires_at, created_at)
      VALUES (?, ?, ?, ?)
    `).bind(user.id, sessionToken, expiresAt, Date.now()).run();

    // Set session cookie
    const response = new Response(null, {
      status: 302,
      headers: {
        'Location': user.role === 'admin' ? '/dashboard/admin' : '/dashboard',
        'Set-Cookie': `session=${sessionToken}; Path=/; HttpOnly; SameSite=Lax; Max-Age=${30 * 24 * 60 * 60}`
      }
    });

    return response;

  } catch (error) {
    console.error('GitHub OAuth error:', error);
    return redirect('/login?error=oauth_failed');
  }
};