/**
 * Shared Recharts styling driven by CSS variables, so every chart
 * follows the active light/dark theme automatically (SVG and the
 * tooltip's HTML both resolve var() at paint time).
 */

export const tickStyle = { fontSize: 10, fontWeight: 700, fill: 'var(--text-muted)' };

export const gridStroke = 'var(--ring-track)';

export const tooltipStyle = {
    background: 'var(--card-solid-bg)',
    border: '1px solid var(--card-solid-border)',
    borderRadius: '12px',
    boxShadow: 'var(--glass-shadow)',
    fontSize: '10px',
    color: 'var(--text-body)',
};

export const tooltipLabelStyle = { fontWeight: 'bold', color: 'var(--text-heading)' };

export const tooltipItemStyle = { fontSize: '10px', fontWeight: 800, textTransform: 'uppercase', color: 'var(--text-body)' };

export const legendStyle = { fontSize: '10px', fontWeight: 700, textTransform: 'uppercase', color: 'var(--text-muted)' };

export const cursorFill = 'var(--card-inset-bg)';