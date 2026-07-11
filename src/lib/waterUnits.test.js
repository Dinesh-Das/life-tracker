import { describe, expect, it } from 'vitest';
import { formatLiters, legacyGlassesToLiters, roundLiters } from './waterUnits';

describe('water units', () => {
    it('converts legacy glasses to liters', () => {
        expect(legacyGlassesToLiters(12)).toBe(3);
        expect(legacyGlassesToLiters(3)).toBe(0.75);
    });

    it('rounds and formats liter values', () => {
        expect(roundLiters(1.499)).toBe(1.5);
        expect(formatLiters(2)).toBe('2');
        expect(formatLiters(1.25)).toBe('1.25');
    });
});
