# Entente Examples

This repository contains example applications demonstrating Entente contract testing patterns and best practices.

## Structure

```
entente-examples/
├── examples/
│   ├── castle-service/     # Provider example - French castle management API
│   └── castle-client/      # Consumer example - service that consumes castle-service
├── .github/workflows/      # CI/CD workflows for each example
├── package.json           # Root workspace configuration
├── pnpm-workspace.yaml    # pnpm workspace definition
└── README.md             # This file
```

## Examples

### Castle Service & Client

A complete provider/consumer example demonstrating contract testing between two services:

- **Castle Service** (`examples/castle-service/`) - A provider service managing French castle data
  - OpenAPI-first contract definition
  - Provider verification tests
  - Cloudflare Workers deployment
  - Hono API framework

- **Castle Client** (`examples/castle-client/`) - A consumer service that aggregates castle data
  - Consumer contract tests
  - Mock service integration
  - Real service verification
  - Automated deployment checks

## Prerequisites

- [Node.js 24+](https://nodejs.org/)
- [pnpm 9+](https://pnpm.io/)
- [Entente CLI](https://www.npmjs.com/package/@entente/cli) (installed via each example)
- [Cloudflare account](https://cloudflare.com/) (for deployment)

## Getting Started

### Install Dependencies

```bash
# Install all dependencies
pnpm install

# Or install for specific example
pnpm --filter castle-service install
pnpm --filter castle-client install
```

### Development

Each example can be developed independently:

```bash
# Castle Service
pnpm dev:castle-service
# or
cd examples/castle-service && pnpm dev

# Castle Client
pnpm dev:castle-client
# or
cd examples/castle-client && pnpm dev
```

### Testing

```bash
# Test all examples
pnpm test:all

# Test specific example
pnpm test:castle-service
pnpm test:castle-client
```

### Building

```bash
# Build all examples
pnpm build:all

# Build specific example
pnpm --filter castle-service build
pnpm --filter castle-client build
```

## Development Workflow

1. **Start the Provider**: Run `pnpm dev:castle-service` to start the castle service on port 4001
2. **Start the Consumer**: Run `pnpm dev:castle-client` to start the castle client on port 4002
3. **Run Tests**: Use `pnpm test:all` to run all contract tests
4. **Deploy**: Use GitHub workflows or manual deployment commands

## CI/CD

Each example has separate GitHub workflows:

- `castle-service-build-test.yml` - Build and test castle service
- `castle-service-deploy.yml` - Deploy castle service to Cloudflare Workers
- `castle-client-build-test.yml` - Build and test castle client
- `castle-client-deploy.yml` - Deploy castle client to Cloudflare Workers

Workflows are triggered by:
- Changes to the respective example directory
- Manual workflow dispatch
- Successful completion of build/test workflows (for deployment)

## Environment Configuration

Each example supports multiple environments:

- **Development** - `*-dev` naming, for integration testing
- **Staging** - `*-staging` naming, for pre-production validation
- **Production** - Base service names, for live traffic

## Adding New Examples

To add a new example (e.g., GraphQL, AsyncAPI):

1. Create a new directory under `examples/`
2. Add the example to `pnpm-workspace.yaml` (automatic with `examples/*` pattern)
3. Create GitHub workflows following the naming pattern:
   - `{example-name}-build-test.yml`
   - `{example-name}-deploy.yml`
4. Update this README with the new example

## Entente Integration

All examples demonstrate:

- **Contract Registration** - Services register their contracts with Entente
- **Deployment Verification** - `can-i-deploy` checks before deployment
- **Contract Testing** - Provider verification and consumer tests
- **Deployment Tracking** - Recording successful deployments

## Technologies Used

- **Runtime**: Node.js 24, Cloudflare Workers
- **Language**: TypeScript (functional style)
- **Framework**: Hono 4.x (API), React (if UI needed)
- **Testing**: Vitest 2.x
- **Package Management**: pnpm 9+ (workspace)
- **Contract Testing**: Entente

## Contributing

When contributing to examples:

1. Follow existing patterns and conventions
2. Ensure tests pass: `pnpm test:all`
3. Update documentation as needed
4. Test CI/CD workflows with manual dispatch

## Related

- [Entente Core Repository](https://github.com/cliftonc/entente) - Main Entente project
- [Entente Documentation](https://entente-docs.clifton-cunningham.workers.dev/) - Full documentation