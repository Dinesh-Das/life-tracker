import { useState, useEffect, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Play, Pause, RotateCcw, Volume2, VolumeX, Coffee, Brain } from 'lucide-react';
import { playCompletion, buzz } from '../../lib/sounds';

const SESSIONS = {
    WORK: 25 * 60,
    SHORT: 5 * 60,
    LONG: 15 * 60
};

const SESSION_KEY = 'lt_focus_active';

/** Restore an in-flight session (survives navigation / refresh). */
function restoreSession() {
    try {
        const raw = localStorage.getItem(SESSION_KEY);
        if (!raw) return null;
        const saved = JSON.parse(raw);
        const remaining = Math.round((saved.endsAt - Date.now()) / 1000);
        if (remaining > 0 && SESSIONS[saved.mode]) {
            return { mode: saved.mode, remaining };
        }
        localStorage.removeItem(SESSION_KEY);
    } catch { /* noop */ }
    return null;
}

function saveSession(mode, secondsLeft) {
    try {
        localStorage.setItem(SESSION_KEY, JSON.stringify({ mode, endsAt: Date.now() + secondsLeft * 1000 }));
    } catch { /* noop */ }
}

function clearSession() {
    try { localStorage.removeItem(SESSION_KEY); } catch { /* noop */ }
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

export default function FocusTimer({ onSessionComplete }) {
    const restored = useRef(restoreSession()).current;
    const [mode, setMode] = useState(restored?.mode || 'WORK');
    const [timeLeft, setTimeLeft] = useState(restored?.remaining ?? SESSIONS.WORK);
    const [isActive, setIsActive] = useState(Boolean(restored));
    const [isMuted, setIsMuted] = useState(false);
    
    const timerRef = useRef(null);

    useEffect(() => {
        if (isActive && timeLeft > 0) {
            timerRef.current = setInterval(() => {
                setTimeLeft(prev => prev - 1);
            }, 1000);
        } else if (timeLeft === 0 && isActive) {
            // Guard on isActive so the chime/log fire exactly once per session
            clearInterval(timerRef.current);
            setIsActive(false);
            clearSession();
            if (!isMuted) playChime();
            if (mode === 'WORK' && onSessionComplete) {
                onSessionComplete(SESSIONS.WORK / 60);
            }
        } else {
            clearInterval(timerRef.current);
        }
        return () => clearInterval(timerRef.current);
    }, [isActive, timeLeft, isMuted, mode, onSessionComplete]);

    const toggleTimer = () => {
        setIsActive(prev => {
            const next = !prev;
            if (next) saveSession(mode, timeLeft);
            else clearSession();
            return next;
        });
    };

    
    const resetTimer = () => {
        setIsActive(false);
        clearSession();
        setTimeLeft(SESSIONS[mode]);
    };

    const changeMode = (newMode) => {
        setIsActive(false);
        clearSession();
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
                        onClick={() => changeMode(m)}
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
                    onClick={() => setIsMuted(!isMuted)}
                    className="p-3 hover:opacity-70 transition-opacity"
                    style={{ color: 'var(--text-muted)' }}
                >
                    {isMuted ? <VolumeX size={20} /> : <Volume2 size={20} />}
                </button>

                <button 
                    onClick={toggleTimer}
                    className={`w-16 h-16 rounded-full flex items-center justify-center text-white shadow-xl transition-all active:scale-95 ${isActive ? 'bg-amber-500 shadow-amber-200' : 'bg-emerald-500 shadow-emerald-200'}`}
                >
                    {isActive ? <Pause size={28} fill="currentColor" /> : <Play size={28} fill="currentColor" className="ml-1" />}
                </button>

                <button 
                    onClick={resetTimer}
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
