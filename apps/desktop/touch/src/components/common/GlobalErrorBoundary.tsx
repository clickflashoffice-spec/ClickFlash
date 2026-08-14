
import React, { Component, ErrorInfo, ReactNode } from 'react';
import { logger } from '@/utils/logger';
import { analytics } from '@/utils/telemetry';

// Use a simple inline logger or console if the main logger isn't available in this context
const logError = (error: Error, errorInfo: ErrorInfo) => {
    analytics.trackError(error, "GlobalErrorBoundary");
    logger.error('Frontend crash', error, { componentStack: errorInfo.componentStack });
};

interface Props {
    children: ReactNode;
}

interface State {
    hasError: boolean;
    error: Error | null;
}

class GlobalErrorBoundary extends Component<Props, State> {
    public state: State = {
        hasError: false,
        error: null
    };

    public static getDerivedStateFromError(error: Error): State {
        return { hasError: true, error };
    }

    public componentDidCatch(error: Error, errorInfo: ErrorInfo) {
        logError(error, errorInfo);
    }

    private handleRestart = () => {
        // Try strict kiosk exit if available, otherwise reload
        // Try strict kiosk exit if available, otherwise reload
        if (window.electron?.exitKiosk) {
            // For Admin convenience, maybe we want to offer exit?
            // But for a crash, a Reload is safer to get back to business.
            window.location.reload();
        } else {
            window.location.reload();
        }
    };

    private handleExit = () => {
        window.location.reload();
    };

    public render() {
        if (this.state.hasError) {
            return (
                <div className="h-screen w-screen bg-slate-900 text-white flex flex-col items-center justify-center p-8 select-none">
                    <div className="bg-red-500/10 p-6 rounded-full mb-6 animate-pulse">
                        <svg xmlns="http://www.w3.org/2000/svg" className="h-16 w-16 text-red-500" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
                        </svg>
                    </div>
                    <h1 className="text-3xl font-bold mb-4 text-center">System Problem Detected</h1>
                    <p className="text-slate-400 max-w-md text-center mb-8">
                        The application encountered an unexpected error. The system has logged this event for diagnosis.
                    </p>

                    <div className="flex gap-4">
                        <button
                            onClick={this.handleRestart}
                            className="bg-blue-600 hover:bg-blue-700 text-white px-8 py-3 rounded-lg font-bold transition-all shadow-lg active:scale-95"
                        >
                            Restart System
                        </button>

                        <button
                            onClick={this.handleExit}
                            className="bg-slate-800 hover:bg-slate-700 text-slate-300 px-6 py-3 rounded-lg font-semibold transition-all border border-slate-700"
                        >
                            Exit App
                        </button>
                    </div>

                    {process.env.NODE_ENV === 'development' && this.state.error && (
                        <div className="mt-12 p-4 bg-slate-800 rounded text-xs font-mono text-red-300 max-w-2xl overflow-auto border border-red-900/50">
                            {this.state.error.toString()}
                        </div>
                    )}
                </div>
            );
        }

        return this.props.children;
    }
}

export default GlobalErrorBoundary;
