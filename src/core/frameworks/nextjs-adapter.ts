// Next.js Framework Adapter Implementation
// Enables TechFlunky deployment on Next.js with App Router and Pages Router support

import { BaseAPIAdapter } from '../api/base-adapter';
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
} from '../api/types';

interface NextJSConfig {
  baseUrl: string;
  apiKey?: string;
  headers?: Record<string, string>;
  routerType: 'app' | 'pages';
  middleware?: boolean;
  database: {
    type: 'postgresql' | 'mysql' | 'sqlite';
    url: string;
  };
  auth?: {
    provider: 'nextauth' | 'clerk' | 'auth0' | 'custom';
    secret: string;
  };
  storage?: {
    provider: 's3' | 'cloudinary' | 'uploadthing';
    config: Record<string, any>;
  };
}

export class NextJSAPIAdapter extends BaseAPIAdapter {
  private config: NextJSConfig;
  private fetch: typeof globalThis.fetch;

  constructor(config: NextJSConfig) {
    super({
      baseUrl: config.baseUrl,
      apiKey: config.apiKey,
      headers: config.headers
    });
    this.config = config;
    this.fetch = globalThis.fetch || require('node-fetch');
  }

  // Listings Management
  async createListing(data: ListingData): Promise<ApiResponse<ListingData>> {
    try {
      const response = await this.fetch(`${this.baseUrl}/api/listings`, {
        method: 'POST',
        headers: this.headers,
        body: JSON.stringify(data)
      });

      if (!response.ok) {
        throw new Error(`HTTP ${response.status}: ${response.statusText}`);
      }

      const result = await response.json();
      return this.handleSuccess(result.data, result.message);
    } catch (error) {
      return this.handleError(error);
    }
  }

  async updateListing(id: string, data: Partial<ListingData>): Promise<ApiResponse<ListingData>> {
    try {
      const response = await this.fetch(`${this.baseUrl}/api/listings/${id}`, {
        method: 'PUT',
        headers: this.headers,
        body: JSON.stringify(data)
      });

      if (!response.ok) {
        throw new Error(`HTTP ${response.status}: ${response.statusText}`);
      }

      const result = await response.json();
      return this.handleSuccess(result.data, result.message);
    } catch (error) {
      return this.handleError(error);
    }
  }

  async deleteListing(id: string): Promise<ApiResponse<void>> {
    try {
      const response = await this.fetch(`${this.baseUrl}/api/listings/${id}`, {
        method: 'DELETE',
        headers: this.headers
      });

      if (!response.ok) {
        throw new Error(`HTTP ${response.status}: ${response.statusText}`);
      }

      return this.handleSuccess(undefined, 'Listing deleted successfully');
    } catch (error) {
      return this.handleError(error);
    }
  }

  async getListing(id: string): Promise<ApiResponse<ListingData>> {
    try {
      const response = await this.fetch(`${this.baseUrl}/api/listings/${id}`, {
        headers: this.headers
      });

      if (!response.ok) {
        if (response.status === 404) {
          return {
            success: false,
            error: 'Listing not found',
            statusCode: 404
          };
        }
        throw new Error(`HTTP ${response.status}: ${response.statusText}`);
      }

      const result = await response.json();
      return this.handleSuccess(result.data);
    } catch (error) {
      return this.handleError(error);
    }
  }

  async getListings(filters?: FilterOptions): Promise<ApiResponse<ListingData[]>> {
    try {
      const params = new URLSearchParams();

      if (filters) {
        Object.entries(filters).forEach(([key, value]) => {
          if (value !== undefined && value !== null) {
            if (key === 'pagination' && typeof value === 'object') {
              Object.entries(value).forEach(([pKey, pValue]) => {
                if (pValue !== undefined) {
                  params.append(pKey, String(pValue));
                }
              });
            } else {
              params.append(key, String(value));
            }
          }
        });
      }

      const url = `${this.baseUrl}/api/listings?${params.toString()}`;
      const response = await this.fetch(url, {
        headers: this.headers
      });

      if (!response.ok) {
        throw new Error(`HTTP ${response.status}: ${response.statusText}`);
      }

      const result = await response.json();
      return this.handleSuccess(result.data);
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
      const response = await this.fetch(`${this.baseUrl}/api/users`, {
        method: 'POST',
        headers: this.headers,
        body: JSON.stringify(data)
      });

      if (!response.ok) {
        throw new Error(`HTTP ${response.status}: ${response.statusText}`);
      }

      const result = await response.json();
      return this.handleSuccess(result.data, result.message);
    } catch (error) {
      return this.handleError(error);
    }
  }

  async updateUser(id: string, data: Partial<UserData>): Promise<ApiResponse<UserData>> {
    try {
      const response = await this.fetch(`${this.baseUrl}/api/users/${id}`, {
        method: 'PUT',
        headers: this.headers,
        body: JSON.stringify(data)
      });

      if (!response.ok) {
        throw new Error(`HTTP ${response.status}: ${response.statusText}`);
      }

      const result = await response.json();
      return this.handleSuccess(result.data, result.message);
    } catch (error) {
      return this.handleError(error);
    }
  }

  async getUser(id: string): Promise<ApiResponse<UserData>> {
    try {
      const response = await this.fetch(`${this.baseUrl}/api/users/${id}`, {
        headers: this.headers
      });

      if (!response.ok) {
        if (response.status === 404) {
          return {
            success: false,
            error: 'User not found',
            statusCode: 404
          };
        }
        throw new Error(`HTTP ${response.status}: ${response.statusText}`);
      }

      const result = await response.json();
      return this.handleSuccess(result.data);
    } catch (error) {
      return this.handleError(error);
    }
  }

  async getUserByEmail(email: string): Promise<ApiResponse<UserData>> {
    try {
      const response = await this.fetch(`${this.baseUrl}/api/users/by-email/${encodeURIComponent(email)}`, {
        headers: this.headers
      });

      if (!response.ok) {
        if (response.status === 404) {
          return {
            success: false,
            error: 'User not found',
            statusCode: 404
          };
        }
        throw new Error(`HTTP ${response.status}: ${response.statusText}`);
      }

      const result = await response.json();
      return this.handleSuccess(result.data);
    } catch (error) {
      return this.handleError(error);
    }
  }

  async verifyUser(id: string): Promise<ApiResponse<UserData>> {
    return this.updateUser(id, { verified: true });
  }

  // Payment Processing
  async createPaymentIntent(data: PaymentData): Promise<ApiResponse<{ clientSecret: string; paymentIntentId: string }>> {
    try {
      const response = await this.fetch(`${this.baseUrl}/api/payments/create-intent`, {
        method: 'POST',
        headers: this.headers,
        body: JSON.stringify(data)
      });

      if (!response.ok) {
        throw new Error(`HTTP ${response.status}: ${response.statusText}`);
      }

      const result = await response.json();
      return this.handleSuccess(result.data);
    } catch (error) {
      return this.handleError(error);
    }
  }

  async confirmPayment(paymentIntentId: string): Promise<ApiResponse<PaymentData>> {
    try {
      const response = await this.fetch(`${this.baseUrl}/api/payments/confirm`, {
        method: 'POST',
        headers: this.headers,
        body: JSON.stringify({ paymentIntentId })
      });

      if (!response.ok) {
        throw new Error(`HTTP ${response.status}: ${response.statusText}`);
      }

      const result = await response.json();
      return this.handleSuccess(result.data);
    } catch (error) {
      return this.handleError(error);
    }
  }

  async refundPayment(paymentId: string, amount?: number): Promise<ApiResponse<PaymentData>> {
    try {
      const response = await this.fetch(`${this.baseUrl}/api/payments/${paymentId}/refund`, {
        method: 'POST',
        headers: this.headers,
        body: JSON.stringify({ amount })
      });

      if (!response.ok) {
        throw new Error(`HTTP ${response.status}: ${response.statusText}`);
      }

      const result = await response.json();
      return this.handleSuccess(result.data);
    } catch (error) {
      return this.handleError(error);
    }
  }

  async getPayment(id: string): Promise<ApiResponse<PaymentData>> {
    try {
      const response = await this.fetch(`${this.baseUrl}/api/payments/${id}`, {
        headers: this.headers
      });

      if (!response.ok) {
        if (response.status === 404) {
          return {
            success: false,
            error: 'Payment not found',
            statusCode: 404
          };
        }
        throw new Error(`HTTP ${response.status}: ${response.statusText}`);
      }

      const result = await response.json();
      return this.handleSuccess(result.data);
    } catch (error) {
      return this.handleError(error);
    }
  }

  async getPayments(userId: string, filters?: FilterOptions): Promise<ApiResponse<PaymentData[]>> {
    try {
      const params = new URLSearchParams({ userId });

      if (filters) {
        Object.entries(filters).forEach(([key, value]) => {
          if (value !== undefined && value !== null) {
            params.append(key, String(value));
          }
        });
      }

      const response = await this.fetch(`${this.baseUrl}/api/payments?${params.toString()}`, {
        headers: this.headers
      });

      if (!response.ok) {
        throw new Error(`HTTP ${response.status}: ${response.statusText}`);
      }

      const result = await response.json();
      return this.handleSuccess(result.data);
    } catch (error) {
      return this.handleError(error);
    }
  }

  // Business Deployment (Vercel deployment for Next.js)
  async deployBusiness(config: DeploymentConfig): Promise<ApiResponse<DeploymentResult>> {
    try {
      const response = await this.fetch(`${this.baseUrl}/api/deployments`, {
        method: 'POST',
        headers: this.headers,
        body: JSON.stringify({
          ...config,
          framework: 'nextjs',
          cloudProvider: 'vercel'
        })
      });

      if (!response.ok) {
        throw new Error(`HTTP ${response.status}: ${response.statusText}`);
      }

      const result = await response.json();
      return this.handleSuccess(result.data);
    } catch (error) {
      return this.handleError(error);
    }
  }

  async getDeploymentStatus(deploymentId: string): Promise<ApiResponse<DeploymentResult>> {
    try {
      const response = await this.fetch(`${this.baseUrl}/api/deployments/${deploymentId}`, {
        headers: this.headers
      });

      if (!response.ok) {
        if (response.status === 404) {
          return {
            success: false,
            error: 'Deployment not found',
            statusCode: 404
          };
        }
        throw new Error(`HTTP ${response.status}: ${response.statusText}`);
      }

      const result = await response.json();
      return this.handleSuccess(result.data);
    } catch (error) {
      return this.handleError(error);
    }
  }

  async getDeploymentLogs(deploymentId: string): Promise<ApiResponse<string[]>> {
    try {
      const response = await this.fetch(`${this.baseUrl}/api/deployments/${deploymentId}/logs`, {
        headers: this.headers
      });

      if (!response.ok) {
        throw new Error(`HTTP ${response.status}: ${response.statusText}`);
      }

      const result = await response.json();
      return this.handleSuccess(result.data);
    } catch (error) {
      return this.handleError(error);
    }
  }

  async updateDeployment(deploymentId: string, config: Partial<DeploymentConfig>): Promise<ApiResponse<DeploymentResult>> {
    try {
      const response = await this.fetch(`${this.baseUrl}/api/deployments/${deploymentId}`, {
        method: 'PUT',
        headers: this.headers,
        body: JSON.stringify(config)
      });

      if (!response.ok) {
        throw new Error(`HTTP ${response.status}: ${response.statusText}`);
      }

      const result = await response.json();
      return this.handleSuccess(result.data);
    } catch (error) {
      return this.handleError(error);
    }
  }

  async deleteDeployment(deploymentId: string): Promise<ApiResponse<void>> {
    try {
      const response = await this.fetch(`${this.baseUrl}/api/deployments/${deploymentId}`, {
        method: 'DELETE',
        headers: this.headers
      });

      if (!response.ok) {
        throw new Error(`HTTP ${response.status}: ${response.statusText}`);
      }

      return this.handleSuccess(undefined, 'Deployment deleted successfully');
    } catch (error) {
      return this.handleError(error);
    }
  }

  // Analytics
  async getAnalytics(userId: string, period: 'day' | 'week' | 'month' | 'year'): Promise<ApiResponse<AnalyticsData>> {
    try {
      const response = await this.fetch(`${this.baseUrl}/api/analytics/${userId}?period=${period}`, {
        headers: this.headers
      });

      if (!response.ok) {
        throw new Error(`HTTP ${response.status}: ${response.statusText}`);
      }

      const result = await response.json();
      return this.handleSuccess(result.data);
    } catch (error) {
      return this.handleError(error);
    }
  }

  async trackEvent(event: string, userId: string, data?: Record<string, any>): Promise<ApiResponse<void>> {
    try {
      const response = await this.fetch(`${this.baseUrl}/api/analytics/track`, {
        method: 'POST',
        headers: this.headers,
        body: JSON.stringify({ event, userId, data })
      });

      if (!response.ok) {
        throw new Error(`HTTP ${response.status}: ${response.statusText}`);
      }

      return this.handleSuccess(undefined);
    } catch (error) {
      return this.handleError(error);
    }
  }

  // Notifications
  async createNotification(data: NotificationData): Promise<ApiResponse<NotificationData>> {
    try {
      const response = await this.fetch(`${this.baseUrl}/api/notifications`, {
        method: 'POST',
        headers: this.headers,
        body: JSON.stringify(data)
      });

      if (!response.ok) {
        throw new Error(`HTTP ${response.status}: ${response.statusText}`);
      }

      const result = await response.json();
      return this.handleSuccess(result.data);
    } catch (error) {
      return this.handleError(error);
    }
  }

  async getNotifications(userId: string, unreadOnly?: boolean): Promise<ApiResponse<NotificationData[]>> {
    try {
      const params = new URLSearchParams({ userId });
      if (unreadOnly) params.append('unreadOnly', 'true');

      const response = await this.fetch(`${this.baseUrl}/api/notifications?${params.toString()}`, {
        headers: this.headers
      });

      if (!response.ok) {
        throw new Error(`HTTP ${response.status}: ${response.statusText}`);
      }

      const result = await response.json();
      return this.handleSuccess(result.data);
    } catch (error) {
      return this.handleError(error);
    }
  }

  async markNotificationRead(id: string): Promise<ApiResponse<void>> {
    try {
      const response = await this.fetch(`${this.baseUrl}/api/notifications/${id}/read`, {
        method: 'PUT',
        headers: this.headers
      });

      if (!response.ok) {
        throw new Error(`HTTP ${response.status}: ${response.statusText}`);
      }

      return this.handleSuccess(undefined);
    } catch (error) {
      return this.handleError(error);
    }
  }

  async deleteNotification(id: string): Promise<ApiResponse<void>> {
    try {
      const response = await this.fetch(`${this.baseUrl}/api/notifications/${id}`, {
        method: 'DELETE',
        headers: this.headers
      });

      if (!response.ok) {
        throw new Error(`HTTP ${response.status}: ${response.statusText}`);
      }

      return this.handleSuccess(undefined);
    } catch (error) {
      return this.handleError(error);
    }
  }

  // Messaging
  async sendMessage(data: MessageData): Promise<ApiResponse<MessageData>> {
    try {
      const response = await this.fetch(`${this.baseUrl}/api/messages`, {
        method: 'POST',
        headers: this.headers,
        body: JSON.stringify(data)
      });

      if (!response.ok) {
        throw new Error(`HTTP ${response.status}: ${response.statusText}`);
      }

      const result = await response.json();
      return this.handleSuccess(result.data);
    } catch (error) {
      return this.handleError(error);
    }
  }

  async getMessages(userId: string, filters?: FilterOptions): Promise<ApiResponse<MessageData[]>> {
    try {
      const params = new URLSearchParams({ userId });

      if (filters) {
        Object.entries(filters).forEach(([key, value]) => {
          if (value !== undefined && value !== null) {
            params.append(key, String(value));
          }
        });
      }

      const response = await this.fetch(`${this.baseUrl}/api/messages?${params.toString()}`, {
        headers: this.headers
      });

      if (!response.ok) {
        throw new Error(`HTTP ${response.status}: ${response.statusText}`);
      }

      const result = await response.json();
      return this.handleSuccess(result.data);
    } catch (error) {
      return this.handleError(error);
    }
  }

  async getConversation(user1Id: string, user2Id: string): Promise<ApiResponse<MessageData[]>> {
    try {
      const response = await this.fetch(`${this.baseUrl}/api/messages/conversation?user1=${user1Id}&user2=${user2Id}`, {
        headers: this.headers
      });

      if (!response.ok) {
        throw new Error(`HTTP ${response.status}: ${response.statusText}`);
      }

      const result = await response.json();
      return this.handleSuccess(result.data);
    } catch (error) {
      return this.handleError(error);
    }
  }

  async markMessageRead(id: string): Promise<ApiResponse<void>> {
    try {
      const response = await this.fetch(`${this.baseUrl}/api/messages/${id}/read`, {
        method: 'PUT',
        headers: this.headers
      });

      if (!response.ok) {
        throw new Error(`HTTP ${response.status}: ${response.statusText}`);
      }

      return this.handleSuccess(undefined);
    } catch (error) {
      return this.handleError(error);
    }
  }

  // File Upload/Storage
  async uploadFile(file: File | Buffer, path: string, metadata?: Record<string, any>): Promise<ApiResponse<{ url: string; key: string }>> {
    try {
      const formData = new FormData();

      if (file instanceof File) {
        formData.append('file', file);
      } else {
        // Convert Buffer to Blob for FormData
        const blob = new Blob([file]);
        formData.append('file', blob);
      }

      formData.append('path', path);

      if (metadata) {
        formData.append('metadata', JSON.stringify(metadata));
      }

      const headers = { ...this.headers };
      delete headers['Content-Type']; // Let browser set content-type for FormData

      const response = await this.fetch(`${this.baseUrl}/api/upload`, {
        method: 'POST',
        headers,
        body: formData
      });

      if (!response.ok) {
        throw new Error(`HTTP ${response.status}: ${response.statusText}`);
      }

      const result = await response.json();
      return this.handleSuccess(result.data);
    } catch (error) {
      return this.handleError(error);
    }
  }

  async deleteFile(key: string): Promise<ApiResponse<void>> {
    try {
      const response = await this.fetch(`${this.baseUrl}/api/upload/${encodeURIComponent(key)}`, {
        method: 'DELETE',
        headers: this.headers
      });

      if (!response.ok) {
        throw new Error(`HTTP ${response.status}: ${response.statusText}`);
      }

      return this.handleSuccess(undefined);
    } catch (error) {
      return this.handleError(error);
    }
  }

  async getSignedUrl(key: string, expiresIn: number = 3600): Promise<ApiResponse<string>> {
    try {
      const response = await this.fetch(`${this.baseUrl}/api/upload/signed-url?key=${encodeURIComponent(key)}&expiresIn=${expiresIn}`, {
        headers: this.headers
      });

      if (!response.ok) {
        throw new Error(`HTTP ${response.status}: ${response.statusText}`);
      }

      const result = await response.json();
      return this.handleSuccess(result.data);
    } catch (error) {
      return this.handleError(error);
    }
  }

  // Health Check
  async healthCheck(): Promise<ApiResponse<{ status: string; timestamp: Date; version: string }>> {
    try {
      const response = await this.fetch(`${this.baseUrl}/api/health`, {
        headers: this.headers
      });

      if (!response.ok) {
        throw new Error(`HTTP ${response.status}: ${response.statusText}`);
      }

      const result = await response.json();
      return this.handleSuccess(result.data);
    } catch (error) {
      return this.handleError(error);
    }
  }
}

// Next.js specific deployment utilities
export class NextJSDeploymentUtils {
  static generateNextConfig(config: DeploymentConfig): string {
    return `
/** @type {import('next').NextConfig} */
const nextConfig = {
  experimental: {
    serverComponentsExternalPackages: ['@techflunky/core']
  },
  images: {
    domains: ['${config.cloudProvider === 'aws' ? 's3.amazonaws.com' : 'r2.cloudflareapis.com'}']
  },
  env: {
    DATABASE_URL: process.env.DATABASE_URL,
    STRIPE_PUBLISHABLE_KEY: process.env.STRIPE_PUBLISHABLE_KEY,
    STRIPE_SECRET_KEY: process.env.STRIPE_SECRET_KEY,
    NEXTAUTH_SECRET: process.env.NEXTAUTH_SECRET,
    NEXTAUTH_URL: process.env.NEXTAUTH_URL
  }
}

module.exports = nextConfig
`;
  }

  static generatePackageJson(projectName: string): string {
    return JSON.stringify({
      name: projectName,
      version: '1.0.0',
      private: true,
      scripts: {
        dev: 'next dev',
        build: 'next build',
        start: 'next start',
        lint: 'next lint'
      },
      dependencies: {
        'next': '^14.0.0',
        'react': '^18.0.0',
        'react-dom': '^18.0.0',
        '@techflunky/core': '^1.0.0',
        'stripe': '^14.0.0',
        'next-auth': '^4.24.0',
        '@next-auth/prisma-adapter': '^1.0.7',
        'prisma': '^5.0.0',
        '@prisma/client': '^5.0.0'
      },
      devDependencies: {
        'typescript': '^5.0.0',
        '@types/node': '^20.0.0',
        '@types/react': '^18.0.0',
        '@types/react-dom': '^18.0.0',
        'autoprefixer': '^10.0.0',
        'postcss': '^8.0.0',
        'tailwindcss': '^3.3.0'
      }
    }, null, 2);
  }

  static generateVercelConfig(): string {
    return JSON.stringify({
      version: 2,
      builds: [
        {
          src: 'package.json',
          use: '@vercel/next'
        }
      ],
      env: {
        DATABASE_URL: '@database_url',
        STRIPE_SECRET_KEY: '@stripe_secret_key',
        NEXTAUTH_SECRET: '@nextauth_secret'
      }
    }, null, 2);
  }
}