/**
 * Question Validator - Feature 35
 * Validates AI-generated questions per spec §44, §13, §19, §52
 */

import {
  TechnicalInterviewQuestion as InterviewQuestion,
  EvidenceArtifactRef,
  QuestionType,
  InterviewDifficultyLevel as DifficultyLevel,
} from '../../domain/types.js';

export interface QuestionValidationResult {
  valid: boolean;
  errors: string[];
}

export interface ValidationInput {
  skill: string;
  difficulty: DifficultyLevel;
  questionType: QuestionType;
  evidence?: EvidenceArtifactRef;
  previousPromptTexts: string[];
}

export class QuestionValidator {
  /**
   * Validate generated question per spec §44, §13, §19, §52
   */
  static validate(
    input: ValidationInput,
    draft: { promptText: string; questionType: QuestionType; skill: string; difficulty: DifficultyLevel; citedEvidenceArtifactId?: string },
    previousPromptTexts: string[]
  ): QuestionValidationResult {
    const errors: string[] = [];

    // 1. Prompt length check
    if (draft.promptText.length < 8 || draft.promptText.length > 2000) {
      errors.push('Prompt text must be 8-2000 characters');
    }

    // 2. Skill matches input
    if (draft.skill !== input.skill) {
      errors.push('Question skill does not match required skill');
    }

    // 3. Difficulty matches input
    if (draft.difficulty !== input.difficulty) {
      errors.push('Question difficulty does not match required difficulty');
    }

    // 4. Grounding check per §44: if evidence provided, AI must cite it
    if (input.evidence) {
      if (!draft.citedEvidenceArtifactId) {
        errors.push('Question must cite evidence artifact when evidence is supplied');
      } else if (draft.citedEvidenceArtifactId !== input.evidence.artifactId) {
        errors.push('Cited evidence artifact does not match supplied artifact');
      }
    }

    // 5. PROJECT_BASED/CODE_BASED must cite evidence artifact
    if ((draft.questionType === 'PROJECT_BASED' || draft.questionType === 'CODE_BASED') && !draft.citedEvidenceArtifactId) {
      errors.push(`${draft.questionType} questions must cite an evidence artifact`);
    }

    // 6. Duplication check per §13: near-identical prompt already asked
    const normalizedDraft = this.normalizePrompt(draft.promptText);
    for (const prev of previousPromptTexts) {
      const normalizedPrev = this.normalizePrompt(prev);
      if (normalizedDraft === normalizedPrev) {
        errors.push('Near-identical prompt already asked in this session');
        break;
      }
    }

    // 7. Safety check per §19/§52: prompt injection guard
    if (this.containsInjectionAttempt(draft.promptText)) {
      errors.push('Prompt contains potential injection attempt');
    }

    return {
      valid: errors.length === 0,
      errors,
    };
  }

  /**
   * Normalize prompt for comparison: trim, lowercase, collapse whitespace
   */
  private static normalizePrompt(text: string): string {
    return text.trim().toLowerCase().replace(/\s+/g, ' ');
  }

  /**
   * Check for prompt injection patterns per §19/§52
   */
  private static containsInjectionAttempt(text: string): boolean {
    const lower = text.toLowerCase();
    const patterns = [
      'ignore instructions',
      'ignore previous',
      'you are now',
      'forget everything',
      'disregard',
      'override',
      'system prompt',
      'roleplay',
      'pretend to be',
      'act as',
    ];
    return patterns.some(p => lower.includes(p));
  }
}
