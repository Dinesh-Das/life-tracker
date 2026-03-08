import { addDays, differenceInDays, parseISO } from 'date-fns';

export const CYCLE_PHASES = {
    MENSTRUAL: 'Menstrual',
    FOLLICULAR: 'Follicular',
    OVULATORY: 'Ovulatory',
    LUTEAL: 'Luteal'
};

/**
 * Predicts the phase based on day in cycle, relative to actual cycle length.
 * Ovulation occurs at (cycleLength - 14), so phases adapt to non-28-day cycles.
 *   Menstrual:  Days 1–5
 *   Follicular: Day 6 to (ovulationDay - 2)
 *   Ovulatory:  (ovulationDay - 1) to (ovulationDay + 1)  [3-day window]
 *   Luteal:     (ovulationDay + 2) to end of cycle
 */
export function getCyclePhase(dayInCycle, cycleLength = 28) {
    if (dayInCycle <= 5) return CYCLE_PHASES.MENSTRUAL;
    const ovulationDay = cycleLength - 14; // e.g., Day 14 for 28d, Day 18 for 32d
    if (dayInCycle < ovulationDay - 1) return CYCLE_PHASES.FOLLICULAR;
    if (dayInCycle <= ovulationDay + 1) return CYCLE_PHASES.OVULATORY;
    return CYCLE_PHASES.LUTEAL;
}

/**
 * Predicts next period date from last period start
 */
export function getNextPeriodDate(lastPeriodDate, cycleLength = 28) {
    const start = typeof lastPeriodDate === 'string' ? parseISO(lastPeriodDate) : lastPeriodDate;
    return addDays(start, cycleLength);
}

/**
 * Calculates ovulation date and fertile window.
 * Based on Luteal phase being consistently ~14 days before next period.
 *   Ovulation day:    cycleLength - 14  (relative to cycle start)
 *   Fertile window:   ovulationDate - 5  to  ovulationDate + 1
 */
export function calculateOvulationAndFertility(lastPeriodDate, cycleLength = 28) {
    const start = typeof lastPeriodDate === 'string' ? parseISO(lastPeriodDate) : lastPeriodDate;
    const ovulationDay = cycleLength - 14; // cycle-relative day number
    // -1 because cycle day 1 = day 0 from start date
    const ovulationDate = addDays(start, ovulationDay - 1);
    const fertileWindowStart = addDays(ovulationDate, -5);
    const fertileWindowEnd = addDays(ovulationDate, 1);

    return {
        ovulationDay,        // used by CycleWheel for positioning markers
        ovulationDate,       // absolute date
        fertileWindowStart,  // absolute date
        fertileWindowEnd,    // absolute date
    };
}

/**
 * Gets the current day in cycle from last period start to targetDate.
 */
export function getDayInCycle(lastPeriodDate, targetDate = new Date()) {
    const start = typeof lastPeriodDate === 'string' ? parseISO(lastPeriodDate) : lastPeriodDate;
    return differenceInDays(targetDate, start) + 1;
}

export function getPhaseColor(phase) {
    switch (phase) {
        case CYCLE_PHASES.MENSTRUAL: return '#F43F5E'; // Rose 500
        case CYCLE_PHASES.FOLLICULAR: return '#8B5CF6'; // Violet 500
        case CYCLE_PHASES.OVULATORY: return '#10B981'; // Emerald 500
        case CYCLE_PHASES.LUTEAL: return '#F59E0B'; // Amber 500
        default: return '#94A3B8';
    }
}
