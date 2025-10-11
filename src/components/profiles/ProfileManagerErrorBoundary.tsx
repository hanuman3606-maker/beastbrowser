import React, { Component, ReactNode } from 'react';
import { AlertCircle } from 'lucide-react';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { Button } from '@/components/ui/button';

interface Props {
  children: ReactNode;
  fallback?: ReactNode;
}

interface State {
  hasError: boolean;
  error: Error | null;
  errorInfo: React.ErrorInfo | null;
}

export class ProfileManagerErrorBoundary extends Component<Props, State> {
  constructor(props: Props) {
    super(props);
    this.state = {
      hasError: false,
      error: null,
      errorInfo: null
    };
  }

  static getDerivedStateFromError(error: Error): State {
    return {
      hasError: true,
      error,
      errorInfo: null
    };
  }

  componentDidCatch(error: Error, errorInfo: React.ErrorInfo) {
    console.error('ProfileManager Error Boundary caught an error:', error, errorInfo);
    this.setState({
      error,
      errorInfo
    });
  }

  handleReset = () => {
    this.setState({
      hasError: false,
      error: null,
      errorInfo: null
    });
  };

  render() {
    if (this.state.hasError) {
      if (this.props.fallback) {
        return this.props.fallback;
      }

      return (
        <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-50 flex items-center justify-center p-4">
          <div className="max-w-md w-full">
            <Alert variant="destructive" className="mb-4">
              <AlertCircle className="h-4 w-4" />
              <AlertTitle>Profile Manager Error</AlertTitle>
              <AlertDescription>
                An unexpected error occurred in the Profile Manager. This usually happens when:
                <ul className="list-disc ml-4 mt-2 space-y-1">
                  <li>There's an issue with profile data formatting</li>
                  <li>A browser window failed to open/close properly</li>
                  <li>There's a network connectivity issue</li>
                  <li>The application state became corrupted</li>
                </ul>
              </AlertDescription>
            </Alert>
            
            <div className="bg-white rounded-lg p-4 mb-4 border border-blue-200">
              <h4 className="font-semibold text-blue-800 mb-2">Error Details:</h4>
              <p className="text-sm text-blue-600 mb-2">
                {this.state.error?.message || 'Unknown error occurred'}
              </p>
              {this.state.errorInfo && (
                <details className="text-xs text-gray-600">
                  <summary className="cursor-pointer text-blue-500 hover:text-blue-700">
                    Technical Details
                  </summary>
                  <pre className="mt-2 p-2 bg-gray-50 rounded overflow-auto max-h-32">
                    {this.state.errorInfo.componentStack}
                  </pre>
                </details>
              )}
            </div>

            <div className="flex gap-3">
              <Button 
                onClick={this.handleReset}
                className="flex-1 bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-700 hover:to-indigo-700 text-white"
              >
                Try Again
              </Button>
              <Button 
                variant="outline" 
                onClick={() => window.location.reload()}
                className="flex-1 border-gray-300 text-gray-700 hover:bg-gray-100"
              >
                Reload App
              </Button>
            </div>

            <div className="mt-4 text-sm text-gray-600">
              <p className="font-medium mb-2">Quick Fixes to Try:</p>
              <ul className="list-disc ml-4 space-y-1">
                <li>Refresh the page (F5 or Ctrl+R)</li>
                <li>Close and reopen the application</li>
                <li>Check your internet connection</li>
                <li>Try creating profiles one at a time instead of bulk</li>
                <li>Clear browser cache if using web version</li>
              </ul>
            </div>
          </div>
        </div>
      );
    }

    return this.props.children;
  }
}

export default ProfileManagerErrorBoundary;