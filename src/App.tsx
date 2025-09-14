import React from "react";
import { VibeStreamProvider } from "./context/VibeStreamContext";
import { AuthProvider } from "./context/AuthContext";
import "./i18n";
import EnhancedMusicApp from "./components/EnhancedMusicApp";
import AuthPrompt from "./features/auth/AuthPrompt";

// Error boundary component for debugging production issues
class ErrorBoundary extends React.Component<{children: React.ReactNode}, {hasError: boolean, error?: Error}> {
  constructor(props: {children: React.ReactNode}) {
    super(props);
    this.state = { hasError: false };
  }

  static getDerivedStateFromError(error: Error) {
    return { hasError: true, error };
  }

  componentDidCatch(error: Error, errorInfo: React.ErrorInfo) {
    console.error('App Error Boundary caught an error:', error, errorInfo);
  }

  render() {
    if (this.state.hasError) {
      return (
        <div className="min-h-screen bg-gray-900 text-white flex items-center justify-center p-4">
          <div className="text-center">
            <h1 className="text-2xl font-bold mb-4">VibeStream - Loading Error</h1>
            <p className="text-gray-300 mb-4">Something went wrong. Please check the browser console for details.</p>
            <button 
              onClick={() => this.setState({ hasError: false })}
              className="px-4 py-2 bg-emerald-500 text-white rounded hover:bg-emerald-600"
            >
              Try Again
            </button>
            {process.env.NODE_ENV === 'development' && (
              <pre className="mt-4 text-left text-red-400 text-xs bg-gray-800 p-4 rounded">
                {this.state.error?.stack}
              </pre>
            )}
          </div>
        </div>
      );
    }

    return this.props.children;
  }
}

export default function App() {
  // Debug environment variables on production
  React.useEffect(() => {
    console.log('[App] Environment check:');
    console.log('NODE_ENV:', process.env.NODE_ENV);
    console.log('VITE_SUPABASE_URL:', import.meta.env.VITE_SUPABASE_URL ? 'SET' : 'MISSING');
    console.log('VITE_SUPABASE_ANON_KEY:', import.meta.env.VITE_SUPABASE_ANON_KEY ? 'SET' : 'MISSING');
  }, []);

  return (
    <ErrorBoundary>
      <AuthProvider>
        <VibeStreamProvider>
          <EnhancedMusicApp />
          <AuthPrompt />
        </VibeStreamProvider>
      </AuthProvider>
    </ErrorBoundary>
  );
}