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
export default function transformValue(value: any, transform: "uppercase" | "lowercase" | "array" | import("../data-grid.js").ValueTransform | null | undefined, ctx: import("../data-grid.js").CellContext): any;
//# sourceMappingURL=transformValue.d.ts.map