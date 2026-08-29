/**
 * CodeForge AI — Authentication Middleware
 *
 * Unified auth middleware supporting JWT, session, and development modes.
 */

import type { Request, Response, NextFunction } from 'express';
import { createRemoteJWKSet, jwtVerify, JWTPayload } from 'jose';
import { getEffectiveConfig } from '../../config/index.js';
import type { UUID, Student } from '../../domain/types.js';

// ============================================================================
// TYPES
// ============================================================================

export interface AuthenticatedRequest extends Request {
  student?: Student;
  studentId?: UUID;
  userRole?: string;
  authContext?: {
    studentId: UUID;
    role: string;
    institutionId?: UUID;
    permissions: string[];
  };
}

export interface JWTClaims extends JWTPayload {
  student_id?: string;
  sub?: string;
  role?: string;
  institution_id?: string;
  permissions?: string[];
}

// ============================================================================
// JWT VERIFICATION
// ============================================================================

let jwks: ReturnType<typeof createRemoteJWKSet> | null = null;

function getJWKS(): ReturnType<typeof createRemoteJWKSet> {
  if (!jwks) {
    const config = getEffectiveConfig();
    const jwksUrl = process.env.JWKS_URL || config.security.jwksUrl || '';
    if (jwksUrl) {
      jwks = createRemoteJWKSet(new URL(jwksUrl));
    }
  }
  return jwks!;
}

export async function verifyJWT(token: string): Promise<JWTClaims | null> {
  try {
    const config = getEffectiveConfig();

    // Try JWKS verification first (production)
    if (process.env.JWKS_URL || config.security.jwksUrl) {
      const jwks = getJWKS();
      const { payload } = await jwtVerify(token, jwks);
      return payload as unknown as JWTClaims;
    }

    // Fallback to HS256 with secret (development)
    const configuredSecret = process.env.JWT_SECRET || config.security.jwtSecret;
    const usingPlaceholderSecret =
      !configuredSecret ||
      configuredSecret === 'dev-secret-change-in-production' ||
      configuredSecret === 'change-me';

    if (process.env.NODE_ENV === 'production' && usingPlaceholderSecret) {
      console.error('JWT verification is not configured for production');
      return null;
    }

    const secret = new TextEncoder().encode(configuredSecret || 'dev-secret-change-in-production');
    const { payload } = await jwtVerify(token, secret, {
      algorithms: ['HS256'],
    });
    return payload as unknown as JWTClaims;
  } catch (error) {
    console.warn('JWT verification failed:', error);
    return null;
  }
}

// ============================================================================
// AUTH MIDDLEWARE
// ============================================================================

export async function authMiddleware(
  req: AuthenticatedRequest,
  res: Response,
  next: NextFunction
): Promise<void> {
  try {
    const authHeader = req.headers.authorization;

    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      // Development mode: allow x-student-id header
      const devStudentId = req.headers['x-student-id'] as string;
      if (devStudentId && process.env.NODE_ENV !== 'production') {
        req.studentId = devStudentId as UUID;
        req.userRole = 'student';
        req.authContext = {
          studentId: devStudentId as UUID,
          role: 'student',
          permissions: ['student'],
        };
        return next();
      }

      res.status(401).json({
        error: { code: 'UNAUTHORIZED', message: 'Missing or invalid authorization header' },
      });
      return;
    }

    const token = authHeader.substring(7);
    const claims = await verifyJWT(token);

    if (!claims) {
      res.status(401).json({
        error: { code: 'INVALID_TOKEN', message: 'Invalid or expired token' },
      });
      return;
    }

    // Extract student ID from claims
    const studentId = claims.student_id || claims.sub;
    if (!studentId) {
      res.status(401).json({
        error: { code: 'INVALID_TOKEN', message: 'Token missing student identifier' },
      });
      return;
    }

    req.studentId = studentId as UUID;
    req.userRole = claims.role || 'student';
    req.authContext = {
      studentId: studentId as UUID,
      role: claims.role || 'student',
      institutionId: claims.institution_id as UUID | undefined,
      permissions: claims.permissions || [],
    };

    next();
  } catch (error) {
    console.error('Auth middleware error:', error);
    res.status(500).json({
      error: { code: 'AUTH_ERROR', message: 'Authentication error' },
    });
  }
}

// ============================================================================
// ROLE-BASED ACCESS CONTROL
// ============================================================================

export function requireRole(...allowedRoles: string[]) {
  return async (req: AuthenticatedRequest, res: Response, next: NextFunction): Promise<void> => {
    const authorize = (): void => {
      if (!req.authContext) {
        res.status(401).json({
          error: { code: 'UNAUTHORIZED', message: 'Authentication required' },
        });
        return;
      }

      if (!allowedRoles.includes(req.authContext.role)) {
        res.status(403).json({
          error: { code: 'FORBIDDEN', message: `Required role: ${allowedRoles.join(' or ')}` },
        });
        return;
      }

      next();
    };

    if (!req.authContext) {
      await authMiddleware(req, res, (error?: unknown) => {
        if (error) {
          next(error);
          return;
        }
        authorize();
      });
      return;
    }

    authorize();
  };
}

export function requireStudentOrAbove() {
  return requireRole('student', 'staff', 'admin', 'tpo');
}

export function requireStaffOrAbove() {
  return requireRole('staff', 'admin');
}

export function requireAdmin() {
  return requireRole('admin');
}

// ============================================================================
// OWNERSHIP CHECK
// ============================================================================

export function requireOwnership(paramName: string = 'studentId') {
  return (req: AuthenticatedRequest, res: Response, next: NextFunction): void => {
    if (!req.authContext) {
      res.status(401).json({
        error: { code: 'UNAUTHORIZED', message: 'Authentication required' },
      });
      return;
    }

    const resourceStudentId = req.params[paramName] || req.query[paramName] || req.body[paramName];
    const isStaff = ['staff', 'admin', 'tpo'].includes(req.authContext.role);

    if (!isStaff && resourceStudentId !== req.authContext.studentId) {
      res.status(403).json({
        error: { code: 'FORBIDDEN', message: 'Access denied: not your resource' },
      });
      return;
    }

    next();
  };
}

// ============================================================================
// RATE LIMITING
// ============================================================================

interface RateLimitStore {
  [key: string]: { count: number; resetAt: number };
}

const rateLimitStore: RateLimitStore = {};
const cleanupInterval = setInterval(() => {
  const now = Date.now();
  for (const key of Object.keys(rateLimitStore)) {
    if (rateLimitStore[key].resetAt < now) {
      delete rateLimitStore[key];
    }
  }
}, 60000);

export function createRateLimiter(
  keyPrefix: string,
  maxRequests: number,
  windowMs: number
) {
  return (req: AuthenticatedRequest, res: Response, next: NextFunction): void => {
    const identifier = req.authContext?.studentId || req.ip || 'anonymous';
    const key = `${keyPrefix}:${identifier}`;
    const now = Date.now();

    const record = rateLimitStore[key];
    if (!record || record.resetAt < now) {
      rateLimitStore[key] = { count: 1, resetAt: now + windowMs };
      setRateLimitHeaders(res, maxRequests, maxRequests - 1, windowMs);
      return next();
    }

    if (record.count >= maxRequests) {
      res.set('Retry-After', Math.ceil((record.resetAt - now) / 1000).toString());
      res.status(429).json({
        error: { code: 'RATE_LIMITED', message: 'Too many requests' },
      });
      return;
    }

    record.count++;
    setRateLimitHeaders(res, maxRequests, maxRequests - record.count, windowMs);
    next();
  };
}

function setRateLimitHeaders(res: Response, limit: number, remaining: number, windowMs: number): void {
  res.set('X-RateLimit-Limit', limit.toString());
  res.set('X-RateLimit-Remaining', Math.max(0, remaining).toString());
  res.set('X-RateLimit-Reset', Math.ceil((Date.now() + windowMs) / 1000).toString());
}

// Pre-configured rate limiters
export const rateLimiters = {
  submissions: createRateLimiter('submissions', 10, 60000),      // 10/min
  hints: createRateLimiter('hints', 5, 60000),                   // 5/min
  coach: createRateLimiter('coach', 20, 60000),                  // 20/min
  api: createRateLimiter('api', 100, 60000),                     // 100/min
  diagnostic: createRateLimiter('diagnostic', 3, 60000),         // 3/min
  interview: createRateLimiter('interview', 15, 60000),          // 15/min
  incident: createRateLimiter('incident', 20, 60000),            // 20/min
  projects: createRateLimiter('projects', 5, 3600000),           // 5/hour
};

export default {
  authMiddleware,
  verifyJWT,
  requireRole,
  requireStudentOrAbove,
  requireStaffOrAbove,
  requireAdmin,
  requireOwnership,
  createRateLimiter,
  rateLimiters,
};
