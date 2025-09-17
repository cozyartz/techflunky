export interface Env {
  STATUS_KV: KVNamespace;
}

interface SystemStatus {
  status: 'operational' | 'degraded' | 'outage';
  lastUpdated: string;
  uptime: number;
}

interface Component {
  id: string;
  name: string;
  status: 'operational' | 'degraded' | 'outage';
  description: string;
  lastUpdated: string;
}

interface Incident {
  id: string;
  title: string;
  description: string;
  status: 'investigating' | 'identified' | 'monitoring' | 'resolved';
  impact: 'minor' | 'major' | 'critical';
  createdAt: string;
  updatedAt: string;
  updates: IncidentUpdate[];
}

interface IncidentUpdate {
  id: string;
  message: string;
  status: 'investigating' | 'identified' | 'monitoring' | 'resolved';
  timestamp: string;
}

interface Metric {
  id: string;
  name: string;
  value: number;
  unit: string;
  trend: 'up' | 'down' | 'stable';
  lastUpdated: string;
}

async function getSystemStatus(env: Env): Promise<SystemStatus> {
  const cached = await env.STATUS_KV.get('system_status');
  if (cached) {
    return JSON.parse(cached);
  }

  const status: SystemStatus = {
    status: 'operational',
    lastUpdated: new Date().toISOString(),
    uptime: 99.9
  };

  await env.STATUS_KV.put('system_status', JSON.stringify(status), { expirationTtl: 300 });
  return status;
}

async function getComponents(env: Env): Promise<Component[]> {
  const cached = await env.STATUS_KV.get('components');
  if (cached) {
    return JSON.parse(cached);
  }

  const components: Component[] = [
    {
      id: 'api',
      name: 'API',
      status: 'operational',
      description: 'Core API services',
      lastUpdated: new Date().toISOString()
    },
    {
      id: 'web',
      name: 'Website',
      status: 'operational',
      description: 'Main TechFlunky website',
      lastUpdated: new Date().toISOString()
    },
    {
      id: 'marketplace',
      name: 'Marketplace',
      status: 'operational',
      description: 'Business marketplace platform',
      lastUpdated: new Date().toISOString()
    },
    {
      id: 'auth',
      name: 'Authentication',
      status: 'operational',
      description: 'User authentication services',
      lastUpdated: new Date().toISOString()
    },
    {
      id: 'payments',
      name: 'Payment Processing',
      status: 'operational',
      description: 'Stripe payment integration',
      lastUpdated: new Date().toISOString()
    },
    {
      id: 'cdn',
      name: 'CDN',
      status: 'operational',
      description: 'Cloudflare CDN and edge services',
      lastUpdated: new Date().toISOString()
    }
  ];

  await env.STATUS_KV.put('components', JSON.stringify(components), { expirationTtl: 300 });
  return components;
}

async function getIncidents(env: Env): Promise<Incident[]> {
  const cached = await env.STATUS_KV.get('incidents');
  if (cached) {
    return JSON.parse(cached);
  }

  return [];
}

async function getMetrics(env: Env): Promise<Metric[]> {
  const cached = await env.STATUS_KV.get('metrics');
  if (cached) {
    return JSON.parse(cached);
  }

  const metrics: Metric[] = [
    {
      id: 'response_time',
      name: 'Response Time',
      value: 45,
      unit: 'ms',
      trend: 'stable',
      lastUpdated: new Date().toISOString()
    },
    {
      id: 'uptime',
      name: 'Uptime',
      value: 99.9,
      unit: '%',
      trend: 'stable',
      lastUpdated: new Date().toISOString()
    },
    {
      id: 'error_rate',
      name: 'Error Rate',
      value: 0.1,
      unit: '%',
      trend: 'down',
      lastUpdated: new Date().toISOString()
    }
  ];

  await env.STATUS_KV.put('metrics', JSON.stringify(metrics), { expirationTtl: 300 });
  return metrics;
}

async function getStatusHomePage(env: Env): Promise<string> {
  const systemStatus = await getSystemStatus(env);
  const components = await getComponents(env);
  const incidents = await getIncidents(env);
  const metrics = await getMetrics(env);

  const statusText = systemStatus.status === 'operational' ? 'All Systems Operational' :
                    systemStatus.status === 'degraded' ? 'Degraded Performance' : 'Service Outage';

  return `<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>TechFlunky Status</title>
    <link rel="icon" href="data:image/svg+xml,<svg xmlns='http://www.w3.org/2000/svg' width='24' height='24' viewBox='0 0 24 24' fill='none' stroke='%23fbbf24' stroke-width='2' stroke-linecap='round' stroke-linejoin='round'><polygon points='13 2 3 14 12 14 11 22 21 10 12 10 13 2'/></svg>">
    <style>
        * {
            margin: 0;
            padding: 0;
            box-sizing: border-box;
        }

        body {
            font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
            background: #000000;
            color: #ffffff;
            min-height: 100vh;
            line-height: 1.6;
        }

        .container {
            max-width: 1200px;
            margin: 0 auto;
            padding: 0 20px;
        }

        header {
            background: #111111;
            border-bottom: 2px solid #fbbf24;
            padding: 1.5rem 0;
        }

        .header-content {
            display: flex;
            justify-content: space-between;
            align-items: center;
        }

        .logo {
            font-size: 2rem;
            font-weight: bold;
            color: #fbbf24;
        }

        .subtitle {
            color: #cccccc;
            font-size: 1rem;
        }

        .hero {
            text-align: center;
            padding: 4rem 0;
            background: linear-gradient(135deg, #111111 0%, #222222 100%);
        }

        .hero h1 {
            font-size: 3.5rem;
            font-weight: bold;
            background: linear-gradient(135deg, #fbbf24, #f59e0b);
            -webkit-background-clip: text;
            -webkit-text-fill-color: transparent;
            background-clip: text;
            margin-bottom: 1rem;
        }

        .status-indicator {
            display: inline-flex;
            align-items: center;
            gap: 1rem;
            padding: 1.5rem 3rem;
            border-radius: 50px;
            font-size: 1.3rem;
            font-weight: 600;
            margin: 2rem 0;
            border: 2px solid;
        }

        .status-operational {
            background: #10b981;
            border-color: #10b981;
            color: #ffffff;
        }

        .status-degraded {
            background: #f59e0b;
            border-color: #f59e0b;
            color: #ffffff;
        }

        .status-outage {
            background: #ef4444;
            border-color: #ef4444;
            color: #ffffff;
        }

        .status-dot {
            width: 16px;
            height: 16px;
            border-radius: 50%;
            background: #ffffff;
            animation: pulse 2s infinite;
        }

        @keyframes pulse {
            0%, 100% { opacity: 1; }
            50% { opacity: 0.7; }
        }

        .description {
            color: #cccccc;
            font-size: 1.1rem;
            max-width: 600px;
            margin: 0 auto;
        }

        .grid {
            display: grid;
            gap: 2rem;
            margin: 3rem 0;
        }

        .two-col {
            grid-template-columns: 1fr 1fr;
        }

        .card {
            background: #222222;
            border: 2px solid #333333;
            border-radius: 15px;
            padding: 2rem;
            transition: all 0.3s ease;
        }

        .card:hover {
            border-color: #fbbf24;
            transform: translateY(-2px);
        }

        .card h2 {
            color: #fbbf24;
            font-size: 1.8rem;
            margin-bottom: 1.5rem;
            font-weight: 600;
            border-bottom: 2px solid #fbbf24;
            padding-bottom: 0.5rem;
        }

        .component {
            display: flex;
            justify-content: space-between;
            align-items: center;
            padding: 1.5rem;
            background: #333333;
            border-radius: 10px;
            margin-bottom: 1rem;
            border: 1px solid #444444;
        }

        .component:hover {
            background: #444444;
            border-color: #fbbf24;
        }

        .component-info h3 {
            color: #ffffff;
            font-weight: 600;
            font-size: 1.1rem;
            margin-bottom: 0.25rem;
        }

        .component-info p {
            color: #cccccc;
            font-size: 0.9rem;
        }

        .component-status {
            padding: 0.8rem 1.5rem;
            border-radius: 25px;
            font-size: 0.9rem;
            font-weight: 600;
            border: 2px solid;
        }

        .status-operational {
            background: #10b981;
            border-color: #10b981;
            color: #ffffff;
        }

        .status-degraded {
            background: #f59e0b;
            border-color: #f59e0b;
            color: #ffffff;
        }

        .status-outage {
            background: #ef4444;
            border-color: #ef4444;
            color: #ffffff;
        }

        .metric {
            text-align: center;
            padding: 2rem;
            background: #333333;
            border-radius: 10px;
            margin-bottom: 1rem;
            border: 1px solid #444444;
        }

        .metric:hover {
            background: #444444;
            border-color: #fbbf24;
        }

        .metric-value {
            font-size: 3rem;
            font-weight: bold;
            color: #fbbf24;
            margin-bottom: 0.5rem;
        }

        .metric-label {
            color: #cccccc;
            font-size: 1rem;
            font-weight: 500;
        }

        .no-incidents {
            text-align: center;
            padding: 3rem;
            color: #cccccc;
        }

        .no-incidents h3 {
            color: #10b981;
            margin-bottom: 1rem;
            font-size: 1.5rem;
        }

        .last-updated {
            text-align: center;
            color: #888888;
            font-size: 1rem;
            margin-top: 3rem;
            padding: 2rem 0;
            border-top: 2px solid #333333;
        }

        /* Icon Styles */
        .icon {
            display: inline-block;
            width: 1em;
            height: 1em;
            stroke-width: 2;
            stroke: currentColor;
            fill: none;
            vertical-align: middle;
        }

        .icon-lg {
            width: 1.5em;
            height: 1.5em;
        }

        .icon-xl {
            width: 2em;
            height: 2em;
        }

        .service-icon {
            width: 1.2em;
            height: 1.2em;
            margin-right: 0.5em;
            opacity: 0.8;
        }

        .status-icon {
            width: 1em;
            height: 1em;
            margin-right: 0.5em;
        }

        .metric-icon {
            width: 1.5em;
            height: 1.5em;
            margin-bottom: 0.5rem;
            opacity: 0.7;
        }

        @media (max-width: 768px) {
            .two-col {
                grid-template-columns: 1fr;
            }

            .hero h1 {
                font-size: 2.5rem;
            }

            .component {
                flex-direction: column;
                align-items: flex-start;
                gap: 1rem;
            }

            .component-status {
                align-self: flex-end;
            }
        }
    </style>
</head>
<body>
    <header>
        <div class="container">
            <div class="header-content">
                <div class="logo">TechFlunky</div>
                <div class="subtitle">System Status Dashboard</div>
            </div>
        </div>
    </header>

    <main class="container">
        <section class="hero">
            <h1>System Status</h1>
            <div class="status-indicator status-${systemStatus.status}">
                <svg class="icon icon-lg status-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
                    ${systemStatus.status === 'operational' ?
                        '<path d="M12 22c5.523 0 10-4.477 10-10S17.523 2 12 2 2 6.477 2 12s4.477 10 10 10z"/><path d="m9 12 2 2 4-4"/>' :
                        systemStatus.status === 'degraded' ?
                        '<path d="m21.73 18-8-14a2 2 0 0 0-3.48 0l-8 14A2 2 0 0 0 4 21h16a2 2 0 0 0 1.73-3Z"/><path d="M12 9v4"/><path d="m12 17 .01 0"/>' :
                        '<circle cx="12" cy="12" r="10"/><path d="m15 9-6 6"/><path d="m9 9 6 6"/>'
                    }
                </svg>
                ${statusText}
            </div>
            <div class="description">
                Monitor the real-time status of all TechFlunky services and infrastructure.
                This page is updated automatically during any service disruptions.
            </div>
        </section>

        <div class="grid two-col">
            <div class="card">
                <h2>Service Components</h2>
                ${components.map(component => {
                    const getServiceIcon = (id) => {
                        switch(id) {
                            case 'api':
                                return '<rect width="18" height="11" x="3" y="11" rx="2" ry="2"/><circle cx="12" cy="5" r="2"/><path d="m12 7-2 4 6.5 1z"/>';
                            case 'web':
                                return '<circle cx="12" cy="12" r="10"/><path d="m12 2 3 8.5L12 16l-3-5.5z"/>';
                            case 'marketplace':
                                return '<circle cx="8" cy="21" r="1"/><circle cx="19" cy="21" r="1"/><path d="M2.05 2.05h2l2.66 12.42a2 2 0 0 0 2 1.58h9.78a2 2 0 0 0 1.95-1.57L22 5H7"/><path d="m7 5 4 5h10"/>';
                            case 'auth':
                                return '<rect width="18" height="11" x="3" y="11" rx="2" ry="2"/><path d="m7 11V7a5 5 0 0 1 10 0v4"/>';
                            case 'payments':
                                return '<rect width="20" height="14" x="2" y="5" rx="2"/><path d="M2 10h20"/>';
                            case 'cdn':
                                return '<path d="M4 14.899A7 7 0 1 1 15.71 8h1.79a4.5 4.5 0 0 1 2.5 8.242"/><path d="m8 17 4-4 4 4"/>';
                            default:
                                return '<rect width="18" height="10" x="3" y="11" rx="2"/><circle cx="12" cy="5" r="2"/><path d="m12 7-2 4 6.5 1z"/>';
                        }
                    };

                    const getStatusIcon = (status) => {
                        switch(status) {
                            case 'operational':
                                return '<circle cx="12" cy="12" r="10"/><path d="m9 12 2 2 4-4"/>';
                            case 'degraded':
                                return '<path d="m21.73 18-8-14a2 2 0 0 0-3.48 0l-8 14A2 2 0 0 0 4 21h16a2 2 0 0 0 1.73-3Z"/><path d="M12 9v4"/><path d="m12 17 .01 0"/>';
                            case 'outage':
                                return '<circle cx="12" cy="12" r="10"/><path d="m15 9-6 6"/><path d="m9 9 6 6"/>';
                            default:
                                return '<circle cx="12" cy="12" r="10"/><path d="m9 12 2 2 4-4"/>';
                        }
                    };

                    return `
                    <div class="component">
                        <div class="component-info">
                            <h3>
                                <svg class="icon service-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
                                    ${getServiceIcon(component.id)}
                                </svg>
                                ${component.name}
                            </h3>
                            <p>${component.description}</p>
                        </div>
                        <div class="component-status status-${component.status}">
                            <svg class="icon status-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
                                ${getStatusIcon(component.status)}
                            </svg>
                            ${component.status.charAt(0).toUpperCase() + component.status.slice(1)}
                        </div>
                    </div>
                    `;
                }).join('')}
            </div>

            <div class="card">
                <h2>Performance Metrics</h2>
                ${metrics.map(metric => {
                    const getMetricIcon = (id) => {
                        switch(id) {
                            case 'response_time':
                                return '<polyline points="22,12 18,12 15,21 9,3 6,12 2,12"/>';
                            case 'uptime':
                                return '<circle cx="12" cy="12" r="10"/><polyline points="12,6 12,12 16,14"/>';
                            case 'error_rate':
                                return '<polyline points="23 6 13.5 15.5 8.5 10.5 1 18"/><polyline points="17 6 23 6 23 12"/>';
                            default:
                                return '<polyline points="22,12 18,12 15,21 9,3 6,12 2,12"/>';
                        }
                    };

                    return `
                    <div class="metric">
                        <svg class="icon metric-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
                            ${getMetricIcon(metric.id)}
                        </svg>
                        <div class="metric-value">${metric.value}${metric.unit}</div>
                        <div class="metric-label">${metric.name}</div>
                    </div>
                    `;
                }).join('')}
            </div>
        </div>

        ${incidents.length > 0 ? `
            <div class="card">
                <h2>Recent Incidents</h2>
                ${incidents.map(incident => `
                    <div class="incident">
                        <h3>${incident.title}</h3>
                        <p>${incident.description}</p>
                        <div class="incident-status">${incident.status}</div>
                    </div>
                `).join('')}
            </div>
        ` : `
            <div class="card">
                <h2>Recent Incidents</h2>
                <div class="no-incidents">
                    <svg class="icon icon-xl" style="color: #10b981; margin-bottom: 1rem;" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
                        <path d="M9 12l2 2 4-4"/>
                        <path d="M21 12c0 4.97-4.03 9-9 9s-9-4.03-9-9 4.03-9 9-9c2.12 0 4.06.74 5.59 1.98"/>
                        <path d="m16 3 4 4-4 4"/>
                    </svg>
                    <h3>No Recent Incidents</h3>
                    <p>All systems have been running smoothly with no reported issues.</p>
                </div>
            </div>
        `}

        <div class="last-updated">
            <strong>Last Updated:</strong> ${new Date(systemStatus.lastUpdated).toLocaleString()}
            <br>
            <span style="font-size: 0.9rem; color: #888888;">
                This page refreshes automatically every 5 minutes to provide the latest status information.
            </span>
        </div>
    </main>

    <script>
        // Auto-refresh every 5 minutes (300000ms) for live updates
        setTimeout(() => {
            window.location.reload();
        }, 300000);

        // Show loading indicator when refreshing
        window.addEventListener('beforeunload', function() {
            document.body.style.opacity = '0.8';
        });
    </script>
</body>
</html>`;
}

export default {
  async fetch(request: Request, env: Env, ctx: ExecutionContext): Promise<Response> {
    const url = new URL(request.url);
    const pathname = url.pathname;

    const headers = {
      'Content-Type': 'text/html; charset=utf-8',
      'Cache-Control': 'public, max-age=300',
      'Access-Control-Allow-Origin': '*',
      'Access-Control-Allow-Methods': 'GET, POST, OPTIONS',
      'Access-Control-Allow-Headers': 'Content-Type',
    };

    if (request.method === 'OPTIONS') {
      return new Response(null, { headers });
    }

    try {
      switch (pathname) {
        case '/':
          return new Response(await getStatusHomePage(env), { headers });

        case '/api/status':
          const apiHeaders = { ...headers, 'Content-Type': 'application/json' };
          return new Response(JSON.stringify(await getSystemStatus(env)), { headers: apiHeaders });

        case '/api/components':
          const componentHeaders = { ...headers, 'Content-Type': 'application/json' };
          return new Response(JSON.stringify(await getComponents(env)), { headers: componentHeaders });

        case '/api/metrics':
          const metricHeaders = { ...headers, 'Content-Type': 'application/json' };
          return new Response(JSON.stringify(await getMetrics(env)), { headers: metricHeaders });

        case '/api/incidents':
          const incidentHeaders = { ...headers, 'Content-Type': 'application/json' };
          return new Response(JSON.stringify(await getIncidents(env)), { headers: incidentHeaders });

        default:
          return new Response('Not Found', { status: 404, headers });
      }
    } catch (error) {
      console.error('Status page error:', error);
      return new Response('Internal Server Error', { status: 500, headers });
    }
  },
};

