import { Moon } from 'lucide-react';

const inputStyle = {
    width: '100%', padding: '8px 10px', marginTop: '4px',
    borderRadius: '8px', border: '1px solid rgba(255,255,255,0.3)',
    background: 'rgba(255,255,255,0.35)',
    fontFamily: 'var(--font-body)', fontSize: '13px',
    color: 'var(--text-body)', outline: 'none',
};

const labelStyle = {
    fontFamily: 'var(--font-body)', fontSize: '10px', fontWeight: 700,
    letterSpacing: '0.06em', textTransform: 'uppercase', color: 'var(--text-muted)',
    display: 'block',
};

/** Sleep card for Daily Check-in — bedtime, wake time, derived hours, quality. */
function SleepLogger({ sleep }) {
    const { data, hours, napMinutes, totalHours, saveSleep } = sleep;
    return (
        <div className="glass-card" style={{ padding: '16px 18px' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '10px', marginBottom: '12px' }}>
                <div style={{ padding: '6px', borderRadius: '8px', background: 'rgba(255,255,255,0.45)', color: 'var(--text-heading)', flexShrink: 0 }}>
                    <Moon size={16} />
                </div>
                <h4 style={{ fontFamily: 'var(--font-body)', fontSize: '13px', fontWeight: 700, color: 'var(--text-heading)', flex: 1 }}>Sleep</h4>
                {totalHours != null && (
                    <span style={{ fontFamily: 'var(--font-body)', fontSize: '11px', fontWeight: 700, background: 'rgba(45,79,65,0.4)', color: '#a9cfbc', borderRadius: '9999px', padding: '4px 10px' }}>
                        {totalHours}h{napMinutes > 0 ? ' total' : ''}
                    </span>
                )}
            </div>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '10px', marginBottom: '12px' }}>
                <label style={labelStyle}>
                    Bedtime
                    <input type="time" value={data.bedtime} onChange={e => saveSleep('bedtime', e.target.value)} style={inputStyle} />
                </label>
                <label style={labelStyle}>
                    Wake up
                    <input type="time" value={data.wakeTime} onChange={e => saveSleep('wakeTime', e.target.value)} style={inputStyle} />
                </label>
                <label style={labelStyle}>
                    Nap (min)
                    <input
                        type="number" min="0" max="480" step="5" placeholder="0"
                        value={data.nap}
                        onChange={e => saveSleep('nap', e.target.value)}
                        style={inputStyle}
                    />
                </label>
                {hours != null && napMinutes > 0 && (
                    <div style={{ ...labelStyle, alignSelf: 'end', paddingBottom: '8px' }}>
                        Night {hours}h + nap {napMinutes}m
                    </div>
                )}
            </div>
            <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                <span style={labelStyle}>Quality</span>
                <input
                    type="range" min="1" max="5"
                    value={data.quality || 3}
                    onChange={e => saveSleep('quality', e.target.value)}
                    aria-label="Sleep quality from 1 to 5"
                    style={{ flex: 1, height: '6px', borderRadius: '9999px', appearance: 'none', cursor: 'pointer', background: 'linear-gradient(to right, #EF5350 0%, #FF8F00 50%, #4a7a62 100%)' }}
                />
                <span style={{ fontFamily: 'var(--font-display)', fontSize: '20px', fontWeight: 600, color: 'var(--text-heading)', minWidth: '1.5ch', textAlign: 'center' }}>
                    {data.quality || '–'}
                </span>
            </div>
        </div>
    );
}

export default SleepLogger;