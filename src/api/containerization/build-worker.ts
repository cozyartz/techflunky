// Docker Build Worker - Handles container building and deployment
import type { APIContext } from 'astro';

// Container build process management
export async function POST({ request, locals }: APIContext) {
  const { DB, KV, R2 } = locals.runtime.env;

  try {
    const { containerId, action = 'build' } = await request.json();

    if (!containerId) {
      return new Response(JSON.stringify({
        error: 'Container ID required'
      }), {
        status: 400,
        headers: { 'Content-Type': 'application/json' }
      });
    }

    const container = await DB.prepare(`
      SELECT cc.*, l.title as listing_title
      FROM code_containers cc
      JOIN listings l ON cc.listing_id = l.id
      WHERE cc.id = ?
    `).bind(containerId).first();

    if (!container) {
      return new Response(JSON.stringify({
        error: 'Container not found'
      }), {
        status: 404,
        headers: { 'Content-Type': 'application/json' }
      });
    }

    switch (action) {
      case 'build':
        return await buildContainer(container, DB, KV, R2);
      case 'start':
        return await startContainer(container, DB, KV);
      case 'stop':
        return await stopContainer(container, DB, KV);
      case 'restart':
        return await restartContainer(container, DB, KV);
      case 'logs':
        return await getContainerLogs(container, DB);
      default:
        return new Response(JSON.stringify({
          error: 'Invalid action'
        }), {
          status: 400,
          headers: { 'Content-Type': 'application/json' }
        });
    }

  } catch (error) {
    console.error('Error in build worker:', error);
    return new Response(JSON.stringify({ error: 'Build worker failed' }), {
      status: 500,
      headers: { 'Content-Type': 'application/json' }
    });
  }
}

async function buildContainer(container: any, DB: any, KV: any, R2: any) {
  const buildId = generateBuildId();
  const now = Math.floor(Date.now() / 1000);

  try {
    // Update container status
    await DB.prepare(`
      UPDATE code_containers SET
        status = 'building',
        build_started_at = ?,
        current_build_id = ?
      WHERE id = ?
    `).bind(now, buildId, container.id).run();

    // Simulate build process (in production, this would interact with Docker API)
    const buildLogs = [];
    const buildSteps = [
      'Initializing build environment...',
      'Pulling base image...',
      'Copying source code...',
      'Installing dependencies...',
      'Running build command...',
      'Creating container image...',
      'Configuring networking...',
      'Setting up security policies...',
      'Build completed successfully!'
    ];

    for (const [index, step] of buildSteps.entries()) {
      buildLogs.push({
        timestamp: Date.now(),
        level: 'info',
        message: step
      });

      // Store intermediate build logs
      await KV.put(`build_logs:${buildId}`, JSON.stringify(buildLogs));

      // Simulate build time
      await new Promise(resolve => setTimeout(resolve, 100));

      // Simulate potential build failure
      if (Math.random() < 0.05 && index > 3) { // 5% chance of failure after deps install
        buildLogs.push({
          timestamp: Date.now(),
          level: 'error',
          message: 'Build failed: Dependency conflict detected'
        });

        await DB.prepare(`
          UPDATE code_containers SET
            status = 'failed',
            build_logs = ?,
            build_completed_at = ?
          WHERE id = ?
        `).bind(JSON.stringify(buildLogs), Math.floor(Date.now() / 1000), container.id).run();

        return new Response(JSON.stringify({
          success: false,
          buildId,
          status: 'failed',
          logs: buildLogs,
          error: 'Build failed during dependency installation'
        }), {
          status: 500,
          headers: { 'Content-Type': 'application/json' }
        });
      }
    }

    // Generate container runtime info
    const runtimeConfig = {
      containerId: container.id,
      imageId: `img_${generateId()}`,
      port: container.port || 3000,
      healthCheck: `/health`,
      deploymentUrl: `https://${container.id}.containers.techflunky.io`,
      resources: {
        cpu: '0.5',
        memory: '512Mi',
        storage: '1Gi'
      },
      environment: JSON.parse(container.environment_vars || '{}')
    };

    // Update container with successful build
    await DB.prepare(`
      UPDATE code_containers SET
        status = 'ready',
        build_logs = ?,
        runtime_config = ?,
        build_completed_at = ?,
        deployment_url = ?
      WHERE id = ?
    `).bind(
      JSON.stringify(buildLogs),
      JSON.stringify(runtimeConfig),
      Math.floor(Date.now() / 1000),
      runtimeConfig.deploymentUrl,
      container.id
    ).run();

    // Create deployment record
    await DB.prepare(`
      INSERT INTO container_deployments
      (id, container_id, build_id, status, deployment_url, created_at)
      VALUES (?, ?, ?, 'ready', ?, ?)
    `).bind(
      generateId(),
      container.id,
      buildId,
      runtimeConfig.deploymentUrl,
      now
    ).run();

    return new Response(JSON.stringify({
      success: true,
      buildId,
      status: 'ready',
      deploymentUrl: runtimeConfig.deploymentUrl,
      runtimeConfig,
      logs: buildLogs,
      message: 'Container built and deployed successfully'
    }), {
      headers: { 'Content-Type': 'application/json' }
    });

  } catch (error) {
    console.error('Build error:', error);

    await DB.prepare(`
      UPDATE code_containers SET
        status = 'failed',
        build_completed_at = ?
      WHERE id = ?
    `).bind(Math.floor(Date.now() / 1000), container.id).run();

    return new Response(JSON.stringify({
      success: false,
      buildId,
      status: 'failed',
      error: 'Internal build error'
    }), {
      status: 500,
      headers: { 'Content-Type': 'application/json' }
    });
  }
}

async function startContainer(container: any, DB: any, KV: any) {
  if (container.status !== 'ready' && container.status !== 'stopped') {
    return new Response(JSON.stringify({
      error: 'Container must be in ready or stopped state to start'
    }), {
      status: 400,
      headers: { 'Content-Type': 'application/json' }
    });
  }

  const now = Math.floor(Date.now() / 1000);

  await DB.prepare(`
    UPDATE code_containers SET
      status = 'running',
      started_at = ?
    WHERE id = ?
  `).bind(now, container.id).run();

  // Store runtime logs
  const runtimeLogs = [{
    timestamp: Date.now(),
    level: 'info',
    message: 'Container started successfully'
  }];

  await KV.put(`runtime_logs:${container.id}`, JSON.stringify(runtimeLogs));

  return new Response(JSON.stringify({
    success: true,
    status: 'running',
    message: 'Container started successfully',
    deploymentUrl: container.deployment_url
  }), {
    headers: { 'Content-Type': 'application/json' }
  });
}

async function stopContainer(container: any, DB: any, KV: any) {
  if (container.status !== 'running') {
    return new Response(JSON.stringify({
      error: 'Container is not running'
    }), {
      status: 400,
      headers: { 'Content-Type': 'application/json' }
    });
  }

  const now = Math.floor(Date.now() / 1000);

  await DB.prepare(`
    UPDATE code_containers SET
      status = 'stopped',
      stopped_at = ?
    WHERE id = ?
  `).bind(now, container.id).run();

  return new Response(JSON.stringify({
    success: true,
    status: 'stopped',
    message: 'Container stopped successfully'
  }), {
    headers: { 'Content-Type': 'application/json' }
  });
}

async function restartContainer(container: any, DB: any, KV: any) {
  // Stop first
  if (container.status === 'running') {
    await stopContainer(container, DB, KV);
  }

  // Wait a moment
  await new Promise(resolve => setTimeout(resolve, 1000));

  // Start again
  return await startContainer({ ...container, status: 'stopped' }, DB, KV);
}

async function getContainerLogs(container: any, DB: any) {
  const buildLogs = container.build_logs ? JSON.parse(container.build_logs) : [];
  const runtimeLogs = container.runtime_logs ? JSON.parse(container.runtime_logs) : [];

  return new Response(JSON.stringify({
    success: true,
    containerId: container.id,
    buildLogs,
    runtimeLogs,
    status: container.status
  }), {
    headers: { 'Content-Type': 'application/json' }
  });
}

// Get container resource usage and health
export async function GET({ url, locals }: APIContext) {
  const { DB, KV } = locals.runtime.env;
  const containerId = url.searchParams.get('containerId');
  const action = url.searchParams.get('action') || 'status';

  if (!containerId) {
    return new Response(JSON.stringify({
      error: 'Container ID required'
    }), {
      status: 400,
      headers: { 'Content-Type': 'application/json' }
    });
  }

  try {
    const container = await DB.prepare(`
      SELECT * FROM code_containers WHERE id = ?
    `).bind(containerId).first();

    if (!container) {
      return new Response(JSON.stringify({
        error: 'Container not found'
      }), {
        status: 404,
        headers: { 'Content-Type': 'application/json' }
      });
    }

    if (action === 'metrics') {
      // Simulate container metrics
      const metrics = {
        cpu: {
          usage: Math.random() * 50, // 0-50% CPU usage
          limit: 50
        },
        memory: {
          usage: Math.random() * 256, // 0-256MB memory usage
          limit: 512
        },
        network: {
          bytesIn: Math.floor(Math.random() * 1000000),
          bytesOut: Math.floor(Math.random() * 1000000)
        },
        requests: {
          total: Math.floor(Math.random() * 1000),
          successful: Math.floor(Math.random() * 950),
          failed: Math.floor(Math.random() * 50)
        },
        uptime: container.started_at ? Date.now() / 1000 - container.started_at : 0
      };

      return new Response(JSON.stringify({
        success: true,
        containerId,
        metrics,
        lastUpdated: Date.now()
      }), {
        headers: { 'Content-Type': 'application/json' }
      });
    }

    // Default status response
    const runtimeConfig = container.runtime_config ? JSON.parse(container.runtime_config) : {};

    return new Response(JSON.stringify({
      success: true,
      containerId,
      status: container.status,
      framework: container.framework,
      deploymentUrl: container.deployment_url,
      runtimeConfig,
      createdAt: container.created_at,
      startedAt: container.started_at,
      updatedAt: container.updated_at
    }), {
      headers: { 'Content-Type': 'application/json' }
    });

  } catch (error) {
    console.error('Error getting container status:', error);
    return new Response(JSON.stringify({ error: 'Failed to get container status' }), {
      status: 500,
      headers: { 'Content-Type': 'application/json' }
    });
  }
}

function generateBuildId(): string {
  const prefix = 'build_';
  const randomBytes = crypto.getRandomValues(new Uint8Array(8));
  const id = Array.from(randomBytes)
    .map(b => b.toString(16).padStart(2, '0'))
    .join('');
  return prefix + id;
}

function generateId(): string {
  const randomBytes = crypto.getRandomValues(new Uint8Array(16));
  return Array.from(randomBytes)
    .map(b => b.toString(16).padStart(2, '0'))
    .join('');
}