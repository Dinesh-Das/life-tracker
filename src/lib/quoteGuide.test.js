import { describe, expect, it } from 'vitest';
import { QUOTES } from '../data/quotes';
import { getQuoteGuide, modernizeArchaicLanguage } from './quoteGuide';

describe('plain-language quote guide', () => {
    it('provides an explanation and action for every quote topic', () => {
        for (const quote of QUOTES) {
            const guide = getQuoteGuide(quote);
            expect(guide.meaning.length).toBeGreaterThan(40);
            expect(guide.action.length).toBeGreaterThan(20);
        }
    });

    it('uses the quote-specific plain meaning and action', () => {
        const quote = QUOTES[0];

        expect(getQuoteGuide(quote)).toMatchObject({
            meaning: quote.meaning,
            action: quote.action,
        });
    });

    it('modernizes common archaic language without changing the source quote', () => {
        const original = 'Thou hast power over thy response, and thou shalt use it.';

        expect(modernizeArchaicLanguage(original)).toBe('You have power over your response, and you will use it.');
        expect(original).toBe('Thou hast power over thy response, and thou shalt use it.');
    });

    it('omits modern wording when the quotation is already clear', () => {
        expect(modernizeArchaicLanguage('Use your time carefully.')).toBeNull();
    });
});
