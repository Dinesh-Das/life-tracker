/**
 * Return the newest row for a date. Append-based logs can contain duplicate
 * dates from older app versions, so the last matching row is authoritative.
 */
export function findLatestDateRowIndex(rows, dateKey) {
    for (let index = (rows?.length || 0) - 1; index >= 0; index -= 1) {
        if (String(rows[index]?.[0] ?? '') === String(dateKey)) return index;
    }
    return -1;
}
