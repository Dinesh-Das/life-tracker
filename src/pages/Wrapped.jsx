import { useState } from 'react';
import Header from '../components/layout/Header';
import { useAuth } from '../context/AuthContext';
import { useAppContext } from '../context/AppContext';
import { useDashboard } from '../hooks/useDashboard';
import { useWrappedComparison } from '../hooks/useWrappedComparison';
import { useYearlyHistory } from '../hooks/useYearlyHistory';
import HabitHeatmap from '../components/charts/HabitHeatmap';
import { compareYearSummaries } from '../lib/wrappedComparison';
import { shareWrappedCard } from '../lib/wrappedShareCard';
import { exportAllData } from '../lib/exportData';
import { Trophy, Flame, CheckCircle2, Zap, Star, Download, ArrowLeftRight, Share2 } from 'lucide-react';
import toast from 'react-hot-toast';

const exportBtnStyle = {
    display: 'flex', alignItems: 'center', gap: '8px',
    fontFamily: 'var(--font-body)', fontSize: '11px', fontWeight: 700,
    letterSpacing: '0.06em', textTransform: 'uppercase',
    padding: '10px 18px', borderRadius: '9999px', border: 'none', cursor: 'pointer',
    background: 'rgba(45,79,65,0.7)', color: '#a9cfbc',
};

const chipStyle = (active) => ({
    fontFamily: 'var(--font-body)', fontSize: '11px', fontWeight: 700,
    letterSpacing: '0.06em', textTransform: 'uppercase',
    padding: '6px 14px', borderRadius: '9999px', border: 'none', cursor: 'pointer',
    background: active ? 'rgba(45,79,65,0.7)' : 'var(--divider)',
    color: active ? '#a9cfbc' : 'var(--text-muted)',
});

const compareGridStyle = {
    display: 'grid', gridTemplateColumns: 'minmax(110px, 1.4fr) 1fr 0.9fr 1fr',
    gap: '12px', alignItems: 'center',
};

const cellLabelStyle = {
    fontFamily: 'var(--font-body)', fontSize: '10px', fontWeight: 700,
    letterSpacing: '0.1em', textTransform: 'uppercase', color: 'var(--text-muted)',
};

const cellValueStyle = {
    fontFamily: 'var(--font-display)', fontSize: '16px', fontWeight: 600,
    color: 'var(--text-heading)', lineHeight: 1.2,
};

/** Signed change indicator: green ▲ up, red ▼ down, dash for no change. */
function DeltaBadge({ value, unit = '' }) {
    if (!value) {
        return <span style={{ fontFamily: 'var(--font-body)', fontSize: '11px', fontWeight: 700, color: 'var(--text-muted)' }}>—</span>;
    }
    const up = value > 0;
    return (
        <span style={{ fontFamily: 'var(--font-body)', fontSize: '11px', fontWeight: 700, color: up ? 'var(--positive)' : 'var(--negative)' }}>
            {up ? '▲' : '▼'} {Math.abs(value)}{unit}
        </span>
    );
}

function Wrapped() {
    const { spreadsheetId } = useAuth();
    const { currentYear } = useAppContext();
    const { stats, habits, loading } = useDashboard(spreadsheetId, currentYear);
    const { summaries, loading: cmpLoading } = useWrappedComparison(spreadsheetId);
    const { heatmapData, loading: heatLoading } = useYearlyHistory(spreadsheetId, currentYear);
    const [exporting, setExporting] = useState(false);
    const [sharing, setSharing] = useState(false);
    const [vsYear, setVsYear] = useState(null);

    const topHabit = [...habits].sort((a, b) => (b.pct || 0) - (a.pct || 0))[0];
    
     // Multi-year comparison: the viewed year vs any other year with data.
    // Streaks are excluded — the Streaks tab is lifetime, not per-year.
    const otherYears = summaries.map(s => s.year).filter(y => y !== currentYear);
    const effectiveVsYear = vsYear !== null && otherYears.includes(vsYear) ? vsYear : otherYears[0];
    const current = summaries.find(s => s.year === currentYear);
    const other = summaries.find(s => s.year === effectiveVsYear);
    const delta = compareYearSummaries(current, other);

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

    const handleShareCard = async () => {
        setSharing(true);
        try {
            const result = await shareWrappedCard({
                year: currentYear,
                stats,
                topHabitLabel: topHabit ? `${topHabit.name} (${topHabit.pct}%)` : null,
                comparison: (other && delta) ? { vsYear: effectiveVsYear, totalDelta: delta.totalCompleted } : null,
            });
            if (result === 'downloaded') toast.success('Wrapped card saved 🌿');
        } catch (e) {
            console.error('Share card failed', e);
            toast.error('Could not create the card');
        } finally {
            setSharing(false);
        }
    };

    const cards = [
        { label: 'Habits Completed', value: stats.totalCompleted, icon: CheckCircle2 },
        { label: 'Best Streak', value: `${stats.bestStreak} days`, icon: Flame },
        { label: 'Best Month', value: `${stats.bestMonth.name} (${stats.bestMonth.pct}%)`, icon: Trophy },
        { label: 'Active Months', value: `${stats.activeMonths} / 12`, icon: Zap },
        { label: 'Top Habit', value: topHabit ? `${topHabit.name} (${topHabit.pct}%)` : '–', icon: Star },
    ];

    const compareRows = (current && other && delta) ? [
        { label: 'Habits Completed', a: current.totalCompleted, b: other.totalCompleted, d: delta.totalCompleted, unit: '' },
        { label: 'Completion Rate', a: `${current.completionPct}%`, b: `${other.completionPct}%`, d: delta.completionPct, unit: ' pts' },
        { label: 'Best Month', a: `${current.bestMonth.name} (${current.bestMonth.pct}%)`, b: `${other.bestMonth.name} (${other.bestMonth.pct}%)`, d: delta.bestMonthPct, unit: ' pts' },
        { label: 'Active Months', a: `${current.activeMonths} / 12`, b: `${other.activeMonths} / 12`, d: delta.activeMonths, unit: '' },
    ] : [];

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
                                <card.icon size={26} style={{ color: 'var(--accent-ink)', marginBottom: '10px', display: 'inline-block' }} />
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

{/* Shareable Wrapped card — rendered on-device as a PNG */}
                <div className="glass-card animate-fade-up" style={{ padding: '18px 24px', display: 'flex', alignItems: 'center', gap: '14px', flexWrap: 'wrap', marginBottom: '28px' }}>
                    <div style={{ flex: 1, minWidth: '200px' }}>
                        <h3 style={{ fontFamily: 'var(--font-display)', fontSize: '18px', fontWeight: 600, color: 'var(--text-heading)', marginBottom: '4px' }}>
                            Share your {currentYear}
                        </h3>
                        <p style={{ fontFamily: 'var(--font-body)', fontSize: '12px', color: 'var(--text-muted)' }}>
                            A snapshot card of your year — nothing leaves your browser unless you share it.
                        </p>
                    </div>
                    <button style={exportBtnStyle} disabled={sharing || loading} onClick={handleShareCard}>
                        <Share2 size={14} /> Share card
                    </button>
                </div>

                {!cmpLoading && compareRows.length > 0 && (
                    <div className="glass-card animate-fade-up" style={{ padding: '26px 24px', marginBottom: '28px' }}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '10px', flexWrap: 'wrap', marginBottom: '18px' }}>
                            <ArrowLeftRight size={18} style={{ color: 'var(--accent-ink)' }} />
                            <h3 style={{ fontFamily: 'var(--font-display)', fontSize: '18px', fontWeight: 600, color: 'var(--text-heading)', flex: 1, minWidth: '140px' }}>
                                {currentYear} vs {effectiveVsYear}
                            </h3>
                            {otherYears.length > 1 && (
                                <div style={{ display: 'flex', gap: '6px', flexWrap: 'wrap' }}>
                                    {otherYears.map(y => (
                                        <button key={y} style={chipStyle(y === effectiveVsYear)} onClick={() => setVsYear(y)}>
                                            vs {y}
                                        </button>
                                    ))}
                                </div>
                            )}
                        </div>

                        <div style={compareGridStyle}>
                            <span />
                            <span style={cellLabelStyle}>{currentYear}</span>
                            <span style={cellLabelStyle}>Change</span>
                            <span style={cellLabelStyle}>{effectiveVsYear}</span>
                        </div>
                        {compareRows.map(row => (
                            <div key={row.label} style={{ ...compareGridStyle, padding: '10px 0', borderTop: '1px solid var(--divider)', marginTop: '8px' }}>
                                <span style={cellLabelStyle}>{row.label}</span>
                                <span style={cellValueStyle}>{row.a}</span>
                                <DeltaBadge value={row.d} unit={row.unit} />
                                <span style={{ ...cellValueStyle, color: 'var(--text-muted)' }}>{row.b}</span>
                            </div>
                        ))}

                        <div style={{ marginTop: '22px' }}>
                            <p style={{ ...cellLabelStyle, marginBottom: '10px' }}>Monthly completion, side by side</p>
                            <div style={{ display: 'flex', gap: '6px', alignItems: 'flex-end' }}>
                                {current.monthlyPcts.map((m, i) => (
                                    <div key={m.name} style={{ flex: 1, display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '6px' }}>
                                        <div style={{ display: 'flex', gap: '2px', alignItems: 'flex-end', height: '48px' }}>
                                            <div
                                                title={`${currentYear} ${m.name}: ${m.pct}%`}
                                                style={{ width: '6px', height: `${Math.max(m.pct, 3)}%`, background: 'var(--accent-ink)', borderRadius: '2px' }}
                                            />
                                            <div
                                                title={`${effectiveVsYear} ${m.name}: ${other.monthlyPcts[i].pct}%`}
                                                style={{ width: '6px', height: `${Math.max(other.monthlyPcts[i].pct, 3)}%`, background: 'var(--accent-soft)', borderRadius: '2px' }}
                                            />
                                        </div>
                                        <span style={{ fontFamily: 'var(--font-body)', fontSize: '8px', fontWeight: 700, letterSpacing: '0.05em', textTransform: 'uppercase', color: 'var(--text-muted)' }}>
                                            {m.name}
                                        </span>
                                    </div>
                                ))}
                            </div>
                            <div style={{ display: 'flex', gap: '16px', marginTop: '10px' }}>
                                <span style={{ ...cellLabelStyle, display: 'flex', alignItems: 'center', gap: '6px' }}>
                                    <span style={{ width: '8px', height: '8px', borderRadius: '2px', background: 'var(--accent-ink)', display: 'inline-block' }} /> {currentYear}
                                </span>
                                <span style={{ ...cellLabelStyle, display: 'flex', alignItems: 'center', gap: '6px' }}>
                                    <span style={{ width: '8px', height: '8px', borderRadius: '2px', background: 'var(--accent-soft)', display: 'inline-block' }} /> {effectiveVsYear}
                                </span>
                            </div>
                        </div>
                    </div>
                )}

                {!cmpLoading && summaries.length === 1 && (
                    <p style={{ fontFamily: 'var(--font-body)', fontSize: '12px', color: 'var(--text-muted)', marginBottom: '28px' }}>
                        Year-over-year comparison unlocks once you have habit data in more than one year.
                    </p>
                )}

                {/* Yearly heatmap — every day of the year at a glance */}
                {!heatLoading && heatmapData.length > 0 && (
                    <div className="animate-fade-up" style={{ marginBottom: '28px' }}>
                        <HabitHeatmap data={heatmapData} year={currentYear} />
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