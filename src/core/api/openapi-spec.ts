// OpenAPI 3.0 Specification for TechFlunky Multi-Stack API
// Standardized REST API documentation for all supported frameworks

export const openApiSpec = {
  openapi: '3.0.3',
  info: {
    title: 'TechFlunky Marketplace API',
    description: 'Framework-agnostic API for the TechFlunky business marketplace platform. Supports multiple technology stacks and deployment environments.',
    version: '1.0.0',
    contact: {
      name: 'TechFlunky Support',
      email: 'support@techflunky.com',
      url: 'https://techflunky.com/support'
    },
    license: {
      name: 'MIT',
      url: 'https://opensource.org/licenses/MIT'
    },
    termsOfService: 'https://techflunky.com/terms'
  },
  servers: [
    {
      url: 'https://api.techflunky.com/v1',
      description: 'Production server'
    },
    {
      url: 'https://staging-api.techflunky.com/v1',
      description: 'Staging server'
    },
    {
      url: 'http://localhost:3000/api/v1',
      description: 'Development server'
    }
  ],
  paths: {
    // Health Check
    '/health': {
      get: {
        tags: ['System'],
        summary: 'Health check endpoint',
        description: 'Returns the health status of the API service',
        operationId: 'healthCheck',
        responses: {
          '200': {
            description: 'Service is healthy',
            content: {
              'application/json': {
                schema: {
                  $ref: '#/components/schemas/HealthResponse'
                }
              }
            }
          },
          '503': {
            description: 'Service unavailable',
            content: {
              'application/json': {
                schema: {
                  $ref: '#/components/schemas/ErrorResponse'
                }
              }
            }
          }
        }
      }
    },

    // Listings Endpoints
    '/listings': {
      get: {
        tags: ['Listings'],
        summary: 'Get all listings',
        description: 'Retrieve a list of business platform listings with optional filtering',
        operationId: 'getListings',
        parameters: [
          {
            name: 'category',
            in: 'query',
            description: 'Filter by category',
            schema: {
              type: 'string',
              enum: ['hr-compliance', 'legal-saas', 'ai-tools', 'e-commerce']
            }
          },
          {
            name: 'priceMin',
            in: 'query',
            description: 'Minimum price filter',
            schema: {
              type: 'number',
              minimum: 0
            }
          },
          {
            name: 'priceMax',
            in: 'query',
            description: 'Maximum price filter',
            schema: {
              type: 'number',
              minimum: 0
            }
          },
          {
            name: 'search',
            in: 'query',
            description: 'Search query for title and description',
            schema: {
              type: 'string',
              maxLength: 100
            }
          },
          {
            name: 'status',
            in: 'query',
            description: 'Filter by listing status',
            schema: {
              type: 'string',
              enum: ['active', 'pending', 'sold', 'draft']
            }
          },
          {
            name: 'page',
            in: 'query',
            description: 'Page number for pagination',
            schema: {
              type: 'integer',
              minimum: 1,
              default: 1
            }
          },
          {
            name: 'limit',
            in: 'query',
            description: 'Number of items per page',
            schema: {
              type: 'integer',
              minimum: 1,
              maximum: 100,
              default: 20
            }
          }
        ],
        responses: {
          '200': {
            description: 'Successful response',
            content: {
              'application/json': {
                schema: {
                  $ref: '#/components/schemas/ListingsResponse'
                }
              }
            }
          },
          '400': {
            description: 'Bad request',
            content: {
              'application/json': {
                schema: {
                  $ref: '#/components/schemas/ErrorResponse'
                }
              }
            }
          }
        }
      },
      post: {
        tags: ['Listings'],
        summary: 'Create a new listing',
        description: 'Create a new business platform listing',
        operationId: 'createListing',
        security: [
          {
            bearerAuth: []
          }
        ],
        requestBody: {
          required: true,
          content: {
            'application/json': {
              schema: {
                $ref: '#/components/schemas/CreateListingRequest'
              }
            }
          }
        },
        responses: {
          '201': {
            description: 'Listing created successfully',
            content: {
              'application/json': {
                schema: {
                  $ref: '#/components/schemas/ListingResponse'
                }
              }
            }
          },
          '400': {
            description: 'Invalid request data',
            content: {
              'application/json': {
                schema: {
                  $ref: '#/components/schemas/ErrorResponse'
                }
              }
            }
          },
          '401': {
            description: 'Unauthorized',
            content: {
              'application/json': {
                schema: {
                  $ref: '#/components/schemas/ErrorResponse'
                }
              }
            }
          }
        }
      }
    },

    '/listings/{id}': {
      get: {
        tags: ['Listings'],
        summary: 'Get listing by ID',
        description: 'Retrieve a specific business platform listing',
        operationId: 'getListingById',
        parameters: [
          {
            name: 'id',
            in: 'path',
            required: true,
            description: 'Listing ID',
            schema: {
              type: 'string',
              format: 'uuid'
            }
          }
        ],
        responses: {
          '200': {
            description: 'Successful response',
            content: {
              'application/json': {
                schema: {
                  $ref: '#/components/schemas/ListingResponse'
                }
              }
            }
          },
          '404': {
            description: 'Listing not found',
            content: {
              'application/json': {
                schema: {
                  $ref: '#/components/schemas/ErrorResponse'
                }
              }
            }
          }
        }
      },
      put: {
        tags: ['Listings'],
        summary: 'Update listing',
        description: 'Update an existing business platform listing',
        operationId: 'updateListing',
        security: [
          {
            bearerAuth: []
          }
        ],
        parameters: [
          {
            name: 'id',
            in: 'path',
            required: true,
            description: 'Listing ID',
            schema: {
              type: 'string',
              format: 'uuid'
            }
          }
        ],
        requestBody: {
          required: true,
          content: {
            'application/json': {
              schema: {
                $ref: '#/components/schemas/UpdateListingRequest'
              }
            }
          }
        },
        responses: {
          '200': {
            description: 'Listing updated successfully',
            content: {
              'application/json': {
                schema: {
                  $ref: '#/components/schemas/ListingResponse'
                }
              }
            }
          },
          '400': {
            description: 'Invalid request data',
            content: {
              'application/json': {
                schema: {
                  $ref: '#/components/schemas/ErrorResponse'
                }
              }
            }
          },
          '401': {
            description: 'Unauthorized',
            content: {
              'application/json': {
                schema: {
                  $ref: '#/components/schemas/ErrorResponse'
                }
              }
            }
          },
          '404': {
            description: 'Listing not found',
            content: {
              'application/json': {
                schema: {
                  $ref: '#/components/schemas/ErrorResponse'
                }
              }
            }
          }
        }
      },
      delete: {
        tags: ['Listings'],
        summary: 'Delete listing',
        description: 'Delete a business platform listing',
        operationId: 'deleteListing',
        security: [
          {
            bearerAuth: []
          }
        ],
        parameters: [
          {
            name: 'id',
            in: 'path',
            required: true,
            description: 'Listing ID',
            schema: {
              type: 'string',
              format: 'uuid'
            }
          }
        ],
        responses: {
          '204': {
            description: 'Listing deleted successfully'
          },
          '401': {
            description: 'Unauthorized',
            content: {
              'application/json': {
                schema: {
                  $ref: '#/components/schemas/ErrorResponse'
                }
              }
            }
          },
          '404': {
            description: 'Listing not found',
            content: {
              'application/json': {
                schema: {
                  $ref: '#/components/schemas/ErrorResponse'
                }
              }
            }
          }
        }
      }
    },

    // Users Endpoints
    '/users': {
      post: {
        tags: ['Users'],
        summary: 'Create user account',
        description: 'Register a new user account',
        operationId: 'createUser',
        requestBody: {
          required: true,
          content: {
            'application/json': {
              schema: {
                $ref: '#/components/schemas/CreateUserRequest'
              }
            }
          }
        },
        responses: {
          '201': {
            description: 'User created successfully',
            content: {
              'application/json': {
                schema: {
                  $ref: '#/components/schemas/UserResponse'
                }
              }
            }
          },
          '400': {
            description: 'Invalid request data',
            content: {
              'application/json': {
                schema: {
                  $ref: '#/components/schemas/ErrorResponse'
                }
              }
            }
          },
          '409': {
            description: 'User already exists',
            content: {
              'application/json': {
                schema: {
                  $ref: '#/components/schemas/ErrorResponse'
                }
              }
            }
          }
        }
      }
    },

    '/users/{id}': {
      get: {
        tags: ['Users'],
        summary: 'Get user by ID',
        description: 'Retrieve user information',
        operationId: 'getUserById',
        security: [
          {
            bearerAuth: []
          }
        ],
        parameters: [
          {
            name: 'id',
            in: 'path',
            required: true,
            description: 'User ID',
            schema: {
              type: 'string',
              format: 'uuid'
            }
          }
        ],
        responses: {
          '200': {
            description: 'Successful response',
            content: {
              'application/json': {
                schema: {
                  $ref: '#/components/schemas/UserResponse'
                }
              }
            }
          },
          '401': {
            description: 'Unauthorized',
            content: {
              'application/json': {
                schema: {
                  $ref: '#/components/schemas/ErrorResponse'
                }
              }
            }
          },
          '404': {
            description: 'User not found',
            content: {
              'application/json': {
                schema: {
                  $ref: '#/components/schemas/ErrorResponse'
                }
              }
            }
          }
        }
      }
    },

    // Payments Endpoints
    '/payments/create-intent': {
      post: {
        tags: ['Payments'],
        summary: 'Create payment intent',
        description: 'Create a Stripe payment intent for purchasing a business platform',
        operationId: 'createPaymentIntent',
        security: [
          {
            bearerAuth: []
          }
        ],
        requestBody: {
          required: true,
          content: {
            'application/json': {
              schema: {
                $ref: '#/components/schemas/CreatePaymentIntentRequest'
              }
            }
          }
        },
        responses: {
          '200': {
            description: 'Payment intent created successfully',
            content: {
              'application/json': {
                schema: {
                  $ref: '#/components/schemas/PaymentIntentResponse'
                }
              }
            }
          },
          '400': {
            description: 'Invalid request data',
            content: {
              'application/json': {
                schema: {
                  $ref: '#/components/schemas/ErrorResponse'
                }
              }
            }
          },
          '401': {
            description: 'Unauthorized',
            content: {
              'application/json': {
                schema: {
                  $ref: '#/components/schemas/ErrorResponse'
                }
              }
            }
          }
        }
      }
    },

    // Deployments Endpoints
    '/deployments': {
      post: {
        tags: ['Deployments'],
        summary: 'Deploy business platform',
        description: 'Deploy a purchased business platform to the specified infrastructure',
        operationId: 'deployBusiness',
        security: [
          {
            bearerAuth: []
          }
        ],
        requestBody: {
          required: true,
          content: {
            'application/json': {
              schema: {
                $ref: '#/components/schemas/DeploymentRequest'
              }
            }
          }
        },
        responses: {
          '202': {
            description: 'Deployment started successfully',
            content: {
              'application/json': {
                schema: {
                  $ref: '#/components/schemas/DeploymentResponse'
                }
              }
            }
          },
          '400': {
            description: 'Invalid deployment configuration',
            content: {
              'application/json': {
                schema: {
                  $ref: '#/components/schemas/ErrorResponse'
                }
              }
            }
          },
          '401': {
            description: 'Unauthorized',
            content: {
              'application/json': {
                schema: {
                  $ref: '#/components/schemas/ErrorResponse'
                }
              }
            }
          }
        }
      }
    },

    '/deployments/{id}': {
      get: {
        tags: ['Deployments'],
        summary: 'Get deployment status',
        description: 'Get the current status of a deployment',
        operationId: 'getDeploymentStatus',
        security: [
          {
            bearerAuth: []
          }
        ],
        parameters: [
          {
            name: 'id',
            in: 'path',
            required: true,
            description: 'Deployment ID',
            schema: {
              type: 'string',
              format: 'uuid'
            }
          }
        ],
        responses: {
          '200': {
            description: 'Deployment status retrieved successfully',
            content: {
              'application/json': {
                schema: {
                  $ref: '#/components/schemas/DeploymentResponse'
                }
              }
            }
          },
          '401': {
            description: 'Unauthorized',
            content: {
              'application/json': {
                schema: {
                  $ref: '#/components/schemas/ErrorResponse'
                }
              }
            }
          },
          '404': {
            description: 'Deployment not found',
            content: {
              'application/json': {
                schema: {
                  $ref: '#/components/schemas/ErrorResponse'
                }
              }
            }
          }
        }
      }
    },

    // File Upload Endpoints
    '/upload': {
      post: {
        tags: ['Files'],
        summary: 'Upload file',
        description: 'Upload a file to cloud storage',
        operationId: 'uploadFile',
        security: [
          {
            bearerAuth: []
          }
        ],
        requestBody: {
          required: true,
          content: {
            'multipart/form-data': {
              schema: {
                type: 'object',
                properties: {
                  file: {
                    type: 'string',
                    format: 'binary',
                    description: 'File to upload'
                  },
                  path: {
                    type: 'string',
                    description: 'Upload path'
                  },
                  metadata: {
                    type: 'string',
                    description: 'JSON metadata object'
                  }
                },
                required: ['file', 'path']
              }
            }
          }
        },
        responses: {
          '200': {
            description: 'File uploaded successfully',
            content: {
              'application/json': {
                schema: {
                  $ref: '#/components/schemas/FileUploadResponse'
                }
              }
            }
          },
          '400': {
            description: 'Invalid file or request',
            content: {
              'application/json': {
                schema: {
                  $ref: '#/components/schemas/ErrorResponse'
                }
              }
            }
          },
          '401': {
            description: 'Unauthorized',
            content: {
              'application/json': {
                schema: {
                  $ref: '#/components/schemas/ErrorResponse'
                }
              }
            }
          }
        }
      }
    }
  },

  components: {
    securitySchemes: {
      bearerAuth: {
        type: 'http',
        scheme: 'bearer',
        bearerFormat: 'JWT'
      }
    },

    schemas: {
      // Response Schemas
      HealthResponse: {
        type: 'object',
        properties: {
          success: {
            type: 'boolean',
            example: true
          },
          data: {
            type: 'object',
            properties: {
              status: {
                type: 'string',
                example: 'healthy'
              },
              timestamp: {
                type: 'string',
                format: 'date-time'
              },
              version: {
                type: 'string',
                example: '1.0.0'
              }
            }
          },
          statusCode: {
            type: 'integer',
            example: 200
          }
        }
      },

      ErrorResponse: {
        type: 'object',
        properties: {
          success: {
            type: 'boolean',
            example: false
          },
          error: {
            type: 'string',
            description: 'Error message'
          },
          statusCode: {
            type: 'integer',
            description: 'HTTP status code'
          }
        },
        required: ['success', 'error', 'statusCode']
      },

      // Listing Schemas
      Listing: {
        type: 'object',
        properties: {
          id: {
            type: 'string',
            format: 'uuid'
          },
          title: {
            type: 'string',
            maxLength: 200
          },
          description: {
            type: 'string',
            maxLength: 5000
          },
          price: {
            type: 'number',
            minimum: 0
          },
          category: {
            type: 'string',
            enum: ['hr-compliance', 'legal-saas', 'ai-tools', 'e-commerce']
          },
          sellerId: {
            type: 'string',
            format: 'uuid'
          },
          status: {
            type: 'string',
            enum: ['active', 'pending', 'sold', 'draft']
          },
          features: {
            type: 'array',
            items: {
              type: 'string'
            }
          },
          technologies: {
            type: 'array',
            items: {
              type: 'string'
            }
          },
          documentation: {
            type: 'string',
            format: 'uri'
          },
          demoUrl: {
            type: 'string',
            format: 'uri'
          },
          sourceCodeUrl: {
            type: 'string',
            format: 'uri'
          },
          images: {
            type: 'array',
            items: {
              type: 'string',
              format: 'uri'
            }
          },
          createdAt: {
            type: 'string',
            format: 'date-time'
          },
          updatedAt: {
            type: 'string',
            format: 'date-time'
          }
        },
        required: ['id', 'title', 'description', 'price', 'category', 'sellerId', 'status']
      },

      ListingResponse: {
        type: 'object',
        properties: {
          success: {
            type: 'boolean',
            example: true
          },
          data: {
            $ref: '#/components/schemas/Listing'
          },
          statusCode: {
            type: 'integer',
            example: 200
          }
        }
      },

      ListingsResponse: {
        type: 'object',
        properties: {
          success: {
            type: 'boolean',
            example: true
          },
          data: {
            type: 'array',
            items: {
              $ref: '#/components/schemas/Listing'
            }
          },
          pagination: {
            type: 'object',
            properties: {
              page: {
                type: 'integer'
              },
              limit: {
                type: 'integer'
              },
              total: {
                type: 'integer'
              },
              pages: {
                type: 'integer'
              }
            }
          },
          statusCode: {
            type: 'integer',
            example: 200
          }
        }
      },

      CreateListingRequest: {
        type: 'object',
        properties: {
          title: {
            type: 'string',
            maxLength: 200
          },
          description: {
            type: 'string',
            maxLength: 5000
          },
          price: {
            type: 'number',
            minimum: 0
          },
          category: {
            type: 'string',
            enum: ['hr-compliance', 'legal-saas', 'ai-tools', 'e-commerce']
          },
          features: {
            type: 'array',
            items: {
              type: 'string'
            }
          },
          technologies: {
            type: 'array',
            items: {
              type: 'string'
            }
          },
          documentation: {
            type: 'string',
            format: 'uri'
          },
          demoUrl: {
            type: 'string',
            format: 'uri'
          },
          sourceCodeUrl: {
            type: 'string',
            format: 'uri'
          }
        },
        required: ['title', 'description', 'price', 'category']
      },

      UpdateListingRequest: {
        type: 'object',
        properties: {
          title: {
            type: 'string',
            maxLength: 200
          },
          description: {
            type: 'string',
            maxLength: 5000
          },
          price: {
            type: 'number',
            minimum: 0
          },
          status: {
            type: 'string',
            enum: ['active', 'pending', 'sold', 'draft']
          },
          features: {
            type: 'array',
            items: {
              type: 'string'
            }
          },
          technologies: {
            type: 'array',
            items: {
              type: 'string'
            }
          }
        }
      },

      // User Schemas
      User: {
        type: 'object',
        properties: {
          id: {
            type: 'string',
            format: 'uuid'
          },
          email: {
            type: 'string',
            format: 'email'
          },
          username: {
            type: 'string',
            maxLength: 50
          },
          displayName: {
            type: 'string',
            maxLength: 100
          },
          avatar: {
            type: 'string',
            format: 'uri'
          },
          bio: {
            type: 'string',
            maxLength: 500
          },
          type: {
            type: 'string',
            enum: ['seller', 'buyer', 'admin']
          },
          verified: {
            type: 'boolean'
          },
          createdAt: {
            type: 'string',
            format: 'date-time'
          },
          updatedAt: {
            type: 'string',
            format: 'date-time'
          }
        },
        required: ['id', 'email', 'username', 'type']
      },

      UserResponse: {
        type: 'object',
        properties: {
          success: {
            type: 'boolean',
            example: true
          },
          data: {
            $ref: '#/components/schemas/User'
          },
          statusCode: {
            type: 'integer',
            example: 200
          }
        }
      },

      CreateUserRequest: {
        type: 'object',
        properties: {
          email: {
            type: 'string',
            format: 'email'
          },
          username: {
            type: 'string',
            maxLength: 50
          },
          displayName: {
            type: 'string',
            maxLength: 100
          },
          type: {
            type: 'string',
            enum: ['seller', 'buyer']
          },
          password: {
            type: 'string',
            minLength: 8
          }
        },
        required: ['email', 'username', 'type', 'password']
      },

      // Payment Schemas
      CreatePaymentIntentRequest: {
        type: 'object',
        properties: {
          listingId: {
            type: 'string',
            format: 'uuid'
          },
          buyerId: {
            type: 'string',
            format: 'uuid'
          },
          amount: {
            type: 'number',
            minimum: 0
          }
        },
        required: ['listingId', 'buyerId', 'amount']
      },

      PaymentIntentResponse: {
        type: 'object',
        properties: {
          success: {
            type: 'boolean',
            example: true
          },
          data: {
            type: 'object',
            properties: {
              clientSecret: {
                type: 'string'
              },
              paymentIntentId: {
                type: 'string'
              }
            }
          },
          statusCode: {
            type: 'integer',
            example: 200
          }
        }
      },

      // Deployment Schemas
      DeploymentRequest: {
        type: 'object',
        properties: {
          framework: {
            type: 'string',
            enum: ['astro', 'nextjs', 'nuxt', 'laravel', 'fastapi', 'django', 'custom']
          },
          cloudProvider: {
            type: 'string',
            enum: ['cloudflare', 'aws', 'gcp', 'azure', 'vercel', 'netlify']
          },
          database: {
            type: 'string',
            enum: ['d1', 'postgresql', 'mysql', 'mongodb', 'sqlite']
          },
          storage: {
            type: 'string',
            enum: ['r2', 's3', 'gcs', 'azure-blob']
          },
          domain: {
            type: 'string',
            format: 'hostname'
          },
          environment: {
            type: 'string',
            enum: ['development', 'staging', 'production']
          },
          config: {
            type: 'object',
            additionalProperties: true
          }
        },
        required: ['framework', 'cloudProvider', 'database', 'environment']
      },

      DeploymentResponse: {
        type: 'object',
        properties: {
          success: {
            type: 'boolean',
            example: true
          },
          data: {
            type: 'object',
            properties: {
              deploymentId: {
                type: 'string',
                format: 'uuid'
              },
              url: {
                type: 'string',
                format: 'uri'
              },
              status: {
                type: 'string',
                enum: ['pending', 'building', 'deployed', 'failed']
              },
              logs: {
                type: 'array',
                items: {
                  type: 'string'
                }
              }
            }
          },
          statusCode: {
            type: 'integer',
            example: 202
          }
        }
      },

      // File Upload Schemas
      FileUploadResponse: {
        type: 'object',
        properties: {
          success: {
            type: 'boolean',
            example: true
          },
          data: {
            type: 'object',
            properties: {
              url: {
                type: 'string',
                format: 'uri'
              },
              key: {
                type: 'string'
              }
            }
          },
          statusCode: {
            type: 'integer',
            example: 200
          }
        }
      }
    }
  },

  tags: [
    {
      name: 'System',
      description: 'System health and status endpoints'
    },
    {
      name: 'Listings',
      description: 'Business platform listings management'
    },
    {
      name: 'Users',
      description: 'User account management'
    },
    {
      name: 'Payments',
      description: 'Payment processing via Stripe'
    },
    {
      name: 'Deployments',
      description: 'Business platform deployment management'
    },
    {
      name: 'Files',
      description: 'File upload and storage management'
    }
  ]
};

// OpenAPI specification generator for different frameworks
export class OpenAPIGenerator {
  static generateSwaggerUI(baseUrl: string): string {
    return `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <title>TechFlunky API Documentation</title>
  <link rel="stylesheet" type="text/css" href="https://unpkg.com/swagger-ui-dist@4.15.5/swagger-ui.css" />
  <link rel="icon" type="image/png" href="${baseUrl}/favicon.png" sizes="32x32" />
  <style>
    html {
      box-sizing: border-box;
      overflow: -moz-scrollbars-vertical;
      overflow-y: scroll;
    }
    *, *:before, *:after {
      box-sizing: inherit;
    }
    body {
      margin:0;
      background: #fafafa;
    }
  </style>
</head>
<body>
  <div id="swagger-ui"></div>
  <script src="https://unpkg.com/swagger-ui-dist@4.15.5/swagger-ui-bundle.js"></script>
  <script src="https://unpkg.com/swagger-ui-dist@4.15.5/swagger-ui-standalone-preset.js"></script>
  <script>
    window.onload = function() {
      const ui = SwaggerUIBundle({
        url: '${baseUrl}/api/openapi.json',
        dom_id: '#swagger-ui',
        deepLinking: true,
        presets: [
          SwaggerUIBundle.presets.apis,
          SwaggerUIStandalonePreset
        ],
        plugins: [
          SwaggerUIBundle.plugins.DownloadUrl
        ],
        layout: "StandaloneLayout",
        validatorUrl: null
      });
    };
  </script>
</body>
</html>`;
  }

  static generatePostmanCollection(): object {
    return {
      info: {
        name: 'TechFlunky API',
        description: 'Framework-agnostic API for the TechFlunky marketplace platform',
        version: '1.0.0',
        schema: 'https://schema.getpostman.com/json/collection/v2.1.0/collection.json'
      },
      item: [
        {
          name: 'Health Check',
          request: {
            method: 'GET',
            header: [],
            url: {
              raw: '{{baseUrl}}/health',
              host: ['{{baseUrl}}'],
              path: ['health']
            }
          }
        },
        {
          name: 'Get Listings',
          request: {
            method: 'GET',
            header: [],
            url: {
              raw: '{{baseUrl}}/listings?page=1&limit=20',
              host: ['{{baseUrl}}'],
              path: ['listings'],
              query: [
                {
                  key: 'page',
                  value: '1'
                },
                {
                  key: 'limit',
                  value: '20'
                }
              ]
            }
          }
        },
        {
          name: 'Create Listing',
          request: {
            method: 'POST',
            header: [
              {
                key: 'Authorization',
                value: 'Bearer {{token}}'
              },
              {
                key: 'Content-Type',
                value: 'application/json'
              }
            ],
            body: {
              mode: 'raw',
              raw: JSON.stringify({
                title: 'AI-Powered HR Platform',
                description: 'Complete HR management system with AI automation',
                price: 35000,
                category: 'hr-compliance',
                features: ['AI automation', 'Compliance tracking', 'Multi-state support'],
                technologies: ['Next.js', 'PostgreSQL', 'Stripe']
              }, null, 2)
            },
            url: {
              raw: '{{baseUrl}}/listings',
              host: ['{{baseUrl}}'],
              path: ['listings']
            }
          }
        }
      ],
      variable: [
        {
          key: 'baseUrl',
          value: 'https://api.techflunky.com/v1',
          type: 'string'
        },
        {
          key: 'token',
          value: 'your-jwt-token-here',
          type: 'string'
        }
      ]
    };
  }
}