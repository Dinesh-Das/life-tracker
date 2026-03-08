import { NavLink } from 'react-router-dom'
import { Calendar, CheckSquare, LayoutDashboard, Settings, Flower2, LogOut, PenLine } from 'lucide-react'
import { useAuth } from '../../context/AuthContext'
import { useAppContext } from '../../context/AppContext'
import StreakBadge from '../ui/StreakBadge'

function Sidebar() {
    const { signOut, user, userGender } = useAuth();
    const { hideFemaleData } = useAppContext();

    const navItems = [
        { to: '/daily', icon: PenLine, label: 'Daily Check-in' },
        { to: '/planner', icon: Calendar, label: 'Planner' },
        { to: '/dashboard', icon: LayoutDashboard, label: 'Dashboard' },
        ...(userGender === 'female' && !hideFemaleData ? [{ to: '/female', icon: Flower2, label: 'Female Tracker' }] : []),
        { to: '/settings', icon: Settings, label: 'Settings' },
    ];

    return (
        <aside className="hidden lg:flex flex-col w-64 bg-[#1B2A1C] text-white min-h-screen sticky top-0">
            <div className="p-6">
                {/* Logo */}
                <div className="flex items-center space-x-2 mb-2">
                    <span className="text-2xl">🎮</span>
                    <span className="text-xl font-serif font-bold">LifeTracker</span>
                </div>
                <p className="text-[#4CAF50] text-[10px] font-bold uppercase tracking-[0.15em] mb-8 pl-9">Turn life into a game</p>

                {/* Navigation */}
                <nav className="space-y-1">
                    {navItems.map((item) => (
                        <NavLink
                            key={item.to}
                            to={item.to}
                            className={({ isActive }) =>
                                `flex items-center space-x-3 px-4 py-3 rounded-xl transition-all text-sm ${isActive
                                    ? 'bg-[rgba(76,175,80,0.2)] text-[#66BB6A] font-semibold'
                                    : 'text-white/60 hover:bg-white/5 hover:text-white'
                                }`
                            }
                        >
                            <item.icon size={18} />
                            <span>{item.label}</span>
                        </NavLink>
                    ))}
                </nav>
            </div>

            {/* Month Picker Removed (Now in Planner.jsx) */}

            {/* Streak */}
            <div className="px-6 py-4 flex justify-center">
                <StreakBadge count={0} size="lg" />
            </div>

            {/* User */}
            <div className="mt-auto p-6 border-t border-white/5">
                <div className="flex items-center space-x-3 mb-4">
                    <div className="w-9 h-9 rounded-full bg-emerald-600 flex items-center justify-center text-sm font-bold overflow-hidden shrink-0">
                        {user?.getImageUrl?.() ? (
                            <img src={user.getImageUrl()} alt={user.getName()} className="w-full h-full object-cover" />
                        ) : (
                            user?.getName?.().charAt(0) || 'U'
                        )}
                    </div>
                    <div className="flex-1 min-w-0">
                        <p className="text-xs font-bold truncate">{user?.getName?.() || 'User'}</p>
                        <p className="text-[10px] text-white/40 truncate">{user?.getEmail?.()}</p>
                    </div>
                </div>
                <button
                    onClick={signOut}
                    className="flex items-center space-x-2 text-white/40 hover:text-white transition-colors text-xs font-medium w-full"
                >
                    <LogOut size={14} />
                    <span>Sign Out</span>
                </button>
            </div>
        </aside>
    );
}

export default Sidebar;
