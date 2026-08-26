/**
 * Data sources for the grid.
 *
 * A data source owns the collection and knows how to resolve a QueryState into
 * a PageResult. The grid only knows the duck-typed contract:
 *
 *   dataSource.load(query, { signal }) -> Promise<PageResult>
 */
export type SortState = {
    field: string;
    direction: "asc" | "desc";
};
export type FilterOperator = "eq" | "neq" | "contains" | "notContains" | "startsWith" | "notStartsWith" | "endsWith" | "notEndsWith" | "lt" | "lte" | "gt" | "gte" | "between" | "in" | "empty" | "notEmpty";
export type FilterState = {
    operator: FilterOperator;
    value?: any;
};
export type FilterInput = FilterState | String | Number | Boolean;
export type QueryState = {
    page: number;
    pageSize: number;
    /**
     * Global search (server decides which fields it covers)
     */
    search: string;
    sort: SortState[];
    filters: Record<string, FilterInput>;
};
export type PageResult = {
    rows: Array<Record<string, any>>;
    /**
     * Number of rows matching the current query (used for pagination)
     */
    total: number;
    /**
     * Additional information (ex: total unfiltered)
     */
    meta?: Record<string, any>;
};
export type FilterOption = {
    value: string | number | boolean;
    text: string;
};
export type DataSource = {
    load: (query: QueryState, options: {
        signal?: AbortSignal;
    }) => Promise<PageResult>;
};
/**
 * Sort state
 * @typedef {Object} SortState
 * @property {String} field
 * @property {"asc"|"desc"} direction
 */
/**
 * Supported filter operators
 * @typedef {"eq"|"neq"|"contains"|"notContains"|"startsWith"|"notStartsWith"|"endsWith"|"notEndsWith"|"lt"|"lte"|"gt"|"gte"|"between"|"in"|"empty"|"notEmpty"} FilterOperator
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
export declare function encodeSearchParams(value: any, prefix?: string, out?: URLSearchParams): URLSearchParams;
/**
 * Apply structured filters to an array.
 * Semantics:
 * - empty := null | undefined | "" (0 and false are NOT empty)
 * - contains / notContains / startsWith / notStartsWith / endsWith /
 *   notEndsWith: case- and accent-insensitive string comparison
 * - eq / neq: a boolean value compares normalized booleans (true matches
 *   1, "1" and "true"); otherwise scalar comparison after string coercion,
 *   case- and accent-insensitive for text (42 matches "42", "Café" matches
 *   "cafe")
 * - in: scalar comparison after string coercion, case- and accent-insensitive
 *   for text
 * - lt/lte/gt/gte/between: numeric comparison when both operands are finite
 *   numeric values, otherwise string comparison
 * - between requires a 2-value array, in requires a non-empty array
 * - empty/invalid filter values are ignored, not treated as "match nothing"
 * @param {Array<Record<string, any>>} rows
 * @param {Record<string, FilterInput>} [filters]
 * @returns {Array<Record<string, any>>}
 */
export declare function applyFilters(rows: Array<Record<string, any>>, filters?: Record<string, FilterInput>): Array<Record<string, any>>;
/**
 * Apply the first sort state to an array (single sort for now).
 * @param {Array<Record<string, any>>} rows
 * @param {SortState[]} [sort]
 * @returns {Array<Record<string, any>>}
 */
export declare function applySort(rows: Array<Record<string, any>>, sort?: SortState[]): Array<Record<string, any>>;
/**
 * Slice a sorted/filtered array to the requested page.
 * @param {Array<Record<string, any>>} rows
 * @param {Number} page
 * @param {Number} pageSize
 * @returns {Array<Record<string, any>>}
 */
export declare function paginate(rows: Array<Record<string, any>>, page: number, pageSize: number): Array<Record<string, any>>;
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
export declare function parseResult(json: any): PageResult;
/**
 * Apply a global search locally: case- and accent-insensitive `contains` over
 * the scalar values of each row. This is a convenient default for client-side
 * data, not a contract for server backends: `QueryState.search` only means
 * "the user asked for a global search", the server decides which fields it
 * covers.
 * @param {Array<Record<string, any>>} rows
 * @param {String} search
 * @returns {Array<Record<string, any>>}
 */
export declare function applySearch(rows: Array<Record<string, any>>, search: string): Array<Record<string, any>>;
/**
 * Server-side data source (the assumed default path).
 * Each query is serialized and sent to the server.
 */
export declare class FetchDataSource {
    url: string;
    params: Record<string, any>;
    serializeQuery: ((query: QueryState) => any) | undefined;
    parseResponse: ((response: any) => PageResult) | undefined;
    /**
     * @param {String} url
     * @param {Object} [options]
     * @param {Record<string, any>} [options.params] Extra constant HTTP params appended to each request
     * @param {(query: QueryState) => any} [options.serializeQuery] Defaults to identity (QueryState preserved)
     * @param {(response: any) => PageResult} [options.parseResponse] Defaults to parseResult
     */
    constructor(url: string, { params, serializeQuery, parseResponse }?: {
        params?: Record<string, any>;
        serializeQuery?: (query: QueryState) => any;
        parseResponse?: (response: any) => PageResult;
    });
    /**
     * @param {QueryState} query
     * @returns {URL}
     */
    buildUrl(query: QueryState): URL;
    /**
     * @param {QueryState} query
     * @param {{signal?: AbortSignal}} [options]
     * @returns {Promise<PageResult>}
     */
    load(query: QueryState, { signal }?: {
        signal?: AbortSignal;
    }): Promise<PageResult>;
}
/**
 * Client-side data source. The whole collection is owned in the browser and
 * QueryStates are applied locally.
 */
export declare class ArrayDataSource {
    rows: Record<string, any>[];
    /**
     * @param {Array<Record<string, any>>} [rows]
     */
    constructor(rows?: Array<Record<string, any>>);
    /**
     * Create a local data source by fetching a static file once.
     * @param {String} url
     * @param {(response: any) => PageResult} [parseResponse]
     * @returns {Promise<ArrayDataSource>}
     */
    static fromUrl(url: string, parseResponse?: (response: any) => PageResult): Promise<ArrayDataSource>;
    /**
     * @param {QueryState} query
     * @returns {Promise<PageResult>}
     */
    load(query: QueryState): Promise<PageResult>;
    /**
     * @param {Record<string, any>} row
     */
    add(row: Record<string, any>): void;
    /**
     * Remove the first row whose `key` field equals `value`.
     * The key is explicit: there is no magic "first field" fallback.
     * @param {any} value
     * @param {String} key Field to match
     * @returns {Boolean} Whether a row was removed
     */
    remove(value: any, key: string): boolean;
}
//# sourceMappingURL=data-source.d.ts.map