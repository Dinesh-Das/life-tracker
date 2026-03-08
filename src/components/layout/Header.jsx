import { LogOut, User } from 'lucide-react'
import SavingIndicator from '../ui/SavingIndicator'
import { useAuth } from '../../context/AuthContext'

function Header({ title, saving }) {
    const { user, signOut } = useAuth();

    return (
        <header className="h-16 md:h-20 bg-white border-b border-gray-100 px-4 md:px-8 flex items-center justify-between sticky top-0 z-20">
            <div className="flex items-center gap-4 md:gap-6">
                <h2 className="text-xl md:text-2xl font-serif font-black text-gray-900 tracking-tight">{title}</h2>
                <SavingIndicator saving={saving} />
            </div>

            <div className="flex items-center gap-2 md:gap-4">
                <div className="flex items-center gap-3 px-2 md:px-4 py-1.5 md:py-2 bg-gray-50 rounded-2xl border border-gray-100">
                    <div className="w-7 h-7 md:w-8 md:h-8 rounded-xl bg-emerald-100 flex items-center justify-center text-emerald-600">
                        {user?.getImageUrl?.() ? (
                            <img src={user.getImageUrl()} alt="" className="w-full h-full rounded-xl object-cover" />
                        ) : (
                            <User size={18} />
                        )}
                    </div>
                    <div className="hidden md:flex flex-col">
                        <span className="text-xs font-black text-gray-900 leading-none">{user?.getName?.() || 'User'}</span>
                        <span className="text-[10px] font-bold text-gray-400 uppercase tracking-widest">{user?.getEmail?.() || 'Member'}</span>
                    </div>
                </div>

                <button
                    onClick={signOut}
                    className="w-10 h-10 flex items-center justify-center rounded-2xl text-gray-400 hover:text-rose-500 hover:bg-rose-50 transition-all border border-transparent hover:border-rose-100"
                    title="Sign Out"
                >
                    <LogOut size={20} />
                </button>
            </div>
        </header>
    );
}

export default Header;
