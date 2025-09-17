// Blueprint Validation API
import type { APIContext } from 'astro';

export async function POST({ request }: APIContext) {
  try {
    const body = await request.json();
    const {
      platformName,
      description,
      category,
      price,
      technologies,
      features
    } = body;

    const errors = [];

    // Validate platform name
    if (!platformName || platformName.trim().length === 0) {
      errors.push('Platform name is required');
    } else if (platformName.length > 100) {
      errors.push('Platform name must be less than 100 characters');
    }

    // Validate description
    if (!description || description.trim().length === 0) {
      errors.push('Description is required');
    } else if (description.length > 500) {
      errors.push('Description must be less than 500 characters');
    }

    // Validate category
    const validCategories = [
      'productivity', 'marketing', 'analytics', 'ecommerce',
      'healthcare', 'education', 'finance', 'entertainment',
      'social', 'communication', 'utility', 'other'
    ];
    if (!category || !validCategories.includes(category)) {
      errors.push('Valid category is required');
    }

    // Validate price
    if (price === undefined || price === null) {
      errors.push('Price is required');
    } else if (price < 0) {
      errors.push('Price must be positive');
    } else if (price > 1000000) {
      errors.push('Price must be less than $10,000');
    }

    // Validate technologies
    if (!Array.isArray(technologies) || technologies.length === 0) {
      errors.push('At least one technology is required');
    } else if (technologies.some(tech => !tech || tech.trim().length === 0)) {
      errors.push('All technologies must be valid');
    }

    // Validate features
    if (!Array.isArray(features) || features.length === 0) {
      errors.push('At least one feature is required');
    } else if (features.some(feature => !feature || feature.trim().length === 0)) {
      errors.push('All features must be valid');
    }

    const success = errors.length === 0;

    return new Response(JSON.stringify({
      success,
      data: success ? { valid: true } : { errors },
      message: success ? 'Blueprint data is valid' : 'Blueprint validation failed'
    }), {
      status: success ? 200 : 400,
      headers: { 'Content-Type': 'application/json' }
    });

  } catch (error) {
    return new Response(JSON.stringify({
      success: false,
      error: 'Blueprint validation failed',
      details: error.message
    }), {
      status: 500,
      headers: { 'Content-Type': 'application/json' }
    });
  }
}