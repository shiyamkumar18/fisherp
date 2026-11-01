import React from 'react';
import { AlertCircle } from 'lucide-react';
import Button from '@/components/ui/button';

export class ErrorBoundary extends React.Component {
  constructor(props) {
    super(props);
    this.state = { hasError: false, error: null, errorInfo: null };
  }

  static getDerivedStateFromError(error) {
    return { hasError: true, error };
  }

  componentDidCatch(error, errorInfo) {
    console.error("ErrorBoundary caught an error", error, errorInfo);
    this.setState({ errorInfo });
  }

  render() {
    if (this.state.hasError) {
      return (
        <div className="flex flex-col items-center justify-center min-h-screen p-4 text-center bg-background">
          <div className="w-16 h-16 bg-red-100 dark:bg-red-900/30 rounded-full flex items-center justify-center mb-6">
            <AlertCircle className="w-8 h-8 text-red-600 dark:text-red-400" />
          </div>
          <h1 className="text-2xl font-bold text-slate-900 dark:text-white mb-2">Something went wrong</h1>
          <p className="text-textSecondary dark:text-textSecondary/70 max-w-md mb-8">
            An unexpected error occurred in the application. Please try refreshing the page or navigating back.
          </p>
          <div className="flex gap-4">
            <Button variant="outline" onClick={() => window.location.reload()}>
              Refresh Page
            </Button>
            <Button variant="default" onClick={() => window.location.href = '/'}>
              Go Home
            </Button>
          </div>
          {process.env.NODE_ENV === 'development' && (
            <div className="mt-8 p-4 bg-hover dark:bg-card rounded-lg text-left overflow-auto max-w-4xl text-sm w-full">
              <p className="font-semibold text-red-500 mb-2">{this.state.error && this.state.error.toString()}</p>
              <pre className="text-textSecondary whitespace-pre-wrap">{this.state.errorInfo?.componentStack}</pre>
            </div>
          )}
        </div>
      );
    }

    return this.props.children;
  }
}
