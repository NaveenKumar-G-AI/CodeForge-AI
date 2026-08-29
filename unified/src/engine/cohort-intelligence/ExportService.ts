/**
 * Export Service - Feature 36
 * Exports cohort reports in JSON or CSV format
 */

import { CohortExecutiveOverview, CohortSkillAggregate, CohortRoleAggregate, CohortTrainingInsight } from '../../domain/types.js';

export interface CohortRepository {
  getSkillAggregates(cohortId: string): Promise<CohortSkillAggregate[]>;
  getRoleAggregates(cohortId: string): Promise<CohortRoleAggregate[]>;
  getTrainingInsights(cohortId: string): Promise<CohortTrainingInsight[]>;
  getCohort(id: string): Promise<{ id: string; name: string; organizationId: string } | null>;
}

export class ExportService {
  constructor(private readonly repo: CohortRepository) {}

  /**
   * Export cohort report
   */
  async exportCohortReport(cohortId: string, format: 'json' | 'csv'): Promise<string> {
    const [skillAggs, roleAggs, trainingInsights] = await Promise.all([
      this.repo.getSkillAggregates(cohortId),
      this.repo.getRoleAggregates(cohortId),
      this.repo.getTrainingInsights(cohortId),
    ]);

    const cohort = await this.repo.getCohort(cohortId);

    const report = {
      cohort: cohort ? { id: cohort.id, name: cohort.name } : null,
      generatedAt: new Date().toISOString(),
      skills: skillAggs,
      roles: roleAggs,
      trainingInsights,
    };

    if (format === 'json') {
      return JSON.stringify(report, null, 2);
    }

    // CSV format
    const lines = ['field,value'];
    lines.push(`cohort_id,${cohort?.id || ''}`);
    lines.push(`cohort_name,${cohort?.name || ''}`);
    lines.push(`generated_at,${report.generatedAt}`);
    lines.push('');

    lines.push('skill_id,dominant_level,trend,coverage_pct,coverage_state');
    for (const s of skillAggs) {
      lines.push(`${s.skillId},${s.dominantLevel},${s.trend},${s.coveragePct},${s.coverageState}`);
    }

    return lines.join('\n');
  }
}