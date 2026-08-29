/**
 * Blueprint Builder - Feature 35
 * Builds deterministic interview blueprints per spec §13
 */

import {
  TechnicalInterviewBlueprint as InterviewBlueprint,
  RoleSkillRequirement,
  RoleSkillRequirements,
  InterviewMode,
  InterviewDifficultyLevel as DifficultyLevel,
  ConfidenceBand,
  SkillImportance,
  EvaluationDimension,
  EvidenceArtifactRef,
  CandidateEvidenceBundle,
} from '../../domain/types.js';
import { randomUUID } from 'crypto';

export interface BuildBlueprintInput {
  orgId: string;
  targetRole: string;
  mode: InterviewMode;
  roleSkillRequirements: RoleSkillRequirements;
  candidateEvidence: CandidateEvidenceBundle;
  difficulty?: DifficultyLevel | 'ADAPTIVE';
  restrictToSkills?: string[]; // For GAP_VERIFICATION mode
  overrides?: Partial<InterviewBlueprint['questionStrategy'] & InterviewBlueprint['followUpStrategy'] & InterviewBlueprint['coverageRules'] & InterviewBlueprint['evaluationRules'] & InterviewBlueprint['timeConfig']>;
}

export class BlueprintBuilder {
  static readonly CURRENT_VERSION = 1;

  static build(input: BuildBlueprintInput): InterviewBlueprint {
    // Validate inputs
    if (input.targetRole !== input.roleSkillRequirements.role) {
      throw new Error(`targetRole "${input.targetRole}" does not match roleSkillRequirements.role "${input.roleSkillRequirements.role}"`);
    }
    if (input.roleSkillRequirements.skills.length === 0) {
      throw new Error('roleSkillRequirements.skills cannot be empty');
    }

    // Filter skills if restrictToSkills provided (GAP_VERIFICATION mode)
    let targetSkills = input.roleSkillRequirements.skills;
    if (input.restrictToSkills && input.restrictToSkills.length > 0) {
      targetSkills = targetSkills.filter(s => input.restrictToSkills!.includes(s.skill));
      if (targetSkills.length === 0) {
        throw new Error('No matching skills after restrictToSkills filter');
      }
    }

    // Evidence sources used
    const evidenceSourcesUsed = [...new Set(
      Object.values(input.candidateEvidence.bySkill).flat().map(e => e.sourceType)
    )];

    // Apply defaults with overrides
    const questionStrategy = {
      prioritizeUncertainty: input.overrides?.prioritizeUncertainty ?? true,
      diversityWindow: input.overrides?.diversityWindow ?? 3,
    };

    const followUpStrategy = {
      maxDepthPerTopic: input.overrides?.maxDepthPerTopic ?? 5,
      maxFollowUpsPerQuestion: input.overrides?.maxFollowUpsPerQuestion ?? 3,
    };

    const coverageRules = {
      sufficientEvidenceThreshold: input.overrides?.sufficientEvidenceThreshold ?? 'MODERATE',
      minQuestionsPerCoreSkill: input.overrides?.minQuestionsPerCoreSkill ?? 2,
    };

    const evaluationRules = {
      dimensions: input.overrides?.dimensions ?? [
        'TECHNICAL_CORRECTNESS',
        'REASONING_QUALITY',
        'UNDERSTANDING',
        'DEPTH',
        'APPLICATION',
        'CONSISTENCY',
        'COMMUNICATION_CLARITY',
      ] as EvaluationDimension[],
    };

    const timeConfig = {
      maxQuestions: input.overrides?.maxQuestions ?? 20,
      maxDurationMinutes: input.overrides?.maxDurationMinutes ?? 60,
    };

    return {
      id: randomUUID(),
      orgId: input.orgId,
      version: this.CURRENT_VERSION,
      targetRole: input.targetRole,
      mode: input.mode,
      difficulty: input.difficulty ?? 'ADAPTIVE',
      targetSkills,
      evidenceSourcesUsed,
      questionStrategy,
      followUpStrategy,
      coverageRules,
      evaluationRules,
      timeConfig,
      createdBy: 'system', // Would be set by caller
      createdAt: new Date().toISOString(),
    };
  }

  static validate(blueprint: InterviewBlueprint): string[] {
    const errors: string[] = [];

    if (blueprint.targetSkills.length === 0) {
      errors.push('targetSkills cannot be empty');
    }
    if (blueprint.timeConfig.maxQuestions < 1) {
      errors.push('maxQuestions must be at least 1');
    }
    if (blueprint.followUpStrategy.maxDepthPerTopic < 1) {
      errors.push('maxDepthPerTopic must be at least 1');
    }
    if (blueprint.evaluationRules.dimensions.length === 0) {
      errors.push('evaluationRules.dimensions cannot be empty');
    }

    return errors;
  }
}
