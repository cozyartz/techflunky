// Core API Types for Multi-Stack Compatibility
// Universal interfaces that work across all supported frameworks

export interface ApiResponse<T = any> {
  success: boolean;
  data?: T;
  error?: string;
  message?: string;
  statusCode: number;
}

export interface PaginationOptions {
  page?: number;
  limit?: number;
  offset?: number;
  cursor?: string;
}

export interface FilterOptions {
  category?: string;
  priceMin?: number;
  priceMax?: number;
  search?: string;
  status?: 'active' | 'pending' | 'sold' | 'draft';
  sortBy?: string;
  sortOrder?: 'asc' | 'desc';
  pagination?: PaginationOptions;
}

export interface ListingData {
  id?: string;
  title: string;
  description: string;
  price: number;
  category: string;
  sellerId: string;
  status?: 'active' | 'pending' | 'sold' | 'draft';
  features?: string[];
  technologies?: string[];
  documentation?: string;
  demoUrl?: string;
  sourceCodeUrl?: string;
  images?: string[];
  createdAt?: Date;
  updatedAt?: Date;
}

export interface UserData {
  id?: string;
  email: string;
  username: string;
  displayName?: string;
  avatar?: string;
  bio?: string;
  type: 'seller' | 'buyer' | 'admin';
  verified?: boolean;
  stripeAccountId?: string;
  stripeCustomerId?: string;
  createdAt?: Date;
  updatedAt?: Date;
}

export interface PaymentData {
  id?: string;
  listingId: string;
  buyerId: string;
  sellerId: string;
  amount: number;
  platformFee: number;
  stripePaymentIntentId?: string;
  status: 'pending' | 'processing' | 'completed' | 'failed' | 'refunded';
  createdAt?: Date;
  updatedAt?: Date;
}

export interface DeploymentConfig {
  framework: 'astro' | 'nextjs' | 'nuxt' | 'laravel' | 'fastapi' | 'django' | 'custom';
  cloudProvider: 'cloudflare' | 'aws' | 'gcp' | 'azure' | 'vercel' | 'netlify';
  database: 'd1' | 'postgresql' | 'mysql' | 'mongodb' | 'sqlite';
  storage: 'r2' | 's3' | 'gcs' | 'azure-blob';
  domain?: string;
  environment: 'development' | 'staging' | 'production';
  config?: Record<string, any>;
}

export interface DeploymentResult {
  success: boolean;
  deploymentId: string;
  url?: string;
  status: 'pending' | 'building' | 'deployed' | 'failed';
  logs?: string[];
  error?: string;
}

export interface AnalyticsData {
  listingViews: number;
  profileViews: number;
  searchQueries: string[];
  conversionRate: number;
  revenue: number;
  period: 'day' | 'week' | 'month' | 'year';
  startDate: Date;
  endDate: Date;
}

export interface NotificationData {
  id?: string;
  userId: string;
  type: 'listing_sold' | 'payment_received' | 'deployment_complete' | 'message_received';
  title: string;
  message: string;
  read?: boolean;
  data?: Record<string, any>;
  createdAt?: Date;
}

export interface MessageData {
  id?: string;
  fromUserId: string;
  toUserId: string;
  listingId?: string;
  subject: string;
  content: string;
  read?: boolean;
  createdAt?: Date;
}