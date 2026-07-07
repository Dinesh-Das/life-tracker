import { describe, it, expect } from 'vitest';
import { habitDecayWarnings } from './decay';

const habit = { id: 'h1', name: 'Workout', emoji: '💪' };

describe('habitDecayWarnings', () => {
    it('warns when a previously active habit drops sharply', () => {
        const series = [true, true, true, true, true, true, false, false, true, false, false, false, false, false];
        const w = habitDecayWarnings([habit], { h1: series });
        expect(w).toHaveLength(1);
        expect(w[0]).toMatchObject({ habitId: 'h1', prior: 6, recent: 1, drop: 5 });
    });

    it('treats frozen days as completions, not decay', () => {
        const series = [true, true, true, true, false, false, false, 'skip', 'skip', true, true, false, false, false];
        expect(habitDecayWarnings([habit], { h1: series })).toHaveLength(0);
    });

    it('ignores habits that were not active in the prior week', () => {
        const series = [false, true, false, true, false, false, false, false, false, false, false, false, false, false];
        expect(habitDecayWarnings([habit], { h1: series })).toHaveLength(0);
    });

    it('ignores series shorter than 14 days', () => {
        expect(habitDecayWarnings([habit], { h1: [true, true, true] })).toHaveLength(0);
    });

    it('sorts warnings by steepest drop first', () => {
        const a = Array(7).fill(true).concat(Array(7).fill(false)); // drop 7
        const b = Array(7).fill(true).concat([true, true, true, true, false, false, false]); // drop 3
        const w = habitDecayWarnings(
            [{ id: 'a', name: 'A', emoji: '✨' }, { id: 'b', name: 'B', emoji: '✨' }],
            { a, b }
        );
        expect(w.map(x => x.habitId)).toEqual(['a', 'b']);
    });
});