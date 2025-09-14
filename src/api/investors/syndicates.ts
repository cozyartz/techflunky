// Investor Syndicates - Collaborative Deal Evaluation
import type { APIContext } from 'astro';

// Create or join investment syndicate
export async function POST({ request, locals }: APIContext) {
  const { DB } = locals.runtime.env;

  try {
    const {
      action, // 'create' or 'join'
      syndicateId,
      leadInvestorId,
      name,
      description,
      targetDeal,
      minimumInvestment,
      maximumInvestment,
      investorId
    } = await request.json();

    if (!action || !leadInvestorId) {
      return new Response(JSON.stringify({
        error: 'Action and lead investor ID required'
      }), {
        status: 400,
        headers: { 'Content-Type': 'application/json' }
      });
    }

    const now = Math.floor(Date.now() / 1000);

    if (action === 'create') {
      if (!name || !targetDeal) {
        return new Response(JSON.stringify({
          error: 'Syndicate name and target deal required'
        }), {
          status: 400,
          headers: { 'Content-Type': 'application/json' }
        });
      }

      const newSyndicateId = generateSyndicateId();

      // Create syndicate
      await DB.prepare(`
        INSERT INTO investment_syndicates
        (id, name, description, lead_investor_id, target_listing_id, minimum_investment, maximum_investment,
         status, created_at, updated_at)
        VALUES (?, ?, ?, ?, ?, ?, ?, 'active', ?, ?)
      `).bind(
        newSyndicateId,
        name,
        description || null,
        leadInvestorId,
        targetDeal,
        minimumInvestment || 0,
        maximumInvestment || null,
        now,
        now
      ).run();

      // Add lead investor as member
      await DB.prepare(`
        INSERT INTO syndicate_members
        (id, syndicate_id, investor_id, role, investment_committed, joined_at)
        VALUES (?, ?, ?, 'lead', ?, ?)
      `).bind(
        generateMemberId(),
        newSyndicateId,
        leadInvestorId,
        minimumInvestment || 0,
        now
      ).run();

      return new Response(JSON.stringify({
        success: true,
        syndicateId: newSyndicateId,
        message: 'Syndicate created successfully',
        inviteLink: `https://techflunky.io/syndicates/join/${newSyndicateId}`
      }), {
        headers: { 'Content-Type': 'application/json' }
      });

    } else if (action === 'join') {
      if (!syndicateId || !investorId) {
        return new Response(JSON.stringify({
          error: 'Syndicate ID and investor ID required'
        }), {
          status: 400,
          headers: { 'Content-Type': 'application/json' }
        });
      }

      // Verify syndicate exists and is active
      const syndicate = await DB.prepare(`
        SELECT * FROM investment_syndicates WHERE id = ? AND status = 'active'
      `).bind(syndicateId).first();

      if (!syndicate) {
        return new Response(JSON.stringify({
          error: 'Syndicate not found or inactive'
        }), {
          status: 404,
          headers: { 'Content-Type': 'application/json' }
        });
      }

      // Check if already a member
      const existingMember = await DB.prepare(`
        SELECT id FROM syndicate_members WHERE syndicate_id = ? AND investor_id = ?
      `).bind(syndicateId, investorId).first();

      if (existingMember) {
        return new Response(JSON.stringify({
          error: 'Already a member of this syndicate'
        }), {
          status: 400,
          headers: { 'Content-Type': 'application/json' }
        });
      }

      // Add member
      await DB.prepare(`
        INSERT INTO syndicate_members
        (id, syndicate_id, investor_id, role, investment_committed, joined_at)
        VALUES (?, ?, ?, 'member', ?, ?)
      `).bind(
        generateMemberId(),
        syndicateId,
        investorId,
        minimumInvestment || syndicate.minimum_investment || 0,
        now
      ).run();

      return new Response(JSON.stringify({
        success: true,
        message: 'Successfully joined syndicate'
      }), {
        headers: { 'Content-Type': 'application/json' }
      });
    }

    return new Response(JSON.stringify({
      error: 'Invalid action'
    }), {
      status: 400,
      headers: { 'Content-Type': 'application/json' }
    });

  } catch (error) {
    console.error('Error with syndicate operation:', error);
    return new Response(JSON.stringify({ error: 'Syndicate operation failed' }), {
      status: 500,
      headers: { 'Content-Type': 'application/json' }
    });
  }
}

// Get syndicate details and member activity
export async function GET({ url, locals }: APIContext) {
  const { DB } = locals.runtime.env;
  const syndicateId = url.searchParams.get('syndicateId');
  const investorId = url.searchParams.get('investorId');
  const action = url.searchParams.get('action') || 'details';

  if (!syndicateId && action !== 'list') {
    return new Response(JSON.stringify({
      error: 'Syndicate ID required'
    }), {
      status: 400,
      headers: { 'Content-Type': 'application/json' }
    });
  }

  try {
    if (action === 'list' && investorId) {
      // Get all syndicates for investor
      const syndicates = await DB.prepare(`
        SELECT
          s.*,
          l.title as deal_title,
          l.price as deal_price,
          u.name as lead_investor_name,
          sm.role as member_role,
          sm.investment_committed,
          COUNT(sm2.id) as member_count,
          SUM(sm2.investment_committed) as total_committed
        FROM investment_syndicates s
        JOIN syndicate_members sm ON s.id = sm.syndicate_id
        JOIN users u ON s.lead_investor_id = u.id
        LEFT JOIN listings l ON s.target_listing_id = l.id
        LEFT JOIN syndicate_members sm2 ON s.id = sm2.syndicate_id
        WHERE sm.investor_id = ?
        GROUP BY s.id
        ORDER BY s.created_at DESC
      `).bind(investorId).all();

      return new Response(JSON.stringify({
        syndicates: syndicates.map(syndicate => ({
          ...syndicate,
          deal_price_formatted: syndicate.deal_price ? `$${(syndicate.deal_price / 100).toLocaleString()}` : null,
          progress_percentage: syndicate.maximum_investment > 0
            ? Math.round((syndicate.total_committed / syndicate.maximum_investment) * 100)
            : 0
        }))
      }), {
        headers: { 'Content-Type': 'application/json' }
      });
    }

    // Get specific syndicate details
    const syndicate = await DB.prepare(`
      SELECT
        s.*,
        l.title as deal_title,
        l.description as deal_description,
        l.price as deal_price,
        l.category as deal_category,
        u.name as lead_investor_name,
        COUNT(sm.id) as member_count,
        SUM(sm.investment_committed) as total_committed
      FROM investment_syndicates s
      LEFT JOIN listings l ON s.target_listing_id = l.id
      LEFT JOIN users u ON s.lead_investor_id = u.id
      LEFT JOIN syndicate_members sm ON s.id = sm.syndicate_id
      WHERE s.id = ?
      GROUP BY s.id
    `).bind(syndicateId).first();

    if (!syndicate) {
      return new Response(JSON.stringify({
        error: 'Syndicate not found'
      }), {
        status: 404,
        headers: { 'Content-Type': 'application/json' }
      });
    }

    // Get members
    const members = await DB.prepare(`
      SELECT
        sm.*,
        u.name as investor_name,
        ip.investment_focus,
        ip.total_investments
      FROM syndicate_members sm
      JOIN users u ON sm.investor_id = u.id
      LEFT JOIN investor_profiles ip ON sm.investor_id = ip.user_id
      WHERE sm.syndicate_id = ?
      ORDER BY sm.joined_at ASC
    `).bind(syndicateId).all();

    // Get discussion messages
    const discussions = await DB.prepare(`
      SELECT
        sd.*,
        u.name as author_name
      FROM syndicate_discussions sd
      JOIN users u ON sd.author_id = u.id
      WHERE sd.syndicate_id = ?
      ORDER BY sd.created_at DESC
      LIMIT 20
    `).bind(syndicateId).all();

    // Get due diligence items
    const dueDiligence = await DB.prepare(`
      SELECT
        sdd.*,
        u.name as assigned_by_name,
        u2.name as assigned_to_name
      FROM syndicate_due_diligence sdd
      JOIN users u ON sdd.assigned_by = u.id
      LEFT JOIN users u2 ON sdd.assigned_to = u2.id
      WHERE sdd.syndicate_id = ?
      ORDER BY sdd.priority DESC, sdd.created_at ASC
    `).bind(syndicateId).all();

    return new Response(JSON.stringify({
      syndicate: {
        ...syndicate,
        deal_price_formatted: syndicate.deal_price ? `$${(syndicate.deal_price / 100).toLocaleString()}` : null,
        progress_percentage: syndicate.maximum_investment > 0
          ? Math.round((syndicate.total_committed / syndicate.maximum_investment) * 100)
          : 0,
        funding_status: getFundingStatus(syndicate.total_committed, syndicate.minimum_investment, syndicate.maximum_investment)
      },
      members: members.map(member => ({
        ...member,
        investment_focus: member.investment_focus ? JSON.parse(member.investment_focus) : []
      })),
      discussions,
      dueDiligence: dueDiligence.map(item => ({
        ...item,
        due_date_formatted: item.due_date ? new Date(item.due_date * 1000).toLocaleDateString() : null
      }))
    }), {
      headers: { 'Content-Type': 'application/json' }
    });

  } catch (error) {
    console.error('Error getting syndicate details:', error);
    return new Response(JSON.stringify({ error: 'Failed to retrieve syndicate details' }), {
      status: 500,
      headers: { 'Content-Type': 'application/json' }
    });
  }
}

// Add discussion message or due diligence item
export async function PUT({ request, locals }: APIContext) {
  const { DB } = locals.runtime.env;

  try {
    const {
      syndicateId,
      investorId,
      action, // 'message', 'due_diligence', 'update_commitment'
      content,
      dueDiligenceItem,
      newCommitment
    } = await request.json();

    if (!syndicateId || !investorId || !action) {
      return new Response(JSON.stringify({
        error: 'Syndicate ID, investor ID, and action required'
      }), {
        status: 400,
        headers: { 'Content-Type': 'application/json' }
      });
    }

    // Verify membership
    const member = await DB.prepare(`
      SELECT * FROM syndicate_members WHERE syndicate_id = ? AND investor_id = ?
    `).bind(syndicateId, investorId).first();

    if (!member) {
      return new Response(JSON.stringify({
        error: 'Not a member of this syndicate'
      }), {
        status: 403,
        headers: { 'Content-Type': 'application/json' }
      });
    }

    const now = Math.floor(Date.now() / 1000);

    if (action === 'message') {
      if (!content) {
        return new Response(JSON.stringify({
          error: 'Message content required'
        }), {
          status: 400,
          headers: { 'Content-Type': 'application/json' }
        });
      }

      const messageId = generateMessageId();
      await DB.prepare(`
        INSERT INTO syndicate_discussions
        (id, syndicate_id, author_id, content, created_at)
        VALUES (?, ?, ?, ?, ?)
      `).bind(messageId, syndicateId, investorId, content, now).run();

      return new Response(JSON.stringify({
        success: true,
        messageId,
        message: 'Discussion message added'
      }), {
        headers: { 'Content-Type': 'application/json' }
      });

    } else if (action === 'due_diligence') {
      if (!dueDiligenceItem || !dueDiligenceItem.title) {
        return new Response(JSON.stringify({
          error: 'Due diligence item details required'
        }), {
          status: 400,
          headers: { 'Content-Type': 'application/json' }
        });
      }

      const ddId = generateDueDiligenceId();
      await DB.prepare(`
        INSERT INTO syndicate_due_diligence
        (id, syndicate_id, title, description, assigned_by, assigned_to, priority, due_date, status, created_at)
        VALUES (?, ?, ?, ?, ?, ?, ?, ?, 'pending', ?)
      `).bind(
        ddId,
        syndicateId,
        dueDiligenceItem.title,
        dueDiligenceItem.description || null,
        investorId,
        dueDiligenceItem.assignedTo || null,
        dueDiligenceItem.priority || 'medium',
        dueDiligenceItem.dueDate || null,
        now
      ).run();

      return new Response(JSON.stringify({
        success: true,
        ddId,
        message: 'Due diligence item created'
      }), {
        headers: { 'Content-Type': 'application/json' }
      });

    } else if (action === 'update_commitment') {
      if (newCommitment === undefined) {
        return new Response(JSON.stringify({
          error: 'New commitment amount required'
        }), {
          status: 400,
          headers: { 'Content-Type': 'application/json' }
        });
      }

      await DB.prepare(`
        UPDATE syndicate_members SET
          investment_committed = ?,
          updated_at = ?
        WHERE syndicate_id = ? AND investor_id = ?
      `).bind(newCommitment, now, syndicateId, investorId).run();

      return new Response(JSON.stringify({
        success: true,
        message: 'Investment commitment updated'
      }), {
        headers: { 'Content-Type': 'application/json' }
      });
    }

    return new Response(JSON.stringify({
      error: 'Invalid action'
    }), {
      status: 400,
      headers: { 'Content-Type': 'application/json' }
    });

  } catch (error) {
    console.error('Error updating syndicate:', error);
    return new Response(JSON.stringify({ error: 'Failed to update syndicate' }), {
      status: 500,
      headers: { 'Content-Type': 'application/json' }
    });
  }
}

function getFundingStatus(totalCommitted: number, minInvestment: number, maxInvestment: number) {
  if (!minInvestment) return 'no_target';

  const percentage = (totalCommitted / minInvestment) * 100;

  if (percentage >= 100) return 'funded';
  if (percentage >= 75) return 'almost_funded';
  if (percentage >= 50) return 'halfway';
  if (percentage >= 25) return 'early_stage';
  return 'just_started';
}

function generateSyndicateId(): string {
  const prefix = 'syn_';
  const randomBytes = crypto.getRandomValues(new Uint8Array(8));
  const id = Array.from(randomBytes)
    .map(b => b.toString(16).padStart(2, '0'))
    .join('');
  return prefix + id;
}

function generateMemberId(): string {
  const prefix = 'mem_';
  const randomBytes = crypto.getRandomValues(new Uint8Array(8));
  const id = Array.from(randomBytes)
    .map(b => b.toString(16).padStart(2, '0'))
    .join('');
  return prefix + id;
}

function generateMessageId(): string {
  const prefix = 'msg_';
  const randomBytes = crypto.getRandomValues(new Uint8Array(8));
  const id = Array.from(randomBytes)
    .map(b => b.toString(16).padStart(2, '0'))
    .join('');
  return prefix + id;
}

function generateDueDiligenceId(): string {
  const prefix = 'dd_';
  const randomBytes = crypto.getRandomValues(new Uint8Array(8));
  const id = Array.from(randomBytes)
    .map(b => b.toString(16).padStart(2, '0'))
    .join('');
  return prefix + id;
}