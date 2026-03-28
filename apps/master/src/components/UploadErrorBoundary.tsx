import { Component, ErrorInfo, ReactNode } from 'react';
import { logger } from '../utils/logger.ts';

interface Props {
    children: ReactNode;
    onReset?: () => void;
}

interface State {
    hasError: boolean;
    error: Error | null;
}

export class UploadErrorBoundary extends Component<Props, State> {
    public state: State = {
        hasError: false,
        error: null
    };

    public static getDerivedStateFromError(error: Error): State {
        return { hasError: true, error };
    }

    public componentDidCatch(error: Error, errorInfo: ErrorInfo) {
        logger.error('[UploadErrorBoundary] Uncaught upload error:', {
            error: error.message,
            stack: error.stack,
            info: errorInfo
        });
    }

    private handleReset = () => {
        this.setState({ hasError: false, error: null });
        if (this.onReset) this.onReset();
    };

    public render() {
        if (this.state.hasError) {
            return (
                <div className="bg-red-50 dark:bg-red-900/20 border-2 border-red-200 dark:border-red-800 rounded-2xl p-8 text-center animate-bounceIn">
                    <div className="w-16 h-16 bg-red-100 dark:bg-red-900/40 rounded-full flex items-center justify-center mx-auto mb-4">
                        <svg xmlns="http://www.w3.org/2000/svg" className="h-8 w-8 text-red-600 dark:text-red-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
                        </svg>
                    </div>
                    <h3 className="text-xl font-black text-red-900 dark:text-red-100 mb-2">Upload Engine Interrupted</h3>
                    <p className="text-red-700 dark:text-red-300 mb-6 max-w-md mx-auto">
                        A critical error occurred while processing the photo queue. The system has paused to prevent data loss.
                    </p>
                    <div className="flex justify-center gap-4">
                        <button
                            onClick={() => window.location.reload()}
                            className="px-6 py-2 bg-red-600 hover:bg-red-700 text-white font-bold rounded-xl transition-all active:scale-95"
                        >
                            Reload Application
                        </button>
                        <button
                            onClick={this.handleReset}
                            className="px-6 py-2 bg-white dark:bg-slate-800 text-red-600 dark:text-red-400 border border-red-200 dark:border-red-800 font-bold rounded-xl hover:bg-red-50 dark:hover:bg-red-900/40 transition-all active:scale-95"
                        >
                            Try Recovery
                        </button>
                    </div>
                    {this.state.error && (
                        <div className="mt-8 pt-6 border-t border-red-100 dark:border-red-900/40 text-left">
                            <details className="text-xs text-red-500/80 cursor-pointer">
                                <summary className="font-mono uppercase tracking-widest hover:text-red-600">Technical Details</summary>
                                <pre className="mt-2 p-4 bg-black/5 dark:bg-black/20 rounded font-mono overflow-auto whitespace-pre-wrap">
                                    {this.state.error.stack}
                                </pre>
                            </details>
                        </div>
                    )}
                </div>
            );
        }

        return this.props.children;
    }

    private get onReset() {
        return this.props.onReset;
    }
}
