import { NavLink } from 'react-router-dom'
import { Calendar, LayoutDashboard, CheckSquare, Heart, Settings, PenLine } from 'lucide-react'
import { useAuth } from '../../context/AuthContext'
import { useAppContext } from '../../context/AppContext'

const MobileNav = () => {
    const { userGender } = useAuth();
    const { hideFemaleData } = useAppContext();

    const navItems = [
        { to: '/daily', icon: PenLine, label: 'Today' },
        { to: '/planner', icon: Calendar, label: 'Planner' },
        { to: '/dashboard', icon: LayoutDashboard, label: 'Stats' },
        ...(userGender === 'female' && !hideFemaleData ? [{ to: '/female', icon: Heart, label: 'Cycle' }] : []),
        { to: '/settings', icon: Settings, label: 'Setup' },
    ];

    return (
        <nav className="fixed bottom-0 left-0 right-0 lg:hidden bg-[#1B2A1C] border-t border-white/10 px-2 flex justify-around items-center z-50 h-[72px]"
            style={{ paddingBottom: 'env(safe-area-inset-bottom)' }}
        >
            {navItems.map(item => (
                <NavLink
                    key={item.to}
                    to={item.to}
                    className={({ isActive }) =>
                        `flex flex-col items-center justify-center gap-1.5 h-full flex-1 transition-all ${isActive ? 'text-[#4CAF50]' : 'text-white/50'}`
                    }
                >
                    {({ isActive }) => (
                        <>
                            <item.icon className={`w-5 h-5 transition-transform ${isActive ? 'scale-110' : ''}`} />
                            <span className={`text-[10px] font-black uppercase tracking-wider transition-all ${isActive ? 'opacity-100' : 'opacity-70'}`}>
                                {item.label}
                            </span>
                            {isActive && (
                                <div className="absolute top-0 left-1/2 -translate-x-1/2 w-8 h-1 bg-[#4CAF50] rounded-b-full shadow-[0_0_10px_rgba(76,175,80,0.5)]" />
                            )}
                        </>
                    )}
                </NavLink>
            ))}
        </nav>
    )
}

export default MobileNav
