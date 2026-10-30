import { expect, test } from "bun:test";
import DataGrid, { ArrayDataSource, FetchDataSource } from "../../dist/data-grid.js";

test("dist bundle exports the v3 API", () => {
    expect(typeof DataGrid).toBe("function");
    expect(typeof ArrayDataSource).toBe("function");
    expect(typeof FetchDataSource).toBe("function");
    expect(customElements.get("data-grid")).toBe(DataGrid);
    expect(new DataGrid()).toBeInstanceOf(DataGrid);
    expect(document.createElement("data-grid")).toBeInstanceOf(DataGrid);
    const grid = new DataGrid();
    grid.selectAllMatching();
    expect(grid.getSelectionState().mode).toBe("all");
});

test("dist bundle omits legacy touch and spinner plugins", () => {
    expect(DataGrid.registeredPlugins()).not.toHaveProperty("TouchSupport");
    expect(DataGrid.registeredPlugins()).not.toHaveProperty("SpinnerSupport");
});

test("dist bundle renders source-provided aggregates", async () => {
    const grid = new DataGrid({
        columns: [{ field: "amount", summary: "sum", format: "number" }],
        initialResult: { rows: [{ amount: 1 }], total: 10, meta: { aggregates: { amount: 42 } } },
    });
    const ready = new Promise((resolve) => grid.addEventListener("connected", resolve, { once: true }));
    document.body.append(grid);
    await ready;
    expect(grid.querySelector("tfoot td").textContent).toBe("42");
    grid.remove();
});

test("dist ArrayDataSource works without a grid", async () => {
    const ds = new ArrayDataSource([{ name: "b" }, { name: "a" }]);
    const result = await ds.load({
        page: 1,
        pageSize: 10,
        sort: [{ field: "name", direction: "asc" }],
        filters: {},
    });
    expect(result.rows.map((r) => r.name)).toEqual(["a", "b"]);
});
