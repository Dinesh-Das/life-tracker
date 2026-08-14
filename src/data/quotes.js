import { MOTIVATIONAL_QUOTES } from './motivationalQuotes';
import CLASSIC_QUOTES from './quotes.generated.json';

/**
 * Source-linked classic quotations live beside clearly labelled original
 * anime/workout motivation. `kind` prevents inspired writing from ever being
 * presented as dialogue spoken by a real person or character.
 */
export const REAL_QUOTES = Object.freeze(CLASSIC_QUOTES.map(quote => Object.freeze({
    ...quote,
    kind: 'quotation',
})));

export const QUOTES = Object.freeze([...MOTIVATIONAL_QUOTES, ...REAL_QUOTES]);
export const QUOTE_COUNT = QUOTES.length;

export const QUOTE_SOURCES = [...new Map(QUOTES.map(quote => [
    `${quote.author}|${quote.source}`,
    {
        author: quote.author,
        source: quote.source,
        translator: quote.translator,
        sourceUrl: quote.sourceUrl,
        license: quote.license,
    },
])).values()];
