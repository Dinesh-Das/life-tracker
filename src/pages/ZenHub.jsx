import { motion } from 'framer-motion';
import { useAuth } from '../context/AuthContext';
import { useAppContext } from '../context/AppContext';
import {
    Sparkles,
    Calendar,
    Timer,
    BookOpen as JournalIcon,
    CheckSquare,
    TrendingUp,
    ArrowRight
} from 'lucide-react';
import { Link } from 'react-router-dom';
import Header from '../components/layout/Header';
const QUOTES = [
    { text: "The secret of getting ahead is getting started.", author: "Mark Twain" },
    { text: "Quality is not an act, it is a habit.", author: "Aristotle" },
    { text: "Well begun is half done.", author: "Aristotle" },
    { text: "Your future is created by what you do today, not tomorrow.", author: "Robert Kiyosaki" },
    { text: "Discipline is the bridge between goals and accomplishment.", author: "Jim Rohn" }
];

function ZenHub() {
    const { user } = useAuth();
    const { currentMonth, currentYear } = useAppContext();
    const quote = QUOTES[Math.floor(Math.random() * QUOTES.length)];

    const container = {
        hidden: { opacity: 0 },
        show: {
            opacity: 1,
            transition: {
                staggerChildren: 0.1
            }
        }
    };

    const item = {
        hidden: { opacity: 0, y: 20 },
        show: { opacity: 1, y: 0 }
    };

    return (
        <>
            <Header title="Zen Hub" />
            <motion.div
                variants={container}
                initial="hidden"
                animate="show"
                className="p-6 md:p-10 max-w-6xl mx-auto space-y-10 pb-24"
            >
                {/* Greeting Section */}
                <motion.section variants={item} className="space-y-2">
                    <h1 className="text-3xl md:text-5xl font-serif font-bold text-gray-900 leading-tight">
                        Good morning, <span className="text-emerald-600">{user?.firstName || 'Friend'}</span>.
                    </h1>
                    <p className="text-lg text-gray-500 font-medium">
                        Today is {new Date().toLocaleDateString('en-US', { weekday: 'long', month: 'long', day: 'numeric' })}.
                    </p>
                </motion.section>

                {/* Quote Card */}
                <motion.section variants={item}>
                    <div className="bg-gradient-to-br from-emerald-50 to-teal-50 p-8 rounded-3xl border border-emerald-100 shadow-sm relative overflow-hidden group">
                        <Sparkles className="absolute -right-4 -top-4 w-32 h-32 text-emerald-100 rotate-12 group-hover:rotate-45 transition-transform duration-700" />
                        <div className="relative z-10 space-y-4">
                            <p className="text-xl md:text-2xl font-serif italic text-emerald-900 leading-relaxed max-w-2xl">
                                "{quote.text}"
                            </p>
                            <p className="text-sm font-bold uppercase tracking-widest text-emerald-600">
                                — {quote.author}
                            </p>
                        </div>
                    </div>
                </motion.section>

                {/* Quick Actions Grid */}
                <motion.section variants={item} className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                    <HubCard
                        title="Daily Check-in"
                        description="Log your habits and mental state for today."
                        icon={CheckSquare}
                        to="/daily"
                        color="bg-emerald-500"
                        delay={0.1}
                    />
                    <HubCard
                        title="Planner"
                        description="View your weekly tasks and schedule."
                        icon={Calendar}
                        to="/planner"
                        color="bg-blue-500"
                        delay={0.2}
                    />
                    <HubCard
                        title="Analytics"
                        description="Visualize your progress and trends."
                        icon={TrendingUp}
                        to="/dashboard"
                        color="bg-amber-500"
                        delay={0.3}
                    />
                    <HubCard
                        title="Reflections"
                        description="Morning gratitude and evening reviews."
                        icon={JournalIcon}
                        to="/journal"
                        color="bg-rose-500"
                        delay={0.4}
                    />
                    <HubCard
                        title="Focus Mode"
                        description="Minimalist timer for deep work sessions."
                        icon={Timer}
                        to="/focus"
                        color="bg-indigo-500"
                        delay={0.5}
                    />
                </motion.section>

                {/* Stats Briefing */}
                <motion.section variants={item} className="bg-white p-8 rounded-3xl border border-gray-100 shadow-sm space-y-6">
                    <h3 className="text-xs font-black uppercase tracking-[0.2em] text-gray-400">Current Focus</h3>
                    <div className="flex items-center justify-between">
                        <div className="space-y-1">
                            <p className="text-2xl font-serif font-bold text-gray-800">{currentMonth} {currentYear}</p>
                            <p className="text-sm text-gray-500">Your journey for this month is underway.</p>
                        </div>
                        <Link to="/dashboard" className="flex items-center gap-2 text-emerald-600 font-bold text-sm hover:underline">
                            View Stats <ArrowRight size={16} />
                        </Link>
                    </div>
                </motion.section>
            </motion.div>
        </>
    );
}

function HubCard({ title, description, icon: Icon, to, color, delay }) {
    return (
        <Link to={to} className="group">
            <div className="bg-white p-6 rounded-3xl border border-gray-100 shadow-sm hover:shadow-md hover:border-emerald-100 transition-all duration-300 h-full flex flex-col justify-between">
                <div className="space-y-4">
                    <div className={`${color} w-12 h-12 rounded-2xl flex items-center justify-center text-white shadow-lg shadow-opacity-20`}>
                        <Icon size={24} />
                    </div>
                    <div className="space-y-1">
                        <h3 className="text-lg font-serif font-bold text-gray-800 group-hover:text-emerald-600 transition-colors">{title}</h3>
                        <p className="text-sm text-gray-500 leading-relaxed">{description}</p>
                    </div>
                </div>
            </div>
        </Link>
    );
}

export default ZenHub;
