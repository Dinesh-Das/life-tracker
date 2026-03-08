import { useAuth } from '../context/AuthContext'
import { Calendar, CheckSquare, BarChart3 } from 'lucide-react'

function Login() {
    const { signIn } = useAuth();

    return (
        <div className="min-h-screen flex flex-col items-center justify-center bg-gradient-to-br from-[#0D1117] to-[#1B2A1C] text-white p-4">
            <div className="max-w-md w-full text-center space-y-8 animate-in fade-in zoom-in duration-700">
                {/* Logo & Header */}
                <div className="space-y-2">
                    <div className="text-6xl animate-bounce">🎮</div>
                    <h1 className="text-5xl font-serif font-bold tracking-tight">LifeTracker</h1>
                    <p className="text-xl text-gray-400 font-sans italic">Turn your life into a game</p>
                </div>

                {/* Auth Button */}
                <div className="pt-8">
                    <button
                        onClick={signIn}
                        className="flex items-center justify-center space-x-3 w-full bg-white text-black py-4 px-6 rounded-full font-bold text-lg hover:bg-gray-100 transform hover:scale-[1.02] active:scale-[0.98] transition-all shadow-xl"
                    >
                        <img src="https://www.gstatic.com/firebasejs/ui/2.0.0/images/auth/google.svg" alt="Google" className="w-6 h-6" />
                        <span>Continue with Google</span>
                    </button>
                </div>

                {/* Feature Pills */}
                <div className="flex flex-wrap justify-center gap-3 pt-8">
                    <div className="flex items-center space-x-2 bg-white/10 px-4 py-2 rounded-full backdrop-blur-md border border-white/5">
                        <Calendar size={16} className="text-primary-light" />
                        <span className="text-xs font-semibold">Monthly Tracker</span>
                    </div>
                    <div className="flex items-center space-x-2 bg-white/10 px-4 py-2 rounded-full backdrop-blur-md border border-white/5">
                        <CheckSquare size={16} className="text-primary-light" />
                        <span className="text-xs font-semibold">Weekly Planner</span>
                    </div>
                    <div className="flex items-center space-x-2 bg-white/10 px-4 py-2 rounded-full backdrop-blur-md border border-white/5">
                        <BarChart3 size={16} className="text-primary-light" />
                        <span className="text-xs font-semibold">Dashboard</span>
                    </div>
                </div>

                {/* Footer info */}
                <p className="text-gray-500 text-xs pt-12">
                    Your data lives in your own Google Sheet. Transparent. Private. Yours.
                </p>
            </div>
        </div>
    );
}

export default Login;
