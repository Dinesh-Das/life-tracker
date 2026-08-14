import { QUOTES } from '../data/quotes';
import { CURRENT_QUOTE_KEY } from './quoteSession';
export { resetQuoteForNextLogin } from './quoteSession';

const QUOTE_DECK_KEY = 'lt_quote_deck_v4';
const LAST_QUOTE_KEY = 'lt_last_quote_v4';

const quotesById = new Map(QUOTES.map(quote => [quote.id, quote]));
let fallbackLastQuoteId = null;

function randomValue() {
    if (globalThis.crypto?.getRandomValues) {
        const value = new Uint32Array(1);
        globalThis.crypto.getRandomValues(value);
        return value[0] / 4294967296;
    }
    return Math.random();
}

function randomQuoteWithoutImmediateRepeat() {
    const lastTopic = quotesById.get(fallbackLastQuoteId)?.topic;
    const available = QUOTES.filter(quote => (
        quote.id !== fallbackLastQuoteId && quote.topic !== lastTopic
    ));
    const quote = available[Math.floor(randomValue() * available.length)] || QUOTES[0];
    fallbackLastQuoteId = quote.id;
    return quote;
}

export function buildShuffledQuoteDeck(lastQuoteId = null, random = randomValue) {
    const buckets = new Map();
    for (const quote of QUOTES) {
        const ids = buckets.get(quote.topic) || [];
        ids.push(quote.id);
        buckets.set(quote.topic, ids);
    }

    for (const ids of buckets.values()) {
        for (let index = ids.length - 1; index > 0; index -= 1) {
            const swapIndex = Math.floor(random() * (index + 1));
            [ids[index], ids[swapIndex]] = [ids[swapIndex], ids[index]];
        }
    }

    const deck = [];
    let previousTopic = quotesById.get(lastQuoteId)?.topic || null;

    while (deck.length < QUOTES.length) {
        const nonEmptyBuckets = [...buckets.entries()].filter(([, ids]) => ids.length > 0);
        const eligibleBuckets = nonEmptyBuckets.some(([topic]) => topic !== previousTopic)
            ? nonEmptyBuckets.filter(([topic]) => topic !== previousTopic)
            : nonEmptyBuckets;
        const largestBucketSize = Math.max(...eligibleBuckets.map(([, ids]) => ids.length));
        const topics = eligibleBuckets
            .filter(([, ids]) => ids.length === largestBucketSize)
            .map(([topic]) => topic);
        const topic = topics[Math.floor(random() * topics.length)];
        const ids = buckets.get(topic);

        deck.push(ids.pop());
        previousTopic = topic;
    }

    return deck;
}

function readStoredDeck() {
    try {
        const stored = JSON.parse(localStorage.getItem(QUOTE_DECK_KEY) || '[]');
        if (!Array.isArray(stored)) return [];

        const seen = new Set();
        return stored.filter(id => {
            if (!quotesById.has(id) || seen.has(id)) return false;
            seen.add(id);
            return true;
        });
    } catch {
        return [];
    }
}

export function getQuoteForCurrentLogin() {
    try {
        const currentId = sessionStorage.getItem(CURRENT_QUOTE_KEY);
        const currentQuote = quotesById.get(currentId);
        if (currentQuote) return currentQuote;

        let deck = readStoredDeck();
        if (deck.length === 0) {
            deck = buildShuffledQuoteDeck(localStorage.getItem(LAST_QUOTE_KEY));
        }

        const nextId = deck.shift();
        const nextQuote = quotesById.get(nextId) || QUOTES[0];

        sessionStorage.setItem(CURRENT_QUOTE_KEY, nextQuote.id);
        localStorage.setItem(QUOTE_DECK_KEY, JSON.stringify(deck));
        localStorage.setItem(LAST_QUOTE_KEY, nextQuote.id);
        return nextQuote;
    } catch {
        return randomQuoteWithoutImmediateRepeat();
    }
}
