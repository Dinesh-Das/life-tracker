import { describe, it, expect } from 'vitest';
import { generateNudges, nudgeWeekKey } from './nudges';

const boost = { habitId: 'a', habitName: 'Workout', emoji: '💪', doneAvg: 8.1, missAvg: 6.4, delta: 1.7 };
const drag = { habitId: 'b', habitName: 'Late Coding', emoji: '💻', doneAvg: 5.2, missAvg: 6.8, delta: -1.6 };
const carry = { habitId: 'c', habitName: 'Meditation', emoji: '🧘', doneAvg: 7.9, missAvg: 6.7, delta: 1.2 };
const weekday = { best: { day: 'Monday', pct: 90 }, worst: { day: 'Friday', pct: 55 } };

describe('generateNudges', () => {
    it('returns nothing without insights', () => {
        expect(generateNudges({})).toEqual([]);
    });

    it('turns the strongest positive correlation into a protect prompt', () => {
        const res = generateNudges({ moodInsights: [boost] });
        expect(res).toHaveLength(1);
        expect(res[0].id).toBe('boost-a');
        expect(res[0].text).toContain('Workout');
        expect(res[0].text).toContain('8.1');
    });

    it('adds a next-day carryover nudge for a different habit', () => {
        const res = generateNudges({ moodInsights: [boost], nextDayInsights: [carry] });
        expect(res.map(n => n.id)).toEqual(['boost-a', 'carry-c']);
    });

    it('skips the carryover nudge when it duplicates the booster habit', () => {
        const res = generateNudges({ moodInsights: [boost], nextDayInsights: [{ ...carry, habitId: 'a' }] });
        expect(res.map(n => n.id)).toEqual(['boost-a']);
    });

    it('surfaces negative correlations as a reflection prompt', () => {
        const res = generateNudges({ moodInsights: [drag] });
        expect(res[0].id).toBe('drag-b');
    });

    it('only nudges about weekdays when the gap is meaningful', () => {
        expect(generateNudges({ weekday })).toHaveLength(1);
        expect(generateNudges({ weekday: { best: { day: 'Mon', pct: 70 }, worst: { day: 'Tue', pct: 60 } } })).toHaveLength(0);
    });

    it('never returns more than two nudges', () => {
        const res = generateNudges({ moodInsights: [boost, drag], nextDayInsights: [carry], weekday });
        expect(res).toHaveLength(2);
        expect(res.map(n => n.id)).toEqual(['boost-a', 'carry-c']);
    });
});

describe('nudgeWeekKey', () => {
    it('buckets dates into ISO weeks', () => {
        expect(nudgeWeekKey(new Date('2026-07-07T12:00:00'))).toBe('2026-W28');
        expect(nudgeWeekKey(new Date('2026-01-01T12:00:00'))).toBe('2026-W01');
    });
});