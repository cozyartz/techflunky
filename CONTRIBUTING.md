# Contributing to TechFlunky

First off, thank you for considering contributing to TechFlunky! It's people like you that make TechFlunky such a great platform for entrepreneurs worldwide.

## Code of Conduct

By participating in this project, you agree to abide by our Code of Conduct:

- **Be respectful**: We're all here to help each other
- **Be constructive**: Criticism should be helpful, not hurtful
- **Be inclusive**: Everyone is welcome regardless of background
- **Be professional**: Keep discussions focused on the project

## How Can I Contribute?

### Reporting Bugs

Before creating bug reports, please check existing issues to avoid duplicates. When creating a bug report, include:

1. **Clear title**: Summarize the issue
2. **Environment**: OS, Node version, browser
3. **Steps to reproduce**: Be specific
4. **Expected behavior**: What should happen
5. **Actual behavior**: What actually happens
6. **Screenshots**: If applicable
7. **Error messages**: Full stack traces

**Example Bug Report:**
```markdown
Title: Deployment fails when package contains spaces in Worker name

Environment:
- OS: macOS 13.4
- Node: 18.16.0
- Browser: Chrome 115

Steps to reproduce:
1. Create package with `techflunky init "My Package"`
2. Add worker with `techflunky add-worker "api gateway"`
3. Attempt deployment

Expected: Worker deploys successfully
Actual: Error "Invalid worker name"

Error:
```
Error: Worker name "api gateway" contains invalid characters
  at validateWorkerName (deployment-manager.ts:145)
```
```

### Suggesting Enhancements

Enhancement suggestions are tracked as GitHub issues. Include:

1. **Use case**: Why is this needed?
2. **Proposed solution**: How should it work?
3. **Alternatives**: Other approaches considered
4. **Additional context**: Mockups, examples

### Pull Requests

1. Fork the repo and create your branch from `main`
2. If you've added code, add tests
3. If you've changed APIs, update documentation
4. Ensure the test suite passes
5. Make sure your code follows the style guide
6. Issue the pull request

## Development Setup

### Prerequisites

- Node.js 18+
- npm or yarn
- Cloudflare account
- Git

### Local Development

```bash
# Fork and clone the repo
git clone https://github.com/YOUR_USERNAME/techflunky.git
cd techflunky

# Install dependencies
npm install

# Create environment file
cp .env.example .env.local

# Start development server
npm run dev
```

### Project Structure

```
techflunky/
├── src/
│   ├── components/     # React components
│   ├── layouts/        # Page layouts
│   ├── lib/           # Core libraries
│   │   ├── deployment/ # Deployment system
│   │   └── stripe/     # Payment processing
│   └── pages/         # Astro pages
├── cli/               # CLI tool
├── packages/          # Example packages
├── docs/              # Documentation
└── tests/             # Test suites
```

## Style Guide

### TypeScript/JavaScript

We use ESLint and Prettier for code formatting. Run before committing:

```bash
npm run lint
npm run format
```

**Key conventions:**
- Use TypeScript for new code
- Prefer `const` over `let`
- Use async/await over promises
- Add JSDoc comments for public APIs

**Example:**
```typescript
/**
 * Deploys a business package to buyer's Cloudflare account
 * @param apiToken - Buyer's Cloudflare API token
 * @param packageId - ID of the package to deploy
 * @returns Deployment result with resource details
 */
export async function deployPackage(
  apiToken: string,
  packageId: string
): Promise<DeploymentResult> {
  // Implementation
}
```

### React Components

- Use functional components with hooks
- Props interfaces should be exported
- Use Tailwind classes for styling

**Example:**
```tsx
export interface ButtonProps {
  variant?: 'primary' | 'secondary';
  size?: 'sm' | 'md' | 'lg';
  onClick?: () => void;
  children: React.ReactNode;
}

export function Button({ 
  variant = 'primary',
  size = 'md',
  onClick,
  children 
}: ButtonProps) {
  const classes = cn(
    'rounded-lg font-semibold transition',
    {
      'bg-indigo-900 text-white': variant === 'primary',
      'bg-gray-200 text-gray-800': variant === 'secondary',
      'px-3 py-1.5 text-sm': size === 'sm',
      'px-4 py-2': size === 'md',
      'px-6 py-3 text-lg': size === 'lg',
    }
  );
  
  return (
    <button className={classes} onClick={onClick}>
      {children}
    </button>
  );
}
```

### Commit Messages

Follow the [Conventional Commits](https://www.conventionalcommits.org/) specification:

```
type(scope): subject

body

footer
```

**Types:**
- `feat`: New feature
- `fix`: Bug fix
- `docs`: Documentation only
- `style`: Code style changes
- `refactor`: Code refactoring
- `test`: Adding tests
- `chore`: Maintenance

**Examples:**
```
feat(deployment): add multi-region support

- Add region selection in deployment config
- Update CloudflareForSaaSManager to handle regions
- Add tests for regional deployment

Closes #123
```

## Testing

### Running Tests

```bash
# Run all tests
npm test

# Run specific test file
npm test deployment.test.ts

# Run with coverage
npm run test:coverage

# Run in watch mode
npm run test:watch
```

### Writing Tests

Use Vitest for unit tests:

```typescript
import { describe, it, expect, beforeEach } from 'vitest';
import { PackageBuilder } from '../src/lib/deployment/package-builder';

describe('PackageBuilder', () => {
  let builder: PackageBuilder;
  
  beforeEach(() => {
    builder = new PackageBuilder('Test Package', 'test-package');
  });
  
  it('should create package with correct name', () => {
    const pkg = builder.build();
    expect(pkg.name).toBe('Test Package');
  });
  
  it('should validate package before building', () => {
    expect(() => builder.build()).toThrow('Package description is required');
  });
});
```

### Integration Tests

Test complete flows:

```typescript
describe('Deployment Flow', () => {
  it('should deploy package successfully', async () => {
    const mockPackage = createMockPackage();
    const deployment = new BusinessDeploymentManager(
      process.env.TEST_API_TOKEN,
      mockPackage
    );
    
    const result = await deployment.deployToBuyerAccount();
    
    expect(result.success).toBe(true);
    expect(result.resources.workers).toHaveLength(2);
    expect(result.resources.databases).toHaveLength(1);
  });
});
```

## Documentation

### Where to Document

- **Code**: JSDoc comments for functions/classes
- **API**: OpenAPI/Swagger specifications
- **Guides**: Markdown files in `/docs`
- **README**: High-level project information

### Documentation Style

- Use clear, concise language
- Include code examples
- Add diagrams where helpful
- Keep it up-to-date

**Example:**
```markdown
## Deployment API

The deployment API automates package deployment to Cloudflare.

### Endpoint

```
POST /api/deploy
Content-Type: application/json
Authorization: Bearer <platform-token>
```

### Request Body

```json
{
  "packageId": "pkg_123",
  "buyerApiToken": "cf_token_xxx",
  "customDomain": "app.example.com"
}
```

### Response

```json
{
  "success": true,
  "deploymentId": "dep_456",
  "dashboardUrl": "https://app.example.com/admin",
  "resources": {
    "workers": ["api-gateway", "cron-processor"],
    "databases": ["main-db"],
    "buckets": ["uploads"]
  }
}
```
```

## Release Process

### Version Numbers

We use [Semantic Versioning](https://semver.org/):
- **MAJOR**: Breaking API changes
- **MINOR**: New features, backwards compatible
- **PATCH**: Bug fixes

### Release Steps

1. **Update version**:
   ```bash
   npm version patch|minor|major
   ```

2. **Update CHANGELOG**:
   ```markdown
   ## [1.2.0] - 2024-01-15
   
   ### Added
   - Multi-region deployment support
   - Package versioning system
   
   ### Fixed
   - Deployment timeout issues
   - Database migration order
   ```

3. **Create PR**: Target `main` branch

4. **After merge**: Tag and release
   ```bash
   git tag v1.2.0
   git push origin v1.2.0
   ```

## Community

### Getting Help

- **Discord**: [discord.gg/techflunky](https://discord.gg/techflunky)
- **Forum**: [community.techflunky.com](https://community.techflunky.com)
- **Email**: developers@techflunky.com

### Recognition

Contributors are recognized in:
- CONTRIBUTORS.md file
- Release notes
- Annual contributor report

## Legal

### Contributor License Agreement

By contributing, you agree that:
1. You have the right to submit the work
2. You grant us a perpetual, worldwide license
3. Your contributions are under MIT license

### Code Attribution

When using code from other sources:
1. Ensure license compatibility
2. Add attribution in code comments
3. Update NOTICES file if required

**Example:**
```javascript
// Based on stripe-node SDK
// https://github.com/stripe/stripe-node
// Licensed under MIT
```

## Questions?

Feel free to:
- Open an issue for discussion
- Join our Discord community
- Email maintainers@techflunky.com

Thank you for helping make TechFlunky better for everyone! 🚀
