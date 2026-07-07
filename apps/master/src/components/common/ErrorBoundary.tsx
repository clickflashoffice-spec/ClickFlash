import { Component, ErrorInfo, ReactNode } from 'react';
import { logger } from '../../utils/logger';
import { AlertOctagon, RefreshCw, Clipboard } from 'lucide-react';

interface Props {
  children: ReactNode;
  fallback?: ReactNode;
  subtle?: boolean;
  onReset?: () => void;
}

interface State {
  hasError: boolean;
  errorId: string | null;
  error: Error | null;
}

/**
 * ErrorBoundary
 * 
 * Catches JavaScript errors anywhere in their child component tree,
 * logs those errors, and displays a fallback UI instead of the component 
 * tree that crashed.
 * 
 * Feature: Generates a unique Error ID for user reporting.
 */
export class ErrorBoundary extends Component<Props, State> {
  public state: State = {
    hasError: false,
    errorId: null,
    error: null
  };

  public static getDerivedStateFromError(error: Error): State {
    // Update state so the next render will show the fallback UI.
    return {
      hasError: true,
      errorId: Math.random().toString(36).substring(2, 9).toUpperCase(),
      error
    };
  }

  public componentDidCatch(error: Error, errorInfo: ErrorInfo) {
    logger.error('[ErrorBoundary] Uncaught React Error:', error, errorInfo);

    // In a production app, we would also send this to a service like Sentry or a custom backend endpoint
    // e.g., apiService.reportError({ error, errorInfo, id: this.state.errorId });
  }

  private handleReset = () => {
    if (this.props.onReset) {
      this.props.onReset();
      this.setState({ hasError: false, errorId: null, error: null });
    } else {
      this.setState({ hasError: false, errorId: null, error: null });
      window.location.reload();
    }
  };

  private copyErrorId = () => {
    if (this.state.errorId) {
      navigator.clipboard.writeText(this.state.errorId);
      // Optional: show momentary visual feedback
    }
  };

  public render() {
    if (this.state.hasError) {
      if (this.props.fallback) {
        return this.props.fallback;
      }

      if (this.props.subtle) {
        return (
          <div className="bg-slate-900 border border-red-500/20 rounded-xl p-4 flex items-center justify-between text-slate-300">
            <div className="flex items-center gap-3">
              <AlertOctagon className="w-5 h-5 text-red-500" />
              <div className="flex flex-col">
                <span className="text-sm font-bold text-white">Component Error</span>
                <span className="text-[10px] text-slate-500 font-mono tracking-tighter">ID: {this.state.errorId}</span>
              </div>
            </div>
            <button
              onClick={() => this.setState({ hasError: false, errorId: null, error: null })}
              className="p-2 hover:bg-slate-800 rounded-lg text-blue-400 hover:text-blue-300 transition-all active:scale-95"
              title="Try Again"
            >
              <RefreshCw className="w-4 h-4" />
            </button>
          </div>
        );
      }

      return (
        <div className="min-h-screen bg-slate-950 flex items-center justify-center p-6 font-sans">
          <div className="max-w-md w-full bg-slate-900 border border-red-500/20 rounded-2xl p-8 shadow-2xl relative overflow-hidden">
            {/* Background flare */}
            <div className="absolute -top-24 -left-24 w-48 h-48 bg-red-500/10 blur-3xl rounded-full" />

            <div className="relative z-10 flex flex-col items-center text-center">
              <div className="w-16 h-16 bg-red-500/10 rounded-full flex items-center justify-center mb-6 border border-red-500/20">
                <AlertOctagon className="w-8 h-8 text-red-500" />
              </div>

              <h1 className="text-2xl font-bold text-white mb-2">System Problem Detected</h1>
              <p className="text-slate-400 mb-8 leading-relaxed">
                A component has crashed unexpectedly. We've logged the incident and generated a reference ID for support.
              </p>

              <div className="w-full bg-black/40 border border-slate-800 rounded-xl p-4 mb-8 flex items-center justify-between">
                <div className="text-left">
                  <span className="text-[10px] font-bold text-slate-500 uppercase tracking-widest block mb-1">Error Reference ID</span>
                  <span className="text-xl font-mono font-bold text-blue-400 tracking-wider">
                    {this.state.errorId}
                  </span>
                </div>
                <button
                  onClick={this.copyErrorId}
                  className="p-2 hover:bg-slate-800 rounded-lg transition-colors text-slate-400"
                  title="Copy ID"
                >
                  <Clipboard className="w-5 h-5" />
                </button>
              </div>

              <div className="flex flex-col w-full gap-3">
                <button
                  onClick={this.handleReset}
                  className="w-full py-3 bg-red-600 hover:bg-red-700 text-white font-bold rounded-xl transition-all shadow-lg shadow-red-600/20 flex items-center justify-center gap-2"
                >
                  <RefreshCw className="w-4 h-4" />
                  Restart System
                </button>
                <button
                  onClick={() => window.history.back()}
                  className="w-full py-3 bg-slate-800 hover:bg-slate-700 text-slate-300 font-bold rounded-xl transition-all"
                >
                  Go Back
                </button>
              </div>

              {import.meta.env.DEV && this.state.error && (
                <div className="mt-8 text-left w-full overflow-hidden">
                  <div className="text-xs font-bold text-red-400 mb-2 uppercase tracking-widest">Dev Info</div>
                  <pre className="text-[10px] font-mono text-slate-500 bg-black/40 p-3 rounded-lg overflow-x-auto">
                    {this.state.error.message}\n
                    {this.state.error.stack?.split('\n').slice(0, 3).join('\n')}
                  </pre>
                </div>
              )}
            </div>
          </div>
        </div>
      );
    }

    return this.props.children;
  }
}

export default ErrorBoundary;
