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
        <nav className="fixed bottom-0 left-0 right-0 lg:hidden bg-[#1B2A1C] border-t border-white/10 px-2 py-2 flex justify-around items-center z-50"
            style={{ paddingBottom: 'max(8px, env(safe-area-inset-bottom))' }}
        >
            {navItems.map(item => (
                <NavLink
                    key={item.to}
                    to={item.to}
                    className={({ isActive }) =>
                        `flex flex-col items-center gap-1 p-2 transition-all min-w-[48px] ${isActive ? 'text-[#4CAF50]' : 'text-white/50'}`
                    }
                >
                    {({ isActive }) => (
                        <>
                            <item.icon className="w-5 h-5" />
                            <span className="text-[9px] font-bold uppercase tracking-tight">
                                {item.label}
                            </span>
                            {isActive && (
                                <div className="w-1 h-1 bg-[#4CAF50] rounded-full" />
                            )}
                        </>
                    )}
                </NavLink>
            ))}
        </nav>
    )
}

export default MobileNav
