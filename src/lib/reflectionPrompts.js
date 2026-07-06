const FOCUS_PROMPTS = [
    'What is the one thing you want to accomplish today?',
    'Which task, if done today, makes everything else easier?',
    'What deserves your deepest attention today?',
    'What would make today feel like a win by 9pm?',
    'What have you been avoiding that you could face today?',
];

const MORNING_PROMPTS = [
    'What are three things you are grateful for right now?',
    'Who made your life better recently — and how?',
    'What small comfort are you taking for granted?',
    'What about your body or health are you thankful for today?',
    'What opportunity are you grateful to have this week?',
    'What is something beautiful you noticed yesterday?',
    'Which past struggle are you now grateful for?',
];

const EVENING_PROMPTS = [
    'What went well today? What did you learn?',
    'What drained your energy today — and what restored it?',
    'What would you do differently if you relived today?',
    'What did you do today that your future self will thank you for?',
    'When did you feel most alive today?',
    'What almost derailed you today, and how did you respond?',
    'What is one thing you are proud of from today?',
];

function dayOfYear(date) {
    const start = new Date(date.getFullYear(), 0, 0);
    return Math.floor((date - start) / 86400000);
}

/** Deterministic rotating prompts — same prompts for the same calendar day. */
export function promptsForDate(date = new Date()) {
    const n = dayOfYear(date);
    return {
        focus: FOCUS_PROMPTS[n % FOCUS_PROMPTS.length],
        gratitude: MORNING_PROMPTS[n % MORNING_PROMPTS.length],
        review: EVENING_PROMPTS[n % EVENING_PROMPTS.length],
    };
}