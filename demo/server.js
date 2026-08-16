import { applyFilters, applySearch, applySort, paginate } from "../src/data-source.js";

// happy-dom patches the global Response in tests; Bun.serve requires a native
// Response to be returned, so resolve the native constructor explicitly.
const NativeResponse = globalThis.NativeResponse ?? Response;

const ROWS_COUNT = 998;
const COMPANIES = ["Acme", "Google", "Facebook"];

const rows = Array.from({ length: ROWS_COUNT }, (_, i) => ({
    id: i + 1,
    first_name: `First name ${i + 1}`,
    last_name: `Last name ${i + 1}`,
    company: COMPANIES[i % COMPANIES.length],
}));

// In-memory overrides for the edit action
const overrides = new Map();

/**
 * Decode the bracket-notation query string produced by encodeSearchParams
 * back into a nested structure (arrays and objects).
 * @param {URLSearchParams} params
 * @returns {Object}
 */
function decodeSearchParams(params) {
    const out = {};
    for (const [key, raw] of params) {
        const parts = key.split(/[\[\]]+/).filter(Boolean);
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
                if (node[part] === undefined) {
                    node[part] = /^\d+$/.test(next) ? [] : {};
                }
                node = node[part];
            }
        }
    }
    return out;
}

/**
 * @param {URLSearchParams} params
 * @returns {import("../src/data-source.js").QueryState}
 */
function decodeQuery(params) {
    const decoded = decodeSearchParams(params);
    return {
        page: Number(decoded.page) || 1,
        pageSize: Number(decoded.pageSize) || 10,
        search: decoded.search ?? "",
        sort: Array.isArray(decoded.sort) ? decoded.sort : [],
        filters: decoded.filters ?? {},
    };
}

/**
 * API handler: /api/users (list + edit), /api/errors (simulated failure).
 * @param {Request} req
 * @param {URL} url
 * @returns {Promise<Response>}
 */
export async function handleApi(req, url) {
    const headers = {
        "Access-Control-Allow-Origin": "*",
        "Access-Control-Allow-Headers": "*",
    };

    if (url.pathname === "/api/errors") {
        return new NativeResponse("Internal server error", { status: 500, headers });
    }

    if (url.pathname !== "/api/users") {
        return new NativeResponse("Not found", { status: 404, headers });
    }

    // Simulate laggy server
    await Bun.sleep(100 + Math.floor(Math.random() * 500));

    // Edit action (POST): persist the updated row in memory
    if (url.searchParams.get("action") === "edit") {
        const body = await req.json().catch(() => null);
        const record = body?.data ?? null;
        if (record?.id) {
            overrides.set(Number(record.id), record);
        }
        return NativeResponse.json({ success: 1, record }, { headers });
    }

    const query = decodeQuery(url.searchParams);
    const data = rows.map((r) => overrides.get(r.id) ?? r);
    const filtered = applyFilters(data, query.filters);
    const searched = applySearch(filtered, query.search);
    const sorted = applySort(searched, query.sort);
    const pageRows = paginate(sorted, query.page, query.pageSize);

    return NativeResponse.json(
        {
            rows: pageRows,
            total: sorted.length,
            meta: { unfilteredTotal: data.length },
        },
        { headers },
    );
}

/**
 * Serve static files from the repo root.
 * @param {URL} url
 * @returns {Promise<Response>}
 */
async function handleStatic(url) {
    let path = url.pathname;
    if (path === "/") {
        // Redirect so relative links of the demo pages resolve under /demo/.
        return new NativeResponse(null, { status: 302, headers: { Location: "/demo/" } });
    }
    if (path.endsWith("/")) {
        path += "index.html";
    }
    const file = Bun.file(`.${path}`);
    if (await file.exists()) {
        return new NativeResponse(file);
    }
    return new NativeResponse("Not found", { status: 404 });
}

/**
 * Start the demo server (static files + API).
 * @param {Number} [port]
 * @returns {Server}
 */
export function start(port = Number(Bun.env.PORT ?? 8002)) {
    return Bun.serve({
        port,
        async fetch(req) {
            const url = new URL(req.url);
            if (url.pathname.startsWith("/api/")) {
                return handleApi(req, url);
            }
            return handleStatic(url);
        },
    });
}

if (import.meta.main) {
    const server = start();
    console.log(`Demo server running on http://localhost:${server.port}`);
}
