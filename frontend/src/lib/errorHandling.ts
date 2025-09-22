import { AxiosError } from 'axios';

export interface ApiError {
  error: string;
  message: string;
  code?: string;
  details?: any[];
  statusCode?: number;
}

export interface ValidationError {
  field: string;
  message: string;
  code?: string;
  source?: 'body' | 'query' | 'params';
}

export class AppError extends Error {
  constructor(
    message: string,
    public code?: string,
    public statusCode?: number,
    public details?: any
  ) {
    super(message);
    this.name = 'AppError';
  }
}

export class ValidationErrorClass extends AppError {
  constructor(message: string, public validationErrors: ValidationError[]) {
    super(message, 'VALIDATION_ERROR', 400);
    this.name = 'ValidationError';
  }
}

export class BusinessRuleError extends AppError {
  constructor(message: string, public ruleType?: string) {
    super(message, 'BUSINESS_RULE_ERROR', 409);
    this.name = 'BusinessRuleError';
  }
}

// Error parsing utilities
export const parseApiError = (error: unknown): ApiError => {
  if (error instanceof AxiosError) {
    const response = error.response;
    
    if (response?.data) {
      return {
        error: response.data.error || 'API Error',
        message: response.data.message || 'An error occurred',
        code: response.data.code,
        details: response.data.details,
        statusCode: response.status,
      };
    }

    // Network or other axios errors
    if (error.code === 'NETWORK_ERROR' || !response) {
      return {
        error: 'Network Error',
        message: 'Unable to connect to the server. Please check your internet connection.',
        code: 'NETWORK_ERROR',
        statusCode: 0,
      };
    }

    return {
      error: 'Request Error',
      message: error.message || 'Request failed',
      code: error.code,
      statusCode: response?.status || 500,
    };
  }

  if (error instanceof Error) {
    return {
      error: 'Application Error',
      message: error.message,
      code: 'APP_ERROR',
    };
  }

  return {
    error: 'Unknown Error',
    message: 'An unexpected error occurred',
    code: 'UNKNOWN_ERROR',
  };
};

// User-friendly error messages
export const getErrorMessage = (error: ApiError): string => {
  // Business rule errors
  if (error.code === 'BUSINESS_RULE_ERROR') {
    return error.message;
  }

  // Validation errors
  if (error.code === 'VALIDATION_ERROR' && error.details) {
    const fieldErrors = error.details
      .map((detail: ValidationError) => `${detail.field}: ${detail.message}`)
      .join(', ');
    return `Validation failed: ${fieldErrors}`;
  }

  // Authentication errors
  if (error.statusCode === 401) {
    return 'Please log in to continue';
  }

  // Authorization errors
  if (error.statusCode === 403) {
    return 'You do not have permission to perform this action';
  }

  // Not found errors
  if (error.statusCode === 404) {
    return 'The requested resource was not found';
  }

  // Conflict errors
  if (error.statusCode === 409) {
    return error.message || 'A conflict occurred with existing data';
  }

  // Rate limiting
  if (error.statusCode === 429) {
    return 'Too many requests. Please try again later.';
  }

  // Server errors
  if (error.statusCode && error.statusCode >= 500) {
    return 'A server error occurred. Please try again later.';
  }

  // Network errors
  if (error.code === 'NETWORK_ERROR') {
    return error.message;
  }

  // Default to the provided message
  return error.message || 'An unexpected error occurred';
};

// Form validation helpers
export const getFieldError = (errors: ValidationError[], fieldName: string): string | undefined => {
  const error = errors.find(err => err.field === fieldName || err.field.endsWith(`.${fieldName}`));
  return error?.message;
};

export const hasFieldError = (errors: ValidationError[], fieldName: string): boolean => {
  return errors.some(err => err.field === fieldName || err.field.endsWith(`.${fieldName}`));
};

// Error categorization
export const isNetworkError = (error: ApiError): boolean => {
  return error.code === 'NETWORK_ERROR' || error.statusCode === 0;
};

export const isValidationError = (error: ApiError): boolean => {
  return error.code === 'VALIDATION_ERROR' || error.statusCode === 400;
};

export const isAuthError = (error: ApiError): boolean => {
  return error.statusCode === 401 || error.statusCode === 403;
};

export const isBusinessRuleError = (error: ApiError): boolean => {
  return error.code === 'BUSINESS_RULE_ERROR' || 
         error.code === 'DUPLICATE_BOOKING' ||
         error.code === 'MONTHLY_BOOKING_LIMIT' ||
         error.code === 'SLOT_CAPACITY_EXCEEDED' ||
         error.code === 'CANCELLATION_TIME_LIMIT';
};

export const isServerError = (error: ApiError): boolean => {
  return (error.statusCode && error.statusCode >= 500) || false;
};

// Retry logic helpers
export const shouldRetry = (error: ApiError, attempt: number, maxAttempts: number = 3): boolean => {
  if (attempt >= maxAttempts) return false;
  
  // Retry on network errors and server errors
  return isNetworkError(error) || isServerError(error);
};

// Error logging
export const logError = (error: ApiError, context?: any): void => {
  const errorInfo = {
    timestamp: new Date().toISOString(),
    error: error.error,
    message: error.message,
    code: error.code,
    statusCode: error.statusCode,
    context,
    userAgent: navigator.userAgent,
    url: window.location.href,
  };

  // Log to console in development
  if (import.meta.env.DEV) {
    console.error('Frontend error:', errorInfo);
  }

  // In production, you would send this to a logging service
  if (import.meta.env.PROD) {
    // TODO: Send to logging service (e.g., Sentry, LogRocket)
    console.error('Production error:', errorInfo);
  }
};

// Business rule specific error messages
export const getBusinessRuleMessage = (code: string): string => {
  switch (code) {
    case 'DUPLICATE_BOOKING':
      return 'You already have a booking for this slot or time period.';
    case 'MONTHLY_BOOKING_LIMIT':
      return 'You can only book one speaking test per month across all branches.';
    case 'SLOT_CAPACITY_EXCEEDED':
      return 'This slot is fully booked. Please choose another time.';
    case 'CANCELLATION_TIME_LIMIT':
      return 'Bookings cannot be cancelled within 24 hours of the scheduled time.';
    case 'PAST_SLOT_BOOKING':
      return 'Cannot book slots in the past.';
    case 'INVALID_BOOKING_STATUS':
      return 'This booking cannot be modified due to its current status.';
    default:
      return 'A business rule violation occurred.';
  }
};