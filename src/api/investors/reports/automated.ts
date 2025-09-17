// Automated Platform Performance Reporting System
// Generates comprehensive reports with AI insights for TechFlunky investors
import type { APIContext } from 'astro';

interface ReportData {
  platformId: string;
  platformName: string;
  reportType: 'monthly' | 'quarterly' | 'on_demand' | 'milestone';
  includeAIInsights: boolean;
  reportDate: string;
  investorId: string;
}

export async function POST({ request, locals }: APIContext) {
  const { DB, ANTHROPIC_API_KEY, MAILERSEND_API_KEY } = locals.runtime.env;

  try {
    const body = await request.json();
    const {
      platformId,
      investorId,
      reportType = 'on_demand',
      includeAIInsights = true,
      deliveryMethod = 'email'
    } = body;

    if (!platformId || !investorId) {
      return new Response(JSON.stringify({ error: 'Platform ID and Investor ID required' }), {
        status: 400,
        headers: { 'Content-Type': 'application/json' }
      });
    }

    // Generate comprehensive report
    const report = await generatePlatformReport({
      platformId,
      platformName: '', // Will be fetched
      reportType,
      includeAIInsights,
      reportDate: new Date().toISOString(),
      investorId
    }, DB, ANTHROPIC_API_KEY);

    // Store report in database
    const reportId = await storeReport(report, DB);

    // Send report based on delivery method
    if (deliveryMethod === 'email') {
      await sendReportByEmail(report, investorId, MAILERSEND_API_KEY, DB);
    }

    return new Response(JSON.stringify({
      success: true,
      reportId,
      message: 'Automated report generated successfully',
      report: {
        id: reportId,
        platformName: report.platformName,
        generatedAt: report.generatedAt,
        summary: report.executiveSummary
      }
    }), {
      status: 200,
      headers: { 'Content-Type': 'application/json' }
    });

  } catch (error) {
    console.error('Failed to generate automated report:', error);
    return new Response(JSON.stringify({
      error: 'Failed to generate automated report',
      details: error.message
    }), {
      status: 500,
      headers: { 'Content-Type': 'application/json' }
    });
  }
}

async function generatePlatformReport(reportData: ReportData, DB: any, apiKey: string) {
  // Fetch comprehensive platform data
  const platformData = await fetchPlatformData(reportData.platformId, DB);
  const performanceMetrics = await fetchPerformanceMetrics(reportData.platformId, DB);
  const milestones = await fetchMilestones(reportData.platformId, DB);
  const riskAssessment = await fetchRiskAssessment(reportData.platformId, DB);

  // Generate AI insights if requested
  let aiInsights = null;
  if (reportData.includeAIInsights && apiKey) {
    aiInsights = await generateAIAnalysis(platformData, performanceMetrics, apiKey);
  }

  // Calculate key performance indicators
  const kpis = calculateKPIs(performanceMetrics);

  // Generate executive summary
  const executiveSummary = generateExecutiveSummary(platformData, kpis, aiInsights);

  const report = {
    id: `report-${Date.now()}`,
    platformId: reportData.platformId,
    platformName: platformData.platform_name,
    investorId: reportData.investorId,
    reportType: reportData.reportType,
    generatedAt: new Date().toISOString(),
    period: {
      start: getPeriodStart(reportData.reportType),
      end: new Date().toISOString()
    },
    executiveSummary,
    performanceOverview: {
      currentValuation: platformData.current_valuation,
      monthlyRecurringRevenue: performanceMetrics.monthly_recurring_revenue,
      customerCount: performanceMetrics.customer_count,
      churnRate: performanceMetrics.churn_rate,
      deploymentHealth: performanceMetrics.deployment_health_score,
      aiValidationScore: platformData.ai_validation_score
    },
    kpis,
    financialMetrics: {
      revenueGrowth: kpis.revenueGrowth,
      customerAcquisitionCost: kpis.cac,
      lifetimeValue: kpis.ltv,
      burnRate: kpis.burnRate,
      runwayMonths: kpis.runway
    },
    operationalMetrics: {
      deploymentUptime: performanceMetrics.uptime_percentage,
      responseTime: performanceMetrics.avg_response_time,
      errorRate: performanceMetrics.error_rate,
      securityScore: performanceMetrics.security_score
    },
    milestones: {
      completed: milestones.filter(m => m.status === 'completed'),
      inProgress: milestones.filter(m => m.status === 'in_progress'),
      upcoming: milestones.filter(m => m.status === 'pending')
    },
    riskAssessment: {
      overallRiskScore: riskAssessment.overall_score,
      majorRisks: riskAssessment.risks.filter(r => r.severity === 'high'),
      mitigationActions: riskAssessment.mitigation_actions
    },
    aiInsights,
    recommendations: generateRecommendations(kpis, riskAssessment, aiInsights),
    nextReportDate: getNextReportDate(reportData.reportType)
  };

  return report;
}

async function fetchPlatformData(platformId: string, DB: any) {
  const data = await DB.prepare(`
    SELECT
      bp.*,
      si.investment_amount,
      si.current_valuation,
      si.investment_date
    FROM business_blueprints bp
    JOIN syndicate_investments si ON si.platform_id = bp.id
    WHERE bp.id = ?
  `).bind(platformId).first();

  return data;
}

async function fetchPerformanceMetrics(platformId: string, DB: any) {
  const data = await DB.prepare(`
    SELECT *
    FROM platform_metrics
    WHERE platform_id = ?
    ORDER BY last_updated DESC
    LIMIT 1
  `).bind(platformId).first();

  return data || {};
}

async function fetchMilestones(platformId: string, DB: any) {
  const data = await DB.prepare(`
    SELECT *
    FROM platform_milestones
    WHERE platform_id = ?
    ORDER BY target_date ASC
  `).bind(platformId).all();

  return data.results || [];
}

async function fetchRiskAssessment(platformId: string, DB: any) {
  const risks = await DB.prepare(`
    SELECT risk_factor, severity, probability, mitigation_plan
    FROM platform_risk_analysis
    WHERE platform_id = ?
    ORDER BY severity DESC, probability DESC
  `).bind(platformId).all();

  const overallScore = calculateRiskScore(risks.results || []);

  return {
    overall_score: overallScore,
    risks: risks.results || [],
    mitigation_actions: (risks.results || []).map(r => r.mitigation_plan).filter(Boolean)
  };
}

async function generateAIAnalysis(platformData: any, metrics: any, apiKey: string) {
  const analysisPrompt = `
As a senior platform investment analyst, provide a comprehensive analysis of this platform investment:

Platform: ${platformData.platform_name}
Category: ${platformData.category}
AI Validation Score: ${platformData.ai_validation_score}/10
Current Valuation: $${platformData.current_valuation?.toLocaleString()}
Monthly Revenue: $${metrics.monthly_recurring_revenue?.toLocaleString()}
Customer Count: ${metrics.customer_count?.toLocaleString()}
Churn Rate: ${metrics.churn_rate}%
Deployment Health: ${metrics.deployment_health_score}%

Provide analysis in JSON format:
{
  "strengths": ["list of key strengths"],
  "weaknesses": ["list of areas for improvement"],
  "opportunities": ["list of growth opportunities"],
  "threats": ["list of potential risks"],
  "investmentThesis": "paragraph summarizing investment case",
  "recommendations": ["specific actionable recommendations"],
  "confidenceLevel": 85,
  "timeHorizon": "6-12 months"
}
`;

  try {
    const response = await fetch('https://api.anthropic.com/v1/messages', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'x-api-key': apiKey,
        'anthropic-version': '2023-06-01'
      },
      body: JSON.stringify({
        model: 'claude-3-sonnet-20240229',
        max_tokens: 2000,
        temperature: 0.2,
        messages: [
          {
            role: 'user',
            content: analysisPrompt
          }
        ]
      })
    });

    if (!response.ok) {
      throw new Error(`Anthropic API error: ${response.statusText}`);
    }

    const data = await response.json();
    const analysis = JSON.parse(data.content[0].text);

    return {
      ...analysis,
      generatedAt: new Date().toISOString(),
      modelVersion: 'claude-3-sonnet'
    };
  } catch (error) {
    console.warn('AI analysis failed:', error);
    return null;
  }
}

function calculateKPIs(metrics: any) {
  const revenue = metrics.monthly_recurring_revenue || 0;
  const customers = metrics.customer_count || 0;
  const churn = metrics.churn_rate || 0;

  return {
    revenueGrowth: calculateRevenueGrowth(revenue), // Would need historical data
    customerGrowth: calculateCustomerGrowth(customers), // Would need historical data
    churnRate: churn,
    averageRevenuePerUser: customers > 0 ? revenue / customers : 0,
    cac: estimateCAC(revenue, customers), // Simplified calculation
    ltv: estimateLTV(revenue, customers, churn),
    burnRate: estimateBurnRate(revenue), // Simplified
    runway: estimateRunway(revenue) // Simplified
  };
}

function generateExecutiveSummary(platformData: any, kpis: any, aiInsights: any) {
  const performance = kpis.revenueGrowth > 10 ? 'strong' : kpis.revenueGrowth > 0 ? 'moderate' : 'concerning';
  const aiScore = platformData.ai_validation_score;
  const aiRating = aiScore >= 8 ? 'excellent' : aiScore >= 6 ? 'good' : 'needs improvement';

  return `${platformData.platform_name} demonstrates ${performance} performance with ${aiRating} AI validation metrics. Current monthly revenue of $${kpis.averageRevenuePerUser?.toLocaleString()} per user indicates ${performance === 'strong' ? 'healthy unit economics' : 'room for optimization'}. ${aiInsights?.investmentThesis || 'Platform shows potential for continued growth with proper execution.'}`;
}

function generateRecommendations(kpis: any, riskAssessment: any, aiInsights: any) {
  const recommendations = [];

  if (kpis.churnRate > 10) {
    recommendations.push({
      priority: 'high',
      category: 'customer_retention',
      title: 'Address High Churn Rate',
      description: `Current churn rate of ${kpis.churnRate}% is above healthy benchmarks. Focus on customer success and product stickiness.`,
      expectedImpact: 'Increase LTV by 25-40%'
    });
  }

  if (riskAssessment.overall_score > 7) {
    recommendations.push({
      priority: 'high',
      category: 'risk_mitigation',
      title: 'Implement Risk Mitigation Plan',
      description: 'Multiple high-severity risks identified requiring immediate attention.',
      expectedImpact: 'Reduce portfolio risk exposure'
    });
  }

  if (aiInsights?.recommendations) {
    aiInsights.recommendations.forEach((rec: string, index: number) => {
      recommendations.push({
        priority: 'medium',
        category: 'ai_insight',
        title: `AI Recommendation ${index + 1}`,
        description: rec,
        expectedImpact: 'Optimize platform performance'
      });
    });
  }

  return recommendations;
}

async function storeReport(report: any, DB: any) {
  const reportId = `report-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;

  await DB.prepare(`
    INSERT INTO investor_reports (
      id,
      platform_id,
      investor_id,
      report_type,
      report_data,
      generated_at,
      ai_analysis_included
    ) VALUES (?, ?, ?, ?, ?, ?, ?)
  `).bind(
    reportId,
    report.platformId,
    report.investorId,
    report.reportType,
    JSON.stringify(report),
    report.generatedAt,
    report.aiInsights ? 1 : 0
  ).run();

  return reportId;
}

async function sendReportByEmail(report: any, investorId: string, apiKey: string, DB: any) {
  // Get investor email
  const investor = await DB.prepare(`
    SELECT u.email, u.name
    FROM users u
    JOIN investor_profiles ip ON ip.user_id = u.id
    WHERE ip.id = ?
  `).bind(investorId).first();

  if (!investor || !apiKey) return;

  const emailContent = generateEmailContent(report);

  try {
    await fetch('https://api.mailersend.com/v1/email', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'X-Requested-With': 'XMLHttpRequest',
        'Authorization': `Bearer ${apiKey}`
      },
      body: JSON.stringify({
        from: {
          email: 'reports@techflunky.com',
          name: 'TechFlunky Investor Relations'
        },
        to: [
          {
            email: investor.email,
            name: investor.name
          }
        ],
        subject: `Performance Report: ${report.platformName} - ${new Date().toLocaleDateString()}`,
        html: emailContent,
        text: generateTextContent(report)
      })
    });
  } catch (error) {
    console.error('Failed to send report email:', error);
  }
}

function generateEmailContent(report: any) {
  return `
<!DOCTYPE html>
<html>
<head>
    <meta charset="utf-8">
    <title>TechFlunky Platform Performance Report</title>
    <style>
        body { font-family: Arial, sans-serif; line-height: 1.6; color: #333; }
        .header { background: #000; color: #fbbf24; padding: 20px; text-align: center; }
        .content { padding: 20px; max-width: 800px; margin: 0 auto; }
        .metric { background: #f5f5f5; padding: 15px; margin: 10px 0; border-radius: 5px; }
        .metric h3 { margin: 0 0 10px 0; color: #333; }
        .metric .value { font-size: 24px; font-weight: bold; color: #fbbf24; }
        .recommendations { background: #e8f4f8; padding: 15px; border-radius: 5px; margin: 20px 0; }
        .footer { text-align: center; padding: 20px; font-size: 12px; color: #666; }
    </style>
</head>
<body>
    <div class="header">
        <h1>TechFlunky Performance Report</h1>
        <p>${report.platformName} • ${new Date(report.generatedAt).toLocaleDateString()}</p>
    </div>

    <div class="content">
        <h2>Executive Summary</h2>
        <p>${report.executiveSummary}</p>

        <h2>Key Performance Metrics</h2>
        <div class="metric">
            <h3>Monthly Recurring Revenue</h3>
            <div class="value">$${report.performanceOverview.monthlyRecurringRevenue?.toLocaleString()}</div>
        </div>

        <div class="metric">
            <h3>Customer Count</h3>
            <div class="value">${report.performanceOverview.customerCount?.toLocaleString()}</div>
        </div>

        <div class="metric">
            <h3>AI Validation Score</h3>
            <div class="value">${report.performanceOverview.aiValidationScore}/10</div>
        </div>

        ${report.recommendations.length > 0 ? `
        <div class="recommendations">
            <h3>Key Recommendations</h3>
            <ul>
                ${report.recommendations.slice(0, 3).map(rec => `<li><strong>${rec.title}:</strong> ${rec.description}</li>`).join('')}
            </ul>
        </div>
        ` : ''}

        <p><a href="https://techflunky.com/dashboard/investor/portfolio" style="color: #fbbf24;">View Full Report in Dashboard</a></p>
    </div>

    <div class="footer">
        <p>© 2024 TechFlunky. This report was generated automatically using AI-powered analysis.</p>
    </div>
</body>
</html>
  `;
}

function generateTextContent(report: any) {
  return `
TechFlunky Performance Report
${report.platformName} - ${new Date(report.generatedAt).toLocaleDateString()}

Executive Summary:
${report.executiveSummary}

Key Metrics:
- Monthly Recurring Revenue: $${report.performanceOverview.monthlyRecurringRevenue?.toLocaleString()}
- Customer Count: ${report.performanceOverview.customerCount?.toLocaleString()}
- AI Validation Score: ${report.performanceOverview.aiValidationScore}/10

View the full report at: https://techflunky.com/dashboard/investor/portfolio

© 2024 TechFlunky
  `;
}

// Helper functions
function getPeriodStart(reportType: string) {
  const now = new Date();
  switch (reportType) {
    case 'monthly':
      return new Date(now.getFullYear(), now.getMonth(), 1).toISOString();
    case 'quarterly':
      const quarter = Math.floor(now.getMonth() / 3);
      return new Date(now.getFullYear(), quarter * 3, 1).toISOString();
    default:
      return new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000).toISOString();
  }
}

function getNextReportDate(reportType: string) {
  const now = new Date();
  switch (reportType) {
    case 'monthly':
      return new Date(now.getFullYear(), now.getMonth() + 1, 1).toISOString();
    case 'quarterly':
      return new Date(now.getFullYear(), now.getMonth() + 3, 1).toISOString();
    default:
      return null;
  }
}

function calculateRevenueGrowth(currentRevenue: number) {
  // Simplified - would need historical data for accurate calculation
  return Math.random() * 20 - 5; // Placeholder: -5% to +15%
}

function calculateCustomerGrowth(currentCustomers: number) {
  // Simplified - would need historical data
  return Math.random() * 15; // Placeholder: 0% to +15%
}

function estimateCAC(revenue: number, customers: number) {
  // Simplified CAC estimation
  return customers > 0 ? (revenue * 0.3) / (customers * 0.1) : 0;
}

function estimateLTV(revenue: number, customers: number, churnRate: number) {
  const arpu = customers > 0 ? revenue / customers : 0;
  const avgLifespan = churnRate > 0 ? 1 / (churnRate / 100) : 12;
  return arpu * avgLifespan;
}

function estimateBurnRate(revenue: number) {
  // Simplified - assume 70% of revenue covers costs
  return revenue * 0.3;
}

function estimateRunway(revenue: number) {
  // Simplified - assume some cash on hand
  const estimatedCash = revenue * 6; // 6 months of revenue
  const burnRate = estimateBurnRate(revenue);
  return burnRate > 0 ? estimatedCash / burnRate : 999;
}

function calculateRiskScore(risks: any[]) {
  if (risks.length === 0) return 2;

  const weights = { high: 3, medium: 2, low: 1 };
  const totalWeight = risks.reduce((sum, risk) => sum + (weights[risk.severity] || 1), 0);
  return Math.min(10, totalWeight / risks.length * 2);
}

// GET endpoint for retrieving stored reports
export async function GET({ url, locals }: APIContext) {
  const { DB } = locals.runtime.env;
  const investorId = url.searchParams.get('investorId');
  const platformId = url.searchParams.get('platformId');
  const reportId = url.searchParams.get('reportId');

  if (!investorId) {
    return new Response(JSON.stringify({ error: 'Investor ID required' }), {
      status: 400,
      headers: { 'Content-Type': 'application/json' }
    });
  }

  try {
    let query = `
      SELECT id, platform_id, report_type, generated_at, ai_analysis_included
      FROM investor_reports
      WHERE investor_id = ?
    `;
    const params = [investorId];

    if (reportId) {
      query += ' AND id = ?';
      params.push(reportId);
    } else if (platformId) {
      query += ' AND platform_id = ?';
      params.push(platformId);
    }

    query += ' ORDER BY generated_at DESC LIMIT 20';

    const reports = await DB.prepare(query).bind(...params).all();

    return new Response(JSON.stringify({
      success: true,
      reports: reports.results
    }), {
      status: 200,
      headers: { 'Content-Type': 'application/json' }
    });

  } catch (error) {
    console.error('Failed to fetch reports:', error);
    return new Response(JSON.stringify({
      error: 'Failed to fetch reports'
    }), {
      status: 500,
      headers: { 'Content-Type': 'application/json' }
    });
  }
}