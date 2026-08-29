// Adaptive Challenge Engine
export {
  computeSkillState,
  scoreCandidate,
  selectNextChallenge,
  DEFAULT_WEIGHTS,
  computeEvidenceWeight,
} from './selector.js';

export type { SelectionObjectiveWeights } from '../../domain/types.js';

export {
  initializePathState,
  evaluateStageTransition,
  advanceStage,
  getStageInfo,
  getStageChallengeProfile,
  STAGE_ORDER,
} from './pathState.js';
