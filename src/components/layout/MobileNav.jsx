import { useState } from 'react'
import { NavLink, useLocation } from 'react-router-dom'
import { AnimatePresence, motion } from 'framer-motion'
import { Calendar, LayoutDashboard, CheckSquare, Settings, PenLine, Flower2, TrendingUp, Timer, Award, LayoutGrid, Wrench } from 'lucide-react'
import { useAuth } from '../../context/AuthContext'
import { useAppContext } from '../../context/AppContext'

const MobileNav = () => {
    const { userGender } = useAuth();
    const { hideFemaleData } = useAppContext();
    const location = useLocation();
    const [moreOpen, setMoreOpen] = useState(false);

    // Four primary destinations stay on the bar; everything else lives
    // in the "More" sheet so the bar never overcrowds on narrow screens.
    const primaryItems = [
        { to: '/hub',       icon: LayoutDashboard, label: 'Hub' },
        { to: '/daily',     icon: CheckSquare,     label: 'Daily' },
        { to: '/planner',   icon: Calendar,        label: 'Plan' },
        { to: '/dashboard', icon: TrendingUp,      label: 'Stats' },
    ];
    const moreItems = [
        { to: '/journal',  icon: PenLine,  label: 'Journal' },
        { to: '/focus',    icon: Timer,    label: 'Focus' },
        { to: '/wrapped',  icon: Award,    label: 'Wrapped' },
        { to: '/tools',    icon: Wrench,   label: 'Tools' },
        ...(userGender === 'female' && !hideFemaleData
            ? [{ to: '/female', icon: Flower2, label: 'Cycle' }]
            : []),
        { to: '/settings', icon: Settings, label: 'Settings' },
    ];

    const moreActive = moreItems.some(item => location.pathname === item.to);

    const renderBarItem = (item) => (
        <NavLink
            key={item.to}
            to={item.to}
            onClick={() => setMoreOpen(false)}
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
    );

    return (
        <>
            {/* "More" bottom sheet */}
            <AnimatePresence>
                {moreOpen && (
                    <>
                        <motion.div
                            key="more-backdrop"
                            className="fixed inset-0 lg:hidden"
                            style={{ background: 'rgba(0,0,0,0.45)', zIndex: 40 }}
                            initial={{ opacity: 0 }}
                            animate={{ opacity: 1 }}
                            exit={{ opacity: 0 }}
                            onClick={() => setMoreOpen(false)}
                        />
                        <motion.div
                            key="more-sheet"
                            className="fixed left-0 right-0 lg:hidden"
                            style={{
                                bottom: '68px',
                                zIndex: 50,
                                background: 'linear-gradient(180deg, rgba(18,30,23,0.97) 0%, rgba(10,22,15,0.99) 100%)',
                                backdropFilter: 'blur(20px)',
                                WebkitBackdropFilter: 'blur(20px)',
                                borderTop: '1px solid rgba(255,255,255,0.08)',
                                borderRadius: '20px 20px 0 0',
                                padding: '18px 16px calc(14px + env(safe-area-inset-bottom))',
                            }}
                            initial={{ opacity: 0, y: 24 }}
                            animate={{ opacity: 1, y: 0 }}
                            exit={{ opacity: 0, y: 24 }}
                            transition={{ duration: 0.2, ease: 'easeOut' }}
                        >
                            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '10px' }}>
                                {moreItems.map(item => (
                                    <NavLink
                                        key={item.to}
                                        to={item.to}
                                        onClick={() => setMoreOpen(false)}
                                        style={({ isActive }) => ({
                                            display: 'flex',
                                            flexDirection: 'column',
                                            alignItems: 'center',
                                            justifyContent: 'center',
                                            gap: '6px',
                                            padding: '14px 8px',
                                            borderRadius: '14px',
                                            textDecoration: 'none',
                                            background: isActive ? 'rgba(255,255,255,0.12)' : 'rgba(255,255,255,0.05)',
                                            color: isActive ? '#a9cfbc' : 'rgba(154,176,162,0.8)',
                                            transition: 'background 0.2s, color 0.2s',
                                        })}
                                    >
                                        <item.icon size={20} />
                                        <span style={{
                                            fontSize: '9px',
                                            fontWeight: 700,
                                            fontFamily: 'var(--font-body)',
                                            letterSpacing: '0.06em',
                                            textTransform: 'uppercase',
                                        }}>
                                            {item.label}
                                        </span>
                                    </NavLink>
                                ))}
                            </div>
                        </motion.div>
                    </>
                )}
            </AnimatePresence>

            {/* Bottom bar */}
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
                {primaryItems.map(renderBarItem)}

                {/* More button */}
                <button
                    onClick={() => setMoreOpen(v => !v)}
                    aria-label="More navigation options"
                    aria-expanded={moreOpen}
                    style={{
                        display: 'flex',
                        flexDirection: 'column',
                        alignItems: 'center',
                        justifyContent: 'center',
                        gap: '4px',
                        flex: 1,
                        height: '100%',
                        background: 'none',
                        border: 'none',
                        cursor: 'pointer',
                        color: (moreActive || moreOpen) ? '#a9cfbc' : 'rgba(154,176,162,0.6)',
                        transition: 'color 0.2s',
                        position: 'relative',
                    }}
                >
                    {moreActive && (
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
            <LayoutGrid
                        size={20}
                        style={{ transform: (moreActive || moreOpen) ? 'scale(1.1)' : 'scale(1)', transition: 'transform 0.2s' }}
                    />
                    <span style={{
                        fontSize: '9px',
                        fontWeight: 700,
                        fontFamily: 'var(--font-body)',
                        letterSpacing: '0.06em',
                        textTransform: 'uppercase',
                        opacity: (moreActive || moreOpen) ? 1 : 0.7,
                    }}>
                        More
                    </span>
                </button>
            </nav>
        </>
    );
};

export default MobileNav;
