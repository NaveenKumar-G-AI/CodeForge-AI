/**
 * Profile Builder - Builds technical profiles for PrepVista sync
 */

import {
  TechnicalProfile,
  SharingScope,
  UUID,
  ISO8601,
} from '../../domain/types.js';

export interface StudentDataProvider {
  getStudentSkills(studentId: string): Promise<Array<{
    skillId: string;
    skillName: string;
    proficiencyLevel: number;
    evidenceCount: number;
    lastAssessedAt: Date;
  }>>;

  getStudentAssessments(studentId: string): Promise<Array<{
    assessmentId: string;
    type: string;
    score: number;
    completedAt: Date;
  }>>;

  getStudentProjects(studentId: string): Promise<Array<{
    projectId: string;
    name: string;
    technologies: string[];
    role: string;
    completedAt: Date;
  }>>;

  getStudentReadiness(studentId: string): Promise<Array<{
    roleId: string;
    roleName: string;
    readinessScore: number;
    gaps: string[];
  }>>;
}

export class ProfileBuilder {
  constructor(
    private readonly studentData: StudentDataProvider
  ) {}

  async buildTechnicalProfile(studentId: string, integrationId: string): Promise<TechnicalProfile> {
    // Get identity mapping to get external student ID
    const externalStudentId = await this.getExternalStudentId(studentId, integrationId);

    // Fetch all data in parallel
    const [skills, assessments, projects, readiness] = await Promise.all([
      this.studentData.getStudentSkills(studentId),
      this.studentData.getStudentAssessments(studentId),
      this.studentData.getStudentProjects(studentId),
      this.studentData.getStudentReadiness(studentId),
    ]);

    return {
      studentId,
      externalStudentId,
      profile: {
        skills: skills.map(s => ({
          skillId: s.skillId,
          skillName: s.skillName,
          proficiencyLevel: s.proficiencyLevel,
          evidenceCount: s.evidenceCount,
          lastAssessedAt: s.lastAssessedAt,
        })),
        assessments: assessments.map(a => ({
          assessmentId: a.assessmentId,
          type: a.type,
          score: a.score,
          completedAt: a.completedAt,
        })),
        projects: projects.map(p => ({
          projectId: p.projectId,
          name: p.name,
          technologies: p.technologies,
          role: p.role,
          completedAt: p.completedAt,
        })),
        readiness: readiness.map(r => ({
          roleId: r.roleId,
          roleName: r.roleName,
          readinessScore: r.readinessScore,
          gaps: r.gaps,
        })),
        generatedAt: new Date(),
        schemaVersion: '1.0.0',
      },
      sharingPolicy: {
        scope: 'STANDARD',
        studentOptIn: false,
        autoApprove: true,
      },
    };
  }

  filterProfileByScope(profile: TechnicalProfile, scope: SharingScope): TechnicalProfile {
    const filtered = { ...profile };

    switch (scope) {
      case 'MINIMAL':
        // Only share readiness summary and top skills
        filtered.profile.skills = filtered.profile.skills
          .sort((a, b) => b.proficiencyLevel - a.proficiencyLevel)
          .slice(0, 5);
        filtered.profile.assessments = [];
        filtered.profile.projects = [];
        filtered.profile.readiness = filtered.profile.readiness.map(r => ({
          ...r,
          gaps: [],
        }));
        break;

      case 'STANDARD':
        // Share skills, readiness, and recent assessments
        filtered.profile.skills = filtered.profile.skills
          .sort((a, b) => b.proficiencyLevel - a.proficiencyLevel);
        filtered.profile.assessments = filtered.profile.assessments
          .sort((a, b) => b.completedAt.getTime() - a.completedAt.getTime())
          .slice(0, 10);
        filtered.profile.projects = filtered.profile.projects
          .sort((a, b) => b.completedAt.getTime() - a.completedAt.getTime())
          .slice(0, 5);
        break;

      case 'DETAILED':
        // Share everything except detailed project files
        filtered.profile.skills = filtered.profile.skills
          .sort((a, b) => b.proficiencyLevel - a.proficiencyLevel);
        filtered.profile.assessments = filtered.profile.assessments
          .sort((a, b) => b.completedAt.getTime() - a.completedAt.getTime());
        filtered.profile.projects = filtered.profile.projects
          .sort((a, b) => b.completedAt.getTime() - a.completedAt.getTime());
        break;

      case 'FULL':
        // Share everything
        filtered.profile.skills = filtered.profile.skills
          .sort((a, b) => b.proficiencyLevel - a.proficiencyLevel);
        filtered.profile.assessments = filtered.profile.assessments
          .sort((a, b) => b.completedAt.getTime() - a.completedAt.getTime());
        filtered.profile.projects = filtered.profile.projects
          .sort((a, b) => b.completedAt.getTime() - a.completedAt.getTime());
        break;
    }

    return filtered;
  }

  private async getExternalStudentId(studentId: string, integrationId: string): Promise<string | null> {
    // This would query the identity mapping table
    // For now, return a placeholder
    return `ext-${studentId}`;
  }
}
