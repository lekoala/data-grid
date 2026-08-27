/** @typedef {import("./data-source.js").FilterState} FilterState */
/** @typedef {import("./data-source.js").QueryState} QueryState */

/**
 * Build a fresh, normalized query state.
 * @param {?QueryState} [query]
 * @returns {QueryState}
 */
export function normalizeQuery(query) {
    const q = /** @type {QueryState} */ (query || {});
    const page = Math.floor(Number(q.page)) || 1;
    const pageSize = Math.floor(Number(q.pageSize)) || 10;
    const search = typeof q.search === "string" ? q.search : "";
    const sort = Array.isArray(q.sort)
        ? q.sort
              .filter((item) => item?.field)
              .map((item) => ({
                  field: String(item.field),
                  direction: /** @type {"asc"|"desc"} */ (item.direction === "desc" ? "desc" : "asc"),
              }))
        : [];
    /** @type {Record<string, FilterState>} */
    const filters = {};
    if (q.filters && typeof q.filters === "object") {
        for (const [key, filter] of Object.entries(q.filters)) {
            if (filter === null || filter === undefined) {
                continue;
            }
            let operator;
            let value;
            if (typeof filter === "object") {
                // Structured form: the operator is explicit.
                operator = filter.operator;
                if (!operator) {
                    continue;
                }
                value = filter.value;
            } else {
                // Scalar shorthand uses the default text operator.
                operator = "contains";
                value = filter;
            }
            // Preserve valid falsy values; empty/notEmpty are the only
            // operators valid without a value. An empty array means no filter.
            const hasValue =
                value !== undefined && value !== null && value !== "" && !(Array.isArray(value) && value.length === 0);
            if (hasValue || operator === "empty" || operator === "notEmpty") {
                filters[key] = /** @type {FilterState} */ (hasValue ? { operator, value } : { operator });
            }
        }
    }
    return { page: Math.max(1, page), pageSize: Math.max(1, pageSize), search, sort, filters };
}
