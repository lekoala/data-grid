import { encodeSearchParams } from "../src/data-source.js";

/**
 * Shareable-URL adapter for DataGrid query state (recipe, not core).
 *
 * The address bar speaks the same bracket notation as FetchDataSource, so a
 * URL produced here is directly readable by a server speaking the grid
 * protocol. Values travel as strings: the query string is a textual transport
 * compatible with that protocol, not a type-preserving serialization of
 * QueryState (page/pageSize coerce back through Number(), textual matching
 * stays textual, numeric comparisons coerce like the server does).
 */

/** Query roots owned by the grid; foreign params are never touched. */
export const QUERY_KEYS = ["page", "pageSize", "search", "sort", "filters"];

/** Bracket-decoded roots accepted from the URL (untrusted input). */
const GRID_ROOTS = new Set(QUERY_KEYS);

/** Prototype-chain segments are never valid query content. */
const FORBIDDEN_PARTS = new Set(["__proto__", "prototype", "constructor"]);

/**
 * Decode bracket-notation params into a nested structure (arrays and
 * objects), mirroring demo/server.js with the same hardening: foreign roots
 * are ignored and prototype-chain segments rejected.
 * @param {URLSearchParams} params
 * @returns {Record<string, any>}
 */
function decodeParams(params) {
    const out = {};
    for (const [key, raw] of params) {
        const parts = key.split(/[\[\]]+/).filter(Boolean);
        if (!parts.length || !GRID_ROOTS.has(parts[0])) {
            continue;
        }
        if (parts.some((part) => FORBIDDEN_PARTS.has(part))) {
            continue;
        }
        let node = out;
        for (let i = 0; i < parts.length; i++) {
            const part = parts[i];
            if (i === parts.length - 1) {
                if (Array.isArray(node)) {
                    node.push(raw);
                } else {
                    node[part] = raw;
                }
            } else {
                const next = parts[i + 1];
                if (!Object.hasOwn(node, part)) {
                    node[part] = /^\d+$/.test(next) ? [] : {};
                }
                node = node[part];
            }
        }
    }
    return out;
}

/**
 * @param {any} value
 * @param {Number} fallback
 * @returns {Number}
 */
function toPositiveInt(value, fallback) {
    const number = Math.floor(Number(value));
    return Number.isFinite(number) && number >= 1 ? number : fallback;
}

/**
 * Serialize a query state into URL params with defaults stripped: an empty
 * search, empty sort/filters and page 1 are omitted so shared URLs stay
 * short. pageSize is always kept.
 * @param {import("../src/data-source.js").QueryState} query
 * @returns {URLSearchParams}
 */
export function queryToParams(query) {
    const stripped = { pageSize: query.pageSize };
    if (query.page !== 1) {
        stripped.page = query.page;
    }
    if (query.search) {
        stripped.search = query.search;
    }
    if (Array.isArray(query.sort) && query.sort.length) {
        stripped.sort = query.sort;
    }
    if (query.filters && Object.keys(query.filters).length) {
        stripped.filters = query.filters;
    }
    return encodeSearchParams(stripped);
}

/**
 * Read a complete query state from URL params. Absence in the URL means
 * "back to the default", never "leave unchanged": the result is always a
 * full state suitable for setQuery() after a back/forward navigation, where a
 * partial patch would wrongly preserve stale search/filters/sort.
 * @param {URLSearchParams} params
 * @param {{ page: Number, pageSize: Number, search: String, sort: Array, filters: Object }} defaults
 * @returns {{ page: Number, pageSize: Number, search: String, sort: Array, filters: Object }}
 */
export function paramsToQuery(params, defaults) {
    const decoded = decodeParams(params);
    return {
        page: toPositiveInt(decoded.page, defaults.page),
        pageSize: toPositiveInt(decoded.pageSize, defaults.pageSize),
        search: typeof decoded.search === "string" ? decoded.search : defaults.search,
        sort: Array.isArray(decoded.sort) ? decoded.sort : defaults.sort,
        filters: decoded.filters && typeof decoded.filters === "object" ? decoded.filters : defaults.filters,
    };
}

/**
 * Rewrite only the grid-owned params of an url, preserving the pathname,
 * foreign query params and the hash. Mutates and returns the given URL.
 * @param {URL} url
 * @param {import("../src/data-source.js").QueryState} query
 * @returns {URL}
 */
export function replaceQueryParams(url, query) {
    for (const key of QUERY_KEYS) {
        url.searchParams.delete(key);
        for (const name of [...url.searchParams.keys()]) {
            if (name.startsWith(`${key}[`)) {
                url.searchParams.delete(name);
            }
        }
    }
    for (const [key, value] of queryToParams(query)) {
        url.searchParams.append(key, value);
    }
    return url;
}
