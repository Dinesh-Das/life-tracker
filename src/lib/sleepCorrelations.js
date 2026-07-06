/**
 * Correlates sleep (hours, quality) with daily habit completion.
 * Joins SleepLogs rows with the yearly heatmap's per-day completion pct.
 */
export function sleepHabitInsights(sleepRows = [], heatmapData = []) {
    const pctByDate = {};
    heatmapData.forEach(d => {
        if (d.pct !== undefined && d.pct !== null) pctByDate[d.date] = d.pct;
    });

    const longSleep = [];
    const shortSleep = [];
    const highQ = [];
    const lowQ = [];

    sleepRows.forEach(r => {
        const pct = pctByDate[r.date];
        if (pct === undefined || pct === null) return;
        if (r.hours != null) (r.hours >= 7 ? longSleep : shortSleep).push(pct);
        if (r.quality != null) {
            if (r.quality >= 4) highQ.push(pct);
            else if (r.quality <= 2) lowQ.push(pct);
        }
    });

    const avg = a => (a.length ? Math.round(a.reduce((s, v) => s + v, 0) / a.length) : null);
    const insights = [];

    const l = avg(longSleep);
    const s = avg(shortSleep);
    if (l !== null && s !== null && longSleep.length >= 3 && shortSleep.length >= 3) {
        const diff = l - s;
        if (Math.abs(diff) >= 5) {
            insights.push(`😴 With 7+ hours of sleep you complete ${l}% of habits vs ${s}% on short-sleep days (${diff > 0 ? '+' : ''}${diff}pp).`);
        }
    }

    const hq = avg(highQ);
    const lq = avg(lowQ);
    if (hq !== null && lq !== null && highQ.length >= 3 && lowQ.length >= 3) {
        const diff = hq - lq;
        if (Math.abs(diff) >= 5) {
            insights.push(`⭐ Good-quality sleep (4-5) days average ${hq}% habit completion vs ${lq}% after poor sleep (${diff > 0 ? '+' : ''}${diff}pp).`);
        }
    }

    if (insights.length === 0 && sleepRows.length > 0) {
        insights.push('Keep logging sleep — correlations appear after about a week of data on both sides.');
    }
    return insights;
}