import { useMemo } from 'react';
import { Snowflake, Wrench } from 'lucide-react';
import { loadFreezeLedger } from '../../lib/freezeLedger';
import { FREEZE_EARN_INTERVAL } from '../../lib/streakLogic';

/**
 * Streak Bank — the freeze-token budget made visible: available tokens,
 * lifetime earned vs spent, progress toward the next token, and recent
 * freeze / repair activity (device-local ledger).
 */
export default function StreakBankCard({ spreadsheetId, tokens = 0, used = 0, bestStreak = 0, daysToNextToken = FREEZE_EARN_INTERVAL, cap = 3 }) {
    const history = useMemo(() => {
        void tokens;
        void used;
        return loadFreezeLedger(spreadsheetId).slice(0, 4);
    }, [spreadsheetId, tokens, used]);
    const earned = Math.floor((bestStreak || 0) / FREEZE_EARN_INTERVAL);
    const bankFull = tokens >= cap;
    const progressPct = Math.max(0, Math.min(100, Math.round(((FREEZE_EARN_INTERVAL - daysToNextToken) / FREEZE_EARN_INTERVAL) * 100)));

    return (
        <div className="glass-card animate-fade-up" style={{ padding: '18px 20px', marginBottom: '16px' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '10px', marginBottom: '12px', flexWrap: 'wrap' }}>
                <Snowflake size={16} style={{ color: 'var(--info-ink)' }} />
                <h4 style={{ fontFamily: 'var(--font-display)', fontSize: '16px', fontWeight: 600, color: 'var(--text-heading)', flex: 1 }}>
                    Streak Bank
                </h4>
                <div style={{ display: 'flex', gap: '5px' }} title={`${tokens} of ${cap} tokens available`}>
                    {Array.from({ length: cap }).map((_, i) => (
                        <span
                            key={i}
                            style={{
                                width: '26px', height: '26px', borderRadius: '9999px',
                                display: 'flex', alignItems: 'center', justifyContent: 'center',
                                background: i < tokens ? 'var(--info-bg)' : 'var(--disabled-bg)',
                                color: i < tokens ? '#eaf4ff' : 'var(--disabled-ink)',
                            }}
                        >
                            <Snowflake size={13} />
                        </span>
                    ))}
                </div>
            </div>

            <div style={{ marginBottom: '10px' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', gap: '8px', flexWrap: 'wrap', marginBottom: '5px' }}>
                    <span style={{ fontFamily: 'var(--font-body)', fontSize: '10px', fontWeight: 700, letterSpacing: '0.08em', textTransform: 'uppercase', color: 'var(--text-muted)' }}>
                        {bankFull ? 'Token bank full' : `Next token in ${daysToNextToken} streak day${daysToNextToken === 1 ? '' : 's'}`}
                    </span>
                    <span style={{ fontFamily: 'var(--font-body)', fontSize: '10px', fontWeight: 700, letterSpacing: '0.08em', textTransform: 'uppercase', color: 'var(--text-muted)' }}>
                        Earned {earned} · Spent {used}
                    </span>
                </div>
                <div style={{ height: '6px', borderRadius: '9999px', background: 'var(--ring-track)', overflow: 'hidden' }}>
                    <div style={{ width: `${bankFull ? 100 : progressPct}%`, height: '100%', borderRadius: '9999px', background: 'var(--info-ink)', transition: 'width 0.4s ease' }} />
                </div>
            </div>

            {history.length > 0 ? (
                <div style={{ display: 'flex', flexDirection: 'column', gap: '4px' }}>
                    {history.map((e, i) => (
                        <p key={`${e.date}-${i}`} style={{ fontFamily: 'var(--font-body)', fontSize: '11px', color: 'var(--text-muted)', display: 'flex', alignItems: 'center', gap: '6px' }}>
                            {e.type === 'repair' ? <Wrench size={11} /> : <Snowflake size={11} />}
                            {e.type === 'repair'
                                ? `Repaired ${e.habitName || 'a habit'} — ${e.date}`
                                : `Day frozen — ${e.date}`}
                        </p>
                    ))}
                </div>
            ) : (
                <p style={{ fontFamily: 'var(--font-body)', fontSize: '11px', color: 'var(--text-muted)' }}>
                    Earn one token per {FREEZE_EARN_INTERVAL} days of best streak (max {cap}). Spend them to freeze a day and keep every streak alive.
                </p>
            )}
        </div>
    );
}
