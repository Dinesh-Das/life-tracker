import { useState, useEffect } from 'react';
import { batchRead } from '../lib/sheetsApi';
import { MONTHS } from '../lib/constants';

// Hook to fetch and aggregate daily habit completion counts for the entire year
export function useYearlyHistory(spreadsheetId, year) {
    const [heatmapData, setHeatmapData] = useState([]);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        let isMounted = true;

        const fetchYearlyData = async () => {
            if (!spreadsheetId) return;
            setLoading(true);

            try {
                // Request ranges for all 12 months, starting from row 6 down to row 21 (habits limit)
                const ranges = MONTHS.map(month => `${month}!A6:AF21`);

                const responses = await batchRead(spreadsheetId, ranges);

                // We'll build a map from YYYY-MM-DD to completion count.
                // Heatmaps usually expect a sorted list of days.
                const yearlyMap = {};

                // Initialize all days of the year to 0 count.
                const startDate = new Date(year, 0, 1);
                const endDate = new Date(year, 11, 31);
                for (let d = new Date(startDate); d <= endDate; d.setDate(d.getDate() + 1)) {
                    // Need a localized YYYY-MM-DD string
                    const dateStr = [
                        d.getFullYear(),
                        String(d.getMonth() + 1).padStart(2, '0'),
                        String(d.getDate()).padStart(2, '0')
                    ].join('-');
                    yearlyMap[dateStr] = 0;
                }

                // Process sheets
                responses.forEach((rangeObj, monthIndex) => {
                    const rows = rangeObj.values;
                    if (!rows || rows.length === 0) return;

                    // rows[0] is habit 1, rows[14] is habit 15
                    // cell 0 is habit name, cell 1 is day 1, cell 31 is day 31

                    const daysInMonth = new Date(year, monthIndex + 1, 0).getDate();

                    for (let day = 1; day <= daysInMonth; day++) {
                        let completedHabits = 0;

                        rows.forEach(row => {
                            if (!row || row.length === 0) return; // skip empty
                            // Is this a habit row? (Has an emoji + name in col 0)
                            const label = row[0];
                            if (label && label.length > 2 && !label.includes('Mental State')) {
                                const cellValue = row[day];
                                if (cellValue === '✓' || cellValue === 'TRUE' || cellValue === true) {
                                    completedHabits++;
                                }
                            }
                        });


                        const dateStr = [
                            year,
                            String(monthIndex + 1).padStart(2, '0'),
                            String(day).padStart(2, '0')
                        ].join('-');

                        if (yearlyMap[dateStr] !== undefined) {
                            yearlyMap[dateStr] = completedHabits;
                        }
                    }
                });

                // Convert map to array sorted by date
                const finalData = Object.keys(yearlyMap).sort().map(dateStr => {
                    const count = yearlyMap[dateStr];
                    // Map count to an intensity bucket (0 to 5)
                    // If max habits is 15:
                    // 0 = 0
                    // 1-3 = 1
                    // 4-6 = 2
                    // 7-9 = 3
                    // 10-12 = 4
                    // 13-15 = 5
                    let intensity = 0;
                    if (count === 0) intensity = 0;
                    else if (count <= 3) intensity = 1;
                    else if (count <= 6) intensity = 2;
                    else if (count <= 9) intensity = 3;
                    else if (count <= 12) intensity = 4;
                    else intensity = 5;

                    return { date: dateStr, count, intensity };
                });

                if (isMounted) {
                    setHeatmapData(finalData);
                }
            } catch (error) {
                console.error("Failed to fetch yearly heatmap data:", error);
            } finally {
                if (isMounted) setLoading(false);
            }
        };

        fetchYearlyData();

        return () => { isMounted = false; };
    }, [spreadsheetId, year]);

    return { heatmapData, loading };
}
