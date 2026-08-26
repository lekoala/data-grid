/**
 * Create a full-width `<tr>` with a single spanning `<td>` used for detail,
 * empty and error rows. Insertion is left to the caller: it is a per-plugin rule.
 * @param {import("../data-grid.js").default} grid
 * @param {{ id?: string, className?: string }} [opts]
 * @returns {{ row: HTMLTableRowElement, cell: HTMLTableCellElement }}
 */
export function createSpanningRow(grid, { id, className } = {}) {
    const row = document.createElement("tr");

    if (id) {
        row.id = id;
    }
    if (className) {
        row.className = className;
    }

    const cell = document.createElement("td");
    cell.dataset.dgSpanColumns = "";
    cell.colSpan = Math.max(1, grid.columnsLength(true));

    row.appendChild(cell);

    return { row, cell };
}
