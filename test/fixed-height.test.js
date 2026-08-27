import { expect, test } from "bun:test";
import DataGrid from "../data-grid.js";
import { ArrayDataSource } from "../src/data-source.js";
import FixedHeight from "../src/plugins/fixed-height.js";

async function makeReadyGrid(rows, pageSize = 10) {
    DataGrid.registerPlugins({ FixedHeight });
    const grid = new DataGrid({
        columns: [{ field: "name", title: "Name" }],
        dataSource: new ArrayDataSource(rows),
        initialQuery: { pageSize },
    });
    document.body.appendChild(grid);
    await new Promise((resolve) => {
        grid.addEventListener("connected", resolve, { once: true });
        setTimeout(resolve, 2000);
    });
    return grid;
}

test("FixedHeight owns one semantic spanning spacer row", async () => {
    const grid = await makeReadyGrid([{ name: "Ada" }]);
    const spacer = grid.querySelector("tbody tr.dg-spacer-row");

    expect(spacer).toBeTruthy();
    expect(spacer.hidden).toBe(true);
    expect(spacer.getAttribute("aria-hidden")).toBe("true");
    expect(spacer.querySelectorAll(":scope > td")).toHaveLength(1);
    expect(spacer.querySelector("td").colSpan).toBe(1);
    expect(grid.querySelectorAll("tbody tr.dg-data-row")).toHaveLength(1);
    document.body.removeChild(grid);
});

test("a one-row last page receives only its missing page height", async () => {
    const rows = Array.from({ length: 11 }, (_, index) => ({ name: `Row ${index + 1}` }));
    const grid = await makeReadyGrid(rows);
    grid.rowHeight = 20;

    await grid.setQuery({ page: 2 });

    const spacer = grid.querySelector("tbody tr.dg-spacer-row");
    expect(grid.querySelectorAll("tbody tr.dg-data-row:not([hidden])")).toHaveLength(1);
    expect(spacer.hidden).toBe(false);
    expect(spacer.getAttribute("height")).toBe("180");
    document.body.removeChild(grid);
});
