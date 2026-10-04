import { afterEach, expect, test } from "bun:test";
import DataGrid from "../data-grid.js";
import ColumnResizer from "../src/plugins/column-resizer.js";
import DraggableHeaders from "../src/plugins/draggable-headers.js";
import SaveState from "../src/plugins/save-state.js";

const gridId = "save-state-test";

afterEach(() => {
    document.querySelector(`data-grid#${gridId}`)?.remove();
    sessionStorage.removeItem(`gridSaveState_${gridId}`);
    DataGrid.unregisterPlugins();
});

test("restores a cached query through the plugin API before the first load", async () => {
    sessionStorage.setItem(
        `gridSaveState_${gridId}`,
        JSON.stringify({
            query: {
                page: 2,
                pageSize: 2,
                search: "Ada",
                sort: [{ field: "name", direction: "desc" }],
                filters: { name: { operator: "eq", value: "Ada" } },
            },
            columns: [
                { field: "name", hidden: false },
                { field: "email", hidden: true },
            ],
        }),
    );

    DataGrid.unregisterPlugins();
    DataGrid.registerPlugins({ SaveState });
    const queries = [];
    const grid = new DataGrid({
        id: gridId,
        columns: [
            { field: "name", title: "Name", hidden: true },
            { field: "email", title: "Email" },
        ],
        saveState: true,
        dataSource: {
            load(query) {
                queries.push(query);
                return Promise.resolve({ rows: [{ name: "Ada" }], total: 100 });
            },
        },
    });
    const connected = new Promise((resolve) => grid.addEventListener("connected", resolve, { once: true }));
    document.body.appendChild(grid);
    await connected;

    expect(queries).toHaveLength(1);
    expect(queries[0]).toEqual({
        page: 2,
        pageSize: 2,
        search: "Ada",
        sort: [{ field: "name", direction: "desc" }],
        filters: { name: { operator: "eq", value: "Ada" } },
    });
    expect(grid.query).toEqual(queries[0]);
    expect(grid.options.columns[0].hidden).toBe(false);
    expect(grid.options.columns[1].hidden).toBe(true);
});

test("persists successful queries and explicit column visibility", async () => {
    DataGrid.unregisterPlugins();
    DataGrid.registerPlugins({ SaveState });
    const grid = new DataGrid({
        id: gridId,
        columns: [
            { field: "name", title: "Name" },
            { field: "email", title: "Email" },
        ],
        saveState: true,
        dataSource: {
            load() {
                return Promise.resolve({ rows: [{ name: "Ada", email: "ada@example.test" }], total: 1 });
            },
        },
    });
    const connected = new Promise((resolve) => grid.addEventListener("connected", resolve, { once: true }));
    document.body.appendChild(grid);
    await connected;

    await grid.setQuery({ search: "Ada" });
    grid.hideColumn("email", false);

    const stored = JSON.parse(sessionStorage.getItem(`gridSaveState_${gridId}`));
    expect(stored.query.search).toBe("Ada");
    expect(stored.columns).toEqual([
        { id: "name", hidden: false },
        { id: "email", hidden: true },
    ]);
});

test("save-state can be enabled and disabled after connection", async () => {
    DataGrid.unregisterPlugins();
    DataGrid.registerPlugins({ SaveState });
    const grid = new DataGrid({
        id: gridId,
        columns: [{ field: "name", title: "Name" }],
        dataSource: {
            load() {
                return Promise.resolve({ rows: [{ name: "Ada" }], total: 1 });
            },
        },
    });
    const connected = new Promise((resolve) => grid.addEventListener("connected", resolve, { once: true }));
    document.body.appendChild(grid);
    await connected;

    grid.setAttribute("save-state", "");
    const stored = sessionStorage.getItem(`gridSaveState_${gridId}`);
    expect(stored).not.toBeNull();

    grid.removeAttribute("save-state");
    await grid.setQuery({ search: "Grace" });
    expect(sessionStorage.getItem(`gridSaveState_${gridId}`)).toBe(stored);
});

test("save-state warns and stays disabled for an automatically generated id", async () => {
    DataGrid.unregisterPlugins();
    DataGrid.registerPlugins({ SaveState });
    const warnings = [];
    const originalWarn = console.warn;
    console.warn = (...args) => warnings.push(args.join(" "));
    const grid = new DataGrid({
        columns: [{ field: "name" }],
        saveState: true,
        dataSource: { load: () => Promise.resolve({ rows: [{ name: "Ada" }], total: 1 }) },
    });
    const generatedId = grid.id;
    const connected = new Promise((resolve) => grid.addEventListener("connected", resolve, { once: true }));

    try {
        document.body.appendChild(grid);
        await connected;

        expect(warnings).toEqual(["saveState requires a stable id on <data-grid>; state persistence is disabled."]);
        expect(sessionStorage.getItem(`gridSaveState_${generatedId}`)).toBeNull();
    } finally {
        console.warn = originalWarn;
        grid.remove();
        sessionStorage.removeItem(`gridSaveState_${generatedId}`);
    }
});

async function makeSaveStateGrid(columns) {
    DataGrid.unregisterPlugins();
    DataGrid.registerPlugins({ SaveState, ColumnResizer, DraggableHeaders });
    const grid = new DataGrid({
        id: gridId,
        columns,
        saveState: true,
        resizable: true,
        reorder: true,
        dataSource: {
            load: () =>
                Promise.resolve({ rows: [{ name: "Ada", email: "ada@example.test", city: "Milan" }], total: 1 }),
        },
    });
    document.body.appendChild(grid);
    await new Promise((resolve) => grid.addEventListener("connected", resolve, { once: true }));
    return grid;
}

function resizeColumn(grid, field, from, to) {
    const th = /** @type {HTMLTableCellElement} */ (grid.querySelector(`thead th[data-column-id="${field}"]`));
    Object.defineProperty(th, "offsetWidth", {
        configurable: true,
        get() {
            return Number.parseFloat(th.getAttribute("width") ?? "") || 100;
        },
    });
    const resizer = /** @type {HTMLElement} */ (th.querySelector(".dg-resizer"));
    resizer.dispatchEvent(new MouseEvent("mousedown", { bubbles: true, cancelable: true, clientX: from }));
    document.dispatchEvent(new MouseEvent("mousemove", { bubbles: true, clientX: to }));
    document.dispatchEvent(new MouseEvent("mouseup", { bubbles: true, clientX: to }));
}

function drop(inst, draggedId, targetId) {
    const target = inst.querySelector(`thead th[data-column-id="${targetId}"]`);
    const event = new Event("drop", { bubbles: true, cancelable: true });
    Object.defineProperty(event, "dataTransfer", { value: { getData: () => draggedId } });
    target.dispatchEvent(event);
}

test("resize commits the width to the model and persists it as user width", async () => {
    sessionStorage.removeItem(`gridSaveState_${gridId}`);
    const grid = await makeSaveStateGrid([
        { field: "name", title: "Name", width: 180 },
        { field: "email", title: "Email" },
    ]);

    resizeColumn(grid, "name", 100, 150);

    expect(grid.options.columns.find((c) => c.field === "name").width).toBe(230);
    const stored = JSON.parse(sessionStorage.getItem(`gridSaveState_${gridId}`));
    // Only the resized column gains a persisted width; the authored-only one
    // stays widthless, so a later authored width is not overwritten.
    expect(stored.columns.find((c) => c.id === "name")).toEqual({ id: "name", hidden: false, width: 230 });
    expect(stored.columns.find((c) => c.id === "email")).toEqual({ id: "email", hidden: false });
    document.body.removeChild(grid);
});

test("a persisted user width wins over an authored width at restore", async () => {
    sessionStorage.setItem(
        `gridSaveState_${gridId}`,
        JSON.stringify({
            query: {},
            columns: [
                { id: "name", hidden: false, width: 250 },
                { id: "email", hidden: true },
            ],
        }),
    );
    const grid = await makeSaveStateGrid([
        { field: "name", title: "Name", width: 220 },
        { field: "email", title: "Email" },
    ]);

    expect(grid.options.columns.find((c) => c.field === "name").width).toBe(250);
    document.body.removeChild(grid);
});

test("an authored width stays untouched when the stored column has no user width", async () => {
    sessionStorage.setItem(
        `gridSaveState_${gridId}`,
        JSON.stringify({
            query: {},
            columns: [{ id: "name", hidden: false }],
        }),
    );
    const grid = await makeSaveStateGrid([
        { field: "name", title: "Name", width: 180 },
        { field: "email", title: "Email" },
    ]);

    expect(grid.options.columns.find((c) => c.field === "name").width).toBe(180);
    document.body.removeChild(grid);
});

test("order restore keeps new columns in their authored slots", async () => {
    sessionStorage.setItem(
        `gridSaveState_${gridId}`,
        JSON.stringify({
            query: {},
            columns: [
                { id: "c", hidden: false },
                { id: "a", hidden: false },
                { id: "b", hidden: false },
            ],
        }),
    );
    const grid = await makeSaveStateGrid([{ field: "a" }, { field: "x" }, { field: "b" }, { field: "c" }]);

    expect(grid.options.columns.map((c) => c.field)).toEqual(["c", "x", "a", "b"]);
    document.body.removeChild(grid);
});

test("stale persisted ids are ignored without disturbing authored order", async () => {
    sessionStorage.setItem(
        `gridSaveState_${gridId}`,
        JSON.stringify({
            query: {},
            columns: [{ id: "vanished", hidden: true }],
        }),
    );
    const grid = await makeSaveStateGrid([
        { field: "name", title: "Name" },
        { field: "email", title: "Email" },
    ]);

    expect(grid.options.columns.map((c) => c.field)).toEqual(["name", "email"]);
    expect(grid.options.columns[0].hidden).toBe(false);
    document.body.removeChild(grid);
});

test("legacy field-based storage still restores visibility", async () => {
    sessionStorage.setItem(
        `gridSaveState_${gridId}`,
        JSON.stringify({
            query: {},
            columns: [
                { field: "name", hidden: true },
                { field: "email", hidden: false },
            ],
        }),
    );
    const grid = await makeSaveStateGrid([
        { field: "name", title: "Name" },
        { field: "email", title: "Email" },
    ]);

    expect(grid.options.columns.find((c) => c.field === "name").hidden).toBe(true);
    expect(grid.options.columns.find((c) => c.field === "email").hidden).toBe(false);
    document.body.removeChild(grid);
});

test("stable ids take precedence over colliding fields when restoring columns", async () => {
    sessionStorage.setItem(
        `gridSaveState_${gridId}`,
        JSON.stringify({
            columns: [
                { id: "y", hidden: false, width: 230 },
                { id: "z", hidden: true },
            ],
        }),
    );
    const grid = await makeSaveStateGrid([
        { field: "y", id: "z" },
        { field: "x", id: "y" },
    ]);

    expect(grid.options.columns.map((column) => column.id)).toEqual(["y", "z"]);
    expect(grid.options.columns.map((column) => column.field)).toEqual(["x", "y"]);
    expect(grid.options.columns[0].width).toBe(230);
    expect(grid.options.columns[1].hidden).toBe(true);
    await grid.refresh();
    const stored = JSON.parse(sessionStorage.getItem(`gridSaveState_${gridId}`));
    expect(stored.columns).toEqual([
        { id: "y", hidden: false, width: 230 },
        { id: "z", hidden: true },
    ]);
    document.body.removeChild(grid);
});

test("legacy fields resolve to canonical columns for order, visibility and widths", async () => {
    sessionStorage.setItem(
        `gridSaveState_${gridId}`,
        JSON.stringify({
            columns: [
                { field: "x", hidden: false, width: 230 },
                { id: "y", hidden: true, width: 400 },
                { field: "y", hidden: true },
            ],
        }),
    );
    const grid = await makeSaveStateGrid([
        { field: "y", id: "z" },
        { field: "x", id: "y" },
    ]);

    expect(grid.options.columns.map((column) => column.id)).toEqual(["y", "z"]);
    expect(grid.options.columns[0].width).toBe(230);
    expect(grid.options.columns[0].hidden).toBe(false);
    expect(grid.options.columns[1].hidden).toBe(true);
    await grid.refresh();
    const stored = JSON.parse(sessionStorage.getItem(`gridSaveState_${gridId}`));
    expect(stored.columns[0]).toEqual({ id: "y", hidden: false, width: 230 });
    document.body.removeChild(grid);
});

test("resize persistence resolves event fields independently of column ids", async () => {
    const grid = await makeSaveStateGrid([
        { field: "y", id: "z" },
        { field: "x", id: "y" },
    ]);
    resizeColumn(grid, "z", 100, 180);

    const stored = JSON.parse(sessionStorage.getItem(`gridSaveState_${gridId}`));
    expect(stored.columns.find((column) => column.id === "z").width).toBe(180);
    expect(stored.columns.find((column) => column.id === "y").width).toBeUndefined();
    document.body.removeChild(grid);
});

test("malformed storage fails harmlessly", async () => {
    sessionStorage.setItem(
        `gridSaveState_${gridId}`,
        JSON.stringify({ query: {}, columns: [{ garbage: true }, null, { id: "" }] }),
    );
    const grid = await makeSaveStateGrid([
        { field: "name", title: "Name" },
        { field: "email", title: "Email" },
    ]);

    expect(grid.options.columns.map((c) => c.field)).toEqual(["name", "email"]);
    document.body.removeChild(grid);
});

test("a resize followed by a header reorder persists both in one state", async () => {
    sessionStorage.removeItem(`gridSaveState_${gridId}`);
    const grid = await makeSaveStateGrid([
        { field: "name", title: "Name" },
        { field: "email", title: "Email" },
    ]);

    resizeColumn(grid, "name", 100, 180);
    drop(grid, "name", "email");

    const stored = JSON.parse(sessionStorage.getItem(`gridSaveState_${gridId}`));
    expect(stored.columns.map((c) => c.id)).toEqual(["email", "name"]);
    expect(stored.columns.find((c) => c.id === "name")).toEqual({ id: "name", hidden: false, width: 180 });
    document.body.removeChild(grid);
});
