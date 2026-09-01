import { expect, test } from "bun:test";
import DataGrid from "../data-grid.js";
import { ArrayDataSource, applyFilters, encodeSearchParams } from "../src/data-source.js";
import {
    formatDateFilterQuery,
    formatTextFilterQuery,
    parseDateFilterQuery,
    parseTextFilterQuery,
} from "../src/filter-query.js";
import { change, input } from "./helpers.js";

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
    const el = inst.querySelector(`.dg-head-filters input[data-name="${field}"]`);
    let value = "";
    for (const ch of text) {
        value += ch;
        input(el, value);
    }
    return el;
}

test("text filter query helpers parse and format the minimal syntax", () => {
    expect(parseTextFilterQuery("alice")).toEqual({ operator: "contains", value: "alice" });
    expect(parseTextFilterQuery("=alice")).toEqual({ operator: "eq", value: "alice" });
    expect(parseTextFilterQuery("!alice")).toEqual({ operator: "notContains", value: "alice" });
    expect(parseTextFilterQuery("!ali%")).toEqual({ operator: "notStartsWith", value: "ali" });
    expect(parseTextFilterQuery("!%ice")).toEqual({ operator: "notEndsWith", value: "ice" });
    expect(parseTextFilterQuery("!%lic%")).toEqual({ operator: "notContains", value: "lic" });
    expect(parseTextFilterQuery("!=alice")).toEqual({ operator: "neq", value: "alice" });
    expect(parseTextFilterQuery(">=30")).toEqual({ operator: "gte", value: "30" });
    expect(parseTextFilterQuery("%son")).toEqual({ operator: "endsWith", value: "son" });
    expect(parseTextFilterQuery("Ali%")).toEqual({ operator: "startsWith", value: "Ali" });
    expect(parseTextFilterQuery("%ali%")).toEqual({ operator: "contains", value: "ali" });
    expect(parseTextFilterQuery(">")).toEqual({ operator: "contains", value: ">" });
    expect(parseTextFilterQuery(">=")).toEqual({ operator: "contains", value: ">=" });
    expect(parseTextFilterQuery("!=")).toEqual({ operator: "contains", value: "!=" });
    expect(parseTextFilterQuery("=")).toEqual({ operator: "contains", value: "=" });
    expect(parseTextFilterQuery("!")).toEqual({ operator: "contains", value: "!" });
    expect(parseTextFilterQuery("%")).toEqual({ operator: "contains", value: "%" });
    expect(parseTextFilterQuery("\\!jean")).toEqual({ operator: "contains", value: "!jean" });
    expect(parseTextFilterQuery("foo\\%")).toEqual({ operator: "contains", value: "foo%" });
    expect(parseTextFilterQuery("\\=foo")).toEqual({ operator: "contains", value: "=foo" });

    expect(formatTextFilterQuery({ operator: "eq", value: "alice" })).toBe("=alice");
    expect(formatTextFilterQuery({ operator: "neq", value: "alice" })).toBe("!=alice");
    expect(formatTextFilterQuery({ operator: "notContains", value: "alice" })).toBe("!alice");
    expect(formatTextFilterQuery({ operator: "notStartsWith", value: "Ali" })).toBe("!Ali%");
    expect(formatTextFilterQuery({ operator: "notEndsWith", value: "ice" })).toBe("!%ice");
    expect(formatTextFilterQuery({ operator: "gte", value: 30 })).toBe(">=30");
    expect(formatTextFilterQuery({ operator: "startsWith", value: "Ali" })).toBe("Ali%");
    expect(formatTextFilterQuery({ operator: "contains", value: "alice" })).toBe("alice");

    const roundTrips = [
        { operator: "contains", value: "!jean" },
        { operator: "contains", value: "foo%" },
        { operator: "contains", value: "=foo" },
        { operator: "contains", value: "%foo" },
        { operator: "contains", value: "foo\\bar" },
        { operator: "startsWith", value: "%foo" },
        { operator: "endsWith", value: "foo%" },
        { operator: "notContains", value: "=foo" },
        { operator: "notStartsWith", value: "%foo" },
        { operator: "notEndsWith", value: "foo%" },
        { operator: "neq", value: "cafe" },
    ];
    for (const filter of roundTrips) {
        expect(parseTextFilterQuery(formatTextFilterQuery(filter))).toEqual(filter);
    }
});

test("date filter query helpers expand partial dates into real bounds", () => {
    expect(parseDateFilterQuery("2025")).toEqual({ operator: "between", value: ["2025-01-01", "2025-12-31"] });
    expect(parseDateFilterQuery("2025-08")).toEqual({
        operator: "between",
        value: ["2025-08-01", "2025-08-31"],
    });
    expect(parseDateFilterQuery("2025-08-26")).toEqual({ operator: "eq", value: "2025-08-26" });
    expect(parseDateFilterQuery(">2025")).toEqual({ operator: "gt", value: "2025-12-31" });
    expect(parseDateFilterQuery(">=2025")).toEqual({ operator: "gte", value: "2025-01-01" });
    expect(parseDateFilterQuery("<2025-08")).toEqual({ operator: "lt", value: "2025-08-01" });
    expect(parseDateFilterQuery("<=2025-08")).toEqual({ operator: "lte", value: "2025-08-31" });
    expect(parseDateFilterQuery("!=2025")).toEqual({ operator: "notStartsWith", value: "2025" });

    expect(formatDateFilterQuery({ operator: "between", value: ["2025-01-01", "2025-12-31"] })).toBe("2025");
    expect(formatDateFilterQuery({ operator: "gt", value: "2025-12-31" })).toBe(">2025");
    expect(formatDateFilterQuery({ operator: "gte", value: "2025-01-01" })).toBe(">=2025");
    expect(formatDateFilterQuery({ operator: "eq", value: "2025-08-26" })).toBe("2025-08-26");
});

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
    expect(ids(applyFilters(rows, { name: { operator: "notContains", value: "A" } }))).toEqual([2, 4, 5]);
    expect(ids(applyFilters(rows, { name: { operator: "startsWith", value: "al" } }))).toEqual([1]);
    expect(ids(applyFilters(rows, { name: { operator: "notStartsWith", value: "al" } }))).toEqual([2, 3, 4, 5]);
    expect(ids(applyFilters(rows, { name: { operator: "endsWith", value: "E" } }))).toEqual([1, 3]);
    expect(ids(applyFilters(rows, { name: { operator: "notEndsWith", value: "E" } }))).toEqual([2, 4, 5]);
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

test("an empty in list means no filter, not match nothing", () => {
    const rows = [{ id: 1 }, { id: 2 }];
    expect(applyFilters(rows, { id: { operator: "in", value: [] } })).toEqual(rows);
});

test("an empty array value is dropped when the query is normalized", async () => {
    const inst = await makeReadyGrid(
        {
            columns: [{ field: "name" }],
            initialQuery: {
                filters: {
                    name: { operator: "in", value: [] },
                    other: { operator: "in", value: ["a"] },
                },
            },
        },
        [{ name: "Alice" }],
    );
    expect(inst.query.filters.name).toBeUndefined();
    expect(inst.query.filters.other).toEqual({ operator: "in", value: ["a"] });
    document.body.removeChild(inst);
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

test("filterList receives an empty option without being mutated", async () => {
    const list = [
        { value: "Starter", text: "Starter" },
        { value: "Pro", text: "Pro" },
        { value: "Business", text: "Business" },
    ];
    const inst = await makeReadyGrid(
        { columns: [{ field: "plan", filterType: "select", filterList: list }], filterable: true },
        [{ plan: "Starter" }],
    );
    expect(inst.getFilterOptions(inst.options.columns[0])).toEqual([{ value: "", text: "" }, ...list]);
    expect(inst.options.columns[0].filterList).toBe(list);
    expect(list).toHaveLength(3);

    const select = inst.querySelector(".dg-head-filters select");
    expect([...select.options].map(({ value, text }) => ({ value, text }))).toEqual([{ value: "", text: "" }, ...list]);
    document.body.removeChild(inst);
});

test("filterList does not duplicate an existing empty option", async () => {
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

test("firstFilterOption custom and explicitly empty labels are respected", async () => {
    for (const text of ["All plans", ""]) {
        const inst = await makeReadyGrid(
            {
                columns: [
                    {
                        field: "plan",
                        filterType: "select",
                        filterList: [{ value: "Pro", text: "Pro" }],
                        firstFilterOption: { value: "", text },
                    },
                ],
                filterable: true,
            },
            [{ plan: "Pro" }],
        );
        const select = inst.querySelector(".dg-head-filters select");
        expect(select.options[0].value).toBe("");
        expect(select.options[0].text).toBe(text);
        document.body.removeChild(inst);
    }
});

test("boolean filters render the tri-state blank, Yes, and No options", async () => {
    const inst = await makeReadyGrid(
        { columns: [{ field: "verified", filterType: "boolean", align: "center" }], filterable: true },
        [{ verified: true }],
    );
    const select = inst.querySelector('.dg-head-filters select[data-name="verified"]');
    expect([...select.options].map(({ value, text }) => ({ value, text }))).toEqual([
        { value: "", text: "" },
        { value: "true", text: "Yes" },
        { value: "false", text: "No" },
    ]);
    expect(select.closest("th").dataset.align).toBe("center");
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

test("text filter expressions flow end to end through the grid", async () => {
    const data = [{ age: 18 }, { age: 30 }, { age: 31 }, { age: 45 }];
    const inst = await makeReadyGrid(
        {
            columns: [{ field: "age", filterType: "text" }],
            filterable: true,
            filterDelay: 20,
        },
        data,
    );

    typeFilter(inst, "age", ">30");
    await sleep(80);

    expect(inst.query.filters.age).toEqual({ operator: "gt", value: "30" });
    expect(inst.rows.map((row) => row.age)).toEqual([31, 45]);
    document.body.removeChild(inst);
});

test("text filters match accents end to end", async () => {
    const inst = await makeReadyGrid(
        {
            columns: [{ field: "product", filterType: "text" }],
            filterable: true,
            filterDelay: 20,
        },
        [{ product: "Café de Paris" }, { product: "Tea House" }],
    );

    typeFilter(inst, "product", "cafe");
    await sleep(80);

    expect(inst.query.filters.product).toEqual({ operator: "contains", value: "cafe" });
    expect(inst.rows.map((row) => row.product)).toEqual(["Café de Paris"]);
    document.body.removeChild(inst);
});

test("text notContains query is case-insensitive end to end", async () => {
    const inst = await makeReadyGrid(
        {
            columns: [{ field: "product", filterType: "text" }],
            filterable: true,
            filterDelay: 20,
        },
        [{ product: "Café de Paris" }, { product: "Tea House" }],
    );

    typeFilter(inst, "product", "!cafe");
    await sleep(80);

    expect(inst.query.filters.product).toEqual({ operator: "notContains", value: "cafe" });
    expect(inst.rows.map((row) => row.product)).toEqual(["Tea House"]);
    document.body.removeChild(inst);
});

test("text neq query uses the != syntax end to end", async () => {
    const inst = await makeReadyGrid(
        {
            columns: [{ field: "product", filterType: "text" }],
            filterable: true,
            filterDelay: 20,
        },
        [{ product: "Mechanical Keyboard" }, { product: "Mouse" }],
    );

    typeFilter(inst, "product", "!=mechanical keyboard");
    await sleep(80);

    expect(inst.query.filters.product).toEqual({ operator: "neq", value: "mechanical keyboard" });
    expect(inst.rows.map((row) => row.product)).toEqual(["Mouse"]);
    document.body.removeChild(inst);
});

test("text eq query matches accents end to end", async () => {
    const inst = await makeReadyGrid(
        {
            columns: [{ field: "product", filterType: "text" }],
            filterable: true,
            filterDelay: 20,
        },
        [{ product: "Élodie" }, { product: "Alice" }],
    );

    typeFilter(inst, "product", "=elodie");
    await sleep(80);

    expect(inst.query.filters.product).toEqual({ operator: "eq", value: "elodie" });
    expect(inst.rows.map((row) => row.product)).toEqual(["Élodie"]);
    document.body.removeChild(inst);
});

test("text query filters are reflected back into text inputs", async () => {
    const inst = await makeReadyGrid(
        {
            columns: [{ field: "age", filterType: "text" }],
            filterable: true,
            initialQuery: { filters: { age: { operator: "gte", value: 30 } } },
        },
        [{ age: 31 }],
    );

    const filter = /** @type {HTMLInputElement} */ (inst.querySelector('.dg-head-filters input[data-name="age"]'));
    expect(filter.value).toBe(">=30");
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
    change(select);
    expect(count()).toBe(before + 1);
    expect(inst.query.filters.status).toEqual({ operator: "eq", value: "active" });
    document.body.removeChild(inst);
});

/**
 * @param {HTMLElement} inst
 * @param {String} field
 * @returns {HTMLElement|null}
 */
function multiSelectRoot(inst, field) {
    return inst.querySelector(`.dg-head-filters .dg-multiselect[data-name="${field}"]`);
}

test("filterMultiple renders a checkbox panel emitting the in operator", async () => {
    const { ds, count } = instrumentedSource([{ country: "BE" }, { country: "FR" }, { country: "DE" }]);
    const inst = await makeReadyGrid(
        {
            columns: [
                {
                    field: "country",
                    title: "Country",
                    filterType: "select",
                    filterMultiple: true,
                    firstFilterOption: { value: "", text: "All" },
                },
            ],
            filterable: true,
            dataSource: ds,
        },
        null,
    );

    const root = /** @type {HTMLElement} */ (multiSelectRoot(inst, "country"));
    expect(root).toBeTruthy();
    // No native multiple listbox: the panel is a checkbox menu instead
    expect(inst.querySelector(".dg-head-filters select")).toBeNull();
    // The empty placeholder option never participates in a set; derived
    // options arrive sorted by label
    const boxes = /** @type {HTMLInputElement[]} */ ([...root.querySelectorAll("input[data-value]")]);
    expect(boxes.map((b) => b.dataset.value)).toEqual(["BE", "DE", "FR"]);

    const panel = /** @type {HTMLUListElement} */ (root.querySelector(".dg-multiselect-panel"));
    const trigger = /** @type {HTMLElement} */ (root.querySelector(".dg-multiselect-trigger"));
    const summary = /** @type {HTMLElement} */ (root.querySelector(".dg-multiselect-summary"));
    expect(panel.getAttribute("popover")).toBe("auto");
    expect(trigger.getAttribute("popovertarget")).toBe(panel.id);
    expect(trigger.getAttribute("aria-controls")).toBe(panel.id);
    // The native invoker relationship owns the expanded state.
    expect(trigger.hasAttribute("aria-expanded")).toBe(false);

    const before = count();
    boxes[0].checked = true;
    change(boxes[0]);
    expect(summary.textContent).toBe("BE");
    expect(count()).toBe(before + 1); // applied immediately, like selects
    expect(inst.query.filters.country).toEqual({ operator: "in", value: ["BE"] });
    await sleep(30);
    expect(inst.rows).toHaveLength(1);
    expect(inst.query.page).toBe(1);

    boxes[2].checked = true;
    change(boxes[2]);
    expect(inst.query.filters.country).toEqual({ operator: "in", value: ["BE", "FR"] });

    // Unchecking everything means no filter at all
    boxes[0].checked = false;
    change(boxes[0]);
    boxes[2].checked = false;
    change(boxes[2]);
    expect(inst.query.filters.country).toBeUndefined();
    await sleep(30);
    expect(inst.rows).toHaveLength(3);
    document.body.removeChild(inst);
});

test("filterMultiple falls back to a single select without native floating UI", async () => {
    const popoverDescriptor = Object.getOwnPropertyDescriptor(HTMLElement.prototype, "popover");
    delete HTMLElement.prototype.popover;
    try {
        const inst = await makeReadyGrid(
            {
                columns: [
                    {
                        field: "country",
                        filterType: "select",
                        filterMultiple: true,
                        filterList: [
                            { value: "", text: "All" },
                            { value: "BE", text: "Belgium" },
                            { value: "FR", text: "France" },
                        ],
                    },
                ],
                filterable: true,
            },
            [{ country: "BE" }, { country: "FR" }],
        );

        const select = /** @type {HTMLSelectElement} */ (inst.querySelector('select[data-name="country"]'));
        expect(select).toBeTruthy();
        expect(inst.querySelector(".dg-multiselect")).toBeNull();

        select.value = "FR";
        change(select);
        expect(inst.query.filters.country).toEqual({ operator: "eq", value: "FR" });
        document.body.removeChild(inst);
    } finally {
        if (popoverDescriptor) {
            Object.defineProperty(HTMLElement.prototype, "popover", popoverDescriptor);
        }
    }
});

test("the closed-state summary joins labels up to two then counts the rest", async () => {
    const inst = await makeReadyGrid(
        {
            columns: [
                {
                    field: "country",
                    filterType: "select",
                    filterMultiple: true,
                    filterList: [
                        { value: "", text: "All" },
                        { value: "BE", text: "Belgium" },
                        { value: "FR", text: "France" },
                        { value: "NL", text: "Netherlands" },
                    ],
                },
            ],
            filterable: true,
        },
        [{ country: "BE" }],
    );

    const root = /** @type {HTMLElement} */ (multiSelectRoot(inst, "country"));
    const summary = /** @type {HTMLElement} */ (root.querySelector(".dg-multiselect-summary"));
    const boxes = /** @type {HTMLInputElement[]} */ ([...root.querySelectorAll("input[data-value]")]);
    expect(boxes.map((b) => b.dataset.value)).toEqual(["BE", "FR", "NL"]); // "All" dropped

    const check = (i, checked) => {
        boxes[i].checked = checked;
        change(boxes[i]);
    };

    check(0, true);
    expect(summary.textContent).toBe("Belgium");
    check(1, true);
    expect(summary.textContent).toBe("Belgium, France");
    check(2, true);
    expect(summary.textContent).toBe("Belgium, France +1");
    check(0, false);
    check(1, false);
    check(2, false);
    // Back to the intentionally neutral empty state, muted through CSS
    expect(summary.textContent).toBe("");
    expect(summary.classList.contains("dg-multiselect-empty")).toBe(true);
    document.body.removeChild(inst);
});

test("the empty selection shows the firstFilterOption label when it has one", async () => {
    const inst = await makeReadyGrid(
        {
            columns: [
                {
                    field: "country",
                    filterType: "select",
                    filterMultiple: true,
                    firstFilterOption: { value: "", text: "All" },
                    filterList: [
                        { value: "BE", text: "Belgium" },
                        { value: "FR", text: "France" },
                    ],
                },
            ],
            filterable: true,
        },
        [{ country: "BE" }],
    );

    const root = /** @type {HTMLElement} */ (multiSelectRoot(inst, "country"));
    const summary = /** @type {HTMLElement} */ (root.querySelector(".dg-multiselect-summary"));
    expect(summary.textContent).toBe("All");

    const box = /** @type {HTMLInputElement} */ (root.querySelector('input[data-value="BE"]'));
    box.checked = true;
    change(box);
    expect(summary.textContent).toBe("Belgium");
    expect(summary.classList.contains("dg-multiselect-empty")).toBe(false);

    box.checked = false;
    change(box);
    expect(summary.textContent).toBe("All");
    document.body.removeChild(inst);
});

test("a rebuilt filter row creates a fresh valid popover target pair", async () => {
    const inst = await makeReadyGrid(
        {
            columns: [
                {
                    field: "country",
                    filterType: "select",
                    filterMultiple: true,
                    filterList: [
                        { value: "BE", text: "Belgium" },
                        { value: "FR", text: "France" },
                    ],
                },
            ],
            filterable: true,
        },
        [{ country: "BE" }, { country: "FR" }],
    );

    const root = /** @type {HTMLElement} */ (multiSelectRoot(inst, "country"));
    const panel = /** @type {HTMLElement} */ (root.querySelector(".dg-multiselect-panel"));

    // A rerender rebuilds the whole table chrome including the filter row
    await inst.renderTable();
    const nextRoot = /** @type {HTMLElement} */ (multiSelectRoot(inst, "country"));
    expect(nextRoot).not.toBe(root);
    const nextPanel = /** @type {HTMLElement} */ (nextRoot.querySelector(".dg-multiselect-panel"));
    const nextTrigger = /** @type {HTMLElement} */ (nextRoot.querySelector(".dg-multiselect-trigger"));
    expect(nextPanel.getAttribute("popover")).toBe("auto");
    expect(nextTrigger.getAttribute("popovertarget")).toBe(nextPanel.id);
    expect(nextTrigger.getAttribute("popovertarget")).not.toBe(panel.id);
    document.body.removeChild(inst);
});

test("an in filter serializes for remote transport", () => {
    const params = encodeSearchParams({
        filters: { country: { operator: "in", value: ["BE", "FR"] } },
    });
    expect(params.get("filters[country][operator]")).toBe("in");
    expect(params.get("filters[country][value][0]")).toBe("BE");
    expect(params.get("filters[country][value][1]")).toBe("FR");
});

test("an in filter restores its checked boxes and summary", async () => {
    const inst = await makeReadyGrid(
        {
            columns: [
                {
                    field: "country",
                    filterType: "select",
                    filterMultiple: true,
                    filterList: [
                        { value: "", text: "All" },
                        { value: "BE", text: "Belgium" },
                        { value: "FR", text: "France" },
                        { value: "NL", text: "Netherlands" },
                    ],
                },
            ],
            filterable: true,
            initialQuery: { filters: { country: { operator: "in", value: ["BE", "NL"] } } },
        },
        [{ country: "BE" }, { country: "FR" }],
    );

    const root = /** @type {HTMLElement} */ (multiSelectRoot(inst, "country"));
    const summary = /** @type {HTMLElement} */ (root.querySelector(".dg-multiselect-summary"));
    const checked = [...root.querySelectorAll("input[data-value]:checked")];
    expect(checked.map((b) => b.dataset.value)).toEqual(["BE", "NL"]);
    expect(summary.textContent).toBe("Belgium, Netherlands");
    expect(inst.query.filters.country).toEqual({ operator: "in", value: ["BE", "NL"] });
    expect(inst.rows).toHaveLength(1);
    document.body.removeChild(inst);
});

test("clearFilters also clears multi-select panels", async () => {
    const inst = await makeReadyGrid(
        {
            columns: [
                {
                    field: "country",
                    filterType: "select",
                    filterMultiple: true,
                    filterList: [
                        { value: "BE", text: "Belgium" },
                        { value: "FR", text: "France" },
                    ],
                },
            ],
            filterable: true,
            initialQuery: { filters: { country: { operator: "in", value: ["FR"] } } },
        },
        [{ country: "BE" }, { country: "FR" }],
    );

    await inst.clearFilters();
    expect(inst.query.filters.country).toBeUndefined();
    const root = /** @type {HTMLElement} */ (multiSelectRoot(inst, "country"));
    expect(root.querySelectorAll("input[data-value]:checked")).toHaveLength(0);
    expect(inst.rows).toHaveLength(2);
    document.body.removeChild(inst);
});

test("filterMultiple is ignored outside the select mode", async () => {
    const inst = await makeReadyGrid(
        {
            columns: [{ field: "active", format: "boolean", filterMultiple: true }],
            filterable: true,
        },
        [{ active: true }],
    );
    expect(inst.querySelector('.dg-head-filters select[data-name="active"]')).toBeTruthy();
    expect(multiSelectRoot(inst, "active")).toBeNull();
    document.body.removeChild(inst);
});

test("a boolean eq filter matches normalized cells", () => {
    const rows = [
        { id: 1, active: true },
        { id: 2, active: 1 },
        { id: 3, active: "1" },
        { id: 4, active: false },
        { id: 5, active: 0 },
        { id: 6, active: "0" },
    ];
    const ids = (rows) => rows.map((r) => r.id);

    expect(ids(applyFilters(rows, { active: { operator: "eq", value: true } }))).toEqual([1, 2, 3]);
    expect(ids(applyFilters(rows, { active: { operator: "eq", value: false } }))).toEqual([4, 5, 6]);
});

test("boolean columns render a tri-state select sharing the formatter semantics", async () => {
    const inst = await makeReadyGrid(
        {
            columns: [{ field: "active", format: "boolean" }],
            filterable: true,
        },
        [{ active: true }, { active: 1 }, { active: 0 }, { active: null }],
    );

    const select = /** @type {HTMLSelectElement} */ (inst.querySelector('.dg-head-filters select[data-name="active"]'));
    const th = /** @type {HTMLTableCellElement} */ (select.closest("th"));
    expect(select.dataset.filterMode).toBe("boolean");
    expect(th.dataset.align).toBe("center");
    expect(select.dataset.align).toBe("start");
    expect([...select.options].map((o) => o.value)).toEqual(["", "true", "false"]);

    select.value = "true";
    change(select);
    await sleep(30);
    expect(inst.query.filters.active).toEqual({ operator: "eq", value: true });
    // Raw 1 displays as ✓ and must be matched by the same filter
    expect(inst.rows).toHaveLength(2);

    select.value = "false";
    change(select);
    await sleep(30);
    expect(inst.query.filters.active).toEqual({ operator: "eq", value: false });
    expect(inst.rows).toHaveLength(1);

    select.value = "";
    change(select);
    await sleep(30);
    expect(inst.query.filters.active).toBeUndefined();
    expect(inst.rows).toHaveLength(4);
    document.body.removeChild(inst);
});

test("an explicit filterType wins over the formatter-derived filter mode", async () => {
    const inst = await makeReadyGrid(
        {
            columns: [{ field: "active", format: "boolean", filterType: "text" }],
            filterable: true,
        },
        [{ active: true }],
    );
    expect(inst.querySelector('.dg-head-filters input[data-name="active"]')).toBeTruthy();
    expect(inst.querySelector('.dg-head-filters select[data-name="active"]')).toBeNull();
    document.body.removeChild(inst);
});

test("number filters use typed equality for numeric input and stay permissive otherwise", async () => {
    const inst = await makeReadyGrid(
        {
            columns: [{ field: "price", format: "number", formatOptions: { maximumFractionDigits: 2 } }],
            filterable: true,
            filterDelay: 20,
        },
        [{ price: 12.5 }, { price: 7 }, { price: 125 }],
    );
    const el = inst.querySelector('.dg-head-filters input[data-name="price"]');
    expect(el.inputMode).toBe("decimal");

    el.value = "12.5";
    input(el, "12.5");
    await sleep(80);
    expect(inst.query.filters.price).toEqual({ operator: "contains", value: 12.5 });
    expect(inst.rows).toHaveLength(1);

    // A reload rebuilds the controls: re-read the live one
    const el2 = inst.querySelector('.dg-head-filters input[data-name="price"]');
    expect(el2.value).toBe("12.5"); // restored from the current query

    el2.value = "nope";
    input(el2, "nope");
    await sleep(80);
    // Non-numeric input falls back to the permissive contains behavior
    expect(inst.query.filters.price).toEqual({ operator: "contains", value: "nope" });
    expect(inst.rows).toHaveLength(0);
    document.body.removeChild(inst);
});

test("number filters accept explicit query operators", async () => {
    const inst = await makeReadyGrid(
        {
            columns: [{ field: "price", format: "number", formatOptions: { style: "currency", currency: "EUR" } }],
            filterable: true,
            filterDelay: 20,
        },
        [{ price: 89.5 }, { price: 129.9 }, { price: 179 }],
    );
    const el = /** @type {HTMLInputElement} */ (inst.querySelector('.dg-head-filters input[data-name="price"]'));

    input(el, ">100");
    await sleep(80);
    expect(inst.query.filters.price).toEqual({ operator: "gt", value: 100 });
    expect(inst.rows.map((row) => row.price)).toEqual([129.9, 179]);

    const el2 = /** @type {HTMLInputElement} */ (inst.querySelector('.dg-head-filters input[data-name="price"]'));
    expect(el2.value).toBe(">100");
    document.body.removeChild(inst);
});

test("percent columns divide the typed value by 100 (visible scale -> raw)", async () => {
    const inst = await makeReadyGrid(
        {
            columns: [{ field: "discount", format: "number", formatOptions: { style: "percent" } }],
            filterable: true,
            filterDelay: 20,
        },
        [{ discount: 0.2 }, { discount: 0.05 }, { discount: 0 }],
    );
    const el = inst.querySelector('.dg-head-filters input[data-name="discount"]');
    expect(el.dataset.percent).toBe("true");
    expect(el.getAttribute("placeholder")).toBe("%");

    el.value = "20";
    input(el, "20");
    await sleep(80);
    // "20" (the displayed percent) queries the raw 0.2
    expect(inst.query.filters.discount).toEqual({ operator: "contains", value: 0.2 });
    expect(inst.rows).toHaveLength(1);

    // Restore shows the visible scale again
    const el2 = inst.querySelector('.dg-head-filters input[data-name="discount"]');
    expect(el2.value).toBe("20");
    document.body.removeChild(inst);
});

test("a percent filter can be restored from an initial query", async () => {
    const inst = await makeReadyGrid(
        {
            columns: [{ field: "discount", format: "number", formatOptions: { style: "percent" } }],
            filterable: true,
            initialQuery: { filters: { discount: { operator: "eq", value: 0.2 } } },
        },
        [{ discount: 0.2 }, { discount: 0.05 }],
    );
    const el = inst.querySelector('.dg-head-filters input[data-name="discount"]');
    expect(el.value).toBe("=20"); // raw 0.2 shown as the visible 20 with its explicit operator
    document.body.removeChild(inst);
});

test("a percent filter restore does not show NaN for non-numeric external values", async () => {
    const inst = await makeReadyGrid(
        {
            columns: [{ field: "discount", format: "number", formatOptions: { style: "percent" } }],
            filterable: true,
            initialQuery: { filters: { discount: { operator: "contains", value: "nope" } } },
        },
        [{ discount: 0.2 }, { discount: 0.05 }],
    );
    const el = /** @type {HTMLInputElement} */ (inst.querySelector('.dg-head-filters input[data-name="discount"]'));
    expect(el.value).toBe("nope");
    document.body.removeChild(inst);
});

test("date filters treat partial dates as exact periods", async () => {
    const inst = await makeReadyGrid(
        {
            columns: [{ field: "created", format: "date" }],
            filterable: true,
            filterDelay: 20,
        },
        [{ created: "2024-12-31" }, { created: "2025-01-01" }, { created: "2025-08-26" }, { created: "2026-08-27" }],
    );
    const el = inst.querySelector('.dg-head-filters input[data-name="created"]');
    // The placeholder communicates the canonical date contract
    expect(el.getAttribute("placeholder")).toBe("YYYY-MM-DD");
    expect(el.inputMode).not.toBe("numeric");

    input(el, "2025");
    await sleep(80);
    expect(inst.query.filters.created).toEqual({ operator: "between", value: ["2025-01-01", "2025-12-31"] });
    expect(inst.rows).toHaveLength(2);

    const el2 = /** @type {HTMLInputElement} */ (inst.querySelector('.dg-head-filters input[data-name="created"]'));
    expect(el2.value).toBe("2025");

    input(el2, ">2025");
    await sleep(80);
    expect(inst.query.filters.created).toEqual({ operator: "gt", value: "2025-12-31" });
    expect(inst.rows.map((row) => row.created)).toEqual(["2026-08-27"]);

    const el3 = /** @type {HTMLInputElement} */ (inst.querySelector('.dg-head-filters input[data-name="created"]'));
    expect(el3.value).toBe(">2025");

    input(el3, ">=2025");
    await sleep(80);
    expect(inst.query.filters.created).toEqual({ operator: "gte", value: "2025-01-01" });
    expect(inst.rows.map((row) => row.created)).toEqual(["2025-01-01", "2025-08-26", "2026-08-27"]);
    document.body.removeChild(inst);
});

test("datetime keeps a plain text filter until its semantics are defined", async () => {
    const inst = await makeReadyGrid(
        {
            columns: [{ field: "lastLogin", format: "datetime" }],
            filterable: true,
        },
        [{ lastLogin: "2026-08-26T08:30:00Z" }],
    );
    const input = inst.querySelector('.dg-head-filters input[data-name="lastLogin"]');
    expect(input.tagName).toBe("INPUT");
    expect(input.dataset.filterMode ?? "text").toBe("text");
    expect(input.getAttribute("placeholder")).toBe(inst.defaultColumn.filterPlaceholder);
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

test("filter-delay rebuilds filter debounce state at runtime", async () => {
    const inst = await makeReadyGrid({
        columns: [{ field: "name" }],
        filterable: true,
        filterDelay: 500,
        dataSource: new ArrayDataSource([{ name: "Alice" }, { name: "Bob" }]),
    });

    typeFilter(inst, "name", "Alice");
    inst.setAttribute("filter-delay", "0");
    await sleep(20);
    expect(inst.query.filters.name).toBeUndefined();

    typeFilter(inst, "name", "Bob");
    await sleep(20);
    expect(inst.query.filters.name).toEqual({ operator: "contains", value: "Bob" });
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

test("text filter placeholders use the grid default and can be overridden by the column", async () => {
    const inst = await makeReadyGrid({
        columns: [
            { field: "name", title: "Name" },
            { field: "ref", title: "Reference", filterPlaceholder: "ABC-123" },
        ],
        filterable: true,
        dataSource: new ArrayDataSource([{ name: "Alice", ref: "ABC" }]),
    });

    const plain = inst.querySelector('.dg-head-filters input[data-name="name"]');
    expect(plain.getAttribute("placeholder")).toBe(inst.defaultColumn.filterPlaceholder);

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
