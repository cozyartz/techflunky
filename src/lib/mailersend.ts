import { MailerSend, EmailParams, Sender, Recipient } from 'mailersend';

class MailerSendService {
  private mailerSend: MailerSend | null = null;
  private sender: Sender | null = null;
  private initialized = false;

  // Initialize with Cloudflare environment
  private async initialize(env?: any) {
    if (this.initialized && this.mailerSend && this.sender) return;

    // For Cloudflare Workers/Pages, use env object
    // For local development, fall back to process.env
    const MAILERSEND_API_KEY = env?.MAILERSEND_API_KEY || process.env.MAILERSEND_API_KEY;
    const FROM_EMAIL = env?.FROM_EMAIL || process.env.FROM_EMAIL || 'noreply@techflunky.com';
    const FROM_NAME = env?.FROM_NAME || process.env.FROM_NAME || 'TechFlunky';

    if (!MAILERSEND_API_KEY) {
      throw new Error('MAILERSEND_API_KEY is required. Configure it in Cloudflare dashboard secrets or .dev.vars');
    }

    this.mailerSend = new MailerSend({
      apiKey: MAILERSEND_API_KEY,
    });

    this.sender = new Sender(FROM_EMAIL, FROM_NAME);
    this.initialized = true;
  }

  // Helper method to ensure initialization
  private async ensureInitialized(env?: any) {
    if (!this.initialized || !this.mailerSend || !this.sender) {
      await this.initialize(env);
    }
  }

  /**
   * Send email verification message
   */
  async sendEmailVerification(to: string, verificationCode: string, userName?: string, env?: any): Promise<boolean> {
    try {
      await this.ensureInitialized(env);
      const recipients = [new Recipient(to, userName || '')];

      const emailParams = new EmailParams()
        .setFrom(this.sender!)
        .setTo(recipients)
        .setSubject('Verify Your Email - TechFlunky')
        .setHtml(this.getEmailVerificationTemplate(verificationCode, userName))
        .setText(`Verify your email with code: ${verificationCode}`);

      await this.mailerSend!.email.send(emailParams);
      console.log(`📧 Email verification sent to: ${to}`);
      return true;
    } catch (error) {
      console.error('Failed to send email verification:', error);
      return false;
    }
  }

  /**
   * Send offer notification to seller
   */
  async sendOfferNotification(
    sellerEmail: string,
    sellerName: string,
    platformTitle: string,
    offerAmount: number,
    buyerName: string,
    message?: string,
    env?: any
  ): Promise<boolean> {
    try {
      await this.ensureInitialized(env);
      const recipients = [new Recipient(sellerEmail, sellerName)];

      const emailParams = new EmailParams()
        .setFrom(this.sender!)
        .setTo(recipients)
        .setSubject(`New Offer: $${offerAmount.toLocaleString()} for ${platformTitle}`)
        .setHtml(this.getOfferNotificationTemplate(platformTitle, offerAmount, buyerName, sellerName, message))
        .setText(`New offer of $${offerAmount.toLocaleString()} from ${buyerName} for ${platformTitle}`);

      await this.mailerSend!.email.send(emailParams);
      console.log(`📧 Offer notification sent to: ${sellerEmail}`);
      return true;
    } catch (error) {
      console.error('Failed to send offer notification:', error);
      return false;
    }
  }

  /**
   * Send offer status update to buyer
   */
  async sendOfferStatusUpdate(
    buyerEmail: string,
    buyerName: string,
    platformTitle: string,
    offerAmount: number,
    status: 'accepted' | 'declined' | 'countered',
    counterAmount?: number,
    env?: any
  ): Promise<boolean> {
    try {
      await this.ensureInitialized(env);
      const recipients = [new Recipient(buyerEmail, buyerName)];
      const statusText = status === 'countered' ? `countered at $${counterAmount?.toLocaleString()}` : status;

      const emailParams = new EmailParams()
        .setFrom(this.sender!)
        .setTo(recipients)
        .setSubject(`Offer ${statusText.toUpperCase()}: ${platformTitle}`)
        .setHtml(this.getOfferStatusTemplate(platformTitle, offerAmount, status, buyerName, counterAmount))
        .setText(`Your offer for ${platformTitle} has been ${statusText}`);

      await this.mailerSend!.email.send(emailParams);
      console.log(`📧 Offer status update sent to: ${buyerEmail}`);
      return true;
    } catch (error) {
      console.error('Failed to send offer status update:', error);
      return false;
    }
  }

  /**
   * Send platform deployment notification
   */
  async sendDeploymentNotification(
    buyerEmail: string,
    buyerName: string,
    platformTitle: string,
    deploymentUrl: string,
    accessCredentials?: { username: string; password: string },
    env?: any
  ): Promise<boolean> {
    try {
      await this.ensureInitialized(env);
      const recipients = [new Recipient(buyerEmail, buyerName)];

      const emailParams = new EmailParams()
        .setFrom(this.sender!)
        .setTo(recipients)
        .setSubject(`🚀 Your Platform is Live: ${platformTitle}`)
        .setHtml(this.getDeploymentTemplate(platformTitle, deploymentUrl, buyerName, accessCredentials))
        .setText(`Your platform ${platformTitle} is now live at: ${deploymentUrl}`);

      await this.mailerSend!.email.send(emailParams);
      console.log(`📧 Deployment notification sent to: ${buyerEmail}`);
      return true;
    } catch (error) {
      console.error('Failed to send deployment notification:', error);
      return false;
    }
  }

  /**
   * Send admin notification for high-value offers
   */
  async sendAdminNotification(
    platformTitle: string,
    offerAmount: number,
    buyerEmail: string,
    sellerEmail: string,
    env?: any
  ): Promise<boolean> {
    try {
      await this.ensureInitialized(env);
      const adminEmail = 'admin@techflunky.com';
      const recipients = [new Recipient(adminEmail, 'TechFlunky Admin')];

      const emailParams = new EmailParams()
        .setFrom(this.sender!)
        .setTo(recipients)
        .setSubject(`🎯 High-Value Offer Alert: $${offerAmount.toLocaleString()}`)
        .setHtml(this.getAdminNotificationTemplate(platformTitle, offerAmount, buyerEmail, sellerEmail))
        .setText(`High-value offer: $${offerAmount.toLocaleString()} for ${platformTitle}`);

      await this.mailerSend!.email.send(emailParams);
      console.log(`📧 Admin notification sent for high-value offer: $${offerAmount}`);
      return true;
    } catch (error) {
      console.error('Failed to send admin notification:', error);
      return false;
    }
  }

  // Email Templates
  private getEmailVerificationTemplate(code: string, userName?: string): string {
    return `
    <!DOCTYPE html>
    <html>
    <head>
      <meta charset="utf-8">
      <meta name="viewport" content="width=device-width, initial-scale=1.0">
      <title>Verify Your Email - TechFlunky</title>
    </head>
    <body style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; line-height: 1.6; color: #333; max-width: 600px; margin: 0 auto; padding: 20px;">
      <div style="background: linear-gradient(135deg, #000000 0%, #1a1a1a 100%); padding: 40px 20px; text-align: center; border-radius: 10px 10px 0 0;">
        <h1 style="color: #fbbf24; margin: 0; font-size: 28px; font-weight: bold;">TechFlunky</h1>
        <p style="color: #ffffff; margin: 10px 0 0 0; font-size: 16px;">AI-Powered Business Marketplace</p>
      </div>

      <div style="background: #ffffff; padding: 40px; border-radius: 0 0 10px 10px; box-shadow: 0 4px 6px rgba(0, 0, 0, 0.1);">
        <h2 style="color: #1f2937; margin: 0 0 20px 0;">Verify Your Email Address</h2>

        ${userName ? `<p>Hi ${userName},</p>` : '<p>Hello,</p>'}

        <p>Thank you for joining TechFlunky! Please verify your email address by using the verification code below:</p>

        <div style="background: #f3f4f6; border: 2px dashed #fbbf24; border-radius: 8px; padding: 30px; text-align: center; margin: 30px 0;">
          <p style="margin: 0 0 10px 0; color: #6b7280; font-size: 14px;">Your verification code:</p>
          <p style="font-size: 32px; font-weight: bold; color: #1f2937; margin: 0; letter-spacing: 4px; font-family: monospace;">${code}</p>
        </div>

        <p style="color: #6b7280; font-size: 14px; margin: 20px 0;">This code will expire in 10 minutes for security purposes.</p>

        <p>If you didn't create an account with TechFlunky, please ignore this email.</p>

        <p style="margin: 30px 0 0 0;">
          Best regards,<br>
          <strong>The TechFlunky Team</strong>
        </p>
      </div>

      <div style="text-align: center; padding: 20px; color: #6b7280; font-size: 12px;">
        <p>© 2024 TechFlunky. All rights reserved.</p>
        <p>This email was sent because you signed up for TechFlunky.</p>
      </div>
    </body>
    </html>
    `;
  }

  private getOfferNotificationTemplate(
    platformTitle: string,
    offerAmount: number,
    buyerName: string,
    sellerName: string,
    message?: string
  ): string {
    return `
    <!DOCTYPE html>
    <html>
    <head>
      <meta charset="utf-8">
      <meta name="viewport" content="width=device-width, initial-scale=1.0">
      <title>New Offer - TechFlunky</title>
    </head>
    <body style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; line-height: 1.6; color: #333; max-width: 600px; margin: 0 auto; padding: 20px;">
      <div style="background: linear-gradient(135deg, #000000 0%, #1a1a1a 100%); padding: 40px 20px; text-align: center; border-radius: 10px 10px 0 0;">
        <h1 style="color: #fbbf24; margin: 0; font-size: 28px; font-weight: bold;">🎯 New Offer!</h1>
        <p style="color: #ffffff; margin: 10px 0 0 0; font-size: 16px;">Someone wants to buy your platform</p>
      </div>

      <div style="background: #ffffff; padding: 40px; border-radius: 0 0 10px 10px; box-shadow: 0 4px 6px rgba(0, 0, 0, 0.1);">
        <h2 style="color: #1f2937; margin: 0 0 20px 0;">You've received an offer!</h2>

        <p>Hi ${sellerName},</p>

        <p>Great news! <strong>${buyerName}</strong> has made an offer on your platform:</p>

        <div style="background: #f3f4f6; border-left: 4px solid #10b981; padding: 20px; margin: 20px 0; border-radius: 0 8px 8px 0;">
          <h3 style="margin: 0 0 10px 0; color: #1f2937;">${platformTitle}</h3>
          <p style="font-size: 24px; color: #10b981; font-weight: bold; margin: 5px 0;">$${offerAmount.toLocaleString()}</p>
          <p style="color: #6b7280; font-size: 14px; margin: 5px 0;">Offer Amount</p>
        </div>

        ${message ? `
        <div style="background: #f9fafb; border: 1px solid #e5e7eb; border-radius: 8px; padding: 20px; margin: 20px 0;">
          <h4 style="margin: 0 0 10px 0; color: #1f2937;">Message from buyer:</h4>
          <p style="margin: 0; color: #6b7280; font-style: italic;">"${message}"</p>
        </div>
        ` : ''}

        <p style="margin: 30px 0 20px 0;">
          <a href="https://techflunky.com/dashboard/seller/offers"
             style="background: #fbbf24; color: #000000; padding: 12px 30px; text-decoration: none; border-radius: 8px; font-weight: bold; display: inline-block;">
            View & Respond to Offer
          </a>
        </p>

        <p style="color: #6b7280; font-size: 14px;">This offer expires in 72 hours. Don't miss out!</p>

        <p style="margin: 30px 0 0 0;">
          Best regards,<br>
          <strong>The TechFlunky Team</strong>
        </p>
      </div>

      <div style="text-align: center; padding: 20px; color: #6b7280; font-size: 12px;">
        <p>© 2024 TechFlunky. All rights reserved.</p>
      </div>
    </body>
    </html>
    `;
  }

  private getOfferStatusTemplate(
    platformTitle: string,
    offerAmount: number,
    status: 'accepted' | 'declined' | 'countered',
    buyerName: string,
    counterAmount?: number
  ): string {
    const statusColors = {
      accepted: '#10b981',
      declined: '#ef4444',
      countered: '#f59e0b'
    };

    const statusEmojis = {
      accepted: '🎉',
      declined: '😔',
      countered: '🔄'
    };

    return `
    <!DOCTYPE html>
    <html>
    <head>
      <meta charset="utf-8">
      <meta name="viewport" content="width=device-width, initial-scale=1.0">
      <title>Offer ${status.toUpperCase()} - TechFlunky</title>
    </head>
    <body style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; line-height: 1.6; color: #333; max-width: 600px; margin: 0 auto; padding: 20px;">
      <div style="background: linear-gradient(135deg, #000000 0%, #1a1a1a 100%); padding: 40px 20px; text-align: center; border-radius: 10px 10px 0 0;">
        <h1 style="color: #fbbf24; margin: 0; font-size: 28px; font-weight: bold;">${statusEmojis[status]} Offer ${status.charAt(0).toUpperCase() + status.slice(1)}</h1>
        <p style="color: #ffffff; margin: 10px 0 0 0; font-size: 16px;">Update on your offer</p>
      </div>

      <div style="background: #ffffff; padding: 40px; border-radius: 0 0 10px 10px; box-shadow: 0 4px 6px rgba(0, 0, 0, 0.1);">
        <h2 style="color: #1f2937; margin: 0 0 20px 0;">Offer Update</h2>

        <p>Hi ${buyerName},</p>

        <p>Your offer for <strong>${platformTitle}</strong> has been <strong style="color: ${statusColors[status]};">${status}</strong>.</p>

        <div style="background: #f3f4f6; border-left: 4px solid ${statusColors[status]}; padding: 20px; margin: 20px 0; border-radius: 0 8px 8px 0;">
          <h3 style="margin: 0 0 10px 0; color: #1f2937;">${platformTitle}</h3>
          <p style="font-size: 18px; color: #6b7280; margin: 5px 0;">Your offer: <strong>$${offerAmount.toLocaleString()}</strong></p>
          ${status === 'countered' && counterAmount ? `
            <p style="font-size: 20px; color: ${statusColors[status]}; font-weight: bold; margin: 10px 0;">Counter offer: $${counterAmount.toLocaleString()}</p>
          ` : ''}
        </div>

        ${status === 'accepted' ? `
        <p style="color: #10b981; font-weight: bold;">🎉 Congratulations! Your offer has been accepted. We'll be in touch shortly with next steps.</p>
        <p style="margin: 30px 0 20px 0;">
          <a href="https://techflunky.com/dashboard/buyer/purchases"
             style="background: #10b981; color: #ffffff; padding: 12px 30px; text-decoration: none; border-radius: 8px; font-weight: bold; display: inline-block;">
            View Purchase Details
          </a>
        </p>
        ` : status === 'countered' ? `
        <p>The seller has made a counter offer. You can accept, decline, or make another counter offer.</p>
        <p style="margin: 30px 0 20px 0;">
          <a href="https://techflunky.com/dashboard/buyer/offers"
             style="background: #f59e0b; color: #000000; padding: 12px 30px; text-decoration: none; border-radius: 8px; font-weight: bold; display: inline-block;">
            Respond to Counter Offer
          </a>
        </p>
        ` : `
        <p>Unfortunately, your offer was not accepted this time. Don't give up - there are many other great platforms available!</p>
        <p style="margin: 30px 0 20px 0;">
          <a href="https://techflunky.com/browse"
             style="background: #6b7280; color: #ffffff; padding: 12px 30px; text-decoration: none; border-radius: 8px; font-weight: bold; display: inline-block;">
            Browse Other Platforms
          </a>
        </p>
        `}

        <p style="margin: 30px 0 0 0;">
          Best regards,<br>
          <strong>The TechFlunky Team</strong>
        </p>
      </div>

      <div style="text-align: center; padding: 20px; color: #6b7280; font-size: 12px;">
        <p>© 2024 TechFlunky. All rights reserved.</p>
      </div>
    </body>
    </html>
    `;
  }

  private getDeploymentTemplate(
    platformTitle: string,
    deploymentUrl: string,
    buyerName: string,
    accessCredentials?: { username: string; password: string }
  ): string {
    return `
    <!DOCTYPE html>
    <html>
    <head>
      <meta charset="utf-8">
      <meta name="viewport" content="width=device-width, initial-scale=1.0">
      <title>Platform Deployed - TechFlunky</title>
    </head>
    <body style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; line-height: 1.6; color: #333; max-width: 600px; margin: 0 auto; padding: 20px;">
      <div style="background: linear-gradient(135deg, #10b981 0%, #059669 100%); padding: 40px 20px; text-align: center; border-radius: 10px 10px 0 0;">
        <h1 style="color: #ffffff; margin: 0; font-size: 28px; font-weight: bold;">🚀 Platform Deployed!</h1>
        <p style="color: #dcfce7; margin: 10px 0 0 0; font-size: 16px;">Your business is now live</p>
      </div>

      <div style="background: #ffffff; padding: 40px; border-radius: 0 0 10px 10px; box-shadow: 0 4px 6px rgba(0, 0, 0, 0.1);">
        <h2 style="color: #1f2937; margin: 0 0 20px 0;">Congratulations!</h2>

        <p>Hi ${buyerName},</p>

        <p>Your platform <strong>${platformTitle}</strong> has been successfully deployed and is now live!</p>

        <div style="background: #f0f9ff; border: 2px solid #0ea5e9; border-radius: 8px; padding: 20px; margin: 20px 0; text-align: center;">
          <p style="margin: 0 0 10px 0; color: #0c4a6e; font-weight: bold;">Your Platform URL:</p>
          <p style="margin: 0;">
            <a href="${deploymentUrl}" style="color: #0ea5e9; font-size: 18px; font-weight: bold; text-decoration: none;">${deploymentUrl}</a>
          </p>
        </div>

        ${accessCredentials ? `
        <div style="background: #fef3c7; border: 2px solid #f59e0b; border-radius: 8px; padding: 20px; margin: 20px 0;">
          <h4 style="margin: 0 0 15px 0; color: #92400e;">🔐 Admin Access Credentials</h4>
          <p style="margin: 5px 0; color: #92400e;"><strong>Username:</strong> ${accessCredentials.username}</p>
          <p style="margin: 5px 0; color: #92400e;"><strong>Password:</strong> ${accessCredentials.password}</p>
          <p style="margin: 15px 0 0 0; font-size: 14px; color: #a16207;">Please change your password immediately after first login.</p>
        </div>
        ` : ''}

        <h3 style="color: #1f2937; margin: 30px 0 15px 0;">Next Steps:</h3>
        <ul style="color: #6b7280;">
          <li>Visit your platform and test all functionality</li>
          <li>Customize branding and content as needed</li>
          ${accessCredentials ? '<li>Change default admin credentials immediately</li>' : ''}
          <li>Set up your preferred payment processing</li>
          <li>Configure any additional integrations</li>
        </ul>

        <p style="margin: 30px 0 20px 0;">
          <a href="${deploymentUrl}"
             style="background: #10b981; color: #ffffff; padding: 12px 30px; text-decoration: none; border-radius: 8px; font-weight: bold; display: inline-block; margin-right: 10px;">
            Visit Your Platform
          </a>
          <a href="https://techflunky.com/support"
             style="background: #6b7280; color: #ffffff; padding: 12px 30px; text-decoration: none; border-radius: 8px; font-weight: bold; display: inline-block;">
            Get Support
          </a>
        </p>

        <p>If you need any assistance, our support team is here to help!</p>

        <p style="margin: 30px 0 0 0;">
          Best regards,<br>
          <strong>The TechFlunky Team</strong>
        </p>
      </div>

      <div style="text-align: center; padding: 20px; color: #6b7280; font-size: 12px;">
        <p>© 2024 TechFlunky. All rights reserved.</p>
      </div>
    </body>
    </html>
    `;
  }

  private getAdminNotificationTemplate(
    platformTitle: string,
    offerAmount: number,
    buyerEmail: string,
    sellerEmail: string
  ): string {
    return `
    <!DOCTYPE html>
    <html>
    <head>
      <meta charset="utf-8">
      <meta name="viewport" content="width=device-width, initial-scale=1.0">
      <title>High-Value Offer Alert - TechFlunky</title>
    </head>
    <body style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; line-height: 1.6; color: #333; max-width: 600px; margin: 0 auto; padding: 20px;">
      <div style="background: linear-gradient(135deg, #dc2626 0%, #991b1b 100%); padding: 40px 20px; text-align: center; border-radius: 10px 10px 0 0;">
        <h1 style="color: #ffffff; margin: 0; font-size: 28px; font-weight: bold;">🎯 High-Value Offer Alert</h1>
        <p style="color: #fecaca; margin: 10px 0 0 0; font-size: 16px;">Immediate attention required</p>
      </div>

      <div style="background: #ffffff; padding: 40px; border-radius: 0 0 10px 10px; box-shadow: 0 4px 6px rgba(0, 0, 0, 0.1);">
        <h2 style="color: #1f2937; margin: 0 0 20px 0;">High-Value Offer Received</h2>

        <p>A significant offer has been made on the platform:</p>

        <div style="background: #fef2f2; border: 2px solid #dc2626; border-radius: 8px; padding: 20px; margin: 20px 0;">
          <h3 style="margin: 0 0 10px 0; color: #dc2626;">${platformTitle}</h3>
          <p style="font-size: 28px; color: #dc2626; font-weight: bold; margin: 10px 0;">$${offerAmount.toLocaleString()}</p>
          <p style="color: #7f1d1d; font-size: 14px; margin: 5px 0;">Offer Amount</p>
        </div>

        <div style="background: #f9fafb; border-radius: 8px; padding: 20px; margin: 20px 0;">
          <h4 style="margin: 0 0 10px 0; color: #1f2937;">Transaction Details:</h4>
          <p style="margin: 5px 0; color: #6b7280;"><strong>Buyer:</strong> ${buyerEmail}</p>
          <p style="margin: 5px 0; color: #6b7280;"><strong>Seller:</strong> ${sellerEmail}</p>
          <p style="margin: 5px 0; color: #6b7280;"><strong>Platform:</strong> ${platformTitle}</p>
          <p style="margin: 5px 0; color: #6b7280;"><strong>Commission (8%):</strong> $${(offerAmount * 0.08).toLocaleString()}</p>
        </div>

        <p style="margin: 30px 0 20px 0;">
          <a href="https://techflunky.com/dashboard/admin"
             style="background: #dc2626; color: #ffffff; padding: 12px 30px; text-decoration: none; border-radius: 8px; font-weight: bold; display: inline-block;">
            View Admin Dashboard
          </a>
        </p>

        <p style="color: #dc2626; font-weight: bold;">Monitor this transaction closely for completion.</p>
      </div>

      <div style="text-align: center; padding: 20px; color: #6b7280; font-size: 12px;">
        <p>© 2024 TechFlunky. All rights reserved.</p>
      </div>
    </body>
    </html>
    `;
  }
}

// Export singleton instance
export const mailerSendService = new MailerSendService();

// Export individual functions for easy use with optional env parameter
export const sendEmailVerification = (to: string, code: string, name?: string, env?: any) =>
  mailerSendService.sendEmailVerification(to, code, name, env);

export const sendOfferNotification = (
  sellerEmail: string,
  sellerName: string,
  platformTitle: string,
  offerAmount: number,
  buyerName: string,
  message?: string,
  env?: any
) => mailerSendService.sendOfferNotification(sellerEmail, sellerName, platformTitle, offerAmount, buyerName, message, env);

export const sendOfferStatusUpdate = (
  buyerEmail: string,
  buyerName: string,
  platformTitle: string,
  offerAmount: number,
  status: 'accepted' | 'declined' | 'countered',
  counterAmount?: number,
  env?: any
) => mailerSendService.sendOfferStatusUpdate(buyerEmail, buyerName, platformTitle, offerAmount, status, counterAmount, env);

export const sendDeploymentNotification = (
  buyerEmail: string,
  buyerName: string,
  platformTitle: string,
  deploymentUrl: string,
  accessCredentials?: { username: string; password: string },
  env?: any
) => mailerSendService.sendDeploymentNotification(buyerEmail, buyerName, platformTitle, deploymentUrl, accessCredentials, env);

export const sendAdminNotification = (
  platformTitle: string,
  offerAmount: number,
  buyerEmail: string,
  sellerEmail: string,
  env?: any
) => mailerSendService.sendAdminNotification(platformTitle, offerAmount, buyerEmail, sellerEmail, env);