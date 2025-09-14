// Code Containerization & Deployment System
import type { APIContext } from 'astro';

const SUPPORTED_FRAMEWORKS = {
  'react': {
    dockerfile: `FROM node:18-alpine
WORKDIR /app
COPY package*.json ./
RUN npm ci --only=production
COPY . .
RUN npm run build
EXPOSE 3000
CMD ["npm", "start"]`,
    buildCommand: 'npm run build',
    startCommand: 'npm start',
    port: 3000
  },
  'nextjs': {
    dockerfile: `FROM node:18-alpine
WORKDIR /app
COPY package*.json ./
RUN npm ci --only=production
COPY . .
RUN npm run build
EXPOSE 3000
CMD ["npm", "start"]`,
    buildCommand: 'npm run build',
    startCommand: 'npm start',
    port: 3000
  },
  'vue': {
    dockerfile: `FROM node:18-alpine
WORKDIR /app
COPY package*.json ./
RUN npm ci --only=production
COPY . .
RUN npm run build
RUN npm install -g serve
EXPOSE 3000
CMD ["serve", "-s", "dist", "-l", "3000"]`,
    buildCommand: 'npm run build',
    startCommand: 'serve -s dist',
    port: 3000
  },
  'angular': {
    dockerfile: `FROM node:18-alpine
WORKDIR /app
COPY package*.json ./
RUN npm ci --only=production
COPY . .
RUN npm run build
RUN npm install -g serve
EXPOSE 3000
CMD ["serve", "-s", "dist", "-l", "3000"]`,
    buildCommand: 'npm run build',
    startCommand: 'serve -s dist',
    port: 3000
  },
  'python-flask': {
    dockerfile: `FROM python:3.11-slim
WORKDIR /app
COPY requirements.txt .
RUN pip install --no-cache-dir -r requirements.txt
COPY . .
EXPOSE 5000
CMD ["python", "app.py"]`,
    buildCommand: 'pip install -r requirements.txt',
    startCommand: 'python app.py',
    port: 5000
  },
  'python-django': {
    dockerfile: `FROM python:3.11-slim
WORKDIR /app
COPY requirements.txt .
RUN pip install --no-cache-dir -r requirements.txt
COPY . .
RUN python manage.py collectstatic --noinput
EXPOSE 8000
CMD ["python", "manage.py", "runserver", "0.0.0.0:8000"]`,
    buildCommand: 'pip install -r requirements.txt && python manage.py collectstatic --noinput',
    startCommand: 'python manage.py runserver',
    port: 8000
  },
  'php-laravel': {
    dockerfile: `FROM php:8.2-apache
WORKDIR /var/www/html
RUN apt-get update && apt-get install -y composer
COPY composer.json composer.lock ./
RUN composer install --no-dev --optimize-autoloader
COPY . .
RUN chown -R www-data:www-data storage bootstrap/cache
EXPOSE 80
CMD ["apache2-foreground"]`,
    buildCommand: 'composer install --optimize-autoloader',
    startCommand: 'php artisan serve',
    port: 80
  },
  'ruby-rails': {
    dockerfile: `FROM ruby:3.1-alpine
WORKDIR /app
COPY Gemfile Gemfile.lock ./
RUN bundle install --without development test
COPY . .
RUN bundle exec rake assets:precompile
EXPOSE 3000
CMD ["bundle", "exec", "rails", "server", "-b", "0.0.0.0"]`,
    buildCommand: 'bundle install && bundle exec rake assets:precompile',
    startCommand: 'bundle exec rails server',
    port: 3000
  }
};

// Analyze code and create container
export async function POST({ request, locals }: APIContext) {
  const { DB, R2 } = locals.runtime.env;

  try {
    const {
      listingId,
      userId,
      repositoryUrl,
      codeFiles,
      framework,
      customDockerfile,
      environmentVars = {},
      buildOptions = {}
    } = await request.json();

    if (!listingId || !userId) {
      return new Response(JSON.stringify({
        error: 'Listing ID and User ID required'
      }), {
        status: 400,
        headers: { 'Content-Type': 'application/json' }
      });
    }

    // Verify listing ownership
    const listing = await DB.prepare(`
      SELECT * FROM listings WHERE id = ? AND seller_id = ?
    `).bind(listingId, userId).first();

    if (!listing) {
      return new Response(JSON.stringify({
        error: 'Listing not found or access denied'
      }), {
        status: 404,
        headers: { 'Content-Type': 'application/json' }
      });
    }

    let detectedFramework = framework;
    let containerConfig;

    if (!detectedFramework && (codeFiles || repositoryUrl)) {
      // Analyze code to detect framework
      detectedFramework = await analyzeCodeFramework(codeFiles, repositoryUrl);
    }

    if (customDockerfile) {
      // User provided custom Dockerfile
      containerConfig = {
        dockerfile: customDockerfile,
        buildCommand: buildOptions.buildCommand || 'echo "Custom build"',
        startCommand: buildOptions.startCommand || 'echo "Custom start"',
        port: buildOptions.port || 3000
      };
    } else if (detectedFramework && SUPPORTED_FRAMEWORKS[detectedFramework]) {
      // Use framework template
      containerConfig = SUPPORTED_FRAMEWORKS[detectedFramework];
    } else {
      // Generic container
      containerConfig = {
        dockerfile: `FROM node:18-alpine
WORKDIR /app
COPY . .
RUN npm install 2>/dev/null || echo "No package.json found"
EXPOSE 3000
CMD ["node", "index.js"]`,
        buildCommand: 'npm install',
        startCommand: 'node index.js',
        port: 3000
      };
    }

    const containerId = generateContainerId();
    const now = Math.floor(Date.now() / 1000);

    // Store container configuration
    await DB.prepare(`
      INSERT INTO code_containers
      (id, listing_id, user_id, framework, dockerfile, build_command, start_command, port,
       environment_vars, status, created_at)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, 'pending', ?)
    `).bind(
      containerId,
      listingId,
      userId,
      detectedFramework || 'unknown',
      containerConfig.dockerfile,
      containerConfig.buildCommand,
      containerConfig.startCommand,
      containerConfig.port,
      JSON.stringify(environmentVars),
      now
    ).run();

    // If code files provided, store them in R2
    if (codeFiles) {
      for (const [filename, content] of Object.entries(codeFiles)) {
        const key = `containers/${containerId}/${filename}`;
        await R2.put(key, content as string);
      }
    }

    // Update listing with container info
    await DB.prepare(`
      UPDATE listings SET
        has_container = 1,
        container_id = ?,
        demo_available = 1,
        updated_at = ?
      WHERE id = ?
    `).bind(containerId, now, listingId).run();

    return new Response(JSON.stringify({
      success: true,
      containerId,
      framework: detectedFramework,
      status: 'pending',
      buildConfig: {
        dockerfile: containerConfig.dockerfile,
        buildCommand: containerConfig.buildCommand,
        startCommand: containerConfig.startCommand,
        port: containerConfig.port
      },
      message: 'Container configuration created. Build process will begin shortly.'
    }), {
      headers: { 'Content-Type': 'application/json' }
    });

  } catch (error) {
    console.error('Error creating container:', error);
    return new Response(JSON.stringify({ error: 'Failed to create container' }), {
      status: 500,
      headers: { 'Content-Type': 'application/json' }
    });
  }
}

// Get container status and logs
export async function GET({ url, locals }: APIContext) {
  const { DB } = locals.runtime.env;
  const containerId = url.searchParams.get('containerId');
  const listingId = url.searchParams.get('listingId');
  const userId = url.searchParams.get('userId');

  if (!userId) {
    return new Response(JSON.stringify({ error: 'User ID required' }), {
      status: 400,
      headers: { 'Content-Type': 'application/json' }
    });
  }

  try {
    let query = `
      SELECT cc.*, l.title as listing_title
      FROM code_containers cc
      JOIN listings l ON cc.listing_id = l.id
      WHERE cc.user_id = ?
    `;
    let params = [userId];

    if (containerId) {
      query += ' AND cc.id = ?';
      params.push(containerId);
    } else if (listingId) {
      query += ' AND cc.listing_id = ?';
      params.push(listingId);
    }

    query += ' ORDER BY cc.created_at DESC';

    const containers = containerId ?
      [await DB.prepare(query).bind(...params).first()] :
      await DB.prepare(query).bind(...params).all();

    const processedContainers = containers.filter(Boolean).map((container: any) => ({
      ...container,
      environment_vars: container.environment_vars ? JSON.parse(container.environment_vars) : {},
      buildLogs: container.build_logs ? JSON.parse(container.build_logs) : [],
      runtimeLogs: container.runtime_logs ? JSON.parse(container.runtime_logs) : []
    }));

    return new Response(JSON.stringify({
      containers: containerId ? processedContainers[0] : processedContainers
    }), {
      headers: { 'Content-Type': 'application/json' }
    });

  } catch (error) {
    console.error('Error getting containers:', error);
    return new Response(JSON.stringify({ error: 'Failed to retrieve containers' }), {
      status: 500,
      headers: { 'Content-Type': 'application/json' }
    });
  }
}

// Update container configuration
export async function PUT({ request, locals }: APIContext) {
  const { DB } = locals.runtime.env;

  try {
    const {
      containerId,
      userId,
      environmentVars,
      buildCommand,
      startCommand,
      port,
      customDockerfile
    } = await request.json();

    if (!containerId || !userId) {
      return new Response(JSON.stringify({
        error: 'Container ID and User ID required'
      }), {
        status: 400,
        headers: { 'Content-Type': 'application/json' }
      });
    }

    // Verify ownership
    const container = await DB.prepare(`
      SELECT * FROM code_containers WHERE id = ? AND user_id = ?
    `).bind(containerId, userId).first();

    if (!container) {
      return new Response(JSON.stringify({
        error: 'Container not found or access denied'
      }), {
        status: 404,
        headers: { 'Content-Type': 'application/json' }
      });
    }

    const updates: any = {};
    if (environmentVars) updates.environment_vars = JSON.stringify(environmentVars);
    if (buildCommand) updates.build_command = buildCommand;
    if (startCommand) updates.start_command = startCommand;
    if (port) updates.port = port;
    if (customDockerfile) updates.dockerfile = customDockerfile;

    if (Object.keys(updates).length === 0) {
      return new Response(JSON.stringify({ error: 'No updates provided' }), {
        status: 400,
        headers: { 'Content-Type': 'application/json' }
      });
    }

    updates.updated_at = Math.floor(Date.now() / 1000);
    updates.status = 'pending'; // Mark for rebuild

    const updateFields = Object.keys(updates).map(key => `${key} = ?`).join(', ');
    const updateValues = Object.values(updates);

    await DB.prepare(`
      UPDATE code_containers SET ${updateFields} WHERE id = ? AND user_id = ?
    `).bind(...updateValues, containerId, userId).run();

    return new Response(JSON.stringify({
      success: true,
      message: 'Container configuration updated. Rebuild will begin shortly.'
    }), {
      headers: { 'Content-Type': 'application/json' }
    });

  } catch (error) {
    console.error('Error updating container:', error);
    return new Response(JSON.stringify({ error: 'Failed to update container' }), {
      status: 500,
      headers: { 'Content-Type': 'application/json' }
    });
  }
}

// Delete container
export async function DELETE({ request, locals }: APIContext) {
  const { DB, R2 } = locals.runtime.env;

  try {
    const { containerId, userId } = await request.json();

    if (!containerId || !userId) {
      return new Response(JSON.stringify({
        error: 'Container ID and User ID required'
      }), {
        status: 400,
        headers: { 'Content-Type': 'application/json' }
      });
    }

    // Verify ownership and get container info
    const container = await DB.prepare(`
      SELECT * FROM code_containers WHERE id = ? AND user_id = ?
    `).bind(containerId, userId).first();

    if (!container) {
      return new Response(JSON.stringify({
        error: 'Container not found or access denied'
      }), {
        status: 404,
        headers: { 'Content-Type': 'application/json' }
      });
    }

    // Delete container files from R2
    try {
      const objects = await R2.list({ prefix: `containers/${containerId}/` });
      for (const object of objects.objects) {
        await R2.delete(object.key);
      }
    } catch (r2Error) {
      console.warn('Failed to delete some container files:', r2Error);
    }

    // Delete container record
    await DB.prepare(`
      DELETE FROM code_containers WHERE id = ? AND user_id = ?
    `).bind(containerId, userId).run();

    // Update listing
    await DB.prepare(`
      UPDATE listings SET
        has_container = 0,
        container_id = NULL,
        demo_available = 0,
        updated_at = ?
      WHERE id = ?
    `).bind(Math.floor(Date.now() / 1000), container.listing_id).run();

    return new Response(JSON.stringify({
      success: true,
      message: 'Container deleted successfully'
    }), {
      headers: { 'Content-Type': 'application/json' }
    });

  } catch (error) {
    console.error('Error deleting container:', error);
    return new Response(JSON.stringify({ error: 'Failed to delete container' }), {
      status: 500,
      headers: { 'Content-Type': 'application/json' }
    });
  }
}

async function analyzeCodeFramework(codeFiles: any, repositoryUrl?: string): Promise<string> {
  // Simple framework detection logic
  if (codeFiles) {
    const files = Object.keys(codeFiles);

    if (files.includes('package.json')) {
      const packageJson = JSON.parse(codeFiles['package.json'] || '{}');
      const deps = { ...packageJson.dependencies, ...packageJson.devDependencies };

      if (deps['next']) return 'nextjs';
      if (deps['react']) return 'react';
      if (deps['vue']) return 'vue';
      if (deps['@angular/core']) return 'angular';
    }

    if (files.includes('requirements.txt')) {
      const requirements = codeFiles['requirements.txt'] || '';
      if (requirements.includes('flask')) return 'python-flask';
      if (requirements.includes('django')) return 'python-django';
    }

    if (files.includes('composer.json')) {
      const composer = JSON.parse(codeFiles['composer.json'] || '{}');
      if (composer.require && composer.require['laravel/framework']) return 'php-laravel';
    }

    if (files.includes('Gemfile')) {
      const gemfile = codeFiles['Gemfile'] || '';
      if (gemfile.includes('rails')) return 'ruby-rails';
    }
  }

  return 'unknown';
}

function generateContainerId(): string {
  const prefix = 'cont_';
  const randomBytes = crypto.getRandomValues(new Uint8Array(16));
  const id = Array.from(randomBytes)
    .map(b => b.toString(16).padStart(2, '0'))
    .join('');
  return prefix + id;
}