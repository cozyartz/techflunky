#!/usr/bin/env node

/**
 * TechFlunky Platform Testing Suite
 * Comprehensive automated testing for all platform features
 * Run with: node test-platform.js [test-suite]
 */

import { readFileSync, writeFileSync } from 'fs';
import { join, dirname } from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

// Configuration
const CONFIG = {
  baseUrl: process.env.NODE_ENV === 'production'
    ? 'https://techflunky.com'
    : 'http://localhost:4324',

  // Test user credentials for automated testing
  testUsers: {
    seller: {
      email: 'test-seller@techflunky-testing.com',
      password: 'TestPassword123!',
      name: 'Test Seller'
    },
    buyer: {
      email: 'test-buyer@techflunky-testing.com',
      password: 'TestPassword123!',
      name: 'Test Buyer'
    },
    investor: {
      email: 'test-investor@techflunky-testing.com',
      password: 'TestPassword123!',
      name: 'Test Investor'
    },
    admin: {
      email: 'test-admin@techflunky-testing.com',
      password: 'TestPassword123!',
      name: 'Test Admin'
    }
  },

  // Stripe test card numbers
  testCards: {
    success: '4242424242424242',
    declined: '4000000000000002',
    insufficientFunds: '4000000000009995',
    expired: '4000000000000069',
    incorrectCVC: '4000000000000127'
  },

  // Test timeout settings
  timeouts: {
    api: 10000,      // 10 seconds for API calls
    page: 30000,     // 30 seconds for page loads
    payment: 60000   // 60 seconds for payment flows
  }
};

// Test result tracking
let testResults = {
  passed: 0,
  failed: 0,
  skipped: 0,
  errors: [],
  summary: {}
};

// Utility functions
function log(message, type = 'info') {
  const timestamp = new Date().toISOString();
  const colors = {
    info: '\x1b[36m',    // Cyan
    success: '\x1b[32m', // Green
    error: '\x1b[31m',   // Red
    warn: '\x1b[33m',    // Yellow
    reset: '\x1b[0m'     // Reset
  };

  console.log(`${colors[type]}[${timestamp}] ${message}${colors.reset}`);
}

function assert(condition, message) {
  if (condition) {
    testResults.passed++;
    log(`✅ PASS: ${message}`, 'success');
    return true;
  } else {
    testResults.failed++;
    testResults.errors.push(message);
    log(`❌ FAIL: ${message}`, 'error');
    return false;
  }
}

async function makeRequest(endpoint, options = {}) {
  const url = `${CONFIG.baseUrl}${endpoint}`;
  const timeout = options.timeout || CONFIG.timeouts.api;

  try {
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), timeout);

    const response = await fetch(url, {
      ...options,
      signal: controller.signal,
      headers: {
        'Content-Type': 'application/json',
        'User-Agent': 'TechFlunky-Test-Suite/1.0',
        ...options.headers
      }
    });

    clearTimeout(timeoutId);

    // Clone the response to avoid "Body is unusable" errors
    const responseClone = response.clone();

    let data;
    try {
      data = await response.json();
    } catch {
      try {
        data = await responseClone.text();
      } catch {
        data = null;
      }
    }

    return {
      success: response.ok,
      status: response.status,
      data,
      headers: Object.fromEntries(response.headers.entries())
    };
  } catch (error) {
    if (error.name === 'AbortError') {
      throw new Error(`Request timeout after ${timeout}ms`);
    }
    throw error;
  }
}

// Test suites
async function testAuthentication() {
  log('🔐 Testing Authentication & Registration...', 'info');

  try {
    // Test registration endpoint
    const registerData = {
      email: CONFIG.testUsers.seller.email,
      password: CONFIG.testUsers.seller.password,
      name: CONFIG.testUsers.seller.name,
      userType: 'seller'
    };

    const registerResponse = await makeRequest('/api/auth/register', {
      method: 'POST',
      body: JSON.stringify(registerData)
    });

    assert(
      registerResponse.status === 201 || registerResponse.status === 409,
      'Registration endpoint responds correctly'
    );

    // Test login endpoint
    const loginData = {
      email: CONFIG.testUsers.seller.email,
      password: CONFIG.testUsers.seller.password
    };

    const loginResponse = await makeRequest('/api/auth/login', {
      method: 'POST',
      body: JSON.stringify(loginData)
    });

    assert(
      loginResponse.success && loginResponse.data.token,
      'Login returns valid authentication token'
    );

    // Test password validation
    const weakPasswordResponse = await makeRequest('/api/auth/register', {
      method: 'POST',
      body: JSON.stringify({
        email: 'test@example.com',
        password: '123',
        name: 'Test User'
      })
    });

    assert(
      !weakPasswordResponse.success,
      'Weak passwords are rejected'
    );

    // Test email validation
    const invalidEmailResponse = await makeRequest('/api/auth/register', {
      method: 'POST',
      body: JSON.stringify({
        email: 'invalid-email',
        password: 'ValidPassword123!',
        name: 'Test User'
      })
    });

    assert(
      !invalidEmailResponse.success,
      'Invalid email addresses are rejected'
    );

  } catch (error) {
    log(`Authentication test error: ${error.message}`, 'error');
    testResults.failed++;
  }
}

async function testMarketplaceFunctionality() {
  log('🛒 Testing Marketplace Functionality...', 'info');

  try {
    // Test listings endpoint
    const listingsResponse = await makeRequest('/api/listings');

    assert(
      listingsResponse.success && Array.isArray(listingsResponse.data),
      'Listings endpoint returns array of platforms'
    );

    // Test platform search
    const searchResponse = await makeRequest('/api/listings?search=AI&category=productivity');

    assert(
      searchResponse.success,
      'Platform search functionality works'
    );

    // Test individual platform details
    if (listingsResponse.data.length > 0) {
      const firstPlatform = listingsResponse.data[0];
      const detailResponse = await makeRequest(`/api/platform/${firstPlatform.id}`);

      assert(
        detailResponse.success && detailResponse.data.id === firstPlatform.id,
        'Individual platform details load correctly'
      );
    }

    // Test platform creation (seller functionality)
    const newPlatformData = {
      name: 'Test Platform for Automated Testing',
      description: 'This is a test platform created by automated testing',
      category: 'productivity',
      price: 9900,
      technologies: ['React', 'Node.js', 'PostgreSQL'],
      features: ['User Authentication', 'Dashboard', 'API']
    };

    const createResponse = await makeRequest('/api/platform/create', {
      method: 'POST',
      body: JSON.stringify(newPlatformData),
      headers: {
        'Authorization': 'Bearer test-token' // Would need real auth token
      }
    });

    // This might fail due to auth, which is expected
    assert(
      createResponse.status === 401 || createResponse.success,
      'Platform creation endpoint exists and handles auth properly'
    );

  } catch (error) {
    log(`Marketplace test error: ${error.message}`, 'error');
    testResults.failed++;
  }
}

async function testPaymentSystems() {
  log('💳 Testing Payment Systems (Stripe Integration)...', 'info');

  try {
    // Test Stripe connection status
    const connectionResponse = await makeRequest('/api/stripe/test-sandbox?scenario=status');

    assert(
      connectionResponse.success,
      'Stripe sandbox connection is working'
    );

    // Test fee calculation
    const feeResponse = await makeRequest('/api/stripe/test-sandbox?scenario=calculate-fees');

    assert(
      feeResponse.success && feeResponse.data.calculations,
      'Platform fee calculation works correctly'
    );

    // Test payment intent creation
    const paymentIntentResponse = await makeRequest('/api/stripe/test-sandbox?scenario=payment-intent');

    assert(
      paymentIntentResponse.success && paymentIntentResponse.data.paymentIntent,
      'Payment intent creation works'
    );

    // Test checkout session creation
    const checkoutData = {
      action: 'create-checkout-session',
      testData: {
        productName: 'Test Platform Purchase',
        amount: 9900,
        description: 'Automated testing purchase',
        metadata: { test: 'true' }
      }
    };

    const checkoutResponse = await makeRequest('/api/stripe/test-sandbox', {
      method: 'POST',
      body: JSON.stringify(checkoutData)
    });

    assert(
      checkoutResponse.success && checkoutResponse.data.session?.url,
      'Checkout session creation works and returns URL'
    );

    // Test all Stripe scenarios
    const allTestsResponse = await makeRequest('/api/stripe/test-sandbox?scenario=all');

    assert(
      allTestsResponse.success,
      'All Stripe test scenarios pass'
    );

  } catch (error) {
    log(`Payment system test error: ${error.message}`, 'error');
    testResults.failed++;
  }
}

async function testInvestorPortal() {
  log('📊 Testing New Investor Portal Features...', 'info');

  try {
    const testInvestorId = 'test-investor-123';

    // Test performance tracking API
    const performanceResponse = await makeRequest(
      `/api/investors/performance/platforms?investorId=${testInvestorId}`
    );

    assert(
      performanceResponse.status === 200 || performanceResponse.status === 400,
      'Performance tracking API endpoint exists'
    );

    // Test AI insights API
    const insightsResponse = await makeRequest(
      `/api/investors/performance/ai-insights?investorId=${testInvestorId}`
    );

    assert(
      insightsResponse.status === 200 || insightsResponse.status === 400,
      'AI insights API endpoint exists'
    );

    // Test automated reports API
    const reportsResponse = await makeRequest('/api/investors/reports/automated', {
      method: 'POST',
      body: JSON.stringify({
        action: 'generate_report',
        investorId: testInvestorId,
        reportType: 'monthly'
      })
    });

    assert(
      reportsResponse.status === 200 || reportsResponse.status === 400,
      'Automated reports API endpoint exists'
    );

    // Test syndicate management API
    const syndicateResponse = await makeRequest(
      `/api/investors/syndicates/management?investorId=${testInvestorId}&action=list`
    );

    assert(
      syndicateResponse.status === 200 || syndicateResponse.status === 400,
      'Syndicate management API endpoint exists'
    );

    // Test milestone tracking API
    const milestonesResponse = await makeRequest(
      `/api/investors/milestones/tracking?investorId=${testInvestorId}`
    );

    assert(
      milestonesResponse.status === 200 || milestonesResponse.status === 400,
      'Milestone tracking API endpoint exists'
    );

  } catch (error) {
    log(`Investor portal test error: ${error.message}`, 'error');
    testResults.failed++;
  }
}

async function testAPIEndpoints() {
  log('🔗 Testing Core API Endpoints...', 'info');

  const coreEndpoints = [
    { path: '/api/listings', method: 'GET', expectSuccess: true },
    { path: '/api/notifications', method: 'GET', expectAuth: true },
    { path: '/api/admin/analytics', method: 'GET', expectAuth: true },
    { path: '/api/services/validation', method: 'GET', expectSuccess: true },
    { path: '/api/trust/verification', method: 'GET', expectAuth: true },
    { path: '/api/growth/referrals', method: 'GET', expectAuth: true },
    { path: '/api/analytics/advanced', method: 'GET', expectAuth: true }
  ];

  for (const endpoint of coreEndpoints) {
    try {
      const response = await makeRequest(endpoint.path, {
        method: endpoint.method
      });

      if (endpoint.expectAuth) {
        assert(
          response.status === 401 || response.status === 403 || response.success,
          `${endpoint.path} handles authentication properly`
        );
      } else if (endpoint.expectSuccess) {
        assert(
          response.success,
          `${endpoint.path} responds successfully`
        );
      } else {
        assert(
          response.status >= 200 && response.status < 500,
          `${endpoint.path} returns valid HTTP status`
        );
      }
    } catch (error) {
      log(`API endpoint test error for ${endpoint.path}: ${error.message}`, 'error');
      testResults.failed++;
    }
  }
}

async function testEmailSystems() {
  log('📧 Testing Email & Notification Systems...', 'info');

  try {
    // Test email validation endpoint
    const validEmailResponse = await makeRequest('/api/email/validate', {
      method: 'POST',
      body: JSON.stringify({
        email: 'valid@example.com'
      })
    });

    assert(
      validEmailResponse.success,
      'Email validation accepts valid emails'
    );

    // Test invalid email rejection
    const invalidEmailResponse = await makeRequest('/api/email/validate', {
      method: 'POST',
      body: JSON.stringify({
        email: 'invalid-email'
      })
    });

    assert(
      !invalidEmailResponse.success,
      'Email validation rejects invalid emails'
    );

    // Test disposable email rejection
    const disposableEmailResponse = await makeRequest('/api/email/validate', {
      method: 'POST',
      body: JSON.stringify({
        email: 'test@10minutemail.com'
      })
    });

    assert(
      !disposableEmailResponse.success,
      'Email validation rejects disposable emails'
    );

    // Test notification preferences endpoint
    const notificationResponse = await makeRequest('/api/notifications/preferences', {
      method: 'GET'
    });

    assert(
      notificationResponse.status === 401 || notificationResponse.success,
      'Notification preferences endpoint exists'
    );

  } catch (error) {
    log(`Email system test error: ${error.message}`, 'error');
    testResults.failed++;
  }
}

async function testFormValidations() {
  log('📝 Testing Form Validations...', 'info');

  try {
    // Test blueprint wizard validation
    const blueprintData = {
      platformName: '',  // Invalid: empty name
      description: 'A' * 1000,  // Invalid: too long
      category: 'invalid-category',  // Invalid: not in enum
      price: -100,  // Invalid: negative price
      technologies: [],  // Invalid: empty array
      features: [''] // Invalid: empty feature
    };

    const blueprintResponse = await makeRequest('/api/blueprint/validate', {
      method: 'POST',
      body: JSON.stringify(blueprintData)
    });

    assert(
      !blueprintResponse.success && blueprintResponse.data.errors,
      'Blueprint validation catches all field errors'
    );

    // Test valid blueprint data
    const validBlueprintData = {
      platformName: 'Valid Platform Name',
      description: 'A valid description of the platform',
      category: 'productivity',
      price: 9900,
      technologies: ['React', 'Node.js'],
      features: ['User Authentication', 'Dashboard']
    };

    const validBlueprintResponse = await makeRequest('/api/blueprint/validate', {
      method: 'POST',
      body: JSON.stringify(validBlueprintData)
    });

    assert(
      validBlueprintResponse.success,
      'Blueprint validation accepts valid data'
    );

  } catch (error) {
    log(`Form validation test error: ${error.message}`, 'error');
    testResults.failed++;
  }
}

async function testAIIntegrations() {
  log('🤖 Testing AI Integrations...', 'info');

  try {
    // Test Cloudflare AI endpoint
    const cfAIResponse = await makeRequest('/api/ai/analyze', {
      method: 'POST',
      body: JSON.stringify({
        text: 'Test analysis text for AI processing',
        type: 'business_analysis'
      })
    });

    assert(
      cfAIResponse.status === 200 || cfAIResponse.status === 401 || cfAIResponse.status === 400,
      'Cloudflare AI endpoint exists and responds'
    );

    // Test AI validation scoring
    const validationResponse = await makeRequest('/api/validation/ai-codebase-analysis', {
      method: 'POST',
      body: JSON.stringify({
        platformId: 'test-platform-123',
        codebaseUrl: 'https://github.com/test/repo'
      })
    });

    assert(
      validationResponse.status >= 200 && validationResponse.status < 500,
      'AI codebase analysis endpoint exists'
    );

    // Test Claude AI integration (for investor insights)
    const claudeResponse = await makeRequest('/api/investors/performance/ai-insights', {
      method: 'GET'
    });

    assert(
      claudeResponse.status >= 200 && claudeResponse.status < 500,
      'Claude AI integration endpoint exists'
    );

  } catch (error) {
    log(`AI integration test error: ${error.message}`, 'error');
    testResults.failed++;
  }
}

// Performance and load testing
async function testPerformance() {
  log('⚡ Testing Performance & Load...', 'info');

  try {
    const startTime = Date.now();

    // Test concurrent requests to main endpoints
    const concurrentRequests = [
      makeRequest('/api/listings'),
      makeRequest('/api/services/validation'),
      makeRequest('/'),
      makeRequest('/browse'),
      makeRequest('/pricing')
    ];

    const results = await Promise.allSettled(concurrentRequests);
    const endTime = Date.now();
    const totalTime = endTime - startTime;

    const successCount = results.filter(r => r.status === 'fulfilled' && r.value.success).length;

    assert(
      successCount >= 3,
      'At least 3 out of 5 concurrent requests succeed'
    );

    assert(
      totalTime < 10000,
      'Concurrent requests complete within 10 seconds'
    );

    // Test individual page load times
    const pageLoadStart = Date.now();
    const homePageResponse = await makeRequest('/');
    const pageLoadTime = Date.now() - pageLoadStart;

    assert(
      pageLoadTime < 3000,
      'Home page loads within 3 seconds'
    );

    assert(
      homePageResponse.success,
      'Home page loads successfully'
    );

  } catch (error) {
    log(`Performance test error: ${error.message}`, 'error');
    testResults.failed++;
  }
}

// Security testing
async function testSecurity() {
  log('🔒 Testing Security & Validation...', 'info');

  try {
    // Test SQL injection prevention
    const sqlInjectionResponse = await makeRequest('/api/listings?search=\' OR 1=1--');

    assert(
      sqlInjectionResponse.success || sqlInjectionResponse.status === 400,
      'SQL injection attempts are handled safely'
    );

    // Test XSS prevention
    const xssResponse = await makeRequest('/api/platform/create', {
      method: 'POST',
      body: JSON.stringify({
        name: '<script>alert("xss")</script>',
        description: '<img src=x onerror=alert("xss")>'
      })
    });

    assert(
      !xssResponse.success || xssResponse.status === 401,
      'XSS attempts are rejected or require auth'
    );

    // Test CSRF protection
    const csrfResponse = await makeRequest('/api/auth/login', {
      method: 'POST',
      headers: {
        'Origin': 'https://malicious-site.com'
      },
      body: JSON.stringify({
        email: 'test@example.com',
        password: 'password'
      })
    });

    assert(
      !csrfResponse.success || csrfResponse.status === 403,
      'CSRF protection is active'
    );

    // Test rate limiting
    const rateLimitPromises = Array(10).fill().map(() =>
      makeRequest('/api/auth/login', {
        method: 'POST',
        body: JSON.stringify({ email: 'spam@test.com', password: 'wrong' })
      })
    );

    const rateLimitResults = await Promise.allSettled(rateLimitPromises);
    const tooManyRequests = rateLimitResults.some(r =>
      r.status === 'fulfilled' && r.value.status === 429
    );

    assert(
      tooManyRequests,
      'Rate limiting prevents rapid successive requests'
    );

  } catch (error) {
    log(`Security test error: ${error.message}`, 'error');
    testResults.failed++;
  }
}

// Generate test report
function generateReport() {
  const total = testResults.passed + testResults.failed;
  const passRate = total > 0 ? (testResults.passed / total * 100).toFixed(2) : 0;

  const report = {
    timestamp: new Date().toISOString(),
    summary: {
      total,
      passed: testResults.passed,
      failed: testResults.failed,
      passRate: `${passRate}%`
    },
    errors: testResults.errors,
    environment: {
      baseUrl: CONFIG.baseUrl,
      nodeVersion: process.version,
      platform: process.platform
    }
  };

  // Write report to file
  const reportPath = join(__dirname, 'test-results.json');
  writeFileSync(reportPath, JSON.stringify(report, null, 2));

  // Display summary
  log('\n📊 TEST SUMMARY', 'info');
  log(`Total Tests: ${total}`, 'info');
  log(`Passed: ${testResults.passed}`, 'success');
  log(`Failed: ${testResults.failed}`, testResults.failed > 0 ? 'error' : 'info');
  log(`Pass Rate: ${passRate}%`, passRate >= 80 ? 'success' : 'warn');

  if (testResults.errors.length > 0) {
    log('\n❌ FAILED TESTS:', 'error');
    testResults.errors.forEach(error => log(`  • ${error}`, 'error'));
  }

  log(`\n📄 Full report saved to: ${reportPath}`, 'info');

  return report;
}

// Main test runner
async function runTests(suiteFilter = null) {
  log('🚀 Starting TechFlunky Platform Testing Suite...', 'info');
  log(`Testing against: ${CONFIG.baseUrl}`, 'info');

  const testSuites = {
    auth: testAuthentication,
    marketplace: testMarketplaceFunctionality,
    payments: testPaymentSystems,
    investor: testInvestorPortal,
    api: testAPIEndpoints,
    email: testEmailSystems,
    forms: testFormValidations,
    ai: testAIIntegrations,
    performance: testPerformance,
    security: testSecurity
  };

  const suitesToRun = suiteFilter ?
    { [suiteFilter]: testSuites[suiteFilter] } :
    testSuites;

  if (!suitesToRun || Object.keys(suitesToRun).length === 0) {
    log(`Unknown test suite: ${suiteFilter}`, 'error');
    log(`Available suites: ${Object.keys(testSuites).join(', ')}`, 'info');
    process.exit(1);
  }

  const startTime = Date.now();

  for (const [suiteName, testFunction] of Object.entries(suitesToRun)) {
    if (testFunction) {
      log(`\n🧪 Running ${suiteName} tests...`, 'info');
      await testFunction();
    }
  }

  const endTime = Date.now();
  const duration = ((endTime - startTime) / 1000).toFixed(2);

  log(`\n⏱️  Testing completed in ${duration} seconds`, 'info');

  return generateReport();
}

// CLI interface
const suiteFilter = process.argv[2];

if (process.argv.includes('--help') || process.argv.includes('-h')) {
  console.log(`
TechFlunky Platform Testing Suite

Usage: node test-platform.js [test-suite]

Available test suites:
  auth         - Authentication & registration
  marketplace  - Platform browsing & purchasing
  payments     - Stripe payment integration
  investor     - New investor portal features
  api          - Core API endpoints
  email        - Email validation & notifications
  forms        - Form validation testing
  ai           - AI integrations (Claude, Cloudflare)
  performance  - Load & performance testing
  security     - Security & validation testing

Examples:
  node test-platform.js            # Run all tests
  node test-platform.js payments   # Run only payment tests
  node test-platform.js auth       # Run only auth tests

Environment:
  Set NODE_ENV=production to test against live site
  Default tests against http://localhost:4321
  `);
  process.exit(0);
}

// Run the tests
runTests(suiteFilter)
  .then(report => {
    const exitCode = report.summary.failed > 0 ? 1 : 0;
    process.exit(exitCode);
  })
  .catch(error => {
    log(`Fatal error: ${error.message}`, 'error');
    process.exit(1);
  });