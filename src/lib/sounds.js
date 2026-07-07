/**
 * Sound & haptic themes — every completion sound is synthesized with
 * WebAudio, honoring the app's "no external assets" privacy posture.
 *
 * The theme and haptics preferences are stored locally on the device
 * (UI polish, not tracked data — same treatment as the celebration ledger).
 */

const THEME_KEY = 'lt_sound_theme';
const HAPTICS_KEY = 'lt_haptics';

export const SOUND_THEMES = [
    { id: 'chime', label: 'Classic Chime', emoji: '🎐', hint: 'Gentle C–E–G arpeggio' },
    { id: 'bowl', label: 'Singing Bowl', emoji: '🎵', hint: 'Deep, slow resonance' },
    { id: 'forest', label: 'Forest Birds', emoji: '🐦', hint: 'Bright morning chirps' },
    { id: 'silent', label: 'Silent', emoji: '🔇', hint: 'No sounds at all' },
];

export function getSoundTheme() {
    try {
        const t = localStorage.getItem(THEME_KEY);
        return SOUND_THEMES.some(x => x.id === t) ? t : 'chime';
    } catch {
        return 'chime';
    }
}

export function setSoundTheme(id) {
    try { localStorage.setItem(THEME_KEY, id); } catch { /* noop */ }
}

export function getHaptics() {
    try { return localStorage.getItem(HAPTICS_KEY) !== 'off'; } catch { return true; }
}

export function setHaptics(on) {
    try { localStorage.setItem(HAPTICS_KEY, on ? 'on' : 'off'); } catch { /* noop */ }
}

/** Vibrate (when supported and enabled) — pattern in ms. */
export function buzz(pattern = 15) {
    try {
        if (getHaptics() && typeof navigator !== 'undefined' && navigator.vibrate) {
            navigator.vibrate(pattern);
        }
    } catch { /* noop */ }
}

function audioContext() {
    const Ctx = window.AudioContext || window.webkitAudioContext;
    return Ctx ? new Ctx() : null;
}

/** Schedule one enveloped oscillator note; optional pitch glide for chirps. */
function note(ctx, { freq, at = 0, dur = 0.8, peak = 0.2, type = 'sine', glideTo = null }) {
    const osc = ctx.createOscillator();
    const gain = ctx.createGain();
    const t = ctx.currentTime + at;
    osc.type = type;
    osc.frequency.setValueAtTime(freq, t);
    if (glideTo) osc.frequency.exponentialRampToValueAtTime(glideTo, t + dur);
    gain.gain.setValueAtTime(0.0001, t);
    gain.gain.exponentialRampToValueAtTime(peak, t + 0.03);
    gain.gain.exponentialRampToValueAtTime(0.0001, t + dur);
    osc.connect(gain);
    gain.connect(ctx.destination);
    osc.start(t);
    osc.stop(t + dur + 0.1);
}

const THEME_NOTES = {
    chime: {
        completion: [
            { freq: 523.25, at: 0, dur: 0.9, peak: 0.2 },
            { freq: 659.25, at: 0.15, dur: 0.9, peak: 0.2 },
            { freq: 783.99, at: 0.3, dur: 0.9, peak: 0.2 },
        ],
        tick: [{ freq: 659.25, at: 0, dur: 0.25, peak: 0.1 }],
    },
    bowl: {
        completion: [
            { freq: 196, at: 0, dur: 3, peak: 0.25 },
            { freq: 392, at: 0, dur: 2.4, peak: 0.08 },
            { freq: 587.33, at: 0, dur: 1.8, peak: 0.04 },
        ],
        tick: [{ freq: 392, at: 0, dur: 0.6, peak: 0.09 }],
    },
    forest: {
        completion: [
            { freq: 1800, glideTo: 2350, at: 0, dur: 0.18, peak: 0.08 },
            { freq: 2100, glideTo: 2600, at: 0.25, dur: 0.15, peak: 0.08 },
            { freq: 1600, glideTo: 2200, at: 0.5, dur: 0.2, peak: 0.08 },
        ],
        tick: [{ freq: 1900, glideTo: 2400, at: 0, dur: 0.14, peak: 0.06 }],
    },
    silent: { completion: [], tick: [] },
};

function play(kind) {
    try {
        const notes = THEME_NOTES[getSoundTheme()]?.[kind] || [];
        if (notes.length === 0) return;
        const ctx = audioContext();
        if (!ctx) return;
        notes.forEach(n => note(ctx, n));
    } catch { /* noop */ }
}

/** Full theme melody — focus session end, milestones. */
export function playCompletion() { play('completion'); }

/** Short, soft cue — a single habit check. */
export function playTick() { play('tick'); }