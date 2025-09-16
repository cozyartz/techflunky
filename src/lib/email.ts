// Email service for TechFlunky marketplace using MailerSend REST API
export class TechFlunkyEmailService {
  private apiToken: string;
  private baseUrl = 'https://api.mailersend.com/v1';
  private fromEmail = {
    email: 'noreply@techflunky.com',
    name: 'TechFlunky Platform'
  };

  constructor(apiToken: string) {
    this.apiToken = apiToken;
  }

  private async sendEmail(emailData: any) {
    const response = await fetch(`${this.baseUrl}/email`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${this.apiToken}`,
      },
      body: JSON.stringify(emailData)
    });

    if (!response.ok) {
      const error = await response.text();
      throw new Error(`MailerSend API error: ${response.status} - ${error}`);
    }

    return await response.json();
  }

  // Welcome email for new users
  async sendWelcomeEmail(userEmail: string, userName: string, userRole: 'seller' | 'investor' | 'user') {
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

    const emailData = {
      from: this.fromEmail,
      to: [{ email: userEmail, name: userName }],
      subject: content.subject,
      html: `
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
      `,
      text: `Welcome to TechFlunky, ${userName}! ${content.message} Get started at: https://techflunky.com/dashboard`
    };

    return await this.sendEmail(emailData);
  }

  // Magic link authentication email
  async sendMagicLink(userEmail: string, userName: string, magicLink: string) {
    const emailData = {
      from: this.fromEmail,
      to: [{ email: userEmail, name: userName }],
      subject: 'Your TechFlunky Login Link',
      html: `
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
      `,
      text: `Hi ${userName}, click this link to log in to TechFlunky: ${magicLink} (expires in 15 minutes)`
    };

    return await this.sendEmail(emailData);
  }

  // Platform listing approved notification
  async sendListingApproved(sellerEmail: string, sellerName: string, platformTitle: string, listingUrl: string) {
    const emailData = {
      from: this.fromEmail,
      to: [{ email: sellerEmail, name: sellerName }],
      subject: `✅ "${platformTitle}" is now live on TechFlunky`,
      html: `
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
      `,
      text: `Congratulations ${sellerName}! "${platformTitle}" is now live on TechFlunky: ${listingUrl}`
    };

    return await this.sendEmail(emailData);
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