import { TrendingDown, X } from 'lucide-react';

/** Habit decay — slipping habits flagged before the streak actually breaks. */
export default function DecayWarningCard({ warnings, onDismiss }) {
    if (!warnings || warnings.length === 0) return null;
    return (
        <div className="glass-card animate-fade-up" style={{ padding: '16px 18px', marginBottom: '16px', border: '1px solid var(--warning-border)' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '10px' }}>
                <TrendingDown size={15} style={{ color: 'var(--warning-ink)' }} />
                <h4 style={{ fontFamily: 'var(--font-display)', fontSize: '15px', fontWeight: 600, color: 'var(--text-heading)', flex: 1 }}>
                    Losing steam
                </h4>
                <button
                    onClick={onDismiss}
                    aria-label="Hide decay warnings for this week"
                    title="Hide for this week"
                    style={{
                        border: 'none', background: 'var(--divider)', borderRadius: '9999px',
                        width: '24px', height: '24px', display: 'flex', alignItems: 'center', justifyContent: 'center',
                        cursor: 'pointer', color: 'var(--text-muted)',
                    }}
                >
                    <X size={13} />
                </button>
            </div>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
                {warnings.slice(0, 3).map(w => (
                    <p key={w.habitId} style={{ fontFamily: 'var(--font-body)', fontSize: '12px', color: 'var(--text-body)', lineHeight: 1.5 }}>
                        {w.emoji} <strong>{w.name}</strong> — {w.recent}/7 this week, down from {w.prior}/7 last week. A tiny version today still counts.
                    </p>
                ))}
            </div>
        </div>
    );
}