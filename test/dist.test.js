import { expect, test } from "bun:test";
import DataGrid, { ArrayDataSource, FetchDataSource } from "../dist/data-grid.js";

test("dist bundle exports the v3 API", () => {
    expect(typeof DataGrid).toBe("function");
    expect(typeof ArrayDataSource).toBe("function");
    expect(typeof FetchDataSource).toBe("function");
    expect(typeof customElements.get("data-grid")).toBe("function");
});

test("dist bundle omits legacy touch and spinner plugins", () => {
    expect(DataGrid.registeredPlugins()).not.toHaveProperty("TouchSupport");
    expect(DataGrid.registeredPlugins()).not.toHaveProperty("SpinnerSupport");
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
