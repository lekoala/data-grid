import { getFormatDefaults } from "./utils/formatValue.js";

/** @typedef {import("./data-grid.js").Column} Column */
/** @typedef {import("./data-source.js").FilterOption} FilterOption */

/**
 * Order plugin start columns, base columns, then plugin end columns. Start
 * columns are unshifted by plugins, so reversing restores registration order.
 * @param {Column[]} columns
 * @returns {Column[]}
 */
export function orderColumns(columns) {
    const start = [];
    const middle = [];
    const end = [];
    for (const column of columns) {
        if (column.position === "start") {
            start.push(column);
        } else if (column.position === "end") {
            end.push(column);
        } else {
            middle.push(column);
        }
    }
    return [...start.reverse(), ...middle, ...end];
}

/**
 * Explicit and responsive visibility are distinct states but share the same
 * rendered result.
 * @param {Column} column
 * @returns {Boolean}
 */
export function isColumnHidden(column) {
    return Boolean(column.hidden || column.responsiveHidden);
}

/**
 * Resolve explicit alignment before the formatter default.
 * @param {Column} column
 * @returns {String|null}
 */
export function getColumnAlign(column) {
    return column.align ?? getFormatDefaults(column.format, column.formatOptions)?.align ?? null;
}

/**
 * The leading select option always clears the filter while preserving an
 * explicitly empty label.
 * @param {Column} column
 * @param {Column} defaultColumn
 * @returns {FilterOption}
 */
export function getFirstFilterOption(column, defaultColumn) {
    const option = column.firstFilterOption || defaultColumn.firstFilterOption || { value: "", text: "" };
    return { value: "", text: option.text ?? "" };
}

/**
 * Resolve explicit filter mode before the formatter hint and text fallback.
 * @param {Column} column
 * @returns {"text"|"select"|"boolean"|"number"|"date"}
 */
export function getColumnFilterType(column) {
    return column.filterType ?? getFormatDefaults(column.format, column.formatOptions)?.filter ?? "text";
}

/**
 * Percent is the only numeric format whose visible scale differs from its raw
 * query value.
 * @param {Column} column
 * @returns {Boolean}
 */
export function isPercentColumn(column) {
    return column.format === "number" && /** @type {Record<string, any>} */ (column.formatOptions)?.style === "percent";
}

/**
 * Apply the normalized column geometry and styling contract to a cell.
 * @param {HTMLElement} el
 * @param {Column} column
 */
export function applyColumnDefinition(el, column) {
    if (column.width) {
        // An explicit min width is a floor for the preferred width.
        const minWidth = Number.parseInt(el.dataset.minWidth ?? "") || 0;
        el.setAttribute("width", String(Math.max(column.width, minWidth)));
    }
    if (column.class) {
        el.classList.add(...column.class.trim().split(/\s+/));
    }
    if (column.frozen === "start") {
        el.dataset.frozen = "start";
    } else {
        delete el.dataset.frozen;
    }
    if (isColumnHidden(column)) {
        el.setAttribute("hidden", "");
        if (column.responsiveHidden) {
            el.classList.add("dg-responsive-hidden");
        }
    }
    if (column.sortable === false && el.tagName === "TH") {
        el.classList.add("dg-not-sortable");
    }
}
