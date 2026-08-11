import quotes from './quotes.generated.json';

export const QUOTES = quotes;
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
