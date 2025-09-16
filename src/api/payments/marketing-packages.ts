// Stripe Payment Integration for Marketing Packages
import type { APIContext } from 'astro';
import { MARKETING_PACKAGES, ADD_ON_SERVICES } from '../marketing/packages.ts';

// Create Stripe Payment Intent for marketing package
export async function POST({ request, locals }: APIContext) {
  const { DB, STRIPE_SECRET_KEY } = locals.runtime.env;

  try {
    const {
      userId,
      packageSlug,
      addOns = [],
      rushDelivery = false,
      metadata = {}
    } = await request.json();

    if (!userId || !packageSlug || !MARKETING_PACKAGES[packageSlug]) {
      return new Response(JSON.stringify({
        error: 'Valid user ID and package selection required'
      }), {
        status: 400,
        headers: { 'Content-Type': 'application/json' }
      });
    }

    const selectedPackage = MARKETING_PACKAGES[packageSlug];
    let totalAmount = selectedPackage.price;
    let orderItems = [{
      name: selectedPackage.name,
      amount: selectedPackage.price,
      quantity: 1
    }];

    // Calculate add-ons pricing
    for (const addonSlug of addOns) {
      if (ADD_ON_SERVICES[addonSlug]) {
        const addon = ADD_ON_SERVICES[addonSlug];
        let addonPrice = addon.price || 0;

        if (addon.priceMultiplier && addonSlug === 'rushDelivery') {
          addonPrice = Math.round(selectedPackage.price * 0.5);
        }

        if (addonPrice > 0) {
          totalAmount += addonPrice;
          orderItems.push({
            name: addon.name,
            amount: addonPrice,
            quantity: 1
          });
        }
      }
    }

    // Rush delivery surcharge
    if (rushDelivery && !addOns.includes('rushDelivery')) {
      const rushFee = Math.round(selectedPackage.price * 0.5);
      totalAmount += rushFee;
      orderItems.push({
        name: 'Rush Delivery (50% faster)',
        amount: rushFee,
        quantity: 1
      });
    }

    // Create Stripe customer if needed
    const customerId = await createOrRetrieveCustomer(userId, STRIPE_SECRET_KEY);

    // Create Payment Intent
    const paymentIntent = await createPaymentIntent({
      amount: totalAmount,
      currency: 'usd',
      customerId,
      description: `Marketing Package: ${selectedPackage.name}`,
      metadata: {
        userId,
        packageSlug,
        packageName: selectedPackage.name,
        addOns: JSON.stringify(addOns),
        rushDelivery: rushDelivery.toString(),
        platform: 'techflunky',
        service_type: 'marketing_package',
        ...metadata
      },
      stripeSecretKey: STRIPE_SECRET_KEY
    });

    // Store pending order in database
    const orderId = generateOrderId();
    const now = Math.floor(Date.now() / 1000);

    await DB.prepare(`
      INSERT INTO marketing_package_orders (
        id, user_id, package_slug, stripe_payment_intent_id,
        total_amount, order_items, add_ons, rush_delivery,
        status, created_at, updated_at
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, 'pending_payment', ?, ?)
    `).bind(
      orderId,
      userId,
      packageSlug,
      paymentIntent.id,
      totalAmount,
      JSON.stringify(orderItems),
      JSON.stringify(addOns),
      rushDelivery ? 1 : 0,
      now,
      now
    ).run();

    return new Response(JSON.stringify({
      success: true,
      clientSecret: paymentIntent.client_secret,
      orderId,
      totalAmount,
      totalAmountFormatted: `$${(totalAmount / 100).toLocaleString()}`,
      orderItems,
      paymentIntentId: paymentIntent.id
    }), {
      headers: { 'Content-Type': 'application/json' }
    });

  } catch (error) {
    console.error('Error creating marketing package payment:', error);
    return new Response(JSON.stringify({
      error: 'Failed to create payment. Please try again.'
    }), {
      status: 500,
      headers: { 'Content-Type': 'application/json' }
    });
  }
}

// Confirm payment and activate marketing package order
export async function PUT({ request, locals }: APIContext) {
  const { DB, STRIPE_SECRET_KEY } = locals.runtime.env;

  try {
    const { paymentIntentId, userId } = await request.json();

    if (!paymentIntentId || !userId) {
      return new Response(JSON.stringify({
        error: 'Payment Intent ID and User ID required'
      }), {
        status: 400,
        headers: { 'Content-Type': 'application/json' }
      });
    }

    // Verify payment with Stripe
    const paymentIntent = await retrievePaymentIntent(paymentIntentId, STRIPE_SECRET_KEY);

    if (paymentIntent.status !== 'succeeded') {
      return new Response(JSON.stringify({
        error: 'Payment not completed',
        status: paymentIntent.status
      }), {
        status: 400,
        headers: { 'Content-Type': 'application/json' }
      });
    }

    // Update order status in database
    const now = Math.floor(Date.now() / 1000);
    const deliveryDays = calculateDeliveryDays(paymentIntent.metadata.packageSlug, paymentIntent.metadata.rushDelivery === 'true');
    const estimatedDelivery = now + (deliveryDays * 24 * 60 * 60);

    await DB.prepare(`
      UPDATE marketing_package_orders
      SET status = 'confirmed',
          stripe_payment_status = 'succeeded',
          estimated_delivery = ?,
          updated_at = ?
      WHERE stripe_payment_intent_id = ? AND user_id = ?
    `).bind(estimatedDelivery, now, paymentIntentId, userId).run();

    // Record revenue analytics
    await DB.prepare(`
      INSERT INTO revenue_analytics (
        transaction_type, transaction_id, gross_amount, platform_fee,
        net_amount, user_id, metadata, created_at
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?)
    `).bind(
      'marketing_package',
      paymentIntentId,
      paymentIntent.amount,
      paymentIntent.amount, // Full amount is platform revenue
      0, // Net to user is 0 for service purchases
      userId,
      JSON.stringify({
        packageSlug: paymentIntent.metadata.packageSlug,
        packageName: paymentIntent.metadata.packageName,
        addOns: paymentIntent.metadata.addOns,
        rushDelivery: paymentIntent.metadata.rushDelivery
      }),
      now
    ).run();

    // Trigger fulfillment workflow (placeholder)
    await triggerFulfillmentWorkflow(paymentIntent.metadata, userId);

    return new Response(JSON.stringify({
      success: true,
      message: 'Payment confirmed and order activated',
      estimatedDelivery: new Date(estimatedDelivery * 1000).toLocaleDateString(),
      nextSteps: [
        'Our team has been notified of your order',
        'You will receive a project kick-off email within 4 hours',
        'Work begins immediately with regular progress updates',
        `Expected completion: ${new Date(estimatedDelivery * 1000).toLocaleDateString()}`
      ]
    }), {
      headers: { 'Content-Type': 'application/json' }
    });

  } catch (error) {
    console.error('Error confirming marketing package payment:', error);
    return new Response(JSON.stringify({
      error: 'Failed to confirm payment. Please contact support.'
    }), {
      status: 500,
      headers: { 'Content-Type': 'application/json' }
    });
  }
}

// Helper functions
async function createOrRetrieveCustomer(userId: string, stripeSecretKey: string): Promise<string> {
  if (!stripeSecretKey) {
    return `cus_mock_${userId}`;
  }

  try {
    // Search for existing customer
    const searchResponse = await fetch(`https://api.stripe.com/v1/customers/search?query=metadata['userId']:'${userId}'`, {
      headers: { 'Authorization': `Bearer ${stripeSecretKey}` }
    });

    const searchData = await searchResponse.json();

    if (searchData.data && searchData.data.length > 0) {
      return searchData.data[0].id;
    }

    // Create new customer
    const createResponse = await fetch('https://api.stripe.com/v1/customers', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${stripeSecretKey}`,
        'Content-Type': 'application/x-www-form-urlencoded'
      },
      body: new URLSearchParams({
        'metadata[userId]': userId,
        'metadata[platform]': 'techflunky'
      })
    });

    const customerData = await createResponse.json();
    return customerData.id;

  } catch (error) {
    console.error('Error creating Stripe customer:', error);
    return `cus_mock_${userId}`;
  }
}

async function createPaymentIntent(params: {
  amount: number;
  currency: string;
  customerId: string;
  description: string;
  metadata: Record<string, string>;
  stripeSecretKey: string;
}): Promise<any> {
  const { amount, currency, customerId, description, metadata, stripeSecretKey } = params;

  if (!stripeSecretKey) {
    // Mock payment intent for development
    return {
      id: `pi_mock_${Date.now()}`,
      client_secret: `pi_mock_${Date.now()}_secret_mock`,
      amount,
      currency,
      status: 'requires_payment_method'
    };
  }

  const response = await fetch('https://api.stripe.com/v1/payment_intents', {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${stripeSecretKey}`,
      'Content-Type': 'application/x-www-form-urlencoded'
    },
    body: new URLSearchParams({
      amount: amount.toString(),
      currency,
      customer: customerId,
      description,
      'automatic_payment_methods[enabled]': 'true',
      ...Object.entries(metadata).reduce((acc, [key, value]) => {
        acc[`metadata[${key}]`] = value;
        return acc;
      }, {} as Record<string, string>)
    })
  });

  if (!response.ok) {
    const errorData = await response.json();
    throw new Error(`Stripe Payment Intent creation failed: ${errorData.error?.message || 'Unknown error'}`);
  }

  return await response.json();
}

async function retrievePaymentIntent(paymentIntentId: string, stripeSecretKey: string): Promise<any> {
  if (!stripeSecretKey) {
    // Mock successful payment for development
    return {
      id: paymentIntentId,
      status: 'succeeded',
      amount: 49900,
      metadata: {
        packageSlug: 'professional',
        packageName: 'Professional Package',
        addOns: '[]',
        rushDelivery: 'false'
      }
    };
  }

  const response = await fetch(`https://api.stripe.com/v1/payment_intents/${paymentIntentId}`, {
    headers: { 'Authorization': `Bearer ${stripeSecretKey}` }
  });

  if (!response.ok) {
    throw new Error('Failed to retrieve payment intent from Stripe');
  }

  return await response.json();
}

async function triggerFulfillmentWorkflow(metadata: any, userId: string): Promise<void> {
  // This would trigger your fulfillment system
  // For now, just log the order for manual processing
  console.log('New marketing package order:', {
    userId,
    packageSlug: metadata.packageSlug,
    packageName: metadata.packageName,
    addOns: metadata.addOns,
    rushDelivery: metadata.rushDelivery,
    timestamp: new Date().toISOString()
  });

  // In production, you might:
  // - Send email to fulfillment team
  // - Create project management tickets
  // - Trigger automated workflows
  // - Send confirmation email to customer
}

function calculateDeliveryDays(packageSlug: string, rushDelivery: boolean): number {
  const baseDays = {
    'diy-starter': 4,
    'professional': 6,
    'market-ready': 8,
    'investor-grade': 12
  };

  const days = baseDays[packageSlug] || 7;
  return rushDelivery ? Math.ceil(days / 2) : days;
}

function generateOrderId(): string {
  return `order_${crypto.getRandomValues(new Uint8Array(16)).reduce((str, byte) => str + byte.toString(16).padStart(2, '0'), '')}`;
}