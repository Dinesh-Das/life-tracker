import { createSpreadsheet, batchWrite, getSpreadsheet, addSheet, readRange } from './sheetsApi';
import { MONTHS, DEFAULT_HABITS } from './constants';
import { HABIT_HEADERS, serializeHabit, normalizeHabit } from './habitSchema';
import { loadActiveHabits } from './habitRepository';
import { legacyGlassesToLiters } from './waterUnits';

const metricsEnsurePromises = new Map();

export function buildMonthTabData(month, year, habits = []) {
    const monthIndex = MONTHS.indexOf(month);
    const daysInMonth = new Date(year, monthIndex + 1, 0).getDate();
    const numberHeaders = Array.from({ length: 31 }, (_, index) => index < daysInMonth ? String(index + 1) : '');
    const dayHeaders = Array.from({ length: 31 }, (_, index) => {
        if (index >= daysInMonth) return '';
        return ['Su', 'Mo', 'Tu', 'We', 'Th', 'Fr', 'Sa'][new Date(year, monthIndex, index + 1).getDay()];
    });
    return [
        [`🌟 ${month} ${year} Tracking`, ...Array(32).fill('')],
        Array(33).fill(''),
        ['Date', ...numberHeaders, ''],
        ['Day', ...dayHeaders, ''],
        [...Array(32).fill(''), 'Habit ID'],
        ...habits.map(habit => [`${habit.emoji} ${habit.name}`, ...Array(31).fill(''), habit.id]),
    ];
}

export async function scaffoldSheet(userName) {
    let spreadsheetId = null;
    try {
        const currentYear = new Date().getFullYear();

        // 1. Create the new Spreadsheet
        const title = `LifeTracker — ${userName}`;
        const newSheet = await createSpreadsheet(title);
        spreadsheetId = newSheet.spreadsheetId;

        // 2. Add all necessary tabs
        // JournalLogs MUST be in this list — it's written to in batchWrite below
        const allTabs = ['Settings', 'Habits', ...MONTHS.map(m => `${m} ${currentYear}`), 'DailyState', 'AppSettings', 'Meta', 'Female', 'Weekly', 'Streaks', 'DailyWins', 'JournalLogs', 'FocusLogs'];
        const requests = [];

        // Rename default "Sheet1" to "Settings"
        requests.push({
            updateSheetProperties: {
                properties: { sheetId: 0, title: 'Settings' },
                fields: 'title'
            }
        });

        for (let i = 1; i < allTabs.length; i++) {
            requests.push({
                addSheet: { properties: { title: allTabs[i] } }
            });
        }

        await window.gapi.client.sheets.spreadsheets.batchUpdate({
            spreadsheetId,
            resource: { requests }
        });

        // 3. Prepare data ranges for batch writing
        const spreadsheetRanges = [];

        // Settings Tab
        const settingsHeaders = [
            ['ID', 'Habit Name', 'Emoji', 'Monthly Goal (Days)', 'Category', 'Female Only?', 'Frequency', 'Order', 'Created At', 'Color', 'Focus Link']
        ];
        const habitRows = DEFAULT_HABITS.map((h, i) => [
            `habit_${i + 1}`,
            h.name,
            h.emoji,
            h.goal || 30,
            h.category,
            h.category === 'Female' ? 'TRUE' : 'FALSE',
            'Daily',
            i + 1,
            new Date().toISOString(),
            '',
            'FALSE'
        ]);
        spreadsheetRanges.push({
            range: 'Settings!A1:K20',
            values: [...settingsHeaders, ...habitRows]
        });

        const normalizedHabits = DEFAULT_HABITS.map((habit, index) => normalizeHabit({
            ...habit,
            id: `habit_${index + 1}`,
            femaleOnly: habit.category === 'Female',
            order: index + 1,
        }, index));
        spreadsheetRanges.push({
            range: `Habits!A1:V${normalizedHabits.length + 1}`,
            values: [HABIT_HEADERS, ...normalizedHabits.map(serializeHabit)],
        });

        MONTHS.forEach(month => {
            const monthData = buildMonthTabData(month, currentYear, normalizedHabits);
            // Use "Month YYYY" naming to match how the app reads tabs throughout
            spreadsheetRanges.push({
                range: `'${month} ${currentYear}'!A1:AG${monthData.length}`,
                values: monthData
            });
        });

        spreadsheetRanges.push({
            range: 'DailyState!A1:C1',
            values: [['Date', 'Mental Score', 'Updated At']],
        });
        spreadsheetRanges.push({
            range: 'AppSettings!A1:C1',
            values: [['Key', 'Value', 'Updated At']],
        });
        spreadsheetRanges.push({
            range: 'Meta!A1:B2',
            values: [['Key', 'Value'], ['Schema Version', '2']],
        });

        // Female Tab — columns A-L
        spreadsheetRanges.push({
            range: 'Female!A1:L1',
            values: [['Date', 'Cycle Day', 'Phase', 'Flow Level', 'Mood', 'Energy (1-10)', 'Symptoms', 'Notes', 'Period Start?', 'Period End?', 'Sleep Quality', 'Cramps']]
        });

        // Weekly Tab
        spreadsheetRanges.push({
            range: 'Weekly!A1:I1',
            values: [['Week Key', 'Year', 'Month', 'Day Index', 'Task ID', 'Task Text', '✓ Done', 'Created', 'Order']]
        });

        // Streaks Tab
        spreadsheetRanges.push({
            range: 'Streaks!A1:E1',
            values: [['Habit ID', 'Current Streak', 'Best Streak', 'Last Done Date', 'Total Days']]
        });

        // Daily Wins Tab
        spreadsheetRanges.push({
            range: 'DailyWins!A1:F1',
            values: [['Date', 'Physical', 'Mental', 'Social', 'Financial', 'Spiritual']]
        });

        // Journal Tab
        spreadsheetRanges.push({
            range: 'JournalLogs!A1:D1',
            values: [['Date', 'Morning Gratitude', 'Evening Review', 'Primary Focus']]
        });

        // Focus Sessions Tab
        spreadsheetRanges.push({
            range: 'FocusLogs!A1:E1',
            values: [['Date', 'Start Time', 'Minutes', 'Mode', 'Session ID']]
        });

        await batchWrite(spreadsheetId, spreadsheetRanges);
        return spreadsheetId;
    } catch (e) {
        console.error('Sheet scaffolding failed:', e);
        // A partially-created workbook would be rediscovered by the legacy
        // title lookup on the next sign-in and strand the app in a broken
        // state. Move only the just-created file to Drive trash; it remains
        // recoverable by the user.
        if (spreadsheetId && window.gapi?.client?.drive?.files) {
            try {
                await window.gapi.client.drive.files.update({
                    fileId: spreadsheetId,
                    resource: { trashed: true },
                });
            } catch (cleanupError) {
                console.error('Failed to trash partially-created workbook:', cleanupError);
            }
        }
        throw e;
    }
}

export async function ensureJournalSheet(spreadsheetId) {
    try {
        const spreadsheet = await getSpreadsheet(spreadsheetId, { allowOfflineFallback: false });
        const hasJournal = spreadsheet.sheets.some(s => s.properties.title === 'JournalLogs');

        if (!hasJournal) {
            console.info('JournalLogs sheet missing. Adding now...');
            await addSheet(spreadsheetId, 'JournalLogs');

            // Initialize headers
            await batchWrite(spreadsheetId, [{
                range: 'JournalLogs!A1:D1',
                values: [['Date', 'Morning Gratitude', 'Evening Review', 'Primary Focus']]
            }]);
            console.info('JournalLogs sheet initialized.');
        }
    } catch (e) {
        console.error('Failed to ensure JournalLogs sheet:', e);
        throw e;
    }
}
export async function ensureDailyWinsSheet(spreadsheetId) {
    try {
        const spreadsheet = await getSpreadsheet(spreadsheetId, { allowOfflineFallback: false });
        const hasDailyWins = spreadsheet.sheets.some(s => s.properties.title === 'DailyWins');

        if (!hasDailyWins) {
            console.info('DailyWins sheet missing. Adding now...');
            await addSheet(spreadsheetId, 'DailyWins');

            // Initialize headers
            await batchWrite(spreadsheetId, [{
                range: 'DailyWins!A1:F1',
                values: [['Date', 'Physical', 'Mental', 'Social', 'Financial', 'Spiritual']]
            }]);
            console.info('DailyWins sheet initialized.');
        }
    } catch (e) {
        console.error('Failed to ensure DailyWins sheet:', e);
        throw e;
    }
}
export async function ensureMonthTab(spreadsheetId, month, year, suppliedHabits = null) {
    try {
        const spreadsheet = await getSpreadsheet(spreadsheetId, { allowOfflineFallback: false });
        const tabName = `${month} ${year}`;
        const hasMonthTab = spreadsheet.sheets.some(s => s.properties.title === tabName);

        if (!hasMonthTab) {
            console.info(`${tabName} sheet missing. Adding now...`);
            await addSheet(spreadsheetId, tabName);

            const monthIndex = MONTHS.indexOf(month);
            const activeHabits = suppliedHabits || await loadActiveHabits(
                spreadsheetId,
                new Date(year, monthIndex, 1)
            );
            const monthData = buildMonthTabData(month, year, activeHabits);

            await batchWrite(spreadsheetId, [{
                range: `'${tabName}'!A1:AG${monthData.length}`,
                values: monthData
            }]);
            console.info(`${tabName} sheet initialized.`);
        }
        return true;
    } catch (e) {
        console.error(`Failed to ensure ${month} ${year} sheet:`, e);
        throw e;
    }
}

export async function ensureSleepSheet(spreadsheetId) {
    try {
        const spreadsheet = await getSpreadsheet(spreadsheetId, { allowOfflineFallback: false });
        const hasSleep = spreadsheet.sheets.some(s => s.properties.title === 'SleepLogs');

        if (!hasSleep) {
            console.info('SleepLogs sheet missing. Adding now...');
            await addSheet(spreadsheetId, 'SleepLogs');
            await batchWrite(spreadsheetId, [{
                range: 'SleepLogs!A1:F1',
                values: [['Date', 'Bedtime', 'Wake Time', 'Hours', 'Quality (1-5)', 'Nap (min)']]
            }]);
            console.info('SleepLogs sheet initialized.');
        }
    } catch (e) {
        console.error('Failed to ensure SleepLogs sheet:', e);
        throw e;
    }
}

async function ensureMetricsSheetOnce(spreadsheetId) {
    try {
        const spreadsheet = await getSpreadsheet(spreadsheetId, { allowOfflineFallback: false });
        const hasMetrics = spreadsheet.sheets.some(s => s.properties.title === 'MetricsLogs');

        if (!hasMetrics) {
            console.info('MetricsLogs sheet missing. Adding now...');
            await addSheet(spreadsheetId, 'MetricsLogs');
            await batchWrite(spreadsheetId, [{
                range: 'MetricsLogs!A1:C1',
                values: [['Date', 'Water (L)', 'Weight']]
            }]);
            console.info('MetricsLogs sheet initialized.');
        } else {
            const rows = await readRange(spreadsheetId, 'MetricsLogs!A:C');
            const waterHeader = String(rows?.[0]?.[1] || '');
            if (/glass/i.test(waterHeader)) {
                const writes = [{ range: 'MetricsLogs!B1', values: [['Water (L)']] }];
                rows.slice(1).forEach((row, index) => {
                    if (row?.[1] === '' || row?.[1] === undefined || row?.[1] === null) return;
                    const liters = legacyGlassesToLiters(row[1]);
                    if (liters === null) return;
                    writes.push({
                        range: `MetricsLogs!B${index + 2}`,
                        values: [[liters]],
                    });
                });
                await batchWrite(spreadsheetId, writes);
                console.info(`Converted ${writes.length - 1} water entries from glasses to liters.`);
            }
        }
    } catch (e) {
        console.error('Failed to ensure MetricsLogs sheet:', e);
        throw e;
    }
}

export function ensureMetricsSheet(spreadsheetId) {
    if (metricsEnsurePromises.has(spreadsheetId)) return metricsEnsurePromises.get(spreadsheetId);
    const promise = ensureMetricsSheetOnce(spreadsheetId).catch(error => {
        metricsEnsurePromises.delete(spreadsheetId);
        throw error;
    });
    metricsEnsurePromises.set(spreadsheetId, promise);
    return promise;
}

export async function ensureFocusSheet(spreadsheetId) {
    try {
        // FocusLogs is optional in older workbooks and may have been deleted
        // manually. Always verify live metadata before deciding it exists.
        const spreadsheet = await getSpreadsheet(spreadsheetId, {
            forceRefresh: true,
            allowOfflineFallback: false,
        });
        const hasFocus = spreadsheet.sheets.some(s => s.properties.title === 'FocusLogs');

        if (!hasFocus) {
            console.info('FocusLogs sheet missing. Adding now...');
            await addSheet(spreadsheetId, 'FocusLogs');
            await batchWrite(spreadsheetId, [{
                range: 'FocusLogs!A1:E1',
                values: [['Date', 'Start Time', 'Minutes', 'Mode', 'Session ID']]
            }]);
            console.info('FocusLogs sheet initialized.');
        } else {
            // Extends older four-column FocusLogs tabs without modifying rows.
            await batchWrite(spreadsheetId, [{
                range: 'FocusLogs!E1',
                values: [['Session ID']]
            }]);
        }
    } catch (e) {
        console.error('Failed to ensure FocusLogs sheet:', e);
        throw e;
    }
}

export async function ensureDailyStateSheet(spreadsheetId) {
    const spreadsheet = await getSpreadsheet(spreadsheetId, { allowOfflineFallback: false });
    const exists = spreadsheet.sheets.some(s => s.properties.title === 'DailyState');
    if (!exists) {
        await addSheet(spreadsheetId, 'DailyState');
        await batchWrite(spreadsheetId, [{
            range: 'DailyState!A1:C1',
            values: [['Date', 'Mental Score', 'Updated At']],
        }]);
    }
}

export async function ensureAppSettingsSheet(spreadsheetId) {
    const spreadsheet = await getSpreadsheet(spreadsheetId, { allowOfflineFallback: false });
    const exists = spreadsheet.sheets.some(s => s.properties.title === 'AppSettings');
    if (!exists) {
        await addSheet(spreadsheetId, 'AppSettings');
        await batchWrite(spreadsheetId, [{ range: 'AppSettings!A1:C1', values: [['Key', 'Value', 'Updated At']] }]);
    }
}
