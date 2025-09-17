// Syndicate Management API - Group Investment Tools
// Enables investors to form syndicates, pool resources, and manage collective decisions
import type { APIContext } from 'astro';

export async function GET({ url, locals }: APIContext) {
  const { DB } = locals.runtime.env;
  const investorId = url.searchParams.get('investorId');
  const action = url.searchParams.get('action') || 'list';

  if (!investorId) {
    return new Response(JSON.stringify({ error: 'Investor ID required' }), {
      status: 400,
      headers: { 'Content-Type': 'application/json' }
    });
  }

  try {
    switch (action) {
      case 'list':
        return await getSyndicates(investorId, DB);
      case 'invitations':
        return await getSyndicateInvitations(investorId, DB);
      case 'opportunities':
        return await getAvailableOpportunities(investorId, DB);
      default:
        return new Response(JSON.stringify({ error: 'Invalid action' }), {
          status: 400,
          headers: { 'Content-Type': 'application/json' }
        });
    }
  } catch (error) {
    console.error('Failed to fetch syndicate data:', error);
    return new Response(JSON.stringify({
      error: 'Failed to fetch syndicate data',
      details: error.message
    }), {
      status: 500,
      headers: { 'Content-Type': 'application/json' }
    });
  }
}

async function getSyndicates(investorId: string, DB: any) {
  const syndicates = await DB.prepare(`
    SELECT
      s.id,
      s.name,
      s.description,
      s.target_amount,
      s.current_amount,
      s.minimum_investment,
      s.maximum_investment,
      s.status,
      s.created_at,
      s.deadline,
      s.lead_investor_id,
      li.name as lead_investor_name,
      sm.role as member_role,
      sm.investment_amount as my_investment,
      sm.voting_power,
      COUNT(DISTINCT sm2.investor_id) as member_count,
      bp.platform_name,
      bp.category,
      bp.ai_validation_score
    FROM syndicates s
    JOIN syndicate_members sm ON s.id = sm.syndicate_id
    LEFT JOIN investor_profiles li ON s.lead_investor_id = li.user_id
    LEFT JOIN syndicate_members sm2 ON s.id = sm2.syndicate_id
    LEFT JOIN business_blueprints bp ON s.target_platform_id = bp.id
    WHERE sm.investor_id = ? AND sm.status = 'active'
    GROUP BY s.id
    ORDER BY s.created_at DESC
  `).bind(investorId).all();

  return new Response(JSON.stringify({
    success: true,
    syndicates: syndicates.results.map(syndicate => ({
      id: syndicate.id,
      name: syndicate.name,
      description: syndicate.description,
      targetAmount: syndicate.target_amount,
      currentAmount: syndicate.current_amount,
      minimumInvestment: syndicate.minimum_investment,
      maximumInvestment: syndicate.maximum_investment,
      status: syndicate.status,
      deadline: syndicate.deadline,
      leadInvestor: syndicate.lead_investor_name,
      myRole: syndicate.member_role,
      myInvestment: syndicate.my_investment,
      votingPower: syndicate.voting_power,
      memberCount: syndicate.member_count,
      targetPlatform: {
        name: syndicate.platform_name,
        category: syndicate.category,
        aiScore: syndicate.ai_validation_score
      },
      fundingProgress: (syndicate.current_amount / syndicate.target_amount) * 100
    }))
  }), {
    status: 200,
    headers: { 'Content-Type': 'application/json' }
  });
}

async function getSyndicateInvitations(investorId: string, DB: any) {
  const invitations = await DB.prepare(`
    SELECT
      si.id,
      si.syndicate_id,
      si.invited_by,
      si.message,
      si.created_at,
      si.expires_at,
      s.name as syndicate_name,
      s.description,
      s.target_amount,
      s.current_amount,
      s.minimum_investment,
      bp.platform_name,
      bp.ai_validation_score,
      ip.name as invited_by_name
    FROM syndicate_invitations si
    JOIN syndicates s ON si.syndicate_id = s.id
    LEFT JOIN business_blueprints bp ON s.target_platform_id = bp.id
    LEFT JOIN investor_profiles ip ON si.invited_by = ip.user_id
    WHERE si.investor_id = ?
      AND si.status = 'pending'
      AND si.expires_at > datetime('now')
    ORDER BY si.created_at DESC
  `).bind(investorId).all();

  return new Response(JSON.stringify({
    success: true,
    invitations: invitations.results.map(inv => ({
      id: inv.id,
      syndicateId: inv.syndicate_id,
      syndicate: {
        name: inv.syndicate_name,
        description: inv.description,
        targetAmount: inv.target_amount,
        currentAmount: inv.current_amount,
        minimumInvestment: inv.minimum_investment,
        platform: {
          name: inv.platform_name,
          aiScore: inv.ai_validation_score
        }
      },
      invitedBy: inv.invited_by_name,
      message: inv.message,
      createdAt: inv.created_at,
      expiresAt: inv.expires_at
    }))
  }), {
    status: 200,
    headers: { 'Content-Type': 'application/json' }
  });
}

async function getAvailableOpportunities(investorId: string, DB: any) {
  const opportunities = await DB.prepare(`
    SELECT
      s.id,
      s.name,
      s.description,
      s.target_amount,
      s.current_amount,
      s.minimum_investment,
      s.maximum_investment,
      s.deadline,
      s.is_public,
      bp.platform_name,
      bp.category,
      bp.ai_validation_score,
      bp.expected_roi,
      COUNT(DISTINCT sm.investor_id) as current_members
    FROM syndicates s
    JOIN business_blueprints bp ON s.target_platform_id = bp.id
    LEFT JOIN syndicate_members sm ON s.id = sm.syndicate_id AND sm.status = 'active'
    WHERE s.status = 'fundraising'
      AND s.deadline > datetime('now')
      AND (s.is_public = 1 OR s.id IN (
        SELECT syndicate_id FROM syndicate_invitations
        WHERE investor_id = ? AND status = 'pending'
      ))
      AND s.id NOT IN (
        SELECT syndicate_id FROM syndicate_members
        WHERE investor_id = ? AND status = 'active'
      )
    GROUP BY s.id
    ORDER BY s.created_at DESC
  `).bind(investorId, investorId).all();

  return new Response(JSON.stringify({
    success: true,
    opportunities: opportunities.results.map(opp => ({
      id: opp.id,
      name: opp.name,
      description: opp.description,
      targetAmount: opp.target_amount,
      currentAmount: opp.current_amount,
      minimumInvestment: opp.minimum_investment,
      maximumInvestment: opp.maximum_investment,
      deadline: opp.deadline,
      isPublic: opp.is_public,
      currentMembers: opp.current_members,
      fundingProgress: (opp.current_amount / opp.target_amount) * 100,
      platform: {
        name: opp.platform_name,
        category: opp.category,
        aiScore: opp.ai_validation_score,
        expectedROI: opp.expected_roi
      }
    }))
  }), {
    status: 200,
    headers: { 'Content-Type': 'application/json' }
  });
}

export async function POST({ request, locals }: APIContext) {
  const { DB } = locals.runtime.env;

  try {
    const body = await request.json();
    const { action, investorId } = body;

    switch (action) {
      case 'create_syndicate':
        return await createSyndicate(body, DB);
      case 'join_syndicate':
        return await joinSyndicate(body, DB);
      case 'invite_investor':
        return await inviteInvestor(body, DB);
      case 'respond_invitation':
        return await respondToInvitation(body, DB);
      case 'update_investment':
        return await updateInvestment(body, DB);
      case 'create_proposal':
        return await createProposal(body, DB);
      case 'vote_proposal':
        return await voteOnProposal(body, DB);
      default:
        return new Response(JSON.stringify({ error: 'Invalid action' }), {
          status: 400,
          headers: { 'Content-Type': 'application/json' }
        });
    }
  } catch (error) {
    console.error('Syndicate management error:', error);
    return new Response(JSON.stringify({
      error: 'Failed to process syndicate request',
      details: error.message
    }), {
      status: 500,
      headers: { 'Content-Type': 'application/json' }
    });
  }
}

async function createSyndicate(data: any, DB: any) {
  const {
    investorId,
    name,
    description,
    targetPlatformId,
    targetAmount,
    minimumInvestment,
    maximumInvestment,
    deadline,
    isPublic,
    initialInvestment
  } = data;

  const syndicateId = `syn_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;

  await DB.prepare(`
    INSERT INTO syndicates (
      id,
      name,
      description,
      target_platform_id,
      lead_investor_id,
      target_amount,
      current_amount,
      minimum_investment,
      maximum_investment,
      deadline,
      is_public,
      status,
      created_at
    ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
  `).bind(
    syndicateId,
    name,
    description,
    targetPlatformId,
    investorId,
    targetAmount,
    initialInvestment || 0,
    minimumInvestment,
    maximumInvestment,
    deadline,
    isPublic ? 1 : 0,
    'fundraising',
    new Date().toISOString()
  ).run();

  await DB.prepare(`
    INSERT INTO syndicate_members (
      syndicate_id,
      investor_id,
      role,
      investment_amount,
      voting_power,
      status,
      joined_at
    ) VALUES (?, ?, ?, ?, ?, ?, ?)
  `).bind(
    syndicateId,
    investorId,
    'lead',
    initialInvestment || 0,
    100,
    'active',
    new Date().toISOString()
  ).run();

  return new Response(JSON.stringify({
    success: true,
    syndicateId,
    message: 'Syndicate created successfully'
  }), {
    status: 201,
    headers: { 'Content-Type': 'application/json' }
  });
}

async function joinSyndicate(data: any, DB: any) {
  const { syndicateId, investorId, investmentAmount } = data;

  const syndicate = await DB.prepare(`
    SELECT target_amount, current_amount, minimum_investment, maximum_investment, status
    FROM syndicates WHERE id = ?
  `).bind(syndicateId).first();

  if (!syndicate || syndicate.status !== 'fundraising') {
    return new Response(JSON.stringify({ error: 'Syndicate not available' }), {
      status: 400,
      headers: { 'Content-Type': 'application/json' }
    });
  }

  if (investmentAmount < syndicate.minimum_investment || investmentAmount > syndicate.maximum_investment) {
    return new Response(JSON.stringify({ error: 'Investment amount outside allowed range' }), {
      status: 400,
      headers: { 'Content-Type': 'application/json' }
    });
  }

  const votingPower = Math.min((investmentAmount / syndicate.target_amount) * 100, 25);

  await DB.prepare(`
    INSERT INTO syndicate_members (
      syndicate_id,
      investor_id,
      role,
      investment_amount,
      voting_power,
      status,
      joined_at
    ) VALUES (?, ?, ?, ?, ?, ?, ?)
  `).bind(
    syndicateId,
    investorId,
    'member',
    investmentAmount,
    votingPower,
    'active',
    new Date().toISOString()
  ).run();

  await DB.prepare(`
    UPDATE syndicates
    SET current_amount = current_amount + ?
    WHERE id = ?
  `).bind(investmentAmount, syndicateId).run();

  return new Response(JSON.stringify({
    success: true,
    message: 'Successfully joined syndicate',
    votingPower
  }), {
    status: 200,
    headers: { 'Content-Type': 'application/json' }
  });
}

async function inviteInvestor(data: any, DB: any) {
  const { syndicateId, investorId, inviteeEmail, message } = data;

  const invitationId = `inv_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
  const expiresAt = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString();

  const inviteeProfile = await DB.prepare(`
    SELECT user_id FROM investor_profiles WHERE email = ?
  `).bind(inviteeEmail).first();

  if (!inviteeProfile) {
    return new Response(JSON.stringify({ error: 'Investor not found' }), {
      status: 404,
      headers: { 'Content-Type': 'application/json' }
    });
  }

  await DB.prepare(`
    INSERT INTO syndicate_invitations (
      id,
      syndicate_id,
      investor_id,
      invited_by,
      message,
      status,
      created_at,
      expires_at
    ) VALUES (?, ?, ?, ?, ?, ?, ?, ?)
  `).bind(
    invitationId,
    syndicateId,
    inviteeProfile.user_id,
    investorId,
    message,
    'pending',
    new Date().toISOString(),
    expiresAt
  ).run();

  return new Response(JSON.stringify({
    success: true,
    invitationId,
    message: 'Invitation sent successfully'
  }), {
    status: 201,
    headers: { 'Content-Type': 'application/json' }
  });
}

async function respondToInvitation(data: any, DB: any) {
  const { invitationId, response, investmentAmount } = data;

  if (response === 'accept' && investmentAmount) {
    const invitation = await DB.prepare(`
      SELECT si.syndicate_id, si.investor_id
      FROM syndicate_invitations si
      WHERE si.id = ? AND si.status = 'pending'
    `).bind(invitationId).first();

    if (invitation) {
      await joinSyndicate({
        syndicateId: invitation.syndicate_id,
        investorId: invitation.investor_id,
        investmentAmount
      }, DB);
    }
  }

  await DB.prepare(`
    UPDATE syndicate_invitations
    SET status = ?, responded_at = ?
    WHERE id = ?
  `).bind(response, new Date().toISOString(), invitationId).run();

  return new Response(JSON.stringify({
    success: true,
    message: `Invitation ${response}ed successfully`
  }), {
    status: 200,
    headers: { 'Content-Type': 'application/json' }
  });
}

async function updateInvestment(data: any, DB: any) {
  const { syndicateId, investorId, newInvestmentAmount } = data;

  const currentMember = await DB.prepare(`
    SELECT investment_amount FROM syndicate_members
    WHERE syndicate_id = ? AND investor_id = ?
  `).bind(syndicateId, investorId).first();

  if (!currentMember) {
    return new Response(JSON.stringify({ error: 'Not a member of this syndicate' }), {
      status: 400,
      headers: { 'Content-Type': 'application/json' }
    });
  }

  const difference = newInvestmentAmount - currentMember.investment_amount;

  await DB.prepare(`
    UPDATE syndicate_members
    SET investment_amount = ?
    WHERE syndicate_id = ? AND investor_id = ?
  `).bind(newInvestmentAmount, syndicateId, investorId).run();

  await DB.prepare(`
    UPDATE syndicates
    SET current_amount = current_amount + ?
    WHERE id = ?
  `).bind(difference, syndicateId).run();

  return new Response(JSON.stringify({
    success: true,
    message: 'Investment amount updated successfully'
  }), {
    status: 200,
    headers: { 'Content-Type': 'application/json' }
  });
}

async function createProposal(data: any, DB: any) {
  const { syndicateId, investorId, title, description, proposalType, votingDeadline } = data;

  const proposalId = `prop_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;

  await DB.prepare(`
    INSERT INTO syndicate_proposals (
      id,
      syndicate_id,
      created_by,
      title,
      description,
      proposal_type,
      status,
      voting_deadline,
      created_at
    ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
  `).bind(
    proposalId,
    syndicateId,
    investorId,
    title,
    description,
    proposalType,
    'active',
    votingDeadline,
    new Date().toISOString()
  ).run();

  return new Response(JSON.stringify({
    success: true,
    proposalId,
    message: 'Proposal created successfully'
  }), {
    status: 201,
    headers: { 'Content-Type': 'application/json' }
  });
}

async function voteOnProposal(data: any, DB: any) {
  const { proposalId, investorId, vote, comment } = data;

  await DB.prepare(`
    INSERT OR REPLACE INTO syndicate_votes (
      proposal_id,
      investor_id,
      vote,
      comment,
      voted_at
    ) VALUES (?, ?, ?, ?, ?)
  `).bind(
    proposalId,
    investorId,
    vote,
    comment,
    new Date().toISOString()
  ).run();

  return new Response(JSON.stringify({
    success: true,
    message: 'Vote recorded successfully'
  }), {
    status: 200,
    headers: { 'Content-Type': 'application/json' }
  });
}