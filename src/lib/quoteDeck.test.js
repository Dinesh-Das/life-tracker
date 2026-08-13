import { beforeEach, describe, expect, it } from 'vitest';
import { QUOTE_COUNT, QUOTE_SOURCES, QUOTES } from '../data/quotes';
import { buildShuffledQuoteDeck, getQuoteForCurrentLogin, resetQuoteForNextLogin } from './quoteDeck';

describe('login quote deck', () => {
    beforeEach(() => {
        localStorage.clear();
        sessionStorage.clear();
    });

    it('contains more than 1,000 unique, clear motivational quotes', () => {
        expect(QUOTE_COUNT).toBeGreaterThan(1000);
        expect(new Set(QUOTES.map(quote => quote.id)).size).toBe(QUOTE_COUNT);
        expect(new Set(QUOTES.map(quote => quote.text)).size).toBe(QUOTE_COUNT);
        expect(QUOTE_SOURCES.length).toBeGreaterThanOrEqual(16);
        expect(new Set(QUOTES.map(quote => quote.category)).size).toBeGreaterThanOrEqual(16);
        expect(QUOTES.every(quote => quote.text.length >= 45 && quote.text.length <= 160)).toBe(true);
        expect(QUOTES.every(quote => quote.meaning && quote.action)).toBe(true);
        expect(QUOTES.every(quote => quote.kind === 'original')).toBe(true);
        expect(QUOTES.every(quote => quote.license.includes('not official character dialogue'))).toBe(true);
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
