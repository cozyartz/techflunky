# License Structure for TechFlunky

TechFlunky uses a **dual licensing model** to balance commercial interests with community contributions:

## 1. Commercial License (Primary)

**File**: `LICENSE`

The TechFlunky platform itself is licensed under a commercial license by Autimind, Inc. This includes:
- The marketplace platform
- Deployment automation system
- Payment processing integration
- Core business logic

**Key Terms**:
- ✅ Deploy for your own use
- ✅ Create and sell packages
- ✅ Modify for internal needs
- ❌ Cannot resell the platform
- ❌ Cannot remove attribution
- ❌ Cannot create competing platforms

## 2. Open Source Components

**File**: `LICENSE-OSS`

Certain components are available under open source licenses:

### MIT Licensed Components
- Example business packages in `/packages/examples/`
- Package creation templates
- CLI tool core functionality
- Documentation and guides

### Why This Split?

1. **Platform Protection**: The core platform remains proprietary to protect the business model
2. **Community Growth**: Examples and tools are open source to help the ecosystem grow
3. **Fair Use**: Buyers can modify their deployments without restriction
4. **Clear Boundaries**: No ambiguity about what can be freely used

## 3. Package Licenses

Individual business packages can be licensed however the creator chooses:
- Package creators retain full ownership
- Can use any license (MIT, GPL, proprietary, etc.)
- Platform takes 15% fee regardless of package license

## 4. Contributing

Contributors must sign a Contributor License Agreement (CLA) that:
- Grants Autimind, Inc. rights to use contributions
- Allows contributor to retain copyright
- Enables dual licensing model

## Summary

```
TechFlunky Platform → Commercial License (Proprietary)
├── Core Platform → Autimind, Inc. owns
├── Examples → MIT License
├── CLI Tools → MIT License
└── Your Packages → Your choice of license
```

This structure:
- Protects the business model
- Encourages community contribution
- Provides clarity for all parties
- Allows flexible package licensing

For questions: legal@autimind.com
