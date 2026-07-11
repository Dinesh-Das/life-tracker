import { useState } from 'react'
import { NavLink } from 'react-router-dom'
import { Calendar, CheckSquare, LayoutDashboard, Settings, Flower2, LogOut, PenLine, Timer, TrendingUp, Award, Moon, Sun, Wrench } from 'lucide-react'
import { useAuth } from '../../context/AuthContext'
import { useAppContext } from '../../context/AppContext'
import { initTheme, toggleTheme } from '../../lib/theme'
import { useOverallStreak } from '../../hooks/useOverallStreak'
import StreakBadge from '../ui/StreakBadge'

function Sidebar() {
    const { signOut, user, userGender, spreadsheetId } = useAuth();
    const { hideFemaleData } = useAppContext();
    const [theme, setTheme] = useState(initTheme);
    const overallStreak = useOverallStreak(spreadsheetId);

    const navItems = [
        { to: '/hub',       icon: LayoutDashboard, label: 'Zen Hub' },
        { to: '/daily',     icon: CheckSquare,     label: 'Daily Check-in' },
        { to: '/planner',   icon: Calendar,         label: 'Planner' },
        { to: '/journal',   icon: PenLine,          label: 'Reflections' },
        { to: '/focus',     icon: Timer,            label: 'Focus Mode' },
        { to: '/dashboard', icon: TrendingUp,       label: 'Analytics' },
        { to: '/wrapped',   icon: Award,            label: 'Wrapped' },
        ...(userGender === 'female' && !hideFemaleData
            ? [{ to: '/female', icon: Flower2, label: 'Cycle Tracker' }]
            : []),
    ];

    const bottomItems = [
        { to: '/tools', icon: Wrench, label: 'Tools & Safety' },
        { to: '/settings', icon: Settings, label: 'Settings' },
    ];

    const userName = user?.getName?.() || user?.firstName || 'User';
    const userImage = user?.getImageUrl?.();
    const userInitial = userName.charAt(0).toUpperCase();

    return (
        <aside
            className="hidden lg:flex flex-col"
            style={{
                width: '236px',
                minWidth: '236px',
                height: '100vh',
                background: 'linear-gradient(180deg, #121e17 0%, #0a160f 100%)',
                borderRight: '1px solid rgba(255,255,255,0.07)',
                position: 'sticky',
                top: 0,
                zIndex: 10,
            }}
        >
            {/* Logo */}
            <div style={{ display: 'flex', alignItems: 'center', gap: '10px', padding: '22px 20px 24px' }}>
                <img 
                    src="/logo.png" 
                    alt="LifeTracker Logo" 
                    style={{ width: '32px', height: '32px', borderRadius: '8px', objectFit: 'cover' }} 
                />
                <span style={{ fontFamily: 'var(--font-body)', fontSize: '15px', fontWeight: 600, color: '#d8e6db' }}>
                    LifeTracker
                </span>
            </div>

            {/* Navigation */}
            <nav style={{ flex: 1, display: 'flex', flexDirection: 'column', gap: '2px', padding: '0 10px' }}>
                {navItems.map((item) => (
                    <NavLink
                        key={item.to}
                        to={item.to}
                        className={({ isActive }) => isActive ? 'sidebar-nav-item active' : 'sidebar-nav-item'}
                        style={({ isActive }) => ({
                            display: 'flex',
                            alignItems: 'center',
                            gap: '12px',
                            padding: '11px 14px',
                            borderRadius: '12px',
                            textDecoration: 'none',
                            fontSize: '14px',
                            fontWeight: 500,
                            fontFamily: 'var(--font-body)',
                            transition: 'background 0.2s, color 0.2s',
                            color: isActive ? '#d8e6db' : '#9ab0a2',
                            background: isActive ? 'rgba(255,255,255,0.10)' : 'transparent',
                        })}
                        onMouseEnter={e => {
                            if (!e.currentTarget.classList.contains('active')) {
                                e.currentTarget.style.background = 'rgba(255,255,255,0.06)';
                                e.currentTarget.style.color = '#d8e6db';
                            }
                        }}
                        onMouseLeave={e => {
                            if (!e.currentTarget.classList.contains('active')) {
                                e.currentTarget.style.background = 'transparent';
                                e.currentTarget.style.color = '#9ab0a2';
                            }
                        }}
                    >
                        <item.icon size={17} style={{ flexShrink: 0, opacity: 0.85 }} />
                        <span>{item.label}</span>
                    </NavLink>
                ))}
            </nav>

            {/* Streak Badge — live overall streak from the Streaks sheet */}
            {overallStreak > 0 && (
                <div style={{ padding: '8px 20px', display: 'flex', justifyContent: 'center' }}>
                    <StreakBadge count={overallStreak} size="lg" />
                </div>
            )}

            {/* Bottom items + User */}
            <div style={{ padding: '0 10px', display: 'flex', flexDirection: 'column', gap: '2px' }}>
                {bottomItems.map((item) => (
                    <NavLink
                        key={item.to}
                        to={item.to}
                        style={({ isActive }) => ({
                            display: 'flex',
                            alignItems: 'center',
                            gap: '12px',
                            padding: '11px 14px',
                            borderRadius: '12px',
                            textDecoration: 'none',
                            fontSize: '14px',
                            fontWeight: 500,
                            fontFamily: 'var(--font-body)',
                            transition: 'background 0.2s, color 0.2s',
                            color: isActive ? '#d8e6db' : '#9ab0a2',
                            background: isActive ? 'rgba(255,255,255,0.10)' : 'transparent',
                        })}
                        onMouseEnter={e => {
                            e.currentTarget.style.background = 'rgba(255,255,255,0.06)';
                            e.currentTarget.style.color = '#d8e6db';
                        }}
                        onMouseLeave={e => {
                            const isActive = e.currentTarget.getAttribute('aria-current') === 'page';
                            e.currentTarget.style.background = isActive ? 'rgba(255,255,255,0.10)' : 'transparent';
                            e.currentTarget.style.color = isActive ? '#d8e6db' : '#9ab0a2';
                        }}
                    >
                        <item.icon size={17} style={{ flexShrink: 0, opacity: 0.85 }} />
                        <span>{item.label}</span>
                    </NavLink>
                ))}

                {/* User info + logout */}
                <div style={{ display: 'flex', alignItems: 'center', gap: '10px', padding: '10px 14px', marginTop: '4px', marginBottom: '8px' }}>
                    <div style={{
                        width: '30px', height: '30px', borderRadius: '50%',
                        background: 'linear-gradient(135deg, #4a6358, #2d4f41)',
                        overflow: 'hidden', flexShrink: 0,
                        display: 'flex', alignItems: 'center', justifyContent: 'center',
                    }}>
                        {userImage
                            ? <img src={userImage} alt={userName} style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
                            : <span style={{ fontSize: '13px', fontWeight: 700, color: '#a9cfbc' }}>{userInitial}</span>
                        }
                    </div>
                    <span style={{ fontSize: '13px', fontWeight: 500, color: '#9ab0a2', flex: 1, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                        {userName}
                    </span>
                    <button
                        onClick={() => setTheme(toggleTheme())}
                        title={theme === 'dark' ? 'Switch to light mode' : 'Switch to dark mode'}
                        style={{ background: 'none', border: 'none', cursor: 'pointer', color: '#9ab0a2', display: 'flex', alignItems: 'center', padding: '4px' }}
                        onMouseEnter={e => e.currentTarget.style.color = '#d8e6db'}
                        onMouseLeave={e => e.currentTarget.style.color = '#9ab0a2'}
                    >
                        {theme === 'dark' ? <Sun size={17} /> : <Moon size={17} />}
                    </button>
                    <button
                        onClick={signOut}
                        title="Sign Out"
                        style={{ background: 'none', border: 'none', cursor: 'pointer', color: '#9ab0a2', display: 'flex', alignItems: 'center', padding: '4px' }}
                        onMouseEnter={e => e.currentTarget.style.color = '#ffb4ab'}
                        onMouseLeave={e => e.currentTarget.style.color = '#9ab0a2'}
                    >
                        <LogOut size={17} />
                    </button>
                </div>
            </div>
        </aside>
    );
}

export default Sidebar;
