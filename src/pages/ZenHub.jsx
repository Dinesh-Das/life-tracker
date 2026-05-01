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

const QUOTES = [
    { text: "The secret of getting ahead is getting started.", author: "Mark Twain" },
    { text: "Quality is not an act, it is a habit.", author: "Aristotle" },
    { text: "Well begun is half done.", author: "Aristotle" },
    { text: "Your future is created by what you do today, not tomorrow.", author: "Robert Kiyosaki" },
    { text: "Discipline is the bridge between goals and accomplishment.", author: "Jim Rohn" },
];

const hubCards = [
    { title: "Daily Check-in",   desc: "Log your habits and mental state for today.",     icon: CheckSquare, to: "/daily",    delay: 0.1 },
    { title: "Planner",          desc: "View your weekly tasks and schedule.",              icon: Calendar,    to: "/planner",  delay: 0.2 },
    { title: "Analytics",        desc: "Visualize your progress and trends.",              icon: TrendingUp,  to: "/dashboard",delay: 0.3 },
    { title: "Reflections",      desc: "Morning gratitude and evening reviews.",           icon: JournalIcon, to: "/journal",  delay: 0.4 },
    { title: "Focus Mode",       desc: "Minimalist timer for deep work sessions.",         icon: Timer,       to: "/focus",    delay: 0.5 },
];

function ZenHub() {
    const { user } = useAuth();
    const { currentMonth, currentYear } = useAppContext();
    const quote = QUOTES[Math.floor(Math.random() * QUOTES.length)];
    const firstName = user?.getName?.()?.split(' ')[0] || user?.firstName || 'Friend';

    const todayStr = new Date().toLocaleDateString('en-US', {
        weekday: 'long', month: 'long', day: 'numeric',
    });

    const container = {
        hidden: { opacity: 0 },
        show: { opacity: 1, transition: { staggerChildren: 0.08 } },
    };
    const item = {
        hidden: { opacity: 0, y: 18 },
        show: { opacity: 1, y: 0 },
    };

    return (
        <motion.div
            variants={container}
            initial="hidden"
            animate="show"
            style={{ padding: '36px 40px', width: '100%' }}
        >
            {/* Page title */}
            <motion.div variants={item} style={{ marginBottom: '32px' }}>
                <h1 style={{
                    fontFamily: 'var(--font-display)',
                    fontSize: '46px',
                    fontWeight: 600,
                    color: 'var(--text-heading)',
                    letterSpacing: '-0.02em',
                    lineHeight: 1.1,
                    marginBottom: '6px',
                }}>
                    Good morning, <span style={{ color: '#2d4f41' }}>{firstName}</span>.
                </h1>
                <p style={{ fontFamily: 'var(--font-body)', fontSize: '15px', color: 'var(--text-muted)' }}>
                    {todayStr}
                </p>
            </motion.div>

            {/* Quote card */}
            <motion.div variants={item} className="glass-card" style={{ padding: '28px 32px', marginBottom: '28px', position: 'relative', overflow: 'hidden' }}>
                <Sparkles
                    style={{ position: 'absolute', right: '-8px', top: '-8px', width: '80px', height: '80px', color: 'rgba(45,79,65,0.15)', transform: 'rotate(12deg)' }}
                />
                <p style={{
                    fontFamily: 'var(--font-display)',
                    fontSize: '20px',
                    fontStyle: 'italic',
                    color: 'var(--text-heading)',
                    lineHeight: 1.5,
                    marginBottom: '12px',
                    position: 'relative', zIndex: 1,
                }}>
                    &quot;{quote.text}&quot;
                </p>
                <p style={{
                    fontFamily: 'var(--font-body)',
                    fontSize: '11px',
                    fontWeight: 700,
                    letterSpacing: '0.08em',
                    textTransform: 'uppercase',
                    color: 'var(--text-muted)',
                    position: 'relative', zIndex: 1,
                }}>
                    — {quote.author}
                </p>
            </motion.div>

            {/* Quick action cards */}
            <motion.div
                variants={item}
                style={{
                    display: 'grid',
                    gridTemplateColumns: 'repeat(auto-fill, minmax(200px, 1fr))',
                    gap: '16px',
                    marginBottom: '28px',
                }}
            >
                {hubCards.map(({ title, desc, icon: Icon, to }) => (
                    <Link
                        key={to}
                        to={to}
                        style={{ textDecoration: 'none' }}
                    >
                        <motion.div
                            className="glass-card"
                            whileHover={{ scale: 1.02, boxShadow: '0 8px 32px rgba(0,0,0,0.12)' }}
                            whileTap={{ scale: 0.98 }}
                            style={{ padding: '20px 20px 18px', height: '100%', cursor: 'pointer' }}
                        >
                            <div style={{
                                width: '40px', height: '40px', borderRadius: '10px',
                                background: 'rgba(45,79,65,0.65)',
                                display: 'flex', alignItems: 'center', justifyContent: 'center',
                                marginBottom: '14px',
                            }}>
                                <Icon size={20} color="#a9cfbc" />
                            </div>
                            <h3 style={{
                                fontFamily: 'var(--font-display)',
                                fontSize: '18px',
                                fontWeight: 600,
                                color: 'var(--text-heading)',
                                marginBottom: '6px',
                                lineHeight: 1.2,
                            }}>
                                {title}
                            </h3>
                            <p style={{
                                fontFamily: 'var(--font-body)',
                                fontSize: '13px',
                                color: 'var(--text-muted)',
                                lineHeight: 1.5,
                            }}>
                                {desc}
                            </p>
                        </motion.div>
                    </Link>
                ))}
            </motion.div>

            {/* Current focus card */}
            <motion.div variants={item} className="glass-card" style={{ padding: '24px 28px' }}>
                <p style={{ fontFamily: 'var(--font-body)', fontSize: '10px', fontWeight: 700, letterSpacing: '0.12em', textTransform: 'uppercase', color: 'var(--text-muted)', marginBottom: '10px' }}>
                    Current Focus
                </p>
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                    <div>
                        <p style={{ fontFamily: 'var(--font-display)', fontSize: '24px', fontWeight: 600, color: 'var(--text-heading)', lineHeight: 1.1 }}>
                            {currentMonth} {currentYear}
                        </p>
                        <p style={{ fontFamily: 'var(--font-body)', fontSize: '13px', color: 'var(--text-muted)', marginTop: '4px' }}>
                            Your journey for this month is underway.
                        </p>
                    </div>
                    <Link
                        to="/dashboard"
                        style={{
                            display: 'flex', alignItems: 'center', gap: '6px',
                            fontFamily: 'var(--font-body)',
                            fontSize: '13px', fontWeight: 600,
                            color: 'var(--text-heading)',
                            textDecoration: 'none',
                            padding: '8px 16px',
                            borderRadius: 'var(--radius-full)',
                            border: '1px solid rgba(45,79,65,0.4)',
                            background: 'rgba(45,79,65,0.15)',
                            transition: 'background 0.2s',
                        }}
                    >
                        View Stats <ArrowRight size={14} />
                    </Link>
                </div>
            </motion.div>
        </motion.div>
    );
}

export default ZenHub;
