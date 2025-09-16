import type { APIRoute } from 'astro';
import { validateEmail } from '../../lib/email-validation';

export const POST: APIRoute = async ({ request }) => {
  try {
    const { email, options = {} } = await request.json();

    if (!email) {
      return new Response(JSON.stringify({
        error: 'Email address is required'
      }), {
        status: 400,
        headers: { 'Content-Type': 'application/json' }
      });
    }

    // Validate the email with comprehensive checks
    const validationResult = await validateEmail(email, {
      checkMxRecord: true,
      checkDisposable: true,
      checkFreeProvider: true,
      checkRoleBased: true,
      suggestDomains: true,
      timeout: 5000,
      ...options
    });

    // Log validation attempt for analytics (in production, you'd store this in a database)
    console.log(`Email validation: ${email} - Valid: ${validationResult.isValid} - Score: ${validationResult.score}`);

    return new Response(JSON.stringify({
      success: true,
      validation: validationResult
    }), {
      status: 200,
      headers: { 'Content-Type': 'application/json' }
    });

  } catch (error) {
    console.error('Email validation error:', error);
    return new Response(JSON.stringify({
      error: 'Failed to validate email address',
      details: error instanceof Error ? error.message : 'Unknown error'
    }), {
      status: 500,
      headers: { 'Content-Type': 'application/json' }
    });
  }
};

export const GET: APIRoute = async ({ url }) => {
  try {
    const email = url.searchParams.get('email');

    if (!email) {
      return new Response(JSON.stringify({
        error: 'Email parameter is required'
      }), {
        status: 400,
        headers: { 'Content-Type': 'application/json' }
      });
    }

    // For GET requests, we'll do a quick validation without MX checks to be faster
    const validationResult = await validateEmail(email, {
      checkMxRecord: false, // Skip MX for quick validation
      checkDisposable: true,
      checkFreeProvider: true,
      checkRoleBased: true,
      suggestDomains: true,
      timeout: 2000
    });

    return new Response(JSON.stringify({
      success: true,
      validation: validationResult
    }), {
      status: 200,
      headers: { 'Content-Type': 'application/json' }
    });

  } catch (error) {
    console.error('Email validation error:', error);
    return new Response(JSON.stringify({
      error: 'Failed to validate email address',
      details: error instanceof Error ? error.message : 'Unknown error'
    }), {
      status: 500,
      headers: { 'Content-Type': 'application/json' }
    });
  }
};