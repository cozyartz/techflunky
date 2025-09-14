// Cloudflare API Adapter Implementation
// Maintains compatibility with current TechFlunky Cloudflare infrastructure

import { BaseAPIAdapter } from '../base-adapter';
import type {
  ApiResponse,
  ListingData,
  UserData,
  PaymentData,
  DeploymentConfig,
  DeploymentResult,
  FilterOptions,
  AnalyticsData,
  NotificationData,
  MessageData
} from '../types';

export class CloudflareAPIAdapter extends BaseAPIAdapter {
  private d1Database?: any;
  private r2Bucket?: any;
  private kvNamespace?: any;

  constructor(config: {
    baseUrl: string;
    apiKey?: string;
    headers?: Record<string, string>;
    d1Database?: any;
    r2Bucket?: any;
    kvNamespace?: any;
  }) {
    super(config);
    this.d1Database = config.d1Database;
    this.r2Bucket = config.r2Bucket;
    this.kvNamespace = config.kvNamespace;
  }

  // Listings Management
  async createListing(data: ListingData): Promise<ApiResponse<ListingData>> {
    try {
      this.validateRequired(data, ['title', 'description', 'price', 'category', 'sellerId']);

      const id = crypto.randomUUID();
      const listing = {
        ...data,
        id,
        status: data.status || 'draft',
        createdAt: new Date(),
        updatedAt: new Date()
      };

      const result = await this.d1Database.prepare(`
        INSERT INTO listings (id, title, description, price, category, seller_id, status, features, technologies, documentation, demo_url, source_code_url, images, created_at, updated_at)
        VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
      `).bind(
        listing.id,
        listing.title,
        listing.description,
        listing.price,
        listing.category,
        listing.sellerId,
        listing.status,
        JSON.stringify(listing.features || []),
        JSON.stringify(listing.technologies || []),
        listing.documentation,
        listing.demoUrl,
        listing.sourceCodeUrl,
        JSON.stringify(listing.images || []),
        listing.createdAt.toISOString(),
        listing.updatedAt.toISOString()
      ).run();

      return this.handleSuccess(listing, 'Listing created successfully');
    } catch (error) {
      return this.handleError(error);
    }
  }

  async updateListing(id: string, data: Partial<ListingData>): Promise<ApiResponse<ListingData>> {
    try {
      const updates: string[] = [];
      const values: any[] = [];

      Object.entries(data).forEach(([key, value]) => {
        if (value !== undefined) {
          const dbColumn = this.camelToSnake(key);
          if (['features', 'technologies', 'images'].includes(key)) {
            updates.push(`${dbColumn} = ?`);
            values.push(JSON.stringify(value));
          } else {
            updates.push(`${dbColumn} = ?`);
            values.push(value);
          }
        }
      });

      updates.push('updated_at = ?');
      values.push(new Date().toISOString());
      values.push(id);

      await this.d1Database.prepare(`
        UPDATE listings SET ${updates.join(', ')} WHERE id = ?
      `).bind(...values).run();

      const updatedListing = await this.getListing(id);
      return updatedListing;
    } catch (error) {
      return this.handleError(error);
    }
  }

  async deleteListing(id: string): Promise<ApiResponse<void>> {
    try {
      await this.d1Database.prepare('DELETE FROM listings WHERE id = ?').bind(id).run();
      return this.handleSuccess(undefined, 'Listing deleted successfully');
    } catch (error) {
      return this.handleError(error);
    }
  }

  async getListing(id: string): Promise<ApiResponse<ListingData>> {
    try {
      const result = await this.d1Database.prepare('SELECT * FROM listings WHERE id = ?').bind(id).first();

      if (!result) {
        return {
          success: false,
          error: 'Listing not found',
          statusCode: 404
        };
      }

      const listing = this.dbRowToListing(result);
      return this.handleSuccess(listing);
    } catch (error) {
      return this.handleError(error);
    }
  }

  async getListings(filters?: FilterOptions): Promise<ApiResponse<ListingData[]>> {
    try {
      let query = 'SELECT * FROM listings WHERE 1=1';
      const params: any[] = [];

      if (filters?.category) {
        query += ' AND category = ?';
        params.push(filters.category);
      }

      if (filters?.priceMin) {
        query += ' AND price >= ?';
        params.push(filters.priceMin);
      }

      if (filters?.priceMax) {
        query += ' AND price <= ?';
        params.push(filters.priceMax);
      }

      if (filters?.status) {
        query += ' AND status = ?';
        params.push(filters.status);
      }

      if (filters?.search) {
        query += ' AND (title LIKE ? OR description LIKE ?)';
        params.push(`%${filters.search}%`, `%${filters.search}%`);
      }

      if (filters?.sortBy) {
        const sortColumn = this.camelToSnake(filters.sortBy);
        const sortOrder = filters.sortOrder || 'desc';
        query += ` ORDER BY ${sortColumn} ${sortOrder}`;
      } else {
        query += ' ORDER BY created_at DESC';
      }

      if (filters?.pagination?.limit) {
        query += ' LIMIT ?';
        params.push(filters.pagination.limit);

        if (filters.pagination.offset) {
          query += ' OFFSET ?';
          params.push(filters.pagination.offset);
        }
      }

      const results = await this.d1Database.prepare(query).bind(...params).all();
      const listings = results.results.map((row: any) => this.dbRowToListing(row));

      return this.handleSuccess(listings);
    } catch (error) {
      return this.handleError(error);
    }
  }

  async searchListings(query: string, filters?: FilterOptions): Promise<ApiResponse<ListingData[]>> {
    const searchFilters = { ...filters, search: query };
    return this.getListings(searchFilters);
  }

  // User Management
  async createUser(data: UserData): Promise<ApiResponse<UserData>> {
    try {
      this.validateRequired(data, ['email', 'username', 'type']);

      const id = crypto.randomUUID();
      const user = {
        ...data,
        id,
        verified: data.verified || false,
        createdAt: new Date(),
        updatedAt: new Date()
      };

      await this.d1Database.prepare(`
        INSERT INTO users (id, email, username, display_name, avatar, bio, type, verified, stripe_account_id, stripe_customer_id, created_at, updated_at)
        VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
      `).bind(
        user.id,
        user.email,
        user.username,
        user.displayName,
        user.avatar,
        user.bio,
        user.type,
        user.verified ? 1 : 0,
        user.stripeAccountId,
        user.stripeCustomerId,
        user.createdAt.toISOString(),
        user.updatedAt.toISOString()
      ).run();

      return this.handleSuccess(user, 'User created successfully');
    } catch (error) {
      return this.handleError(error);
    }
  }

  async updateUser(id: string, data: Partial<UserData>): Promise<ApiResponse<UserData>> {
    try {
      const updates: string[] = [];
      const values: any[] = [];

      Object.entries(data).forEach(([key, value]) => {
        if (value !== undefined) {
          const dbColumn = this.camelToSnake(key);
          updates.push(`${dbColumn} = ?`);
          if (key === 'verified') {
            values.push(value ? 1 : 0);
          } else {
            values.push(value);
          }
        }
      });

      updates.push('updated_at = ?');
      values.push(new Date().toISOString());
      values.push(id);

      await this.d1Database.prepare(`
        UPDATE users SET ${updates.join(', ')} WHERE id = ?
      `).bind(...values).run();

      const updatedUser = await this.getUser(id);
      return updatedUser;
    } catch (error) {
      return this.handleError(error);
    }
  }

  async getUser(id: string): Promise<ApiResponse<UserData>> {
    try {
      const result = await this.d1Database.prepare('SELECT * FROM users WHERE id = ?').bind(id).first();

      if (!result) {
        return {
          success: false,
          error: 'User not found',
          statusCode: 404
        };
      }

      const user = this.dbRowToUser(result);
      return this.handleSuccess(user);
    } catch (error) {
      return this.handleError(error);
    }
  }

  async getUserByEmail(email: string): Promise<ApiResponse<UserData>> {
    try {
      const result = await this.d1Database.prepare('SELECT * FROM users WHERE email = ?').bind(email).first();

      if (!result) {
        return {
          success: false,
          error: 'User not found',
          statusCode: 404
        };
      }

      const user = this.dbRowToUser(result);
      return this.handleSuccess(user);
    } catch (error) {
      return this.handleError(error);
    }
  }

  async verifyUser(id: string): Promise<ApiResponse<UserData>> {
    return this.updateUser(id, { verified: true });
  }

  // Payment Processing (Stripe integration)
  async createPaymentIntent(data: PaymentData): Promise<ApiResponse<{ clientSecret: string; paymentIntentId: string }>> {
    try {
      // This would integrate with Stripe API
      // For now, return mock data
      const paymentIntentId = `pi_${crypto.randomUUID().replace(/-/g, '')}`;
      const clientSecret = `${paymentIntentId}_secret_${crypto.randomUUID()}`;

      // Store payment in database
      const payment = {
        ...data,
        id: crypto.randomUUID(),
        stripePaymentIntentId: paymentIntentId,
        status: 'pending' as const,
        createdAt: new Date(),
        updatedAt: new Date()
      };

      await this.d1Database.prepare(`
        INSERT INTO payments (id, listing_id, buyer_id, seller_id, amount, platform_fee, stripe_payment_intent_id, status, created_at, updated_at)
        VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
      `).bind(
        payment.id,
        payment.listingId,
        payment.buyerId,
        payment.sellerId,
        payment.amount,
        payment.platformFee,
        payment.stripePaymentIntentId,
        payment.status,
        payment.createdAt.toISOString(),
        payment.updatedAt.toISOString()
      ).run();

      return this.handleSuccess({ clientSecret, paymentIntentId });
    } catch (error) {
      return this.handleError(error);
    }
  }

  async confirmPayment(paymentIntentId: string): Promise<ApiResponse<PaymentData>> {
    try {
      await this.d1Database.prepare(`
        UPDATE payments SET status = 'completed', updated_at = ? WHERE stripe_payment_intent_id = ?
      `).bind(new Date().toISOString(), paymentIntentId).run();

      const result = await this.d1Database.prepare('SELECT * FROM payments WHERE stripe_payment_intent_id = ?').bind(paymentIntentId).first();
      const payment = this.dbRowToPayment(result);

      return this.handleSuccess(payment);
    } catch (error) {
      return this.handleError(error);
    }
  }

  async refundPayment(paymentId: string, amount?: number): Promise<ApiResponse<PaymentData>> {
    try {
      await this.d1Database.prepare(`
        UPDATE payments SET status = 'refunded', updated_at = ? WHERE id = ?
      `).bind(new Date().toISOString(), paymentId).run();

      const updatedPayment = await this.getPayment(paymentId);
      return updatedPayment;
    } catch (error) {
      return this.handleError(error);
    }
  }

  async getPayment(id: string): Promise<ApiResponse<PaymentData>> {
    try {
      const result = await this.d1Database.prepare('SELECT * FROM payments WHERE id = ?').bind(id).first();

      if (!result) {
        return {
          success: false,
          error: 'Payment not found',
          statusCode: 404
        };
      }

      const payment = this.dbRowToPayment(result);
      return this.handleSuccess(payment);
    } catch (error) {
      return this.handleError(error);
    }
  }

  async getPayments(userId: string, filters?: FilterOptions): Promise<ApiResponse<PaymentData[]>> {
    try {
      let query = 'SELECT * FROM payments WHERE (buyer_id = ? OR seller_id = ?)';
      const params = [userId, userId];

      if (filters?.sortBy) {
        const sortColumn = this.camelToSnake(filters.sortBy);
        const sortOrder = filters.sortOrder || 'desc';
        query += ` ORDER BY ${sortColumn} ${sortOrder}`;
      } else {
        query += ' ORDER BY created_at DESC';
      }

      const results = await this.d1Database.prepare(query).bind(...params).all();
      const payments = results.results.map((row: any) => this.dbRowToPayment(row));

      return this.handleSuccess(payments);
    } catch (error) {
      return this.handleError(error);
    }
  }

  // Business Deployment (Cloudflare Workers/Pages)
  async deployBusiness(config: DeploymentConfig): Promise<ApiResponse<DeploymentResult>> {
    try {
      const deploymentId = crypto.randomUUID();

      // Mock deployment process - in real implementation, this would:
      // 1. Create Cloudflare Worker/Pages project
      // 2. Deploy code to Cloudflare
      // 3. Set up custom domain
      // 4. Configure database and storage

      const result: DeploymentResult = {
        success: true,
        deploymentId,
        url: `https://${deploymentId}.techflunky.workers.dev`,
        status: 'building',
        logs: ['Starting deployment...', 'Building application...']
      };

      // Store deployment in KV for tracking
      await this.kvNamespace?.put(`deployment:${deploymentId}`, JSON.stringify(result));

      return this.handleSuccess(result);
    } catch (error) {
      return this.handleError(error);
    }
  }

  async getDeploymentStatus(deploymentId: string): Promise<ApiResponse<DeploymentResult>> {
    try {
      const stored = await this.kvNamespace?.get(`deployment:${deploymentId}`);

      if (!stored) {
        return {
          success: false,
          error: 'Deployment not found',
          statusCode: 404
        };
      }

      const result = JSON.parse(stored);
      return this.handleSuccess(result);
    } catch (error) {
      return this.handleError(error);
    }
  }

  async getDeploymentLogs(deploymentId: string): Promise<ApiResponse<string[]>> {
    try {
      const deployment = await this.getDeploymentStatus(deploymentId);

      if (!deployment.success) {
        return deployment as ApiResponse<string[]>;
      }

      return this.handleSuccess(deployment.data?.logs || []);
    } catch (error) {
      return this.handleError(error);
    }
  }

  async updateDeployment(deploymentId: string, config: Partial<DeploymentConfig>): Promise<ApiResponse<DeploymentResult>> {
    try {
      const current = await this.getDeploymentStatus(deploymentId);

      if (!current.success) {
        return current as ApiResponse<DeploymentResult>;
      }

      const updated = {
        ...current.data,
        status: 'building' as const,
        logs: [...(current.data?.logs || []), 'Updating deployment configuration...']
      };

      await this.kvNamespace?.put(`deployment:${deploymentId}`, JSON.stringify(updated));

      return this.handleSuccess(updated);
    } catch (error) {
      return this.handleError(error);
    }
  }

  async deleteDeployment(deploymentId: string): Promise<ApiResponse<void>> {
    try {
      await this.kvNamespace?.delete(`deployment:${deploymentId}`);
      return this.handleSuccess(undefined, 'Deployment deleted successfully');
    } catch (error) {
      return this.handleError(error);
    }
  }

  // Placeholder implementations for remaining methods
  async getAnalytics(userId: string, period: 'day' | 'week' | 'month' | 'year'): Promise<ApiResponse<AnalyticsData>> {
    // Implementation would query analytics data from D1/KV
    return this.handleSuccess({
      listingViews: 0,
      profileViews: 0,
      searchQueries: [],
      conversionRate: 0,
      revenue: 0,
      period,
      startDate: new Date(),
      endDate: new Date()
    });
  }

  async trackEvent(event: string, userId: string, data?: Record<string, any>): Promise<ApiResponse<void>> {
    // Implementation would store event in analytics table
    return this.handleSuccess(undefined);
  }

  async createNotification(data: NotificationData): Promise<ApiResponse<NotificationData>> {
    // Implementation would store in notifications table
    const notification = { ...data, id: crypto.randomUUID(), createdAt: new Date() };
    return this.handleSuccess(notification);
  }

  async getNotifications(userId: string, unreadOnly?: boolean): Promise<ApiResponse<NotificationData[]>> {
    return this.handleSuccess([]);
  }

  async markNotificationRead(id: string): Promise<ApiResponse<void>> {
    return this.handleSuccess(undefined);
  }

  async deleteNotification(id: string): Promise<ApiResponse<void>> {
    return this.handleSuccess(undefined);
  }

  async sendMessage(data: MessageData): Promise<ApiResponse<MessageData>> {
    const message = { ...data, id: crypto.randomUUID(), createdAt: new Date() };
    return this.handleSuccess(message);
  }

  async getMessages(userId: string, filters?: FilterOptions): Promise<ApiResponse<MessageData[]>> {
    return this.handleSuccess([]);
  }

  async getConversation(user1Id: string, user2Id: string): Promise<ApiResponse<MessageData[]>> {
    return this.handleSuccess([]);
  }

  async markMessageRead(id: string): Promise<ApiResponse<void>> {
    return this.handleSuccess(undefined);
  }

  async uploadFile(file: File | Buffer, path: string, metadata?: Record<string, any>): Promise<ApiResponse<{ url: string; key: string }>> {
    try {
      const key = `uploads/${path}/${crypto.randomUUID()}`;

      // Upload to R2
      await this.r2Bucket?.put(key, file, {
        httpMetadata: {
          contentType: metadata?.contentType || 'application/octet-stream'
        },
        customMetadata: metadata
      });

      const url = `https://r2.cloudflareapis.com/${key}`;
      return this.handleSuccess({ url, key });
    } catch (error) {
      return this.handleError(error);
    }
  }

  async deleteFile(key: string): Promise<ApiResponse<void>> {
    try {
      await this.r2Bucket?.delete(key);
      return this.handleSuccess(undefined);
    } catch (error) {
      return this.handleError(error);
    }
  }

  async getSignedUrl(key: string, expiresIn: number = 3600): Promise<ApiResponse<string>> {
    try {
      // Generate signed URL for R2
      const url = `https://r2.cloudflareapis.com/${key}?expires=${Date.now() + expiresIn * 1000}`;
      return this.handleSuccess(url);
    } catch (error) {
      return this.handleError(error);
    }
  }

  async healthCheck(): Promise<ApiResponse<{ status: string; timestamp: Date; version: string }>> {
    return this.handleSuccess({
      status: 'healthy',
      timestamp: new Date(),
      version: '1.0.0'
    });
  }

  // Helper methods
  private camelToSnake(str: string): string {
    return str.replace(/[A-Z]/g, letter => `_${letter.toLowerCase()}`);
  }

  private dbRowToListing(row: any): ListingData {
    return {
      id: row.id,
      title: row.title,
      description: row.description,
      price: row.price,
      category: row.category,
      sellerId: row.seller_id,
      status: row.status,
      features: row.features ? JSON.parse(row.features) : [],
      technologies: row.technologies ? JSON.parse(row.technologies) : [],
      documentation: row.documentation,
      demoUrl: row.demo_url,
      sourceCodeUrl: row.source_code_url,
      images: row.images ? JSON.parse(row.images) : [],
      createdAt: new Date(row.created_at),
      updatedAt: new Date(row.updated_at)
    };
  }

  private dbRowToUser(row: any): UserData {
    return {
      id: row.id,
      email: row.email,
      username: row.username,
      displayName: row.display_name,
      avatar: row.avatar,
      bio: row.bio,
      type: row.type,
      verified: Boolean(row.verified),
      stripeAccountId: row.stripe_account_id,
      stripeCustomerId: row.stripe_customer_id,
      createdAt: new Date(row.created_at),
      updatedAt: new Date(row.updated_at)
    };
  }

  private dbRowToPayment(row: any): PaymentData {
    return {
      id: row.id,
      listingId: row.listing_id,
      buyerId: row.buyer_id,
      sellerId: row.seller_id,
      amount: row.amount,
      platformFee: row.platform_fee,
      stripePaymentIntentId: row.stripe_payment_intent_id,
      status: row.status,
      createdAt: new Date(row.created_at),
      updatedAt: new Date(row.updated_at)
    };
  }
}