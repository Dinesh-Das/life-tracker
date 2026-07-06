import { useState } from 'react';
import Header from '../components/layout/Header';
import { useAuth } from '../context/AuthContext';
import { useAppContext } from '../context/AppContext';
import { useDashboard } from '../hooks/useDashboard';
import { exportAllData } from '../lib/exportData';
import { Trophy, Flame, CheckCircle2, Zap, Star, Download } from 'lucide-react';
import toast from 'react-hot-toast';

const exportBtnStyle = {
    display: 'flex', alignItems: 'center', gap: '8px',
    fontFamily: 'var(--font-body)', fontSize: '11px', fontWeight: 700,
    letterSpacing: '0.06em', textTransform: 'uppercase',
    padding: '10px 18px', borderRadius: '9999px', border: 'none', cursor: 'pointer',
    background: 'rgba(45,79,65,0.7)', color: '#a9cfbc',
};

function Wrapped() {
    const { spreadsheetId } = useAuth();
    const { currentYear } = useAppContext();
    const { stats, habits, loading } = useDashboard(spreadsheetId, currentYear);
    const [exporting, setExporting] = useState(false);

    const topHabit = [...habits].sort((a, b) => (b.pct || 0) - (a.pct || 0))[0];

    const handleExport = async (fmt) => {
        setExporting(true);
        try {
            await exportAllData(spreadsheetId, fmt);
            toast.success('Export downloaded');
        } catch (e) {
            console.error('Export failed', e);
            toast.error('Export failed');
        } finally {
            setExporting(false);
        }
    };

    const cards = [
        { label: 'Habits Completed', value: stats.totalCompleted, icon: CheckCircle2 },
        { label: 'Best Streak', value: `${stats.bestStreak} days`, icon: Flame },
        { label: 'Best Month', value: `${stats.bestMonth.name} (${stats.bestMonth.pct}%)`, icon: Trophy },
        { label: 'Active Months', value: `${stats.activeMonths} / 12`, icon: Zap },
        { label: 'Top Habit', value: topHabit ? `${topHabit.name} (${topHabit.pct}%)` : '–', icon: Star },
    ];

    return (
        <>
            <Header title={`${currentYear} Wrapped`} subtitle="Your year of consistency, celebrated" />
            <div className="w-full px-4 pt-2 pb-10 sm:px-10">
                {loading ? (
                    <p style={{ fontFamily: 'var(--font-body)', fontSize: '14px', color: 'var(--text-muted)', padding: '40px 0', textAlign: 'center' }}>
                        Crunching your year…
                    </p>
                ) : (
                    <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))', gap: '14px', marginBottom: '28px' }} className="animate-fade-up">
                        {cards.map((card) => (
                            <div key={card.label} className="glass-card" style={{ padding: '26px 24px', textAlign: 'center' }}>
                                <card.icon size={26} style={{ color: '#4a7a62', marginBottom: '10px', display: 'inline-block' }} />
                                <p style={{ fontFamily: 'var(--font-display)', fontSize: '24px', fontWeight: 600, color: 'var(--text-heading)', marginBottom: '4px', lineHeight: 1.2 }}>
                                    {card.value}
                                </p>
                                <p style={{ fontFamily: 'var(--font-body)', fontSize: '10px', fontWeight: 700, letterSpacing: '0.1em', textTransform: 'uppercase', color: 'var(--text-muted)' }}>
                                    {card.label}
                                </p>
                            </div>
                        ))}
                    </div>
                )}

                <div className="glass-card" style={{ padding: '22px 24px', display: 'flex', alignItems: 'center', gap: '14px', flexWrap: 'wrap' }}>
                    <div style={{ flex: 1, minWidth: '200px' }}>
                        <h3 style={{ fontFamily: 'var(--font-display)', fontSize: '18px', fontWeight: 600, color: 'var(--text-heading)', marginBottom: '4px' }}>
                            Your data, yours to keep
                        </h3>
                        <p style={{ fontFamily: 'var(--font-body)', fontSize: '12px', color: 'var(--text-muted)' }}>
                            Download everything from your LifeTracker sheet.
                        </p>
                    </div>
                    <button style={exportBtnStyle} disabled={exporting} onClick={() => handleExport('json')}>
                        <Download size={14} /> JSON
                    </button>
                    <button style={exportBtnStyle} disabled={exporting} onClick={() => handleExport('csv')}>
                        <Download size={14} /> CSV
                    </button>
                </div>
            </div>
        </>
    );
}

export default Wrapped;