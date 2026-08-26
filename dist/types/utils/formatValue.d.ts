/**
 * Built-in named cell formatters: the grid provides the kind of representation,
 * Intl provides its configuration. A formatter creates semantic DOM (or a
 * formatted string) but never touches cell layout: the core resolves geometry
 * (minWidth, align) from `getFormatDefaults()`.
 *
 * Contract:
 * - `boolean`  -> <span class="dg-boolean" data-value="true|false" role="img"
 *                 aria-label>: an empty, stateful mark whose shape is drawn
 *                 entirely by CSS (_core.css), never a glyph or SVG in the DOM
 * - `date`     -> <time datetime="YYYY-MM-DD">, calendar date without time zone
 *                 (Date | timestamp | validated YYYY-MM-DD); time/timeZone options throw
 * - `datetime` -> <time datetime=ISO>, instant (Date | timestamp | ISO datetime
 *                 string with offset, e.g. 2026-08-26T08:30:00Z or +02:00)
 * - `number`   -> formatted text (Intl.NumberFormat)
 *
 * Invalid values format to ""; an invalid Intl configuration throws, so a
 * misconfigured column is never silently hidden.
 */
/**
 * Normalize a value to a boolean.
 * Shared by the boolean formatter (display) and the boolean filter mode
 * (comparison) so a raw `1` displayed as ✓ is also matched by "Yes".
 * @param {*} value
 * @returns {boolean|null} null when the value is not an obvious boolean
 */
export declare function normalizeBoolean(value: any): boolean | null;
/**
 * Defaults derived from a built-in format, consumed by the core to resolve
 * column geometry (header min-width, preferred width, cell alignment) and the
 * preferred filter mode. Only predictable formats suggest a preferred width:
 * a percent column is always compact, while currency, unit and plain numbers
 * vary too much. `datetime` deliberately suggests no filter mode: prefix
 * matching a raw instant can disagree with the displayed local date.
 * @param {import("../data-grid.js").Column["format"]} format
 * @param {import("../data-grid.js").DateFormatOptions|import("../data-grid.js").NumberFormatOptions} [formatOptions]
 * @returns {{ align?: "start"|"center"|"end", minWidth?: number, width?: number, filter?: "boolean"|"number"|"date" }|null}
 */
export declare function getFormatDefaults(format: import("../data-grid.js").Column["format"], formatOptions?: import("../data-grid.js").DateFormatOptions | import("../data-grid.js").NumberFormatOptions): {
    align?: "start" | "center" | "end";
    minWidth?: number;
    width?: number;
    filter?: "boolean" | "number" | "date";
} | null;
/**
 * Format a cell value for display.
 *
 * `format` is a built-in name only: custom DOM rendering belongs to
 * `renderCell`. An unknown named format leaves the value unchanged, so
 * declarative HTML never breaks on a typo or an unknown key.
 *
 * @param {*} value
 * @param {import("../data-grid.js").Column["format"]} format
 * @param {import("../data-grid.js").DateFormatOptions|import("../data-grid.js").NumberFormatOptions} [formatOptions]
 * @param {Partial<import("../data-grid.js").CellContext>} [ctx]
 * @returns {*}
 */
export default function formatValue(value: any, format: import("../data-grid.js").Column["format"], formatOptions?: import("../data-grid.js").DateFormatOptions | import("../data-grid.js").NumberFormatOptions, ctx?: Partial<import("../data-grid.js").CellContext>): any;
//# sourceMappingURL=formatValue.d.ts.map