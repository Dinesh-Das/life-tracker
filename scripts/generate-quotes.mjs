import { createHash } from 'node:crypto';
import { writeFile } from 'node:fs/promises';
import { JSDOM } from 'jsdom';

const OUTPUT_PATH = new URL('../src/data/quotes.generated.json', import.meta.url);
const QUOTES_PER_SOURCE = 100;

const GUTENBERG_SOURCES = [
    {
        ebookId: 2680,
        author: 'Marcus Aurelius',
        source: 'Meditations',
        translator: 'Meric Casaubon',
        start: /^THE FIRST BOOK$/i,
        section: /^THE (?:FIRST|SECOND|THIRD|FOURTH|FIFTH|SIXTH|SEVENTH|EIGHTH|NINTH|TENTH|ELEVENTH|TWELFTH) BOOK$/i,
    },
    {
        ebookId: 10661,
        author: 'Epictetus',
        source: 'A Selection from the Discourses and the Encheiridion',
        translator: 'George Long',
        start: /^A SELECTION FROM THE DISCOURSES OF EPICTETUS\.$/i,
        section: /^(?:THE ENCHEIRIDION, OR MANUAL\.|[IVXLCDM]+\.)$/i,
    },
    {
        ebookId: 64576,
        author: 'Seneca',
        source: 'Minor Dialogues and On Clemency',
        translator: 'Aubrey Stewart',
        start: /^THE FIRST BOOK OF THE DIALOGUES/i,
        section: /^(?:THE \w+ BOOK OF THE DIALOGUES|THE \w+ BOOK OF THE DIALOGUE)/i,
    },
    {
        ebookId: 132,
        author: 'Sun Tzu',
        source: 'The Art of War',
        translator: 'Lionel Giles',
        start: /^Chapter I\. LAYING PLANS$/i,
        section: /^Chapter [IVXLCDM]+\./i,
        elementFilter: element => !element.classList.contains('p1') && !element.textContent.trim().startsWith('['),
    },
    {
        ebookId: 1232,
        author: 'Niccolò Machiavelli',
        source: 'The Prince',
        translator: 'W. K. Marriott',
        start: /^CHAPTER I\./i,
        section: /^CHAPTER [IVXLCDM]+\./i,
    },
    {
        ebookId: 4363,
        author: 'Friedrich Nietzsche',
        source: 'Beyond Good and Evil',
        translator: 'Helen Zimmern',
        start: /^CHAPTER I\. PREJUDICES OF PHILOSOPHERS$/i,
        section: /^CHAPTER [IVXLCDM]+\./i,
    },
    {
        ebookId: 2388,
        author: 'Bhagavad Gita',
        source: 'The Song Celestial',
        translator: 'Sir Edwin Arnold',
        start: /^CHAPTER I$/i,
        section: /^CHAPTER [IVXLCDM]+$/i,
    },
    {
        ebookId: 72368,
        author: 'Swami Vivekananda',
        source: 'Jnâna Yoga, Part II',
        translator: null,
        start: /^I$/,
        stopContent: /^NEW BOOK BY/i,
        section: /^[IVXLCDM]+$/,
    },
    {
        ebookId: 10827,
        author: 'Niccolò Machiavelli',
        source: 'Discourses on the First Decade of Titus Livius',
        translator: 'Ninian Hill Thomson',
        start: /^DISCOURSES$/i,
        section: /^(?:BOOK [IVXLCDM]+\.|CHAPTER [IVXLCDM]+\.)/i,
    },
    {
        ebookId: 1998,
        author: 'Friedrich Nietzsche',
        source: 'Thus Spake Zarathustra',
        translator: 'Thomas Common',
        start: /^ZARATHUSTRA'S PROLOGUE\.$/i,
        section: /^(?:[IVXLCDM]+\.|THUS SPAKE ZARATHUSTRA\.)/i,
    },
    {
        ebookId: 13268,
        author: 'Valmiki',
        source: 'Selections from the Rámáyana',
        translator: 'R. T. H. Griffith',
        start: /^THE R.+M.+YANA$/i,
        stop: /AKOONTAL/i,
        section: /^(?:BOOK [IVXLCDM]+|CANTO [IVXLCDM]+\b)/i,
    },
];

const TOPICS = [
    ['discipline', /\b(discipline|practice|training|labou?r|effort|habit|steadfast|persever)\w*/gi],
    ['self-control', /\b(self-control|temperance|restrain|desire|passion|anger|appetite|command yourself)\w*/gi],
    ['courage', /\b(courage|fear|brave|bold|danger|coward|daring|valiant)\w*/gi],
    ['resilience', /\b(adversity|endure|suffer|hardship|misfortune|pain|recover|bear)\w*/gi],
    ['strategy', /\b(strategy|enemy|victory|war|battle|tactic|plan|advantage|defeat)\w*/gi],
    ['leadership', /\b(leader|leadership|ruler|king|prince|command|govern|people|state)\w*/gi],
    ['duty', /\b(duty|obligation|service|right action|conduct|responsibility)\w*/gi],
    ['wisdom', /\b(wisdom|wise|knowledge|reason|judgment|understand|learn|philosoph)\w*/gi],
    ['time', /\b(time|day|hour|life|death|present|future|past|delay)\w*/gi],
    ['purpose', /\b(purpose|meaning|aim|end|goal|calling|worthy)\w*/gi],
    ['focus', /\b(focus|attention|concentrat|distraction|single|mindful)\w*/gi],
    ['character', /\b(character|virtue|honou?r|integrity|noble|good man|excellence)\w*/gi],
    ['peace', /\b(peace|calm|tranquil|quiet|harmony|gentle|stillness)\w*/gi],
    ['human nature', /\b(human nature|mankind|men|people|friend|love|hate|society)\w*/gi],
    ['spirituality', /\b(soul|spirit|divine|God|faith|eternal|heaven|sacred)\w*/gi],
    ['ambition', /\b(ambition|success|wealth|fortune|power|greatness|achievement)\w*/gi],
];

const RELEVANT_WORDS = new RegExp(TOPICS.map(([, pattern]) => pattern.source).join('|'), 'i');
const BOILERPLATE = /project gutenberg|gutenberg-tm|transcriber|ebook|copyright|table of contents|all rights reserved|www\.|https?:|\*\*\*|illustration/i;
const CONTEXT_DEPENDENT_START = /^(?:and|but|or|nor|yet|therefore|however|hence|then|thereupon|this|that|these|those|such|he|she|they|his|her|their|it|the latter|the former|after which|for this reason|of these|in consequence|as aforesaid)\b/i;
const segmenter = new Intl.Segmenter('en', { granularity: 'sentence' });

function normalizeText(value) {
    const normalized = value
        .normalize('NFC')
        .replace(/\u00ad/g, '')
        .replace(/[“”]/g, '"')
        .replace(/[‘’]/g, "'")
        .replace(/\s+/g, ' ')
        .replace(/^(?:[IVXLCDM]+[.)]|\d+(?:,\s*\d+)?[.)]?)\s+/i, '')
        .replace(/\s+([,.;:!?])/g, '$1')
        .trim();

    // Remove a pair of quotation marks only when they wrap the entire excerpt.
    // A blanket trailing-quote removal corrupts dialogue such as: He said, "Go!"
    if ((normalized.startsWith('"') && normalized.endsWith('"'))
        || (normalized.startsWith("'") && normalized.endsWith("'"))) {
        return normalized.slice(1, -1).trim();
    }
    return normalized;
}

function cleanElementText(element) {
    const clone = element.cloneNode(true);
    clone.querySelectorAll('.pagenum, .footnote, sup, a[role="doc-noteref"]').forEach(node => node.remove());
    return normalizeText(clone.textContent);
}

function isCompleteQuote(text) {
    const words = text.split(/\s+/);
    if (text.length < 60 || text.length > 260 || words.length < 10 || words.length > 46) return false;
    if (!/^[A-ZÀ-ÖØ-Þ]/.test(text)) return false;
    if (!/[.!?]$/.test(text) || BOILERPLATE.test(text) || CONTEXT_DEPENDENT_START.test(text)) return false;
    if (!RELEVANT_WORDS.test(text) || /[\[\]{}]|_{2,}|\.{3}/.test(text)) return false;
    if ((text.match(/"/g) || []).length % 2 !== 0) return false;
    if ((text.match(/[A-Za-z]/g) || []).length < text.length * 0.55) return false;
    return true;
}

function classifyTopic(text) {
    let bestTopic = 'wisdom';
    let bestScore = 0;

    for (const [topic, pattern] of TOPICS) {
        pattern.lastIndex = 0;
        const score = (text.match(pattern) || []).length;
        if (score > bestScore) {
            bestTopic = topic;
            bestScore = score;
        }
    }

    return bestTopic;
}

function candidateScore(text) {
    const idealLength = 150;
    let score = 100 - Math.abs(text.length - idealLength) / 3;
    if (/^(?:Do|Let|Choose|Remember|Consider|Know|Keep|Never|Always|Be|Act|Seek|Make|Take|Hold)\b/i.test(text)) score += 12;
    if (/[;:]/.test(text)) score += 4;
    if (/\b(?:you|your|we|our)\b/i.test(text)) score += 4;
    if (/\b(?:said|replied|asked|cried)\b/i.test(text)) score -= 8;
    return score;
}

function stableId(author, source, text) {
    return `quote-${createHash('sha1').update(`${author}|${source}|${text}`).digest('hex').slice(0, 14)}`;
}

async function fetchWithRetries(url, attempts = 3) {
    for (let attempt = 1; attempt <= attempts; attempt += 1) {
        try {
            const response = await fetch(url, { headers: { 'User-Agent': 'LifeTracker public-domain quote dataset builder' } });
            if (response.ok) return response;
            if (response.status === 404) return null;
        } catch {
            // Project Gutenberg occasionally closes long-running download
            // sockets; a short retry keeps regeneration deterministic.
        }
        await new Promise(resolve => setTimeout(resolve, attempt * 400));
    }
    return null;
}

function quoteRecord(source, text, section) {
    return {
        id: stableId(source.author, source.source, text),
        text,
        author: source.author,
        source: source.source,
        section,
        translator: source.translator,
        topic: classifyTopic(text),
        sourceUrl: source.sourceUrl,
        license: source.license,
    };
}

async function fetchGutenbergHtml(ebookId) {
    const urls = [
        `https://www.gutenberg.org/cache/epub/${ebookId}/pg${ebookId}-images.html`,
        `https://www.gutenberg.org/files/${ebookId}/${ebookId}-h/${ebookId}-h.htm`,
    ];

    for (const url of urls) {
        const response = await fetchWithRetries(url);
        if (response) return response.text();
    }

    throw new Error(`Unable to download Project Gutenberg ebook ${ebookId}`);
}

function chooseBalancedCandidates(candidates, count) {
    const sections = new Map();
    for (const candidate of candidates) {
        const list = sections.get(candidate.section) || [];
        list.push(candidate);
        sections.set(candidate.section, list);
    }

    const queues = [...sections.values()].map(items => items.sort((a, b) => b.score - a.score));
    const chosen = [];
    while (chosen.length < count && queues.some(queue => queue.length > 0)) {
        for (const queue of queues) {
            if (queue.length > 0 && chosen.length < count) chosen.push(queue.shift());
        }
    }
    return chosen;
}

async function extractGutenbergQuotes(config) {
    const html = await fetchGutenbergHtml(config.ebookId);
    const document = new JSDOM(html).window.document;
    document.querySelectorAll('script, style, nav, header, footer, .pg-boilerplate, .footnote').forEach(node => node.remove());

    const source = {
        ...config,
        sourceUrl: `https://www.gutenberg.org/ebooks/${config.ebookId}`,
        license: 'Project Gutenberg — public domain in the USA',
    };
    const candidates = [];
    const seen = new Set();
    let started = false;
    let section = config.source;

    for (const element of document.querySelectorAll('h1, h2, h3, h4, h5, p, li, div.poem')) {
        const rawText = cleanElementText(element);
        const isHeading = /^H[1-5]$/.test(element.tagName);

        if (isHeading) {
            if (started && config.stop?.test(rawText)) break;
            if (!started && config.start.test(rawText)) started = true;
            if (started && config.section.test(rawText)) section = rawText;
            if (/FULL PROJECT GUTENBERG/i.test(rawText)) break;
            continue;
        }

        if (!started || rawText.length < 60 || BOILERPLATE.test(rawText)) continue;
        if (config.stopContent?.test(rawText)) break;
        if (config.elementFilter && !config.elementFilter(element)) continue;

        for (const sentence of segmenter.segment(rawText)) {
            const text = normalizeText(sentence.segment);
            const dedupeKey = text.toLowerCase();
            if (!isCompleteQuote(text) || seen.has(dedupeKey)) continue;
            seen.add(dedupeKey);
            candidates.push({ ...quoteRecord(source, text, section), score: candidateScore(text) });
        }
    }

    const chosen = chooseBalancedCandidates(candidates, QUOTES_PER_SOURCE);
    if (chosen.length < QUOTES_PER_SOURCE) {
        throw new Error(`${config.source} produced only ${chosen.length} usable quotes`);
    }
    return chosen.map(({ score: _score, ...quote }) => quote);
}

async function extractArthashastraQuotes() {
    const source = {
        author: 'Kautilya (Chanakya)',
        source: "Kautilya's Arthashastra",
        translator: 'R. Shamasastry',
        sourceUrl: 'https://www.swaveda.com/texts/arthashastra/',
        license: 'R. Shamasastry translation (1915) — public domain',
    };
    // Book I is the part focused on discipline, education, counsel, leadership,
    // and personal conduct. Later books become highly technical administrative
    // manuals and do not work well as standalone quotations.
    const chapterUrls = Array.from({ length: 21 }, (_, index) => `https://www.swaveda.com/texts/arthashastra/${index + 1}/`);
    const pages = await Promise.all(chapterUrls.map(async url => {
        const response = await fetchWithRetries(url);
        if (!response) return [];

        const document = new JSDOM(await response.text()).window.document;
        const title = normalizeText(document.querySelector('h1')?.textContent || "Kautilya's Arthashastra");
        const candidates = [];
        let reachedCommentary = false;

        for (const element of document.querySelectorAll('main h2, main p')) {
            if (element.tagName === 'H2' && /commentary/i.test(element.textContent)) {
                reachedCommentary = true;
                continue;
            }
            if (reachedCommentary || element.tagName !== 'P' || element.className) continue;

            const paragraph = cleanElementText(element);
            for (const sentence of segmenter.segment(paragraph)) {
                const text = normalizeText(sentence.segment);
                if (isCompleteQuote(text)) candidates.push({ ...quoteRecord(source, text, title), score: candidateScore(text) });
            }
        }
        return candidates;
    }));

    const unique = [...new Map(pages.flat().map(quote => [quote.text.toLowerCase(), quote])).values()];
    const chosen = chooseBalancedCandidates(unique, QUOTES_PER_SOURCE);
    if (chosen.length < QUOTES_PER_SOURCE) {
        throw new Error(`Arthashastra produced only ${chosen.length} usable quotes`);
    }
    return chosen.map(({ score: _score, ...quote }) => quote);
}

async function main() {
    const collections = [];
    for (const source of GUTENBERG_SOURCES) {
        const quotes = await extractGutenbergQuotes(source);
        collections.push(quotes);
        console.log(`${source.author}: ${quotes.length} quotes from ${source.source}`);
    }
    const arthashastra = await extractArthashastraQuotes();
    collections.push(arthashastra);
    console.log(`Kautilya (Chanakya): ${arthashastra.length} quotes from Kautilya's Arthashastra`);

    const quotes = collections.flat();
    const uniqueTexts = new Set(quotes.map(quote => quote.text.toLowerCase()));
    if (quotes.length < 1000 || uniqueTexts.size !== quotes.length) {
        throw new Error(`Expected 1,000+ unique quotes; generated ${quotes.length} (${uniqueTexts.size} unique)`);
    }

    await writeFile(OUTPUT_PATH, `${JSON.stringify(quotes, null, 2)}\n`, 'utf8');
    console.log(`Wrote ${quotes.length} verified quotations to ${OUTPUT_PATH.pathname}`);
}

await main();
