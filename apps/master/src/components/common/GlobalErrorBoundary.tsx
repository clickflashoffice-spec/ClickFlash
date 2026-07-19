
import { Component, ErrorInfo, ReactNode } from 'react';
import { logger } from '@/utils/logger';

const logError = (error: Error, errorInfo: ErrorInfo) => {
    logger.error('Uncaught error:', error, errorInfo);
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
        window.location.reload();
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

                    <div className="mt-12 w-full max-w-2xl px-4">
                        <details className="cursor-pointer">
                            <summary className="text-slate-500 hover:text-slate-300 text-sm font-mono mb-2 text-center">
                                View Error Details
                            </summary>
                            <div className="p-4 bg-slate-800 rounded text-xs font-mono text-red-300 overflow-auto border border-red-900/50 max-h-60">
                                <p className="font-bold border-b border-red-900/50 pb-2 mb-2">{this.state.error?.toString()}</p>
                                {this.state.error?.stack}
                            </div>
                        </details>
                    </div>
                </div>
            );
        }

        return this.props.children;
    }
}

export default GlobalErrorBoundary;
