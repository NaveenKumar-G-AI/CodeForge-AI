/**
 * Cohort Intelligence Engine - Feature 36
 * Privacy-aware institutional intelligence layer for TPOs, trainers, and admins
 *
 * This module handles:
 * - Cohort management (create, list, members)
 * - Aggregation of skill/role/training insights
 * - Privacy-aware executive overviews
 * - Cohort comparison
 * - Snapshot capture
 * - Report export
 * - Event-driven aggregation
 * - AI narrative enrichment (optional)
 */

// Re-export all types
export * from '../../domain/types.js';

// Core engine classes
export { AggregationService } from './AggregationService.js';
export { DashboardService } from './DashboardService.js';
export { ComparisonService } from './ComparisonService.js';
export { CohortService } from './CohortService.js';
export { SnapshotService } from './SnapshotService.js';
export { ExportService } from './ExportService.js';
export { CoverageEngine } from './CoverageEngine.js';
export { DistributionEngine } from './DistributionEngine.js';
export { PrioritizationEngine } from './PrioritizationEngine.js';
export { PrivacyGuard } from './PrivacyGuard.js';
export { EventHandlers } from './EventHandlers.js';

// AI narrative (optional)
export { AiInsightService } from './AiInsightService.js';

// Queue
export { createQueue, InMemoryQueue, BullMQQueue } from './Queue.js';

// Repository interfaces
export { CohortRepository, CodeForgeIntelligencePorts } from './CohortRepository.js';

// Service instance
export { cohortIntelligenceService } from './CohortIntelligenceService.js';
