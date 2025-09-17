// Cloudflare AI Integration API
import type { APIContext } from 'astro';

export async function POST({ request, locals }: APIContext) {
  const { AI } = locals.runtime?.env || {};

  try {
    const body = await request.json();
    const { prompt, model = '@cf/meta/llama-3.1-8b-instruct' } = body;

    if (!prompt) {
      return new Response(JSON.stringify({
        success: false,
        error: 'Prompt is required'
      }), {
        status: 400,
        headers: { 'Content-Type': 'application/json' }
      });
    }

    if (!AI) {
      return new Response(JSON.stringify({
        success: true,
        result: {
          response: 'Demo AI response - Cloudflare AI not configured'
        },
        note: 'Demo AI response - Cloudflare AI not configured'
      }), {
        status: 200,
        headers: { 'Content-Type': 'application/json' }
      });
    }

    const response = await AI.run(model, {
      messages: [
        {
          role: 'user',
          content: prompt
        }
      ]
    });

    return new Response(JSON.stringify({
      success: true,
      result: response
    }), {
      status: 200,
      headers: { 'Content-Type': 'application/json' }
    });

  } catch (error) {
    return new Response(JSON.stringify({
      success: false,
      error: 'AI request failed',
      details: error.message
    }), {
      status: 500,
      headers: { 'Content-Type': 'application/json' }
    });
  }
}

export async function GET({ locals }: APIContext) {
  const { AI } = locals.runtime?.env || {};

  return new Response(JSON.stringify({
    success: true,
    available: !!AI,
    models: ['@cf/meta/llama-3.1-8b-instruct', '@cf/microsoft/DialoGPT-medium'],
    note: AI ? 'Cloudflare AI available' : 'Cloudflare AI not configured'
  }), {
    status: 200,
    headers: { 'Content-Type': 'application/json' }
  });
}