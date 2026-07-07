import { createSpreadsheet, batchWrite, getSpreadsheet, addSheet } from './sheetsApi';
import { MONTHS, DEFAULT_HABITS } from './constants';

export async function scaffoldSheet(userName) {
    try {
        const currentYear = new Date().getFullYear();
        const isLeapYear = (y) => (y % 4 === 0 && y % 100 !== 0) || y % 400 === 0;

        // 1. Create the new Spreadsheet
        const title = `LifeTracker — ${userName}`;
        const newSheet = await createSpreadsheet(title);
        const spreadsheetId = newSheet.spreadsheetId;

        // 2. Add all necessary tabs
        // JournalLogs MUST be in this list — it's written to in batchWrite below
        const allTabs = ['Settings', ...MONTHS.map(m => `${m} ${currentYear}`), 'Female', 'Weekly', 'Streaks', 'DailyWins', 'JournalLogs', 'FocusLogs'];
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

        // Month Tabs — correctly handle leap years for February
        const daysInMonthTable = [31, isLeapYear(currentYear) ? 29 : 28, 31, 30, 31, 30, 31, 31, 30, 31, 30, 31];

        MONTHS.forEach((month, idx) => {
            const daysInMonth = daysInMonthTable[idx];

            const numHeaders = Array.from({ length: 31 }, (_, i) => i < daysInMonth ? String(i + 1) : '');
            const dayHeaders = Array.from({ length: 31 }, (_, i) => {
                if (i >= daysInMonth) return '';
                const d = new Date(currentYear, idx, i + 1);
                return ['Su', 'Mo', 'Tu', 'We', 'Th', 'Fr', 'Sa'][d.getDay()];
            });

            const monthData = [
                [`🌟 ${month} ${currentYear} Tracking`, ...Array(31).fill('')],
                Array(32).fill(''),
                ['Date', ...numHeaders],
                ['Day', ...dayHeaders],
                Array(32).fill('')
            ];

            DEFAULT_HABITS.forEach((h) => {
                const row = [`${h.emoji} ${h.name}`, ...Array(31).fill('')];
                monthData.push(row);
            });

            while (monthData.length < 21) {
                monthData.push(Array(32).fill(''));
            }
            monthData.push(['🧠 Mental State (1-10)', ...Array(31).fill('')]);

            // Use "Month YYYY" naming to match how the app reads tabs throughout
            spreadsheetRanges.push({
                range: `'${month} ${currentYear}'!A1:AF25`,
                values: monthData
            });
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
            range: 'FocusLogs!A1:D1',
            values: [['Date', 'Start Time', 'Minutes', 'Mode']]
        });

        await batchWrite(spreadsheetId, spreadsheetRanges);
        return spreadsheetId;
    } catch (e) {
        console.error('Sheet scaffolding failed:', e);
        throw e;
    }
}

export async function ensureJournalSheet(spreadsheetId) {
    try {
        const spreadsheet = await getSpreadsheet(spreadsheetId);
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
        const spreadsheet = await getSpreadsheet(spreadsheetId);
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
export async function ensureMonthTab(spreadsheetId, month, year) {
    try {
        const spreadsheet = await getSpreadsheet(spreadsheetId);
        const tabName = `${month} ${year}`;
        const hasMonthTab = spreadsheet.sheets.some(s => s.properties.title === tabName);

        if (!hasMonthTab) {
            console.info(`${tabName} sheet missing. Adding now...`);
            await addSheet(spreadsheetId, tabName);

            // Initialize headers for the new month tab
            const isLeapYear = (y) => (y % 4 === 0 && y % 100 !== 0) || y % 400 === 0;
            const monthIndex = MONTHS.indexOf(month);
            const daysInMonthTable = [31, isLeapYear(year) ? 29 : 28, 31, 30, 31, 30, 31, 31, 30, 31, 30, 31];
            const daysInMonth = daysInMonthTable[monthIndex];

            const numHeaders = Array.from({ length: 31 }, (_, i) => i < daysInMonth ? String(i + 1) : '');
            const dayHeaders = Array.from({ length: 31 }, (_, i) => {
                if (i >= daysInMonth) return '';
                const d = new Date(year, monthIndex, i + 1);
                return ['Su', 'Mo', 'Tu', 'We', 'Th', 'Fr', 'Sa'][d.getDay()];
            });

            const monthData = [
                [`🌟 ${month} ${year} Tracking`, ...Array(31).fill('')],
                Array(32).fill(''),
                ['Date', ...numHeaders],
                ['Day', ...dayHeaders],
                Array(32).fill('')
            ];

            // In a real scenario we might want to fetch current habits from Settings, 
            // but for simplicity we'll use DEFAULT_HABITS here or fetch them if needed.
            // Ideally, we'd fetch them from 'Settings!A2:J50'.
            // Let's assume DEFAULT_HABITS for now to match the original scaffold logic.
            DEFAULT_HABITS.forEach((h) => {
                const row = [`${h.emoji} ${h.name}`, ...Array(31).fill('')];
                monthData.push(row);
            });

            while (monthData.length < 21) {
                monthData.push(Array(32).fill(''));
            }
            monthData.push(['🧠 Mental State (1-10)', ...Array(31).fill('')]);

            await batchWrite(spreadsheetId, [{
                range: `'${tabName}'!A1:AF25`,
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
        const spreadsheet = await getSpreadsheet(spreadsheetId);
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

export async function ensureMetricsSheet(spreadsheetId) {
    try {
        const spreadsheet = await getSpreadsheet(spreadsheetId);
        const hasMetrics = spreadsheet.sheets.some(s => s.properties.title === 'MetricsLogs');

        if (!hasMetrics) {
            console.info('MetricsLogs sheet missing. Adding now...');
            await addSheet(spreadsheetId, 'MetricsLogs');
            await batchWrite(spreadsheetId, [{
                range: 'MetricsLogs!A1:C1',
                values: [['Date', 'Water (glasses)', 'Weight']]
            }]);
            console.info('MetricsLogs sheet initialized.');
        }
    } catch (e) {
        console.error('Failed to ensure MetricsLogs sheet:', e);
        throw e;
    }
    }

export async function ensureFocusSheet(spreadsheetId) {
    try {
        const spreadsheet = await getSpreadsheet(spreadsheetId);
        const hasFocus = spreadsheet.sheets.some(s => s.properties.title === 'FocusLogs');

        if (!hasFocus) {
            console.info('FocusLogs sheet missing. Adding now...');
            await addSheet(spreadsheetId, 'FocusLogs');
            await batchWrite(spreadsheetId, [{
                range: 'FocusLogs!A1:D1',
                values: [['Date', 'Start Time', 'Minutes', 'Mode']]
            }]);
            console.info('FocusLogs sheet initialized.');
        }
    } catch (e) {
        console.error('Failed to ensure FocusLogs sheet:', e);
        throw e;
    }
}