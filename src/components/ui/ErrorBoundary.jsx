import React from 'react';
import { reloadWithFreshAssets } from '../../lib/chunkLoadRecovery';

/**
 * ErrorBoundary catches unhandled React render errors and shows
 * a graceful recovery screen instead of crashing to a white screen.
 */
class ErrorBoundary extends React.Component {
    constructor(props) {
        super(props);
        this.state = { hasError: false, error: null };
    }

    static getDerivedStateFromError(error) {
        return { hasError: true, error };
    }

    componentDidCatch(error, info) {
        // In production you'd send this to your error tracking service (e.g. Sentry)
        console.error('[ErrorBoundary] Unhandled error:', error, info.componentStack);
    }

    handleReload = () => {
        this.setState({ hasError: false, error: null });
        reloadWithFreshAssets();
    };

    render() {
        if (this.state.hasError) {
            return (
                <div className="min-h-screen bg-gray-50 flex flex-col items-center justify-center p-8 text-center">
                    <div className="w-20 h-20 bg-red-50 rounded-full flex items-center justify-center text-4xl mb-6 shadow-sm border border-red-100">
                        ⚠️
                    </div>
                    <h1 className="text-2xl font-serif font-black text-gray-800 mb-2">
                        Something went wrong
                    </h1>
                    <p className="text-sm text-gray-500 max-w-sm mb-6 leading-relaxed">
                        An unexpected error occurred. Your data is safe in Google Sheets — just reload to continue.
                    </p>
                    {this.state.error && (
                        <details className="text-left bg-gray-100 rounded-xl p-4 text-xs text-gray-500 max-w-md w-full mb-6 cursor-pointer">
                            <summary className="font-bold text-gray-600 mb-1 select-none">Error details</summary>
                            <code className="break-all whitespace-pre-wrap">{this.state.error.toString()}</code>
                        </details>
                    )}
                    <button
                        onClick={this.handleReload}
                        className="bg-emerald-600 text-white px-8 py-3 rounded-full font-black text-xs uppercase tracking-widest hover:bg-emerald-700 active:scale-95 transition-all shadow-lg shadow-emerald-200"
                    >
                        Reload App
                    </button>
                </div>
            );
        }

        return this.props.children;
    }
}

export default ErrorBoundary;
