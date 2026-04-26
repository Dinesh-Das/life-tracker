import { useAuth } from '../context/AuthContext'
import { Calendar, CheckSquare, BarChart3 } from 'lucide-react'
import { Link } from 'react-router-dom'

function Login() {
    const { signIn } = useAuth();

    return (
        <div
            style={{
                minHeight: '100vh',
                display: 'flex',
                flexDirection: 'column',
                alignItems: 'center',
                justifyContent: 'center',
                background: '#1a3828',
                position: 'relative',
                overflow: 'hidden',
                padding: '24px',
            }}
        >
            {/* Background radial blobs */}
            <div aria-hidden="true" style={{
                position: 'absolute', inset: 0,
                background: `
                    radial-gradient(ellipse 70% 50% at 50% 30%, rgba(40,80,55,0.6) 0%, transparent 70%),
                    radial-gradient(ellipse 50% 40% at 80% 70%, rgba(20,50,30,0.4) 0%, transparent 60%)
                `,
                zIndex: 0,
            }} />

            {/* Content */}
            <div style={{
                position: 'relative', zIndex: 1,
                display: 'flex', flexDirection: 'column',
                alignItems: 'center', textAlign: 'center',
                gap: 0, width: '100%', maxWidth: '560px',
                padding: '48px 24px',
                animation: 'fadeUp 0.6s ease-out both',
            }}>
                {/* App title */}
                <h1 style={{
                    fontFamily: 'var(--font-display)',
                    fontSize: 'clamp(48px, 8vw, 64px)',
                    fontWeight: 500,
                    color: '#f0f7f0',
                    letterSpacing: '-0.02em',
                    lineHeight: 1,
                    marginBottom: '16px',
                }}>
                    LifeTracker
                </h1>

                {/* Tagline */}
                <p style={{
                    fontFamily: 'var(--font-body)',
                    fontSize: 'clamp(16px, 3vw, 22px)',
                    fontWeight: 400,
                    color: 'rgba(240,247,240,0.8)',
                    marginBottom: '52px',
                    letterSpacing: 0,
                }}>
                    Turn your life into a game
                </p>

                {/* Google Sign-in button */}
                <button
                    id="google-signin-btn"
                    onClick={signIn}
                    style={{
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        gap: '14px',
                        background: '#fff',
                        color: '#1a1a1a',
                        border: 'none',
                        borderRadius: '9999px',
                        padding: '18px 48px',
                        fontFamily: 'var(--font-body)',
                        fontSize: '18px',
                        fontWeight: 500,
                        cursor: 'pointer',
                        width: '100%',
                        maxWidth: '420px',
                        marginBottom: '44px',
                        boxShadow: '0 4px 20px rgba(0,0,0,0.25)',
                        transition: 'transform 0.2s, box-shadow 0.2s',
                    }}
                    onMouseEnter={e => {
                        e.currentTarget.style.transform = 'translateY(-2px)';
                        e.currentTarget.style.boxShadow = '0 8px 32px rgba(0,0,0,0.30)';
                    }}
                    onMouseLeave={e => {
                        e.currentTarget.style.transform = 'translateY(0)';
                        e.currentTarget.style.boxShadow = '0 4px 20px rgba(0,0,0,0.25)';
                    }}
                >
                    {/* Google G SVG */}
                    <svg width="22" height="22" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg" style={{ flexShrink: 0 }}>
                        <path d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z" fill="#4285F4"/>
                        <path d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" fill="#34A853"/>
                        <path d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z" fill="#FBBC05"/>
                        <path d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z" fill="#EA4335"/>
                    </svg>
                    Continue with Google
                </button>

                {/* Feature chips */}
                <div style={{ display: 'flex', gap: '12px', flexWrap: 'wrap', justifyContent: 'center', marginBottom: '48px' }}>
                    {[
                        { icon: Calendar, label: 'Monthly Tracker' },
                        { icon: CheckSquare, label: 'Weekly Planner' },
                        { icon: BarChart3, label: 'Dashboard' },
                    ].map(({ icon: Icon, label }) => (
                        <div
                            key={label}
                            style={{
                                display: 'inline-flex',
                                alignItems: 'center',
                                gap: '8px',
                                padding: '10px 20px',
                                borderRadius: '9999px',
                                border: '1.5px solid rgba(240,247,240,0.30)',
                                background: 'rgba(255,255,255,0.06)',
                                backdropFilter: 'blur(10px)',
                                WebkitBackdropFilter: 'blur(10px)',
                                fontSize: '14px',
                                fontWeight: 500,
                                fontFamily: 'var(--font-body)',
                                color: 'rgba(240,247,240,0.85)',
                            }}
                        >
                            <Icon size={15} />
                            <span>{label}</span>
                        </div>
                    ))}
                </div>

                {/* Footer note & Legal Links */}
                <div style={{ marginTop: 'auto', display: 'flex', flexDirection: 'column', gap: '8px', alignItems: 'center' }}>
                    <p style={{ fontSize: '12px', color: 'rgba(240,247,240,0.35)', fontFamily: 'var(--font-body)' }}>
                        Your data lives in your own Google Sheet. Transparent. Private. Yours.
                    </p>
                    <div style={{ display: 'flex', gap: '16px', fontSize: '12px', fontFamily: 'var(--font-body)' }}>
                        <Link to="/privacy" style={{ color: 'rgba(240,247,240,0.5)', textDecoration: 'none' }}>Privacy Policy</Link>
                        <span style={{ color: 'rgba(240,247,240,0.2)' }}>•</span>
                        <Link to="/terms" style={{ color: 'rgba(240,247,240,0.5)', textDecoration: 'none' }}>Terms of Service</Link>
                    </div>
                </div>
            </div>
        </div>
    );
}

export default Login;
