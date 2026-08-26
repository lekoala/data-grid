/**
 * Create a full-width `<tr>` with a single spanning `<td>` used for detail,
 * empty and error rows. Insertion is left to the caller: it is a per-plugin rule.
 * @param {import("../data-grid.js").default} grid
 * @param {{ id?: string, className?: string }} [opts]
 * @returns {{ row: HTMLTableRowElement, cell: HTMLTableCellElement }}
 */
export declare function createSpanningRow(grid: import("../data-grid.js").default, { id, className }?: {
    id?: string;
    className?: string;
}): {
    row: HTMLTableRowElement;
    cell: HTMLTableCellElement;
};
//# sourceMappingURL=spanningRow.d.ts.map