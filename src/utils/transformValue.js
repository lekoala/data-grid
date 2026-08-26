/**
 * Built-in named transforms used by the declarative `data-transform` attribute.
 * A function transform always wins over a named one.
 */
/**
 * @type {Record<string, (value: *, ctx: import("../data-grid.js").CellContext) => *>}
 */
const transforms = {
    uppercase: (value) => String(value).toUpperCase(),
    lowercase: (value) => String(value).toLowerCase(),
    array: (value) => (Array.isArray(value) ? value.join(", ") : value),
};

/**
 * Transform a cell value for display.
 *
 * `transform` is either a named built-in, a custom function `(value, ctx) => *`,
 * or absent. An unknown named transform leaves the value unchanged, so
 * declarative HTML never breaks on a typo or an unknown key.
 *
 * @param {*} value
 * @param {"uppercase"|"lowercase"|"array"|import("../data-grid.js").ValueTransform|null|undefined} transform
 * @param {import("../data-grid.js").CellContext} ctx
 * @returns {*}
 */
export default function transformValue(value, transform, ctx) {
    if (typeof transform === "function") {
        return transform(value, ctx);
    }

    if (typeof transform === "string" && transforms[transform]) {
        return transforms[transform](value, ctx);
    }

    return value;
}
