import { afterEach, expect, test } from "bun:test";
import DataGrid from "../data-grid.js";
import { ArrayDataSource } from "../src/data-source.js";
import ContextMenu from "../src/plugins/context-menu.js";

const grids = [];

afterEach(() => {
    for (const grid of grids) {
        grid.remove();
    }
    grids.length = 0;
});

async function makeGrid() {
    DataGrid.registerPlugins({ ContextMenu });
    const grid = new DataGrid({
        columns: [
            { field: "first_name", title: "First" },
            { field: "last_name", title: "Last" },
        ],
        dataSource: new ArrayDataSource([{ first_name: "Ada", last_name: "Lovelace" }]),
        menu: true,
    });
    grids.push(grid);
    document.body.appendChild(grid);
    await new Promise((resolve) => {
        grid.addEventListener("connected", resolve, { once: true });
        setTimeout(resolve, 2000);
    });
    return grid;
}

test("keeps the native browser menu when Popover is unavailable", async () => {
    const grid = await makeGrid();

    expect(grid.querySelector(".dg-context-menu")).toBeNull();

    const event = new MouseEvent("contextmenu", { bubbles: true, cancelable: true });
    grid.querySelector("thead th").dispatchEvent(event);
    expect(event.defaultPrevented).toBe(false);
});
