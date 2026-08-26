import { expect, test } from "bun:test";
import {
    ArrayDataSource,
    applyFilters,
    applySearch,
    applySort,
    encodeSearchParams,
    FetchDataSource,
    paginate,
    parseResult,
} from "../src/data-source.js";

test("encodeSearchParams encodes nested objects and arrays", () => {
    const params = new URLSearchParams();
    encodeSearchParams(
        {
            page: 2,
            sort: [{ field: "name", direction: "asc" }],
            filters: { status: { operator: "eq", value: "active" } },
        },
        "",
        params,
    );
    expect(decodeURIComponent(params.toString())).toBe(
        "page=2&sort[0][field]=name&sort[0][direction]=asc&filters[status][operator]=eq&filters[status][value]=active",
    );
});

test("encodeSearchParams handles scalars, booleans and null", () => {
    const params = new URLSearchParams();
    encodeSearchParams({ enabled: true, count: 3, name: "john", empty: null, flag: false }, "", params);
    expect(params.toString()).toBe("enabled=true&count=3&name=john&flag=false");
});

test("applyFilters filters by contains and eq", () => {
    const rows = [{ name: "John" }, { name: "Jane" }, { name: "Bob" }];
    const contains = applyFilters(rows, { name: { operator: "contains", value: "jo" } });
    expect(contains.map((r) => r.name)).toEqual(["John"]);
    const eq = applyFilters(rows, { name: { operator: "eq", value: "Jane" } });
    expect(eq.map((r) => r.name)).toEqual(["Jane"]);
});

test("applyFilters compares eq and neq case-insensitively for text", () => {
    const rows = [{ name: "Mechanical Keyboard" }, { name: "Mouse" }];

    expect(applyFilters(rows, { name: { operator: "eq", value: "mechanical keyboard" } })).toEqual([
        { name: "Mechanical Keyboard" },
    ]);
    expect(applyFilters(rows, { name: { operator: "neq", value: "mechanical keyboard" } })).toEqual([
        { name: "Mouse" },
    ]);
});

test("applyFilters text operators are case- and accent-insensitive", () => {
    const rows = [
        { name: "Café Central" },
        { name: "CAFETERIA" },
        { name: "Élodie Martin" },
        { name: "Ångström" },
        { name: "Cafe\u0301 noir" },
        { name: "Restaurant" },
    ];

    expect(applyFilters(rows, { name: { operator: "eq", value: "cafe central" } })).toEqual([{ name: "Café Central" }]);
    expect(applyFilters(rows, { name: { operator: "contains", value: "cafe" } }).map((r) => r.name)).toEqual([
        "Café Central",
        "CAFETERIA",
        "Cafe\u0301 noir",
    ]);
    expect(applyFilters(rows, { name: { operator: "notContains", value: "cafe" } }).map((r) => r.name)).toEqual([
        "Élodie Martin",
        "Ångström",
        "Restaurant",
    ]);
    expect(applyFilters(rows, { name: { operator: "startsWith", value: "elodie" } })).toEqual([
        { name: "Élodie Martin" },
    ]);
    expect(applyFilters(rows, { name: { operator: "endsWith", value: "strom" } })).toEqual([
        { name: "Ångström" },
    ]);
    expect(
        applyFilters(rows, { name: { operator: "in", value: ["cafe central", "elodie martin"] } }).map((r) => r.name),
    ).toEqual(["Café Central", "Élodie Martin"]);
});

test("applySearch matches any scalar value case- and accent-insensitively", () => {
    const rows = [
        { name: "John", email: "john@acme.com" },
        { name: "Jane", email: "jane@acme.com" },
        { name: "Café Central" },
        { name: "Cafe\u0301 noir" },
        { name: "Bob" },
    ];
    expect(applySearch(rows, "JOHN").map((r) => r.name)).toEqual(["John"]);
    expect(applySearch(rows, "acme").map((r) => r.name)).toEqual(["John", "Jane"]);
    expect(applySearch(rows, "cafe").map((r) => r.name)).toEqual(["Café Central", "Cafe\u0301 noir"]);
    expect(applySearch(rows, "")).toEqual(rows);
    expect(applySearch(rows, "zzz")).toEqual([]);
});

test("applySort sorts asc and desc", () => {
    const rows = [{ n: 2 }, { n: 1 }, { n: 3 }];
    expect(applySort(rows, [{ field: "n", direction: "asc" }]).map((r) => r.n)).toEqual([1, 2, 3]);
    expect(applySort(rows, [{ field: "n", direction: "desc" }]).map((r) => r.n)).toEqual([3, 2, 1]);
});

test("applySort always keeps null/undefined/empty values last", () => {
    const rows = [{ name: "Bob" }, { name: "" }, { name: "Alice" }, { name: null }, { name: undefined }];
    const names = (result) => result.map((r) => r.name);

    expect(names(applySort(rows, [{ field: "name", direction: "asc" }]))).toEqual([
        "Alice",
        "Bob",
        "",
        null,
        undefined,
    ]);
    expect(names(applySort(rows, [{ field: "name", direction: "desc" }]))).toEqual([
        "Bob",
        "Alice",
        "",
        null,
        undefined,
    ]);
});

test("paginate slices a page", () => {
    const rows = [1, 2, 3, 4, 5].map((v) => ({ v }));
    expect(paginate(rows, 2, 2)).toEqual([{ v: 3 }, { v: 4 }]);
});

test("ArrayDataSource.remove removes by explicit key and reports success", () => {
    const ds = new ArrayDataSource([
        { id: 1, name: "a" },
        { id: 2, name: "b" },
    ]);

    expect(ds.remove(2, "id")).toBe(true);
    expect(ds.rows).toEqual([{ id: 1, name: "a" }]);
});

test("ArrayDataSource.remove returns false when nothing matches", () => {
    const ds = new ArrayDataSource([{ id: 1, name: "a" }]);

    expect(ds.remove(999, "id")).toBe(false);
    expect(ds.remove("nope", "name")).toBe(false);
    expect(ds.rows).toHaveLength(1);
});

test("ArrayDataSource.add pushes a row", () => {
    const ds = new ArrayDataSource([{ id: 1 }]);

    ds.add({ id: 2 });
    expect(ds.rows).toEqual([{ id: 1 }, { id: 2 }]);
});

test("ArrayDataSource loads a page with filter and sort", async () => {
    const ds = new ArrayDataSource([{ name: "b" }, { name: "a" }, { name: "b2" }]);
    const result = await ds.load({
        page: 1,
        pageSize: 2,
        sort: [{ field: "name", direction: "asc" }],
        filters: {},
        search: "",
    });
    expect(result.total).toBe(3);
    expect(result.rows.map((r) => r.name)).toEqual(["a", "b"]);
    expect(result.meta.unfilteredTotal).toBe(3);
});

test("ArrayDataSource applies the global search", async () => {
    const ds = new ArrayDataSource([{ name: "John" }, { name: "Jane" }, { name: "Bobby" }]);
    const result = await ds.load({
        page: 1,
        pageSize: 10,
        sort: [],
        filters: {},
        search: "o",
    });
    expect(result.total).toBe(2);
    expect(result.rows.map((r) => r.name)).toEqual(["John", "Bobby"]);
    expect(result.meta.unfilteredTotal).toBe(3);
});

test("FetchDataSource builds a structured url", () => {
    const ds = new FetchDataSource("/api/users");
    const url = ds.buildUrl({
        page: 2,
        pageSize: 25,
        search: "dupont",
        sort: [{ field: "name", direction: "asc" }],
        filters: { status: { operator: "eq", value: "active" } },
    });
    expect(url.searchParams.get("page")).toBe("2");
    expect(url.searchParams.get("pageSize")).toBe("25");
    expect(url.searchParams.get("search")).toBe("dupont");
    expect(url.searchParams.get("sort[0][field]")).toBe("name");
    expect(url.searchParams.get("sort[0][direction]")).toBe("asc");
    expect(url.searchParams.get("filters[status][operator]")).toBe("eq");
    expect(url.searchParams.get("filters[status][value]")).toBe("active");
    expect(url.searchParams.get("r")).toBeTruthy();
});

test("FetchDataSource parses an array response", async () => {
    globalThis.fetch = async () => ({ ok: true, json: async () => [{ id: 1 }, { id: 2 }] });
    const ds = new FetchDataSource("/api/users");
    const result = await ds.load({ page: 1, pageSize: 10, sort: [], filters: {}, search: "" });
    expect(result.rows.length).toBe(2);
    expect(result.total).toBe(2);
    delete globalThis.fetch;
});

test("FetchDataSource parses the canonical response contract", async () => {
    globalThis.fetch = async () => ({
        ok: true,
        json: async () => ({ rows: [{ id: 1 }], total: 42, meta: { unfilteredTotal: 100 } }),
    });
    const ds = new FetchDataSource("/api/users");
    const result = await ds.load({ page: 1, pageSize: 10, sort: [], filters: {}, search: "" });
    expect(result.total).toBe(42);
    expect(result.meta.unfilteredTotal).toBe(100);
    delete globalThis.fetch;
});

test("parseResult keeps the canonical shape and falls back to rows.length", () => {
    expect(parseResult({ rows: [{ id: 1 }], total: 7, meta: {} })).toEqual({
        rows: [{ id: 1 }],
        total: 7,
        meta: {},
    });
    expect(parseResult({ rows: [{ id: 1 }, { id: 2 }] })).toEqual({ rows: [{ id: 1 }, { id: 2 }], total: 2, meta: {} });
    expect(parseResult([{ id: 1 }])).toEqual({ rows: [{ id: 1 }], total: 1, meta: {} });
    expect(parseResult({})).toEqual({ rows: [], total: 0, meta: {} });
});

test("FetchDataSource throws on http error", async () => {
    globalThis.fetch = async () => ({ ok: false, statusText: "Not Found" });
    const ds = new FetchDataSource("/api/users");
    await expect(ds.load({ page: 1, pageSize: 10, sort: [], filters: {} })).rejects.toThrow("Not Found");
    delete globalThis.fetch;
});

test("ArrayDataSource.fromUrl fetches a collection once", async () => {
    globalThis.fetch = async () => ({ ok: true, json: async () => ({ rows: [{ id: 1 }, { id: 2 }] }) });
    const ds = await ArrayDataSource.fromUrl("/static.json");
    expect(ds.rows.length).toBe(2);
    delete globalThis.fetch;
});

test("custom serializeQuery and parseResponse are used", async () => {
    globalThis.fetch = async () => ({ ok: true, json: async () => ({ items: [{ id: 1 }], count: 7 }) });
    const ds = new FetchDataSource("/api/users", {
        serializeQuery(query) {
            return { offset: query.page, per_page: query.pageSize };
        },
        parseResponse(json) {
            return { rows: json.items, total: json.count, meta: json };
        },
    });
    const result = await ds.load({ page: 3, pageSize: 25, sort: [], filters: {} });
    expect(result.rows.length).toBe(1);
    expect(result.total).toBe(7);
    delete globalThis.fetch;
});
