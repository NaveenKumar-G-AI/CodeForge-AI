# CodeForge AI — Unified Platform

A unified platform for adaptive programming education, combining 15 independently-developed parts into a single cohesive system.

## Architecture Overview

```
unified/
├── src/
│   ├── domain/types.ts          # Single source of truth for all domain types
│   ├── config/index.ts          # All tunable parameters (mastery, gaps, difficulty, ranking, etc.)
│   ├── db/client.ts             # PostgreSQL/Supabase client with connection pooling
│   ├── repositories/index.ts    # Repository interfaces for all entities
│   ├── ai/
│   │   ├── types.ts             # AI provider interface & schemas
│   │   ├── providers.ts         # Groq, Gemini, Anthropic, Mock implementations
│   │   └── index.ts             # AI service factory
│   ├── execution/
│   │   ├── types.ts             # Execution provider interface & limits
│   │   ├── localProcessProvider.ts  # Dev execution provider
│   │   └── index.ts             # Execution service
│   ├── engine/
│   │   ├── mastery.ts           # Mastery estimation engine (Parts 5, 9)
│   │   ├── gaps.ts              # Gap detection engine (Parts 5, 9)
│   │   ├── difficulty.ts        # Difficulty adaptation (Parts 3, 5)
│   │   ├── recommendation.ts    # Recommendation pipeline (Parts 5, 3)
│   │   ├── roadmap.ts           # Roadmap & planning (Part 6)
│   │   └── index.ts             # Engine registry
│   ├── api/
│   │   ├── middleware/auth.ts   # Auth, RBAC, rate limiting
│   │   └── routes/              # API routes for all 15 parts
│   └── server.ts                # Main Express server
├── db/
│   ├── migrations/
│   │   ├── 0001_core_schema.sql # Complete merged schema
│   │   └── 0002_rls_policies.sql # Row Level Security policies
│   └── seed/                    # Seed data
└── scripts/
    ├── migrate.ts               # Migration runner
    └── seed.ts                  # Database seeder
```

## Parts Integrated

| Part | Feature | Status |
|------|---------|--------|
| 1 | Role Context & Career Identity | ✅ |
| 2 | Diagnostic Engine | ✅ |
| 3 | Challenge Engine | ✅ |
| 4 | Evaluation Engine | ✅ |
| 5 | Adaptive Engine | ✅ |
| 6 | Roadmap & Mastery Journey | ✅ |
| 8 | Interview Simulation | ✅ |
| 9 | Mastery Estimation | ✅ |
| 10 | Engineering Simulator | ✅ |
| 11 | Incident Engine | ✅ |
| 12 | Submission System | ✅ |
| 13 | Execution Result Analysis | ✅ |
| 14 | AI Code Coach | ✅ |
| 15 | Hint Ladder | ✅ |

## Quick Start

```bash
# Install dependencies
npm install

# Set up environment variables
cp .env.example .env
# Edit .env with your database URL and API keys

# Run migrations
npm run db:migrate

# Seed development data
npm run db:seed

# Start development server
npm run dev
```

## Environment Variables

```env
# Database
DB_HOST=localhost
DB_PORT=5432
DB_NAME=codeforge
DB_USER=postgres
DB_PASSWORD=postgres
DB_SSL=false

# JWT
JWT_SECRET=your-secret-key
JWKS_URL=https://your-auth-provider.com/.well-known/jwks.json

# AI Providers (at least one required for AI features)
GROQ_API_KEY=your-groq-key
GEMINI_API_KEY=your-gemini-key
ANTHROPIC_API_KEY=your-anthropic-key

# Server
PORT=3000
NODE_ENV=development
CORS_ORIGINS=http://localhost:3000,http://localhost:5173
```

## API Endpoints

### Health
- `GET /api/health` - Health check
- `GET /api/health/live` - Liveness probe
- `GET /api/health/ready` - Readiness probe

### Career Context (Part 1)
- `GET /api/v1/roles/domains` - List career domains
- `GET /api/v1/roles/families` - List role families
- `GET /api/v1/roles` - List/search roles
- `GET /api/v1/roles/:slug` - Get role details
- `GET /api/v1/roles/compare?slugs=a,b` - Compare roles
- `GET /api/v1/career-context` - Get student's career context
- `POST /api/v1/career-context` - Select primary/secondary role
- `GET /api/v1/career-context/history` - Role selection history
- `POST /api/v1/career-context/change-target` - Change target role

### Practice (Parts 3, 5, 9)
- `GET /api/v1/practice/recommendation` - Get next recommended challenge
- `POST /api/v1/practice/attempt` - Submit code attempt
- `GET /api/v1/practice/skill/:skillId/state` - Get skill mastery state

### Roadmap (Part 6)
- `GET /api/v1/roadmap` - Full roadmap view
- `GET /api/v1/roadmap/milestones` - List milestones
- `GET /api/v1/roadmap/readiness` - Readiness report
- `GET /api/v1/roadmap/plan/daily` - Daily practice plan
- `GET /api/v1/roadmap/plan/weekly` - Weekly practice plan
- `POST /api/v1/roadmap/recalculate` - Trigger recalculation

### Interview (Part 8)
- `GET /api/v1/interview/blueprints` - List interview blueprints
- `POST /api/v1/interview/start` - Start interview session
- `GET /api/v1/interview/session/:id` - Get session state
- `POST /api/v1/interview/session/:id/action` - Send interview action
- `GET /api/v1/interview/session/:id/report` - Get interview report

### Incidents (Part 11)
- `GET /api/v1/incidents/blueprints` - List incident blueprints
- `POST /api/v1/incidents/start` - Start incident simulation
- `GET /api/v1/incidents/:id` - Get incident state
- `POST /api/v1/incidents/:id/hypothesis` - Propose hypothesis
- `POST /api/v1/incidents/:id/action` - Take action
- `GET /api/v1/incidents/:id/postmortem` - Get postmortem

### Projects (Part 10)
- `GET /api/v1/projects` - List projects
- `GET /api/v1/projects/:id` - Get project details
- `POST /api/v1/projects/:id/submit` - Submit project
- `POST /api/v1/projects/:id/revision` - Submit revision
- `GET /api/v1/projects/:id/evidence` - Get evidence from evaluations

### Submissions (Parts 12, 13)
- `POST /api/v1/submissions` - Create submission (async)
- `GET /api/v1/submissions/:id` - Get submission details
- `GET /api/v1/submissions/:id/result` - Get evaluation result
- `GET /api/v1/submissions/history` - Submission history

### AI Coach (Part 14)
- `POST /api/v1/coach/session` - Start coaching session
- `GET /api/v1/coach/session/:id` - Get session with messages
- `POST /api/v1/coach/session/:id/message` - Send message to coach
- `GET /api/v1/coach/session/:id/state` - Get session state

### Hints (Part 15)
- `POST /api/v1/hints/request` - Request progressive hint
- `GET /api/v1/hints/state/:sessionId` - Get hint ladder state
- `GET /api/v1/hints/history/:sessionId` - Get hint history

## Key Design Decisions

### 1. Single Source of Truth
All domain types defined in `src/domain/types.ts` — no duplication across parts.

### 2. Provider Abstraction
- **AI Providers**: Groq, Gemini, Anthropic behind common interface
- **Execution Providers**: Local process, Container, Firecracker, Judge0
- **Database**: PostgreSQL (prod), SQLite (dev), In-memory (test)

### 3. Deterministic Core
No LLM in scoring, selection, or evaluation decision paths. AI only used for:
- Failure diagnosis
- Feedback generation
- Explanation evaluation
- Hint generation
- Coaching commentary

### 4. Evidence-Driven
Every state change backed by traceable `Evidence` records with:
- Raw score (0-1)
- Difficulty weight
- Independence signal
- Context type (STANDARD/NOVEL/VERIFICATION/TRANSFER/EXPLORATION)
- Mistake category
- Timestamp

### 5. Security First
- Row Level Security on all student-data tables
- JWT authentication with role-based access (student/staff/tpo/admin)
- Rate limiting on all mutation endpoints
- Sandboxed code execution with resource limits
- Hidden test cases never exposed to clients

## Configuration

All tunable parameters in `src/config/index.ts`:
- Mastery weights, decay, thresholds
- Gap detection thresholds
- Difficulty adaptation rules
- Ranking weights
- Scheduler limits
- Readiness bands
- Execution limits per language
- Rate limits
- AI provider settings

## Testing

```bash
# Static checks
npm run typecheck
npm run lint

# Build and tests
npm run build
npm test
```

## Deployment

### Production Build

```bash
npm ci
npm run typecheck
npm run lint
npm test
npm run build
npm start
```

The production entrypoint is `dist/server.js`. Health probes are:

- `GET /api/health/live` - liveness, returns 200 when the Node process is serving
- `GET /api/health/ready` - readiness, returns 200 only when dependencies such as the database are healthy

### Docker

This folder includes a production Dockerfile.

```bash
docker build -t codeforge-ai-unified .
docker run --env-file .env -p 3000:3000 codeforge-ai-unified
```

### Production Requirements

- Configure `DB_HOST`, `DB_PORT`, `DB_NAME`, `DB_USER`, `DB_PASSWORD`, and `DB_SSL` for PostgreSQL/Supabase.
- Run `npm run db:migrate` before serving real traffic.
- Set `NODE_ENV=production`, a strong `JWT_SECRET` or `JWKS_URL`, and production CORS origins.
- Add at least one AI provider key for AI-backed features.
- Without a reachable database, the server starts in degraded mode and `/api/health/ready` returns 503; liveness still returns 200 for platform diagnostics.

## License

MIT
