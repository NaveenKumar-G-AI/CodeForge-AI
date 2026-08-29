# CodeForge AI — Unified Product Architecture

## Overview

This document describes the complete integration of all 15 parts into a single, cohesive CodeForge AI platform. Each part represents a distinct capability that was built independently but designed with clear integration seams.

## Architecture Principles

1. **Single Source of Truth** - All domain types defined once in `unified/src/domain/types.ts`
2. **Provider Abstraction** - AI, execution, database, and auth behind interfaces
3. **Deterministic Core** - No LLM in scoring, selection, or evaluation decision paths
4. **Evidence-Driven** - Every state change backed by traceable evidence
5. **Security First** - RLS, input validation, sandbox isolation at every layer
6. **Modular Composition** - Each engine can be used independently or composed

## Part Integration Map

```
┌─────────────────────────────────────────────────────────────────────────────┐
│                        CODEFORGE AI UNIFIED PLATFORM                        │
├─────────────────────────────────────────────────────────────────────────────┤
│                                                                             │
│  ┌──────────────┐    ┌──────────────┐    ┌──────────────┐    ┌──────────┐  │
│  │   PART 1     │    │   PART 9     │    │   PART 5     │    │  PART 6  │  │
│  │ Role Context │───▶│ Mastery      │───▶│ Adaptive     │───▶│ Roadmap  │  │
│  │ & Identity   │    │ Engine       │    │ Engine       │    │ & Journey│  │
│  └──────────────┘    └──────────────┘    └──────────────┘    └──────────┘  │
│         │                   │                   │                   │       │
│         ▼                   ▼                   ▼                   ▼       │
│  ┌──────────────────────────────────────────────────────────────────────┐  │
│  │                    CORE DOMAIN (unified/src/domain)                  │  │
│  │  Student │ Role │ Skill │ Competency │ Technology │ Evidence │ ...  │  │
│  └──────────────────────────────────────────────────────────────────────┘  │
│         │                   │                   │                   │       │
│         ▼                   ▼                   ▼                   ▼       │
│  ┌──────────────┐    ┌──────────────┐    ┌──────────────┐    ┌──────────┐  │
│  │   PART 2     │    │   PART 3     │    │   PART 10    │    │  PART 4  │  │
│  │ Diagnostic   │    │ Challenge    │    │ Engineering  │    │Evaluation│  │
│  │ Engine       │    │ Engine       │    │ Simulator    │    │ Engine   │  │
│  └──────────────┘    └──────────────┘    └──────────────┘    └──────────┘  │
│         │                   │                   │                   │       │
│         ▼                   ▼                   ▼                   ▼       │
│  ┌──────────────────────────────────────────────────────────────────────┐  │
│  │                    EXECUTION LAYER (unified/src/execution)           │  │
│  │  Sandbox Runner │ Language Runtimes │ Resource Limits │ Security    │  │
│  └──────────────────────────────────────────────────────────────────────┘  │
│         │                   │                   │                   │       │
│         ▼                   ▼                   ▼                   ▼       │
│  ┌──────────────┐    ┌──────────────┐    ┌──────────────┐    ┌──────────┐  │
│  │   PART 8     │    │   PART 11    │    │   PART 12    │    │  PART 13 │  │
│  │ Interview    │    │ Incident     │    │ Submission   │    │ Result   │  │
│  │ Simulation   │    │ Engine       │    │ System       │    │ Analysis │  │
│  └──────────────┘    └──────────────┘    └──────────────┘    └──────────┘  │
│         │                   │                   │                   │       │
│         ▼                   ▼                   ▼                   ▼       │
│  ┌──────────────────────────────────────────────────────────────────────┐  │
│  │                      AI SERVICES (unified/src/ai)                    │  │
│  │  Provider Router │ Groq │ Gemini │ Anthropic │ Mock │ Prompts       │  │
│  └──────────────────────────────────────────────────────────────────────┘  │
│         │                   │                   │                   │       │
│         ▼                   ▼                   ▼                   ▼       │
│  ┌──────────────┐    ┌──────────────┐    ┌──────────────┐    ┌──────────┐  │
│  │   PART 14    │    │   PART 15    │    │  PART 10     │    │  PART 3  │  │
│  │ AI Code      │    │ Hint Ladder  │    │ AI Review    │    │ AI Gen   │  │
│  │ Coach        │    │ Progressive  │    │ (Eng. Sim)   │    │ Pipeline │  │
│  └──────────────┘    └──────────────┘    └──────────────┘    └──────────┘  │
│                                                                             │
└─────────────────────────────────────────────────────────────────────────────┘
```

## Data Flow

### 1. Student Onboarding Flow
```
Student Auth → Part 1 Role Selection → Career Context Set → Events Emitted
     │                                        │
     ▼                                        ▼
Part 9 Mastery Init ← Part 6 Roadmap Init ← Part 5 Adaptive Init
```

### 2. Practice Loop (Core)
```
Recommendation Request
         │
         ▼
┌─────────────────────────────────────────────┐
│ Part 5: recommendationService.getNext()     │
│  - Gap Analysis (Part 5 + Part 9)           │
│  - Prerequisite Check (Part 5)              │
│  - Difficulty Decision (Part 5 + Part 3)    │
│  - Candidate Retrieval (Part 3 + Part 1)    │
│  - Ranking (Part 5 + Part 3 weights)        │
│  - Intervention Selection (Part 5 + Part 14)│
└─────────────────────────────────────────────┘
         │
         ▼
Student Attempt (Code/Explanation)
         │
         ▼
┌─────────────────────────────────────────────┐
│ Part 12: Submission System                  │
│  - Immutable Snapshot                       │
│  - Queue → Worker                           │
└─────────────────────────────────────────────┘
         │
         ▼
┌─────────────────────────────────────────────┐
│ Part 13: Execution Result Analysis          │
│  - Normalization                            │
│  - Verdict Classification                   │
│  - Resource Analysis                        │
│  - Evidence Building                        │
│  - Redaction (hidden tests)                 │
│  - Finalization                             │
└─────────────────────────────────────────────┘
         │
         ▼
┌─────────────────────────────────────────────┐
│ Part 4/3: Evaluation + Diagnosis            │
│  - Deterministic Evaluation                 │
│  - Mistake Classification                   │
│  - Static Analysis                          │
│  - AI Diagnosis (if available)              │
│  - Evidence Recording (Part 9)              │
│  - Skill Update (Part 9 + Part 5)           │
│  - Feedback Generation (Part 14)            │
│  - Hint Ladder (Part 15)                    │
└─────────────────────────────────────────────┘
         │
         ▼
┌─────────────────────────────────────────────┐
│ Part 6: Roadmap Recalculation               │
│  - Priority Recompute                       │
│  - Milestone Check                          │
│  - Readiness Update                         │
│  - Daily/Weekly Plan Refresh                │
└─────────────────────────────────────────────┘
```

### 3. Assessment Flows
```
Diagnostic (Part 2) → Baseline Profile → Part 5/9 Mastery Init
Interview (Part 8) → Session Events → Evidence → Part 9 Mastery
Incident (Part 11) → Hypothesis Events → Evidence → Part 9 Mastery
Engineering Sim (Part 10) → Project Evaluation → Evidence → Part 9 Mastery
```

## Shared Interfaces

### Database
- **Primary**: PostgreSQL/Supabase with RLS (Part 1, 4, 5, 6, 8, 9, 11, 12, 13, 14, 15)
- **Dev/Test**: SQLite (Part 1, 3, 5) / In-memory (Part 13)
- **Schema**: Merged from all parts, de-duplicated

### AI Provider Abstraction
```
AIProvider Interface (Part 3, 4, 8, 9, 10, 14, 15)
  ├── GroqProvider
  ├── GeminiProvider
  ├── AnthropicProvider
  └── MockProvider (tests/fallback)
```

### Execution Provider
```
ExecutionProvider Interface (Part 3, 4, 12, 13)
  ├── LocalProcessProvider (dev)
  ├── ContainerProvider (prod)
  └── Judge0Provider (prod alt)
```

### Auth
```
AuthContext (Part 1, 4, 5, 8, 11, 12, 15)
  studentId, institutionId, role (student/staff/tpo)
```

## Unified API Surface

```
/api/v1
├── /auth
│   ├── POST /login
│   ├── POST /demo-login
│   └── GET  /me
├── /roles (Part 1)
│   ├── GET /domains
│   ├── GET /families
│   ├── GET /roles
│   ├── GET /roles/search
│   ├── GET /roles/compare
│   ├── GET /roles/:slug
│   └── GET /roles/:slug/requirements
├── /career-context (Part 1)
│   ├── GET /
│   ├── POST / (select role)
│   ├── GET /history
│   └── POST /change-target
├── /diagnostic (Part 2)
│   ├── POST /start
│   ├── GET /session/:id
│   ├── POST /session/:id/respond
│   └── GET /session/:id/report
├── /challenges (Part 3)
│   ├── GET /
│   ├── GET /:id
│   ├── POST /:id/attempt
│   ├── POST /:id/hint
│   └── GET /:id/hints
├── /practice (Part 5)
│   ├── GET /recommendation
│   ├── POST /attempt
│   ├── GET /skill/:id/state
│   └── GET /session/:id
├── /roadmap (Part 6)
│   ├── GET /
│   ├── GET /milestones
│   ├── GET /readiness
│   ├── GET /plan/daily
│   ├── GET /plan/weekly
│   └── POST /recalculate
├── /interview (Part 8)
│   ├── POST /start
│   ├── GET /session/:id
│   ├── POST /session/:id/message
│   ├── POST /session/:id/action
│   └── GET /session/:id/report
├── /incidents (Part 11)
│   ├── POST /start
│   ├── GET /:id
│   ├── POST /:id/hypothesis
│   ├── POST /:id/action
│   ├── POST /:id/logs
│   ├── POST /:id/metrics
│   ├── POST /:id/traces
│   └── GET /:id/postmortem
├── /projects (Part 10)
│   ├── GET /
│   ├── GET /:id
│   ├── POST /:id/submit
│   ├── POST /:id/revision
│   └── GET /:id/evidence
├── /submissions (Part 12/13)
│   ├── POST /
│   ├── GET /:id
│   ├── GET /:id/result
│   └── GET /history
├── /coach (Part 14)
│   ├── POST /session
│   ├── POST /session/:id/message
│   └── GET /session/:id/state
└── /hints (Part 15)
    ├── POST /request
    ├── GET /state/:sessionId
    └── GET /history/:sessionId
```

## Integration Seams (What Real Deployment Replaces)

| Seam | Interface | Current Implementation | Production Replacement |
|------|-----------|------------------------|------------------------|
| Auth | `createAuthMiddleware` | x-student-id header | JWT/Session verification |
| Student DB | `CareerContextRepo.getStudentById` | SQLite student table | PrepVista students table |
| Execution | `ExecutionProvider` | Local subprocess | Container/Firecracker/Judge0 |
| Challenge Bank | `ChallengeRepository` | Seeded challenges | Real challenge CMS |
| AI Providers | `AIProvider` | Mock + Groq/Gemini code | Real API keys + routing |
| Message Bus | `emitEvent` | Console log | Kafka/Redis Streams/NATS |
| Notifications | `NotificationService` | No-op | Email/Push/In-app |
| File Storage | `StorageProvider` | Local temp | S3/GCS/Azure Blob |

## Security Model

1. **Authentication** - All API routes require valid token (Part 1, 4, 5, 8, 11, 12, 15)
2. **Authorization** - Role-based (student, staff, TPO) + ownership checks
3. **RLS** - Every table has Row Level Security policies (Part 4, 5, 6, 8, 9, 11, 13, 14, 15)
4. **Execution Isolation** - Separate process per submission, resource limits (Part 3, 4, 12, 13)
5. **Input Validation** - Zod schemas on every endpoint (Part 1, 3, 4, 5, 8, 10, 11, 12, 14, 15)
6. **Output Redaction** - Hidden tests never in client responses (Part 1, 3, 4, 5, 12, 13)
7. **AI Guardrails** - Prompt injection guard, grounding check, output validation (Part 14, 15)
8. **Rate Limiting** - Per-student, per-endpoint limits (Part 4, 12, 14, 15)

## Testing Strategy

```
Unit Tests (per engine)
  ├── Domain logic (Part 1, 2, 3, 5, 6, 8, 9, 10, 13, 14, 15)
  ├── Engine algorithms (Part 2, 3, 5, 6, 8, 9, 10, 14, 15)
  └── Utilities (Part 1, 3, 4, 5, 13, 14, 15)

Integration Tests
  ├── API endpoints (Part 1, 4, 5, 8, 10, 11, 12, 15)
  ├── Database operations (Part 1, 4, 5, 6, 8, 9, 11, 12, 13, 14, 15)
  ├── Execution pipeline (Part 3, 4, 12, 13)
  └── AI provider wiring (Part 3, 4, 8, 9, 10, 14, 15)

E2E Tests
  ├── Full practice loop (Part 1→5→9→6)
  ├── Diagnostic flow (Part 1→2→9)
  ├── Interview flow (Part 1→8→9)
  ├── Incident flow (Part 1→11→9)
  └── Engineering project flow (Part 1→10→9)
```

## Deployment Architecture

```
┌─────────────────┐     ┌─────────────────┐     ┌─────────────────┐
│   API Gateway   │────▶│  Load Balancer  │────▶│  App Servers    │
│  (Rate Limit,   │     │  (Health Check) │     │  (Stateless)    │
│   Auth, SSL)    │     │                 │     │                 │
└─────────────────┘     └─────────────────┘     └────────┬────────┘
                                                          │
                    ┌─────────────────────────────────────┼───────────────┐
                    │                                     │               │
                    ▼                                     ▼               ▼
           ┌─────────────────┐                ┌─────────────────┐ ┌──────────────┐
           │  PostgreSQL     │                │  Redis          │ │  Execution   │
           │  (Supabase)     │                │  (Cache/Queue)  │ │  Fleet       │
           │  + RLS          │                │                 │ │  (Containers)│
           └─────────────────┘                └─────────────────┘ └──────────────┘
                    │                                     │               │
                    ▼                                     ▼               ▼
           ┌─────────────────┐                ┌─────────────────┐ ┌──────────────┐
           │  AI Providers   │                │  Message Bus    │ │  Object      │
           │  (Groq/Gemini/  │                │  (Events/Logs)  │ │  Storage     │
           │   Anthropic)    │                │                 │ │  (Artifacts) │
           └─────────────────┘                └─────────────────┘ └──────────────┘
```

## Migration Path

1. **Phase 1**: Deploy unified schema (merged migrations from all parts)
2. **Phase 2**: Deploy API servers with Part 1 (Role Context) as foundation
3. **Phase 3**: Add Part 5/9 (Adaptive + Mastery) - core practice loop
4. **Phase 4**: Add Part 6 (Roadmap) - planning layer
5. **Phase 5**: Add Part 3 (Challenge Engine) - richer challenges
6. **Phase 6**: Add Part 2 (Diagnostic) - baseline assessment
7. **Phase 7**: Add Part 8 (Interview) - interview prep
8. **Phase 8**: Add Part 11 (Incident) - SRE training
9. **Phase 9**: Add Part 10 (Engineering Sim) - project-based learning
10. **Phase 10**: Add Part 12/13 (Submission + Analysis) - production execution
11. **Phase 11**: Add Part 14/15 (Coach + Hints) - AI assistance

## Configuration

All tunable parameters centralized in `unified/src/config/index.ts`:
- Mastery weights, decay, thresholds
- Gap detection thresholds
- Difficulty adaptation rules
- Priority weights
- Ranking weights
- AI provider settings
- Execution limits
- Rate limit settings
- RLS policies

## Monitoring & Observability

- **Metrics**: Prometheus endpoints on each service
- **Logging**: Structured JSON logs with correlation IDs
- **Tracing**: OpenTelemetry spans across service boundaries
- **Events**: All state changes emit to message bus (Part 1, 4, 5, 6, 8, 11)
- **Audit**: Security-relevant actions logged to audit table

---

This architecture enables each part to function independently while composing into a powerful unified platform. The integration seams are minimal and well-defined, allowing incremental adoption.