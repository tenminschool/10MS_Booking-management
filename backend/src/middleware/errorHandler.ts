import { Request, Response, NextFunction } from 'express';
import { z } from 'zod';

export interface AppError extends Error {
  statusCode: number;
  isOperational: boolean;
  code?: string;
}

export class ValidationError extends Error implements AppError {
  statusCode = 400;
  isOperational = true;
  code = 'VALIDATION_ERROR';

  constructor(message: string, public details?: any) {
    super(message);
    this.name = 'ValidationError';
  }
}

export class BusinessRuleError extends Error implements AppError {
  statusCode = 409;
  isOperational = true;
  code = 'BUSINESS_RULE_ERROR';

  constructor(message: string, public ruleType?: string) {
    super(message);
    this.name = 'BusinessRuleError';
  }
}

export class NotFoundError extends Error implements AppError {
  statusCode = 404;
  isOperational = true;
  code = 'NOT_FOUND';

  constructor(message: string = 'Resource not found') {
    super(message);
    this.name = 'NotFoundError';
  }
}

export class AuthenticationError extends Error implements AppError {
  statusCode = 401;
  isOperational = true;
  code = 'AUTHENTICATION_ERROR';

  constructor(message: string = 'Authentication failed') {
    super(message);
    this.name = 'AuthenticationError';
  }
}

export class AuthorizationError extends Error implements AppError {
  statusCode = 403;
  isOperational = true;
  code = 'AUTHORIZATION_ERROR';

  constructor(message: string = 'Access denied') {
    super(message);
    this.name = 'AuthorizationError';
  }
}

export class ConflictError extends Error implements AppError {
  statusCode = 409;
  isOperational = true;
  code = 'CONFLICT_ERROR';

  constructor(message: string, public conflictType?: string) {
    super(message);
    this.name = 'ConflictError';
  }
}

export class RateLimitError extends Error implements AppError {
  statusCode = 429;
  isOperational = true;
  code = 'RATE_LIMIT_ERROR';

  constructor(message: string = 'Too many requests', public retryAfter?: number) {
    super(message);
    this.name = 'RateLimitError';
  }
}

// Error logging service
class ErrorLogger {
  private static instance: ErrorLogger;

  static getInstance(): ErrorLogger {
    if (!ErrorLogger.instance) {
      ErrorLogger.instance = new ErrorLogger();
    }
    return ErrorLogger.instance;
  }

  log(error: Error, req?: Request, context?: any): void {
    const timestamp = new Date().toISOString();
    const errorInfo = {
      timestamp,
      name: error.name,
      message: error.message,
      stack: error.stack,
      url: req?.url,
      method: req?.method,
      userAgent: req?.get('User-Agent'),
      ip: req?.ip,
      userId: (req as any)?.user?.userId,
      context,
    };

    // Log to console in development
    if (process.env.NODE_ENV === 'development') {
      console.error('Error logged:', errorInfo);
    }

    // In production, you would send this to a logging service
    // like Winston, Sentry, or CloudWatch
    if (process.env.NODE_ENV === 'production') {
      // TODO: Implement production logging
      console.error('Production error:', errorInfo);
    }
  }

  logBusinessRule(ruleType: string, message: string, context?: any): void {
    const timestamp = new Date().toISOString();
    const logInfo = {
      timestamp,
      type: 'BUSINESS_RULE_VIOLATION',
      ruleType,
      message,
      context,
    };

    console.warn('Business rule violation:', logInfo);
  }
}

// Global error handler middleware
export const globalErrorHandler = (
  error: Error,
  req: Request,
  res: Response,
  next: NextFunction
): void => {
  const logger = ErrorLogger.getInstance();

  // Log the error
  logger.log(error, req);

  // Handle Zod validation errors
  if (error instanceof z.ZodError) {
    const validationErrors = error.errors.map(err => ({
      field: err.path.join('.'),
      message: err.message,
      code: err.code,
    }));

    res.status(400).json({
      error: 'Validation Error',
      message: 'Invalid input data',
      details: validationErrors,
      code: 'VALIDATION_ERROR',
    });
    return;
  }

  // Handle Prisma errors
  if (error instanceof Prisma.PrismaClientKnownRequestError) {
    switch (error.code) {
      case 'P2002':
        res.status(409).json({
          error: 'Conflict Error',
          message: 'A record with this data already exists',
          code: 'DUPLICATE_RECORD',
          field: error.meta?.target,
        });
        return;

      case 'P2025':
        res.status(404).json({
          error: 'Not Found',
          message: 'The requested record was not found',
          code: 'RECORD_NOT_FOUND',
        });
        return;

      case 'P2003':
        res.status(400).json({
          error: 'Foreign Key Error',
          message: 'Referenced record does not exist',
          code: 'FOREIGN_KEY_CONSTRAINT',
        });
        return;

      case 'P2014':
        res.status(400).json({
          error: 'Relation Error',
          message: 'The change would violate a relation constraint',
          code: 'RELATION_CONSTRAINT',
        });
        return;

      default:
        res.status(500).json({
          error: 'Database Error',
          message: 'A database error occurred',
          code: 'DATABASE_ERROR',
        });
        return;
    }
  }

  // Handle custom application errors
  if (error instanceof ValidationError) {
    res.status(error.statusCode).json({
      error: error.name,
      message: error.message,
      code: error.code,
      details: error.details,
    });
    return;
  }

  if (error instanceof BusinessRuleError) {
    logger.logBusinessRule(error.ruleType || 'UNKNOWN', error.message);
    res.status(error.statusCode).json({
      error: error.name,
      message: error.message,
      code: error.code,
      ruleType: error.ruleType,
    });
    return;
  }

  if (error instanceof NotFoundError || 
      error instanceof AuthenticationError || 
      error instanceof AuthorizationError || 
      error instanceof ConflictError) {
    res.status((error as AppError).statusCode).json({
      error: error.name,
      message: error.message,
      code: (error as AppError).code,
    });
    return;
  }

  if (error instanceof RateLimitError) {
    res.status(error.statusCode)
       .header('Retry-After', error.retryAfter?.toString() || '60')
       .json({
         error: error.name,
         message: error.message,
         code: error.code,
         retryAfter: error.retryAfter,
       });
    return;
  }

  // Handle unexpected errors
  res.status(500).json({
    error: 'Internal Server Error',
    message: process.env.NODE_ENV === 'development' 
      ? error.message 
      : 'Something went wrong',
    code: 'INTERNAL_ERROR',
    ...(process.env.NODE_ENV === 'development' && { 
      stack: error.stack 
    }),
  });
};

// Async error wrapper
export const asyncHandler = (fn: Function) => {
  return (req: Request, res: Response, next: NextFunction) => {
    Promise.resolve(fn(req, res, next)).catch(next);
  };
};

// Business rule validation helpers
export const businessRules = {
  // Check if booking is within 24 hours
  validateCancellationTime: (slotDate: Date, slotStartTime: string): void => {
    const slotDateTime = new Date(`${slotDate.toISOString().split('T')[0]}T${slotStartTime}:00`);
    const now = new Date();
    const hoursUntilSlot = (slotDateTime.getTime() - now.getTime()) / (1000 * 60 * 60);
    
    if (hoursUntilSlot < 24) {
      throw new BusinessRuleError(
        'Bookings cannot be cancelled within 24 hours of the scheduled time',
        'CANCELLATION_TIME_LIMIT'
      );
    }
  },

  // Check slot capacity
  validateSlotCapacity: (bookedCount: number, capacity: number): void => {
    if (bookedCount >= capacity) {
      throw new BusinessRuleError(
        `Slot is fully booked (${bookedCount}/${capacity})`,
        'SLOT_CAPACITY_EXCEEDED'
      );
    }
  },

  // Check for duplicate bookings
  validateNoDuplicateBooking: (exists: boolean, context?: string): void => {
    if (exists) {
      throw new BusinessRuleError(
        `Duplicate booking detected${context ? `: ${context}` : ''}`,
        'DUPLICATE_BOOKING'
      );
    }
  },

  // Check monthly booking limit with bypass support
  validateMonthlyLimit: async (hasMonthlyBooking: boolean, studentId?: string): Promise<void> => {
    if (!hasMonthlyBooking) return;

    // Check for monthly bypass if studentId provided
    if (studentId) {
      try {
        const { supabase } = await import('../lib/supabase');
        
        const { data: bypassSetting } = await supabase
          .from('system_settings')
          .select('*')
          .eq('key', `monthly_bypass_${studentId}`)
          .single();

        if (bypassSetting) {
          const bypassData = JSON.parse(bypassSetting.value);
          if (new Date() < new Date(bypassData.expiresAt)) {
            console.log(`📋 Monthly limit bypass active for student ${studentId}`);
            return; // Bypass is active
          } else {
            // Clean up expired bypass
            await supabase
              .from('system_settings')
              .delete()
              .eq('key', `monthly_bypass_${studentId}`);
          }
        }
      } catch (error) {
        console.error('Error checking monthly bypass:', error);
      }
    }

    throw new BusinessRuleError(
      'Student already has a booking this month across all branches',
      'MONTHLY_BOOKING_LIMIT'
    );
  },

  // Check cross-branch booking rules
  validateCrossBranchBooking: async (studentBranchId: string, slotBranchId: string): Promise<void> => {
    if (studentBranchId === slotBranchId) return; // Same branch, no issue

    try {
      const { supabase } = await import('../lib/supabase');
      
      const { data: systemSettings } = await supabase
        .from('system_settings')
        .select('*')
        .eq('key', 'system_config')
        .single();

      let allowCrossBranch = true;
      if (systemSettings?.value) {
        try {
          const settings = JSON.parse(systemSettings.value);
          allowCrossBranch = settings.bookingRules?.allowCrossBranchBooking ?? true;
        } catch (error) {
          console.error('Error parsing system settings:', error);
        }
      }

      if (!allowCrossBranch) {
        throw new BusinessRuleError(
          'Cross-branch booking is currently disabled',
          'CROSS_BRANCH_DISABLED'
        );
      }
    } catch (error) {
      if (error instanceof BusinessRuleError) throw error;
      console.error('Error checking cross-branch rules:', error);
    }
  },

  // Check if slot is blocked
  validateSlotNotBlocked: async (slotId: string): Promise<void> => {
    try {
      const { supabase } = await import('../lib/supabase');
      
      const { data: blockedSlot } = await supabase
        .from('system_settings')
        .select('*')
        .eq('key', `blocked_slot_${slotId}`)
        .single();

      if (blockedSlot) {
        const blockData = JSON.parse(blockedSlot.value);
        throw new BusinessRuleError(
          `Slot is blocked: ${blockData.reason}`,
          'SLOT_BLOCKED'
        );
      }
    } catch (error) {
      if (error instanceof BusinessRuleError) throw error;
      console.error('Error checking slot block status:', error);
    }
  },

  // Validate slot is not in the past
  validateSlotNotInPast: (slotDate: Date, slotStartTime: string): void => {
    const slotDateTime = new Date(`${slotDate.toISOString().split('T')[0]}T${slotStartTime}:00`);
    if (slotDateTime < new Date()) {
      throw new BusinessRuleError(
        'Cannot book slots in the past',
        'PAST_SLOT_BOOKING'
      );
    }
  },

  // Validate booking status for operations
  validateBookingStatus: (status: string, allowedStatuses: string[], operation: string): void => {
    if (!allowedStatuses.includes(status)) {
      throw new BusinessRuleError(
        `Cannot ${operation} booking with status: ${status}`,
        'INVALID_BOOKING_STATUS'
      );
    }
  },
};

export { ErrorLogger };