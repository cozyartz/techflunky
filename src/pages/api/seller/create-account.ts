// API endpoint to create seller Stripe Connected Account
import type { APIRoute } from 'astro';
import { stripe, createSellerAccount } from '../../../lib/stripe-config';

export const POST: APIRoute = async ({ request }) => {
  try {
    const { firstName, lastName, email, businessType, businessName } = await request.json();
    
    // Create the connected account
    const account = await createSellerAccount({
      email,
      name: businessName || `${firstName} ${lastName}`,
      businessType: businessType as 'individual' | 'company',
    });
    
    // Create account link for onboarding
    const accountLink = await stripe.accountLinks.create({
      account: account.id,
      refresh_url: `${request.headers.get('origin')}/seller/onboarding`,
      return_url: `${request.headers.get('origin')}/seller/dashboard`,
      type: 'account_onboarding',
    });
    
    // TODO: In production, save account details to D1
    // await saveSellerToDatabase({
    //   stripeAccountId: account.id,
    //   email,
    //   firstName,
    //   lastName,
    //   businessName,
    //   businessType,
    // });
    
    return new Response(
      JSON.stringify({
        accountId: account.id,
        accountLinkUrl: accountLink.url,
      }),
      {
        status: 200,
        headers: { 'Content-Type': 'application/json' }
      }
    );
  } catch (error) {
    console.error('Seller account creation error:', error);
    return new Response(
      JSON.stringify({ error: 'Failed to create seller account' }),
      {
        status: 500,
        headers: { 'Content-Type': 'application/json' }
      }
    );
  }
};
