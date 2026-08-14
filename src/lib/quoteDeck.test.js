import { beforeEach, describe, expect, it } from 'vitest';
import { QUOTE_COUNT, QUOTE_SOURCES, QUOTES, REAL_QUOTES } from '../data/quotes';
import { buildShuffledQuoteDeck, getQuoteForCurrentLogin, resetQuoteForNextLogin } from './quoteDeck';

describe('login quote deck', () => {
    beforeEach(() => {
        localStorage.clear();
        sessionStorage.clear();
    });

    it('contains more than 1,000 real quotations plus original anime-style motivation', () => {
        expect(REAL_QUOTES.length).toBeGreaterThan(1000);
        expect(QUOTE_COUNT).toBeGreaterThan(2000);
        expect(new Set(QUOTES.map(quote => quote.id)).size).toBe(QUOTE_COUNT);
        expect(new Set(QUOTES.map(quote => quote.text)).size).toBe(QUOTE_COUNT);
        expect(QUOTE_SOURCES.length).toBeGreaterThanOrEqual(16);
        expect(QUOTES.every(quote => quote.text.length >= 45 && quote.text.length <= 260)).toBe(true);
        expect(REAL_QUOTES.every(quote => quote.kind === 'quotation')).toBe(true);
        expect(new Set(REAL_QUOTES.map(quote => quote.topic)).size).toBeGreaterThanOrEqual(12);
        expect(REAL_QUOTES.every(quote => quote.category !== 'Classic wisdom')).toBe(true);
        expect(REAL_QUOTES.every(quote => quote.sourceUrl && quote.license.includes('public domain'))).toBe(true);
        const originals = QUOTES.filter(quote => quote.kind === 'original');
        expect(new Set(originals.map(quote => quote.category)).size).toBeGreaterThanOrEqual(16);
        expect(originals.every(quote => quote.meaning && quote.action && quote.inspiredBy)).toBe(true);
        expect(originals.every(quote => quote.license.includes('not official character dialogue'))).toBe(true);
        expect(QUOTES.every(quote => (quote.text.match(/"/g) || []).length % 2 === 0)).toBe(true);
    });

    it('builds a complete deck and prevents a boundary repeat', () => {
        const firstId = QUOTES[0].id;
        const deck = buildShuffledQuoteDeck(firstId, () => 0.999999);

        expect(deck).toHaveLength(QUOTE_COUNT);
        expect(new Set(deck).size).toBe(QUOTE_COUNT);
        expect(deck[0]).not.toBe(firstId);

        const quotesById = new Map(QUOTES.map(quote => [quote.id, quote]));
        expect(deck.every((id, index) => (
            index === 0 || quotesById.get(id).topic !== quotesById.get(deck[index - 1]).topic
        ))).toBe(true);
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
