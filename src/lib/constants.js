// ═══════════════════════════════════════════════════
// Default Habits — 15 preloaded, user-deletable
// ═══════════════════════════════════════════════════
export const DEFAULT_HABITS = [
    { name: 'Wake Up Early (5 AM)', emoji: '⏰', goal: 30, category: 'Health' },
    { name: 'Workout / Gym', emoji: '💪', goal: 30, category: 'Health' },
    { name: 'Drink 3L Water', emoji: '💧', goal: 30, category: 'Health' },
    { name: 'Cold Shower', emoji: '🧊', goal: 30, category: 'Health' },
    { name: 'No Junk Food', emoji: '🥗', goal: 30, category: 'Health' },
    { name: 'Read 20 Pages', emoji: '📚', goal: 30, category: 'Mind' },
    { name: 'Day Planning', emoji: '📋', goal: 30, category: 'Mind' },
    { name: 'Goal Journaling', emoji: '📓', goal: 30, category: 'Mind' },
    { name: 'Social Media Detox', emoji: '📵', goal: 30, category: 'Mind' },
    { name: 'Meditation / Prayer', emoji: '🧘', goal: 30, category: 'Mind' },
    { name: 'No Alcohol / Smoking', emoji: '🚫', goal: 30, category: 'Health' },
    { name: 'Budget Tracking', emoji: '💰', goal: 30, category: 'Finance' },
    { name: 'Project Work (2hr+)', emoji: '💻', goal: 30, category: 'Work' },
    { name: 'Learn a New Skill', emoji: '🎯', goal: 30, category: 'Work' },
    { name: 'Connect with Family', emoji: '❤️', goal: 30, category: 'Social' },
];

// Keep legacy export name for backward compat
export const DEFAULT_HABIT_NAMES = DEFAULT_HABITS;

export const CATEGORIES = ['Health', 'Mind', 'Work', 'Finance', 'Social', 'Female'];

export const MONTHS = [
    'Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun',
    'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'
];

export const MONTHS_FULL = [
    'January', 'February', 'March', 'April', 'May', 'June',
    'July', 'August', 'September', 'October', 'November', 'December'
];

export const CYCLE_PHASES = {
    MENSTRUAL: 'Menstrual',
    FOLLICULAR: 'Follicular',
    OVULATORY: 'Ovulatory',
    LUTEAL: 'Luteal'
};

export const EMOJI_LIST = [
    '⏰', '💪', '🌽', '📋', '💰', '💻', '🚫', '📵', '📓', '🧊',
    '🏃', '🥗', '📚', '🧘', '💧', '🎯', '🛌', '☀️', '🌙', '✍️',
    '🎸', '🏋️', '🤸', '🧠', '❤️', '🦷', '🥤', '🚴', '🎨', '🙏',
    '🎵', '🍎', '💊', '🧹', '📞', '🌿', '🏊', '🚶', '🍵', '⭐',
];

// ═══════════════════════════════════════════════════
// Female Tracker Constants
// ═══════════════════════════════════════════════════

export const FLOW_LEVELS = [
    { id: 'none', label: 'None', emoji: '⚪', color: '#E5E7EB', sheetValue: 'None' },
    { id: 'spotting', label: 'Spotting', emoji: '🩷', color: '#FBCFE8', sheetValue: 'Spotting' },
    { id: 'light', label: 'Light', emoji: '🩸', color: '#FDA4AF', sheetValue: 'Light' },
    { id: 'medium', label: 'Medium', emoji: '🩸🩸', color: '#FB7185', sheetValue: 'Medium' },
    { id: 'heavy', label: 'Heavy', emoji: '🩸🩸🩸', color: '#E11D48', sheetValue: 'Heavy' },
];

export const CRAMPS_LEVELS = [
    { id: 'none', label: 'None', emoji: '😌', color: 'emerald', sheetValue: 'None' },
    { id: 'mild', label: 'Mild', emoji: '😐', color: 'amber', sheetValue: 'Mild' },
    { id: 'moderate', label: 'Moderate', emoji: '😣', color: 'orange', sheetValue: 'Moderate' },
    { id: 'severe', label: 'Severe', emoji: '😫', color: 'rose', sheetValue: 'Severe' },
];

export const MOOD_OPTIONS = [
    { id: 'happy', label: 'Happy', emoji: '😊', color: 'emerald' },
    { id: 'calm', label: 'Calm', emoji: '😌', color: 'sky' },
    { id: 'energetic', label: 'Energetic', emoji: '⚡', color: 'amber' },
    { id: 'sad', label: 'Sad', emoji: '😢', color: 'blue' },
    { id: 'irritable', label: 'Irritable', emoji: '😤', color: 'rose' },
    { id: 'anxious', label: 'Anxious', emoji: '😰', color: 'purple' },
];

export const SYMPTOM_LIST = [
    { id: 'cramps', label: 'Cramps', emoji: '😫' },
    { id: 'headache', label: 'Headache', emoji: '🤕' },
    { id: 'bloating', label: 'Bloating', emoji: '🎈' },
    { id: 'breast_pain', label: 'Breast Pain', emoji: '😣' },
    { id: 'back_pain', label: 'Back Pain', emoji: '💔' },
    { id: 'fatigue', label: 'Fatigue', emoji: '😴' },
    { id: 'nausea', label: 'Nausea', emoji: '🤢' },
    { id: 'acne', label: 'Acne', emoji: '🔴' },
    { id: 'cravings', label: 'Cravings', emoji: '🍫' },
    { id: 'mood_swings', label: 'Mood Swings', emoji: '🌊' },
    { id: 'insomnia', label: 'Insomnia', emoji: '🌙' },
    { id: 'dizziness', label: 'Dizziness', emoji: '💫' },
];

export const CATEGORY_COLORS = {
    Health: '#2E7D32',
    Mind: '#1565C0',
    Work: '#E65100',
    Finance: '#F57F17',
    Social: '#6A1B9A',
    Female: '#C2185B',
};
