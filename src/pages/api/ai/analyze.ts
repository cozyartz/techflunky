// AI Analysis API
import type { APIContext } from 'astro';

export async function POST({ request, locals }: APIContext) {
  try {
    const body = await request.json();
    const { text, type } = body;

    if (!text || !type) {
      return new Response(JSON.stringify({
        success: false,
        error: 'Text and type are required'
      }), {
        status: 400,
        headers: { 'Content-Type': 'application/json' }
      });
    }

    // Check for Cloudflare AI binding
    const AI = locals.runtime?.env?.AI;

    if (!AI) {
      // Return demo response when AI is not configured
      return new Response(JSON.stringify({
        success: true,
        data: {
          analysis: 'Demo AI analysis - Cloudflare AI not configured',
          score: 8.5,
          recommendations: [
            'Consider adding more detailed documentation',
            'Implement comprehensive testing strategy',
            'Add performance monitoring'
          ],
          confidence: 0.85
        },
        note: 'Demo analysis - Cloudflare AI not configured'
      }), {
        status: 200,
        headers: { 'Content-Type': 'application/json' }
      });
    }

    // Use Cloudflare AI for analysis
    const prompt = buildAnalysisPrompt(text, type);

    const response = await AI.run('@cf/meta/llama-3-8b-instruct', {
      messages: [
        {
          role: 'system',
          content: 'You are an expert business analyst. Provide structured analysis in JSON format.'
        },
        {
          role: 'user',
          content: prompt
        }
      ]
    });

    return new Response(JSON.stringify({
      success: true,
      data: {
        analysis: response.response || 'Analysis completed',
        type,
        timestamp: new Date().toISOString()
      }
    }), {
      status: 200,
      headers: { 'Content-Type': 'application/json' }
    });

  } catch (error) {
    return new Response(JSON.stringify({
      success: false,
      error: 'AI analysis failed',
      details: error.message
    }), {
      status: 500,
      headers: { 'Content-Type': 'application/json' }
    });
  }
}

function buildAnalysisPrompt(text: string, type: string): string {
  switch (type) {
    case 'business_analysis':
      return `Analyze this business description and provide insights on market potential, viability, and recommendations: ${text}`;
    case 'technical_analysis':
      return `Analyze this technical description and provide insights on architecture, scalability, and recommendations: ${text}`;
    case 'market_analysis':
      return `Analyze this market description and provide insights on competition, opportunities, and recommendations: ${text}`;
    default:
      return `Provide general analysis and insights for: ${text}`;
  }
}