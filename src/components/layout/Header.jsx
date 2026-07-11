import { useState } from 'react'
import { Moon, Sun } from 'lucide-react'
import SavingIndicator from '../ui/SavingIndicator'
import { initTheme, toggleTheme } from '../../lib/theme'

/**
 * Page Header — Digital Sanctuary style
 * Renders the page title in Newsreader serif over the green-mist background.
 * On mobile it also renders a compact top bar with a back indicator.
 */
function Header({ title, subtitle, saving }) {
    // Mobile-only theme toggle — the sidebar (which hosts the desktop
    // toggle) is hidden below the lg breakpoint.
    const [theme, setTheme] = useState(initTheme);


    return (
        <div className="page-header" style={{ padding: 'clamp(22px, 5vw, 36px) clamp(16px, 5vw, 40px) 0', paddingBottom: 0, position: 'relative', maxWidth: '100%' }}>
            <button
                className="lg:hidden"
                onClick={() => setTheme(toggleTheme())}
                aria-label={theme === 'dark' ? 'Switch to light mode' : 'Switch to dark mode'}
                title={theme === 'dark' ? 'Switch to light mode' : 'Switch to dark mode'}
                style={{
                    position: 'absolute', top: '24px', right: '20px',
                    width: '38px', height: '38px', borderRadius: '50%',
                    display: 'flex', alignItems: 'center', justifyContent: 'center',
                    background: 'var(--surface-inner-strong)',
                    backdropFilter: 'blur(12px)', WebkitBackdropFilter: 'blur(12px)',
                    border: '1px solid var(--control-border)',
                    cursor: 'pointer', color: 'var(--text-heading, #2d4f41)',
                }}
            >
                {theme === 'dark' ? <Sun size={17} /> : <Moon size={17} />}
            </button>
            {title && (
                <h1 className="page-title" style={{ marginBottom: subtitle ? '6px' : '28px' }}>
                    {title}
                </h1>
            )}
            {subtitle && (
                <p className="page-subtitle" style={{ marginBottom: '28px' }}>
                    {subtitle}
                </p>
            )}
            {saving !== undefined && (
                <div style={{ marginTop: '-20px', marginBottom: '12px' }}>
                    <SavingIndicator saving={saving} />
                </div>
            )}
        </div>
    );
}

export default Header;
