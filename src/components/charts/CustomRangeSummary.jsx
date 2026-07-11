import { useEffect, useMemo, useState } from 'react';
import { format, subDays } from 'date-fns';
import { CalendarRange } from 'lucide-react';

const key = date => format(date, 'yyyy-MM-dd');

export default function CustomRangeSummary({ data = [], year }) {
    const maxDate = useMemo(() => {
        const today = new Date();
        return year === today.getFullYear() ? today : new Date(year, 11, 31);
    }, [year]);
    const [preset, setPreset] = useState('30');
    const [range, setRange] = useState({ from: key(subDays(maxDate, 29)), until: key(maxDate) });
    useEffect(() => {
        const today = new Date();
        const limit = year === today.getFullYear() ? today : new Date(year, 11, 31);
        setPreset('30');
        setRange({ from: key(subDays(limit, 29)), until: key(limit) });
    }, [year]); // reset stale ranges when Analytics changes year
    const selectPreset = value => {
        setPreset(value);
        if (value !== 'custom') setRange({ from: key(subDays(maxDate, Number(value) - 1)), until: key(maxDate) });
    };
    const summary = useMemo(() => {
        const selected = data.filter(day => day.date >= range.from && day.date <= range.until);
        const total = selected.reduce((sum, day) => sum + Number(day.count || 0), 0);
        const active = selected.filter(day => day.count > 0).length;
        const duration = Math.max(1, selected.length);
        const priorUntilDate = new Date(`${range.from}T12:00:00`); priorUntilDate.setDate(priorUntilDate.getDate() - 1);
        const priorFromDate = new Date(priorUntilDate); priorFromDate.setDate(priorFromDate.getDate() - duration + 1);
        const prior = data.filter(day => day.date >= key(priorFromDate) && day.date <= key(priorUntilDate));
        const priorTotal = prior.reduce((sum, day) => sum + Number(day.count || 0), 0);
        const change = priorTotal ? Math.round(((total - priorTotal) / priorTotal) * 100) : null;
        return { total, active, duration, average: (total / duration).toFixed(1), change };
    }, [data, range]);
    return <section className="glass-card" style={{ padding: '20px', marginBottom: 20 }}>
        <div className="mobile-stack" style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 12, marginBottom: 14 }}>
            <h3 className="tool-title" style={{ margin: 0 }}><CalendarRange size={18} /> Custom range</h3>
            <div className="tool-actions"><select value={preset} onChange={event => selectPreset(event.target.value)}><option value="7">Last 7 days</option><option value="30">Last 30 days</option><option value="90">Last 90 days</option><option value="custom">Custom</option></select><input type="date" value={range.from} onChange={event => { setPreset('custom'); setRange({ ...range, from: event.target.value }); }} /><input type="date" value={range.until} onChange={event => { setPreset('custom'); setRange({ ...range, until: event.target.value }); }} /></div>
        </div>
        <div className="responsive-grid" style={{ gap: 10 }}>
            {[['Completions', summary.total], ['Active days', `${summary.active}/${summary.duration}`], ['Daily average', summary.average], ['Previous period', summary.change === null ? 'No baseline' : `${summary.change >= 0 ? '+' : ''}${summary.change}%`]].map(([label, value]) => <div key={label} style={{ background: 'var(--surface-inner)', borderRadius: 12, padding: 12 }}><span className="text-label">{label}</span><strong style={{ display: 'block', color: 'var(--text-heading)', fontSize: 20, marginTop: 4 }}>{value}</strong></div>)}
        </div>
    </section>;
}
