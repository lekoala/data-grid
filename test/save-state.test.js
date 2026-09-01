import { afterEach, expect, test } from "bun:test";
import DataGrid from "../data-grid.js";
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
            columns: [],
        }),
    );

    DataGrid.registerPlugins({ SaveState });
    const queries = [];
    const grid = new DataGrid({
        id: gridId,
        columns: [{ field: "name", title: "Name" }],
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
});

test("save-state can be enabled and disabled after connection", async () => {
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
