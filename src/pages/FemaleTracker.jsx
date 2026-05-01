import React, { useState } from 'react'
import Header from '../components/layout/Header'
import CycleWheel from '../components/female/CycleWheel'
import FlowLogger from '../components/female/FlowLogger'
import MoodPicker from '../components/female/MoodPicker'
import CrampsPicker from '../components/female/CrampsPicker'
import SymptomGrid from '../components/female/SymptomGrid'
import EnergySlider from '../components/female/EnergySlider'
import CycleCharts from '../components/female/CycleCharts'
import FlowCalendar from '../components/female/FlowCalendar'
import PhaseInfoCard from '../components/female/PhaseInfoCard'
import LoadingSkeleton from '../components/ui/LoadingSkeleton'
import { useCycleContext } from '../context/CycleContext'

import { useAppContext } from '../context/AppContext'
import { format, isToday, differenceInDays } from 'date-fns'

const PHASE_BANNERS = {
    Menstrual: { emoji: '🔴', label: 'Menstrual Phase', desc: 'Rest, restore, be gentle with yourself. High iron foods recommended.', bg: 'bg-red-50', border: 'border-red-200', text: 'text-red-700' },
    Follicular: { emoji: '🌱', label: 'Follicular Phase', desc: 'Energy rising! Great time for new habits, high-intensity workouts, creative work.', bg: 'bg-emerald-50', border: 'border-emerald-200', text: 'text-emerald-700' },
    Ovulatory: { emoji: '🌸', label: 'Ovulatory Phase', desc: 'Peak energy, communication, and confidence. Social activities feel great.', bg: 'bg-pink-50', border: 'border-pink-200', text: 'text-pink-700' },
    Luteal: { emoji: '🍂', label: 'Luteal Phase', desc: 'Wind down. Prioritize journaling, yoga, gentle movement, and self-care.', bg: 'bg-amber-50', border: 'border-amber-200', text: 'text-amber-700' },
};

function FemaleTracker() {

    const { hideFemaleData } = useAppContext();
    const {
        history, loading, saving, logDay,
        currentCycleDay, currentPhase, nextPeriod,
        avgCycleLength, avgPeriodLength,
        ovulationInfo, isPeriodLate
    } = useCycleContext();

    // Selected Date Context (defaults to today)
    const [selectedDate, setSelectedDate] = useState(new Date());

    // Phase Info Toggle Context
    const [showPhaseInfo, setShowPhaseInfo] = useState(false);

    // Logging State (for the selected date)
    const [flow, setFlow] = useState('none');
    const [mood, setMood] = useState(null);
    const [cramps, setCramps] = useState('none');
    const [energy, setEnergy] = useState(5);
    const [symptoms, setSymptoms] = useState([]);
    const [notes, setNotes] = useState('');
    const [sleep, setSleep] = useState(null);
    const [periodStart, setPeriodStart] = useState(false);
    const [periodEnd, setPeriodEnd] = useState(false);

    // Sync form state when a new date is selected
    React.useEffect(() => {
        if (!history || history.length === 0) return;

        const dateStr = format(selectedDate, 'yyyy-MM-dd');
        const entry = history.find(h => h.date === dateStr);

        if (entry) {
            setFlow(entry.flow || 'none');
            setMood(entry.mood || null);
            setCramps(entry.cramps || 'none');
            setEnergy(entry.energy || 5);
            setSymptoms(entry.symptoms || []);
            setNotes(entry.notes || '');
            setSleep(entry.sleep || null);
            setPeriodStart(entry.periodStart || false);
            setPeriodEnd(entry.periodEnd || false);
        } else {
            // Reset to defaults for empty days
            setFlow('none');
            setMood(null);
            setCramps('none');
            setEnergy(5);
            setSymptoms([]);
            setNotes('');
            setSleep(null);
            setPeriodStart(false);
            setPeriodEnd(false);
        }
    }, [selectedDate, history]);

    const toggleSymptom = (id) => {
        setSymptoms(prev =>
            prev.includes(id) ? prev.filter(s => s !== id) : [...prev, id]
        );
    };

    const handleSave = () => {
        logDay({ flow, mood, cramps, energy, symptoms, notes, sleep, periodStart, periodEnd, date: selectedDate });
    };

    const phaseBanner = currentPhase ? PHASE_BANNERS[currentPhase] : null;

    if (loading) {
        return (
            <div className="flex-1 flex flex-col">
                <Header title="Female Tracker" />
                <LoadingSkeleton type="page" />
            </div>
        );
    }

    if (hideFemaleData) {
        return (
            <div className="flex-1 flex flex-col">
                <Header title="Cycle & Wellness Tracker" />
                <div className="flex-1 flex flex-col items-center justify-center p-8 text-center animate-fade-in">
                    <div className="w-20 h-20 bg-gray-50 rounded-full flex items-center justify-center text-4xl mb-6 shadow-sm border border-gray-100">🔒</div>
                    <h2 className="text-2xl font-serif font-black text-gray-800 mb-2">Private Tracker</h2>
                    <p className="text-gray-500 text-sm max-w-xs">This feature is currently hidden. You can reactivate it in your Profile Settings.</p>
                </div>
            </div>
        );
    }

    return (
        <div className="flex-1 flex flex-col bg-gray-50/30">
            <Header title="Cycle & Wellness Tracker" saving={saving} />

            <div className="flex-1 overflow-y-auto pb-32">
                {/* Phase Banner */}
                {phaseBanner ? (
                    <div className={`px-4 md:px-6 py-4 ${phaseBanner.bg} border-b ${phaseBanner.border}`}>
                        <div className="max-w-6xl mx-auto flex items-center gap-4">
                            <span className="text-3xl shrink-0">{phaseBanner.emoji}</span>
                            <div>
                                <h3 className={`text-sm font-black uppercase tracking-wider ${phaseBanner.text}`}>{phaseBanner.label} — Day {currentCycleDay}</h3>
                                <p className={`text-xs ${phaseBanner.text} opacity-80 max-w-xl line-clamp-2 md:line-clamp-none`}>{phaseBanner.desc}</p>
                            </div>
                        </div>
                    </div>
                ) : (
                    <div className="px-6 py-4 bg-sky-50 border-b border-sky-100 flex items-center gap-3">
                        <span className="text-2xl">🪄</span>
                        <p className="text-[11px] font-bold text-sky-700 leading-tight">Log your first period to activate predictions and cycle tracking.</p>
                    </div>
                )}

                <div className="p-4 md:p-6 lg:p-8 max-w-7xl mx-auto space-y-4">

                    {/* Phase Info Toggle & Card */}
                    {currentPhase && (
                        <div className="flex flex-col items-center">
                            <button
                                onClick={() => setShowPhaseInfo(!showPhaseInfo)}
                                className="text-xs font-bold text-gray-500 hover:text-emerald-600 transition-colors flex items-center gap-1 bg-white/50 px-4 py-2 rounded-full border border-gray-100 shadow-sm"
                            >
                                <span>Wanted to know what&apos;s happening?</span>
                                <span className={`transform transition-transform ${showPhaseInfo ? 'rotate-180' : ''}`}>▼</span>
                            </button>

                            {showPhaseInfo && (
                                <div className="w-full mt-4 animate-fade-down">
                                    <PhaseInfoCard phase={currentPhase} />
                                </div>
                            )}
                        </div>
                    )}

                    <div className="pt-4 space-y-8">
                        {isPeriodLate && (
                            <div className="bg-rose-50 border border-rose-200 p-4 rounded-2xl flex items-center justify-center gap-3 animate-fade-down">
                                <span className="text-xl">⚠️</span>
                                <p className="text-sm font-bold text-rose-700">Your period is {differenceInDays(new Date(), nextPeriod)} days late. Log a period to update your cycle calculations.</p>
                            </div>
                        )}

                        {/* Predictions Banner */}
                        {history.length > 0 && ovulationInfo && (
                            <div className="bg-white p-2 rounded-3xl border border-gray-100 shadow-sm grid grid-cols-2 md:grid-cols-4 divide-y divide-x md:divide-y-0 divide-gray-100 overflow-hidden">
                                <div className="p-3.5 text-center">
                                    <p className="text-[9px] font-black uppercase tracking-widest text-gray-400 mb-1">Predicted Period</p>
                                    <p className="font-serif font-black text-rose-600 text-lg leading-none">{format(nextPeriod, 'MMM dd')}</p>
                                </div>
                                <div className="p-3.5 text-center">
                                    <p className="text-[9px] font-black uppercase tracking-widest text-gray-400 mb-1">Avg Cycle</p>
                                    <p className="font-serif font-black text-emerald-600 text-lg leading-none">{avgCycleLength} d</p>
                                </div>
                                <div className="p-3.5 text-center">
                                    <p className="text-[9px] font-black uppercase tracking-widest text-gray-400 mb-1">Fertile Window</p>
                                    <p className="font-serif font-black text-blue-500 text-base leading-none">
                                        {format(ovulationInfo.fertileWindowStart, 'MMM d')} - {format(ovulationInfo.fertileWindowEnd, 'd')}
                                    </p>
                                </div>
                                <div className="p-3.5 text-center">
                                    <p className="text-[9px] font-black uppercase tracking-widest text-gray-400 mb-1">Ovulation</p>
                                    <p className="font-serif font-black text-pink-500 text-base leading-none">🌸 {format(ovulationInfo.ovulationDate, 'MMM d')}</p>
                                </div>
                            </div>
                        )}

                        {/* Top Row: Calendar & Wheel */}
                        <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
                            {/* Monthly Flow Calendar (Span 7) */}
                            <div className="lg:col-span-7 space-y-6">
                                <FlowCalendar
                                    currentDate={selectedDate}
                                    history={history}
                                    onSelectDate={setSelectedDate}
                                    avgCycleLength={avgCycleLength}
                                />

                                {/* Selected Date Context Header */}
                                <div className="bg-gradient-to-r from-rose-500 to-pink-500 p-5 md:p-6 rounded-3xl text-white shadow-lg shadow-rose-200 flex flex-col sm:flex-row gap-4 sm:items-center justify-between animate-fade-up stagger-1">
                                    <div>
                                        <h2 className="text-xl md:text-2xl font-serif font-black">
                                            {isToday(selectedDate) ? 'Track Today' : format(selectedDate, 'MMM d, yyyy')}
                                        </h2>
                                        <p className="text-white/80 text-[10px] font-black uppercase tracking-widest mt-0.5">Daily Log Entry</p>
                                    </div>
                                    <button
                                        onClick={handleSave}
                                        disabled={saving}
                                        className="bg-white text-rose-600 px-8 py-3.5 rounded-2xl font-black text-xs uppercase tracking-widest hover:scale-105 active:scale-95 transition-all disabled:opacity-50 shadow-sm"
                                    >
                                        {saving ? 'Saving...' : 'Save Changes'}
                                    </button>
                                </div>
                            </div>

                            {/* Cycle Status Wheel (Span 5) */}
                            <div className="lg:col-span-5 space-y-6 animate-fade-up">
                                <div className="bg-white p-6 rounded-3xl border border-gray-100 shadow-sm flex flex-col items-center h-full">
                                    <h3 className="text-sm font-bold text-gray-800 mb-6 self-start">Current Cycle</h3>
                                    <div className="flex-1 flex items-center justify-center w-full min-h-[250px]">
                                        <CycleWheel day={currentCycleDay || 1} cycleLength={avgCycleLength} phase={currentPhase || 'Follicular'} ovulationInfo={ovulationInfo} />
                                    </div>

                                </div>
                            </div>
                        </div>

                        {/* Complete Logging Form Grid */}
                        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 items-start">

                            {/* Left Column: Period & Physical */}
                            <div className="space-y-6 animate-fade-up stagger-2">
                                {/* Period Controls */}
                                <div className="bg-white p-6 rounded-3xl border border-gray-100 shadow-sm">
                                    <h4 className="text-[10px] font-black uppercase text-gray-400 tracking-widest mb-4">Period Status</h4>
                                    <div className="flex gap-3">
                                        <button
                                            onClick={() => { setPeriodStart(!periodStart); setPeriodEnd(false); }}
                                            className={`flex-1 py-4 rounded-2xl text-xs font-black uppercase tracking-widest transition-all ${periodStart
                                                ? 'bg-rose-500 text-white shadow-lg shadow-rose-200 scale-105'
                                                : 'bg-rose-50 text-rose-600 border border-transparent hover:border-rose-200'
                                                }`}
                                        >
                                            🩸 Started
                                        </button>
                                        <button
                                            onClick={() => { setPeriodEnd(!periodEnd); setPeriodStart(false); }}
                                            className={`flex-1 py-4 rounded-2xl text-xs font-black uppercase tracking-widest transition-all ${periodEnd
                                                ? 'bg-emerald-500 text-white shadow-lg shadow-emerald-200 scale-105'
                                                : 'bg-emerald-50 text-emerald-600 border border-transparent hover:border-emerald-200'
                                                }`}
                                        >
                                            ✓ Ended
                                        </button>
                                    </div>

                                    <div className="mt-8">
                                        <h4 className="text-[10px] font-black uppercase text-gray-400 tracking-widest mb-4">Flow Intensity</h4>
                                        <FlowLogger selected={flow} onSelect={setFlow} />
                                    </div>

                                    <div className="mt-8">
                                        <h4 className="text-[10px] font-black uppercase text-gray-400 tracking-widest mb-4">Cramps Severity</h4>
                                        <CrampsPicker selected={cramps} onSelect={setCramps} />
                                    </div>
                                </div>

                                {/* Symptoms */}
                                <div className="bg-white p-6 rounded-3xl border border-gray-100 shadow-sm">
                                    <h4 className="text-[10px] font-black uppercase text-gray-400 tracking-widest mb-4">Symptoms</h4>
                                    <SymptomGrid selected={symptoms} onToggle={toggleSymptom} />
                                </div>
                            </div>

                            {/* Right Column: Mood, Energy, Sleep, Notes */}
                            <div className="space-y-6 animate-fade-up stagger-3">
                                <div className="bg-white p-6 rounded-3xl border border-gray-100 shadow-sm">
                                    <h4 className="text-[10px] font-black uppercase text-gray-400 tracking-widest mb-4">Mood</h4>
                                    <MoodPicker selected={mood} onSelect={setMood} />

                                    <div className="mt-8">
                                        <h4 className="text-[10px] font-black uppercase text-gray-400 tracking-widest mb-4">Energy Level</h4>
                                        <EnergySlider value={energy} onChange={setEnergy} />
                                    </div>

                                    <div className="mt-8">
                                        <h4 className="text-[10px] font-black uppercase text-gray-400 tracking-widest mb-4">Sleep Quality</h4>
                                        <div className="flex gap-2">
                                            {[
                                                { val: 'Poor', emoji: '😴', color: 'bg-red-50 text-red-600 border-red-200' },
                                                { val: 'Fair', emoji: '🫤', color: 'bg-amber-50 text-amber-600 border-amber-200' },
                                                { val: 'Good', emoji: '🙂', color: 'bg-indigo-50 text-indigo-600 border-indigo-200' },
                                                { val: 'Excellent', emoji: '⭐', color: 'bg-emerald-50 text-emerald-600 border-emerald-200' },
                                            ].map(sq => (
                                                <button
                                                    key={sq.val}
                                                    onClick={() => setSleep(sq.val)}
                                                    className={`flex-1 flex flex-col items-center justify-center p-3 rounded-2xl transition-all border
                                                    ${sleep === sq.val ? `${sq.color} shadow-sm scale-[1.05]` : 'bg-gray-50 border-transparent text-gray-500 hover:border-gray-200'}
                                                `}
                                                >
                                                    <span className="text-xl mb-1">{sq.emoji}</span>
                                                    <span className="text-[9px] font-black uppercase tracking-widest">{sq.val}</span>
                                                </button>
                                            ))}
                                        </div>
                                    </div>
                                </div>

                                {/* Notes */}
                                <div className="bg-white p-6 rounded-3xl border border-gray-100 shadow-sm">
                                    <h4 className="text-[10px] font-black uppercase text-gray-400 tracking-widest mb-4">Daily Notes</h4>
                                    <textarea
                                        value={notes}
                                        onChange={(e) => setNotes(e.target.value)}
                                        placeholder="Any specific symptoms or emotional notes?"
                                        className="w-full h-28 bg-gray-50/50 border border-gray-100 rounded-2xl p-4 text-sm font-medium outline-none focus:ring-2 focus:ring-rose-200 transition-all resize-none placeholder:text-gray-300"
                                    />
                                </div>
                            </div>

                        </div>
                        <CycleCharts history={history} avgCycleLength={avgCycleLength} avgPeriodLength={avgPeriodLength} />
                    </div>
                </div>
            </div>
        </div>
    );
}

export default FemaleTracker;
