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
import { Trophy, Flame, Zap, HeartPulse, ActivitySquare, CalendarHeart } from 'lucide-react'
import { CheckCircle2 } from 'lucide-react'
import { format } from 'date-fns'
import { useCycleContext } from '../context/CycleContext'

function Dashboard() {
    const { spreadsheetId, userGender } = useAuth();
    const { currentYear, hideFemaleData } = useAppContext();
    const { stats, yearlyTrend, habits, streaks, loading: dashLoading } = useDashboard(spreadsheetId);
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
                <Header title="Yearly Dashboard" />
                <LoadingSkeleton type="page" />
            </div>
        );
    }

    return (
        <>
            <Header title="Yearly Dashboard" />

            <div className="p-4 md:p-6 lg:p-8 space-y-8 overflow-y-auto pb-24">
                {/* Stat Cards */}
                <div className="grid grid-cols-2 md:grid-cols-2 lg:grid-cols-4 gap-4 md:gap-6">
                    {statCards.map((card) => (
                        <div key={card.label} className="bg-white p-4 md:p-6 rounded-2xl border border-gray-100 shadow-sm flex flex-col md:flex-row items-center md:items-start text-center md:text-left gap-3 md:gap-4 hover:scale-[1.02] transition-transform cursor-default">
                            <div className={`p-2.5 md:p-3 rounded-xl ${card.bg} ${card.color}`}>
                                <card.icon size={20} className="md:w-6 md:h-6" />
                            </div>
                            <div>
                                <p className="text-[9px] md:text-[10px] font-black uppercase text-gray-400 tracking-widest">{card.label}</p>
                                <p className="text-lg md:text-xl font-serif font-black text-gray-800 leading-tight">{card.value}</p>
                            </div>
                        </div>
                    ))}
                </div>

                {/* Female Stats Section */}
                {showCycleStats && (
                    <div className="grid grid-cols-1 md:grid-cols-3 gap-4 md:gap-6 animate-fade-up">
                        {cycleCards.map((card) => (
                            <div key={card.label} className="bg-white p-4 md:p-5 rounded-2xl border border-gray-100 shadow-sm flex items-center space-x-4 hover:scale-[1.02] transition-transform cursor-default">
                                <div className={`p-3 rounded-xl ${card.bg} ${card.color}`}>
                                    <card.icon size={22} />
                                </div>
                                <div>
                                    <p className="text-[10px] font-black uppercase text-gray-400 tracking-widest">{card.label}</p>
                                    <p className="text-xl font-serif font-black text-gray-800">{card.value}</p>
                                </div>
                            </div>
                        ))}
                    </div>
                )}

                <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
                    {/* Yearly Ring (Column 1) */}
                    <YearlyRing months={yearlyTrend} />

                    {/* Category Pie (Column 2) */}
                    <CategoryPie data={habits} />

                    {/* Streak Bar (Column 3) */}
                    <StreakBarChart habits={habits} streaks={streaks} />
                </div>

                {/* Yearly Chart */}
                <YearlyLineChart data={yearlyTrend} />

                {/* Habit Heatmap with Horizontal Scroll */}
                <div className="bg-white p-6 rounded-3xl border border-gray-100 shadow-sm space-y-6">
                    <div className="flex items-center justify-between">
                        <h3 className="text-sm font-black uppercase text-gray-400 tracking-widest">Yearly Habit Heatmap</h3>
                        <span className="text-[10px] font-bold text-emerald-600 bg-emerald-50 px-2 py-1 rounded-md md:hidden">Slide to view →</span>
                    </div>
                    <div className="overflow-x-auto pb-4 scrollbar-thin">
                        <div className="min-w-[800px]">
                            <HabitHeatmap data={heatmapData} year={currentYear} />
                        </div>
                    </div>
                </div>
            </div>
        </>
    );
}

export default Dashboard;
