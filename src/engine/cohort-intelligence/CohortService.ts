/**
 * Cohort Service - Feature 36
 * CRUD operations for cohorts and membership
 */

import {
  Cohort,
  CohortKind,
  CohortDimension,
  Membership,
} from '../../domain/types.js';
import { PrivacyGuard } from './PrivacyGuard.js';

export interface CohortRepository {
  createCohort(input: {
    organizationId: string;
    name: string;
    kind: CohortKind;
    dimension: CohortDimension;
    parentCohortId?: string;
    attributes?: Record<string, string>;
  }): Promise<Cohort>;
  getCohort(id: string): Promise<Cohort | null>;
  listCohorts(orgId: string): Promise<Cohort[]>;
  updateCohort(id: string, updates: Partial<Cohort>): Promise<Cohort>;
  deleteCohort(id: string): Promise<void>;

  addMember(cohortId: string, studentId: string): Promise<Membership>;
  removeMember(cohortId: string, studentId: string): Promise<void>;
  listMembers(cohortId: string): Promise<Membership[]>;
  getMember(cohortId: string, studentId: string): Promise<Membership | null>;
}

export class CohortService {
  constructor(private readonly repo: CohortRepository) {}

  async createCohort(input: {
    organizationId: string;
    name: string;
    kind: CohortKind;
    dimension: CohortDimension;
    parentCohortId?: string;
    attributes?: Record<string, string>;
  }): Promise<Cohort> {
    return this.repo.createCohort(input);
  }

  async getCohort(id: string, orgId: string): Promise<Cohort | null> {
    const cohort = await this.repo.getCohort(id);
    if (cohort) {
      PrivacyGuard.assertBelongsToOrganization(cohort, orgId, 'Cohort');
    }
    return cohort;
  }

  async listCohorts(orgId: string): Promise<Cohort[]> {
    return this.repo.listCohorts(orgId);
  }

  async addMember(cohortId: string, studentId: string, orgId: string): Promise<Membership> {
    const cohort = await this.repo.getCohort(cohortId);
    if (!cohort) throw new Error('Cohort not found');
    PrivacyGuard.assertBelongsToOrganization(cohort, orgId, 'Cohort');

    return this.repo.addMember(cohortId, studentId);
  }

  async removeMember(cohortId: string, studentId: string, orgId: string): Promise<void> {
    const cohort = await this.repo.getCohort(cohortId);
    if (!cohort) throw new Error('Cohort not found');
    PrivacyGuard.assertBelongsToOrganization(cohort, orgId, 'Cohort');

    return this.repo.removeMember(cohortId, studentId);
  }

  async listMembers(cohortId: string, orgId: string): Promise<Membership[]> {
    const cohort = await this.repo.getCohort(cohortId);
    if (!cohort) throw new Error('Cohort not found');
    PrivacyGuard.assertBelongsToOrganization(cohort, orgId, 'Cohort');

    return this.repo.listMembers(cohortId);
  }
}
