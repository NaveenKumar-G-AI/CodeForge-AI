# CodeForge AI — Integration Map & Plan: Parts 16–29 into Unified Platform

**Status:** ANALYSIS COMPLETE — Ready for Phase A execution  
**Author:** Principal Software Architect (with full cross-functional board review)  
**Date:** 2026-08-22

---

## Executive Summary

Completed deep analysis of all 14 modules (`part16`–`part29`) against the existing `unified/` platform (Parts 1–15). Identified **three critical architectural conflicts** requiring decisions (documented below) and produced a phased integration plan.

**Do NOT touch `part1`–`part15` folders.** All integration happens inside `unified/`.

---

## 1. Module-by-Module Vetting Map

| Part | Feature | Lang | Core Engine | DB Tables | Tests | Integration Risk |
|------|---------|------|-------------|-----------|-------|------------------|
| 16 | Code Correctness Analysis | TS | deterministic classifier + AI explain | 4 | 80 | Medium |
| 17 | Complexity Analysis | **Python** | AST-based algebra | 3 | 69 | **High** (stack mismatch) |
| 18 | Code Quality Engine | TS | AST IR + 14-rule engine | 1 | 38 | Low |
| 19 | Reasoning Verification | TS | pattern detector + claim verifier | 1 | 52 | Low |
| 20 | Code-Reasoning Consistency | TS | claim graph + 7 comparators | 4 | — | Medium |
| 21 | Understanding Check | TS | 13-dim scoring + probes | 6 | 55 | Low |
| 22 | Debugging Mode | TS | sandbox + skill scorer | 7 | 91 | **High** (security) |
| 23 | Debugging Coach | TS | next-best-action ranker | 1 | 115 | Low |
| 24 | Code Review Mode | TS | diff-aware finding engine | 1 | 41 | Medium |
| 25 | Adaptive Challenge Engine | TS | selector pipeline | 1 | 22 | Low |
| 26 | Skill Signal Intelligence | TS | normalize→aggregate→confidence | 2 | 53 | Medium |
| 27 | Growth Intelligence | TS | trajectory→milestones | 2 | 50 | Medium |
| 28 | Growth Tracking (variant A) | TS | state machine + snapshots | ~13 | 52 | **Conflict** |
| 29 | Growth Tracking (variant B) | TS | engine + events + narrative | 13 | 27 | **Conflict** |

---

## 2. Critical Architectural Decisions (Recorded for Traceability)

### Decision 1: Part 17 Stack Incompatibility (Python vs TS)
**Issue:** Part 17 is Python/FastAPI; unified is TS/Express.  
**Resolution:** **Port deterministic core (`expressions.py`, `python_adapter.py`) to TypeScript.** Keep FastAPI service as optional microservice deployment option. The algebra is pure math (~400 LOC) and ports cleanly.  
**Rationale:** Avoid distributed-call latency in hot path; keep repo single-language; `ExecutionProvider` abstraction already supports this.

### Decision 2: Growth Engine Triplication (Parts 27, 28, 29)
**Issue:** Three divergent growth implementations with incompatible schemas.  
**Resolution:** **Canonicalize Part 27** (most complete: 50 tests, trajectory, regression, transfer, retention, events, milestones, RLS verified). Absorb unique value from 28/29:
- Part 28's `independence.ts`, `transfer.ts` → merge into Part 27's analysis/
- Part 29's `regression.ts`, `trends.ts`, `comparability.ts` → merge into Part 27's trajectory/
**Do NOT ship three parallel growth table sets.**

### Decision 3: Evidence Model Fragmentation (5 different systems)
**Issue:** Five incompatible evidence type hierarchies.  
**Resolution:** **Establish Part 26 `RawEvidenceInput` as the canonical "Skill Signal Evidence Bus."** All upstream engines (16/17/18/19/21/22/24) emit `RawEvidenceInput` → Part 26 normalization → fans out to:
- Part 27 (growth)
- Part 5/9 mastery (existing unified)
**This is the single seam preventing 5 parallel evidence stores.**

### Decision 4: Part 22 Sandbox Security
**Issue:** Process-level isolation (`unshare --net`, `setpriv`, `ulimit`).  
**Resolution:** Acceptable for dev/single-tenant. Extend unified's `Executor` interface (already has `container`/`firecracker`/`judge0` types) to include `LocalProcessExecutor` as the Part 22 implementation. Production deployments swap the provider binding — **zero engine changes.**

---

## 3. Integration Plan (Phased)

### Phase A — Type & Schema Consolidation (Foundation)
**Target:** Extend unified's single source of truth.
1. **Extend `unified/src/domain/types.ts`** with new enums/interfaces from all 14 parts:
   - `CorrectnessStatus`, `ComplexityClass`, `UnderstandingDimension`, `DebuggingPhase`, `SkillSignalState`, `GrowthState`, `ReviewVerdict`, `ChallengeSelectionMode`, plus all domain entities
2. **Create migration `0003_analysis_features.sql`** (appends to existing schema):
   - Correctness: `correctness_assessment`, `correctness_finding`, `requirement_check`
   - Quality: `quality_assessment`, `quality_finding`
   - Understanding: `understanding_assessment`, `understanding_dimension`, `understanding_probe`, `understanding_response`, `understanding_evidence`, `understanding_history`
   - Debugging: `debugging_session`, `debugging_fingerprint`, `debugging_hypothesis`, `debugging_experiment`, `debugging_action`, `debugging_result`, `debugging_generated_mutation`
   - Review: `code_review`, `review_finding`, `review_relationship`, `reconciliation_response`
   - Skill Signal: `skill_evidence`, `skill_signal`, `skill_signal_history`
   - Growth (canonical Part 27): `growth_evidence`, `growth_skill_state`, `growth_milestone`, `growth_event`, `growth_snapshot`
3. **Extend RLS in `0002_rls_policies.sql`** for all new tables (copy verified patterns from parts 16/22/24/26/28).

### Phase B — Engine Modules (TS ports)
**Create under `unified/src/engine/`:**
```
engine/
  correctness/    ← part16: classify, requirementCoverage, regression, staticAnalysis, orchestrator
  complexity/     ← part17 PORTED: expressions, pythonAdapter, resolver, constraints, evidence, report
  quality/        ← part18: structural, duplication, naming, magicValues, errorHandling, rules, scoring
  reasoning/      ← part19: astAnalyzer, patternDetector, complexityEstimator, claimExtractor, verification
  consistency/    ← part20: claimGraph, dimensionComparators, modelBuilders, scoring, reconciliation
  understanding/  ← part21: mentalModel, evidenceEngine, scoringEngine, probeEngine, resultClassification, recommendationEngine
  debugging/      ← part22: fingerprint, investigation, session, verification, skillModel, mutation/pipeline
  debuggingCoach/ ← part23: nextBestAction, phaseModel, hypothesisEngine, coachingProgression, skillSignals, postmortem
  review/         ← part24: findingEngine, fingerprint, lifecycle, decisionEngine, reReviewEngine, responseEngine
  adaptive/       ← part25: filters, pathIntent, difficultyAdaptation, scoring, selector, adaptivePath
  skillSignal/    ← part26: normalize, aggregate, confidence, freshness, state, trend, transferRetention, profile
  growth/         ← part27: stateDetection, confidence, trajectory, regression, recovery, transfer, retention, swb, milestones, events, snapshot, insights
```

### Phase C — Service Layer & Repositories
- Add repository interfaces in `unified/src/repositories/` for each new entity.
- Add service classes wiring engines → repositories → `DatabaseClient`.

### Phase D — API Routes
Mount under `/api/v1/`:
```
/api/v1/correctness/*
/api/v1/complexity/*
/api/v1/quality/*
/api/v1/reasoning/*
/api/v1/consistency/*
/api/v1/understanding/*
/api/v1/debugging/*        (Part 22 + Part 23 coach)
/api/v1/review/*            (Part 24)
/api/v1/challenges/adaptive/* (Part 25 — extends Part 3)
/api/v1/signals/*           (Part 26 skill signals)
/api/v1/growth/*            (Part 27 canonical)
```

### Phase E — Frontend Components
Co-locate under `unified/src/components/`:
- `CorrectnessReport`, `ComplexityPanel`, `QualityReport`, `UnderstandingProfile`, `DebuggingWorkspace`, `DebuggingCoachPanel`, `ReviewThread`, `NextChallengeCard`, `SkillProfileList`, `GrowthDashboard`

### Phase F — Config & AI Integration
- Extend `unifiedConfig` in `config/index.ts` with blocks for each new feature.
- Wire Part 17's AI explain, Part 21's probes, Part 23's coach language, Part 27's insight engine into existing `AIProvider` abstraction (Groq/Gemini/Anthropic already present).

---

## 4. Testing & Verification Strategy

1. **Unit tests:** Copy each part's `tests/` into `unified/tests/engine/<feature>/`. Must pass unchanged against unified types.
2. **Integration tests:** Stand up unified Postgres, apply merged migration, run RLS isolation checks (reuse parts 16/22/24/28's adversarial SQL).
3. **Contract tests:** Verify Part 26 `RawEvidenceInput` is emitted by 16/17/18/19/21/22/24.
4. **Build:** `npm run build` (tsc) clean; `npm test` (vitest) green.
5. **Manual:** Boot `npm run dev`, hit `/api/health`, exercise one endpoint per feature.

---

## 5. Effort Estimation & Sequencing

| Wave | Parts | Depends On | Risk | Est. Days |
|------|-------|-----------|------|-----------|
| 1 | 16, 18, 19 | unified core | Low | 3 |
| 2 | 17 (TS port), 20 | 16,17,18,19 | Med | 4 |
| 3 | 21, 22, 23 | unified core + sandbox | High | 4 |
| 4 | 24, 25 | unified core | Low | 2 |
| 5 | 26 (evidence bus) | 16-25 outputs | Med | 3 |
| 6 | 27 (canonical growth) + absorb 28/29 | 26 | Med | 3 |

---

## 6. Resumption Point for Next Session

**Next action (when you say "continue"):** Execute **Phase A + Phase B Wave 1** in this order:
1. Extend `domain/types.ts` with new enums/interfaces from Parts 16, 18, 19
2. Create `0003_analysis_features.sql` + extend RLS in `0002_rls_policies.sql`
3. Port Part 16 (correctness) engine into `unified/src/engine/correctness/`
4. Port Part 18 (quality) engine into `unified/src/engine/quality/`
5. Port Part 19 (reasoning) engine into `unified/src/engine/reasoning/`
6. Run `npm run typecheck` + `npm test` to verify

This is additive-only — zero risk to existing Parts 1–15.

---

## Appendix: Key Files Referenced

| Part | Key Files Read |
|------|----------------|
| 16 | `src/index.ts`, `src/domain/types.ts`, `src/deterministic/*.ts`, `src/ai/*.ts` |
| 17 | `complexity_engine/expressions.py`, `complexity_engine/python_adapter.py`, `complexity_engine/resolver.py` |
| 18 | `src/analysis/*.ts`, `src/pipeline/analyze.ts`, `src/scoring/engine.ts` |
| 19 | `src/analysis/*.ts`, `src/claims/*.ts`, `src/verification/*.ts`, `src/pipeline.ts` |
| 20 | `src/engine/*.ts`, `src/engine/dimensionComparators/*.ts` |
| 21 | `index.ts`, `mentalModel.ts`, `evidenceEngine.ts`, `probeEngine.ts`, `scoringEngine.ts` |
| 22 | `src/types.ts`, `src/debugging/*.ts`, `src/sandbox/*.ts` |
| 23 | `src/domain/*.ts`, `src/ai/orchestrator.ts` |
| 24 | `src/findings/*.ts`, `src/review/*.ts`, `src/diff/*.ts` |
| 25 | `src/engine/*.ts`, `src/evidence/*.ts`, `src/integration/ports.ts` |
| 26 | `src/domain/models.ts`, `src/engine/*.ts`, `src/policy/policy.ts` |
| 27 | `src/types/evidence.ts`, `src/skill-state/*.ts`, `src/trajectory/*.ts`, `src/analysis/*.ts` |
| 28 | `src/lib/growth/engine/*.ts`, `src/lib/growth/evidence/*.ts` |
| 29 | `server/src/engine/*.ts`, `server/src/events/pipeline.ts` |