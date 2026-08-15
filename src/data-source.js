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
 * Filter state
 * @typedef {Object} FilterState
 * @property {String} operator
 * @property {any} value
 */

/**
 * Runtime query state. Single source of truth for pagination, sort and filters.
 * @typedef {Object} QueryState
 * @property {Number} page
 * @property {Number} pageSize
 * @property {SortState[]} sort
 * @property {Record<string, FilterState>} filters
 */

/**
 * Result of a data source load
 * @typedef {Object} PageResult
 * @property {Array<Record<string, any>>} rows
 * @property {Number} total Number of rows matching the current query (used for pagination)
 * @property {Record<string, any>} [meta] Additional information (ex: total unfiltered)
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
 * Apply structured filters to an array. The UI currently only produces
 * "contains" and "eq", a few common operators are handled defensively.
 * @param {Array<Record<string, any>>} rows
 * @param {Record<string, FilterState>} [filters]
 * @returns {Array<Record<string, any>>}
 */
export function applyFilters(rows, filters) {
    if (!filters) {
        return rows.slice();
    }
    return rows.filter((item) => {
        for (const [field, filter] of Object.entries(filters)) {
            const operator = filter?.operator ?? "contains";
            const value = filter?.value;
            if (value === null || value === undefined || value === "") {
                continue;
            }
            const cell = `${item[field] ?? ""}`;
            const cellLower = cell.toLowerCase();
            const valueLower = String(value).toLowerCase();
            switch (operator) {
                case "eq":
                    if (cell !== String(value)) return false;
                    break;
                case "neq":
                    if (cell === String(value)) return false;
                    break;
                case "startsWith":
                    if (!cellLower.startsWith(valueLower)) return false;
                    break;
                case "endsWith":
                    if (!cellLower.endsWith(valueLower)) return false;
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
 * @param {any} json
 * @returns {PageResult}
 */
export function parseResult(json) {
    if (Array.isArray(json)) {
        return { rows: json, total: json.length, meta: {} };
    }
    const rows = Array.isArray(json?.data) ? json.data : [];
    const meta = json?.meta ?? {};
    return { rows, total: meta.filtered ?? rows.length, meta };
}

/**
 * Server-side data source (the assumed default path).
 * Each query is serialized and sent to the server.
 */
export class FetchDataSource {
    /**
     * @param {String} url
     * @param {Object} [options]
     * @param {Object} [options.params] Extra constant HTTP params appended to each request
     * @param {(query: QueryState) => any} [options.serializeQuery] Defaults to identity (QueryState preserved)
     * @param {(response: any) => PageResult} [options.parseResponse] Defaults to parseResult
     */
    constructor(url, { params = {}, serializeQuery = null, parseResponse = null } = {}) {
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
        if (!base.split("/").pop().includes(".")) {
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
    static async fromUrl(url, parseResponse = null) {
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
        rows = applySort(rows, query.sort);
        const total = rows.length;
        return {
            rows: paginate(rows, query.page || 1, query.pageSize || 10),
            total,
            meta: { total: this.rows.length },
        };
    }

    /**
     * @param {Record<string, any>} row
     */
    add(row) {
        this.rows.push(row);
    }

    /**
     * @param {any} value
     * @param {String} [key] Field to match. Defaults to the first field.
     */
    remove(value, key = null) {
        const k = key ?? (this.rows[0] && Object.keys(this.rows[0])[0]);
        if (k === undefined) {
            return;
        }
        const idx = this.rows.findIndex((row) => row[k] === value);
        if (idx !== -1) {
            this.rows.splice(idx, 1);
        }
    }
}
