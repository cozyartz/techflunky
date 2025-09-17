// Stripe Sandbox Testing API
// Comprehensive testing endpoint for Stripe integration validation
import type { APIContext } from 'astro';

export async function GET({ url, locals }: APIContext) {
  // Try to get from runtime env first (production), then fallback to process.env (development)
  const STRIPE_SECRET_KEY = locals.runtime?.env?.STRIPE_SECRET_KEY || process.env.STRIPE_SECRET_KEY;
  const STRIPE_PUBLISHABLE_KEY = locals.runtime?.env?.STRIPE_PUBLISHABLE_KEY || process.env.STRIPE_PUBLISHABLE_KEY;
  const scenario = url.searchParams.get('scenario') || 'status';

  // Ensure we're using test keys in sandbox mode
  const isTestMode = STRIPE_SECRET_KEY?.includes('sk_test_') ||
                     process.env.NODE_ENV !== 'production';

  if (!isTestMode && process.env.NODE_ENV === 'production') {
    return new Response(JSON.stringify({
      error: 'Sandbox testing not available in production with live keys'
    }), {
      status: 403,
      headers: { 'Content-Type': 'application/json' }
    });
  }

  try {
    switch (scenario) {
      case 'status':
        return testStripeConnection(STRIPE_SECRET_KEY, STRIPE_PUBLISHABLE_KEY);
      case 'calculate-fees':
        return testFeeCalculation();
      case 'payment-intent':
        return testPaymentIntent(STRIPE_SECRET_KEY);
      case 'all':
        return runAllTests(STRIPE_SECRET_KEY, STRIPE_PUBLISHABLE_KEY);
      default:
        return new Response(JSON.stringify({
          error: 'Invalid test scenario',
          availableScenarios: ['status', 'calculate-fees', 'payment-intent', 'all']
        }), {
          status: 400,
          headers: { 'Content-Type': 'application/json' }
        });
    }
  } catch (error) {
    return new Response(JSON.stringify({
      error: 'Test execution failed',
      details: error.message
    }), {
      status: 500,
      headers: { 'Content-Type': 'application/json' }
    });
  }
}

export async function POST({ request, locals }: APIContext) {
  const STRIPE_SECRET_KEY = locals.runtime?.env?.STRIPE_SECRET_KEY || process.env.STRIPE_SECRET_KEY;

  try {
    const body = await request.json();
    const { action, testData } = body;

    switch (action) {
      case 'create-checkout-session':
        return createTestCheckoutSession(testData, STRIPE_SECRET_KEY);
      case 'simulate-webhook':
        return simulateStripeWebhook(testData, STRIPE_SECRET_KEY);
      default:
        return new Response(JSON.stringify({
          error: 'Invalid action',
          availableActions: ['create-checkout-session', 'simulate-webhook']
        }), {
          status: 400,
          headers: { 'Content-Type': 'application/json' }
        });
    }
  } catch (error) {
    return new Response(JSON.stringify({
      error: 'Test execution failed',
      details: error.message
    }), {
      status: 500,
      headers: { 'Content-Type': 'application/json' }
    });
  }
}

async function testStripeConnection(secretKey: string, publishableKey: string) {
  try {
    if (!secretKey || !publishableKey) {
      return new Response(JSON.stringify({
        success: false,
        error: 'Stripe keys not configured',
        status: 'misconfigured'
      }), {
        status: 500,
        headers: { 'Content-Type': 'application/json' }
      });
    }

    // Validate key formats
    const secretKeyValid = secretKey.startsWith('sk_test_') || secretKey.startsWith('sk_live_');
    const publishableKeyValid = publishableKey.startsWith('pk_test_') || publishableKey.startsWith('pk_live_');

    if (!secretKeyValid || !publishableKeyValid) {
      return new Response(JSON.stringify({
        success: false,
        error: 'Invalid Stripe key format',
        status: 'invalid_keys'
      }), {
        status: 400,
        headers: { 'Content-Type': 'application/json' }
      });
    }

    // Test API connection by retrieving account info
    const stripe = (await import('stripe')).default;
    const stripeClient = new stripe(secretKey, { apiVersion: '2023-10-16' });

    const account = await stripeClient.accounts.retrieve();

    return new Response(JSON.stringify({
      success: true,
      status: 'connected',
      account: {
        id: account.id,
        country: account.country,
        currency: account.default_currency,
        email: account.email,
        payouts_enabled: account.payouts_enabled,
        charges_enabled: account.charges_enabled
      },
      environment: secretKey.includes('test') ? 'test' : 'live'
    }), {
      status: 200,
      headers: { 'Content-Type': 'application/json' }
    });

  } catch (error) {
    return new Response(JSON.stringify({
      success: false,
      error: 'Stripe connection failed',
      details: error.message,
      status: 'connection_failed'
    }), {
      status: 500,
      headers: { 'Content-Type': 'application/json' }
    });
  }
}

async function testFeeCalculation() {
  // TechFlunky's fee structure testing
  const testScenarios = [
    { platformPrice: 9900, sellerTier: 'basic', expectedFee: 792 }, // 8% of $99
    { platformPrice: 49900, sellerTier: 'premium', expectedFee: 3492 }, // 7% of $499
    { platformPrice: 99900, sellerTier: 'enterprise', expectedFee: 5994 }, // 6% of $999
    { platformPrice: 199900, sellerTier: 'basic', expectedFee: 15992 }, // 8% of $1999
  ];

  const calculations = testScenarios.map(scenario => {
    const feePercentage = calculateFeePercentage(scenario.sellerTier);
    const calculatedFee = Math.round(scenario.platformPrice * feePercentage / 100);
    const isCorrect = calculatedFee === scenario.expectedFee;

    return {
      ...scenario,
      feePercentage,
      calculatedFee,
      isCorrect,
      difference: calculatedFee - scenario.expectedFee
    };
  });

  const allCorrect = calculations.every(calc => calc.isCorrect);

  return new Response(JSON.stringify({
    success: allCorrect,
    calculations,
    summary: {
      total: calculations.length,
      correct: calculations.filter(c => c.isCorrect).length,
      incorrect: calculations.filter(c => !c.isCorrect).length
    }
  }), {
    status: 200,
    headers: { 'Content-Type': 'application/json' }
  });
}

function calculateFeePercentage(sellerTier: string): number {
  // TechFlunky's tiered fee structure
  switch (sellerTier) {
    case 'enterprise': return 6;
    case 'premium': return 7;
    case 'basic':
    default: return 8;
  }
}

async function testPaymentIntent(secretKey: string) {
  try {
    const stripe = (await import('stripe')).default;
    const stripeClient = new stripe(secretKey, { apiVersion: '2023-10-16' });

    const paymentIntent = await stripeClient.paymentIntents.create({
      amount: 9900, // $99.00
      currency: 'usd',
      payment_method_types: ['card'],
      metadata: {
        platform: 'techflunky-test',
        test_mode: 'true',
        created_by: 'automated-test'
      }
    });

    return new Response(JSON.stringify({
      success: true,
      paymentIntent: {
        id: paymentIntent.id,
        amount: paymentIntent.amount,
        currency: paymentIntent.currency,
        status: paymentIntent.status,
        client_secret: paymentIntent.client_secret?.substring(0, 20) + '...'
      }
    }), {
      status: 200,
      headers: { 'Content-Type': 'application/json' }
    });

  } catch (error) {
    return new Response(JSON.stringify({
      success: false,
      error: 'Payment intent creation failed',
      details: error.message
    }), {
      status: 500,
      headers: { 'Content-Type': 'application/json' }
    });
  }
}

async function createTestCheckoutSession(testData: any, secretKey: string) {
  try {
    const stripe = (await import('stripe')).default;
    const stripeClient = new stripe(secretKey, { apiVersion: '2023-10-16' });

    const session = await stripeClient.checkout.sessions.create({
      payment_method_types: ['card'],
      line_items: [{
        price_data: {
          currency: 'usd',
          product_data: {
            name: testData.productName || 'Test Platform',
            description: testData.description || 'Test platform purchase'
          },
          unit_amount: testData.amount || 9900
        },
        quantity: 1
      }],
      mode: 'payment',
      success_url: `${process.env.SITE_URL || 'http://localhost:4321'}/purchase/success?session_id={CHECKOUT_SESSION_ID}`,
      cancel_url: `${process.env.SITE_URL || 'http://localhost:4321'}/browse`,
      metadata: {
        test_mode: 'true',
        ...testData.metadata
      }
    });

    return new Response(JSON.stringify({
      success: true,
      session: {
        id: session.id,
        url: session.url,
        payment_status: session.payment_status
      }
    }), {
      status: 200,
      headers: { 'Content-Type': 'application/json' }
    });

  } catch (error) {
    return new Response(JSON.stringify({
      success: false,
      error: 'Checkout session creation failed',
      details: error.message
    }), {
      status: 500,
      headers: { 'Content-Type': 'application/json' }
    });
  }
}

async function simulateStripeWebhook(testData: any, secretKey: string) {
  // Simulate common Stripe webhooks for testing
  const webhookEvents = [
    'checkout.session.completed',
    'payment_intent.succeeded',
    'payment_intent.payment_failed',
    'invoice.payment_succeeded'
  ];

  const simulatedEvent = {
    id: `evt_test_${Date.now()}`,
    object: 'event',
    type: testData.eventType || 'checkout.session.completed',
    created: Math.floor(Date.now() / 1000),
    data: {
      object: {
        id: `cs_test_${Date.now()}`,
        object: 'checkout.session',
        amount_total: testData.amount || 9900,
        currency: 'usd',
        payment_status: 'paid',
        metadata: {
          test_mode: 'true',
          ...testData.metadata
        }
      }
    }
  };

  return new Response(JSON.stringify({
    success: true,
    simulatedEvent,
    message: 'Webhook event simulated successfully'
  }), {
    status: 200,
    headers: { 'Content-Type': 'application/json' }
  });
}

async function runAllTests(secretKey: string, publishableKey: string) {
  const testResults = [];

  try {
    // Test 1: Connection
    const connectionTest = await testStripeConnection(secretKey, publishableKey);
    const connectionData = await connectionTest.json();
    testResults.push({
      test: 'connection',
      success: connectionTest.status === 200,
      data: connectionData
    });

    // Test 2: Fee Calculation
    const feeTest = await testFeeCalculation();
    const feeData = await feeTest.json();
    testResults.push({
      test: 'fee_calculation',
      success: feeData.success,
      data: feeData
    });

    // Test 3: Payment Intent
    if (connectionData.success) {
      const paymentTest = await testPaymentIntent(secretKey);
      const paymentData = await paymentTest.json();
      testResults.push({
        test: 'payment_intent',
        success: paymentTest.status === 200,
        data: paymentData
      });
    }

    const allSuccessful = testResults.every(result => result.success);
    const summary = {
      total: testResults.length,
      passed: testResults.filter(r => r.success).length,
      failed: testResults.filter(r => !r.success).length
    };

    return new Response(JSON.stringify({
      success: allSuccessful,
      summary,
      results: testResults,
      timestamp: new Date().toISOString()
    }), {
      status: allSuccessful ? 200 : 500,
      headers: { 'Content-Type': 'application/json' }
    });

  } catch (error) {
    return new Response(JSON.stringify({
      success: false,
      error: 'Test suite execution failed',
      details: error.message,
      results: testResults
    }), {
      status: 500,
      headers: { 'Content-Type': 'application/json' }
    });
  }
}