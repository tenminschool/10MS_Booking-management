import React from 'react';
import { AlertTriangle, RefreshCw, Home } from 'lucide-react';

// Mock UI components - replace with actual shadcn/ui components when available
const Button = ({ children, className = '', variant = 'default', onClick, ...props }: any) => (
  <button 
    className={`px-4 py-2 rounded-md font-medium transition-colors ${
      variant === 'outline' ? 'border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-700 hover:bg-gray-50 dark:hover:bg-gray-600 text-gray-900 dark:text-white' :
      'bg-blue-600 text-white hover:bg-blue-700'
    } ${className}`}
    onClick={onClick}
    {...props}
  >
    {children}
  </button>
);

const Card = ({ children, className = '' }: { children: React.ReactNode; className?: string }) => (
  <div className={`bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-lg shadow-sm ${className}`}>{children}</div>
);

const CardHeader = ({ children, className = '' }: { children: React.ReactNode; className?: string }) => (
  <div className={`p-6 pb-4 ${className}`}>{children}</div>
);

const CardTitle = ({ children, className = '' }: { children: React.ReactNode; className?: string }) => (
  <h3 className={`text-lg font-semibold text-gray-900 dark:text-white ${className}`}>{children}</h3>
);

const CardContent = ({ children, className = '' }: { children: React.ReactNode; className?: string }) => (
  <div className={`p-6 pt-0 ${className}`}>{children}</div>
);

interface ErrorBoundaryState {
  hasError: boolean;
  error?: Error;
  errorInfo?: React.ErrorInfo;
}

interface ErrorBoundaryProps {
  children: React.ReactNode;
  fallback?: React.ComponentType<ErrorFallbackProps>;
}

interface ErrorFallbackProps {
  error?: Error;
  resetError: () => void;
}

class ErrorBoundary extends React.Component<ErrorBoundaryProps, ErrorBoundaryState> {
  constructor(props: ErrorBoundaryProps) {
    super(props);
    this.state = { hasError: false };
  }

  static getDerivedStateFromError(error: Error): ErrorBoundaryState {
    return {
      hasError: true,
      error,
    };
  }

  componentDidCatch(error: Error, errorInfo: React.ErrorInfo) {
    this.setState({
      error,
      errorInfo,
    });

    // Log error to console in development
    if (import.meta.env.DEV) {
      console.error('ErrorBoundary caught an error:', error, errorInfo);
    }

    // In production, you would send this to a logging service
    if (import.meta.env.PROD) {
      // TODO: Send to logging service (e.g., Sentry)
      console.error('Production error caught by ErrorBoundary:', {
        error: error.message,
        stack: error.stack,
        componentStack: errorInfo.componentStack,
        timestamp: new Date().toISOString(),
        url: window.location.href,
        userAgent: navigator.userAgent,
      });
    }
  }

  resetError = () => {
    this.setState({ hasError: false, error: undefined, errorInfo: undefined });
  };

  render() {
    if (this.state.hasError) {
      const FallbackComponent = this.props.fallback || DefaultErrorFallback;
      return <FallbackComponent error={this.state.error} resetError={this.resetError} />;
    }

    return this.props.children;
  }
}

const DefaultErrorFallback: React.FC<ErrorFallbackProps> = ({ error, resetError }) => {
  const handleGoHome = () => {
    window.location.href = '/';
  };

  const handleReload = () => {
    window.location.reload();
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-50 dark:bg-gray-900 px-4">
      <Card className="w-full max-w-md">
        <CardHeader className="text-center">
          <div className="mx-auto w-12 h-12 bg-red-100 dark:bg-red-900/20 rounded-full flex items-center justify-center mb-4">
            <AlertTriangle className="w-6 h-6 text-red-600 dark:text-red-400" />
          </div>
          <CardTitle className="text-xl font-semibold text-gray-900 dark:text-white">
            Something went wrong
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <p className="text-sm text-gray-600 dark:text-gray-400 text-center">
            We're sorry, but something unexpected happened. Please try refreshing the page or go back to the home page.
          </p>

          {import.meta.env.DEV && error && (
            <details className="mt-4 p-3 bg-gray-100 dark:bg-gray-700 rounded-lg">
              <summary className="text-sm font-medium text-gray-700 dark:text-gray-300 cursor-pointer">
                Error Details (Development)
              </summary>
              <div className="mt-2 text-xs text-gray-600 dark:text-gray-400 font-mono">
                <div className="font-semibold">Error:</div>
                <div className="mb-2">{error.message}</div>
                <div className="font-semibold">Stack:</div>
                <pre className="whitespace-pre-wrap break-all">
                  {error.stack}
                </pre>
              </div>
            </details>
          )}

          <div className="flex flex-col sm:flex-row gap-3 pt-4">
            <Button
              onClick={resetError}
              variant="outline"
              className="flex items-center justify-center gap-2"
            >
              <RefreshCw className="w-4 h-4" />
              Try Again
            </Button>
            <Button
              onClick={handleReload}
              variant="outline"
              className="flex items-center justify-center gap-2"
            >
              <RefreshCw className="w-4 h-4" />
              Reload Page
            </Button>
            <Button
              onClick={handleGoHome}
              className="flex items-center justify-center gap-2"
            >
              <Home className="w-4 h-4" />
              Go Home
            </Button>
          </div>
        </CardContent>
      </Card>
    </div>
  );
};

// Specific error fallbacks for different scenarios
export const NetworkErrorFallback: React.FC<ErrorFallbackProps> = ({ resetError }) => (
  <div className="min-h-screen flex items-center justify-center bg-gray-50 dark:bg-gray-900 px-4">
    <Card className="w-full max-w-md">
      <CardHeader className="text-center">
        <div className="mx-auto w-12 h-12 bg-yellow-100 dark:bg-yellow-900/20 rounded-full flex items-center justify-center mb-4">
          <AlertTriangle className="w-6 h-6 text-yellow-600 dark:text-yellow-400" />
        </div>
        <CardTitle className="text-xl font-semibold text-gray-900 dark:text-white">
          Connection Problem
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        <p className="text-sm text-gray-600 dark:text-gray-400 text-center">
          Unable to connect to the server. Please check your internet connection and try again.
        </p>
        <div className="flex flex-col gap-3 pt-4">
          <Button
            onClick={resetError}
            className="flex items-center justify-center gap-2"
          >
            <RefreshCw className="w-4 h-4" />
            Retry Connection
          </Button>
        </div>
      </CardContent>
    </Card>
  </div>
);

export const AuthErrorFallback: React.FC<ErrorFallbackProps> = () => (
  <div className="min-h-screen flex items-center justify-center bg-gray-50 dark:bg-gray-900 px-4">
    <Card className="w-full max-w-md">
      <CardHeader className="text-center">
        <div className="mx-auto w-12 h-12 bg-blue-100 dark:bg-blue-900/20 rounded-full flex items-center justify-center mb-4">
          <AlertTriangle className="w-6 h-6 text-blue-600 dark:text-blue-400" />
        </div>
        <CardTitle className="text-xl font-semibold text-gray-900 dark:text-white">
          Authentication Required
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        <p className="text-sm text-gray-600 dark:text-gray-400 text-center">
          Your session has expired. Please log in again to continue.
        </p>
        <div className="flex flex-col gap-3 pt-4">
          <Button
            onClick={() => window.location.href = '/login'}
            className="flex items-center justify-center gap-2"
          >
            Go to Login
          </Button>
        </div>
      </CardContent>
    </Card>
  </div>
);

// Hook for using error boundary programmatically
export const useErrorHandler = () => {
  return (error: Error, errorInfo?: React.ErrorInfo) => {
    // Log the error
    if (import.meta.env.DEV) {
      console.error('Manual error report:', error, errorInfo);
    }

    // In production, send to logging service
    if (import.meta.env.PROD) {
      // TODO: Send to logging service
      console.error('Production manual error:', {
        error: error.message,
        stack: error.stack,
        timestamp: new Date().toISOString(),
        url: window.location.href,
      });
    }

    // Re-throw to trigger error boundary
    throw error;
  };
};

export default ErrorBoundary;