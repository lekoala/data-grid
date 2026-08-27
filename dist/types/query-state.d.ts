/** @typedef {import("./data-source.js").FilterState} FilterState */
/** @typedef {import("./data-source.js").QueryState} QueryState */
export type FilterState = import("./data-source.js").FilterState;
export type QueryState = import("./data-source.js").QueryState;
/**
 * Build a fresh, normalized query state.
 * @param {?QueryState} [query]
 * @returns {QueryState}
 */
export declare function normalizeQuery(query?: QueryState | null): QueryState;
//# sourceMappingURL=query-state.d.ts.map