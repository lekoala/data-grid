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
 * @type {Record<"boolean"|"date"|"datetime"|"number", {
 *   align?: "start"|"center"|"end",
 *   minWidth?: number,
 *   width?: number,
 * }>}
 */
const formatDefaults = {
    boolean: {
        align: "center",
        minWidth: 48,
        width: 56,
    },
    date: {
        minWidth: 104,
        width: 120,
    },
    datetime: {
        minWidth: 152,
        width: 168,
    },
    number: {
        align: "end",
    },
};

/**
 * ISO date only: `YYYY-MM-DD`. Parseable as a local calendar date, never as a
 * UTC instant.
 * @type {RegExp}
 */
const ISO_DATE = /^\d{4}-\d{2}-\d{2}$/;

/**
 * ISO datetime string carrying a time zone: `YYYY-MM-DDTHH:...` followed by `Z`
 * or a `±HH:MM` offset. A datetime without a time zone is a local time, not a
 * portable instant, so it is not a valid `datetime` value.
 * @type {RegExp}
 */
const ISO_DATETIME = /^\d{4}-\d{2}-\d{2}T.+(?:Z|[+-]\d{2}:\d{2})$/i;

/**
 * Options that only make sense for an instant. The `date` formatter is a
 * calendar date with `datetime="YYYY-MM-DD"` and never converts between time
 * zones, so it rejects them explicitly instead of silently producing a
 * representation that disagrees with the machine value.
 * @type {string[]}
 */
const DATE_FORBIDDEN_OPTIONS = [
    "timeStyle",
    "hour",
    "minute",
    "second",
    "fractionalSecondDigits",
    "dayPeriod",
    "timeZone",
];

/**
 * Intl.DateTimeFormat options that select individual date/time components.
 * When any of them is present, the user is building their own representation:
 * no automatic `dateStyle`/`timeStyle` default is injected.
 * @type {string[]}
 */
const DATETIME_COMPONENT_KEYS = [
    "weekday",
    "era",
    "year",
    "month",
    "day",
    "dayPeriod",
    "hour",
    "minute",
    "second",
    "fractionalSecondDigits",
    "timeZoneName",
];

/**
 * Resolve the formatting locale the web-native way: the closest `lang`
 * attribute (the grid itself included), falling back to the document element.
 * `undefined` lets Intl use the runtime default.
 * @param {import("../data-grid.js").DataGrid|undefined} grid
 * @returns {string|undefined}
 */
function resolveLocale(grid) {
    return grid?.closest("[lang]")?.getAttribute("lang") || grid?.ownerDocument?.documentElement.lang || undefined;
}

/**
 * Local calendar date of a Date as `YYYY-MM-DD`. Never derived from
 * `toISOString().slice(0, 10)`, which could shift the day depending on the
 * time zone.
 * @param {Date} date
 * @returns {string}
 */
function toLocalISODate(date) {
    const year = date.getFullYear();
    const month = `${date.getMonth() + 1}`.padStart(2, "0");
    const day = `${date.getDate()}`.padStart(2, "0");
    return `${year}-${month}-${day}`;
}

/**
 * Normalize a value to a boolean.
 * @param {*} value
 * @returns {boolean|null} null when the value is not an obvious boolean
 */
function normalizeBoolean(value) {
    if (value === true || value === "true" || value === 1 || value === "1") {
        return true;
    }
    if (value === false || value === "false" || value === 0 || value === "0") {
        return false;
    }
    return null;
}

/**
 * @param {*} value
 * @param {Partial<import("../data-grid.js").CellContext>} ctx
 * @returns {string|Node}
 */
function formatBoolean(value, ctx) {
    const bool = normalizeBoolean(value);
    if (bool === null) {
        return "";
    }
    const grid = ctx.grid;
    const labels = grid?.labels;
    const doc = grid?.ownerDocument ?? document;
    const span = doc.createElement("span");
    span.className = "dg-boolean";
    span.dataset.value = bool ? "true" : "false";
    span.setAttribute("role", "img");
    span.setAttribute("aria-label", bool ? (labels?.booleanTrue ?? "Yes") : (labels?.booleanFalse ?? "No"));
    return span;
}

/**
 * Resolve the Intl.DateTimeFormat options for a date/datetime column.
 * The `style` shortcut maps to `dateStyle`/`timeStyle`; explicit Intl options
 * win. When granular component options are present, no default style is
 * injected at all, so a valid native Intl configuration stays valid.
 * @param {"date"|"datetime"} format
 * @param {import("../data-grid.js").DateFormatOptions} [formatOptions]
 * @returns {Intl.DateTimeFormatOptions}
 */
function resolveDateTimeOptions(format, formatOptions = {}) {
    const { style, ...options } = formatOptions;
    // A calendar date has no time zone to convert and no time to display: a
    // time/timeZone option is a configuration error, not something to guess.
    if (format === "date") {
        for (const key of DATE_FORBIDDEN_OPTIONS) {
            if (/** @type {Record<string, any>} */ (options)[key] !== undefined) {
                throw new TypeError(`The "${format}" formatter does not accept time or timeZone options`);
            }
        }
    }
    const hasGranular = DATETIME_COMPONENT_KEYS.some(
        (key) => /** @type {Record<string, any>} */ (options)[key] !== undefined,
    );
    if (!hasGranular) {
        if (options.dateStyle === undefined) {
            options.dateStyle = style ?? "short";
        }
        if (format === "datetime" && options.timeStyle === undefined) {
            options.timeStyle = style ?? "short";
        }
    }
    return options;
}

/**
 * Parse a value into a Date and its machine `datetime` attribute.
 * - `date`: Date | timestamp | YYYY-MM-DD (local calendar; the attribute keeps
 *   the authored ISO string, otherwise it is the local date components)
 * - `datetime`: Date | timestamp | ISO datetime string (the instant)
 * @param {*} value
 * @param {"date"|"datetime"} format
 * @returns {{ date: Date, datetimeAttr: string }|null}
 */
function parseDateValue(value, format) {
    if (value instanceof Date) {
        if (Number.isNaN(value.getTime())) {
            return null;
        }
        return {
            date: value,
            datetimeAttr: format === "datetime" ? value.toISOString() : toLocalISODate(value),
        };
    }
    if (typeof value === "number" && Number.isFinite(value)) {
        const date = new Date(value);
        return {
            date,
            datetimeAttr: format === "datetime" ? date.toISOString() : toLocalISODate(date),
        };
    }
    if (typeof value === "string") {
        if (format === "date") {
            if (!ISO_DATE.test(value)) {
                return null;
            }
            const [year, month, day] = value.split("-").map(Number);
            const date = new Date(year, month - 1, day);
            // Date normalizes out-of-range components silently (2026-02-31 ->
            // Mar 3); the round-trip rejects them so the machine value and the
            // parsed calendar date always agree.
            if (date.getFullYear() !== year || date.getMonth() !== month - 1 || date.getDate() !== day) {
                return null;
            }
            return { date, datetimeAttr: value };
        }
        if (!ISO_DATETIME.test(value)) {
            return null;
        }
        const date = new Date(value);
        if (Number.isNaN(date.getTime())) {
            return null;
        }
        return { date, datetimeAttr: date.toISOString() };
    }
    return null;
}

/**
 * @param {*} value
 * @param {"date"|"datetime"} format
 * @param {import("../data-grid.js").DateFormatOptions} [formatOptions]
 * @param {Partial<import("../data-grid.js").CellContext>} [ctx]
 * @returns {string|Node}
 */
function formatDate(value, format, formatOptions, ctx = {}) {
    const parsed = parseDateValue(value, format);
    if (!parsed) {
        return "";
    }
    const options = resolveDateTimeOptions(format, formatOptions);
    const doc = ctx.grid?.ownerDocument ?? document;
    const time = doc.createElement("time");
    time.dateTime = parsed.datetimeAttr;
    time.textContent = new Intl.DateTimeFormat(resolveLocale(ctx.grid), options).format(parsed.date);
    return time;
}

/**
 * @param {*} value
 * @param {import("../data-grid.js").NumberFormatOptions} [formatOptions]
 * @param {Partial<import("../data-grid.js").CellContext>} [ctx]
 * @returns {string}
 */
function formatNumber(value, formatOptions = {}, ctx = {}) {
    // null and empty strings are missing values, never 0.
    if (value === null || value === undefined) {
        return "";
    }
    if (typeof value === "string" && value.trim() === "") {
        return "";
    }
    const number = Number(value);
    if (!Number.isFinite(number)) {
        return "";
    }
    const options = { ...formatOptions };
    if (!options.style && options.currency && options.unit) {
        throw new TypeError("currency and unit cannot both infer number style");
    }
    if (options.style === undefined && options.currency) {
        options.style = "currency";
    }
    if (options.style === undefined && options.unit) {
        options.style = "unit";
    }
    return new Intl.NumberFormat(resolveLocale(ctx.grid), options).format(number);
}

/**
 * Presentation defaults of a built-in formatter, consumed by the core to
 * resolve column geometry (header min-width, preferred width, cell alignment).
 * Only predictable formats suggest a preferred width: a percent column is
 * always compact, while currency, unit and plain numbers vary too much.
 * @param {import("../data-grid.js").Column["format"]} format
 * @param {import("../data-grid.js").DateFormatOptions|import("../data-grid.js").NumberFormatOptions} [formatOptions]
 * @returns {{ align?: "start"|"center"|"end", minWidth?: number, width?: number }|null}
 */
export function getFormatDefaults(format, formatOptions) {
    if (format === null || format === undefined) {
        return null;
    }
    if (format === "number" && /** @type {Record<string, any>} */ (formatOptions)?.style === "percent") {
        return { align: "end", minWidth: 72, width: 88 };
    }
    return formatDefaults[format] || null;
}

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
export default function formatValue(value, format, formatOptions, ctx = {}) {
    switch (format) {
        case "boolean":
            return formatBoolean(value, ctx);
        case "date":
        case "datetime":
            return formatDate(
                value,
                format,
                /** @type {import("../data-grid.js").DateFormatOptions|undefined} */ (formatOptions),
                ctx,
            );
        case "number":
            return formatNumber(
                value,
                /** @type {import("../data-grid.js").NumberFormatOptions|undefined} */ (formatOptions),
                ctx,
            );
        default:
            return value;
    }
}
