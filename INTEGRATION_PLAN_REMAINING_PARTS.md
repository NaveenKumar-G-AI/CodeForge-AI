# Integration Plan: Parts 33&37, 35, 36, 38, 39, 40 into Unified

## Executive Summary

The `unified/` folder already contains:
- **Domain types** for ALL parts (1-40) in `src/domain/types.ts` (5,660+ lines)
- **Database migrations** for Parts 1-32 (56 tables in 0001, analysis features in 0003)
- **Engine scaffolding** for Parts 33&37 (integrations), 35 (interview), 36 (cohort-intelligence)
- **API route scaffolding** for Parts 33&37, 35, 36

**Missing completely**: Engine implementations for Parts 38 (Technical Mastery Report), 39 (AI Gateway), 40 (Security/Audit/Reliability)
**Broken**: Pre-existing type errors (~739) in Parts 16-32 engines from interrupted merges

---

## Part-by-Part Integration Strategy

### Part 33&37: PrepVista Integration ✅ SCAFFOLDED
**Status**: Engine (`src/engine/integrations/`), Routes (`src/api/routes/integrations/`), Types defined
**Work needed**:
1. Fix type errors in `IntegrationService.ts`, `IntegrationEngine.ts`, `ProfileBuilder.ts`
2. Wire `ProfileBuilder` to consume existing unified engines (mastery, gaps, readiness, growth, signal)
3. Add repository implementations for integration tables (need DB migration)
4. Add background workers (sync, event-delivery) to server initialization

### Part 35: Technical Interview Integration ✅ SCAFFOLDED
**Status**: Engine (`src/engine/interview/`), Routes (`src/api/routes/interview/`), Types defined
**Work needed**:
1. Fix type errors in `InterviewOrchestrator.ts`, `BlueprintBuilder.ts`, etc.
2. Wire `InterviewOrchestrator` ports to unified engines:
   - `RoleSkillModelPort` → Role/Competency engine (Part 1)
   - `CandidateEvidencePort` → StudentSkillState/Evidence (Parts 5,9)
   - `SkillSignalEnginePort` → Signal engine (Part 26)
   - `ReasoningVerificationPort` → Reasoning engine (Part 18)
   - `DebuggingCoachPort` → Debugging/Coach engines (Parts 22,14)
   - `AIGatewayPort` → AI Gateway (Part 39)
3. Add interview tables to DB migration (need migration 0004)
4. Wire interview routes in server

### Part 36: Cohort Intelligence ✅ SCAFFOLDED
**Status**: Engine (`src/engine/cohort-intelligence/`), Routes (`src/api/routes/cohort-intelligence/`), Types defined
**Work needed**:
1. Fix type errors in `AggregationService.ts`, `DashboardService.ts`, etc.
2. Implement `CodeForgeIntelligencePorts` (4 ports) using unified engines:
   - `SkillSignalPort` → Signal engine
   - `RoleReadinessPort` → Readiness engine
   - `GrowthTrackingPort` → Growth engine
   - `NextBestActionPort` → Coach engine
3. Add cohort tables to DB migration (need migration 0004)
4. Add in-memory queue worker to server initialization

### Part 38: Technical Mastery Report ❌ MISSING ENGINE
**Status**: Types defined in `src/domain/types.ts`, NO engine, NO routes
**Work needed**:
1. Create `src/engine/report/` with:
   - `ReportAssembler.ts` - Maps collected data → validated DTO (presentational only)
   - `ReportCache.ts` - Idempotency + freshness (UP_TO_DATE/STALE)
   - `ReportDataCollector.ts` - Fans out to all ports in parallel
   - `ReportGenerationService.ts` - Orchestrates collect→assemble→narrate→validate→publish
   - `ReportValidator.ts` - Zod schema + cross-referential checks
   - `NarrativeService.ts` - AI attempt → guardrail → fallback template
   - `ReportRepository.ts` - CRUD + status transitions
   - `ReportExportPDF.ts` - PDFKit export
2. Implement 10 port interfaces from `domain/types.ts` (lines ~5023-5084):
   - IdentityPort, DataVersionPort, MasteryPort, RoleReadinessPort, SkillGapPort, GrowthPort, NextBestActionPort, CodingEvidencePort, ProjectEvidencePort, InterviewEvidencePort
3. Create `src/api/routes/report.ts` with endpoints:
   - POST /reports, GET /reports/:id, POST /reports/:id/regenerate
   - POST /reports/:id/export.pdf, POST /reports/:id/share, POST /reports/bulk
4. Add report tables to DB migration (need migration 0004)
5. Wire in server initialization

### Part 39: AI Gateway ❌ MISSING ENGINE
**Status**: Types defined in `src/domain/types.ts` (lines ~5085-5400), NO engine, NO routes
**Work needed**:
1. Create `src/engine/ai-gateway/` with:
   - `AIGateway.ts` - Main orchestrator (never throws, returns typed results)
   - `ModelRouter.ts` - Deterministic, capability-aware routing
   - `BudgetEngine.ts` - Reserve-then-settle, race-safe
   - `QuotaEngine.ts` - Request-count limits
   - `RateLimiter.ts` - Token bucket per key
   - `ConcurrencyController.ts` - Semaphore + bounded queue
   - `CircuitBreaker.ts` - Closed→Open→Half-Open
   - `RetryEngine.ts` - Exponential backoff + jitter
   - `FallbackRouter.ts` - Capability-matched fallback
   - `CacheLayer.ts` - Structurally isolated keys
   - `ContextManager.ts` - Token-budget enforcement
   - `CostCalculator.ts` - Single source of cost truth
   - `Telemetry.ts` - Aggregates, percentiles, breakdowns
   - `AuditLog.ts` - Tenant-isolated audit events
   - `AnomalyDetector.ts` - Z-score detector
   - `EmergencyControls.ts` - Kill switch, task/provider disable
2. Implement `AIProviderAdapter` interface (line 5327) for Anthropic, OpenAI, Groq, Gemini
3. Create `src/api/routes/ai-gateway.ts` with endpoints:
   - POST /execute, GET /analytics/*, GET /models, GET /providers
   - POST /policies, GET /budgets, GET /quotas, GET /alerts
   - POST /admin/emergency/*
4. Add AI Gateway tables to DB migration (need migration 0004)
5. Wire in server initialization (replaces current `src/ai/` and `src/engine/gateway/`)

### Part 40: Security, Audit & Reliability ❌ MISSING ENGINE
**Status**: Types defined in `src/domain/types.ts` (lines ~5389-5650), NO engine, NO routes
**Work needed**:
1. Create `src/engine/security/` with:
   - `SecurityEventsService.ts` - Single write path for security_event
   - `AlertEngine.ts` - 5 detection rules, deduplication
   - `SessionService.ts` - createSession, listSessions, revokeSession
   - `AuditService.ts` - Central audit log, immutability
   - `IncidentService.ts` - State machine (OPEN→INVESTIGATING→MITIGATING→MONITORING→RESOLVED)
   - `HealthService.ts` - Live dependency checks, essential/non-essential rollup
   - `DependencyCheckers.ts` - DB, AI Gateway, Sandbox checkers
2. Create `src/api/routes/security.ts`, `audit.ts`, `incidents.ts`, `sessions.ts`, `health.ts`
3. Add security tables to DB migration (need migration 0004)
4. Wire middleware: auth (JWT), authorize (RBAC), tenantIsolation, rateLimit, auditMiddleware
5. Replace current `src/api/middleware/auth.ts` with Part 40's implementation
6. Wire in server initialization

---

## Database Migration Strategy

**Migration 0004: Parts 33-40 Tables**
- PrepVista Integration tables (10+ tables)
- Technical Interview tables (5+ tables)
- Cohort Intelligence tables (8+ tables)
- Technical Mastery Report tables (4+ tables)
- AI Gateway tables (8+ tables)
- Security/Audit/Incident tables (7+ tables)

Total: ~42 new tables, all with RLS policies

---

## Implementation Order (Dependency-Aware)

| Phase | Parts | Dependencies | Est. Files |
|-------|-------|--------------|------------|
| 1 | **Fix existing type errors** | None | ~50 files |
| 2 | **Part 39 (AI Gateway)** | None (foundational) | ~20 files |
| 3 | **Part 40 (Security/Audit)** | Part 39 | ~15 files |
| 4 | **Part 38 (Reports)** | Parts 39, 40, 35, 36 | ~12 files |
| 5 | **Part 33&37 (Integration)** | Parts 39, 40 | ~8 files |
| 6 | **Part 35 (Interview)** | Parts 39, 40 | ~10 files |
| 7 | **Part 36 (Cohort)** | Parts 39, 40 | ~8 files |
| 8 | **DB Migration 0004 + RLS** | All above | 2 files |
| 9 | **Wire all in server.ts** | All above | 1 file |
| 10 | **Type-check & verify** | All above | - |

---

## Key Integration Principles (from each part's spec)

1. **Port/Adapter Pattern**: Every part defines ports (interfaces) for upstream systems. Unified must implement these using existing engines — **never reimplement** mastery, readiness, gaps, growth, signal, etc.

2. **Single Source of Truth**: `src/domain/types.ts` is canonical. All engines/routes import from here.

3. **Deterministic Core**: No `Math.random()` in scoring/selection/evaluation. AI only for enrichment (narratives, question generation).

4. **Evidence-Driven**: All state changes backed by traceable `Evidence` records.

5. **Tenant Isolation**: RLS on all student-data tables, JWT auth, org-scoped queries.

6. **Never Fabricate**: If evidence insufficient → return INSUFFICIENT/UNCERTAIN, never guess.

7. **Graceful Degradation**: AI optional, fallback templates, circuit breakers.

8. **Observability**: Every operation audited, costs tracked, health monitored.

---

## Files to Create/Modify (Estimated)

### New Files (~95)
```
src/engine/ai-gateway/          16 files (router, budget, quota, circuit, retry, etc.)
src/engine/security/            7 files (events, alerts, sessions, audit, incidents, health)
src/engine/report/              8 files (collector, assembler, cache, narrative, repo, export)
src/api/routes/ai-gateway.ts    1 file
src/api/routes/security.ts      1 file
src/api/routes/audit.ts         1 file
src/api/routes/incidents.ts     1 file
src/api/routes/sessions.ts      1 file
src/api/routes/health.ts        1 file
src/api/routes/report.ts        1 file
db/migrations/0004_parts_33_40.sql  1 file
db/migrations/0005_rls_parts_33_40.sql 1 file
```

### Modify Existing (~50)
```
src/domain/types.ts             Remove duplicates, fix conflicts
src/engine/integrations/        Fix 15 type errors, wire ProfileBuilder
src/engine/interview/           Fix 20 type errors, wire ports
src/engine/cohort-intelligence/ Fix 61 type errors, implement ports
src/engine/gateway/             REPLACE with Part 39 engine
src/ai/                         REPLACE with Part 39 engine
src/api/middleware/auth.ts      REPLACE with Part 40 implementation
src/api/routes/index.ts         Add new route imports
src/server.ts                   Add new engine initializations
src/config/index.ts             Add Part 39/40 configs
src/repositories/index.ts       Add new repository interfaces
```

---

## Verification Checklist

- [ ] `npm run typecheck` passes (0 errors)
- [ ] `npm run build` succeeds
- [ ] `npm run db:migrate` applies all 5 migrations cleanly
- [ ] `npm run db:seed` creates test data for all parts
- [ ] `npm run dev` starts server on :3000
- [ ] All API endpoints return 200/401/404 (not 500)
- [ ] Health endpoint returns `{status: "healthy"}`
- [ ] Each part's golden scenarios can be exercised via API

---

## Risk Mitigation

| Risk | Mitigation |
|------|------------|
| 739 pre-existing type errors | Fix Phase 1 first, in topological order (leaf engines first) |
| Duplicate types (TechnicalProfile x2) | Consolidate to single definition in Phase 1 |
| DB migration conflicts | Write 0004/0005 as idempotent (IF NOT EXISTS), test on clean DB |
| Port wiring complexity | Implement each port as thin adapter calling existing engine |
| Server startup complexity | Add engines to `EngineRegistry` incrementally, test each |

---

## Next Action

Start **Phase 1: Fix Existing Type Errors** — work through engines in dependency order:
1. `src/engine/coach/` (20 errors)
2. `src/engine/debugging/` (2 errors)
3. `src/engine/adaptive/` (5 errors)
4. `src/engine/growth/` (6 errors)
5. `src/engine/complexity/` (1 error)
6. `src/engine/consistency/` (21 errors)
7. `src/engine/quality/` (30 errors)
8. `src/engine/correctness/` (52 errors)
9. `src/engine/signal/` (28 errors)
10. `src/engine/reasoning/` (83 errors)
11. `src/engine/cohort-intelligence/` (61 errors)
12. `src/engine/interview/` (20 errors)
13. `src/engine/integrations/` (15 errors)
14. `src/api/routes/` (99 errors)
15. `src/ai/`, `src/engine/gateway/` (replace entirely in Phase 2)
```