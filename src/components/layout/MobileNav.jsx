import { NavLink } from 'react-router-dom'
import { Calendar, LayoutDashboard, CheckSquare, Settings, PenLine, Flower2, TrendingUp } from 'lucide-react'
import { useAuth } from '../../context/AuthContext'
import { useAppContext } from '../../context/AppContext'

const MobileNav = () => {
    const { userGender } = useAuth();
    const { hideFemaleData } = useAppContext();

    const navItems = [
        { to: '/hub',       icon: LayoutDashboard, label: 'Hub' },
        { to: '/daily',     icon: CheckSquare,     label: 'Daily' },
        { to: '/planner',   icon: Calendar,        label: 'Plan' },
        { to: '/dashboard', icon: TrendingUp,      label: 'Stats' },
        { to: '/journal',   icon: PenLine,         label: 'Journal' },
        ...(userGender === 'female' && !hideFemaleData
            ? [{ to: '/female', icon: Flower2, label: 'Cycle' }]
            : []),
        { to: '/settings',  icon: Settings,        label: 'Settings' },
    ];

    return (
        <nav
            className="fixed bottom-0 left-0 right-0 lg:hidden z-50 flex justify-around items-center"
            style={{
                height: '68px',
                paddingBottom: 'env(safe-area-inset-bottom)',
                background: 'linear-gradient(180deg, rgba(18,30,23,0.95) 0%, rgba(10,22,15,0.98) 100%)',
                backdropFilter: 'blur(20px)',
                WebkitBackdropFilter: 'blur(20px)',
                borderTop: '1px solid rgba(255,255,255,0.08)',
            }}
        >
            {navItems.map(item => (
                <NavLink
                    key={item.to}
                    to={item.to}
                    style={({ isActive }) => ({
                        display: 'flex',
                        flexDirection: 'column',
                        alignItems: 'center',
                        justifyContent: 'center',
                        gap: '4px',
                        flex: 1,
                        height: '100%',
                        textDecoration: 'none',
                        color: isActive ? '#a9cfbc' : 'rgba(154,176,162,0.6)',
                        transition: 'color 0.2s',
                        position: 'relative',
                    })}
                >
                    {({ isActive }) => (
                        <>
                            {isActive && (
                                <div style={{
                                    position: 'absolute',
                                    top: 0, left: '50%',
                                    transform: 'translateX(-50%)',
                                    width: '32px', height: '2px',
                                    background: '#a9cfbc',
                                    borderRadius: '0 0 4px 4px',
                                    boxShadow: '0 0 8px rgba(169,207,188,0.6)',
                                }} />
                            )}
                            <item.icon
                                size={20}
                                style={{ transform: isActive ? 'scale(1.1)' : 'scale(1)', transition: 'transform 0.2s' }}
                            />
                            <span style={{
                                fontSize: '9px',
                                fontWeight: 700,
                                fontFamily: 'var(--font-body)',
                                letterSpacing: '0.06em',
                                textTransform: 'uppercase',
                                opacity: isActive ? 1 : 0.7,
                            }}>
                                {item.label}
                            </span>
                        </>
                    )}
                </NavLink>
            ))}
        </nav>
    );
};

export default MobileNav;
