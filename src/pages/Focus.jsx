import { motion } from 'framer-motion';
import { Flame, CalendarDays, Timer as TimerIcon } from 'lucide-react';
import FocusTimer from '../components/productivity/FocusTimer';
import Header from '../components/layout/Header';
import { useAuth } from '../context/AuthContext';
import { useFocusSessions } from '../hooks/useFocusSessions';
import LoadErrorState from '../components/ui/LoadErrorState';

const formatMinutes = (min) => (min >= 60 ? `${Math.floor(min / 60)}h ${min % 60}m` : `${min}m`);

function FocusPage() {
    const { spreadsheetId } = useAuth();
    const { todayMinutes, weekMinutes, totalSessions, error, logSession, reload } = useFocusSessions(spreadsheetId);

    const stats = [
        { label: 'Today', value: formatMinutes(todayMinutes), icon: TimerIcon },
        { label: 'This Week', value: formatMinutes(weekMinutes), icon: CalendarDays },
        { label: 'Sessions', value: totalSessions, icon: Flame },
    ];

    if (error) {
        return (
            <div className="flex-1 flex flex-col min-h-screen">
                <Header title="Focus Mode" />
                <LoadErrorState title="Focus history could not be loaded" error={error} onRetry={reload} />
            </div>
        );
    }

    return (
        <div className="flex-1 flex flex-col min-h-screen">
            <Header title="Focus Mode" />
            <motion.div 
                initial={{ opacity: 0, scale: 0.98 }}
                animate={{ opacity: 1, scale: 1 }}
                className="flex-1 flex flex-col items-center justify-center p-6 pb-32"
            >
                <div className="max-w-md w-full space-y-10">
                    <div className="text-center space-y-2">
                        <h2 className="text-2xl font-serif font-bold" style={{ color: 'var(--text-heading)' }}>Deep Work Session</h2>
                        <p className="text-sm" style={{ color: 'var(--text-muted)' }}>Eliminate distractions and find your flow.</p>
                    </div>

                    <FocusTimer onSessionComplete={logSession} />

                    {/* Focus stats — sessions persist to the FocusLogs sheet */}
                    <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '12px' }}>
                        {stats.map((s) => (
                            <div key={s.label} className="glass-card" style={{ padding: '16px 12px', textAlign: 'center' }}>
                                <s.icon size={16} style={{ color: 'var(--accent-strong)', marginBottom: '6px', display: 'inline-block' }} />
                                <p style={{ fontFamily: 'var(--font-display)', fontSize: '18px', fontWeight: 600, color: 'var(--text-heading)', margin: 0, lineHeight: 1.2 }}>
                                    {s.value}
                                </p>
                                <p style={{ fontFamily: 'var(--font-body)', fontSize: '9px', fontWeight: 700, letterSpacing: '0.08em', textTransform: 'uppercase', color: 'var(--text-muted)', margin: '4px 0 0' }}>
                                    {s.label}
                                </p>
                            </div>
                        ))}
                    </div>
                </div>
            </motion.div>
        </div>
    );
}

export default FocusPage;
