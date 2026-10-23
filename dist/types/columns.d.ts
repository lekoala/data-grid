export type Column = import("./data-grid.js").Column;
export type FilterOption = import("./data-source.js").FilterOption;
/** @typedef {import("./data-grid.js").Column} Column */
/** @typedef {import("./data-source.js").FilterOption} FilterOption */
/**
 * Order plugin start columns, base columns, then plugin end columns. Start
 * columns are unshifted by plugins, so reversing restores registration order.
 * @param {Column[]} columns
 * @returns {Column[]}
 */
export declare function orderColumns(columns: Column[]): Column[];
/**
 * Row attributes are developer-named but row-data-valued, so an event-handler
 * name would turn data into code. Only a `<tr>` is targeted, where URL and
 * embedded-document attributes are inert; re-audit this ban when the
 * destination changes.
 * @param {unknown} attr
 * @returns {String} the usable attribute name, or "" when it must be ignored
 */
export declare function sanitizeRowAttribute(attr: unknown): string;
/**
 * Explicit and responsive visibility are distinct states but share the same
 * rendered result.
 * @param {Column} column
 * @returns {Boolean}
 */
export declare function isColumnHidden(column: Column): boolean;
/**
 * Resolve explicit alignment before the formatter default.
 * @param {Column} column
 * @returns {String|null}
 */
export declare function getColumnAlign(column: Column): string | null;
/**
 * The leading select option always clears the filter while preserving an
 * explicitly empty label.
 * @param {Column} column
 * @param {Column} defaultColumn
 * @returns {FilterOption}
 */
export declare function getFirstFilterOption(column: Column, defaultColumn: Column): FilterOption;
/**
 * Resolve explicit filter mode before the formatter hint and text fallback.
 * @param {Column} column
 * @returns {"text"|"select"|"boolean"|"number"|"date"}
 */
export declare function getColumnFilterType(column: Column): "text" | "select" | "boolean" | "number" | "date";
/**
 * Percent is the only numeric format whose visible scale differs from its raw
 * query value.
 * @param {Column} column
 * @returns {Boolean}
 */
export declare function isPercentColumn(column: Column): boolean;
/**
 * Apply the normalized column geometry and styling contract to a cell.
 * @param {HTMLElement} el
 * @param {Column} column
 */
export declare function applyColumnDefinition(el: HTMLElement, column: Column): void;
//# sourceMappingURL=columns.d.ts.map