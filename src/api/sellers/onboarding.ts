// Seller Onboarding with Containerization Options
import type { APIContext } from 'astro';

// Get onboarding steps and progress
export async function GET({ url, locals }: APIContext) {
  const { DB } = locals.runtime.env;
  const userId = url.searchParams.get('userId');

  if (!userId) {
    return new Response(JSON.stringify({ error: 'User ID required' }), {
      status: 400,
      headers: { 'Content-Type': 'application/json' }
    });
  }

  try {
    // Get user's onboarding progress
    const onboarding = await DB.prepare(`
      SELECT * FROM seller_onboarding WHERE user_id = ?
    `).bind(userId).first();

    // Default onboarding steps
    const onboardingSteps = [
      {
        id: 'profile',
        title: 'Complete Your Profile',
        description: 'Add business information, skills, and experience',
        required: true,
        completed: false
      },
      {
        id: 'verification',
        title: 'Verify Your Identity',
        description: 'Complete identity verification for trust & safety',
        required: true,
        completed: false
      },
      {
        id: 'listing_creation',
        title: 'Create Your First Listing',
        description: 'Add a business idea or service to the marketplace',
        required: true,
        completed: false
      },
      {
        id: 'containerization_setup',
        title: 'Setup Code Deployment (Optional)',
        description: 'Configure automatic containerization for your code projects',
        required: false,
        completed: false,
        options: [
          {
            type: 'github_integration',
            title: 'GitHub Integration',
            description: 'Automatically containerize from your GitHub repositories',
            icon: 'github'
          },
          {
            type: 'manual_upload',
            title: 'Manual Upload',
            description: 'Upload code files directly to our platform',
            icon: 'upload'
          },
          {
            type: 'custom_docker',
            title: 'Custom Docker',
            description: 'Provide your own Dockerfile for advanced configurations',
            icon: 'docker'
          },
          {
            type: 'no_code',
            title: 'No Code Required',
            description: 'Skip if you\'re not selling software solutions',
            icon: 'skip'
          }
        ]
      },
      {
        id: 'payment_setup',
        title: 'Payment Information',
        description: 'Add banking details to receive payments',
        required: true,
        completed: false
      },
      {
        id: 'preferences',
        title: 'Set Preferences',
        description: 'Configure notification and matching preferences',
        required: false,
        completed: false
      }
    ];

    // Update completion status based on existing data
    if (onboarding) {
      const progress = JSON.parse(onboarding.progress || '{}');
      onboardingSteps.forEach(step => {
        step.completed = progress[step.id] || false;
      });
    }

    // Check actual completion status
    const [profile, verification, listings, paymentInfo] = await Promise.all([
      DB.prepare(`SELECT id FROM user_profiles WHERE user_id = ?`).bind(userId).first(),
      DB.prepare(`SELECT id FROM identity_verifications WHERE user_id = ? AND status = 'approved'`).bind(userId).first(),
      DB.prepare(`SELECT id FROM listings WHERE seller_id = ? LIMIT 1`).bind(userId).first(),
      DB.prepare(`SELECT id FROM user_payment_info WHERE user_id = ?`).bind(userId).first()
    ]);

    onboardingSteps[0].completed = !!profile;
    onboardingSteps[1].completed = !!verification;
    onboardingSteps[2].completed = !!listings;
    onboardingSteps[4].completed = !!paymentInfo;

    const completedSteps = onboardingSteps.filter(step => step.completed).length;
    const requiredSteps = onboardingSteps.filter(step => step.required).length;
    const completedRequired = onboardingSteps.filter(step => step.required && step.completed).length;

    return new Response(JSON.stringify({
      steps: onboardingSteps,
      progress: {
        completedSteps,
        totalSteps: onboardingSteps.length,
        completedRequired,
        requiredSteps,
        percentage: Math.round((completedSteps / onboardingSteps.length) * 100),
        canSell: completedRequired === requiredSteps
      },
      containerizationOptions: {
        supported: true,
        frameworks: [
          'React', 'Next.js', 'Vue.js', 'Angular',
          'Python/Flask', 'Python/Django',
          'PHP/Laravel', 'Ruby/Rails',
          'Custom Docker'
        ]
      }
    }), {
      headers: { 'Content-Type': 'application/json' }
    });

  } catch (error) {
    console.error('Error getting onboarding status:', error);
    return new Response(JSON.stringify({ error: 'Failed to retrieve onboarding status' }), {
      status: 500,
      headers: { 'Content-Type': 'application/json' }
    });
  }
}

// Update onboarding progress
export async function POST({ request, locals }: APIContext) {
  const { DB } = locals.runtime.env;

  try {
    const {
      userId,
      step,
      data,
      completed = false
    } = await request.json();

    if (!userId || !step) {
      return new Response(JSON.stringify({
        error: 'User ID and step required'
      }), {
        status: 400,
        headers: { 'Content-Type': 'application/json' }
      });
    }

    const now = Math.floor(Date.now() / 1000);

    // Get existing onboarding record
    let onboarding = await DB.prepare(`
      SELECT * FROM seller_onboarding WHERE user_id = ?
    `).bind(userId).first();

    let progress = {};
    if (onboarding) {
      progress = JSON.parse(onboarding.progress || '{}');
    }

    // Update progress for this step
    progress[step] = {
      completed,
      completedAt: completed ? now : null,
      data: data || null
    };

    if (onboarding) {
      // Update existing record
      await DB.prepare(`
        UPDATE seller_onboarding SET
          progress = ?,
          updated_at = ?
        WHERE user_id = ?
      `).bind(JSON.stringify(progress), now, userId).run();
    } else {
      // Create new record
      await DB.prepare(`
        INSERT INTO seller_onboarding
        (id, user_id, progress, created_at, updated_at)
        VALUES (?, ?, ?, ?, ?)
      `).bind(
        generateOnboardingId(),
        userId,
        JSON.stringify(progress),
        now,
        now
      ).run();
    }

    // Handle specific step actions
    let stepResult = { success: true };

    switch (step) {
      case 'containerization_setup':
        stepResult = await handleContainerizationSetup(userId, data, DB);
        break;
      case 'profile':
        stepResult = await handleProfileCompletion(userId, data, DB);
        break;
      case 'payment_setup':
        stepResult = await handlePaymentSetup(userId, data, DB);
        break;
    }

    return new Response(JSON.stringify({
      success: true,
      step,
      completed,
      message: `${step} step ${completed ? 'completed' : 'updated'} successfully`,
      ...stepResult
    }), {
      headers: { 'Content-Type': 'application/json' }
    });

  } catch (error) {
    console.error('Error updating onboarding progress:', error);
    return new Response(JSON.stringify({ error: 'Failed to update onboarding progress' }), {
      status: 500,
      headers: { 'Content-Type': 'application/json' }
    });
  }
}

// Setup containerization preferences
export async function PUT({ request, locals }: APIContext) {
  const { DB } = locals.runtime.env;

  try {
    const {
      userId,
      containerizationMethod,
      githubIntegration,
      preferredFrameworks,
      dockerPreferences,
      autoContainerize = true
    } = await request.json();

    if (!userId || !containerizationMethod) {
      return new Response(JSON.stringify({
        error: 'User ID and containerization method required'
      }), {
        status: 400,
        headers: { 'Content-Type': 'application/json' }
      });
    }

    const now = Math.floor(Date.now() / 1000);
    const preferencesId = generatePreferencesId();

    // Store containerization preferences
    await DB.prepare(`
      INSERT OR REPLACE INTO containerization_preferences
      (id, user_id, method, github_integration, preferred_frameworks,
       docker_preferences, auto_containerize, created_at, updated_at)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
    `).bind(
      preferencesId,
      userId,
      containerizationMethod,
      JSON.stringify(githubIntegration || {}),
      JSON.stringify(preferredFrameworks || []),
      JSON.stringify(dockerPreferences || {}),
      autoContainerize ? 1 : 0,
      now,
      now
    ).run();

    // If GitHub integration requested, create integration record
    if (containerizationMethod === 'github_integration' && githubIntegration?.enabled) {
      await DB.prepare(`
        INSERT OR REPLACE INTO github_integrations
        (id, user_id, github_username, repository_access, webhook_url, status, created_at)
        VALUES (?, ?, ?, ?, ?, 'pending', ?)
      `).bind(
        generateIntegrationId(),
        userId,
        githubIntegration.username || '',
        githubIntegration.repositoryAccess || 'selected',
        `https://api.techflunky.io/webhooks/github/${userId}`,
        now
      ).run();
    }

    return new Response(JSON.stringify({
      success: true,
      preferencesId,
      containerizationMethod,
      message: 'Containerization preferences saved successfully',
      nextSteps: getContainerizationNextSteps(containerizationMethod)
    }), {
      headers: { 'Content-Type': 'application/json' }
    });

  } catch (error) {
    console.error('Error setting containerization preferences:', error);
    return new Response(JSON.stringify({ error: 'Failed to save preferences' }), {
      status: 500,
      headers: { 'Content-Type': 'application/json' }
    });
  }
}

async function handleContainerizationSetup(userId: string, data: any, DB: any) {
  if (!data || !data.method) {
    return { success: false, error: 'Containerization method required' };
  }

  const method = data.method;

  switch (method) {
    case 'github_integration':
      return {
        success: true,
        redirectUrl: `/onboarding/github-connect?userId=${userId}`,
        message: 'Ready to connect GitHub account'
      };

    case 'manual_upload':
      return {
        success: true,
        redirectUrl: `/onboarding/code-upload?userId=${userId}`,
        message: 'Ready for manual code upload'
      };

    case 'custom_docker':
      return {
        success: true,
        redirectUrl: `/onboarding/docker-setup?userId=${userId}`,
        message: 'Ready for custom Docker configuration'
      };

    case 'no_code':
      return {
        success: true,
        message: 'Skipping containerization - you can always add this later'
      };

    default:
      return { success: false, error: 'Invalid containerization method' };
  }
}

async function handleProfileCompletion(userId: string, data: any, DB: any) {
  // This would integrate with the existing profile system
  return { success: true, message: 'Profile completion handled by existing system' };
}

async function handlePaymentSetup(userId: string, data: any, DB: any) {
  // This would integrate with Stripe Connect or similar
  return { success: true, message: 'Payment setup handled by existing system' };
}

function getContainerizationNextSteps(method: string): string[] {
  const steps = {
    'github_integration': [
      'Connect your GitHub account',
      'Select repositories to monitor',
      'Configure automatic containerization settings',
      'Test deployment with a sample project'
    ],
    'manual_upload': [
      'Prepare your code files',
      'Upload via the web interface',
      'Review generated Dockerfile',
      'Test container deployment'
    ],
    'custom_docker': [
      'Create your Dockerfile',
      'Upload via the advanced interface',
      'Configure build settings',
      'Test container deployment'
    ],
    'no_code': [
      'Continue with other onboarding steps',
      'You can add containerization later from Settings'
    ]
  };

  return steps[method] || ['Complete onboarding'];
}

function generateOnboardingId(): string {
  const prefix = 'onb_';
  const randomBytes = crypto.getRandomValues(new Uint8Array(8));
  const id = Array.from(randomBytes)
    .map(b => b.toString(16).padStart(2, '0'))
    .join('');
  return prefix + id;
}

function generatePreferencesId(): string {
  const prefix = 'pref_';
  const randomBytes = crypto.getRandomValues(new Uint8Array(8));
  const id = Array.from(randomBytes)
    .map(b => b.toString(16).padStart(2, '0'))
    .join('');
  return prefix + id;
}

function generateIntegrationId(): string {
  const prefix = 'int_';
  const randomBytes = crypto.getRandomValues(new Uint8Array(8));
  const id = Array.from(randomBytes)
    .map(b => b.toString(16).padStart(2, '0'))
    .join('');
  return prefix + id;
}