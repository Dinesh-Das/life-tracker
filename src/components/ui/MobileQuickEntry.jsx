import { useState } from 'react';
import { Check, Droplets, Gauge, PenLine, Plus, X } from 'lucide-react';
import { Link } from 'react-router-dom';
import { roundLiters } from '../../lib/waterUnits';

export default function MobileQuickEntry({ habits, checks, activeDay, toggleCheck, metrics, mentalValue, setMentalValue }) {
    const [open, setOpen] = useState(false);
    const firstIncomplete = habits.find(habit => checks[habit.id]?.[activeDay] !== true);
    const addWater = () => metrics.saveMetric('water', String(Math.min(10, roundLiters((Number(metrics.data.water) || 0) + 0.25))));
    return (
        <div className="lg:hidden">
            {open && <div className="quick-entry-panel glass-card" role="dialog" aria-label="Quick entry">
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 12 }}>
                    <strong style={{ color: 'var(--text-heading)' }}>Quick entry</strong>
                    <button className="glass-button" onClick={() => setOpen(false)} aria-label="Close quick entry"><X size={16} /></button>
                </div>
                <button className="quick-entry-action" onClick={addWater}><Droplets size={17} /> Add 0.25 L water</button>
                {firstIncomplete && <button className="quick-entry-action" onClick={() => toggleCheck(firstIncomplete.id, activeDay)}><Check size={17} /> Complete {firstIncomplete.emoji} {firstIncomplete.name}</button>}
                <label className="quick-entry-action"><Gauge size={17} /> Mood <input type="range" min="1" max="10" value={mentalValue || 5} onChange={event => setMentalValue(Number(event.target.value))} /></label>
                <Link className="quick-entry-action" to="/journal"><PenLine size={17} /> Write reflection</Link>
            </div>}
            <button className="quick-entry-fab" onClick={() => setOpen(value => !value)} aria-expanded={open} aria-label="Open quick entry"><Plus size={21} /></button>
        </div>
    );
}
