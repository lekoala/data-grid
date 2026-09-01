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
    DataGrid.unregisterPlugins();
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

test("menu is read at interaction time without rebuilding the header", () => {
    const grid = document.createElement("div");
    const table = document.createElement("table");
    const thead = document.createElement("thead");
    const header = document.createElement("th");
    thead.appendChild(header);
    table.appendChild(thead);
    grid.appendChild(table);
    grid.options = { menu: false };
    grid.ownsControl = () => true;

    const plugin = new ContextMenu(/** @type {any} */ (grid));
    const menu = document.createElement("ul");
    let opened = 0;
    menu.showPopover = () => opened++;
    plugin.menu = menu;
    grid.addEventListener("contextmenu", plugin);

    const disabled = new MouseEvent("contextmenu", { bubbles: true, cancelable: true });
    header.dispatchEvent(disabled);
    expect(disabled.defaultPrevented).toBe(false);

    grid.options.menu = true;
    const enabled = new MouseEvent("contextmenu", { bubbles: true, cancelable: true });
    header.dispatchEvent(enabled);
    expect(enabled.defaultPrevented).toBe(true);
    expect(opened).toBe(1);

    grid.options.menu = false;
    header.dispatchEvent(new MouseEvent("contextmenu", { bubbles: true, cancelable: true }));
    expect(opened).toBe(1);
});
