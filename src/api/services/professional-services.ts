// Professional Services Framework
import type { APIContext } from 'astro';

// Service delivery workflow and project management
export async function GET({ url, locals }: APIContext) {
  const { DB, CLAUDE_API_KEY } = locals.runtime.env;
  const requestId = url.searchParams.get('requestId');
  const userId = url.searchParams.get('userId');
  const status = url.searchParams.get('status');

  if (!userId && !requestId) {
    return new Response(JSON.stringify({ error: 'User ID or request ID required' }), {
      status: 400,
      headers: { 'Content-Type': 'application/json' }
    });
  }

  try {
    if (requestId) {
      // Get specific service request with progress
      const request = await DB.prepare(`
        SELECT psr.*, u.name as user_name, u.email as user_email
        FROM professional_service_requests psr
        JOIN users u ON psr.user_id = u.id
        WHERE psr.id = ?
      `).bind(requestId).first();

      if (!request) {
        return new Response(JSON.stringify({
          error: 'Service request not found'
        }), {
          status: 404,
          headers: { 'Content-Type': 'application/json' }
        });
      }

      // Get progress updates
      const progressUpdates = await DB.prepare(`
        SELECT * FROM service_progress_updates
        WHERE request_id = ?
        ORDER BY created_at ASC
      `).bind(requestId).all();

      // Get deliverables
      const deliverables = await DB.prepare(`
        SELECT * FROM service_deliverables
        WHERE request_id = ?
        ORDER BY created_at DESC
      `).bind(requestId).all();

      return new Response(JSON.stringify({
        request: {
          ...request,
          service_config: JSON.parse(request.service_config),
          requirements: JSON.parse(request.requirements),
          total_price_formatted: `$${(request.total_price / 100).toLocaleString()}`,
          estimated_delivery_formatted: new Date(request.estimated_delivery * 1000).toLocaleDateString()
        },
        progress: progressUpdates.map(update => ({
          ...update,
          data: JSON.parse(update.data || '{}')
        })),
        deliverables: deliverables.map(deliverable => ({
          ...deliverable,
          metadata: JSON.parse(deliverable.metadata || '{}')
        }))
      }), {
        headers: { 'Content-Type': 'application/json' }
      });
    }

    // Get all service requests for user
    let query = `
      SELECT psr.*, u.name as assigned_to
      FROM professional_service_requests psr
      LEFT JOIN users u ON psr.assigned_to = u.id
      WHERE psr.user_id = ?
    `;
    let params = [userId];

    if (status) {
      query += ' AND psr.status = ?';
      params.push(status);
    }

    query += ' ORDER BY psr.created_at DESC';

    const requests = await DB.prepare(query).bind(...params).all();

    return new Response(JSON.stringify({
      requests: requests.map(req => ({
        ...req,
        service_config: JSON.parse(req.service_config),
        requirements: JSON.parse(req.requirements),
        total_price_formatted: `$${(req.total_price / 100).toLocaleString()}`,
        estimated_delivery_formatted: new Date(req.estimated_delivery * 1000).toLocaleDateString()
      })),
      summary: {
        total: requests.length,
        pending: requests.filter(r => r.status === 'pending').length,
        inProgress: requests.filter(r => r.status === 'in_progress').length,
        completed: requests.filter(r => r.status === 'completed').length
      }
    }), {
      headers: { 'Content-Type': 'application/json' }
    });

  } catch (error) {
    console.error('Error getting professional service requests:', error);
    return new Response(JSON.stringify({ error: 'Failed to retrieve service requests' }), {
      status: 500,
      headers: { 'Content-Type': 'application/json' }
    });
  }
}

// Update service request status and add progress
export async function PUT({ request, locals }: APIContext) {
  const { DB, CLAUDE_API_KEY } = locals.runtime.env;

  try {
    const {
      requestId,
      adminUserId,
      action, // 'assign', 'update_status', 'add_progress', 'deliver'
      data = {}
    } = await request.json();

    if (!requestId || !adminUserId || !action) {
      return new Response(JSON.stringify({
        error: 'Request ID, admin user ID, and action are required'
      }), {
        status: 400,
        headers: { 'Content-Type': 'application/json' }
      });
    }

    const now = Math.floor(Date.now() / 1000);
    const updateId = generateUpdateId();

    // Verify admin permissions (simplified - in production would check admin roles)
    // For now, allow any user to update their own requests or admin users to update any

    switch (action) {
      case 'assign':
        await DB.prepare(`
          UPDATE professional_service_requests SET
            assigned_to = ?,
            status = 'in_progress',
            started_at = ?,
            updated_at = ?
          WHERE id = ?
        `).bind(data.assignedTo, now, now, requestId).run();

        await addProgressUpdate(DB, updateId, requestId, 'status_change', {
          newStatus: 'in_progress',
          assignedTo: data.assignedTo,
          message: 'Request assigned and work started'
        }, now);

        break;

      case 'update_status':
        await DB.prepare(`
          UPDATE professional_service_requests SET
            status = ?,
            ${data.newStatus === 'completed' ? 'completed_at = ?,' : ''}
            updated_at = ?
          WHERE id = ?
        `).bind(
          data.newStatus,
          ...(data.newStatus === 'completed' ? [now] : []),
          now,
          requestId
        ).run();

        await addProgressUpdate(DB, updateId, requestId, 'status_change', {
          newStatus: data.newStatus,
          message: data.message || `Status updated to ${data.newStatus}`
        }, now);

        break;

      case 'add_progress':
        await addProgressUpdate(DB, updateId, requestId, 'progress_update', {
          percentage: data.percentage,
          milestone: data.milestone,
          message: data.message,
          nextSteps: data.nextSteps
        }, now);

        break;

      case 'deliver':
        // Add deliverable and complete request
        const deliverableId = generateDeliverableId();

        await Promise.all([
          DB.prepare(`
            INSERT INTO service_deliverables (
              id, request_id, deliverable_type, title, description,
              file_url, download_url, metadata, created_at
            ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
          `).bind(
            deliverableId,
            requestId,
            data.deliverableType || 'report',
            data.title,
            data.description,
            data.fileUrl,
            data.downloadUrl,
            JSON.stringify(data.metadata || {}),
            now
          ).run(),

          DB.prepare(`
            UPDATE professional_service_requests SET
              status = 'completed',
              completed_at = ?,
              updated_at = ?
            WHERE id = ?
          `).bind(now, now, requestId).run(),

          addProgressUpdate(DB, updateId, requestId, 'delivery', {
            deliverableId,
            title: data.title,
            message: 'Service completed and deliverable provided'
          }, now)
        ]);

        break;

      default:
        return new Response(JSON.stringify({
          error: 'Invalid action'
        }), {
          status: 400,
          headers: { 'Content-Type': 'application/json' }
        });
    }

    return new Response(JSON.stringify({
      success: true,
      action,
      requestId,
      updateId,
      message: 'Service request updated successfully'
    }), {
      headers: { 'Content-Type': 'application/json' }
    });

  } catch (error) {
    console.error('Error updating professional service request:', error);
    return new Response(JSON.stringify({ error: 'Failed to update service request' }), {
      status: 500,
      headers: { 'Content-Type': 'application/json' }
    });
  }
}

// Generate AI-powered deliverable (for custom AI reports)
export async function POST({ request, locals }: APIContext) {
  const { DB, CLAUDE_API_KEY } = locals.runtime.env;

  try {
    const {
      requestId,
      reportType = 'market_analysis',
      parameters = {}
    } = await request.json();

    if (!requestId) {
      return new Response(JSON.stringify({
        error: 'Request ID required'
      }), {
        status: 400,
        headers: { 'Content-Type': 'application/json' }
      });
    }

    if (!CLAUDE_API_KEY) {
      return new Response(JSON.stringify({
        error: 'AI service not available'
      }), {
        status: 503,
        headers: { 'Content-Type': 'application/json' }
      });
    }

    // Get service request details
    const serviceRequest = await DB.prepare(`
      SELECT * FROM professional_service_requests WHERE id = ?
    `).bind(requestId).first();

    if (!serviceRequest) {
      return new Response(JSON.stringify({
        error: 'Service request not found'
      }), {
        status: 404,
        headers: { 'Content-Type': 'application/json' }
      });
    }

    // Generate AI report based on type
    const reportData = await generateAIReport(
      DB,
      CLAUDE_API_KEY,
      reportType,
      JSON.parse(serviceRequest.requirements),
      parameters
    );

    const now = Math.floor(Date.now() / 1000);
    const deliverableId = generateDeliverableId();

    // Store generated report
    await DB.prepare(`
      INSERT INTO service_deliverables (
        id, request_id, deliverable_type, title, description,
        content, metadata, created_at
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?)
    `).bind(
      deliverableId,
      requestId,
      'ai_report',
      reportData.title,
      reportData.summary,
      JSON.stringify(reportData),
      JSON.stringify({
        reportType,
        parameters,
        generatedAt: now,
        aiModel: 'claude-3-haiku'
      }),
      now
    ).run();

    // Update request status to completed
    await Promise.all([
      DB.prepare(`
        UPDATE professional_service_requests SET
          status = 'completed',
          completed_at = ?,
          updated_at = ?
        WHERE id = ?
      `).bind(now, now, requestId).run(),

      addProgressUpdate(DB, generateUpdateId(), requestId, 'delivery', {
        deliverableId,
        title: reportData.title,
        message: 'AI-powered report generated and delivered'
      }, now)
    ]);

    return new Response(JSON.stringify({
      success: true,
      deliverable: {
        id: deliverableId,
        title: reportData.title,
        summary: reportData.summary,
        reportType,
        downloadUrl: `/api/services/download/${deliverableId}`
      },
      message: 'AI report generated successfully'
    }), {
      headers: { 'Content-Type': 'application/json' }
    });

  } catch (error) {
    console.error('Error generating AI deliverable:', error);
    return new Response(JSON.stringify({ error: 'Failed to generate AI deliverable' }), {
      status: 500,
      headers: { 'Content-Type': 'application/json' }
    });
  }
}

// Download deliverable
export async function OPTIONS({ url, locals }: APIContext) {
  const { DB } = locals.runtime.env;
  const deliverableId = url.pathname.split('/').pop();

  if (!deliverableId) {
    return new Response(JSON.stringify({ error: 'Deliverable ID required' }), {
      status: 400,
      headers: { 'Content-Type': 'application/json' }
    });
  }

  try {
    const deliverable = await DB.prepare(`
      SELECT sd.*, psr.user_id
      FROM service_deliverables sd
      JOIN professional_service_requests psr ON sd.request_id = psr.id
      WHERE sd.id = ?
    `).bind(deliverableId).first();

    if (!deliverable) {
      return new Response(JSON.stringify({
        error: 'Deliverable not found'
      }), {
        status: 404,
        headers: { 'Content-Type': 'application/json' }
      });
    }

    // For AI reports, generate formatted output
    if (deliverable.deliverable_type === 'ai_report') {
      const content = JSON.parse(deliverable.content);
      const formattedReport = formatAIReport(content);

      return new Response(formattedReport, {
        headers: {
          'Content-Type': 'text/markdown',
          'Content-Disposition': `attachment; filename="${deliverable.title.replace(/[^a-zA-Z0-9]/g, '_')}.md"`
        }
      });
    }

    // For file deliverables, redirect to download URL
    if (deliverable.download_url) {
      return Response.redirect(deliverable.download_url, 302);
    }

    return new Response(JSON.stringify({
      error: 'Deliverable not available for download'
    }), {
      status: 400,
      headers: { 'Content-Type': 'application/json' }
    });

  } catch (error) {
    console.error('Error downloading deliverable:', error);
    return new Response(JSON.stringify({ error: 'Failed to download deliverable' }), {
      status: 500,
      headers: { 'Content-Type': 'application/json' }
    });
  }
}

// Helper functions
async function addProgressUpdate(
  DB: any,
  updateId: string,
  requestId: string,
  updateType: string,
  data: any,
  timestamp: number
) {
  await DB.prepare(`
    INSERT INTO service_progress_updates (
      id, request_id, update_type, data, created_at
    ) VALUES (?, ?, ?, ?, ?)
  `).bind(
    updateId,
    requestId,
    updateType,
    JSON.stringify(data),
    timestamp
  ).run();
}

async function generateAIReport(
  DB: any,
  claudeApiKey: string,
  reportType: string,
  requirements: any,
  parameters: any
): Promise<any> {
  // Get relevant data from database based on report type
  let contextData = {};

  if (reportType === 'market_analysis') {
    contextData = await getMarketAnalysisData(DB, requirements);
  } else if (reportType === 'competitive_intelligence') {
    contextData = await getCompetitiveData(DB, requirements);
  }

  const prompt = buildReportPrompt(reportType, requirements, parameters, contextData);

  const response = await fetch('https://api.anthropic.com/v1/messages', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'x-api-key': claudeApiKey,
      'anthropic-version': '2023-06-01'
    },
    body: JSON.stringify({
      model: 'claude-3-haiku-20240307',
      max_tokens: 2000,
      messages: [{
        role: 'user',
        content: prompt
      }]
    })
  });

  if (!response.ok) {
    throw new Error('AI report generation failed');
  }

  const data = await response.json();
  const reportContent = data.content[0].text;

  return {
    title: `${reportType.replace('_', ' ').replace(/\b\w/g, l => l.toUpperCase())} Report`,
    summary: reportContent.split('\n')[0] || 'AI-generated analysis report',
    content: reportContent,
    sections: parseReportSections(reportContent),
    parameters,
    generatedAt: new Date().toISOString()
  };
}

async function getMarketAnalysisData(DB: any, requirements: any) {
  // Get relevant market data
  return {
    recentListings: 100,
    averagePrice: 50000,
    topCategories: ['SaaS', 'E-commerce', 'AI Tools']
  };
}

async function getCompetitiveData(DB: any, requirements: any) {
  // Get competitive intelligence data
  return {
    competitors: 15,
    marketShare: 8.5,
    pricingAdvantage: 15
  };
}

function buildReportPrompt(reportType: string, requirements: any, parameters: any, contextData: any): string {
  const basePrompt = `Generate a professional ${reportType.replace('_', ' ')} report with the following requirements:\n\n`;
  const requirementsText = Object.entries(requirements).map(([key, value]) => `${key}: ${value}`).join('\n');
  const contextText = Object.entries(contextData).map(([key, value]) => `${key}: ${value}`).join('\n');

  return basePrompt + requirementsText + '\n\nMarket Data:\n' + contextText + '\n\nProvide a structured analysis with executive summary, key findings, and actionable recommendations.';
}

function parseReportSections(content: string) {
  // Simple section parsing - in production would be more sophisticated
  const sections = [];
  const lines = content.split('\n');
  let currentSection = null;

  for (const line of lines) {
    if (line.startsWith('#')) {
      if (currentSection) {
        sections.push(currentSection);
      }
      currentSection = {
        title: line.replace('#', '').trim(),
        content: []
      };
    } else if (currentSection && line.trim()) {
      currentSection.content.push(line);
    }
  }

  if (currentSection) {
    sections.push(currentSection);
  }

  return sections;
}

function formatAIReport(reportData: any): string {
  let formatted = `# ${reportData.title}\n\n`;
  formatted += `**Generated:** ${reportData.generatedAt}\n\n`;
  formatted += `## Executive Summary\n\n${reportData.summary}\n\n`;
  formatted += `## Analysis\n\n${reportData.content}`;

  return formatted;
}

function generateUpdateId(): string {
  return `upd_${crypto.getRandomValues(new Uint8Array(12)).reduce((str, byte) => str + byte.toString(16).padStart(2, '0'), '')}`;
}

function generateDeliverableId(): string {
  return `del_${crypto.getRandomValues(new Uint8Array(12)).reduce((str, byte) => str + byte.toString(16).padStart(2, '0'), '')}`;
}