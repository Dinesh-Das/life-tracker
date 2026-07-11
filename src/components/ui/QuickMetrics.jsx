import { Droplets, Scale, Minus, Plus } from 'lucide-react';
import { formatLiters, roundLiters } from '../../lib/waterUnits';

const btnStyle = {
    width: '30px', height: '30px', borderRadius: '8px',
    border: '1px solid var(--table-border)', background: 'var(--neutral-control-bg)',
    display: 'flex', alignItems: 'center', justifyContent: 'center',
    cursor: 'pointer', color: 'var(--text-heading)',
};

/** Quick daily metrics card — water counter and weight input. */
function QuickMetrics({ metrics }) {
    const { data, saveMetric } = metrics;
    const water = Number.parseFloat(data.water) || 0;
    const updateWater = (delta) => {
        const next = Math.min(10, Math.max(0, roundLiters(water + delta) || 0));
        saveMetric('water', String(next));
    };

    return (
        <div className="glass-card" style={{ padding: '16px 18px' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '10px', marginBottom: '14px' }}>
                <div className="theme-icon-tile" style={{ padding: '6px', borderRadius: '8px', color: 'var(--text-heading)', flexShrink: 0 }}>
                    <Droplets size={16} />
                </div>
                <h4 style={{ fontFamily: 'var(--font-body)', fontSize: '13px', fontWeight: 700, color: 'var(--text-heading)', flex: 1 }}>Quick Metrics</h4>
            </div>

            <div style={{ display: 'flex', alignItems: 'center', gap: '12px', marginBottom: '14px' }}>
                <span style={{ fontFamily: 'var(--font-body)', fontSize: '10px', fontWeight: 700, letterSpacing: '0.06em', textTransform: 'uppercase', color: 'var(--text-muted)', width: '60px' }}>Water</span>
                <button style={btnStyle} onClick={() => updateWater(-0.25)} aria-label="Remove 0.25 liters of water">
                    <Minus size={14} />
                </button>
                <span style={{ fontFamily: 'var(--font-display)', fontSize: '22px', fontWeight: 600, color: 'var(--text-heading)', minWidth: '2ch', textAlign: 'center' }} aria-live="polite">
                    {formatLiters(water)}
                </span>
                <button style={btnStyle} onClick={() => updateWater(0.25)} aria-label="Add 0.25 liters of water">
                    <Plus size={14} />
                </button>
                <span style={{ fontFamily: 'var(--font-body)', fontSize: '11px', color: 'var(--text-muted)' }}>L</span>
            </div>

            <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                <span style={{ fontFamily: 'var(--font-body)', fontSize: '10px', fontWeight: 700, letterSpacing: '0.06em', textTransform: 'uppercase', color: 'var(--text-muted)', width: '60px' }}>
                    <Scale size={12} style={{ display: 'inline', marginRight: '4px' }} />Weight
                </span>
                <input
                    type="number" step="0.1" min="0" placeholder="—"
                    value={data.weight}
                    onChange={e => saveMetric('weight', e.target.value)}
                    aria-label="Weight"
                    style={{
                        width: '100px', padding: '8px 10px', borderRadius: '8px',
                        fontFamily: 'var(--font-body)', fontSize: '13px',
                    }}
                />
                <span style={{ fontFamily: 'var(--font-body)', fontSize: '11px', color: 'var(--text-muted)' }}>kg</span>
            </div>
        </div>
    );
}

export default QuickMetrics;
