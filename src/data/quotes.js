import { MOTIVATIONAL_QUOTES } from './motivationalQuotes';

export const QUOTES = MOTIVATIONAL_QUOTES;
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
