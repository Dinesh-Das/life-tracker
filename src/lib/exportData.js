import { getSpreadsheet, batchRead } from './sheetsApi';
import { format } from 'date-fns';

export function download(filename, content, mime) {
    const blob = new Blob([content], { type: mime });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = filename;
    document.body.appendChild(a);
    a.click();
    a.remove();
    URL.revokeObjectURL(url);
}

function escapeCsvCell(c) {
    let s = c === null || c === undefined ? '' : String(c);
    if (/^[=+\-@\t\r]/.test(s)) s = `'${s}`;
    return /[",\n]/.test(s) ? `"${s.replace(/"/g, '""')}"` : s;
}

/**
 * Data sovereignty in one click — export every tab of the LifeTracker
 * spreadsheet as a single JSON or CSV download.
 */
export async function exportAllData(spreadsheetId, fmt = 'json') {
    const data = await collectAllData(spreadsheetId);
    const titles = Object.keys(data);

    const stamp = format(new Date(), 'yyyy-MM-dd');
    if (fmt === 'json') {
        download(`lifetracker-export-${stamp}.json`, JSON.stringify(data, null, 2), 'application/json');
    } else {
        const sections = titles.map(t => {
            const rows = (data[t] || []).map(r => r.map(escapeCsvCell).join(','));
            return `# Sheet: ${t}\n${rows.join('\n')}`;
        });
        download(`lifetracker-export-${stamp}.csv`, sections.join('\n\n'), 'text/csv');
    }
}

export async function collectAllData(spreadsheetId) {
    const spreadsheet = await getSpreadsheet(spreadsheetId);
    const titles = spreadsheet.sheets.map(s => s.properties.title);
    const ranges = titles.map(t => `'${t.replaceAll("'", "''")}'!A:AZ`);
    const results = await batchRead(spreadsheetId, ranges);

    const data = {};
    titles.forEach((t, i) => {
        data[t] = results[i]?.values || [];
    });

    return data;
}
