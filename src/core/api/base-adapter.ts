// Base API Adapter Interface for Multi-Stack Compatibility
// All framework adapters must implement this interface

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
} from './types';

export abstract class BaseAPIAdapter {
  protected baseUrl: string;
  protected apiKey?: string;
  protected headers: Record<string, string>;

  constructor(config: {
    baseUrl: string;
    apiKey?: string;
    headers?: Record<string, string>;
  }) {
    this.baseUrl = config.baseUrl;
    this.apiKey = config.apiKey;
    this.headers = {
      'Content-Type': 'application/json',
      ...config.headers,
      ...(config.apiKey && { Authorization: `Bearer ${config.apiKey}` })
    };
  }

  // Listings Management
  abstract createListing(data: ListingData): Promise<ApiResponse<ListingData>>;
  abstract updateListing(id: string, data: Partial<ListingData>): Promise<ApiResponse<ListingData>>;
  abstract deleteListing(id: string): Promise<ApiResponse<void>>;
  abstract getListing(id: string): Promise<ApiResponse<ListingData>>;
  abstract getListings(filters?: FilterOptions): Promise<ApiResponse<ListingData[]>>;
  abstract searchListings(query: string, filters?: FilterOptions): Promise<ApiResponse<ListingData[]>>;

  // User Management
  abstract createUser(data: UserData): Promise<ApiResponse<UserData>>;
  abstract updateUser(id: string, data: Partial<UserData>): Promise<ApiResponse<UserData>>;
  abstract getUser(id: string): Promise<ApiResponse<UserData>>;
  abstract getUserByEmail(email: string): Promise<ApiResponse<UserData>>;
  abstract verifyUser(id: string): Promise<ApiResponse<UserData>>;

  // Payment Processing
  abstract createPaymentIntent(data: PaymentData): Promise<ApiResponse<{ clientSecret: string; paymentIntentId: string }>>;
  abstract confirmPayment(paymentIntentId: string): Promise<ApiResponse<PaymentData>>;
  abstract refundPayment(paymentId: string, amount?: number): Promise<ApiResponse<PaymentData>>;
  abstract getPayment(id: string): Promise<ApiResponse<PaymentData>>;
  abstract getPayments(userId: string, filters?: FilterOptions): Promise<ApiResponse<PaymentData[]>>;

  // Business Deployment
  abstract deployBusiness(config: DeploymentConfig): Promise<ApiResponse<DeploymentResult>>;
  abstract getDeploymentStatus(deploymentId: string): Promise<ApiResponse<DeploymentResult>>;
  abstract getDeploymentLogs(deploymentId: string): Promise<ApiResponse<string[]>>;
  abstract updateDeployment(deploymentId: string, config: Partial<DeploymentConfig>): Promise<ApiResponse<DeploymentResult>>;
  abstract deleteDeployment(deploymentId: string): Promise<ApiResponse<void>>;

  // Analytics
  abstract getAnalytics(userId: string, period: 'day' | 'week' | 'month' | 'year'): Promise<ApiResponse<AnalyticsData>>;
  abstract trackEvent(event: string, userId: string, data?: Record<string, any>): Promise<ApiResponse<void>>;

  // Notifications
  abstract createNotification(data: NotificationData): Promise<ApiResponse<NotificationData>>;
  abstract getNotifications(userId: string, unreadOnly?: boolean): Promise<ApiResponse<NotificationData[]>>;
  abstract markNotificationRead(id: string): Promise<ApiResponse<void>>;
  abstract deleteNotification(id: string): Promise<ApiResponse<void>>;

  // Messaging
  abstract sendMessage(data: MessageData): Promise<ApiResponse<MessageData>>;
  abstract getMessages(userId: string, filters?: FilterOptions): Promise<ApiResponse<MessageData[]>>;
  abstract getConversation(user1Id: string, user2Id: string): Promise<ApiResponse<MessageData[]>>;
  abstract markMessageRead(id: string): Promise<ApiResponse<void>>;

  // File Upload/Storage
  abstract uploadFile(file: File | Buffer, path: string, metadata?: Record<string, any>): Promise<ApiResponse<{ url: string; key: string }>>;
  abstract deleteFile(key: string): Promise<ApiResponse<void>>;
  abstract getSignedUrl(key: string, expiresIn?: number): Promise<ApiResponse<string>>;

  // Health Check
  abstract healthCheck(): Promise<ApiResponse<{ status: string; timestamp: Date; version: string }>>;

  // Helper Methods
  protected handleError(error: any): ApiResponse {
    console.error('API Error:', error);
    return {
      success: false,
      error: error.message || 'An unexpected error occurred',
      statusCode: error.statusCode || 500
    };
  }

  protected handleSuccess<T>(data: T, message?: string): ApiResponse<T> {
    return {
      success: true,
      data,
      message,
      statusCode: 200
    };
  }

  protected validateRequired(data: Record<string, any>, requiredFields: string[]): void {
    const missing = requiredFields.filter(field => !data[field]);
    if (missing.length > 0) {
      throw new Error(`Missing required fields: ${missing.join(', ')}`);
    }
  }

  protected buildUrl(endpoint: string, params?: Record<string, any>): string {
    const url = new URL(endpoint, this.baseUrl);
    if (params) {
      Object.entries(params).forEach(([key, value]) => {
        if (value !== undefined && value !== null) {
          url.searchParams.append(key, String(value));
        }
      });
    }
    return url.toString();
  }
}

// Factory for creating API adapters
export class APIAdapterFactory {
  private static adapters: Map<string, typeof BaseAPIAdapter> = new Map();

  static register(name: string, adapter: typeof BaseAPIAdapter): void {
    this.adapters.set(name, adapter);
  }

  static create(
    name: string,
    config: {
      baseUrl: string;
      apiKey?: string;
      headers?: Record<string, string>;
    }
  ): BaseAPIAdapter {
    const AdapterClass = this.adapters.get(name);
    if (!AdapterClass) {
      throw new Error(`Unknown adapter: ${name}. Available adapters: ${Array.from(this.adapters.keys()).join(', ')}`);
    }
    return new AdapterClass(config);
  }

  static getAvailableAdapters(): string[] {
    return Array.from(this.adapters.keys());
  }
}