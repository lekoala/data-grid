import { expect, test } from "bun:test";
import DataGrid from "../data-grid.js";
import { ArrayDataSource, applyFilters } from "../src/data-source.js";

async function makeReadyGrid(opts = {}, data = null) {
    DataGrid.registerPlugins({});
    const options = { ...opts };
    if (data !== null) {
        options.dataSource = new ArrayDataSource(data);
    }
    const inst = new DataGrid(options);
    document.body.appendChild(inst);
    await new Promise((resolve) => {
        inst.addEventListener("connected", resolve, { once: true });
        setTimeout(resolve, 2000);
    });
    return inst;
}

const sleep = (ms) => new Promise((resolve) => setTimeout(resolve, ms));
const tick = () => sleep(0);

/**
 * Wrap a data source and count how many times its load() runs.
 * @param {Array<Record<string, any>>} data
 */
function instrumentedSource(data) {
    const ds = new ArrayDataSource(data);
    const original = ds.load.bind(ds);
    let loads = 0;
    ds.load = (...args) => {
        loads++;
        return original(...args);
    };
    return { ds, count: () => loads };
}

/** Type into a text filter input, dispatching an input event per character. */
function typeFilter(inst, field, text) {
    const input = inst.querySelector(`.dg-head-filters input[data-name="${field}"]`);
    for (const ch of text) {
        input.value += ch;
        input.dispatchEvent(new Event("input", { bubbles: true }));
    }
    return input;
}

test("applyFilters implements all operators", () => {
    const rows = [
        { id: 1, name: "Alice", age: 30, active: true },
        { id: 2, name: "bob", age: 25, active: false },
        { id: 3, name: "Charlie", age: 40, active: true },
        { id: 4, name: "", age: 18, active: false },
        { id: 5, name: null, age: 50, active: true },
    ];
    const ids = (rows) => rows.map((r) => r.id);

    expect(ids(applyFilters(rows, { name: { operator: "eq", value: "Alice" } }))).toEqual([1]);
    expect(ids(applyFilters(rows, { id: { operator: "eq", value: "1" } }))).toEqual([1]);
    expect(ids(applyFilters(rows, { name: { operator: "neq", value: "bob" } }))).toEqual([1, 3, 4, 5]);
    expect(ids(applyFilters(rows, { name: { operator: "contains", value: "A" } }))).toEqual([1, 3]);
    expect(ids(applyFilters(rows, { name: { operator: "startsWith", value: "al" } }))).toEqual([1]);
    expect(ids(applyFilters(rows, { name: { operator: "endsWith", value: "E" } }))).toEqual([1, 3]);
    expect(ids(applyFilters(rows, { age: { operator: "lt", value: 30 } }))).toEqual([2, 4]);
    expect(ids(applyFilters(rows, { age: { operator: "lte", value: 25 } }))).toEqual([2, 4]);
    expect(ids(applyFilters(rows, { age: { operator: "gt", value: 30 } }))).toEqual([3, 5]);
    expect(ids(applyFilters(rows, { age: { operator: "gte", value: 30 } }))).toEqual([1, 3, 5]);
    expect(ids(applyFilters(rows, { age: { operator: "between", value: [25, 30] } }))).toEqual([1, 2]);
    expect(ids(applyFilters(rows, { name: { operator: "in", value: ["Alice", "Charlie"] } }))).toEqual([1, 3]);
    expect(ids(applyFilters(rows, { name: { operator: "empty" } }))).toEqual([4, 5]);
    expect(ids(applyFilters(rows, { name: { operator: "notEmpty" } }))).toEqual([1, 2, 3]);
});

test("0 and false are not empty, but empty values are", () => {
    const rows = [
        { id: 1, score: 0 },
        { id: 2, score: 42 },
        { id: 3, score: null },
    ];
    const ids = (rows) => rows.map((r) => r.id);

    expect(ids(applyFilters(rows, { score: { operator: "eq", value: 0 } }))).toEqual([1]);
    expect(ids(applyFilters(rows, { score: { operator: "eq", value: "0" } }))).toEqual([1]);
    expect(ids(applyFilters(rows, { score: { operator: "empty" } }))).toEqual([3]);
    expect(ids(applyFilters(rows, { score: { operator: "notEmpty" } }))).toEqual([1, 2]);
});

test("relational operators compare numerically or lexically", () => {
    const numeric = [{ v: "10" }, { v: "9" }, { v: "2" }];
    expect(applyFilters(numeric, { v: { operator: "gt", value: 9 } })).toEqual([{ v: "10" }]);

    const lexical = [{ v: "apple" }, { v: "banana" }];
    expect(applyFilters(lexical, { v: { operator: "lt", value: "banana" } })).toEqual([{ v: "apple" }]);
});

test("invalid between/in filters are ignored", () => {
    const rows = [
        { id: 1, age: 25 },
        { id: 2, age: 30 },
    ];

    expect(applyFilters(rows, { age: { operator: "between", value: [1] } })).toEqual(rows);
    expect(applyFilters(rows, { age: { operator: "between", value: "25,30" } })).toEqual(rows);
    expect(applyFilters(rows, { id: { operator: "in", value: "1" } })).toEqual(rows);
});

test("scalar shorthand filters normalize to contains", async () => {
    const inst = await makeReadyGrid(
        { columns: [{ field: "name" }], filterable: true, initialQuery: { filters: { name: "Alice" } } },
        [{ name: "Alice" }, { name: "Bob" }],
    );
    expect(inst.query.filters.name).toEqual({ operator: "contains", value: "Alice" });
    document.body.removeChild(inst);
});

test("objects without an operator are ignored", async () => {
    const inst = await makeReadyGrid(
        {
            columns: [{ field: "name" }],
            filterable: true,
            initialQuery: { filters: { age: { value: 3 }, name: { operator: "contains", value: "Alice" } } },
        },
        [{ name: "Alice" }, { name: "Bob" }],
    );
    expect(inst.query.filters).toEqual({ name: { operator: "contains", value: "Alice" } });
    document.body.removeChild(inst);
});

test("empty/notEmpty filters are preserved without a value", async () => {
    const inst = await makeReadyGrid(
        { columns: [{ field: "name" }], initialQuery: { filters: { name: { operator: "empty" } } } },
        [{ name: "Alice" }],
    );
    expect(inst.query.filters.name).toEqual({ operator: "empty" });
    document.body.removeChild(inst);
});

test("0 and false are preserved, empty strings are dropped", async () => {
    const inst = await makeReadyGrid(
        {
            columns: [{ field: "name" }],
            initialQuery: {
                filters: { zero: 0, flag: false, empty: "", name: { operator: "eq", value: "" } },
            },
        },
        [{ name: "Alice" }],
    );
    const filters = inst.query.filters;
    expect(filters.zero).toEqual({ operator: "contains", value: 0 });
    expect(filters.flag).toEqual({ operator: "contains", value: false });
    expect(filters.empty).toBeUndefined();
    expect(filters.name).toBeUndefined();
    document.body.removeChild(inst);
});

test("meta.filters provides select options with the placeholder prepended", async () => {
    const inst = await makeReadyGrid({ columns: [{ field: "name", filterType: "select" }] }, [
        { name: "a" },
        { name: "b" },
    ]);
    inst.meta = {
        filters: {
            name: [
                { value: "BE", text: "Belgium" },
                { value: "FR", text: "France" },
            ],
        },
    };
    expect(inst.getFilterOptions(inst.options.columns[0])).toEqual([
        { value: "", text: "" },
        { value: "BE", text: "Belgium" },
        { value: "FR", text: "France" },
    ]);
    document.body.removeChild(inst);
});

test("explicit filterList is used as-is and not mutated", async () => {
    const list = [
        { value: "", text: "All" },
        { value: "a", text: "A" },
    ];
    const inst = await makeReadyGrid(
        { columns: [{ field: "name", filterType: "select", filterList: list }], filterable: true },
        [{ name: "a" }],
    );
    expect(inst.getFilterOptions(inst.options.columns[0])).toBe(list);
    expect(inst.options.columns[0].filterList).toBe(list);

    const select = inst.querySelector(".dg-head-filters select");
    expect(select.querySelectorAll("option")).toHaveLength(2);
    document.body.removeChild(inst);
});

test("ArrayDataSource derives options from the full collection, not the current page", async () => {
    const data = [{ name: "b" }, { name: "a" }, { name: "b" }, { name: "c" }];
    const inst = await makeReadyGrid({ columns: [{ field: "name", filterType: "select" }], pageSize: 2 }, data);
    expect(inst.getFilterOptions(inst.options.columns[0])).toEqual([
        { value: "", text: "" },
        { value: "a", text: "a" },
        { value: "b", text: "b" },
        { value: "c", text: "c" },
    ]);
    document.body.removeChild(inst);
});

test("FetchDataSource never derives options from the current rows", () => {
    DataGrid.registerPlugins({});
    const inst = new DataGrid({ columns: [{ field: "name", filterType: "select" }], src: "/api/users" });
    inst.setupDataSource();
    inst.rows = [{ name: "x" }];
    inst.meta = {};
    expect(inst.getFilterOptions(inst.options.columns[0])).toEqual([{ value: "", text: "" }]);
});

test("relational operators flow end to end through the grid", async () => {
    const data = Array.from({ length: 30 }, (_, i) => ({ id: i + 1, age: 18 + (i % 20) }));
    const inst = await makeReadyGrid({ columns: [{ field: "id" }, { field: "age" }] }, data);

    await inst.setQuery({ filters: { age: { operator: "gt", value: 30 } }, pageSize: 50 });
    expect(inst.rows.length).toBeGreaterThan(0);
    expect(inst.rows.every((r) => r.age > 30)).toBe(true);
    document.body.removeChild(inst);
});

test("typing several characters triggers a single debounced filter", async () => {
    const { ds, count } = instrumentedSource([{ name: "bru" }, { name: "br" }, { name: "x" }]);
    const inst = await makeReadyGrid({
        columns: [{ field: "name" }],
        filterable: true,
        filterDelay: 20,
        dataSource: ds,
    });

    const before = count();
    typeFilter(inst, "name", "bru");
    expect(count()).toBe(before); // nothing applied while the debounce is pending
    await sleep(80);
    expect(count()).toBe(before + 1); // one application after the last keystroke
    expect(inst.query.filters.name).toEqual({ operator: "contains", value: "bru" });
    document.body.removeChild(inst);
});

test("Enter applies immediately and cancels the pending debounce", async () => {
    const { ds, count } = instrumentedSource([{ name: "b" }, { name: "br" }, { name: "x" }]);
    const inst = await makeReadyGrid({
        columns: [{ field: "name" }],
        filterable: true,
        filterDelay: 100,
        dataSource: ds,
    });

    const before = count();
    const input = typeFilter(inst, "name", "br");
    input.dispatchEvent(new KeyboardEvent("keydown", { key: "Enter", bubbles: true }));
    expect(count()).toBe(before + 1); // applied immediately
    await sleep(200); // longer than the debounce delay
    expect(count()).toBe(before + 1); // no second, delayed application
    expect(inst.query.filters.name).toEqual({ operator: "contains", value: "br" });
    document.body.removeChild(inst);
});

test("select filters apply immediately on change", async () => {
    const { ds, count } = instrumentedSource([{ status: "active" }, { status: "inactive" }]);
    const inst = await makeReadyGrid({
        columns: [{ field: "status", filterType: "select" }],
        filterable: true,
        dataSource: ds,
    });

    const before = count();
    const select = inst.querySelector(".dg-head-filters select");
    select.value = "active";
    select.dispatchEvent(new Event("change", { bubbles: true }));
    expect(count()).toBe(before + 1);
    expect(inst.query.filters.status).toEqual({ operator: "eq", value: "active" });
    document.body.removeChild(inst);
});

test("IME composition is not filtered until compositionend", async () => {
    const { ds, count } = instrumentedSource([{ name: "br" }, { name: "b" }]);
    const inst = await makeReadyGrid({
        columns: [{ field: "name" }],
        filterable: true,
        filterDelay: 20,
        dataSource: ds,
    });

    const before = count();
    const input = inst.querySelector('.dg-head-filters input[data-name="name"]');
    input.dispatchEvent(new Event("compositionstart", { bubbles: true }));
    typeFilter(inst, "name", "br"); // inputs during composition are ignored
    await sleep(80);
    expect(count()).toBe(before);

    input.dispatchEvent(new Event("compositionend", { bubbles: true }));
    await sleep(80);
    expect(count()).toBe(before + 1);
    expect(inst.query.filters.name).toEqual({ operator: "contains", value: "br" });
    document.body.removeChild(inst);
});

test("a new filter resets the page to 1", async () => {
    const data = Array.from({ length: 30 }, (_, i) => ({ name: `row${i}` }));
    const { ds } = instrumentedSource(data);
    const inst = await makeReadyGrid({
        columns: [{ field: "name" }],
        filterable: true,
        pageSize: 10,
        filterDelay: 20,
        dataSource: ds,
    });

    await inst.setQuery({ page: 2 });
    expect(inst.query.page).toBe(2);

    typeFilter(inst, "name", "row2");
    await sleep(80);
    expect(inst.query.filters.name).toEqual({ operator: "contains", value: "row2" });
    expect(inst.query.page).toBe(1);
    document.body.removeChild(inst);
});

test("Escape clears a text filter and cancels the pending debounce", async () => {
    const { ds, count } = instrumentedSource([{ name: "b" }, { name: "br" }]);
    const inst = await makeReadyGrid({
        columns: [{ field: "name" }],
        filterable: true,
        filterDelay: 100,
        dataSource: ds,
    });

    const before = count();
    const input = typeFilter(inst, "name", "x"); // debounce pending (100 ms)
    input.dispatchEvent(new KeyboardEvent("keydown", { key: "Escape", bubbles: true }));
    expect(input.value).toBe("");
    expect(count()).toBe(before + 1); // applied immediately with the cleared field
    expect(inst.query.filters.name).toBeUndefined();
    await sleep(200);
    expect(count()).toBe(before + 1); // the cancelled debounce never applies "x"
    expect(inst.query.filters.name).toBeUndefined();
    document.body.removeChild(inst);
});

test("a column with filterable: false keeps its th but renders no control", async () => {
    const inst = await makeReadyGrid({
        columns: [{ field: "name" }, { field: "email", filterable: false }],
        filterable: true,
        dataSource: new ArrayDataSource([{ name: "Alice", email: "a@x.com" }]),
    });

    const filterThs = inst.querySelectorAll(".dg-head-filters th");
    expect(filterThs).toHaveLength(2); // both cells kept for alignment
    const emailFilterTh = inst.querySelector('.dg-head-filters th[data-column-id="email"]');
    expect(emailFilterTh).toBeTruthy();
    expect(emailFilterTh.querySelector(".dg-filter")).toBeNull();
    expect(inst.querySelector('.dg-head-filters th[data-column-id="name"] .dg-filter')).toBeTruthy();
    document.body.removeChild(inst);
});

test("text filter placeholders use an ellipsis by default and can be overridden by the column", async () => {
    const inst = await makeReadyGrid({
        columns: [
            { field: "name", title: "Name" },
            { field: "ref", title: "Reference", filterPlaceholder: "ABC-123" },
        ],
        filterable: true,
        dataSource: new ArrayDataSource([{ name: "Alice", ref: "ABC" }]),
    });

    const plain = inst.querySelector('.dg-head-filters input[data-name="name"]');
    expect(plain.getAttribute("placeholder")).toBe("…");

    const hinted = inst.querySelector('.dg-head-filters input[data-name="ref"]');
    expect(hinted.getAttribute("placeholder")).toBe("ABC-123");
    // The accessible name comes from the column header, not a generated label
    expect(hinted.getAttribute("aria-labelledby")).toBeTruthy();
    document.body.removeChild(inst);
});

test("a stale server result cannot overwrite the latest filter", async () => {
    /** @type {Array<{ query: QueryState, resolve: Function }>} */
    const pending = [];
    const ds = {
        async load(query) {
            return new Promise((resolve) => pending.push({ query, resolve }));
        },
    };

    const inst = new DataGrid({ columns: [{ field: "name" }], dataSource: ds });
    document.body.appendChild(inst);
    await sleep(20); // let the initial load be dispatched
    pending.shift().resolve({ rows: [], total: 0, meta: {} });
    await new Promise((resolve) => {
        inst.addEventListener("connected", resolve, { once: true });
        setTimeout(resolve, 2000);
    });

    inst.setQuery({ filters: { name: { operator: "contains", value: "b" } } });
    const reqB = pending.shift();
    inst.setQuery({ filters: { name: { operator: "contains", value: "br" } } });
    const reqBr = pending.shift();

    // Resolve the stale request last: it must be ignored
    reqBr.resolve({ rows: [{ name: "br" }], total: 1, meta: {} });
    reqB.resolve({ rows: [{ name: "b" }], total: 1, meta: {} });
    await tick();

    expect(inst.rows).toEqual([{ name: "br" }]);
    document.body.removeChild(inst);
});
