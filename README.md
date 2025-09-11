# Lovable Application

A modern React application with comprehensive testing, monitoring, and deployment infrastructure.

## Features

- **Frontend**: React 18 + TypeScript + Vite + TailwindCSS + shadcn/ui
- **Backend**: Supabase (Auth, Database, Edge Functions)
- **State Management**: Zustand + React Query
- **Testing**: Jest + React Testing Library + Playwright
- **Monitoring**: System health dashboard, log viewer, backup manager
- **Deployment**: Docker + Kubernetes + CI/CD with GitHub Actions

## Quick Start

### Development

```bash
# Install dependencies
npm install

# Start development server
npm run dev

# Run tests
npm run test
npm run test:e2e

# Build for production
npm run build
```

### Testing

```bash
# Unit tests
npm run test:unit

# Integration tests  
npm run test:integration

# E2E tests
npm run test:e2e

# Coverage report
npm run test:coverage
```

### Docker

```bash
# Build and run with Docker Compose
docker-compose up --build

# Production build
docker build -t lovable-app .
docker run -p 80:80 -p 443:443 lovable-app
```

### Kubernetes

```bash
# Deploy to Kubernetes
./scripts/deploy.sh deploy

# Check status
./scripts/deploy.sh status

# Rollback deployment
./scripts/deploy.sh rollback
```

## Architecture

### Frontend
- **React**: Component-based UI framework
- **TypeScript**: Type-safe development
- **TailwindCSS**: Utility-first CSS framework
- **shadcn/ui**: Beautiful and accessible components
- **React Router**: Client-side routing
- **React Query**: Server state management
- **Zustand**: Client state management

### Backend
- **Supabase**: Backend-as-a-Service
  - Authentication & Authorization
  - PostgreSQL Database with RLS
  - Edge Functions (Deno)
  - Real-time subscriptions
  - File storage

### Testing Strategy
- **Unit Tests**: Component and hook testing with Jest
- **Integration Tests**: Feature testing with React Testing Library
- **E2E Tests**: Full user journey testing with Playwright
- **Coverage**: 80%+ code coverage requirement

### Monitoring & Observability
- **System Health**: Response time, error rate, DB performance
- **Logging**: Centralized log aggregation with filtering
- **Backup**: Automated backup with encryption and recovery
- **Metrics**: Prometheus + Grafana dashboard
- **Alerts**: Real-time system alerts

### Deployment
- **CI/CD**: GitHub Actions pipeline
- **Security**: Automated security scanning
- **Docker**: Multi-stage builds with security best practices
- **Kubernetes**: Production-ready orchestration
- **SSL/TLS**: Automatic certificate management
- **Load Balancing**: High availability setup
- **Auto-scaling**: HPA based on CPU/memory usage

## Security

- **Authentication**: Supabase Auth with JWT tokens
- **Authorization**: Row Level Security (RLS) policies
- **HTTPS**: Force SSL redirect with security headers
- **Rate Limiting**: API and login rate limiting
- **Security Scanning**: Automated vulnerability scanning
- **Container Security**: Non-root user, minimal base images

## Monitoring

Access monitoring dashboards:
- **Application**: `/monitoring` (requires authentication)
- **Grafana**: `http://localhost:3000` (admin/admin)
- **Prometheus**: `http://localhost:9090`

## Environment Variables

```bash
# Supabase Configuration
SUPABASE_URL=your_supabase_url
SUPABASE_ANON_KEY=your_supabase_anon_key

# Optional: Additional secrets for edge functions
# Add via Lovable secrets manager or environment
```

## Project Structure

```
├── src/
│   ├── components/        # React components
│   ├── hooks/            # Custom hooks
│   ├── pages/            # Route components
│   ├── stores/           # Zustand stores
│   └── lib/              # Utilities
├── tests/
│   ├── integration/      # Integration tests
│   └── e2e/             # E2E tests
├── supabase/
│   ├── functions/        # Edge functions
│   └── migrations/       # Database migrations
├── k8s/                 # Kubernetes manifests
├── monitoring/          # Monitoring configurations
├── scripts/             # Deployment scripts
└── .github/workflows/   # CI/CD pipelines
```

## Contributing

1. Fork the repository
2. Create a feature branch: `git checkout -b feature/new-feature`
3. Make changes and add tests
4. Ensure all tests pass: `npm run test`
5. Create a pull request

## License

This project is private and confidential.

---

**Original Lovable Project**: https://lovable.dev/projects/9777f05f-4ed2-451d-8e7a-45dcd1941c8a