// Cloudflare Workers Cron Jobs - Background Automation
// This handles all automated tasks for TechFlunky.com

import { processAIValidation } from '../api/services/validation';
import { expireOldBoosts } from '../api/services/boosts';
import { processAffiliatePayout } from '../api/services/affiliates';

export default {
  async scheduled(event: ScheduledEvent, env: any, ctx: ExecutionContext): Promise<void> {
    console.log(`Cron job triggered: ${event.cron}`);

    switch (event.cron) {
      // Every 15 minutes - Process AI analysis queue
      case '*/15 * * * *':
        await processAIAnalysisQueue(env);
        break;

      // Every hour - Expire old boosts and clean up
      case '0 * * * *':
        await hourlyTasks(env);
        break;

      // Daily at 9 AM UTC - Send digest emails and analytics
      case '0 9 * * *':
        await dailyTasks(env);
        break;

      // Weekly on Mondays - Process affiliate payouts
      case '0 0 * * 1':
        await weeklyTasks(env);
        break;

      // Monthly on 1st - Generate reports and invoices
      case '0 0 1 * *':
        await monthlyTasks(env);
        break;
    }
  }
};

// Process pending AI validations
async function processAIAnalysisQueue(env: any) {
  const { DB } = env;

  try {
    // Get pending AI analysis requests (max 5 per batch to avoid timeouts)
    const pendingAnalyses = await DB.prepare(`
      SELECT * FROM ai_analysis_queue 
      WHERE status = 'pending' 
      ORDER BY created_at ASC 
      LIMIT 5
    `).all();

    for (const analysis of pendingAnalyses.results) {
      try {
        // Mark as processing
        await DB.prepare(`
          UPDATE ai_analysis_queue 
          SET status = 'processing' 
          WHERE id = ?
        `).bind(analysis.id).run();

        if (analysis.analysis_type === 'market_validation') {
          const inputData = JSON.parse(analysis.input_data);
          await processAIValidation(inputData.validation_request_id, env);
        }

        // Mark as completed
        await DB.prepare(`
          UPDATE ai_analysis_queue 
          SET status = 'completed', completed_at = unixepoch() 
          WHERE id = ?
        `).bind(analysis.id).run();

      } catch (error) {
        console.error(`Failed to process AI analysis ${analysis.id}:`, error);
        
        // Mark as failed
        await DB.prepare(`
          UPDATE ai_analysis_queue 
          SET status = 'failed' 
          WHERE id = ?
        `).bind(analysis.id).run();
      }
    }

    console.log(`Processed ${pendingAnalyses.results.length} AI analysis requests`);

  } catch (error) {
    console.error('Error processing AI analysis queue:', error);
  }
}

// Hourly maintenance tasks
async function hourlyTasks(env: any) {
  const { DB } = env;

  try {
    // Expire old listing boosts
    await expireOldBoosts(env);

    // Clean up expired offers
    await DB.prepare(`
      UPDATE offers 
      SET status = 'expired' 
      WHERE status = 'pending' 
        AND created_at < (unixepoch() - 7 * 24 * 60 * 60)
    `).run();

    console.log('Hourly tasks completed');

  } catch (error) {
    console.error('Error in hourly tasks:', error);
  }
}

// Daily tasks
async function dailyTasks(env: any) {
  const { DB } = env;

  try {
    // Generate daily analytics summary
    const yesterday = Math.floor(Date.now() / 1000) - (24 * 60 * 60);
    
    const dailyStats = await DB.prepare(`
      SELECT 
        (SELECT COUNT(*) FROM users WHERE created_at >= ?) as new_users,
        (SELECT COUNT(*) FROM listings WHERE created_at >= ?) as new_listings,
        (SELECT SUM(platform_fee) FROM revenue_analytics WHERE created_at >= ?) as daily_revenue,
        (SELECT COUNT(*) FROM offers WHERE status = 'completed' AND created_at >= ?) as sales_count
    `).bind(yesterday, yesterday, yesterday, yesterday).first();

    // Clean up old notifications (older than 30 days)
    await DB.prepare(`
      DELETE FROM notifications 
      WHERE created_at < (unixepoch() - 30 * 24 * 60 * 60)
    `).run();

    console.log('Daily tasks completed');

  } catch (error) {
    console.error('Error in daily tasks:', error);
  }
}

// Weekly tasks
async function weeklyTasks(env: any) {
  const { DB } = env;

  try {
    // Process affiliate payouts for accounts with $100+ balance
    const affiliatesForPayout = await DB.prepare(`
      SELECT DISTINCT a.id 
      FROM affiliates a
      JOIN referrals r ON a.id = r.affiliate_id
      WHERE r.commission_paid = FALSE
      GROUP BY a.id
      HAVING SUM(r.commission_amount) >= 10000
    `).all();

    for (const affiliate of affiliatesForPayout.results) {
      try {
        await processAffiliatePayout(affiliate.id, env);
      } catch (error) {
        console.error(`Failed to process payout for affiliate ${affiliate.id}:`, error);
      }
    }

    console.log('Weekly tasks completed');

  } catch (error) {
    console.error('Error in weekly tasks:', error);
  }
}

// Monthly tasks
async function monthlyTasks(env: any) {
  const { DB } = env;

  try {
    // Archive old completed transactions
    const thirtyDaysAgo = Math.floor(Date.now() / 1000) - (30 * 24 * 60 * 60);
    
    await DB.prepare(`
      UPDATE offers 
      SET status = 'archived' 
      WHERE status = 'completed' 
        AND escrow_released_at < ?
    `).bind(thirtyDaysAgo).run();

    // Update user subscription statuses
    await DB.prepare(`
      UPDATE users 
      SET subscription_status = 'free' 
      WHERE subscription_status != 'free' 
        AND subscription_expires_at < unixepoch()
    `).run();

    console.log('Monthly tasks completed');

  } catch (error) {
    console.error('Error in monthly tasks:', error);
  }
}
