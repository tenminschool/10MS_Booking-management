import { Request, Response, NextFunction } from 'express';
import { z } from 'zod';
import { ValidationError } from './errorHandler';

// Generic validation middleware factory
export const validate = (schema: z.ZodSchema, source: 'body' | 'query' | 'params' = 'body') => {
  return (req: Request, res: Response, next: NextFunction) => {
    try {
      const data = source === 'body' ? req.body : 
                   source === 'query' ? req.query : 
                   req.params;

      const result = schema.safeParse(data);
      
      if (!result.success) {
        const errors = result.error.errors.map(err => ({
          field: err.path.join('.'),
          message: err.message,
          code: err.code,
        }));

        throw new ValidationError('Validation failed', errors);
      }

      // Attach validated data to request
      if (source === 'body') {
        req.body = result.data;
      } else if (source === 'query') {
        req.query = result.data as any;
      } else {
        req.params = result.data as any;
      }

      next();
    } catch (error) {
      next(error);
    }
  };
};

// Specific validation middlewares
export const validateBody = (schema: z.ZodSchema) => validate(schema, 'body');
export const validateQuery = (schema: z.ZodSchema) => validate(schema, 'query');
export const validateParams = (schema: z.ZodSchema) => validate(schema, 'params');

// Combined validation for multiple sources
export const validateMultiple = (schemas: {
  body?: z.ZodSchema;
  query?: z.ZodSchema;
  params?: z.ZodSchema;
}) => {
  return (req: Request, res: Response, next: NextFunction) => {
    try {
      const errors: any[] = [];

      // Validate body
      if (schemas.body) {
        const bodyResult = schemas.body.safeParse(req.body);
        if (!bodyResult.success) {
          errors.push(...bodyResult.error.errors.map(err => ({
            source: 'body',
            field: err.path.join('.'),
            message: err.message,
            code: err.code,
          })));
        } else {
          req.body = bodyResult.data;
        }
      }

      // Validate query
      if (schemas.query) {
        const queryResult = schemas.query.safeParse(req.query);
        if (!queryResult.success) {
          errors.push(...queryResult.error.errors.map(err => ({
            source: 'query',
            field: err.path.join('.'),
            message: err.message,
            code: err.code,
          })));
        } else {
          req.query = queryResult.data as any;
        }
      }

      // Validate params
      if (schemas.params) {
        const paramsResult = schemas.params.safeParse(req.params);
        if (!paramsResult.success) {
          errors.push(...paramsResult.error.errors.map(err => ({
            source: 'params',
            field: err.path.join('.'),
            message: err.message,
            code: err.code,
          })));
        } else {
          req.params = paramsResult.data as any;
        }
      }

      if (errors.length > 0) {
        throw new ValidationError('Validation failed', errors);
      }

      next();
    } catch (error) {
      next(error);
    }
  };
};

// File upload validation
export const validateFileUpload = (options: {
  maxSize?: number; // in bytes
  allowedTypes?: string[];
  required?: boolean;
}) => {
  return (req: Request, res: Response, next: NextFunction) => {
    try {
      const file = req.file;
      
      if (options.required && !file) {
        throw new ValidationError('File is required');
      }

      if (file) {
        // Check file size
        if (options.maxSize && file.size > options.maxSize) {
          throw new ValidationError(
            `File size exceeds limit of ${options.maxSize / (1024 * 1024)}MB`
          );
        }

        // Check file type
        if (options.allowedTypes && !options.allowedTypes.includes(file.mimetype)) {
          throw new ValidationError(
            `File type not allowed. Allowed types: ${options.allowedTypes.join(', ')}`
          );
        }
      }

      next();
    } catch (error) {
      next(error);
    }
  };
};

// Rate limiting validation
export const validateRateLimit = (
  maxRequests: number,
  windowMs: number,
  keyGenerator?: (req: Request) => string
) => {
  const requests = new Map<string, { count: number; resetTime: number }>();

  return (req: Request, res: Response, next: NextFunction) => {
    try {
      const key = keyGenerator ? keyGenerator(req) : req.ip || 'unknown';
      const now = Date.now();
      const windowStart = now - windowMs;

      // Clean up old entries
      for (const [k, v] of requests.entries()) {
        if (v.resetTime < windowStart) {
          requests.delete(k);
        }
      }

      const current = requests.get(key);
      
      if (!current) {
        requests.set(key, { count: 1, resetTime: now + windowMs });
        next();
        return;
      }

      if (current.count >= maxRequests) {
        const retryAfter = Math.ceil((current.resetTime - now) / 1000);
        res.status(429)
           .header('Retry-After', retryAfter.toString())
           .json({
             error: 'Rate Limit Exceeded',
             message: `Too many requests. Try again in ${retryAfter} seconds.`,
             code: 'RATE_LIMIT_ERROR',
             retryAfter,
           });
        return;
      }

      current.count++;
      next();
    } catch (error) {
      next(error);
    }
  };
};

// Business rule validation middleware
export const validateBusinessRules = (rules: Array<(req: Request) => void | Promise<void>>) => {
  return async (req: Request, res: Response, next: NextFunction) => {
    try {
      for (const rule of rules) {
        await rule(req);
      }
      next();
    } catch (error) {
      next(error);
    }
  };
};

// Sanitization middleware
export const sanitizeInput = (fields: string[]) => {
  return (req: Request, res: Response, next: NextFunction) => {
    try {
      for (const field of fields) {
        if (req.body[field] && typeof req.body[field] === 'string') {
          // Basic sanitization - remove HTML tags and trim
          req.body[field] = req.body[field]
            .replace(/<[^>]*>/g, '') // Remove HTML tags
            .trim(); // Remove leading/trailing whitespace
        }
      }
      next();
    } catch (error) {
      next(error);
    }
  };
};