import { createSpreadsheet, batchWrite } from './sheetsApi';
import { MONTHS, DEFAULT_HABITS } from './constants';

export async function scaffoldSheet(userName) {
    try {
        // 1. Create the new Spreadsheet
        const title = `LifeTracker — ${userName}`;
        const newSheet = await createSpreadsheet(title);
        const spreadsheetId = newSheet.spreadsheetId;

        // 2. Add all necessary tabs
        const allTabs = ['Settings', ...MONTHS, 'Female', 'Weekly', 'Streaks', 'DailyWins'];
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
            ['ID', 'Habit Name', 'Emoji', 'Monthly Goal (Days)', 'Category', 'Female Only?', 'Frequency', 'Order', 'Created At', 'Color']
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
            ''
        ]);
        spreadsheetRanges.push({
            range: 'Settings!A1:J20',
            values: [...settingsHeaders, ...habitRows]
        });

        // Month Tabs — correctly handle leap years for February
        const currentYear = new Date().getFullYear();
        const isLeapYear = (y) => (y % 4 === 0 && y % 100 !== 0) || y % 400 === 0;
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

            const emptyRowsToPad = Math.max(0, 21 - monthData.length - 1);
            for (let i = 0; i < emptyRowsToPad; i++) {
                monthData.push(Array(32).fill(''));
            }
            monthData.push(['🧠 Mental State (1-10)', ...Array(31).fill('')]);

            spreadsheetRanges.push({
                range: `${month}!A1:AF25`,
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

        await batchWrite(spreadsheetId, spreadsheetRanges);
        return spreadsheetId;
    } catch (e) {
        console.error('Sheet scaffolding failed:', e);
        throw e;
    }
}
export async function ensureDailyWinsSheet(spreadsheetId) {
    try {
        const spreadsheet = await getSpreadsheet(spreadsheetId);
        const hasDailyWins = spreadsheet.sheets.some(s => s.properties.title === 'DailyWins');

        if (!hasDailyWins) {
            console.log('DailyWins sheet missing. Adding now...');
            await addSheet(spreadsheetId, 'DailyWins');

            // Initialize headers
            await batchWrite(spreadsheetId, [{
                range: 'DailyWins!A1:F1',
                values: [['Date', 'Physical', 'Mental', 'Social', 'Financial', 'Spiritual']]
            }]);
            console.log('DailyWins sheet initialized.');
        }
    } catch (e) {
        console.error('Failed to ensure DailyWins sheet:', e);
        throw e;
    }
}
import { getSpreadsheet, addSheet } from './sheetsApi';
