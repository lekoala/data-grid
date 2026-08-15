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
export function encodeSearchParams(value: any, prefix?: string, out?: URLSearchParams): URLSearchParams;
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
 * @param {Record<string, FilterState>} [filters]
 * @returns {Array<Record<string, any>>}
 */
export function applyFilters(rows: Array<Record<string, any>>, filters?: Record<string, FilterState>): Array<Record<string, any>>;
/**
 * Apply the first sort state to an array (single sort for now).
 * @param {Array<Record<string, any>>} rows
 * @param {SortState[]} [sort]
 * @returns {Array<Record<string, any>>}
 */
export function applySort(rows: Array<Record<string, any>>, sort?: SortState[]): Array<Record<string, any>>;
/**
 * Slice a sorted/filtered array to the requested page.
 * @param {Array<Record<string, any>>} rows
 * @param {Number} page
 * @param {Number} pageSize
 * @returns {Array<Record<string, any>>}
 */
export function paginate(rows: Array<Record<string, any>>, page: number, pageSize: number): Array<Record<string, any>>;
/**
 * Parse a raw response into a PageResult.
 * @param {any} json
 * @returns {PageResult}
 */
export function parseResult(json: any): PageResult;
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
    constructor(url: string, { params, serializeQuery, parseResponse }?: {
        params?: Record<string, any> | undefined;
        serializeQuery?: ((query: QueryState) => any) | undefined;
        parseResponse?: ((response: any) => PageResult) | undefined;
    });
    url: string;
    params: Record<string, any>;
    serializeQuery: ((query: QueryState) => any) | undefined;
    parseResponse: ((response: any) => PageResult) | undefined;
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
export class ArrayDataSource {
    /**
     * Create a local data source by fetching a static file once.
     * @param {String} url
     * @param {(response: any) => PageResult} [parseResponse]
     * @returns {Promise<ArrayDataSource>}
     */
    static fromUrl(url: string, parseResponse?: (response: any) => PageResult): Promise<ArrayDataSource>;
    /**
     * @param {Array<Record<string, any>>} [rows]
     */
    constructor(rows?: Array<Record<string, any>>);
    rows: Record<string, any>[];
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
     * @param {any} value
     * @param {String} [key] Field to match. Defaults to the first field.
     */
    remove(value: any, key?: string): void;
}
/**
 * Sort state
 */
export type SortState = {
    field: string;
    direction: "asc" | "desc";
};
/**
 * Supported filter operators
 */
export type FilterOperator = "eq" | "neq" | "contains" | "startsWith" | "endsWith" | "lt" | "lte" | "gt" | "gte" | "between" | "in" | "empty" | "notEmpty";
/**
 * Filter state
 */
export type FilterState = {
    operator: FilterOperator;
    value?: any;
};
/**
 * Runtime query state. Single source of truth for pagination, sort and filters.
 */
export type QueryState = {
    page: number;
    pageSize: number;
    sort: SortState[];
    filters: Record<string, FilterState>;
};
/**
 * Result of a data source load
 */
export type PageResult = {
    rows: Array<Record<string, any>>;
    /**
     * Number of rows matching the current query (used for pagination)
     */
    total: number;
    /**
     * Additional information (ex: total unfiltered)
     */
    meta?: Record<string, any> | undefined;
};
/**
 * A selectable value for a select filter, as provided by meta.filters
 */
export type FilterOption = {
    value: string | number | boolean;
    text: string;
};
/**
 * Data source contract (duck typing, no abstract class)
 */
export type DataSource = {
    load: (query: QueryState, options: {
        signal?: AbortSignal;
    }) => Promise<PageResult>;
};
//# sourceMappingURL=data-source.d.ts.map