/**
 * Data sources for the grid.
 *
 * A data source owns the collection and knows how to resolve a QueryState into
 * a PageResult. The grid only knows the duck-typed contract:
 *
 *   dataSource.load(query, { signal }) -> Promise<PageResult>
 */

/**
 * Sort state
 * @typedef {Object} SortState
 * @property {String} field
 * @property {"asc"|"desc"} direction
 */

/**
 * Supported filter operators
 * @typedef {"eq"|"neq"|"contains"|"startsWith"|"endsWith"|
 * "lt"|"lte"|"gt"|"gte"|"between"|"in"|"empty"|"notEmpty"} FilterOperator
 */

/**
 * Filter state
 * @typedef {Object} FilterState
 * @property {FilterOperator} operator
 * @property {any} [value]
 */

/**
 * Accepted public filter values. A scalar is a shorthand for
 * `{ operator: "contains", value }`; the structured form allows choosing
 * the operator (`empty`/`notEmpty` have no value).
 * @typedef {FilterState | String | Number | Boolean} FilterInput
 */

/**
 * Runtime query state. Single source of truth for pagination, search, sort and
 * filters.
 * @typedef {Object} QueryState
 * @property {Number} page
 * @property {Number} pageSize
 * @property {String} search Global search (server decides which fields it covers)
 * @property {SortState[]} sort
 * @property {Record<string, FilterInput>} filters
 */

/**
 * Result of a data source load
 * @typedef {Object} PageResult
 * @property {Array<Record<string, any>>} rows
 * @property {Number} total Number of rows matching the current query (used for pagination)
 * @property {Record<string, any>} [meta] Additional information (ex: total unfiltered)
 */

/**
 * A selectable value for a select filter, as provided by meta.filters
 * @typedef {Object} FilterOption
 * @property {String|Number|Boolean} value
 * @property {String} text
 */

/**
 * Data source contract (duck typing, no abstract class)
 * @typedef {Object} DataSource
 * @property {(query: QueryState, options: {signal?: AbortSignal}) => Promise<PageResult>} load
 */

/**
 * Encode a nested structure into bracket-style URL search params.
 * Generic helper, it has no knowledge of QueryState.
 * Conventions:
 * - string / number -> string
 * - boolean -> "true" / "false"
 * - null / undefined -> omitted
 * - array -> indexed notation a[0]=x
 * - object -> recursive bracket notation a[b]=x
 * @param {any} value
 * @param {String} prefix
 * @param {URLSearchParams} out
 * @returns {URLSearchParams}
 */
export function encodeSearchParams(value, prefix = "", out = new URLSearchParams()) {
    if (value === null || value === undefined) {
        return out;
    }
    if (Array.isArray(value)) {
        for (let i = 0; i < value.length; i++) {
            encodeSearchParams(value[i], `${prefix}[${i}]`, out);
        }
        return out;
    }
    if (typeof value === "object") {
        for (const key of Object.keys(value)) {
            encodeSearchParams(value[key], prefix ? `${prefix}[${key}]` : key, out);
        }
        return out;
    }
    let v = value;
    if (typeof v === "boolean") {
        v = v ? "true" : "false";
    }
    out.append(prefix, `${v}`);
    return out;
}

/**
 * Whether a value can participate in a numeric comparison.
 * Excludes "" and non-finite values.
 * @param {any} value
 * @returns {Boolean}
 */
function isNumericValue(value) {
    if (value === "" || value === null || value === undefined || typeof value === "boolean") {
        return false;
    }
    return Number.isFinite(Number(value));
}

/**
 * Apply structured filters to an array.
 * Semantics:
 * - empty := null | undefined | "" (0 and false are NOT empty)
 * - contains / startsWith / endsWith: case-insensitive string comparison
 * - eq / neq / in: scalar comparison after string coercion (42 matches "42")
 * - lt/lte/gt/gte/between: numeric comparison when both operands are finite
 *   numeric values, otherwise string comparison
 * - between requires a 2-value array, in requires an array
 * - empty/invalid filter values are ignored, not treated as "match nothing"
 * @param {Array<Record<string, any>>} rows
 * @param {Record<string, FilterInput>} [filters]
 * @returns {Array<Record<string, any>>}
 */
export function applyFilters(rows, filters) {
    if (!filters) {
        return rows.slice();
    }
    return rows.filter((item) => {
        for (const [field, filter] of Object.entries(filters)) {
            const state = typeof filter === "object" ? filter : { operator: "contains", value: filter };
            const operator = state.operator ?? "contains";
            const value = state.value;
            const cell = item[field];
            if (operator === "empty") {
                if (cell !== "" && cell !== null && cell !== undefined) {
                    return false;
                }
                continue;
            }
            if (operator === "notEmpty") {
                if (cell === "" || cell === null || cell === undefined) {
                    return false;
                }
                continue;
            }
            // All remaining operators require a value
            if (value === null || value === undefined || value === "") {
                continue;
            }
            const cellLower = `${cell ?? ""}`.toLowerCase();
            const valueLower = String(value).toLowerCase();
            switch (operator) {
                case "eq":
                    if (`${cell}` !== String(value)) return false;
                    break;
                case "neq":
                    if (`${cell}` === String(value)) return false;
                    break;
                case "startsWith":
                    if (!cellLower.startsWith(valueLower)) return false;
                    break;
                case "endsWith":
                    if (!cellLower.endsWith(valueLower)) return false;
                    break;
                case "lt":
                case "lte":
                case "gt":
                case "gte":
                    if (isNumericValue(cell) && isNumericValue(value)) {
                        const a = Number(cell);
                        const b = Number(value);
                        if (operator === "lt" && a >= b) return false;
                        if (operator === "lte" && a > b) return false;
                        if (operator === "gt" && a <= b) return false;
                        if (operator === "gte" && a < b) return false;
                    } else {
                        const cmp = `${cell ?? ""}`.localeCompare(String(value), undefined, { sensitivity: "base" });
                        if (operator === "lt" && cmp >= 0) return false;
                        if (operator === "lte" && cmp > 0) return false;
                        if (operator === "gt" && cmp <= 0) return false;
                        if (operator === "gte" && cmp < 0) return false;
                    }
                    break;
                case "between": {
                    if (!Array.isArray(value) || value.length !== 2) {
                        continue;
                    }
                    const [min, max] = value;
                    if (isNumericValue(cell) && isNumericValue(min) && isNumericValue(max)) {
                        const v = Number(cell);
                        if (v < Number(min) || v > Number(max)) return false;
                    } else {
                        const cmpMin = `${cell ?? ""}`.localeCompare(String(min), undefined, { sensitivity: "base" });
                        const cmpMax = `${cell ?? ""}`.localeCompare(String(max), undefined, { sensitivity: "base" });
                        if (cmpMin < 0 || cmpMax > 0) return false;
                    }
                    break;
                }
                case "in":
                    if (!Array.isArray(value)) {
                        continue;
                    }
                    if (!value.some((v) => `${v}` === `${cell}`)) return false;
                    break;
                default:
                    if (!cellLower.includes(valueLower)) return false;
            }
        }
        return true;
    });
}

/**
 * Apply the first sort state to an array (single sort for now).
 * @param {Array<Record<string, any>>} rows
 * @param {SortState[]} [sort]
 * @returns {Array<Record<string, any>>}
 */
export function applySort(rows, sort) {
    if (!sort?.length) {
        return rows.slice();
    }
    const { field, direction } = sort[0];
    const dir = direction === "desc" ? -1 : 1;
    return rows.slice().sort((a, b) => {
        // Empty values (null/undefined/empty string) always go last, whatever
        // the direction: they don't meaningfully compare with real values.
        const emptyA = a[field] === null || a[field] === undefined || a[field] === "";
        const emptyB = b[field] === null || b[field] === undefined || b[field] === "";
        if (emptyA !== emptyB) {
            return emptyA ? 1 : -1;
        }
        if (typeof a[field] === "number" && typeof b[field] === "number") {
            return (a[field] - b[field]) * dir;
        }
        const valA = `${a[field] ?? ""}`.toUpperCase();
        const valB = `${b[field] ?? ""}`.toUpperCase();
        if (valA > valB) return dir;
        if (valA < valB) return -dir;
        return 0;
    });
}

/**
 * Slice a sorted/filtered array to the requested page.
 * @param {Array<Record<string, any>>} rows
 * @param {Number} page
 * @param {Number} pageSize
 * @returns {Array<Record<string, any>>}
 */
export function paginate(rows, page, pageSize) {
    const start = (page - 1) * pageSize;
    return rows.slice(start, start + pageSize);
}

/**
 * Parse a raw response into a PageResult.
 *
 * The canonical server contract is:
 * ```json
 * { "rows": [...], "total": 142, "meta": { "unfilteredTotal": 998 } }
 * ```
 * `total` counts the rows matching the current query; `meta.unfilteredTotal`
 * (optional) counts the population before any search/filter.
 * @param {any} json
 * @returns {PageResult}
 */
export function parseResult(json) {
    if (Array.isArray(json)) {
        return { rows: json, total: json.length, meta: {} };
    }
    const rows = Array.isArray(json?.rows) ? json.rows : [];
    return {
        rows,
        total: Number.isFinite(json?.total) ? json.total : rows.length,
        meta: json?.meta ?? {},
    };
}

/**
 * Apply a global search locally: case-insensitive `contains` over the scalar
 * values of each row. This is a convenient default for client-side data, not a
 * contract for server backends: `QueryState.search` only means "the user asked
 * for a global search", the server decides which fields it covers.
 * @param {Array<Record<string, any>>} rows
 * @param {String} search
 * @returns {Array<Record<string, any>>}
 */
export function applySearch(rows, search) {
    if (!search) {
        return rows;
    }
    const needle = search.toLowerCase();
    return rows.filter((row) => {
        for (const value of Object.values(row)) {
            if (value !== null && value !== undefined && `${value}`.toLowerCase().includes(needle)) {
                return true;
            }
        }
        return false;
    });
}

/**
 * Server-side data source (the assumed default path).
 * Each query is serialized and sent to the server.
 */
export class FetchDataSource {
    /**
     * @param {String} url
     * @param {Object} [options]
     * @param {Record<string, any>} [options.params] Extra constant HTTP params appended to each request
     * @param {(query: QueryState) => any} [options.serializeQuery] Defaults to identity (QueryState preserved)
     * @param {(response: any) => PageResult} [options.parseResponse] Defaults to parseResult
     */
    constructor(url, { params = {}, serializeQuery, parseResponse } = {}) {
        this.url = url;
        this.params = params;
        this.serializeQuery = serializeQuery;
        this.parseResponse = parseResponse;
    }

    /**
     * @param {QueryState} query
     * @returns {URL}
     */
    buildUrl(query) {
        let base = window.location.href;
        // Tests run against about:blank where relative urls cannot resolve
        if (!base || base === "about:blank") {
            base = "http://localhost/";
        }
        const last = base.split("/").pop();
        if (!last?.includes(".")) {
            base += base.endsWith("/") ? "" : "/";
        }
        const url = new URL(this.url, base);
        const serialized = this.serializeQuery ? this.serializeQuery(query) : query;
        const merged = { ...serialized, ...this.params, r: Date.now() };
        encodeSearchParams(merged, "", url.searchParams);
        return url;
    }

    /**
     * @param {QueryState} query
     * @param {{signal?: AbortSignal}} [options]
     * @returns {Promise<PageResult>}
     */
    async load(query, { signal } = {}) {
        const url = this.buildUrl(query);
        let response;
        try {
            response = await fetch(url, { signal });
        } catch (err) {
            if (signal?.aborted) {
                throw err;
            }
            throw new Error("Network response error");
        }
        if (!response.ok) {
            const error = /** @type {any} */ (new Error(response.statusText || "Network response error"));
            error.response = response;
            throw error;
        }
        const json = await response.json();
        return this.parseResponse ? this.parseResponse(json) : parseResult(json);
    }
}

/**
 * Client-side data source. The whole collection is owned in the browser and
 * QueryStates are applied locally.
 */
export class ArrayDataSource {
    /**
     * @param {Array<Record<string, any>>} [rows]
     */
    constructor(rows = []) {
        this.rows = Array.isArray(rows) ? rows : [];
    }

    /**
     * Create a local data source by fetching a static file once.
     * @param {String} url
     * @param {(response: any) => PageResult} [parseResponse]
     * @returns {Promise<ArrayDataSource>}
     */
    static async fromUrl(url, parseResponse) {
        const response = await fetch(url);
        if (!response.ok) {
            throw new Error(response.statusText || "Network response error");
        }
        const json = await response.json();
        const result = parseResponse ? parseResponse(json) : parseResult(json);
        return new ArrayDataSource(result.rows);
    }

    /**
     * @param {QueryState} query
     * @returns {Promise<PageResult>}
     */
    async load(query) {
        let rows = applyFilters(this.rows, query.filters);
        rows = applySearch(rows, query.search);
        rows = applySort(rows, query.sort);
        const total = rows.length;
        return {
            rows: paginate(rows, query.page || 1, query.pageSize || 10),
            total,
            meta: { unfilteredTotal: this.rows.length },
        };
    }

    /**
     * @param {Record<string, any>} row
     */
    add(row) {
        this.rows.push(row);
    }

    /**
     * Remove the first row whose `key` field equals `value`.
     * The key is explicit: there is no magic "first field" fallback.
     * @param {any} value
     * @param {String} key Field to match
     * @returns {Boolean} Whether a row was removed
     */
    remove(value, key) {
        const idx = this.rows.findIndex((row) => row[key] === value);
        if (idx === -1) {
            return false;
        }
        this.rows.splice(idx, 1);
        return true;
    }
}
