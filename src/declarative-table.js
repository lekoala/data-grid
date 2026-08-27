import { parseBooleanAttribute } from "./utils/attributes.js";
import normalizeData from "./utils/normalizeData.js";

/** @typedef {import("./data-grid.js").Action} Action */
/** @typedef {import("./data-grid.js").Column} Column */
/** @typedef {import("./data-source.js").SortState} SortState */

/**
 * Non-enumerable symbol holding each declarative cell's original machine
 * value, user-facing label and authored child nodes.
 * @type {unique symbol}
 */
const DECLARATIVE_CELLS = Symbol("dgDeclarativeCells");

/**
 * @typedef DeclarativeCellMeta
 * @property {any} value - original machine value
 * @property {String} label - user-facing text
 * @property {Node[]} content - authored child nodes, cloned on render
 */

/**
 * Read the non-enumerable declarative-cell snapshot of a row.
 * @param {Record<string, any>} row
 * @returns {Record<string, DeclarativeCellMeta>|undefined}
 */
export function declarativeCells(row) {
    return /** @type {any} */ (row)[DECLARATIVE_CELLS];
}

/**
 * @param {Record<string, any>} row
 * @param {String} field
 * @param {DeclarativeCellMeta} meta
 */
function setDeclarativeCell(row, field, meta) {
    let cells = declarativeCells(row);
    if (!cells) {
        cells = {};
        Object.defineProperty(row, DECLARATIVE_CELLS, {
            value: cells,
            enumerable: false,
            configurable: true,
        });
    }
    cells[field] = meta;
}

/**
 * Parse declarative columns and their optional initial sort. The definitions
 * still pass through the grid's normal column normalization afterward.
 * @param {HTMLTableElement} table
 * @returns {{ columns: Column[], sort: SortState[] }}
 */
export function parseDeclarativeTable(table) {
    /** @type {Column[]} */
    const columns = [];
    /** @type {SortState[]} */
    const sort = [];
    const headerRow = table.querySelector("thead > tr:first-child");
    if (!headerRow) {
        return { columns, sort };
    }
    const ths = /** @type {NodeListOf<HTMLTableCellElement>} */ (headerRow.querySelectorAll(":scope > th[data-field]"));
    for (const th of ths) {
        const field = th.dataset.field;
        if (!field) {
            continue;
        }
        /** @type {Column} */
        const column = { field, title: th.textContent.trim() };
        if (th.dataset.sortable !== undefined) {
            column.sortable = parseBooleanAttribute(th.dataset.sortable);
        }
        if (th.dataset.filterable !== undefined) {
            column.filterable = parseBooleanAttribute(th.dataset.filterable);
        }
        if (th.dataset.wrap !== undefined) {
            column.wrap = parseBooleanAttribute(th.dataset.wrap);
        }
        if (th.dataset.filter && ["text", "select", "boolean", "number", "date"].includes(th.dataset.filter)) {
            column.filterType = /** @type {NonNullable<Column["filterType"]>} */ (th.dataset.filter);
        }
        if (th.dataset.filterPlaceholder !== undefined) {
            column.filterPlaceholder = th.dataset.filterPlaceholder;
        }
        if (th.dataset.responsive !== undefined) {
            const responsive = Number(th.dataset.responsive);
            if (Number.isFinite(responsive)) {
                column.responsive = responsive;
            }
        }
        if (th.dataset.frozen === "start") {
            column.frozen = "start";
        }
        if (th.dataset.hidden !== undefined) {
            column.hidden = parseBooleanAttribute(th.dataset.hidden);
        }
        if (th.dataset.editable !== undefined) {
            column.editable = parseBooleanAttribute(th.dataset.editable);
        }
        if (th.dataset.editableType) {
            column.editableType = th.dataset.editableType;
        }
        if (th.dataset.transform) {
            column.transform = /** @type {NonNullable<Column["transform"]>} */ (th.dataset.transform);
        }
        if (th.dataset.format) {
            column.format = /** @type {NonNullable<Column["format"]>} */ (th.dataset.format);
        }
        if (th.dataset.align && ["start", "center", "end"].includes(th.dataset.align)) {
            column.align = /** @type {NonNullable<Column["align"]>} */ (th.dataset.align);
        }
        if (th.dataset.width !== undefined) {
            const width = Number(th.dataset.width);
            if (Number.isFinite(width)) {
                column.width = width;
            }
        }
        if (th.dataset.minWidth !== undefined) {
            const minWidth = Number(th.dataset.minWidth);
            if (Number.isFinite(minWidth)) {
                column.minWidth = minWidth;
            }
        }
        const direction = th.dataset.sort;
        if (direction === "asc" || direction === "desc") {
            sort.push({ field, direction });
        }
        columns.push(column);
    }
    return { columns, sort };
}

/**
 * @param {HTMLTableCellElement} td
 * @returns {Action[]}
 */
function parseActionsCell(td) {
    const actions = [];
    const elements = /** @type {NodeListOf<HTMLElement>} */ (td.querySelectorAll("[data-action]"));
    for (const el of elements) {
        const name = el.dataset.action;
        if (!name) {
            continue;
        }
        /** @type {Action} */
        const action = { name };
        const label = el.textContent.trim();
        if (label) {
            action.label = label;
        }
        const href = el.getAttribute("href");
        if (href) {
            action.href = href;
        }
        if (el.dataset.intent) {
            action.intent = el.dataset.intent;
        }
        if (el.dataset.confirm !== undefined) {
            action.confirm = el.dataset.confirm;
        }
        if (el.dataset.default !== undefined) {
            action.default = parseBooleanAttribute(el.dataset.default);
        }
        if (el.hasAttribute("disabled")) {
            action.disabled = true;
        }
        actions.push(action);
    }
    return actions;
}

/**
 * Extract a local dataset from a supplied table body.
 * @param {HTMLTableElement} table
 * @param {Column[]} columns
 * @param {String|Function|null} [rowKey]
 * @returns {Array<Record<string, any>>}
 */
export function rowsFromTable(table, columns, rowKey = "id") {
    const tbody = table.querySelector("tbody");
    if (!tbody) {
        return [];
    }
    const rows = [];
    const trs = /** @type {NodeListOf<HTMLTableRowElement>} */ (tbody.querySelectorAll(":scope > tr"));
    for (const tr of trs) {
        /** @type {Record<string, any>} */
        const row = {};
        const tds = Array.from(
            /** @type {NodeListOf<HTMLTableCellElement>} */ (tr.querySelectorAll(":scope > td")),
        ).filter((td) => !td.hasAttribute("data-actions"));
        for (let index = 0; index < columns.length; index++) {
            const column = columns[index];
            if (!column.field) {
                continue;
            }
            const td = tds[index];
            if (!td) {
                continue;
            }
            const raw = td.dataset.value;
            if (raw !== undefined) {
                // Preserve authored presentation while this machine value is
                // unchanged across rerenders.
                row[column.field] = normalizeData(raw);
                setDeclarativeCell(row, column.field, {
                    value: row[column.field],
                    label: td.textContent.trim(),
                    content: Array.from(td.childNodes),
                });
            } else {
                row[column.field] = td.textContent.trim();
            }
        }
        const actionsCell = /** @type {HTMLTableCellElement|null} */ (tr.querySelector(":scope > td[data-actions]"));
        if (actionsCell) {
            const actions = parseActionsCell(actionsCell);
            if (actions.length) {
                row.$actions = actions;
            }
        }
        if (tr.dataset.rowKey !== undefined && typeof rowKey === "string") {
            row[rowKey] = tr.dataset.rowKey;
        }
        rows.push(row);
    }
    return rows;
}
