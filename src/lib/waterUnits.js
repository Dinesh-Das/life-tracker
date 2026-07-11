export const LITERS_PER_LEGACY_GLASS = 0.25;

export function roundLiters(value) {
    const liters = Number.parseFloat(value);
    return Number.isFinite(liters) ? Math.round(liters * 100) / 100 : null;
}

export function legacyGlassesToLiters(value) {
    const glasses = Number.parseFloat(value);
    return Number.isFinite(glasses) ? roundLiters(glasses * LITERS_PER_LEGACY_GLASS) : null;
}

export function formatLiters(value) {
    const liters = roundLiters(value);
    if (liters === null) return '0';
    return liters.toFixed(2).replace(/\.00$/, '').replace(/(\.\d)0$/, '$1');
}
