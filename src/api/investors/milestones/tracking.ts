// Milestone Tracking and Achievement Notifications API
// Enables investors to track platform milestones and receive progress notifications
import type { APIContext } from 'astro';

export async function GET({ url, locals }: APIContext) {
  const { DB } = locals.runtime.env;
  const investorId = url.searchParams.get('investorId');
  const platformId = url.searchParams.get('platformId');
  const status = url.searchParams.get('status') || 'all';

  if (!investorId) {
    return new Response(JSON.stringify({ error: 'Investor ID required' }), {
      status: 400,
      headers: { 'Content-Type': 'application/json' }
    });
  }

  try {
    const milestones = await getMilestones(investorId, platformId, status, DB);
    const achievements = await getRecentAchievements(investorId, DB);
    const upcomingDeadlines = await getUpcomingDeadlines(investorId, DB);

    return new Response(JSON.stringify({
      success: true,
      milestones,
      achievements,
      upcomingDeadlines,
      summary: {
        totalMilestones: milestones.length,
        completedCount: milestones.filter(m => m.status === 'completed').length,
        inProgressCount: milestones.filter(m => m.status === 'in_progress').length,
        overdueCount: milestones.filter(m => m.isOverdue).length
      }
    }), {
      status: 200,
      headers: { 'Content-Type': 'application/json' }
    });

  } catch (error) {
    console.error('Failed to fetch milestone data:', error);
    return new Response(JSON.stringify({
      error: 'Failed to fetch milestone data',
      details: error.message
    }), {
      status: 500,
      headers: { 'Content-Type': 'application/json' }
    });
  }
}

async function getMilestones(investorId: string, platformId: string | null, status: string, DB: any) {
  let query = `
    SELECT
      pm.id,
      pm.platform_id,
      pm.title,
      pm.description,
      pm.target_date,
      pm.completion_date,
      pm.status,
      pm.impact_level,
      pm.progress_percent,
      pm.category,
      pm.created_at,
      pm.updated_at,
      bp.platform_name,
      bp.category as platform_category,
      si.investment_amount,
      si.current_valuation,
      CASE
        WHEN pm.target_date < date('now') AND pm.status != 'completed' THEN 1
        ELSE 0
      END as is_overdue
    FROM platform_milestones pm
    JOIN business_blueprints bp ON pm.platform_id = bp.id
    JOIN syndicate_investments si ON si.platform_id = bp.id
    WHERE si.investor_id = ? AND si.status = 'active'
  `;

  const params = [investorId];

  if (platformId) {
    query += ` AND pm.platform_id = ?`;
    params.push(platformId);
  }

  if (status !== 'all') {
    query += ` AND pm.status = ?`;
    params.push(status);
  }

  query += ` ORDER BY pm.target_date ASC, pm.impact_level DESC`;

  const result = await DB.prepare(query).bind(...params).all();

  return result.results.map((milestone: any) => ({
    id: milestone.id,
    platformId: milestone.platform_id,
    platformName: milestone.platform_name,
    platformCategory: milestone.platform_category,
    title: milestone.title,
    description: milestone.description,
    targetDate: milestone.target_date,
    completionDate: milestone.completion_date,
    status: milestone.status,
    impactLevel: milestone.impact_level,
    progressPercent: milestone.progress_percent,
    category: milestone.category,
    isOverdue: milestone.is_overdue === 1,
    investmentAmount: milestone.investment_amount,
    currentValuation: milestone.current_valuation,
    createdAt: milestone.created_at,
    updatedAt: milestone.updated_at
  }));
}

async function getRecentAchievements(investorId: string, DB: any) {
  const achievements = await DB.prepare(`
    SELECT
      pm.id,
      pm.platform_id,
      pm.title,
      pm.completion_date,
      pm.impact_level,
      bp.platform_name,
      si.investment_amount
    FROM platform_milestones pm
    JOIN business_blueprints bp ON pm.platform_id = bp.id
    JOIN syndicate_investments si ON si.platform_id = bp.id
    WHERE si.investor_id = ?
      AND pm.status = 'completed'
      AND pm.completion_date >= date('now', '-30 days')
    ORDER BY pm.completion_date DESC
    LIMIT 10
  `).bind(investorId).all();

  return achievements.results.map((achievement: any) => ({
    id: achievement.id,
    platformId: achievement.platform_id,
    platformName: achievement.platform_name,
    title: achievement.title,
    completionDate: achievement.completion_date,
    impactLevel: achievement.impact_level,
    investmentAmount: achievement.investment_amount
  }));
}

async function getUpcomingDeadlines(investorId: string, DB: any) {
  const deadlines = await DB.prepare(`
    SELECT
      pm.id,
      pm.platform_id,
      pm.title,
      pm.target_date,
      pm.status,
      pm.impact_level,
      bp.platform_name,
      si.investment_amount,
      julianday(pm.target_date) - julianday('now') as days_until_due
    FROM platform_milestones pm
    JOIN business_blueprints bp ON pm.platform_id = bp.id
    JOIN syndicate_investments si ON si.platform_id = bp.id
    WHERE si.investor_id = ?
      AND pm.status IN ('pending', 'in_progress')
      AND pm.target_date >= date('now')
      AND pm.target_date <= date('now', '+30 days')
    ORDER BY pm.target_date ASC
    LIMIT 5
  `).bind(investorId).all();

  return deadlines.results.map((deadline: any) => ({
    id: deadline.id,
    platformId: deadline.platform_id,
    platformName: deadline.platform_name,
    title: deadline.title,
    targetDate: deadline.target_date,
    status: deadline.status,
    impactLevel: deadline.impact_level,
    investmentAmount: deadline.investment_amount,
    daysUntilDue: Math.ceil(deadline.days_until_due)
  }));
}

export async function POST({ request, locals }: APIContext) {
  const { DB, MAILERSEND_API_KEY } = locals.runtime.env;

  try {
    const body = await request.json();
    const { action } = body;

    switch (action) {
      case 'update_milestone':
        return await updateMilestone(body, DB);
      case 'create_milestone':
        return await createMilestone(body, DB);
      case 'subscribe_notifications':
        return await subscribeToNotifications(body, DB);
      case 'mark_notification_read':
        return await markNotificationRead(body, DB);
      case 'trigger_achievement_check':
        return await triggerAchievementCheck(body, DB, MAILERSEND_API_KEY);
      default:
        return new Response(JSON.stringify({ error: 'Invalid action' }), {
          status: 400,
          headers: { 'Content-Type': 'application/json' }
        });
    }
  } catch (error) {
    console.error('Milestone tracking error:', error);
    return new Response(JSON.stringify({
      error: 'Failed to process milestone request',
      details: error.message
    }), {
      status: 500,
      headers: { 'Content-Type': 'application/json' }
    });
  }
}

async function updateMilestone(data: any, DB: any) {
  const { milestoneId, investorId, progressPercent, status, notes } = data;

  const milestone = await DB.prepare(`
    SELECT pm.*, bp.platform_name
    FROM platform_milestones pm
    JOIN business_blueprints bp ON pm.platform_id = bp.id
    JOIN syndicate_investments si ON si.platform_id = bp.id
    WHERE pm.id = ? AND si.investor_id = ?
  `).bind(milestoneId, investorId).first();

  if (!milestone) {
    return new Response(JSON.stringify({ error: 'Milestone not found or access denied' }), {
      status: 404,
      headers: { 'Content-Type': 'application/json' }
    });
  }

  const completionDate = status === 'completed' ? new Date().toISOString() : null;

  await DB.prepare(`
    UPDATE platform_milestones
    SET
      progress_percent = ?,
      status = ?,
      completion_date = ?,
      updated_at = ?
    WHERE id = ?
  `).bind(
    progressPercent,
    status,
    completionDate,
    new Date().toISOString(),
    milestoneId
  ).run();

  if (notes) {
    await DB.prepare(`
      INSERT INTO milestone_notes (
        milestone_id,
        investor_id,
        note,
        created_at
      ) VALUES (?, ?, ?, ?)
    `).bind(
      milestoneId,
      investorId,
      notes,
      new Date().toISOString()
    ).run();
  }

  if (status === 'completed') {
    await createAchievementNotification(milestone, investorId, DB);
  }

  return new Response(JSON.stringify({
    success: true,
    message: 'Milestone updated successfully'
  }), {
    status: 200,
    headers: { 'Content-Type': 'application/json' }
  });
}

async function createMilestone(data: any, DB: any) {
  const {
    platformId,
    investorId,
    title,
    description,
    targetDate,
    impactLevel,
    category
  } = data;

  const milestoneId = `mil_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;

  await DB.prepare(`
    INSERT INTO platform_milestones (
      id,
      platform_id,
      title,
      description,
      target_date,
      status,
      impact_level,
      category,
      progress_percent,
      created_at,
      updated_at
    ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
  `).bind(
    milestoneId,
    platformId,
    title,
    description,
    targetDate,
    'pending',
    impactLevel,
    category,
    0,
    new Date().toISOString(),
    new Date().toISOString()
  ).run();

  return new Response(JSON.stringify({
    success: true,
    milestoneId,
    message: 'Milestone created successfully'
  }), {
    status: 201,
    headers: { 'Content-Type': 'application/json' }
  });
}

async function subscribeToNotifications(data: any, DB: any) {
  const { investorId, platformId, notificationTypes } = data;

  await DB.prepare(`
    INSERT OR REPLACE INTO notification_preferences (
      investor_id,
      platform_id,
      milestone_updates,
      achievement_alerts,
      deadline_reminders,
      weekly_summaries,
      created_at,
      updated_at
    ) VALUES (?, ?, ?, ?, ?, ?, ?, ?)
  `).bind(
    investorId,
    platformId,
    notificationTypes.includes('milestone_updates') ? 1 : 0,
    notificationTypes.includes('achievement_alerts') ? 1 : 0,
    notificationTypes.includes('deadline_reminders') ? 1 : 0,
    notificationTypes.includes('weekly_summaries') ? 1 : 0,
    new Date().toISOString(),
    new Date().toISOString()
  ).run();

  return new Response(JSON.stringify({
    success: true,
    message: 'Notification preferences updated'
  }), {
    status: 200,
    headers: { 'Content-Type': 'application/json' }
  });
}

async function markNotificationRead(data: any, DB: any) {
  const { notificationId, investorId } = data;

  await DB.prepare(`
    UPDATE investor_notifications
    SET read_at = ?
    WHERE id = ? AND investor_id = ?
  `).bind(
    new Date().toISOString(),
    notificationId,
    investorId
  ).run();

  return new Response(JSON.stringify({
    success: true,
    message: 'Notification marked as read'
  }), {
    status: 200,
    headers: { 'Content-Type': 'application/json' }
  });
}

async function createAchievementNotification(milestone: any, investorId: string, DB: any) {
  const notificationId = `not_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;

  await DB.prepare(`
    INSERT INTO investor_notifications (
      id,
      investor_id,
      type,
      title,
      message,
      platform_id,
      milestone_id,
      priority,
      created_at
    ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
  `).bind(
    notificationId,
    investorId,
    'achievement',
    'Milestone Achieved! 🎉',
    `${milestone.platform_name} has completed: ${milestone.title}`,
    milestone.platform_id,
    milestone.id,
    milestone.impact_level === 'high' ? 'high' : 'normal',
    new Date().toISOString()
  ).run();

  return notificationId;
}

async function triggerAchievementCheck(data: any, DB: any, MAILERSEND_API_KEY: string) {
  const { investorId } = data;

  const completedMilestones = await DB.prepare(`
    SELECT
      pm.*,
      bp.platform_name,
      si.investment_amount
    FROM platform_milestones pm
    JOIN business_blueprints bp ON pm.platform_id = bp.id
    JOIN syndicate_investments si ON si.platform_id = bp.id
    WHERE si.investor_id = ?
      AND pm.status = 'completed'
      AND pm.completion_date >= date('now', '-7 days')
    ORDER BY pm.completion_date DESC
  `).bind(investorId).all();

  const investor = await DB.prepare(`
    SELECT email, name FROM investor_profiles WHERE user_id = ?
  `).bind(investorId).first();

  if (completedMilestones.results.length > 0 && investor && MAILERSEND_API_KEY) {
    await sendAchievementSummaryEmail(
      investor,
      completedMilestones.results,
      MAILERSEND_API_KEY
    );
  }

  return new Response(JSON.stringify({
    success: true,
    achievementsFound: completedMilestones.results.length,
    message: 'Achievement check completed'
  }), {
    status: 200,
    headers: { 'Content-Type': 'application/json' }
  });
}

async function sendAchievementSummaryEmail(investor: any, achievements: any[], apiKey: string) {
  const emailHTML = `
    <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
      <h2 style="color: #4f46e5;">🎉 Weekly Achievement Summary</h2>

      <p>Hello ${investor.name},</p>

      <p>Great news! Your portfolio platforms have achieved ${achievements.length} milestone${achievements.length > 1 ? 's' : ''} this week:</p>

      <div style="background: #f8fafc; padding: 20px; border-radius: 8px; margin: 20px 0;">
        ${achievements.map(achievement => `
          <div style="margin-bottom: 15px; padding-bottom: 15px; border-bottom: 1px solid #e2e8f0;">
            <h3 style="color: #1e293b; margin: 0 0 5px 0;">${achievement.platform_name}</h3>
            <p style="color: #475569; margin: 0 0 5px 0;"><strong>${achievement.title}</strong></p>
            <p style="color: #64748b; margin: 0; font-size: 14px;">${achievement.description}</p>
            <span style="display: inline-block; background: #10b981; color: white; padding: 2px 8px; border-radius: 4px; font-size: 12px; margin-top: 5px;">
              ${achievement.impact_level.toUpperCase()} IMPACT
            </span>
          </div>
        `).join('')}
      </div>

      <p>These achievements represent strong progress across your investment portfolio. Keep monitoring your platforms through the TechFlunky investor portal.</p>

      <p style="margin-top: 30px; color: #64748b; font-size: 14px;">
        Best regards,<br>
        The TechFlunky Team
      </p>
    </div>
  `;

  try {
    const response = await fetch('https://api.mailersend.com/v1/email', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${apiKey}`,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        from: {
          email: 'notifications@techflunky.com',
          name: 'TechFlunky Notifications'
        },
        to: [{
          email: investor.email,
          name: investor.name
        }],
        subject: `🎉 ${achievements.length} New Achievement${achievements.length > 1 ? 's' : ''} in Your Portfolio`,
        html: emailHTML
      })
    });

    return response.ok;
  } catch (error) {
    console.error('Failed to send achievement email:', error);
    return false;
  }
}