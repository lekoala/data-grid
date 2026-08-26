/** @typedef {import("./data-source.js").FilterOperator} FilterOperator */
/** @typedef {import("./data-source.js").FilterState} FilterState */
export type FilterOperator = import("./data-source.js").FilterOperator;
export type FilterState = import("./data-source.js").FilterState;
/**
 * Parse the minimal text-filter syntax into a canonical FilterState.
 * Incomplete operator-only inputs stay literal so typing `>` or `%` does not
 * silently clear the filter.
 * @param {string} value
 * @returns {FilterState}
 */
export declare function parseTextFilterQuery(value: string): FilterState;
/**
 * Parse a canonical date query into an explicit, server-friendly FilterState.
 * Bare year/month inputs become inclusive ranges; comparisons on partial dates
 * resolve to the matching lower/upper bound.
 * @param {string} value
 * @returns {FilterState}
 */
export declare function parseDateFilterQuery(value: string): FilterState;
/**
 * Format a text-compatible FilterState back into the minimal input syntax.
 * Operators without a text representation fall back to the raw value.
 * @param {FilterState|undefined} filter
 * @returns {string}
 */
export declare function formatTextFilterQuery(filter: FilterState | undefined): string;
/**
 * Format a canonical date FilterState back into a concise date query string.
 * @param {FilterState|undefined} filter
 * @returns {string}
 */
export declare function formatDateFilterQuery(filter: FilterState | undefined): string;
//# sourceMappingURL=filter-query.d.ts.map