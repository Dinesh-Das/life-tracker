/**
 * Shareable Wrapped card — renders the year summary to a PNG entirely
 * on-device (no external assets), shared via the Web Share API with a
 * download fallback. Same approach as the milestone badge.
 */

function roundedRect(ctx, x, y, w, h, r) {
    ctx.beginPath();
    ctx.moveTo(x + r, y);
    ctx.arcTo(x + w, y, x + w, y + h, r);
    ctx.arcTo(x + w, y + h, x, y + h, r);
    ctx.arcTo(x, y + h, x, y, r);
    ctx.arcTo(x, y, x + w, y, r);
    ctx.closePath();
}

function drawCard({ year, stats, topHabitLabel, comparison }) {
    const W = 720;
    const H = 960;
    const canvas = document.createElement('canvas');
    canvas.width = W;
    canvas.height = H;
    const ctx = canvas.getContext('2d');

    const bg = ctx.createLinearGradient(0, 0, 0, H);
    bg.addColorStop(0, '#eaf6ef');
    bg.addColorStop(1, '#a9cfbc');
    ctx.fillStyle = bg;
    ctx.fillRect(0, 0, W, H);

    ctx.fillStyle = 'rgba(255,255,255,0.65)';
    roundedRect(ctx, 44, 44, W - 88, H - 88, 32);
    ctx.fill();

    ctx.textAlign = 'center';

    ctx.font = '700 20px Manrope, sans-serif';
    ctx.fillStyle = '#4a7a62';
    ctx.fillText('YOUR YEAR IN HABITS', W / 2, 128);

    ctx.font = '700 72px Manrope, sans-serif';
    ctx.fillStyle = '#1a2e24';
    ctx.fillText(`${year} Wrapped`, W / 2, 210);

    const rows = [
        [String(stats.totalCompleted ?? 0), 'Habits completed'],
        [`${stats.bestStreak ?? 0} days`, 'Best streak'],
        [`${stats.bestMonth?.name ?? '–'} (${stats.bestMonth?.pct ?? 0}%)`, 'Best month'],
        [`${stats.activeMonths ?? 0} / 12`, 'Active months'],
    ];
    if (topHabitLabel) rows.push([topHabitLabel, 'Top habit']);

    let y = 300;
    rows.forEach(([value, label]) => {
        ctx.font = '700 40px Manrope, sans-serif';
        ctx.fillStyle = '#1a2e24';
        ctx.fillText(value, W / 2, y);
        ctx.font = '700 16px Manrope, sans-serif';
        ctx.fillStyle = 'rgba(45,79,65,0.7)';
        ctx.fillText(label.toUpperCase(), W / 2, y + 28);
        y += 96;
    });

    if (comparison) {
        const d = comparison.totalDelta;
        ctx.font = '600 22px Manrope, sans-serif';
        ctx.fillStyle = d >= 0 ? '#2d6a4a' : '#a04a3a';
        ctx.fillText(`${d >= 0 ? '▲' : '▼'} ${Math.abs(d)} completions vs ${comparison.vsYear}`, W / 2, y + 6);
    }

    ctx.font = '700 18px Manrope, sans-serif';
    ctx.fillStyle = 'rgba(45,79,65,0.65)';
    ctx.fillText('LIFETRACKER', W / 2, H - 80);

    return canvas;
}

/**
 * Render and share the Wrapped card.
 * @returns {Promise<'shared'|'downloaded'|'cancelled'>}
 */
export async function shareWrappedCard(payload) {
    const canvas = drawCard(payload);
    const blob = await new Promise((resolve) => canvas.toBlob(resolve, 'image/png'));
    if (!blob) throw new Error('Canvas export failed');
    const file = new File([blob], `wrapped-${payload.year}.png`, { type: 'image/png' });

    try {
        if (navigator.canShare && navigator.canShare({ files: [file] })) {
            await navigator.share({ files: [file], title: `${payload.year} Wrapped`, text: `My ${payload.year} in habits 🌿` });
            return 'shared';
        }
    } catch (e) {
        if (e?.name === 'AbortError') return 'cancelled';
        // Unsupported — fall through to download
    }

    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = file.name;
    a.click();
    URL.revokeObjectURL(url);
    return 'downloaded';
}