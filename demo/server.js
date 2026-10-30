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

// Source-owned financial sample; aggregation is intentionally server-side.
const revenueRows = Array.from({ length: 64 }, (_, i) => ({
    id: i + 1,
    customer: `Customer ${i + 1}`,
    status: i % 3 === 0 ? "trial" : "active",
    mrr: i % 7 === 0 ? 0 : 149 + ((i * 173) % 2400),
    seats: (i * 7) % 180,
    health: i % 13 === 0 ? null : ((i * 17) % 101) / 100,
}));

// In-memory overrides for the edit action
const overrides = new Map();

const HTML_ESCAPES = { "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" };

/**
 * @param {any} value
 * @returns {String}
 */
function escapeHtml(value) {
    return String(value).replace(/[&<>"']/g, (char) => HTML_ESCAPES[char]);
}

/**
 * Server-rendered full edit form, loaded by the application dialog. The demo
 * owns the fields, validation and endpoint; DataGrid only renders the action.
 * @param {Record<string, any>} record
 * @returns {String}
 */
function editForm(record) {
    const options = COMPANIES.map(
        (company) =>
            `<option value="${company}"${company === record.company ? " selected" : ""}>${company}</option>`,
    ).join("");
    return `<form method="post" action="/api/users/${record.id}/edit" class="demo-edit-form" novalidate>
  <p class="demo-edit-errors" role="alert" hidden></p>
  <label>First name <input name="first_name" value="${escapeHtml(record.first_name)}" /></label>
  <label>Last name <input name="last_name" value="${escapeHtml(record.last_name)}" /></label>
  <label>Company <select name="company">${options}</select></label>
  <button type="submit">Save changes</button>
</form>`;
}

// Number of /api/users list requests served (for the lazy-load demo)
let userListRequests = 0;

/**
 * Decode the bracket-notation query string produced by encodeSearchParams
 * back into a nested structure (arrays and objects). Prototype-chain segments
 * are rejected: the query string is untrusted input.
 * @param {URLSearchParams} params
 * @returns {Object}
 */
const FORBIDDEN_KEY_PARTS = new Set(["__proto__", "prototype", "constructor"]);

function decodeSearchParams(params) {
    const out = {};
    for (const [key, raw] of params) {
        const parts = key.split(/[\[\]]+/).filter(Boolean);
        if (parts.some((part) => FORBIDDEN_KEY_PARTS.has(part))) {
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

    if (url.pathname === "/api/revenue") {
        if (req.method !== "GET") return new NativeResponse("Method not allowed", { status: 405, headers });
        const query = decodeQuery(url.searchParams);
        const matching = applySearch(applyFilters(revenueRows, query.filters), query.search);
        let mrr = 0;
        let seats = 0;
        let health = 0;
        let healthCount = 0;
        for (const row of matching) {
            mrr += row.mrr;
            seats += row.seats;
            if (row.health != null) {
                health += row.health;
                healthCount++;
            }
        }
        return NativeResponse.json({
            rows: paginate(applySort(matching, query.sort), query.page, query.pageSize),
            total: matching.length,
            meta: { aggregates: { mrr, seats, health: healthCount ? health / healthCount : null } },
        }, { headers });
    }

    if (url.pathname === "/api/errors") {
        return new NativeResponse("Internal server error", { status: 500, headers });
    }

    if (url.pathname === "/api/users/requests") {
        return NativeResponse.json({ count: userListRequests }, { headers });
    }

    // Full edit demo: a server-rendered fragment and its dedicated submit route.
    const editMatch = url.pathname.match(/^\/api\/users\/(\d+)\/edit$/);
    if (editMatch) {
        const id = Number(editMatch[1]);
        const base = rows.find((row) => row.id === id);
        if (!base) {
            return new NativeResponse("Not found", { status: 404, headers });
        }
        const record = { ...base, ...overrides.get(id) };
        if (req.method === "POST") {
            const form = await req.formData();
            const patch = {
                first_name: String(form.get("first_name") ?? "").trim(),
                last_name: String(form.get("last_name") ?? "").trim(),
                company: String(form.get("company") ?? "").trim(),
            };
            /** @type {Record<String, String>} */
            const errors = {};
            if (!patch.first_name) {
                errors.first_name = "First name is required.";
            }
            if (!patch.last_name) {
                errors.last_name = "Last name is required.";
            }
            if (!COMPANIES.includes(patch.company)) {
                errors.company = "Choose a company from the list.";
            }
            if (Object.keys(errors).length) {
                return NativeResponse.json({ errors }, { status: 422, headers });
            }
            const updated = { ...record, ...patch };
            overrides.set(id, updated);
            return NativeResponse.json({ success: 1, record: updated }, { headers });
        }
        if (req.method !== "GET") {
            return new NativeResponse("Method not allowed", { status: 405, headers });
        }
        return new NativeResponse(editForm(record), {
            headers: { ...headers, "Content-Type": "text/html; charset=utf-8" },
        });
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

    userListRequests++; // list request (eager/lazy demo counter)

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
        hostname: "localhost",
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
