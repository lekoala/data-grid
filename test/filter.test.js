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
    const inst = await makeReadyGrid({ columns: [{ field: "name", filterType: "select", filterList: list }] }, [
        { name: "a" },
    ]);
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
