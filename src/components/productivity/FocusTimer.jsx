import { useState, useEffect, useRef, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Play, Pause, RotateCcw, Volume2, VolumeX, Coffee, Brain } from 'lucide-react';

const SESSIONS = {
    WORK: 25 * 60,
    SHORT: 5 * 60,
    LONG: 15 * 60
};

const SESSION_KEY = 'lt_focus_active';

const storageKey = spreadsheetId => spreadsheetId
    ? `${SESSION_KEY}:${encodeURIComponent(spreadsheetId)}`
    : null;

/** Restore an in-flight session (survives navigation / refresh). */
function restoreFocusSession(spreadsheetId) {
    const key = storageKey(spreadsheetId);
    if (!key) return null;
    try {
        // Legacy state is deliberately discarded because its account owner is
        // unknown. Never resume it for whichever user happens to sign in next.
        localStorage.removeItem(SESSION_KEY);
        const raw = localStorage.getItem(key);
        if (!raw) return null;
        const saved = JSON.parse(raw);
        if (!SESSIONS[saved.mode] || !saved.id || !saved.startedAt) {
            localStorage.removeItem(key);
            return null;
        }
        const remaining = saved.running
            ? Math.max(0, Math.ceil((saved.endsAt - Date.now()) / 1000))
            : Math.max(0, Number(saved.remaining) || 0);
        return { ...saved, remaining, expired: saved.running && remaining === 0 };
    } catch { /* noop */ }
    return null;
}

function saveSession(spreadsheetId, session) {
    const key = storageKey(spreadsheetId);
    if (!key) return;
    try {
        localStorage.setItem(key, JSON.stringify(session));
    } catch { /* noop */ }
}

function clearSession(spreadsheetId, expectedSessionId = null) {
    const key = storageKey(spreadsheetId);
    if (!key) return false;
    try {
        if (expectedSessionId) {
            const current = JSON.parse(localStorage.getItem(key) || 'null');
            if (current?.id !== expectedSessionId) return false;
        }
        localStorage.removeItem(key);
        return true;
    } catch {
        return false;
    }
}

function markCompletionPending(spreadsheetId, session) {
    const pending = {
        ...session,
        running: false,
        remaining: 0,
        endsAt: null,
        completionPending: session.mode === 'WORK',
        notified: true,
    };
    saveSession(spreadsheetId, pending);
    return pending;
}

/** Offline-friendly completion chime — no external audio assets. */
function playChime() {
    try {
        const Ctx = window.AudioContext || window.webkitAudioContext;
        if (!Ctx) return;
        const ctx = new Ctx();
        const now = ctx.currentTime;
        // Gentle C-E-G arpeggio
        [523.25, 659.25, 783.99].forEach((freq, i) => {
            const osc = ctx.createOscillator();
            const gain = ctx.createGain();
            osc.type = 'sine';
            osc.frequency.value = freq;
            gain.gain.setValueAtTime(0.0001, now + i * 0.15);
            gain.gain.exponentialRampToValueAtTime(0.2, now + i * 0.15 + 0.03);
            gain.gain.exponentialRampToValueAtTime(0.0001, now + i * 0.15 + 0.9);
            osc.connect(gain);
            gain.connect(ctx.destination);
            osc.start(now + i * 0.15);
            osc.stop(now + i * 0.15 + 1);
        });
    } catch { /* noop */ }
}

export default function FocusTimer({ spreadsheetId, onSessionComplete }) {
    const restored = useRef(restoreFocusSession(spreadsheetId)).current;
    const [mode, setMode] = useState(restored?.mode || 'WORK');
    const [timeLeft, setTimeLeft] = useState(restored?.remaining ?? SESSIONS.WORK);
    const [isActive, setIsActive] = useState(Boolean(restored?.running && !restored.expired));
    const [isMuted, setIsMuted] = useState(false);
    const sessionRef = useRef(restored || null);
    const completedRef = useRef(false);
    
    const timerRef = useRef(null);

    const completeWorkSession = useCallback(async () => {
        const session = sessionRef.current;
        if (completedRef.current || !session) return;
        const completingSessionId = session.id;
        completedRef.current = true;
        const pending = markCompletionPending(spreadsheetId, session);
        sessionRef.current = pending;
        try {
            if (pending.mode === 'WORK' && onSessionComplete) {
                await onSessionComplete(SESSIONS.WORK / 60, 'WORK', pending);
            }
            // Reset/start can create another timer while persistence is in
            // flight. Never let the older completion erase that newer timer.
            if (sessionRef.current?.id === completingSessionId) {
                clearSession(spreadsheetId, completingSessionId);
                sessionRef.current = null;
                setTimeLeft(SESSIONS[pending.mode]);
            }
        } catch {
            // Keep the stable Session ID so the next visit retries safely.
            completedRef.current = false;
        }
    }, [onSessionComplete, spreadsheetId]);

    // An active timer may finish while this page is unmounted. Reconcile it
    // exactly once on return instead of deleting a completed work session.
    useEffect(() => {
        if (!restored?.expired && !restored?.completionPending) return;
        if (!restored.notified && !isMuted) playChime();
        void completeWorkSession();
    }, [completeWorkSession, isMuted, restored]);

    useEffect(() => {
        if (isActive && timeLeft > 0) {
            timerRef.current = setInterval(() => {
                const endsAt = sessionRef.current?.endsAt;
                setTimeLeft(endsAt
                    ? Math.max(0, Math.ceil((endsAt - Date.now()) / 1000))
                    : 0);
            }, 1000);
        } else if (timeLeft === 0 && isActive) {
            // Guard on isActive so the chime/log fire exactly once per session
            clearInterval(timerRef.current);
            setIsActive(false);
            if (!sessionRef.current?.notified && !isMuted) playChime();
            void completeWorkSession();
        } else {
            clearInterval(timerRef.current);
        }
        return () => clearInterval(timerRef.current);
    }, [completeWorkSession, isActive, timeLeft, isMuted]);

    const toggleTimer = () => {
        const next = !isActive;
        if (next) {
            completedRef.current = false;
            const previous = sessionRef.current;
            const canResume = previous?.mode === mode && !previous.completionPending && timeLeft > 0;
            const startingSeconds = canResume ? timeLeft : SESSIONS[mode];
            const session = canResume
                ? { ...previous, running: true, remaining: startingSeconds, endsAt: Date.now() + startingSeconds * 1000 }
                : { id: crypto.randomUUID(), mode, startedAt: Date.now(), running: true, remaining: startingSeconds, endsAt: Date.now() + startingSeconds * 1000 };
            if (startingSeconds !== timeLeft) setTimeLeft(startingSeconds);
            sessionRef.current = session;
            saveSession(spreadsheetId, session);
        } else {
            const session = { ...sessionRef.current, running: false, remaining: timeLeft, endsAt: null };
            sessionRef.current = session;
            saveSession(spreadsheetId, session);
        }
        setIsActive(next);
    };

    
    const resetTimer = () => {
        setIsActive(false);
        clearSession(spreadsheetId);
        sessionRef.current = null;
        completedRef.current = false;
        setTimeLeft(SESSIONS[mode]);
    };

    const changeMode = (newMode) => {
        setIsActive(false);
        clearSession(spreadsheetId);
        sessionRef.current = null;
        completedRef.current = false;
        setMode(newMode);
        setTimeLeft(SESSIONS[newMode]);
    };

    const formatTime = (seconds) => {
        const mins = Math.floor(seconds / 60);
        const secs = seconds % 60;
        return `${mins}:${secs.toString().padStart(2, '0')}`;
    };

    const progress = (1 - timeLeft / SESSIONS[mode]) * 100;

    return (
        <div
            className="p-8 rounded-3xl space-y-8 flex flex-col items-center"
            style={{ background: 'var(--card-solid-bg)', border: '1px solid var(--card-solid-border)', boxShadow: 'var(--glass-shadow)' }}
        >
            {/* Mode Switcher */}
            <div className="flex p-1.5 rounded-2xl gap-1" style={{ background: 'var(--card-inset-bg)' }}>
                {Object.keys(SESSIONS).map(m => (
                    <button
                        key={m}
                        type="button"
                        onClick={() => changeMode(m)}
                        aria-pressed={mode === m}
                        aria-label={`Use ${m === 'WORK' ? 'deep work' : m === 'SHORT' ? 'short break' : 'long break'} timer`}
                        className={`px-4 py-2 rounded-xl text-xs font-bold transition-all ${mode === m ? 'shadow-sm' : 'hover:opacity-80'}`}
                        style={mode === m
                            ? { background: 'var(--card-raised-bg)', color: 'var(--accent-strong)' }
                            : { color: 'var(--text-muted)', opacity: 0.75 }}
                    >
                        {m === 'WORK' ? 'Deep Work' : m === 'SHORT' ? 'Short Break' : 'Long Break'}
                    </button>
                ))}
            </div>

            {/* Timer Display */}
            <div className="relative w-64 h-64 flex items-center justify-center">
                <svg className="w-full h-full -rotate-90 transform">
                    <circle
                        cx="128"
                        cy="128"
                        r="120"
                        stroke="currentColor"
                        strokeWidth="8"
                        fill="transparent"
                        style={{ color: 'var(--ring-track)' }}
                    />
                    <motion.circle
                        cx="128"
                        cy="128"
                        r="120"
                        stroke="currentColor"
                        strokeWidth="8"
                        fill="transparent"
                        strokeDasharray={754} // 2 * PI * r
                        initial={{ strokeDashoffset: 754 - (754 * progress) / 100 }}
                        animate={{ strokeDashoffset: 754 - (754 * progress) / 100 }}
                        transition={{ duration: 1, ease: "linear" }}
                        className="text-emerald-500"
                        strokeLinecap="round"
                    />
                </svg>
                <div className="absolute flex flex-col items-center">
                    <motion.span 
                        key={timeLeft}
                        initial={{ opacity: 0.5, scale: 0.95 }}
                        animate={{ opacity: 1, scale: 1 }}
                        className="text-6xl font-serif font-black"
                        style={{ color: 'var(--text-heading)' }}
                    >
                        {formatTime(timeLeft)}
                    </motion.span>
                    <span className="text-xs font-black uppercase tracking-widest mt-2" style={{ color: 'var(--text-muted)' }}>
                        {mode === 'WORK' ? 'Focusing' : 'Resting'}
                    </span>
                </div>
            </div>

            {/* Controls */}
            <div className="flex items-center gap-6">
                <button 
                    type="button"
                    onClick={() => setIsMuted(!isMuted)}
                    aria-label={isMuted ? 'Unmute completion sound' : 'Mute completion sound'}
                    aria-pressed={isMuted}
                    className="p-3 hover:opacity-70 transition-opacity"
                    style={{ color: 'var(--text-muted)' }}
                >
                    {isMuted ? <VolumeX size={20} /> : <Volume2 size={20} />}
                </button>

                <button 
                    type="button"
                    onClick={toggleTimer}
                    aria-label={isActive ? 'Pause focus timer' : 'Start focus timer'}
                    className={`w-16 h-16 rounded-full flex items-center justify-center text-white shadow-xl transition-all active:scale-95 ${isActive ? 'bg-amber-500 shadow-amber-200' : 'bg-emerald-500 shadow-emerald-200'}`}
                >
                    {isActive ? <Pause size={28} fill="currentColor" /> : <Play size={28} fill="currentColor" className="ml-1" />}
                </button>

                <button 
                    type="button"
                    onClick={resetTimer}
                    aria-label="Reset focus timer"
                    className="p-3 hover:opacity-70 transition-opacity"
                    style={{ color: 'var(--text-muted)' }}
                >
                    <RotateCcw size={20} />
                </button>
            </div>

            {/* Context Message */}
            <AnimatePresence mode="wait">
                <motion.div
                    key={mode}
                    initial={{ opacity: 0, y: 10 }}
                    animate={{ opacity: 1, y: 0 }}
                    exit={{ opacity: 0, y: -10 }}
                    className="flex items-center gap-2 text-sm font-medium"
                    style={{ color: 'var(--text-muted)' }}
                >
                    {mode === 'WORK' ? (
                        <>
                            <Brain size={16} className="text-emerald-500" />
                            <span>Keep your phone away and focus on the task.</span>
                        </>
                    ) : (
                        <>
                            <Coffee size={16} className="text-amber-500" />
                            <span>Take a deep breath and stretch your body.</span>
                        </>
                    )}
                </motion.div>
            </AnimatePresence>
        </div>
    );
}
