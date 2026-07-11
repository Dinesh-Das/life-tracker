function LoadErrorState({ title = 'Data could not be loaded', error, onRetry }) {
    return (
        <div className="px-4 py-6 sm:px-10" role="alert" aria-live="assertive">
            <div className="glass-card" style={{ padding: '24px' }}>
                <h2 style={{ fontFamily: 'var(--font-display)', color: 'var(--text-heading)', marginBottom: '8px' }}>{title}</h2>
                <p style={{ color: 'var(--text-muted)', marginBottom: onRetry ? '16px' : 0 }}>
                    {error?.message || 'Check your connection and try again.'}
                </p>
                {onRetry && <button type="button" className="system-action-button" onClick={onRetry}>Retry</button>}
            </div>
        </div>
    );
}

export default LoadErrorState;
