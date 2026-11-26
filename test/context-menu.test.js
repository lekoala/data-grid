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

async function makeGrid(menu = true) {
    DataGrid.unregisterPlugins();
    DataGrid.registerPlugins({ ContextMenu });
    const grid = new DataGrid({
        columns: [
            { field: "first_name", title: "First" },
            { field: "last_name", title: "Last" },
        ],
        dataSource: new ArrayDataSource([{ first_name: "Ada", last_name: "Lovelace" }]),
        menu,
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

test("the header menu is created on the first enabled right click", async () => {
    const original = Object.getOwnPropertyDescriptor(HTMLElement.prototype, "showPopover");
    let opened = 0;
    Object.defineProperty(HTMLElement.prototype, "showPopover", { configurable: true, value: () => opened++ });
    try {
        const grid = await makeGrid(false);
        const header = grid.querySelector("thead th");
        const rightClick = () =>
            header.dispatchEvent(new MouseEvent("contextmenu", { bubbles: true, cancelable: true }));

        expect(rightClick()).toBe(true);
        expect(grid.querySelector(".dg-context-menu")).toBeNull();

        grid.options.menu = true;
        expect(grid.querySelector(".dg-context-menu")).toBeNull();
        expect(rightClick()).toBe(false);
        expect(grid.querySelectorAll(".dg-context-menu input")).toHaveLength(2);
        expect(opened).toBe(1);

        grid.options.menu = false;
        expect(rightClick()).toBe(true);
        expect(opened).toBe(1);

        const disconnected = new Promise((resolve) => grid.addEventListener("disconnected", resolve, { once: true }));
        grid.remove();
        await disconnected;
        expect(grid.querySelector(".dg-context-menu")).toBeNull();
    } finally {
        if (original) {
            Object.defineProperty(HTMLElement.prototype, "showPopover", original);
        } else {
            Reflect.deleteProperty(HTMLElement.prototype, "showPopover");
        }
    }
});
