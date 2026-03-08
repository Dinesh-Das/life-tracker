import React, { useState, useMemo, useEffect } from 'react';
import {
    startOfMonth, endOfMonth, eachDayOfInterval, format, isSameDay,
    isToday, addMonths, subMonths, addDays, parseISO, differenceInDays
} from 'date-fns';
import { ChevronLeft, ChevronRight } from 'lucide-react';

// Phase styles: bg color, text color, and hover for calendar cells
const PHASE_STYLES = {
    Menstrual: { bg: 'bg-rose-100', text: 'text-rose-700', hover: 'hover:bg-rose-200', dot: 'bg-rose-400', label: 'Menstrual', emoji: '🔴' },
    Follicular: { bg: 'bg-violet-50', text: 'text-violet-600', hover: 'hover:bg-violet-100', dot: 'bg-violet-400', label: 'Follicular', emoji: '🌱' },
    Ovulatory: { bg: 'bg-emerald-100', text: 'text-emerald-700', hover: 'hover:bg-emerald-200', dot: 'bg-emerald-400', label: 'Ovulatory', emoji: '🌸' },
    Luteal: { bg: 'bg-amber-50', text: 'text-amber-600', hover: 'hover:bg-amber-100', dot: 'bg-amber-400', label: 'Luteal', emoji: '🍂' },
    Fertile: { bg: 'bg-sky-50', text: 'text-sky-600', hover: 'hover:bg-sky-100', dot: 'bg-sky-400', label: 'Fertile', emoji: '💙' },
};

/** Calculate cycle phase for a given cycle day (1-based) relative to cycle length */
function getCyclePhaseForDay(dayInCycle, cycleLength, ovulationDay) {
    if (dayInCycle < 1) return null;
    if (dayInCycle > cycleLength) return null;
    if (dayInCycle <= 5) return 'Menstrual';
    if (dayInCycle >= ovulationDay - 5 && dayInCycle <= ovulationDay + 1) return 'Fertile';
    if (dayInCycle >= ovulationDay - 1 && dayInCycle <= ovulationDay + 1) return 'Ovulatory';
    if (dayInCycle < ovulationDay - 1) return 'Follicular';
    return 'Luteal';
}

const FlowCalendar = ({ currentDate, history = [], onSelectDate, avgCycleLength = 28 }) => {
    const [viewedMonth, setViewedMonth] = useState(() => startOfMonth(currentDate));

    useEffect(() => {
        if (!isSameDay(startOfMonth(currentDate), viewedMonth)) {
            setViewedMonth(startOfMonth(currentDate));
        }
        // eslint-disable-next-line
    }, [currentDate]);

    const handlePrevMonth = () => setViewedMonth(prev => subMonths(prev, 1));
    const handleNextMonth = () => setViewedMonth(prev => addMonths(prev, 1));

    const days = useMemo(() => {
        return eachDayOfInterval({ start: startOfMonth(viewedMonth), end: endOfMonth(viewedMonth) });
    }, [viewedMonth]);

    // Mon-Sun padding
    const padding = useMemo(() => {
        const startDay = days[0].getDay();
        return Array.from({ length: startDay === 0 ? 6 : startDay - 1 }).fill(null);
    }, [days]);

    const { historyMap, phaseMap, predictions } = useMemo(() => {
        const map = {};
        const starts = [];
        const ends = [];

        history.forEach(entry => {
            map[entry.date] = entry;
            if (entry.periodStart) starts.push(entry.date);
            if (entry.periodEnd) ends.push(entry.date);
        });

        // --- Phase Map: compute expected phase for EVERY calendar day ---
        const phases = {};
        const preds = new Set();
        const ovulationDay = avgCycleLength - 14; // e.g., 14 for 28d cycle

        if (starts.length > 0) {
            const latestStartDate = parseISO(starts[starts.length - 1]);

            // Mark phases for ±3 cycles from the latest start
            for (let cycle = -1; cycle <= 3; cycle++) {
                const cycleStart = addDays(latestStartDate, avgCycleLength * cycle);
                for (let d = 1; d <= avgCycleLength; d++) {
                    const targetDate = addDays(cycleStart, d - 1);
                    const dateStr = format(targetDate, 'yyyy-MM-dd');
                    const phase = getCyclePhaseForDay(d, avgCycleLength, ovulationDay);
                    if (phase) phases[dateStr] = phase;
                }

                // Mark predicted period starts (future cycles)
                if (cycle >= 1) {
                    preds.add(format(cycleStart, 'yyyy-MM-dd'));
                }
            }
        }

        // Post-period (2 days after each logged end)
        const postPeriod = new Set();
        ends.forEach(endDateStr => {
            const end = parseISO(endDateStr);
            for (let d = 1; d <= 2; d++) {
                postPeriod.add(format(addDays(end, d), 'yyyy-MM-dd'));
            }
        });

        return { historyMap: map, phaseMap: phases, predictions: { preds, postPeriod } };
    }, [history, avgCycleLength]);

    return (
        <div className="bg-white p-6 rounded-3xl border border-gray-100 shadow-sm">
            {/* Header */}
            <div className="flex items-center justify-between mb-4">
                <h4 className="text-[10px] font-black uppercase text-gray-400 tracking-widest">Cycle Calendar</h4>
                <div className="flex items-center gap-3">
                    <button onClick={handlePrevMonth} className="p-1 hover:bg-gray-100 rounded-lg transition-colors text-gray-500" aria-label="Previous month">
                        <ChevronLeft size={16} />
                    </button>
                    <span className="text-xs font-bold text-gray-800 tracking-wide select-none min-w-[100px] text-center">
                        {format(viewedMonth, 'MMMM yyyy')}
                    </span>
                    <button onClick={handleNextMonth} className="p-1 hover:bg-gray-100 rounded-lg transition-colors text-gray-500" aria-label="Next month">
                        <ChevronRight size={16} />
                    </button>
                </div>
            </div>

            {/* Weekday headers */}
            <div className="grid grid-cols-7 gap-1 text-center mb-2">
                {['M', 'T', 'W', 'T', 'F', 'S', 'S'].map((d, i) => (
                    <div key={i} className="text-[9px] font-bold text-gray-300 uppercase">{d}</div>
                ))}
            </div>

            {/* Calendar grid */}
            <div className="grid grid-cols-7 gap-1">
                {padding.map((_, i) => <div key={`pad-${i}`} className="h-10 rounded-xl bg-transparent" />)}

                {days.map(date => {
                    const dateStr = format(date, 'yyyy-MM-dd');
                    const entry = historyMap[dateStr];
                    const _isToday = isToday(date);
                    const isSelected = isSameDay(date, currentDate);
                    const expectedPhase = phaseMap[dateStr];
                    const isPredictedStart = predictions.preds.has(dateStr);

                    // --- Layer priority: logged flow > phase background ---
                    let bgColor = 'bg-transparent';
                    let textColor = 'text-gray-600';
                    let hoverColor = 'hover:bg-gray-50';
                    let ringColor = '';

                    // 1. Actual logged flow takes highest priority
                    const hasFlow = entry && entry.flow && entry.flow !== 'none';
                    if (hasFlow) {
                        textColor = 'text-white';
                        switch (entry.flow) {
                            case 'spotting': bgColor = 'bg-pink-300'; hoverColor = 'hover:bg-pink-400'; break;
                            case 'light': bgColor = 'bg-rose-400'; hoverColor = 'hover:bg-rose-500'; break;
                            case 'medium': bgColor = 'bg-rose-500'; hoverColor = 'hover:bg-rose-600'; break;
                            case 'heavy': bgColor = 'bg-rose-700'; hoverColor = 'hover:bg-rose-800'; break;
                            default: break;
                        }
                    }
                    // 2. Expected phase color (only when no flow logged)
                    else if (expectedPhase && PHASE_STYLES[expectedPhase]) {
                        const style = PHASE_STYLES[expectedPhase];
                        bgColor = style.bg;
                        textColor = style.text;
                        hoverColor = style.hover;
                    }

                    // 3. Today indicator
                    if (_isToday && !hasFlow) {
                        ringColor = 'ring-2 ring-gray-800';
                        if (!expectedPhase) textColor = 'text-gray-800 font-black';
                    }

                    // 4. Selected state
                    if (isSelected) {
                        ringColor = hasFlow || expectedPhase
                            ? 'ring-2 ring-offset-2 ring-gray-800'
                            : 'ring-2 ring-gray-900';
                    }

                    return (
                        <button
                            key={dateStr}
                            onClick={() => onSelectDate && onSelectDate(date)}
                            aria-label={`${format(date, 'MMMM d')}${expectedPhase ? `, ${expectedPhase} phase` : ''}${hasFlow ? `, ${entry.flow} flow` : ''}`}
                            className={`
                                relative h-10 w-full flex items-center justify-center rounded-xl text-xs font-bold transition-all
                                ${bgColor} ${textColor} ${hoverColor} ${ringColor}
                            `}
                        >
                            <span className="z-10">{format(date, 'd')}</span>

                            {/* Predicted Period Start pulse */}
                            {isPredictedStart && !entry?.periodStart && (
                                <div className="absolute top-1 right-1 w-1.5 h-1.5 rounded-full bg-rose-400 animate-pulse" title="Predicted Period Start" />
                            )}

                            {/* Logged Period Start/End corner markers */}
                            {entry?.periodStart && (
                                <div className="absolute top-0 right-0 w-2 h-2 rounded-bl-lg bg-red-900 rounded-tr-xl" title="Period Started" />
                            )}
                            {entry?.periodEnd && (
                                <div className="absolute bottom-0 left-0 w-2 h-2 rounded-tr-lg bg-emerald-400 rounded-bl-xl" title="Period Ended" />
                            )}

                            {/* Ovulatory sparkle */}
                            {expectedPhase === 'Ovulatory' && !hasFlow && (
                                <span className="absolute top-0 left-0 text-[8px] leading-none">✨</span>
                            )}
                        </button>
                    );
                })}
            </div>

            {/* Legend */}
            <div className="mt-4 pt-3 border-t border-gray-50">
                <div className="grid grid-cols-3 sm:grid-cols-5 gap-x-3 gap-y-2">
                    {Object.entries(PHASE_STYLES).map(([phase, style]) => (
                        <div key={phase} className="flex items-center gap-1.5">
                            <div className={`w-3 h-3 rounded-full ${style.dot} shrink-0`} />
                            <span className="text-[9px] font-bold text-gray-400 uppercase tracking-widest">{style.label}</span>
                        </div>
                    ))}
                    <div className="flex items-center gap-1.5">
                        <div className="w-3 h-3 rounded-sm bg-rose-500 shrink-0" />
                        <span className="text-[9px] font-bold text-gray-400 uppercase tracking-widest">Flow</span>
                    </div>
                    <div className="flex items-center gap-1.5">
                        <div className="w-1.5 h-1.5 rounded-full bg-rose-400 shrink-0" />
                        <span className="text-[9px] font-bold text-gray-400 uppercase tracking-widest">Predicted</span>
                    </div>
                </div>
            </div>
        </div>
    );
};

export default FlowCalendar;
