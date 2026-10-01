import { expect, test } from "bun:test";
import DataGrid from "../data-grid.js";
import { paramsToQuery, queryToParams, replaceQueryParams } from "../demo/url-state.js";
import { ArrayDataSource } from "../src/data-source.js";

const DEFAULTS = { page: 1, pageSize: 25, search: "", sort: [], filters: {} };

const rows = [
    { id: 1, name: "Martin Dupont", status: "active", verified: true, income: 35000 },
    { id: 2, name: "Alice Martin", status: "archived", verified: false, income: 50000 },
    { id: 3, name: "Bob Martinet", status: "active", verified: 1, income: 62000 },
    { id: 4, name: "Été & Fils", status: "active", verified: "true", income: 47000 },
];

async function makeReadyGrid(opts = {}, data = rows) {
    DataGrid.unregisterPlugins();
    const inst = new DataGrid({ ...opts, dataSource: new ArrayDataSource(data) });
    document.body.appendChild(inst);
    await new Promise((resolve) => {
        inst.addEventListener("connected", resolve, { once: true });
        setTimeout(resolve, 2000);
    });
    return inst;
}

test("an empty URL reads back the complete defaults", () => {
    expect(paramsToQuery(new URLSearchParams(""), DEFAULTS)).toEqual(DEFAULTS);
});

test("restoring a clean URL clears stale search, filters and sort", async () => {
    const inst = await makeReadyGrid({ columns: [{ field: "name" }, { field: "status" }] });

    await inst.setQuery({
        search: "martin",
        sort: [{ field: "name", direction: "asc" }],
        filters: { status: { operator: "eq", value: "active" } },
    });
    expect(inst.query.filters).not.toEqual({});

    // This is exactly what the popstate handler feeds to setQuery(): a
    // complete state, so absence in the URL resets instead of preserving.
    await inst.setQuery(paramsToQuery(new URLSearchParams(""), DEFAULTS));

    expect(inst.query.search).toBe("");
    expect(inst.query.filters).toEqual({});
    expect(inst.query.sort).toEqual([]);
    expect(inst.query.page).toBe(1);
    document.body.removeChild(inst);
});

test("an explicit page survives alongside filters despite the auto-reset", async () => {
    // 30 rows so page 3 exists: otherwise the grid clamps to the last valid
    // page and the assertion would test pagination, not the query contract.
    const many = Array.from({ length: 30 }, (_, i) => ({ id: i + 1, name: `row${i}` }));
    const inst = await makeReadyGrid({ columns: [{ field: "name" }] }, many);

    const params = new URLSearchParams("page=3&pageSize=10&filters[name][operator]=contains&filters[name][value]=row");
    await inst.setQuery(paramsToQuery(params, DEFAULTS));

    expect(inst.query.page).toBe(3);
    expect(inst.query.filters).toEqual({ name: { operator: "contains", value: "row" } });
    document.body.removeChild(inst);
});

test("valueless operators round-trip without a value key", () => {
    const query = {
        ...DEFAULTS,
        filters: { deletedAt: { operator: "empty" }, name: { operator: "notEmpty" } },
    };
    const params = queryToParams(query);

    expect(params.get("filters[deletedAt][operator]")).toBe("empty");
    expect(params.get("filters[deletedAt][value]")).toBeNull();
    expect(paramsToQuery(params, DEFAULTS).filters).toEqual(query.filters);
});

test("multi-value operators round-trip as indexed arrays", () => {
    const query = {
        ...DEFAULTS,
        filters: {
            income: { operator: "between", value: [30000, 60000] },
            status: { operator: "in", value: ["active", "archived"] },
        },
    };
    const params = queryToParams(query);

    expect(params.get("filters[income][value][0]")).toBe("30000");
    expect(params.get("filters[status][value][1]")).toBe("archived");
    // The transport is textual: numbers come back as strings.
    expect(paramsToQuery(params, DEFAULTS).filters).toEqual({
        income: { operator: "between", value: ["30000", "60000"] },
        status: { operator: "in", value: ["active", "archived"] },
    });
});

test("unicode, ampersands and spaces survive the URL", () => {
    const query = {
        ...DEFAULTS,
        search: "Été & Fils",
        filters: { name: { operator: "contains", value: "a & b" } },
    };
    const restored = paramsToQuery(queryToParams(query), DEFAULTS);

    expect(restored.search).toBe("Été & Fils");
    expect(restored.filters).toEqual({ name: { operator: "contains", value: "a & b" } });
});

test("rewriting keeps foreign params, pathname and hash", () => {
    const url = new URL("https://example.test/patients?tab=archived&search=stale&page=5&return=/agenda#notes");
    const query = { ...DEFAULTS, filters: { status: { operator: "eq", value: "active" } } };

    replaceQueryParams(url, query);

    expect(url.pathname).toBe("/patients");
    expect(url.hash).toBe("#notes");
    expect(url.searchParams.get("tab")).toBe("archived");
    expect(url.searchParams.get("return")).toBe("/agenda");
    expect(url.searchParams.get("filters[status][value]")).toBe("active");
    // Stale grid-owned params are gone while foreign ones survive.
    expect(url.searchParams.get("search")).toBeNull();
    expect(url.searchParams.get("page")).toBeNull();
});

test("prototype-chain segments are rejected", () => {
    const params = new URLSearchParams(
        "__proto__[polluted]=1&constructor[prototype][polluted]=2&filters[__proto__][polluted]=3&filters[name][operator]=contains&filters[name][value]=row",
    );
    const restored = paramsToQuery(params, DEFAULTS);

    expect(restored.filters).toEqual({ name: { operator: "contains", value: "row" } });
    expect(Object.prototype.polluted).toBeUndefined();
    expect({}.polluted).toBeUndefined();
});

test("a URL-derived query filters the dataset functionally", async () => {
    const params = new URLSearchParams("filters[status][operator]=eq&filters[status][value]=active");
    const restored = paramsToQuery(params, DEFAULTS);

    // Explicitly textual: the boolean-looking value stays a string and still
    // matches through text equality, like the FetchDataSource transport.
    expect(typeof restored.filters.status.value).toBe("string");

    const inst = await makeReadyGrid({
        columns: [{ field: "name" }, { field: "status" }],
        initialQuery: restored,
    });

    expect(inst.rows.map((row) => row.id)).toEqual([1, 3, 4]);
    document.body.removeChild(inst);
});
