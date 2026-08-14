import { describe, expect, it } from 'vitest';
import { monthlyChallenges } from './challenges';

const challenge = (result, id) => result.find(item => item.id === id);

describe('monthlyChallenges', () => {
    it('removes frozen cells from consistency and iron-habit requirements', () => {
        const result = monthlyChallenges(
            [{ id: 'habit', name: 'Habit' }],
            { habit: { 1: true, 2: 'skip' } },
            31,
            2,
        );
        expect(challenge(result, 'consistency_80')).toMatchObject({ progress: 100, achieved: true });
        expect(challenge(result, 'iron_habit')).toMatchObject({ progress: 1, achieved: true });
    });

    it('does not count unscheduled weekdays or vacation dates as misses', () => {
        const habits = [
            { id: 'monday', name: 'Monday only', scheduleType: 'weekdays', scheduleDays: [1] },
            { id: 'daily', name: 'Daily', scheduleType: 'frequency' },
        ];
        // August 3, 2026 is Monday; August 4 is globally paused.
        const result = monthlyChallenges(habits, {
            monday: { 1: false, 2: false, 3: true, 4: false },
            daily: { 1: true, 2: true, 3: true, 4: false },
        }, 31, 4, {
            year: 2026,
            monthIndex: 7,
            globalPause: { from: '2026-08-04', until: '2026-08-04' },
        });
        expect(challenge(result, 'consistency_80')).toMatchObject({ progress: 100, achieved: true });
        expect(challenge(result, 'iron_habit')).toMatchObject({ progress: 1, achieved: true });
    });

    it('measures flexible weekly habits against their cadence for consistency', () => {
        const habit = {
            id: 'flexible',
            name: 'Flexible',
            scheduleType: 'frequency',
            frequency: '3x/week',
            goal: 30,
        };
        const result = monthlyChallenges([habit], {
            flexible: { 1: true, 2: true, 3: true, 4: false, 5: false, 6: false, 7: false },
        }, 28, 7);
        expect(challenge(result, 'consistency_80')).toMatchObject({ progress: 100, achieved: true });
    });
});
