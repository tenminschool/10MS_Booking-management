import React from 'react';
import { AlertCircle, AlertTriangle, Info } from 'lucide-react';
import { cn } from '@/lib/utils';
import { type ApiError, type ValidationError, isValidationError, isBusinessRuleError, getFieldError } from '@/lib/errorHandling';

interface FormErrorProps {
  error: ApiError | null;
  className?: string;
}

export const FormError: React.FC<FormErrorProps> = ({ error, className }) => {
  if (!error) return null;

  const getIcon = () => {
    if (isBusinessRuleError(error)) {
      return <AlertTriangle className="w-4 h-4 text-yellow-600" />;
    }
    if (isValidationError(error)) {
      return <Info className="w-4 h-4 text-blue-600" />;
    }
    return <AlertCircle className="w-4 h-4 text-red-600" />;
  };

  const getStyles = () => {
    if (isBusinessRuleError(error)) {
      return 'bg-yellow-50 border-yellow-200 text-yellow-800';
    }
    if (isValidationError(error)) {
      return 'bg-blue-50 border-blue-200 text-blue-800';
    }
    return 'bg-red-50 border-red-200 text-red-800';
  };

  return (
    <div className={cn('flex items-start gap-2 p-3 rounded-lg border', getStyles(), className)}>
      {getIcon()}
      <div className="flex-1 min-w-0">
        <div className="font-medium text-sm">{error.error}</div>
        <div className="text-sm mt-1">{error.message}</div>
        
        {/* Show validation details if available */}
        {isValidationError(error) && error.details && Array.isArray(error.details) && (
          <ul className="mt-2 text-xs space-y-1">
            {error.details.map((detail: ValidationError, index: number) => (
              <li key={index} className="flex items-start gap-1">
                <span className="font-medium">{detail.field}:</span>
                <span>{detail.message}</span>
              </li>
            ))}
          </ul>
        )}
      </div>
    </div>
  );
};

interface FieldErrorProps {
  errors: ValidationError[] | undefined;
  fieldName: string;
  className?: string;
}

export const FieldError: React.FC<FieldErrorProps> = ({ errors, fieldName, className }) => {
  if (!errors) return null;
  
  const errorMessage = getFieldError(errors, fieldName);
  if (!errorMessage) return null;

  return (
    <div className={cn('flex items-center gap-1 text-sm text-red-600 mt-1', className)}>
      <AlertCircle className="w-3 h-3" />
      <span>{errorMessage}</span>
    </div>
  );
};

interface FormFieldErrorProps {
  error?: string;
  className?: string;
}

export const FormFieldError: React.FC<FormFieldErrorProps> = ({ error, className }) => {
  if (!error) return null;

  return (
    <div className={cn('flex items-center gap-1 text-sm text-red-600 mt-1', className)}>
      <AlertCircle className="w-3 h-3" />
      <span>{error}</span>
    </div>
  );
};

interface BusinessRuleErrorProps {
  error: ApiError | null;
  className?: string;
}

export const BusinessRuleError: React.FC<BusinessRuleErrorProps> = ({ error, className }) => {
  if (!error || !isBusinessRuleError(error)) return null;

  return (
    <div className={cn('flex items-start gap-2 p-3 rounded-lg border bg-yellow-50 border-yellow-200 text-yellow-800', className)}>
      <AlertTriangle className="w-4 h-4 text-yellow-600 mt-0.5" />
      <div className="flex-1 min-w-0">
        <div className="font-medium text-sm">Business Rule Violation</div>
        <div className="text-sm mt-1">{error.message}</div>
        {error.code && (
          <div className="text-xs mt-1 font-mono bg-yellow-100 px-2 py-1 rounded">
            Code: {error.code}
          </div>
        )}
      </div>
    </div>
  );
};

interface NetworkErrorProps {
  error: ApiError | null;
  onRetry?: () => void;
  className?: string;
}

export const NetworkError: React.FC<NetworkErrorProps> = ({ error, onRetry, className }) => {
  if (!error || error.code !== 'NETWORK_ERROR') return null;

  return (
    <div className={cn('flex items-start gap-2 p-3 rounded-lg border bg-gray-50 border-gray-200 text-gray-800', className)}>
      <AlertCircle className="w-4 h-4 text-gray-600 mt-0.5" />
      <div className="flex-1 min-w-0">
        <div className="font-medium text-sm">Connection Problem</div>
        <div className="text-sm mt-1">{error.message}</div>
        {onRetry && (
          <button
            onClick={onRetry}
            className="text-sm font-medium text-blue-600 hover:text-blue-800 mt-2"
          >
            Try Again
          </button>
        )}
      </div>
    </div>
  );
};