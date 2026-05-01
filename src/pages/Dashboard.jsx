import Header from '../components/layout/Header'
import YearlyLineChart from '../components/charts/YearlyLineChart'
import LoadingSkeleton from '../components/ui/LoadingSkeleton'
import HabitHeatmap from '../components/charts/HabitHeatmap'
import CategoryPie from '../components/charts/CategoryPie'
import YearlyRing from '../components/charts/YearlyRing'
import StreakBarChart from '../components/charts/StreakBarChart'
import { useDashboard } from '../hooks/useDashboard'
import { useYearlyHistory } from '../hooks/useYearlyHistory'
import { useAuth } from '../context/AuthContext'
import { useAppContext } from '../context/AppContext'
import { Trophy, Flame, Zap, HeartPulse, ActivitySquare, CalendarHeart, Sparkles } from 'lucide-react'
import { CheckCircle2 } from 'lucide-react'
import { format } from 'date-fns'

import { useCycleContext } from '../context/CycleContext'
import SmartInsights from '../components/charts/SmartInsights'

function Dashboard() {
    const { spreadsheetId, userGender } = useAuth();
    const { currentYear, hideFemaleData } = useAppContext();
    const { stats, yearlyTrend, habits, streaks, loading: dashLoading } = useDashboard(spreadsheetId, currentYear);
    const { heatmapData, loading: heatLoading } = useYearlyHistory(spreadsheetId, currentYear);
    const cycleData = useCycleContext();

    const loading = dashLoading || heatLoading;


    const statCards = [
        { label: 'Total Completed', value: stats.totalCompleted, icon: CheckCircle2, color: 'text-emerald-600', bg: 'bg-emerald-50' },
        { label: 'Best Month', value: `${stats.bestMonth.name} (${stats.bestMonth.pct}%)`, icon: Trophy, color: 'text-amber-600', bg: 'bg-amber-50' },
        { label: 'Best Streak', value: `${stats.bestStreak} Days`, icon: Flame, color: 'text-orange-600', bg: 'bg-orange-50' },
        { label: 'Active Months', value: `${stats.activeMonths} / 12`, icon: Zap, color: 'text-blue-600', bg: 'bg-blue-50' },
    ];

    const showCycleStats = userGender === 'female' && !hideFemaleData;
    const cycleCards = [
        { label: 'Cycle Day', value: cycleData.currentCycleDay ? `Day ${cycleData.currentCycleDay}` : '?', icon: ActivitySquare, color: 'text-rose-600', bg: 'bg-rose-50' },
        { label: 'Avg Length', value: `${cycleData.avgCycleLength} d`, icon: HeartPulse, color: 'text-pink-600', bg: 'bg-pink-50' },
        { label: 'Next Period', value: cycleData.nextPeriod ? format(cycleData.nextPeriod, 'MMM d') : '?', icon: CalendarHeart, color: 'text-purple-600', bg: 'bg-purple-50' },
    ];

    if (loading) {
        return (
            <div className="flex-1 flex flex-col">
                <Header title="Analytics" subtitle={`Your ${currentYear} in review`} />
                <div style={{ padding: '24px 40px', width: '100%' }}>
                    <LoadingSkeleton type="page" />
                </div>
            </div>
        );
    }

    return (
        <>
            <Header title="Analytics" subtitle={`Your ${currentYear} in review`} />

            <div style={{ padding: '8px 40px 40px', width: '100%' }}>

                {/* AI Insights Section */}
                <div style={{ marginBottom: '24px' }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '12px' }}>
                        <Sparkles style={{ color: '#4a7a62', width: '16px', height: '16px' }} />
                        <span style={{ fontFamily: 'var(--font-body)', fontSize: '10px', fontWeight: 700, letterSpacing: '0.12em', textTransform: 'uppercase', color: 'var(--text-muted)' }}>
                            Smart Insights
                        </span>
                    </div>
                    <SmartInsights habits={habits} stats={stats} yearlyTrend={yearlyTrend} />
                </div>

                {/* Stat Cards */}
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(200px, 1fr))', gap: '14px', marginBottom: '24px' }}>
                    {statCards.map((card) => (
                        <div key={card.label} className="glass-card" style={{ padding: '20px 22px', display: 'flex', alignItems: 'center', gap: '14px', cursor: 'default', transition: 'transform 0.2s' }}
                            onMouseEnter={e => e.currentTarget.style.transform = 'scale(1.02)'}
                            onMouseLeave={e => e.currentTarget.style.transform = 'scale(1)'}
                        >
                            <div style={{ padding: '10px', borderRadius: '10px', background: 'rgba(45,79,65,0.5)', color: '#a9cfbc', flexShrink: 0 }}>
                                <card.icon size={20} />
                            </div>
                            <div>
                                <p style={{ fontFamily: 'var(--font-body)', fontSize: '10px', fontWeight: 700, letterSpacing: '0.1em', textTransform: 'uppercase', color: 'var(--text-muted)', marginBottom: '3px' }}>{card.label}</p>
                                <p style={{ fontFamily: 'var(--font-display)', fontSize: '18px', fontWeight: 600, color: 'var(--text-heading)', lineHeight: 1.1 }}>{card.value}</p>
                            </div>
                        </div>
                    ))}
                </div>

                {/* Female Stats Section */}
                {showCycleStats && (
                    <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(180px, 1fr))', gap: '14px', marginBottom: '24px' }} className="animate-fade-up">
                        {cycleCards.map((card) => (
                            <div key={card.label} className="glass-card" style={{ padding: '18px 20px', display: 'flex', alignItems: 'center', gap: '14px' }}>
                                <div style={{ padding: '10px', borderRadius: '10px', background: 'rgba(180,60,100,0.45)', color: '#f0a0b8', flexShrink: 0 }}>
                                    <card.icon size={20} />
                                </div>
                                <div>
                                    <p style={{ fontFamily: 'var(--font-body)', fontSize: '10px', fontWeight: 700, letterSpacing: '0.1em', textTransform: 'uppercase', color: 'var(--text-muted)', marginBottom: '3px' }}>{card.label}</p>
                                    <p style={{ fontFamily: 'var(--font-display)', fontSize: '18px', fontWeight: 600, color: 'var(--text-heading)', lineHeight: 1.1 }}>{card.value}</p>
                                </div>
                            </div>
                        ))}
                    </div>
                )}

                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '16px', marginBottom: '24px' }}>
                    <YearlyRing months={yearlyTrend} year={currentYear} />
                    <CategoryPie data={habits} />
                    <StreakBarChart habits={habits} streaks={streaks} />
                </div>

                {/* Yearly Chart */}
                <YearlyLineChart data={yearlyTrend} />

                {/* Habit Heatmap */}
                <div className="glass-card" style={{ padding: '24px 28px', marginTop: '24px' }}>
                    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '20px' }}>
                        <h3 style={{ fontFamily: 'var(--font-display)', fontSize: '18px', fontWeight: 600, color: 'var(--text-heading)' }}>Yearly Habit Heatmap</h3>
                        <span style={{ fontFamily: 'var(--font-body)', fontSize: '10px', fontWeight: 700, color: '#4a7a62', background: 'rgba(45,79,65,0.2)', padding: '4px 10px', borderRadius: '20px' }} className="md:hidden">Slide to view →</span>
                    </div>
                    <div className="overflow-x-auto pb-4 scrollbar-thin">
                        <div style={{ minWidth: '800px' }}>
                            <HabitHeatmap data={heatmapData} year={currentYear} />
                        </div>
                    </div>
                </div>
            </div>
        </>
    );
}

export default Dashboard;
