/**
 * AI Insight Service - Feature 36
 * Optional AI narrative enrichment for executive overviews
 */

import { CohortExecutiveOverview } from '../../domain/types.js';

export interface AiProvider {
  generate(prompt: string): Promise<string>;
}

export class AiInsightService {
  constructor(
    private readonly aiProvider: AiProvider | null
  ) {}

  /**
   * Generate executive narrative from structured data
   * Returns null if AI not available or fails
   */
  async generateExecutiveNarrative(overview: CohortExecutiveOverview): Promise<string | null> {
    if (!this.aiProvider) return null;

    try {
      const prompt = this.buildPrompt(overview);
      const narrative = await this.aiProvider.generate(prompt);
      return narrative;
    } catch (error) {
      console.error('AI narrative generation failed:', error);
      return null;
    }
  }

  /**
   * Build prompt for AI narrative
   */
  private buildPrompt(overview: CohortExecutiveOverview): string {
    return `
Generate a concise executive summary for a cohort intelligence report:

Strongest Areas: ${overview.strongestAreas.join(', ') || 'None'}
Priority Gaps: ${overview.priorityGaps.map(g => `${g.skillId} (${g.priority})`).join(', ') || 'None'}
Highest Impact Role Gap: ${overview.highestImpactRoleGap ? `${overview.highestImpactRoleGap.roleId} (${overview.highestImpactRoleGap.gapCount} gaps)` : 'None'}
Training Priorities: ${overview.trainingPriorities.map(t => `${t.skillId}: ${t.label}`).join(', ') || 'None'}
Evidence Coverage: ${Math.round(overview.evidenceCoverageSummary.coveragePct * 100)}% (${overview.evidenceCoverageSummary.coverageState})
Observed Growth: ${overview.observedGrowth.map(g => `${g.skillId} (${g.trend})`).join(', ') || 'None'}

Provide a 2-3 paragraph executive summary suitable for a TPO or administrator.
Focus on actionable insights, not just data recitation.
`.trim();
  }
}