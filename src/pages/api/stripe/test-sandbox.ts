import type { APIRoute } from 'astro';
import { stripe, processListingPurchase, createSellerAccount, calculatePlatformFee } from '../../../lib/stripe-config';

interface TestScenario {
  name: string;
  description: string;
  testData: any;
}

export const GET: APIRoute = async ({ url }) => {
  const scenario = url.searchParams.get('scenario') || 'status';

  try {
    switch (scenario) {
      case 'status':
        return getStripeStatus();
      case 'create-seller':
        return testCreateSeller();
      case 'calculate-fees':
        return testFeeCalculation();
      case 'payment-intent':
        return testPaymentIntent();
      case 'all':
        return runAllTests();
      default:
        return getTestScenarios();
    }
  } catch (error) {
    console.error('Stripe test error:', error);
    return new Response(JSON.stringify({
      error: 'Test failed',
      details: error instanceof Error ? error.message : 'Unknown error'
    }), {
      status: 500,
      headers: { 'Content-Type': 'application/json' }
    });
  }
};

async function getStripeStatus(): Promise<Response> {
  try {
    // Test connection to Stripe API
    const balance = await stripe.balance.retrieve();

    return new Response(JSON.stringify({
      success: true,
      message: 'Stripe connection successful',
      environment: process.env.STRIPE_SECRET_KEY?.includes('_test_') ? 'sandbox' : 'production',
      balance: {
        available: balance.available,
        pending: balance.pending
      },
      timestamp: new Date().toISOString()
    }), {
      status: 200,
      headers: { 'Content-Type': 'application/json' }
    });
  } catch (error) {
    return new Response(JSON.stringify({
      success: false,
      error: 'Failed to connect to Stripe',
      details: error instanceof Error ? error.message : 'Unknown error'
    }), {
      status: 500,
      headers: { 'Content-Type': 'application/json' }
    });
  }
}

async function testCreateSeller(): Promise<Response> {
  try {
    const testSeller = {
      email: `test-seller-${Date.now()}@techflunky.com`,
      name: 'Test Seller Account',
      businessType: 'individual' as const,
      country: 'United States'
    };

    const account = await createSellerAccount(testSeller);

    return new Response(JSON.stringify({
      success: true,
      message: 'Test seller account created successfully',
      account: {
        id: account.id,
        email: account.email,
        type: account.type,
        country: account.country,
        charges_enabled: account.charges_enabled,
        payouts_enabled: account.payouts_enabled,
        capabilities: account.capabilities
      },
      testSeller
    }), {
      status: 200,
      headers: { 'Content-Type': 'application/json' }
    });
  } catch (error) {
    return new Response(JSON.stringify({
      success: false,
      error: 'Failed to create seller account',
      details: error instanceof Error ? error.message : 'Unknown error'
    }), {
      status: 500,
      headers: { 'Content-Type': 'application/json' }
    });
  }
}

async function testFeeCalculation(): Promise<Response> {
  const testCases = [
    { amount: 500, tier: 'new', subscription: 'monthly', membership: 'basic', description: 'New seller, monthly basic' },
    { amount: 1000, tier: 'standard', subscription: 'monthly', membership: 'basic', description: 'Standard seller, monthly basic' },
    { amount: 5000, tier: 'established', subscription: 'monthly', membership: 'pro', description: 'Established seller, monthly pro' },
    { amount: 5000, tier: 'established', subscription: 'annual', membership: 'pro', description: 'Established seller, annual pro (2% discount)' },
    { amount: 50000, tier: 'premium', subscription: 'monthly', membership: 'enterprise', description: 'Premium seller, monthly enterprise (2% discount)' },
    { amount: 50000, tier: 'premium', subscription: 'annual', membership: 'enterprise', description: 'Premium seller, annual enterprise (2% discount)' },
  ];

  const results = testCases.map(testCase => {
    const fee = calculatePlatformFee({
      amount: testCase.amount * 100, // Convert to cents
      sellerTier: testCase.tier as any,
      subscriptionType: testCase.subscription as any,
      membershipLevel: testCase.membership as any
    });

    return {
      ...testCase,
      amountCents: testCase.amount * 100,
      platformFeeCents: fee,
      platformFeeDollars: fee / 100,
      feePercentage: (fee / (testCase.amount * 100) * 100).toFixed(2) + '%',
      sellerReceives: ((testCase.amount * 100) - fee) / 100
    };
  });

  return new Response(JSON.stringify({
    success: true,
    message: 'Fee calculation tests completed',
    testCases: results,
    notes: {
      'new': '12% max fee for unverified sellers',
      'standard': '10% standard fee',
      'established': '8% member rate',
      'premium': '8% member rate',
      'enterprise_discount': '2% additional discount for Enterprise members',
      'annual_discount': '2% additional discount for annual subscriptions',
      'minimum_fee': '6% minimum rate (with maximum discounts)'
    }
  }), {
    status: 200,
    headers: { 'Content-Type': 'application/json' }
  });
}

async function testPaymentIntent(): Promise<Response> {
  try {
    // Create a test payment intent without actually charging
    const testData = {
      buyerId: 'test_buyer_123',
      sellerId: 'acct_test_seller_456', // This would be a real connected account ID
      listingId: 'listing_test_789',
      amount: 9900, // $99.00 in cents
      description: 'Test Autimind Platform Purchase',
      sellerTier: 'standard' as const
    };

    // For testing, create a simple payment intent instead of the full marketplace flow
    const paymentIntent = await stripe.paymentIntents.create({
      amount: testData.amount,
      currency: 'usd',
      description: testData.description,
      metadata: {
        listingId: testData.listingId,
        buyerId: testData.buyerId,
        sellerId: testData.sellerId,
        type: 'test_listing_purchase',
      },
      // For testing, don't use connected accounts
      capture_method: 'manual',
    });

    const platformFee = calculatePlatformFee({
      amount: testData.amount,
      sellerTier: testData.sellerTier
    });

    return new Response(JSON.stringify({
      success: true,
      message: 'Test payment intent created successfully',
      paymentIntent: {
        id: paymentIntent.id,
        amount: paymentIntent.amount,
        currency: paymentIntent.currency,
        status: paymentIntent.status,
        client_secret: paymentIntent.client_secret,
        metadata: paymentIntent.metadata
      },
      testData,
      feeCalculation: {
        totalAmount: testData.amount / 100,
        platformFee: platformFee / 100,
        sellerReceives: (testData.amount - platformFee) / 100,
        feePercentage: (platformFee / testData.amount * 100).toFixed(2) + '%'
      }
    }), {
      status: 200,
      headers: { 'Content-Type': 'application/json' }
    });
  } catch (error) {
    return new Response(JSON.stringify({
      success: false,
      error: 'Failed to create test payment intent',
      details: error instanceof Error ? error.message : 'Unknown error'
    }), {
      status: 500,
      headers: { 'Content-Type': 'application/json' }
    });
  }
}

async function runAllTests(): Promise<Response> {
  const results = {
    stripeStatus: null as any,
    feeCalculation: null as any,
    paymentIntent: null as any,
    errors: [] as string[]
  };

  try {
    // Test 1: Stripe Status
    const statusResponse = await getStripeStatus();
    results.stripeStatus = await statusResponse.json();
  } catch (error) {
    results.errors.push(`Stripe Status: ${error instanceof Error ? error.message : 'Unknown error'}`);
  }

  try {
    // Test 2: Fee Calculation
    const feeResponse = await testFeeCalculation();
    results.feeCalculation = await feeResponse.json();
  } catch (error) {
    results.errors.push(`Fee Calculation: ${error instanceof Error ? error.message : 'Unknown error'}`);
  }

  try {
    // Test 3: Payment Intent
    const paymentResponse = await testPaymentIntent();
    results.paymentIntent = await paymentResponse.json();
  } catch (error) {
    results.errors.push(`Payment Intent: ${error instanceof Error ? error.message : 'Unknown error'}`);
  }

  return new Response(JSON.stringify({
    success: results.errors.length === 0,
    message: results.errors.length === 0 ? 'All tests passed' : 'Some tests failed',
    results,
    summary: {
      totalTests: 3,
      passed: 3 - results.errors.length,
      failed: results.errors.length
    },
    timestamp: new Date().toISOString()
  }), {
    status: results.errors.length === 0 ? 200 : 207, // 207 = Multi-Status
    headers: { 'Content-Type': 'application/json' }
  });
}

function getTestScenarios(): Response {
  const scenarios: TestScenario[] = [
    {
      name: 'status',
      description: 'Check Stripe API connection and account status',
      testData: { endpoint: '/api/stripe/test-sandbox?scenario=status' }
    },
    {
      name: 'create-seller',
      description: 'Test creating a connected seller account',
      testData: { endpoint: '/api/stripe/test-sandbox?scenario=create-seller' }
    },
    {
      name: 'calculate-fees',
      description: 'Test platform fee calculations for different scenarios',
      testData: { endpoint: '/api/stripe/test-sandbox?scenario=calculate-fees' }
    },
    {
      name: 'payment-intent',
      description: 'Test creating a payment intent for Autimind purchase',
      testData: { endpoint: '/api/stripe/test-sandbox?scenario=payment-intent' }
    },
    {
      name: 'all',
      description: 'Run all tests in sequence',
      testData: { endpoint: '/api/stripe/test-sandbox?scenario=all' }
    }
  ];

  return new Response(JSON.stringify({
    success: true,
    message: 'Stripe sandbox test scenarios for Autimind',
    scenarios,
    usage: {
      description: 'Add ?scenario=<name> to test specific functionality',
      examples: [
        'GET /api/stripe/test-sandbox?scenario=status',
        'GET /api/stripe/test-sandbox?scenario=all'
      ]
    },
    environment: {
      recommended: 'sandbox/test mode',
      current: process.env.STRIPE_SECRET_KEY?.includes('_test_') ? 'sandbox' : 'production'
    }
  }), {
    status: 200,
    headers: { 'Content-Type': 'application/json' }
  });
}

export const POST: APIRoute = async ({ request }) => {
  try {
    const { action, testData } = await request.json();

    switch (action) {
      case 'create-checkout-session':
        return createTestCheckoutSession(testData);
      case 'simulate-webhook':
        return simulateWebhookEvent(testData);
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
      error: 'Failed to process POST request',
      details: error instanceof Error ? error.message : 'Unknown error'
    }), {
      status: 500,
      headers: { 'Content-Type': 'application/json' }
    });
  }
};

async function createTestCheckoutSession(testData: any): Promise<Response> {
  try {
    const session = await stripe.checkout.sessions.create({
      payment_method_types: ['card'],
      line_items: [
        {
          price_data: {
            currency: 'usd',
            product_data: {
              name: testData.productName || 'Test Autimind Package',
              description: testData.description || 'Test purchase for Autimind platform',
            },
            unit_amount: testData.amount || 9900, // $99.00
          },
          quantity: 1,
        },
      ],
      mode: 'payment',
      success_url: 'http://localhost:4322/test/stripe/success?session_id={CHECKOUT_SESSION_ID}',
      cancel_url: 'http://localhost:4322/test/stripe/cancel',
      metadata: {
        test: 'true',
        platform: 'autimind',
        ...testData.metadata
      }
    });

    return new Response(JSON.stringify({
      success: true,
      message: 'Test checkout session created',
      session: {
        id: session.id,
        url: session.url,
        amount_total: session.amount_total,
        currency: session.currency
      }
    }), {
      status: 200,
      headers: { 'Content-Type': 'application/json' }
    });
  } catch (error) {
    return new Response(JSON.stringify({
      success: false,
      error: 'Failed to create checkout session',
      details: error instanceof Error ? error.message : 'Unknown error'
    }), {
      status: 500,
      headers: { 'Content-Type': 'application/json' }
    });
  }
}

async function simulateWebhookEvent(testData: any): Promise<Response> {
  const mockEvent = {
    id: `evt_test_${Date.now()}`,
    object: 'event',
    type: testData.eventType || 'checkout.session.completed',
    data: {
      object: {
        id: `cs_test_${Date.now()}`,
        object: 'checkout.session',
        amount_total: testData.amount || 9900,
        currency: 'usd',
        metadata: {
          test: 'true',
          platform: 'autimind'
        }
      }
    },
    created: Math.floor(Date.now() / 1000),
    livemode: false
  };

  return new Response(JSON.stringify({
    success: true,
    message: 'Mock webhook event created',
    event: mockEvent,
    note: 'This is a simulated event for testing purposes'
  }), {
    status: 200,
    headers: { 'Content-Type': 'application/json' }
  });
}