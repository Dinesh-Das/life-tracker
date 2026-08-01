import { useState, useEffect, useCallback } from 'react';
import { readDataRows, appendRows, batchWrite } from '../lib/sheetsApi';
import { format, differenceInDays, addDays, parseISO, isAfter, isBefore } from 'date-fns';
import toast from 'react-hot-toast';
import { getCyclePhase, getDayInCycle, calculateOvulationAndFertility } from '../lib/cycleUtils';

export function periodLengthsFromHistory(history = []) {
    const starts = history.filter(entry => entry.periodStart);
    const lengths = [];
    starts.forEach((start, index) => {
        const nextStart = starts[index + 1]?.date || null;
        const entries = history.filter(entry =>
            entry.date >= start.date && (!nextStart || entry.date < nextStart)
        );
        const explicitEnd = entries.find(entry => entry.periodEnd);
        // Only infer a missing end once a newer period proves the previous one
        // has finished. An ongoing latest period must not skew the average.
        const inferredEnd = nextStart
            ? [...entries].reverse().find(entry => entry.flow && entry.flow !== 'none')
            : null;
        const end = explicitEnd || inferredEnd;
        if (!end) return;
        const length = differenceInDays(parseISO(end.date), parseISO(start.date)) + 1;
        if (length > 0 && length <= 20) lengths.push(length);
    });
    return lengths;
}

export function useCycle(spreadsheetId) {
    const [history, setHistory] = useState([]);
    const [loading, setLoading] = useState(true);
    const [saving, setSaving] = useState(false);
    const [error, setError] = useState(null);

    // Computed values
    const [currentCycleDay, setCurrentCycleDay] = useState(null);
    const [currentPhase, setCurrentPhase] = useState(null);
    const [nextPeriod, setNextPeriod] = useState(null);
    const [avgCycleLength, setAvgCycleLength] = useState(28);
    const [avgPeriodLength, setAvgPeriodLength] = useState(5);
    const [ovulationInfo, setOvulationInfo] = useState(null);
    const [isPeriodLate, setIsPeriodLate] = useState(false);

    const fetchHistory = useCallback(async () => {
        if (!spreadsheetId) return;
        setLoading(true);
        setError(null);
        setHistory([]);
        setCurrentCycleDay(null);
        setCurrentPhase(null);
        setNextPeriod(null);
        setAvgCycleLength(28);
        setAvgPeriodLength(5);
        setOvulationInfo(null);
        setIsPeriodLate(false);
        try {
            // Sheet columns (0-indexed):
            // A(0): date, B(1): cycleDay, C(2): phase, D(3): flowIntensity
            // E(4): mood, F(5): energy, G(6): symptoms, H(7): notes
            // I(8): periodStart, J(9): periodEnd, K(10): sleep, L(11): cramps
            const response = await readDataRows(spreadsheetId, 'Female!A:L');
            const rows = response || [];

            const formattedHistory = rows
                .map((row, idx) => {
                    if (!row[0]) return null;
                    // Extract clean date from potential "2026-03-08 (Sun)" format
                    const rawDate = row[0];
                    const cleanDate = rawDate.split(' ')[0];

                    return {
                        date: cleanDate,
                        rowIndex: idx + 2, // actual 1-based sheet row (row 1 = header)
                        cycleDay: parseInt(row[1]?.replace('Day ', '')) || null,
                        phase: row[2] || null,
                        flow: row[3] ? row[3].toLowerCase() : 'none',
                        mood: row[4] || null,
                        energy: parseInt(row[5]) || 5,              // F = energy
                        symptoms: row[6]
                            ? (typeof row[6] === 'string' ? row[6].split(', ').filter(Boolean) : [])
                            : [],                                    // G = symptoms
                        notes: row[7] || '',                         // H = notes
                        periodStart: row[8] === 'TRUE' || row[8] === 'Yes', // I = periodStart
                        periodEnd: row[9] === 'TRUE' || row[9] === 'Yes',   // J = periodEnd
                        sleep: row[10] || null,                      // K = sleep
                        cramps: row[11] ? row[11].toLowerCase() : 'none', // L = cramps (new)
                    };
                })
                .filter(Boolean);

            // Sort history by date to ensure proper timeline
            formattedHistory.sort((a, b) => parseISO(a.date) - parseISO(b.date));
            setHistory(formattedHistory);

            // --- Compute Metrics ---
            // 1. Find all period start dates (sorted ascending)
            const periodStarts = formattedHistory
                .filter(h => h.periodStart)
                .map(h => h.date);

            if (periodStarts.length > 0) {
                const latestStart = periodStarts[periodStarts.length - 1];
                const dayInCycle = getDayInCycle(latestStart);
                setCurrentCycleDay(dayInCycle);

                // 2. Compute average cycle length using last 3 cycle gaps
                let calculatedAvgCycle = 28; // default
                if (periodStarts.length > 1) {
                    const cycleLengths = [];
                    for (let i = 1; i < periodStarts.length; i++) {
                        cycleLengths.push(differenceInDays(parseISO(periodStarts[i]), parseISO(periodStarts[i - 1])));
                    }

                    const recentCycles = cycleLengths.slice(-3);
                    const maxCycle = Math.max(...recentCycles);
                    const minCycle = Math.min(...recentCycles);

                    if (maxCycle - minCycle > 5) {
                        // High variance → use median
                        const sorted = [...recentCycles].sort((a, b) => a - b);
                        const mid = Math.floor(sorted.length / 2);
                        calculatedAvgCycle = sorted.length % 2 !== 0
                            ? sorted[mid]
                            : (sorted[mid - 1] + sorted[mid]) / 2;
                        calculatedAvgCycle = Math.round(calculatedAvgCycle);
                    } else {
                        calculatedAvgCycle = Math.round(
                            recentCycles.reduce((a, b) => a + b, 0) / recentCycles.length
                        );
                    }
                }
                // Always reset (fixes stale state bug when entries shrink to 1)
                setAvgCycleLength(calculatedAvgCycle);

                // 3. Phase and Next Period Prediction
                setCurrentPhase(getCyclePhase(dayInCycle, calculatedAvgCycle));

                const nextPeriodPred = addDays(parseISO(latestStart), calculatedAvgCycle);
                setNextPeriod(nextPeriodPred);

                // 4. Missed period check:
                // Only fire if today > predictedPeriod + 5 AND no newer period start has been logged
                const today = new Date();
                const hasNewerPeriod = periodStarts.some(s =>
                    !isBefore(parseISO(s), nextPeriodPred) && s !== latestStart
                );
                if (!hasNewerPeriod && isAfter(today, addDays(nextPeriodPred, 5))) {
                    setIsPeriodLate(true);
                } else {
                    setIsPeriodLate(false);
                }

                // 5. Calculate ovulation and fertile window
                setOvulationInfo(calculateOvulationAndFertility(latestStart, calculatedAvgCycle));
            } else {
                setCurrentCycleDay(null);
                setCurrentPhase(null);
                setNextPeriod(null);
                setOvulationInfo(null);
                setIsPeriodLate(false);
                setAvgCycleLength(28); // reset to default
            }

            // 6. Calculate Average Period Duration
            const periodLengths = periodLengthsFromHistory(formattedHistory);

            if (periodLengths.length > 0) {
                const avgLength = Math.round(periodLengths.reduce((a, b) => a + b, 0) / periodLengths.length);
                setAvgPeriodLength(avgLength);
            }

        } catch (error) {
            console.error('Error fetching cycle history:', error);
            setError(error);
        } finally {
            setLoading(false);
        }
    }, [spreadsheetId]);

    useEffect(() => {
        fetchHistory();
    }, [fetchHistory]);

    const logDay = async (data) => {
        if (!spreadsheetId) return;
        setSaving(true);
        try {
            const logDate = data.date
                ? (data.date instanceof Date ? data.date : parseISO(String(data.date).slice(0, 10)))
                : new Date();
            const dateStr = format(logDate, 'yyyy-MM-dd');
            const dayOfWeek = format(logDate, 'E');
            const readableDate = `${dateStr} (${dayOfWeek})`;

            const isPeriodStart = data.periodStart || false;
            const isPeriodEnd = data.periodEnd || false;

            // Calculate cycle day
            let cycleDay = 1;
            if (!isPeriodStart) {
                const pastStarts = history.filter(h => h.periodStart && parseISO(h.date) <= logDate);
                if (pastStarts.length > 0) {
                    const lastStart = pastStarts[pastStarts.length - 1];
                    cycleDay = differenceInDays(logDate, parseISO(lastStart.date)) + 1;
                } else if (currentCycleDay) {
                    cycleDay = currentCycleDay + differenceInDays(logDate, new Date());
                }
            }
            cycleDay = Math.max(1, cycleDay);

            const phase = getCyclePhase(cycleDay, avgCycleLength);
            const fmtFlow = data.flow && data.flow !== 'none'
                ? data.flow.charAt(0).toUpperCase() + data.flow.slice(1)
                : 'None';
            const fmtCramps = data.cramps && data.cramps !== 'none'
                ? data.cramps.charAt(0).toUpperCase() + data.cramps.slice(1)
                : 'None';

            // Columns: A B C D E F G H I J K L
            // date, cycleDay, phase, flow, mood, energy, symptoms, notes, periodStart, periodEnd, sleep, cramps
            const values = [[
                readableDate,                                        // A: date
                `Day ${cycleDay}`,                                   // B: cycleDay
                phase,                                               // C: phase
                fmtFlow,                                             // D: flowIntensity
                data.mood || '',                                     // E: mood
                data.energy || 5,                                    // F: energy
                data.symptoms ? data.symptoms.join(', ') : '',       // G: symptoms
                data.notes || '',                                    // H: notes
                isPeriodStart ? 'Yes' : 'No',                       // I: periodStart
                isPeriodEnd ? 'Yes' : 'No',                         // J: periodEnd
                data.sleep || '',                                    // K: sleep
                fmtCramps,                                           // L: cramps
            ]];

            // Use stored rowIndex for accurate updates (prevents wrong-row overwrites)
            const existing = [...history].reverse().find(h => h.date === dateStr);
            if (existing && existing.rowIndex) {
                await batchWrite(spreadsheetId, [{
                    range: `Female!A${existing.rowIndex}:L${existing.rowIndex}`,
                    values,
                }]);
            } else {
                await appendRows(spreadsheetId, 'Female!A:L', values);
            }

            toast.success('Cycle data saved ✓');
            fetchHistory();
        } catch (error) {
            toast.error('Failed to save cycle data');
            console.error(error);
        } finally {
            setSaving(false);
        }
    };

    return {
        history, loading, saving, error, logDay, reload: fetchHistory,
        currentCycleDay, currentPhase, nextPeriod,
        avgCycleLength, avgPeriodLength,
        ovulationInfo, isPeriodLate
    };
}
