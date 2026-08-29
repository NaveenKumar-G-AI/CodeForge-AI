// Code Review Engine
import {
  ReviewFinding,
  ReviewFindingSeverity,
  ReviewFindingCategory,
  ReviewFindingStatus,
  ReviewRelationship,
  ReviewRelationshipType,
  CodeReviewReport,
  ReviewVerdict,
  ReconciliationResponse,
  QualityFinding,
  QualityDimension,
  Severity,
  QualityConfidence,
  QualitySourceLocation,
} from '../../domain/types.js';

/**
 * Convert quality findings to review findings
 */
export function convertQualityFindingsToReview(
  qualityFindings: QualityFinding[],
  submissionId: string
): ReviewFinding[] {
  return qualityFindings.map((f, idx) => ({
    id: f.findingId,
    reviewId: submissionId,
    ruleId: f.ruleId,
    severity: mapSeverity(f.severity),
    category: mapCategory(f.category),
    title: f.title,
    description: f.description,
    filePath: f.sourceLocation ? 'main' : null,
    lineStart: f.sourceLocation?.startLine ?? null,
    lineEnd: f.sourceLocation?.endLine ?? null,
    status: 'OPEN',
    confidence: f.confidence,
    suggestedFix: f.suggestedAction,
    evidenceIds: f.evidence,
    createdAt: new Date().toISOString(),
  }));
}

function mapSeverity(s: Severity): ReviewFindingSeverity {
  switch (s) {
    case 'CRITICAL':
    case 'HIGH':
      return 'MAJOR';
    case 'MEDIUM':
      return 'MINOR';
    case 'LOW':
    case 'INFO':
      return 'INFO';
    default:
      return 'INFO';
  }
}

function mapCategory(cat: string): ReviewFindingCategory {
  const lower = cat.toLowerCase();
  if (lower.includes('security') || lower.includes('injection') || lower.includes('xss') || lower.includes('csrf'))
    return 'SECURITY';
  if (lower.includes('perform') || lower.includes('complexity') || lower.includes('n+1') || lower.includes('memory'))
    return 'PERFORMANCE';
  if (lower.includes('maintain') || lower.includes('readab') || lower.includes('struct') || lower.includes('nesting'))
    return 'MAINTAINABILITY';
  if (lower.includes('style') || lower.includes('naming') || lower.includes('format') || lower.includes('indent'))
    return 'STYLE';
  if (lower.includes('test') || lower.includes('coverage') || lower.includes('assert'))
    return 'TESTING';
  if (lower.includes('document') || lower.includes('comment') || lower.includes('docstring'))
    return 'DOCUMENTATION';
  return 'CORRECTNESS';
}

/**
 * Detect relationships between findings
 */
export function detectRelationships(findings: ReviewFinding[]): ReviewRelationship[] {
  const relationships: ReviewRelationship[] = [];

  for (let i = 0; i < findings.length; i++) {
    for (let j = i + 1; j < findings.length; j++) {
      const f1 = findings[i];
      const f2 = findings[j];

      // Same file and nearby lines -> RELATED
      if (f1.filePath && f1.filePath === f2.filePath && f1.lineStart && f2.lineStart) {
        const dist = Math.abs(f1.lineStart - f2.lineStart);
        if (dist <= 5) {
          relationships.push({
            id: `rel-${f1.id}-${f2.id}`,
            reviewId: f1.reviewId,
            fromFindingId: f1.id,
            toFindingId: f2.id,
            type: 'RELATED',
          });
        }
      }

      // Same rule -> DUPLICATE
      if (f1.ruleId === f2.ruleId) {
        relationships.push({
          id: `dup-${f1.id}-${f2.id}`,
          reviewId: f1.reviewId,
          fromFindingId: f1.id,
          toFindingId: f2.id,
          type: 'DUPLICATE',
        });
      }

      // Security finding that blocks others
      if (f1.category === 'SECURITY' && f1.severity === 'CRITICAL' && f2.category !== 'SECURITY') {
        relationships.push({
          id: `blocks-${f1.id}-${f2.id}`,
          reviewId: f1.reviewId,
          fromFindingId: f1.id,
          toFindingId: f2.id,
          type: 'BLOCKS',
        });
      }
    }
  }

  return relationships;
}

/**
 * Determine overall verdict from findings
 */
export function determineVerdict(findings: ReviewFinding[]): ReviewVerdict {
  const criticalCount = findings.filter((f) => f.severity === 'CRITICAL' && f.status !== 'WONTFIX').length;
  const majorCount = findings.filter((f) => f.severity === 'MAJOR' && f.status !== 'WONTFIX').length;
  const minorCount = findings.filter((f) => f.severity === 'MINOR' && f.status !== 'WONTFIX').length;

  if (criticalCount > 0) return 'REJECT';
  if (majorCount > 2) return 'REQUEST_CHANGES';
  if (majorCount > 0) return 'REQUEST_CHANGES';
  if (minorCount > 5) return 'REQUEST_CHANGES';
  if (minorCount > 0) return 'COMMENT';
  return 'APPROVE';
}

/**
 * Generate review summary
 */
export function generateReviewSummary(
  findings: ReviewFinding[],
  verdict: ReviewVerdict
): string {
  const counts = {
    CRITICAL: findings.filter((f) => f.severity === 'CRITICAL').length,
    MAJOR: findings.filter((f) => f.severity === 'MAJOR').length,
    MINOR: findings.filter((f) => f.severity === 'MINOR').length,
    INFO: findings.filter((f) => f.severity === 'INFO').length,
  };

  const parts = [];
  if (counts.CRITICAL) parts.push(`${counts.CRITICAL} critical`);
  if (counts.MAJOR) parts.push(`${counts.MAJOR} major`);
  if (counts.MINOR) parts.push(`${counts.MINOR} minor`);
  if (counts.INFO) parts.push(`${counts.INFO} info`);

  const findingSummary = parts.length > 0 ? parts.join(', ') : 'no findings';

  const verdictText = {
    APPROVE: 'Code looks good — approved.',
    COMMENT: 'Minor suggestions — overall acceptable.',
    REQUEST_CHANGES: 'Changes requested before approval.',
    REJECT: 'Significant issues — rejected.',
  }[verdict];

  return `${findingSummary}. ${verdictText}`;
}

/**
 * Create full review report
 */
export function createReviewReport(
  submissionId: string,
  language: 'python' | 'javascript' | 'typescript',
  qualityFindings: QualityFinding[]
): CodeReviewReport {
  const findings = convertQualityFindingsToReview(qualityFindings, submissionId);
  const relationships = detectRelationships(findings);
  const verdict = determineVerdict(findings);
  const summary = generateReviewSummary(findings, verdict);

  return {
    id: `review-${Date.now()}`,
    submissionId,
    language,
    verdict,
    summary,
    findings,
    relationships,
    generatedAt: new Date().toISOString(),
  };
}

/**
 * Process reconciliation response
 */
export function processReconciliation(
  review: CodeReviewReport,
  response: ReconciliationResponse
): { review: CodeReviewReport; accepted: boolean } {
  const finding = review.findings.find((f) => f.id === response.findingId);
  if (!finding) {
    return { review, accepted: false };
  }

  finding.status = response.accepted ? 'RESOLVED' : 'DISPUTED';
  // In a real system, we'd also store the resolution text

  // Recompute verdict if needed
  const newVerdict = determineVerdict(review.findings);
  const newSummary = generateReviewSummary(review.findings, newVerdict);

  return {
    review: { ...review, verdict: newVerdict, summary: newSummary },
    accepted: true,
  };
}