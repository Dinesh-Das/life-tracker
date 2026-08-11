const TOPIC_GUIDES = {
    wisdom: {
        meaning: 'Do not accept your first impression automatically. Examine what is true, what is assumed, and what a thoughtful response would be.',
        action: 'Before one decision today, separate the facts from your assumptions.',
    },
    time: {
        meaning: 'Life and time are limited. The useful moment is the present, so do not keep postponing what genuinely matters.',
        action: 'Spend ten focused minutes on something important you have been delaying.',
    },
    spirituality: {
        meaning: 'Your life is larger than immediate comfort or success. Act in a way that respects your deepest values and your connection with others.',
        action: 'Pause for one quiet minute and name the value you want to live by today.',
    },
    resilience: {
        meaning: 'Hardship does not have to control your character. You can accept that something is difficult and still choose your next response.',
        action: 'Choose one difficulty and identify the smallest useful step still under your control.',
    },
    'human nature': {
        meaning: 'People are influenced by fear, desire, pride, habit, and circumstance. Understanding those forces helps you respond more wisely.',
        action: 'In one tense interaction, become curious about the motive behind the behaviour.',
    },
    character: {
        meaning: 'Who you become is shaped by the standards you keep when nobody is rewarding or watching you.',
        action: 'Keep one small promise to yourself today, especially if it is inconvenient.',
    },
    ambition: {
        meaning: 'Wanting more is useful only when it is directed by a worthy goal. Power, wealth, or success without judgment can become destructive.',
        action: 'Write down what your current ambition is meant to improve—not merely what it will give you.',
    },
    'self-control': {
        meaning: 'A feeling or impulse can be real without becoming an order. Create a pause, then choose the response that serves you best.',
        action: 'When a strong emotion appears, take one slow breath before speaking or acting.',
    },
    leadership: {
        meaning: 'Leadership is measured by judgment, example, and responsibility—not only authority. Your choices shape the people who depend on you.',
        action: 'Make one expectation clearer and model it yourself before asking it of someone else.',
    },
    focus: {
        meaning: 'Attention becomes powerful when it is protected from competing demands and given fully to one worthwhile task.',
        action: 'Remove one distraction and work on a single task for twenty uninterrupted minutes.',
    },
    courage: {
        meaning: 'Courage does not require the absence of fear. It means acting for a sound reason even while fear is present.',
        action: 'Do one small thing you have been avoiding because it feels uncomfortable.',
    },
    purpose: {
        meaning: 'A clear reason for acting makes difficulty easier to carry and helps you decide what deserves your energy.',
        action: 'Complete this sentence: “Today this matters because…”',
    },
    discipline: {
        meaning: 'Reliable progress comes from repeated action, not from waiting for motivation. Small standards become strong through practice.',
        action: 'Perform the smallest version of an important habit before the day ends.',
    },
    peace: {
        meaning: 'Calm is not passivity. It is the ability to see clearly and respond without adding unnecessary conflict inside or around you.',
        action: 'Let one minor provocation pass without feeding it more attention.',
    },
    strategy: {
        meaning: 'Do not spend effort blindly. Understand the conditions, anticipate consequences, and choose the path that avoids unnecessary cost.',
        action: 'Before acting, write down the result you want and the biggest obstacle you can foresee.',
    },
    duty: {
        meaning: 'Some actions are worth doing because they are right or necessary, even when they bring no immediate reward.',
        action: 'Finish one responsibility today without waiting for praise or perfect motivation.',
    },
};

const ARCHAIC_REPLACEMENTS = [
    [/\bthou art\b/gi, 'you are'],
    [/\bthou hast\b/gi, 'you have'],
    [/\bthou shalt\b/gi, 'you will'],
    [/\bthou wilt\b/gi, 'you will'],
    [/\bthou dost\b/gi, 'you do'],
    [/\bthou canst\b/gi, 'you can'],
    [/\bthou shouldst\b/gi, 'you should'],
    [/\bthou wouldst\b/gi, 'you would'],
    [/\bthou\b/gi, 'you'],
    [/\bthee\b/gi, 'you'],
    [/\bthy\b/gi, 'your'],
    [/\bthine\b/gi, 'yours'],
    [/\bhath\b/gi, 'has'],
    [/\bdoth\b/gi, 'does'],
    [/\bwhosoever\b/gi, 'whoever'],
    [/\bwhatsoever\b/gi, 'whatever'],
    [/\bwherefore\b/gi, 'for that reason'],
    [/\bwherein\b/gi, 'in which'],
    [/\btherein\b/gi, 'in it'],
    [/\bthereof\b/gi, 'of it'],
    [/\bthereby\b/gi, 'by that'],
    [/\bunto\b/gi, 'to'],
    [/\bamongst\b/gi, 'among'],
    [/\bwhilst\b/gi, 'while'],
    [/\bere\b/gi, 'before'],
    [/\bnought\b/gi, 'nothing'],
    [/\baught\b/gi, 'anything'],
    [/\bbecometh\b/gi, 'becomes'],
    [/\bknoweth\b/gi, 'knows'],
    [/\bmaketh\b/gi, 'makes'],
    [/\bgiveth\b/gi, 'gives'],
    [/\bgoeth\b/gi, 'goes'],
    [/\bcometh\b/gi, 'comes'],
    [/\bliveth\b/gi, 'lives'],
    [/\bspeaketh\b/gi, 'speaks'],
    [/\bseeth\b/gi, 'sees'],
];

function preserveInitialCapital(original, replacement) {
    if (original[0] === original[0].toUpperCase()) {
        return replacement.charAt(0).toUpperCase() + replacement.slice(1);
    }
    return replacement;
}

export function modernizeArchaicLanguage(text) {
    let modernText = text;
    for (const [pattern, replacement] of ARCHAIC_REPLACEMENTS) {
        modernText = modernText.replace(pattern, match => preserveInitialCapital(match, replacement));
    }
    return modernText === text ? null : modernText;
}

export function getQuoteGuide(quote) {
    const guide = TOPIC_GUIDES[quote.topic] || TOPIC_GUIDES.wisdom;
    return {
        ...guide,
        modernText: modernizeArchaicLanguage(quote.text),
    };
}

export const GUIDED_QUOTE_TOPICS = Object.freeze(Object.keys(TOPIC_GUIDES));
