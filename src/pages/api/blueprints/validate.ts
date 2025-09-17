// Blueprint Validation API
import type { APIContext } from 'astro';

export async function POST({ request, locals }: APIContext) {
  const { DB } = locals.runtime?.env || {};

  try {
    const body = await request.json();
    const { title, description, category, price, technologies, features } = body;

    const errors = [];

    if (!title || title.length < 3) {
      errors.push('Title must be at least 3 characters');
    }

    if (!description || description.length < 10) {
      errors.push('Description must be at least 10 characters');
    }

    if (!category) {
      errors.push('Category is required');
    }

    if (!price || price < 0) {
      errors.push('Valid price is required');
    }

    if (!technologies || !Array.isArray(technologies) || technologies.length === 0) {
      errors.push('At least one technology is required');
    }

    if (!features || !Array.isArray(features) || features.length === 0) {
      errors.push('At least one feature is required');
    }

    if (errors.length > 0) {
      return new Response(JSON.stringify({
        success: false,
        errors,
        message: 'Validation failed'
      }), {
        status: 400,
        headers: { 'Content-Type': 'application/json' }
      });
    }

    return new Response(JSON.stringify({
      success: true,
      message: 'Blueprint validation passed',
      note: DB ? 'Live validation' : 'Demo validation - Database not configured'
    }), {
      status: 200,
      headers: { 'Content-Type': 'application/json' }
    });

  } catch (error) {
    return new Response(JSON.stringify({
      success: false,
      error: 'Validation failed',
      details: error.message
    }), {
      status: 500,
      headers: { 'Content-Type': 'application/json' }
    });
  }
}