import { useEffect, useMemo } from 'react';
import { motion } from 'framer-motion';
import { Share2, X } from 'lucide-react';
import { playCompletion, buzz } from '../../lib/sounds';
import toast from 'react-hot-toast';

const CONFETTI_COLORS = ['#4a7a62', '#a9cfbc', '#f0c060', '#e8927c', '#8fbcd4', '#2d4f41'];

function roundedRect(ctx, x, y, w, h, r) {
    ctx.beginPath();
    ctx.moveTo(x + r, y);
    ctx.arcTo(x + w, y, x + w, y + h, r);
    ctx.arcTo(x + w, y + h, x, y + h, r);
    ctx.arcTo(x, y + h, x, y, r);
    ctx.arcTo(x, y, x + w, y, r);
    ctx.closePath();
}

/** Render the milestone as a 640×640 badge image — no external assets. */
function drawBadge(milestone) {
    const size = 640;
    const canvas = document.createElement('canvas');
    canvas.width = size;
    canvas.height = size;
    const ctx = canvas.getContext('2d');

    const bg = ctx.createLinearGradient(0, 0, 0, size);
    bg.addColorStop(0, '#eaf6ef');
    bg.addColorStop(1, '#a9cfbc');
    ctx.fillStyle = bg;
    ctx.fillRect(0, 0, size, size);

    ctx.fillStyle = 'rgba(255,255,255,0.65)';
    roundedRect(ctx, 48, 48, size - 96, size - 96, 36);
    ctx.fill();

    ctx.textAlign = 'center';

    ctx.font = '110px serif';
    ctx.fillStyle = '#1a2e24';
    ctx.fillText(milestone.emoji, size / 2, 230);

    ctx.font = '700 54px Manrope, sans-serif';
    ctx.fillText(`${milestone.days}-Day Streak`, size / 2, 330);

    ctx.font = '500 30px Manrope, sans-serif';
    ctx.fillStyle = '#3d5a4a';
    const habitLine = `${milestone.habitEmoji || ''} ${milestone.habitName || ''}`.trim() || milestone.label;
    ctx.fillText(habitLine, size / 2, 390);

    ctx.font = '600 20px Manrope, sans-serif';
    ctx.fillStyle = '#4a7a62';
    ctx.fillText(
        new Date().toLocaleDateString(undefined, { year: 'numeric', month: 'long', day: 'numeric' }),
        size / 2, 440
    );

    ctx.font = '700 18px Manrope, sans-serif';
    ctx.fillStyle = 'rgba(45,79,65,0.65)';
    ctx.fillText('LIFETRACKER', size / 2, 540);

    return canvas;
}

/**
 * Milestone celebration — confetti rain plus a badge card the user can
 * share as an image (Web Share API with a download fallback).
 */
export default function CelebrationOverlay({ milestone, onClose }) {
    const confetti = useMemo(() => Array.from({ length: 40 }, (_, i) => ({
        id: i,
        left: Math.random() * 100,
        delay: Math.random() * 0.6,
        duration: 2.2 + Math.random() * 1.6,
        size: 6 + Math.random() * 8,
        color: CONFETTI_COLORS[i % CONFETTI_COLORS.length],
        spin: (Math.random() > 0.5 ? 1 : -1) * (360 + Math.random() * 540),
    })), []);

    useEffect(() => {
        playCompletion();
        buzz([30, 60, 30]);
    }, [milestone]);

    if (!milestone) return null;

    const shareBadge = () => {
        try {
            const canvas = drawBadge(milestone);
            canvas.toBlob(async (blob) => {
                if (!blob) return;
                const file = new File([blob], `streak-${milestone.days}-days.png`, { type: 'image/png' });
                const text = `${milestone.days}-day streak on ${milestone.habitName || 'my habit'} 🎉`;
                try {
                    if (navigator.canShare && navigator.canShare({ files: [file] })) {
                        await navigator.share({ files: [file], title: 'LifeTracker milestone', text });
                        return;
                    }
                } catch { /* user cancelled or unsupported — fall back to download */ }
                const url = URL.createObjectURL(blob);
                const a = document.createElement('a');
                a.href = url;
                a.download = file.name;
                a.click();
                URL.revokeObjectURL(url);
                toast.success('Badge saved — share it anywhere 🌿');
            }, 'image/png');
        } catch (e) {
            console.error('Badge share failed', e);
            toast.error('Could not create the badge image');
        }
    };

    return (
        <div
            role="dialog"
            aria-label={`Milestone reached: ${milestone.label}`}
            style={{
                position: 'fixed', inset: 0, zIndex: 90,
                display: 'flex', alignItems: 'center', justifyContent: 'center',
                background: 'rgba(26,46,36,0.55)',
                backdropFilter: 'blur(6px)', WebkitBackdropFilter: 'blur(6px)',
            }}
        >
            {/* Confetti */}
            <div aria-hidden="true" style={{ position: 'absolute', inset: 0, overflow: 'hidden', pointerEvents: 'none' }}>
                {confetti.map(c => (
                    <motion.span
                        key={c.id}
                        initial={{ y: -30, rotate: 0, opacity: 1 }}
                        animate={{ y: '105vh', rotate: c.spin, opacity: [1, 1, 0.6] }}
                        transition={{ duration: c.duration, delay: c.delay, ease: 'easeIn' }}
                        style={{
                            position: 'absolute', top: 0, left: `${c.left}%`,
                            width: c.size, height: c.size * 0.45,
                            borderRadius: '2px', background: c.color, display: 'block',
                        }}
                    />
                ))}
            </div>

            {/* Badge card */}
            <motion.div
                initial={{ scale: 0.85, opacity: 0, y: 20 }}
                animate={{ scale: 1, opacity: 1, y: 0 }}
                transition={{ type: 'spring', stiffness: 260, damping: 20 }}
                style={{
                    position: 'relative', width: 'min(92vw, 360px)',
                    borderRadius: '24px', padding: '36px 28px 28px', textAlign: 'center',
                    background: 'linear-gradient(180deg, #eaf6ef 0%, #cfe6d8 100%)',
                    boxShadow: '0 24px 60px rgba(0,0,0,0.35)',
                }}
            >
                <button
                    onClick={onClose}
                    aria-label="Close celebration"
                    style={{
                        position: 'absolute', top: '12px', right: '12px',
                        border: 'none', background: 'rgba(45,79,65,0.15)', borderRadius: '9999px',
                        width: '30px', height: '30px', display: 'flex', alignItems: 'center', justifyContent: 'center',
                        cursor: 'pointer', color: '#2d4f41',
                    }}
                >
                    <X size={16} />
                </button>
                <div style={{ fontSize: '64px', lineHeight: 1, marginBottom: '12px' }}>{milestone.emoji}</div>
                <h3 style={{ fontFamily: 'var(--font-display)', fontSize: '28px', fontWeight: 700, color: '#1a2e24', marginBottom: '6px' }}>
                    {milestone.days}-Day Streak!
                </h3>
                <p style={{ fontFamily: 'var(--font-body)', fontSize: '14px', fontWeight: 600, color: '#3d5a4a', marginBottom: '4px' }}>
                    {(milestone.habitEmoji || '')} {milestone.habitName || milestone.label}
                </p>
                <p style={{ fontFamily: 'var(--font-body)', fontSize: '11px', fontWeight: 700, letterSpacing: '0.08em', textTransform: 'uppercase', color: 'rgba(45,79,65,0.7)', marginBottom: '22px' }}>
                    Consistency looks good on you
                </p>
                <div style={{ display: 'flex', gap: '10px' }}>
                    <button
                        onClick={shareBadge}
                        style={{
                            flex: 1, display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '8px',
                            padding: '12px', borderRadius: '9999px', border: 'none', cursor: 'pointer',
                            background: 'rgba(45,79,65,0.9)', color: '#a9cfbc',
                            fontFamily: 'var(--font-body)', fontSize: '12px', fontWeight: 700,
                            letterSpacing: '0.06em', textTransform: 'uppercase',
                        }}
                    >
                        <Share2 size={14} /> Share badge
                    </button>
                    <button
                        onClick={onClose}
                        style={{
                            flex: 1, padding: '12px', borderRadius: '9999px',
                            border: '1px solid rgba(45,79,65,0.35)', cursor: 'pointer',
                            background: 'rgba(255,255,255,0.5)', color: '#2d4f41',
                            fontFamily: 'var(--font-body)', fontSize: '12px', fontWeight: 700,
                            letterSpacing: '0.06em', textTransform: 'uppercase',
                        }}
                    >
                        Keep going
                    </button>
                </div>
            </motion.div>
        </div>
    );
}