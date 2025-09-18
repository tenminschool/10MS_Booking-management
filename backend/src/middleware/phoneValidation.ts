import { Request, Response, NextFunction } from 'express';

// Bangladesh phone number patterns
const BD_PHONE_PATTERNS = [
  /^\+8801[3-9]\d{8}$/, // +8801XXXXXXXXX format
  /^8801[3-9]\d{8}$/,   // 8801XXXXXXXXX format
  /^01[3-9]\d{8}$/,     // 01XXXXXXXXX format
];

// Mobile operators in Bangladesh
const BD_OPERATORS = {
  '013': 'Airtel',
  '014': 'Banglalink', 
  '015': 'Teletalk',
  '016': 'Airtel',
  '017': 'Grameenphone',
  '018': 'Robi',
  '019': 'Banglalink',
};

export interface PhoneValidationResult {
  isValid: boolean;
  formatted: string;
  operator?: string;
  error?: string;
}

export const validateBangladeshPhone = (phoneNumber: string): PhoneValidationResult => {
  if (!phoneNumber) {
    return {
      isValid: false,
      formatted: '',
      error: 'Phone number is required'
    };
  }

  // Remove spaces and dashes
  const cleaned = phoneNumber.replace(/[\s-]/g, '');
  
  // Check against patterns
  let isValid = false;
  let formatted = '';
  
  for (const pattern of BD_PHONE_PATTERNS) {
    if (pattern.test(cleaned)) {
      isValid = true;
      // Always format to international format
      if (cleaned.startsWith('+880')) {
        formatted = cleaned;
      } else if (cleaned.startsWith('880')) {
        formatted = '+' + cleaned;
      } else if (cleaned.startsWith('01')) {
        formatted = '+880' + cleaned.substring(1);
      }
      break;
    }
  }

  if (!isValid) {
    return {
      isValid: false,
      formatted: '',
      error: 'Invalid Bangladesh phone number format. Use +8801XXXXXXXXX format.'
    };
  }

  // Determine operator
  const operatorCode = formatted.substring(4, 7); // Extract 01X part
  const operator = BD_OPERATORS[operatorCode as keyof typeof BD_OPERATORS];

  return {
    isValid: true,
    formatted,
    operator,
  };
};

export const phoneValidationMiddleware = (req: Request, res: Response, next: NextFunction) => {
  const phoneNumber = req.body.phoneNumber || req.params.phoneNumber;
  
  if (!phoneNumber) {
    return res.status(400).json({
      error: 'Phone number required',
      message: 'Phone number is required for this operation'
    });
  }

  const validation = validateBangladeshPhone(phoneNumber);
  
  if (!validation.isValid) {
    return res.status(400).json({
      error: 'Invalid phone number',
      message: validation.error
    });
  }

  // Replace the phone number with the formatted version
  if (req.body.phoneNumber) {
    req.body.phoneNumber = validation.formatted;
  }
  if (req.params.phoneNumber) {
    req.params.phoneNumber = validation.formatted;
  }

  // Add validation result to request for use in handlers
  (req as any).phoneValidation = validation;

  next();
};

// Rate limiting for OTP requests
interface OTPRateLimit {
  count: number;
  resetTime: Date;
}

class OTPRateLimiter {
  private limits: Map<string, OTPRateLimit> = new Map();
  private readonly MAX_REQUESTS_PER_HOUR = 5;
  private readonly WINDOW_HOURS = 1;

  constructor() {
    // Clean up expired entries every 30 minutes
    setInterval(() => {
      this.cleanup();
    }, 30 * 60 * 1000);
  }

  isAllowed(phoneNumber: string): { allowed: boolean; resetTime?: Date; remaining?: number } {
    const now = new Date();
    const limit = this.limits.get(phoneNumber);

    if (!limit) {
      // First request
      const resetTime = new Date(now.getTime() + this.WINDOW_HOURS * 60 * 60 * 1000);
      this.limits.set(phoneNumber, {
        count: 1,
        resetTime,
      });
      return {
        allowed: true,
        remaining: this.MAX_REQUESTS_PER_HOUR - 1,
        resetTime,
      };
    }

    // Check if window has expired
    if (now > limit.resetTime) {
      // Reset the window
      const resetTime = new Date(now.getTime() + this.WINDOW_HOURS * 60 * 60 * 1000);
      this.limits.set(phoneNumber, {
        count: 1,
        resetTime,
      });
      return {
        allowed: true,
        remaining: this.MAX_REQUESTS_PER_HOUR - 1,
        resetTime,
      };
    }

    // Check if limit exceeded
    if (limit.count >= this.MAX_REQUESTS_PER_HOUR) {
      return {
        allowed: false,
        resetTime: limit.resetTime,
        remaining: 0,
      };
    }

    // Increment count
    limit.count++;
    return {
      allowed: true,
      remaining: this.MAX_REQUESTS_PER_HOUR - limit.count,
      resetTime: limit.resetTime,
    };
  }

  private cleanup(): void {
    const now = new Date();
    let cleanedCount = 0;

    for (const [phoneNumber, limit] of this.limits.entries()) {
      if (now > limit.resetTime) {
        this.limits.delete(phoneNumber);
        cleanedCount++;
      }
    }

    if (cleanedCount > 0) {
      console.log(`🧹 Cleaned up ${cleanedCount} expired OTP rate limits`);
    }
  }

  getStats(): { totalEntries: number; activeEntries: number } {
    const now = new Date();
    let activeCount = 0;

    for (const limit of this.limits.values()) {
      if (now <= limit.resetTime) {
        activeCount++;
      }
    }

    return {
      totalEntries: this.limits.size,
      activeEntries: activeCount,
    };
  }
}

// Export singleton instance
export const otpRateLimiter = new OTPRateLimiter();

export const otpRateLimitMiddleware = (req: Request, res: Response, next: NextFunction) => {
  const phoneNumber = req.body.phoneNumber || req.params.phoneNumber;
  
  if (!phoneNumber) {
    return next(); // Let other middleware handle missing phone number
  }

  const rateLimit = otpRateLimiter.isAllowed(phoneNumber);
  
  if (!rateLimit.allowed) {
    const resetTimeMinutes = Math.ceil((rateLimit.resetTime!.getTime() - Date.now()) / (1000 * 60));
    
    return res.status(429).json({
      error: 'Rate limit exceeded',
      message: `Too many OTP requests. Please try again in ${resetTimeMinutes} minutes.`,
      resetTime: rateLimit.resetTime,
      remaining: 0,
    });
  }

  // Add rate limit info to response headers
  res.set({
    'X-RateLimit-Limit': '5', // MAX_REQUESTS_PER_HOUR
    'X-RateLimit-Remaining': rateLimit.remaining?.toString() || '0',
    'X-RateLimit-Reset': rateLimit.resetTime?.toISOString() || '',
  });

  next();
};