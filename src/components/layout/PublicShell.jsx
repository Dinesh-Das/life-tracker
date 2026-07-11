import { Link } from 'react-router-dom';

export default function PublicShell({ children, actions = null, compact = false }) {
    return (
        <div className="public-shell">
            <div className="public-shell-overlay" aria-hidden="true" />
            <nav className="public-nav" aria-label="Public navigation">
                <Link to="/" className="public-brand" aria-label="LifeTracker home">
                    <img src="/logo.png" alt="" className="public-brand-logo" />
                    <span>LifeTracker</span>
                </Link>
                {actions && <div className="public-nav-actions">{actions}</div>}
            </nav>

            <main className={`public-main${compact ? ' public-main-compact' : ''}`}>
                {children}
            </main>

            <footer className="public-footer">
                <p>Your life data stays in the Google Sheet you own.</p>
                <div>
                    <Link to="/privacy">Privacy Policy</Link>
                    <span aria-hidden="true">•</span>
                    <Link to="/terms">Terms of Service</Link>
                </div>
            </footer>
        </div>
    );
}
