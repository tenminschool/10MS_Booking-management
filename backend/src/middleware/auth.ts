import { Request, Response, NextFunction } from 'express';
import { verifyToken, getTokenFromHeader } from '../utils/jwt';
import { ROLE_PERMISSIONS, Permission, JWTPayload } from '../types/auth';
import { UserRole } from '@prisma/client';

// Extend Express Request type
declare global {
  namespace Express {
    interface Request {
      user?: JWTPayload;
    }
  }
}

export const authenticate = (req: Request, res: Response, next: NextFunction) => {
  try {
    const token = getTokenFromHeader(req.headers.authorization);
    
    if (!token) {
      return res.status(401).json({
        error: 'Authentication required',
        message: 'No token provided'
      });
    }

    const payload = verifyToken(token);
    req.user = payload;
    next();
  } catch (error) {
    return res.status(401).json({
      error: 'Authentication failed',
      message: error instanceof Error ? error.message : 'Invalid token'
    });
  }
};

export const authorize = (requiredPermissions: Permission[]) => {
  return (req: Request, res: Response, next: NextFunction) => {
    if (!req.user) {
      return res.status(401).json({
        error: 'Authentication required',
        message: 'User not authenticated'
      });
    }

    const userPermissions = ROLE_PERMISSIONS[req.user.role];
    const hasPermission = requiredPermissions.every(permission => 
      userPermissions.includes(permission)
    );

    if (!hasPermission) {
      return res.status(403).json({
        error: 'Insufficient permissions',
        message: `Required permissions: ${requiredPermissions.join(', ')}`
      });
    }

    next();
  };
};

export const requireRole = (allowedRoles: UserRole[]) => {
  return (req: Request, res: Response, next: NextFunction) => {
    if (!req.user) {
      return res.status(401).json({
        error: 'Authentication required',
        message: 'User not authenticated'
      });
    }

    if (!allowedRoles.includes(req.user.role)) {
      return res.status(403).json({
        error: 'Insufficient permissions',
        message: `Required roles: ${allowedRoles.join(', ')}`
      });
    }

    next();
  };
};

export const requireBranchAccess = (req: Request, res: Response, next: NextFunction) => {
  if (!req.user) {
    return res.status(401).json({
      error: 'Authentication required',
      message: 'User not authenticated'
    });
  }

  // Super admins can access all branches
  if (req.user.role === UserRole.SUPER_ADMIN) {
    return next();
  }

  // Branch admins and teachers must have branchId
  if (!req.user.branchId) {
    return res.status(403).json({
      error: 'Branch access required',
      message: 'User must be assigned to a branch'
    });
  }

  // Check if the requested resource belongs to user's branch
  const requestedBranchId = req.params.branchId || req.body.branchId || req.query.branchId;
  
  if (requestedBranchId && requestedBranchId !== req.user.branchId) {
    return res.status(403).json({
      error: 'Branch access denied',
      message: 'Cannot access resources from other branches'
    });
  }

  next();
};

export const requireOwnResourceOrBranchAccess = (resourceUserIdParam: string = 'userId') => {
  return (req: Request, res: Response, next: NextFunction) => {
    if (!req.user) {
      return res.status(401).json({
        error: 'Authentication required',
        message: 'User not authenticated'
      });
    }

    const resourceUserId = req.params[resourceUserIdParam] || req.body[resourceUserIdParam];

    // Users can always access their own resources
    if (resourceUserId === req.user.userId) {
      return next();
    }

    // Super admins can access all resources
    if (req.user.role === UserRole.SUPER_ADMIN) {
      return next();
    }

    // Branch admins can access resources within their branch
    if (req.user.role === UserRole.BRANCH_ADMIN && req.user.branchId) {
      // This would need additional database check to verify the resource belongs to the same branch
      // For now, we'll allow it and let the route handler do the detailed check
      return next();
    }

    // Teachers can access resources of students they teach (would need additional logic)
    if (req.user.role === UserRole.TEACHER) {
      // This would need additional database check to verify the teacher-student relationship
      // For now, we'll allow it and let the route handler do the detailed check
      return next();
    }

    return res.status(403).json({
      error: 'Access denied',
      message: 'Insufficient permissions to access this resource'
    });
  };
};

export const optionalAuth = (req: Request, res: Response, next: NextFunction) => {
  const token = getTokenFromHeader(req.headers.authorization);
  
  if (token) {
    try {
      const payload = verifyToken(token);
      req.user = payload;
    } catch (error) {
      // Token is invalid, but we continue without authentication
      // This allows endpoints to work for both authenticated and unauthenticated users
    }
  }
  
  next();
};