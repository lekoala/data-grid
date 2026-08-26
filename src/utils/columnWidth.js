/** Minimum usable width for every column, including its resize handle. */
export const MIN_COLUMN_WIDTH = 40;

/**
 * Read the sizing invariant rendered on a header cell.
 * @param {HTMLTableCellElement} th
 * @returns {number}
 */
export function getColumnMinWidth(th) {
    const renderedMin = Number.parseFloat(th.dataset.minWidth ?? "");
    return Math.max(MIN_COLUMN_WIDTH, Number.isFinite(renderedMin) ? renderedMin : 0);
}
