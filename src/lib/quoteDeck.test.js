import { beforeEach, describe, expect, it } from 'vitest';
import { QUOTE_COUNT, QUOTE_SOURCES, QUOTES } from '../data/quotes';
import { buildShuffledQuoteDeck, getQuoteForCurrentLogin, resetQuoteForNextLogin } from './quoteDeck';

describe('login quote deck', () => {
    beforeEach(() => {
        localStorage.clear();
        sessionStorage.clear();
    });

    it('contains more than 1,000 unique, source-backed quotations', () => {
        expect(QUOTE_COUNT).toBeGreaterThan(1000);
        expect(new Set(QUOTES.map(quote => quote.id)).size).toBe(QUOTE_COUNT);
        expect(new Set(QUOTES.map(quote => quote.text)).size).toBe(QUOTE_COUNT);
        expect(QUOTE_SOURCES.length).toBeGreaterThanOrEqual(10);
        expect(QUOTES.every(quote => quote.author !== 'LifeTracker original')).toBe(true);
        expect(QUOTES.every(quote => quote.source && quote.section && quote.sourceUrl && quote.license)).toBe(true);
        expect(QUOTES.every(quote => (quote.text.match(/"/g) || []).length % 2 === 0)).toBe(true);
    });

    it('builds a complete deck and prevents a boundary repeat', () => {
        const firstId = QUOTES[0].id;
        const deck = buildShuffledQuoteDeck(firstId, () => 0.999999);

        expect(deck).toHaveLength(QUOTE_COUNT);
        expect(new Set(deck).size).toBe(QUOTE_COUNT);
        expect(deck[0]).not.toBe(firstId);
    });

    it('keeps one quote stable during a login and advances after reset', () => {
        const first = getQuoteForCurrentLogin();
        const sameSession = getQuoteForCurrentLogin();

        resetQuoteForNextLogin();
        const nextLogin = getQuoteForCurrentLogin();

        expect(sameSession.id).toBe(first.id);
        expect(nextLogin.id).not.toBe(first.id);
    });
});
