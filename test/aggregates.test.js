import { afterEach, expect, test } from "bun:test";
import DataGrid from "../data-grid.js";
import ResponsiveGrid from "../src/plugins/responsive-grid.js";
import SelectableRows from "../src/plugins/selectable-rows.js";

const RESULT = {
    rows: [{ id: 1, name: "Customer", mrr: 10, health: 0.25 }],
    total: 64,
    meta: { aggregates: { mrr: 48553, health: 0.5728 } },
};
const COLUMNS = [
    { field: "name" },
    { field: "mrr", summary: "sum", format: "number", formatOptions: { style: "currency", currency: "USD" } },
    {
        field: "health",
        summary: "avg",
        format: "number",
        formatOptions: { style: "percent", maximumFractionDigits: 2 },
    },
];
const grids = [];
afterEach(() => {
    for (const grid of grids.splice(0)) grid.remove();
});

async function make(options = {}, result = RESULT, plugins = {}) {
    DataGrid.unregisterPlugins();
    DataGrid.registerPlugins(plugins);
    const grid = new DataGrid({
        columns: COLUMNS,
        dataSource: {
            async load() {
                return result;
            },
        },
        ...options,
    });
    grid.lang = "en-US";
    grids.push(grid);
    const ready = new Promise((resolve) => grid.addEventListener("connected", resolve, { once: true }));
    document.body.append(grid);
    await ready;
    return grid;
}

const footer = (grid) => grid.querySelector("table > tfoot");
const cell = (grid, id) =>
    [...footer(grid).querySelectorAll(":scope > tr > td")].find((td) => td.dataset.columnId === id);
const tick = () => new Promise((resolve) => setTimeout(resolve, 0));

test("aggregates use source values and numeric formatting without row renderers or transformations", async () => {
    const contexts = [];
    const grid = await make({
        columns: [
            COLUMNS[0],
            {
                ...COLUMNS[1],
                renderCell(ctx) {
                    contexts.push(ctx);
                    return "Row renderer";
                },
            },
            { ...COLUMNS[2], transform: () => 0 },
        ],
    });
    expect(cell(grid, "mrr").textContent).toBe("$48,553.00");
    expect(cell(grid, "health").textContent).toBe("57.28%");
    expect(cell(grid, "mrr").dataset.align).toBe("end");
    expect(contexts.length).toBe(1);
    expect(contexts[0].row).toBe(RESULT.rows[0]);
    expect(cell(grid, "name").textContent).toBe("");
    expect(cell(grid, "mrr").getAttribute("headers")).toBe(grid.querySelector('th[field="mrr"]').id);
    grid.setAttribute("sortable", "true");
    expect(cell(grid, "mrr").getAttribute("headers")).toBe(grid.querySelector('th[field="mrr"]').id);
});

test("missing metadata removes the footer, while an empty aggregate object renders unavailable values", async () => {
    const source = {
        result: RESULT,
        async load() {
            return this.result;
        },
    };
    const grid = await make({ dataSource: source });
    for (const aggregates of [undefined, null, 0, "invalid", []]) {
        source.result = { ...RESULT, meta: { aggregates } };
        await grid.refresh();
        expect(footer(grid)).toBeNull();
    }
    source.result = { ...RESULT, meta: { aggregates: {} } };
    await grid.refresh();
    expect(cell(grid, "mrr").textContent).toBe("—");
    expect(cell(grid, "health").textContent).toBe("—");
    source.result = RESULT;
    await grid.refresh();
    expect(cell(grid, "mrr").textContent).toBe("$48,553.00");
});

test("zero is retained and invalid or inherited aggregate values are unavailable", async () => {
    const source = {
        result: RESULT,
        async load() {
            return this.result;
        },
    };
    const grid = await make({ dataSource: source });
    for (const value of [null, undefined, "123", false, {}, Number.NaN, Number.POSITIVE_INFINITY]) {
        source.result = { ...RESULT, meta: { aggregates: { mrr: value, health: 0 } } };
        await grid.refresh();
        expect(cell(grid, "mrr").textContent).toBe("—");
        expect(cell(grid, "health").textContent).toBe("0%");
    }
    source.result = { rows: [], total: 0, meta: { aggregates: { mrr: 0, health: null } } };
    await grid.refresh();
    expect(cell(grid, "mrr").textContent).toBe("$0.00");
    expect(cell(grid, "health").textContent).toBe("—");
    source.result = { ...RESULT, meta: { aggregates: Object.create({ mrr: 123 }) } };
    await grid.refresh();
    expect(cell(grid, "mrr").textContent).toBe("—");
});

test("a summary needs a configured data column; unknown summary names are inert", async () => {
    const grid = await make({ columns: [{ field: "mrr", summary: "count" }] });
    expect(footer(grid)).toBeNull();
    const virtual = await make({ columns: [{ field: "mrr", virtual: true, summary: "sum" }] });
    expect(footer(virtual)).toBeNull();
});

test("aggregate cells declare their numeric format, not the column format", async () => {
    const grid = await make({
        columns: [{ field: "name", format: "date" }, { field: "created", format: "date", summary: "sum" }, COLUMNS[1]],
        initialResult: { ...RESULT, meta: { aggregates: { created: 3, mrr: 48553 } } },
    });
    expect(cell(grid, "name").hasAttribute("data-format")).toBe(false);
    expect(cell(grid, "created").dataset.format).toBe("number");
    expect(cell(grid, "created").textContent).toBe("3");
    expect(cell(grid, "mrr").dataset.format).toBe("number");
    expect(grid.querySelector("tbody td[data-column-id='name']").dataset.format).toBe("date");
});

test("the footer hides while no summary column is visible and returns with one", async () => {
    const grid = await make({ columns: [COLUMNS[0], COLUMNS[1], { field: "id", attr: "data-id", summary: "sum" }] });
    expect(footer(grid).hidden).toBe(false);
    grid.hideColumn("mrr");
    expect(footer(grid).hidden).toBe(true);
    await grid.refresh();
    expect(footer(grid).hidden).toBe(true);
    grid.showColumn("mrr");
    expect(footer(grid).hidden).toBe(false);
    expect(cell(grid, "mrr").textContent).toBe("$48,553.00");
});

test("generated aggregates replace an author footer without accepting its contents", async () => {
    DataGrid.unregisterPlugins();
    const grid = new DataGrid({ columns: [COLUMNS[1]], initialResult: RESULT });
    grids.push(grid);
    grid.lang = "en-US";
    grid.innerHTML =
        "<table><thead><tr><th>MRR</th></tr></thead><tbody></tbody><tfoot><tr><td>Author footer</td></tr></tfoot></table>";
    const ready = new Promise((resolve) => grid.addEventListener("connected", resolve, { once: true }));
    document.body.append(grid);
    await ready;
    expect(footer(grid).textContent).not.toContain("Author footer");
    expect(cell(grid, "mrr").textContent).toBe("$48,553.00");
});

test("aggregate cells follow plugin columns, row attributes, visibility, order and frozen offsets", async () => {
    const grid = await make(
        {
            selectable: true,
            columns: [
                { ...COLUMNS[1], frozen: "start" },
                { field: "name" },
                { ...COLUMNS[2], frozen: "end" },
                { field: "id", attr: "data-id", summary: "sum" },
            ],
        },
        RESULT,
        { SelectableRows, ResponsiveGrid },
    );
    expect([...footer(grid).querySelectorAll(":scope > tr > td")].map((td) => td.dataset.columnId)).toEqual([
        "$selection",
        "mrr",
        "name",
        "health",
    ]);
    expect(cell(grid, "$selection").textContent).toBe("");
    grid.hideColumn("health");
    expect(cell(grid, "health").hidden).toBe(true);
    grid.showColumn("health");
    expect(cell(grid, "health").hidden).toBe(false);
    grid.setColProp("name", "responsiveHidden", true);
    grid.syncColumnVisibility();
    expect(cell(grid, "name").classList.contains("dg-responsive-hidden")).toBe(true);
    grid.setColProp("name", "responsiveHidden", false);
    grid.syncColumnVisibility();
    expect(cell(grid, "name").hidden).toBe(false);

    grid.options.columns = [grid.options.columns[2], grid.options.columns[0], grid.options.columns[1]];
    grid.renderTable();
    grid.renderBody();
    expect([...footer(grid).querySelectorAll(":scope > tr > td")].map((td) => td.dataset.columnId)).toEqual([
        "$selection",
        "health",
        "mrr",
        "name",
    ]);
    grid.syncFrozenColumns();
    expect(cell(grid, "mrr").dataset.frozen).toBe("start");
    expect(cell(grid, "health").dataset.frozen).toBe("end");
    expect(cell(grid, "health").hasAttribute("data-frozen-edge")).toBe(true);
});

test("progressive aggregate metadata replaces prior values and omissions remove them", async () => {
    let page = 0;
    const results = [
        { ...RESULT, total: null, hasMore: true },
        { rows: [{ id: 2, mrr: 2 }], meta: { aggregates: { mrr: 60000 } }, hasMore: true },
        { rows: [{ id: 3, mrr: 3 }], hasMore: false },
    ];
    const grid = await make({
        pager: "more",
        dataSource: {
            async load() {
                return results[page++];
            },
        },
    });
    const first = grid.querySelector("tbody tr.dg-data-row");
    await grid.loadMore();
    expect(cell(grid, "mrr").textContent).toBe("$60,000.00");
    expect(grid.querySelector("tbody tr.dg-data-row")).toBe(first);
    expect(cell(grid, "health").textContent).toBe("—");
    await grid.loadMore();
    expect(footer(grid)).toBeNull();
});

test("late replacement results cannot overwrite aggregate values or emit a stale body commit", async () => {
    const requests = [];
    const grid = await make();
    grid.dataSource.load = () => new Promise((resolve) => requests.push(resolve));
    const commits = [];
    grid.addEventListener("bodyRendered", () => commits.push(cell(grid, "mrr").textContent));
    const first = grid.setQuery({ search: "first" });
    const second = grid.setQuery({ filters: { name: "second" } });
    requests[1]({ ...RESULT, meta: { aggregates: { mrr: 20 } } });
    await second;
    requests[0]({ ...RESULT, meta: { aggregates: { mrr: 999 } } });
    await first;
    expect(cell(grid, "mrr").textContent).toBe("$20.00");
    expect(commits).toEqual(["$20.00"]);
});

test("an obsolete progressive chunk cannot restore aggregates after a newer query removes them", async () => {
    let finish;
    const grid = await make({ pager: "more" }, { ...RESULT, hasMore: true });
    grid.dataSource.load = (query) =>
        query.page === 2
            ? new Promise((resolve) => {
                  finish = resolve;
              })
            : Promise.resolve({ rows: [], total: 0 });
    const more = grid.loadMore();
    await grid.setQuery({ sort: [{ field: "mrr", direction: "desc" }] });
    finish({ ...RESULT, meta: { aggregates: { mrr: 999 } }, hasMore: false });
    await more;
    expect(footer(grid)).toBeNull();
    expect(grid.rows).toEqual([]);
});

test("source changes and disconnect ignore late aggregate results; reconnect creates a single footer", async () => {
    let finish;
    const grid = await make();
    grid.dataSource.load = () =>
        new Promise((resolve) => {
            finish = resolve;
        });
    const old = grid.refresh();
    grid.dataSource = {
        async load() {
            return { ...RESULT, meta: { aggregates: { mrr: 30 } } };
        },
    };
    await grid.refresh();
    finish({ ...RESULT, meta: { aggregates: { mrr: 999 } } });
    await old;
    expect(cell(grid, "mrr").textContent).toBe("$30.00");

    grid.dataSource.load = () =>
        new Promise((resolve) => {
            finish = resolve;
        });
    const loading = grid.refresh();
    const disconnected = new Promise((resolve) => grid.addEventListener("disconnected", resolve, { once: true }));
    grid.remove();
    await disconnected;
    let commits = 0;
    grid.addEventListener("bodyRendered", () => commits++);
    finish({ ...RESULT, meta: { aggregates: { mrr: 999 } } });
    await loading;
    expect(commits).toBe(0);
    expect(cell(grid, "mrr").textContent).toBe("$30.00");
    grid.dataSource.load = async () => RESULT;
    grid.options.dataSource = grid.dataSource;
    const connected = new Promise((resolve) => grid.addEventListener("connected", resolve, { once: true }));
    document.body.append(grid);
    await connected;
    expect(grid.querySelectorAll("table > tfoot").length).toBe(1);
    expect(cell(grid, "mrr").textContent).toBe("$48,553.00");
});

test("replacement load errors hide stale aggregates until a successful response", async () => {
    const grid = await make();
    grid.dataSource.load = async () => {
        throw new Error("Offline");
    };
    await grid.refresh();
    expect(footer(grid)).toBeNull();
    grid.dataSource.load = async () => RESULT;
    await grid.refresh();
    expect(cell(grid, "mrr").textContent).toBe("$48,553.00");
    await tick();
});
