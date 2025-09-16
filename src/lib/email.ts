import { MailerSend, EmailParams, Sender, Recipient } from 'mailersend';

// Email service for TechFlunky marketplace
export class TechFlunkyEmailService {
  private mailerSend: MailerSend;
  private fromEmail: Sender;

  constructor(apiToken: string) {
    this.mailerSend = new MailerSend({
      apiKey: apiToken,
    });

    // TechFlunky official sender
    this.fromEmail = new Sender('noreply@techflunky.com', 'TechFlunky Platform');
  }

  // Welcome email for new users
  async sendWelcomeEmail(userEmail: string, userName: string, userRole: 'seller' | 'investor' | 'user') {
    const recipients = [new Recipient(userEmail, userName)];

    const roleMessages = {
      seller: {
        subject: 'Welcome to TechFlunky - Start Selling Your Platforms',
        message: `Ready to turn your code into revenue? You're now part of the TechFlunky marketplace where developers sell pre-built business platforms.`,
        cta: 'Create Your First Listing'
      },
      investor: {
        subject: 'Welcome to TechFlunky - Discover Investment Opportunities',
        message: `Welcome to the future of business investing. Browse AI-validated platforms ready for funding and scale.`,
        cta: 'Browse Opportunities'
      },
      user: {
        subject: 'Welcome to TechFlunky - Your Business Platform Awaits',
        message: `Skip the 12-18 months of development. Find your perfect pre-built business platform on TechFlunky.`,
        cta: 'Browse Platforms'
      }
    };

    const content = roleMessages[userRole];

    const emailParams = new EmailParams()
      .setFrom(this.fromEmail)
      .setTo(recipients)
      .setSubject(content.subject)
      .setHtml(`
        <!DOCTYPE html>
        <html>
        <head>
          <meta charset="utf-8">
          <meta name="viewport" content="width=device-width, initial-scale=1.0">
          <title>${content.subject}</title>
          <style>
            body { font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; margin: 0; padding: 0; background-color: #000000; }
            .container { max-width: 600px; margin: 0 auto; background-color: #111111; }
            .header { background: linear-gradient(135deg, #000000 0%, #1a1a1a 100%); padding: 40px 20px; text-align: center; border-bottom: 2px solid #fbbf24; }
            .logo { color: #fbbf24; font-size: 32px; font-weight: bold; margin-bottom: 10px; }
            .tagline { color: #9ca3af; font-size: 16px; }
            .content { padding: 40px 20px; color: #ffffff; }
            .greeting { font-size: 24px; font-weight: 600; color: #fbbf24; margin-bottom: 20px; }
            .message { font-size: 16px; line-height: 1.6; color: #d1d5db; margin-bottom: 30px; }
            .cta-button { display: inline-block; background: linear-gradient(135deg, #fbbf24 0%, #f59e0b 100%); color: #000000; text-decoration: none; padding: 16px 32px; border-radius: 8px; font-weight: 600; font-size: 16px; margin: 20px 0; }
            .stats { background-color: #1f1f1f; border-radius: 8px; padding: 20px; margin: 20px 0; }
            .stat { display: inline-block; text-align: center; margin: 0 20px; }
            .stat-number { font-size: 24px; font-weight: bold; color: #fbbf24; }
            .stat-label { font-size: 12px; color: #9ca3af; margin-top: 5px; }
            .footer { background-color: #0a0a0a; padding: 20px; text-align: center; color: #6b7280; font-size: 14px; }
          </style>
        </head>
        <body>
          <div class="container">
            <div class="header">
              <div class="logo">TechFlunky</div>
              <div class="tagline">Skip Development. Start Selling.</div>
            </div>
            <div class="content">
              <div class="greeting">Welcome, ${userName}!</div>
              <div class="message">${content.message}</div>

              <div class="stats">
                <div class="stat">
                  <div class="stat-number">30+</div>
                  <div class="stat-label">Platforms</div>
                </div>
                <div class="stat">
                  <div class="stat-number">8%</div>
                  <div class="stat-label">Success Fee</div>
                </div>
                <div class="stat">
                  <div class="stat-number">94%</div>
                  <div class="stat-label">AI Accuracy</div>
                </div>
              </div>

              <a href="https://techflunky.com/dashboard" class="cta-button">${content.cta}</a>

              <div class="message" style="margin-top: 30px; font-size: 14px;">
                Need help? Reply to this email or visit our <a href="https://techflunky.com/support" style="color: #fbbf24;">support center</a>.
              </div>
            </div>
            <div class="footer">
              <div>TechFlunky - The Marketplace for Pre-Built Business Platforms</div>
              <div style="margin-top: 10px;">
                <a href="https://techflunky.com/unsubscribe" style="color: #6b7280; text-decoration: none;">Unsubscribe</a> |
                <a href="https://techflunky.com/privacy" style="color: #6b7280; text-decoration: none;">Privacy Policy</a>
              </div>
            </div>
          </div>
        </body>
        </html>
      `)
      .setText(`Welcome to TechFlunky, ${userName}! ${content.message} Get started at: https://techflunky.com/dashboard`);

    return await this.mailerSend.email.send(emailParams);
  }

  // Magic link authentication email
  async sendMagicLink(userEmail: string, userName: string, magicLink: string) {
    const recipients = [new Recipient(userEmail, userName)];

    const emailParams = new EmailParams()
      .setFrom(this.fromEmail)
      .setTo(recipients)
      .setSubject('Your TechFlunky Login Link')
      .setHtml(`
        <!DOCTYPE html>
        <html>
        <head>
          <meta charset="utf-8">
          <meta name="viewport" content="width=device-width, initial-scale=1.0">
          <title>Your TechFlunky Login Link</title>
          <style>
            body { font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; margin: 0; padding: 0; background-color: #000000; }
            .container { max-width: 600px; margin: 0 auto; background-color: #111111; }
            .header { background: linear-gradient(135deg, #000000 0%, #1a1a1a 100%); padding: 40px 20px; text-align: center; border-bottom: 2px solid #fbbf24; }
            .logo { color: #fbbf24; font-size: 32px; font-weight: bold; margin-bottom: 10px; }
            .content { padding: 40px 20px; color: #ffffff; text-align: center; }
            .message { font-size: 16px; line-height: 1.6; color: #d1d5db; margin-bottom: 30px; }
            .login-button { display: inline-block; background: linear-gradient(135deg, #fbbf24 0%, #f59e0b 100%); color: #000000; text-decoration: none; padding: 16px 32px; border-radius: 8px; font-weight: 600; font-size: 16px; margin: 20px 0; }
            .warning { background-color: #1f1f1f; border-left: 4px solid #f59e0b; padding: 15px; margin: 20px 0; font-size: 14px; color: #d1d5db; }
            .footer { background-color: #0a0a0a; padding: 20px; text-align: center; color: #6b7280; font-size: 14px; }
          </style>
        </head>
        <body>
          <div class="container">
            <div class="header">
              <div class="logo">TechFlunky</div>
            </div>
            <div class="content">
              <div class="message">Hi ${userName},</div>
              <div class="message">Click the button below to securely log in to your TechFlunky account:</div>

              <a href="${magicLink}" class="login-button">Log In to TechFlunky</a>

              <div class="warning">
                <strong>Security Note:</strong> This link will expire in 15 minutes and can only be used once. If you didn't request this login, please ignore this email.
              </div>
            </div>
            <div class="footer">
              <div>TechFlunky - The Marketplace for Pre-Built Business Platforms</div>
            </div>
          </div>
        </body>
        </html>
      `)
      .setText(`Hi ${userName}, click this link to log in to TechFlunky: ${magicLink} (expires in 15 minutes)`);

    return await this.mailerSend.email.send(emailParams);
  }

  // Platform listing approved notification
  async sendListingApproved(sellerEmail: string, sellerName: string, platformTitle: string, listingUrl: string) {
    const recipients = [new Recipient(sellerEmail, sellerName)];

    const emailParams = new EmailParams()
      .setFrom(this.fromEmail)
      .setTo(recipients)
      .setSubject(`✅ "${platformTitle}" is now live on TechFlunky`)
      .setHtml(`
        <!DOCTYPE html>
        <html>
        <head>
          <meta charset="utf-8">
          <meta name="viewport" content="width=device-width, initial-scale=1.0">
          <title>Platform Approved</title>
          <style>
            body { font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; margin: 0; padding: 0; background-color: #000000; }
            .container { max-width: 600px; margin: 0 auto; background-color: #111111; }
            .header { background: linear-gradient(135deg, #000000 0%, #1a1a1a 100%); padding: 40px 20px; text-align: center; border-bottom: 2px solid #10b981; }
            .logo { color: #fbbf24; font-size: 32px; font-weight: bold; margin-bottom: 10px; }
            .success-icon { font-size: 48px; margin-bottom: 20px; }
            .content { padding: 40px 20px; color: #ffffff; }
            .message { font-size: 16px; line-height: 1.6; color: #d1d5db; margin-bottom: 20px; }
            .platform-title { font-size: 20px; font-weight: 600; color: #10b981; margin: 20px 0; }
            .cta-button { display: inline-block; background: linear-gradient(135deg, #10b981 0%, #059669 100%); color: #ffffff; text-decoration: none; padding: 16px 32px; border-radius: 8px; font-weight: 600; font-size: 16px; margin: 20px 0; }
            .tips { background-color: #1f1f1f; border-radius: 8px; padding: 20px; margin: 20px 0; }
            .footer { background-color: #0a0a0a; padding: 20px; text-align: center; color: #6b7280; font-size: 14px; }
          </style>
        </head>
        <body>
          <div class="container">
            <div class="header">
              <div class="logo">TechFlunky</div>
              <div class="success-icon">🎉</div>
            </div>
            <div class="content">
              <div class="message">Congratulations, ${sellerName}!</div>
              <div class="platform-title">"${platformTitle}"</div>
              <div class="message">Your platform has been approved and is now live on the TechFlunky marketplace!</div>

              <a href="${listingUrl}" class="cta-button">View Your Listing</a>

              <div class="tips">
                <strong style="color: #10b981;">Tips to increase sales:</strong>
                <ul style="color: #d1d5db; margin-top: 10px;">
                  <li>Share your listing on social media and developer communities</li>
                  <li>Keep your documentation and demo updated</li>
                  <li>Respond quickly to buyer inquiries</li>
                  <li>Consider offering implementation support</li>
                </ul>
              </div>
            </div>
            <div class="footer">
              <div>Ready to sell? We're here to help - reply to this email anytime.</div>
            </div>
          </div>
        </body>
        </html>
      `)
      .setText(`Congratulations ${sellerName}! "${platformTitle}" is now live on TechFlunky: ${listingUrl}`);

    return await this.mailerSend.email.send(emailParams);
  }

  // Sale notification for sellers
  async sendSaleNotification(sellerEmail: string, sellerName: string, platformTitle: string, saleAmount: number, buyerName: string) {
    const recipients = [new Recipient(sellerEmail, sellerName)];
    const earnings = Math.round(saleAmount * 0.92); // 8% platform fee

    const emailParams = new EmailParams()
      .setFrom(this.fromEmail)
      .setTo(recipients)
      .setSubject(`🎉 Sale Confirmed - ${platformTitle} sold for $${saleAmount.toLocaleString()}`)
      .setHtml(`
        <!DOCTYPE html>
        <html>
        <head>
          <meta charset="utf-8">
          <meta name="viewport" content="width=device-width, initial-scale=1.0">
          <title>Sale Confirmed</title>
          <style>
            body { font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; margin: 0; padding: 0; background-color: #000000; }
            .container { max-width: 600px; margin: 0 auto; background-color: #111111; }
            .header { background: linear-gradient(135deg, #000000 0%, #1a1a1a 100%); padding: 40px 20px; text-align: center; border-bottom: 2px solid #10b981; }
            .logo { color: #fbbf24; font-size: 32px; font-weight: bold; margin-bottom: 10px; }
            .content { padding: 40px 20px; color: #ffffff; }
            .sale-amount { font-size: 36px; font-weight: bold; color: #10b981; text-align: center; margin: 20px 0; }
            .earnings-box { background-color: #1f1f1f; border-radius: 8px; padding: 20px; margin: 20px 0; text-align: center; }
            .message { font-size: 16px; line-height: 1.6; color: #d1d5db; margin-bottom: 20px; }
            .cta-button { display: inline-block; background: linear-gradient(135deg, #fbbf24 0%, #f59e0b 100%); color: #000000; text-decoration: none; padding: 16px 32px; border-radius: 8px; font-weight: 600; font-size: 16px; margin: 20px 0; }
            .footer { background-color: #0a0a0a; padding: 20px; text-align: center; color: #6b7280; font-size: 14px; }
          </style>
        </head>
        <body>
          <div class="container">
            <div class="header">
              <div class="logo">TechFlunky</div>
            </div>
            <div class="content">
              <div class="message">🎉 Great news, ${sellerName}!</div>
              <div class="message">"${platformTitle}" has been sold to ${buyerName}!</div>

              <div class="sale-amount">$${saleAmount.toLocaleString()}</div>

              <div class="earnings-box">
                <div style="color: #10b981; font-size: 18px; margin-bottom: 10px;">Your Earnings</div>
                <div style="font-size: 28px; font-weight: bold; color: #10b981;">$${earnings.toLocaleString()}</div>
                <div style="color: #9ca3af; font-size: 14px; margin-top: 5px;">After 8% platform fee</div>
              </div>

              <div class="message">Payment will be processed within 24 hours and transferred to your connected account.</div>

              <a href="https://techflunky.com/dashboard/seller/earnings" class="cta-button">View Earnings</a>
            </div>
            <div class="footer">
              <div>Thank you for being part of the TechFlunky marketplace!</div>
            </div>
          </div>
        </body>
        </html>
      `)
      .setText(`Congratulations ${sellerName}! "${platformTitle}" sold for $${saleAmount.toLocaleString()}. Your earnings: $${earnings.toLocaleString()}`);

    return await this.mailerSend.email.send(emailParams);
  }

  // Purchase confirmation for buyers
  async sendPurchaseConfirmation(buyerEmail: string, buyerName: string, platformTitle: string, amount: number, deploymentUrl?: string) {
    const recipients = [new Recipient(buyerEmail, buyerName)];

    const emailParams = new EmailParams()
      .setFrom(this.fromEmail)
      .setTo(recipients)
      .setSubject(`Welcome to your new business - ${platformTitle}`)
      .setHtml(`
        <!DOCTYPE html>
        <html>
        <head>
          <meta charset="utf-8">
          <meta name="viewport" content="width=device-width, initial-scale=1.0">
          <title>Purchase Confirmed</title>
          <style>
            body { font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; margin: 0; padding: 0; background-color: #000000; }
            .container { max-width: 600px; margin: 0 auto; background-color: #111111; }
            .header { background: linear-gradient(135deg, #000000 0%, #1a1a1a 100%); padding: 40px 20px; text-align: center; border-bottom: 2px solid #3b82f6; }
            .logo { color: #fbbf24; font-size: 32px; font-weight: bold; margin-bottom: 10px; }
            .content { padding: 40px 20px; color: #ffffff; }
            .platform-title { font-size: 24px; font-weight: 600; color: #3b82f6; margin: 20px 0; text-align: center; }
            .message { font-size: 16px; line-height: 1.6; color: #d1d5db; margin-bottom: 20px; }
            .deployment-box { background-color: #1f1f1f; border-radius: 8px; padding: 20px; margin: 20px 0; }
            .cta-button { display: inline-block; background: linear-gradient(135deg, #3b82f6 0%, #2563eb 100%); color: #ffffff; text-decoration: none; padding: 16px 32px; border-radius: 8px; font-weight: 600; font-size: 16px; margin: 20px 0; }
            .next-steps { background-color: #1f1f1f; border-radius: 8px; padding: 20px; margin: 20px 0; }
            .footer { background-color: #0a0a0a; padding: 20px; text-align: center; color: #6b7280; font-size: 14px; }
          </style>
        </head>
        <body>
          <div class="container">
            <div class="header">
              <div class="logo">TechFlunky</div>
            </div>
            <div class="content">
              <div class="message">Congratulations, ${buyerName}!</div>
              <div class="platform-title">${platformTitle}</div>
              <div class="message">Your purchase is confirmed and your business platform is ready to launch!</div>

              ${deploymentUrl ? `
                <div class="deployment-box">
                  <div style="color: #3b82f6; font-weight: 600; margin-bottom: 10px;">🚀 Your Platform is Live</div>
                  <div style="color: #d1d5db; margin-bottom: 15px;">Your business is deployed and running at:</div>
                  <div style="background-color: #000000; padding: 10px; border-radius: 4px; font-family: monospace; word-break: break-all;">
                    <a href="${deploymentUrl}" style="color: #3b82f6; text-decoration: none;">${deploymentUrl}</a>
                  </div>
                </div>
              ` : ''}

              <div class="next-steps">
                <strong style="color: #3b82f6;">Next Steps:</strong>
                <ol style="color: #d1d5db; margin-top: 10px;">
                  <li>Access your admin dashboard and customize settings</li>
                  <li>Set up your domain name and branding</li>
                  <li>Configure payment processing</li>
                  <li>Launch your marketing campaigns</li>
                </ol>
              </div>

              <a href="https://techflunky.com/dashboard/buyer" class="cta-button">Access Dashboard</a>

              <div class="message">Need help getting started? Our support team is here for you - just reply to this email!</div>
            </div>
            <div class="footer">
              <div>Welcome to entrepreneurship! 🚀</div>
            </div>
          </div>
        </body>
        </html>
      `)
      .setText(`Congratulations ${buyerName}! Your "${platformTitle}" purchase is confirmed. ${deploymentUrl ? `Live at: ${deploymentUrl}` : ''} Get started: https://techflunky.com/dashboard/buyer`);

    return await this.mailerSend.email.send(emailParams);
  }
}

// Helper function to initialize email service with environment
export function createEmailService(env: any): TechFlunkyEmailService {
  const apiToken = env.MAILERSEND_API_TOKEN;
  if (!apiToken) {
    throw new Error('MailerSend API token not configured');
  }
  return new TechFlunkyEmailService(apiToken);
}