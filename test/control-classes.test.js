import { afterEach, expect, test } from "bun:test";
import DataGrid from "../data-grid.js";
import { ArrayDataSource } from "../src/data-source.js";
import BulkActions from "../src/plugins/bulk-actions.js";
import ContextMenu from "../src/plugins/context-menu.js";
import EditableColumn from "../src/plugins/editable-column.js";
import RowActions from "../src/plugins/row-actions.js";
import SelectableRows from "../src/plugins/selectable-rows.js";

const defaults = DataGrid.getDefaultControlClasses();
afterEach(() => {
    for (const grid of document.querySelectorAll("data-grid")) grid.remove();
    DataGrid.setDefaultControlClasses(defaults);
});

async function ready(options = {}) {
    DataGrid.registerPlugins({ BulkActions, RowActions });
    const grid = new DataGrid({
        columns: [{ field: "name" }],
        dataSource: new ArrayDataSource([
            { id: 1, name: "Ada" },
            { id: 2, name: "Grace" },
        ]),
        searchable: true,
        filterable: true,
        sortable: true,
        initialQuery: { pageSize: 1 },
        actions: [{ name: "open", label: "Open", class: "custom-action" }],
        bulkActions: [{ name: "archive", label: "Archive", class: "custom-bulk" }],
        ...options,
    });
    const connected = new Promise((resolve) => grid.addEventListener("connected", resolve, { once: true }));
    document.body.appendChild(grid);
    await connected;
    return grid;
}

test("late global defaults update connected controls without replacing them", async () => {
    const grid = await ready();
    const next = grid.querySelector(".dg-btn-next");
    expect(next.classList.contains("dg-skin")).toBe(true);
    const search = grid.querySelector(".dg-search");
    search.focus();
    DataGrid.setDefaultControlClasses({
        button: "host-btn",
        input: "host-input",
        select: "host-select",
        action: "host-action",
    });
    expect(grid.querySelector(".dg-btn-next")).toBe(next);
    expect(document.activeElement).toBe(search);
    for (const [selector, classes] of [
        [".dg-btn-next", ["host-btn"]],
        [".dg-input-page", ["host-input"]],
        [".dg-search", ["host-input"]],
        [".dg-select-per-page", ["host-select"]],
        ['.dg-actions [data-action="open"]', ["host-action", "custom-action"]],
        ['.dg-bulk-actions [data-action="archive"]', ["host-btn", "custom-bulk"]],
    ]) {
        const control = grid.querySelector(selector);
        for (const name of classes) expect(control.classList.contains(name)).toBe(true);
        expect(control.classList.contains("dg-skin")).toBe(false);
    }
    expect(search.parentElement.classList.contains("dg-host-input")).toBe(true);
    const filter = grid.querySelector(".dg-filter-control");
    expect(filter.classList.contains("host-input")).toBe(false);
    expect(filter.classList.contains("dg-skin")).toBe(true);
    DataGrid.setDefaultControlClasses(defaults);
    expect(next.classList.contains("dg-skin")).toBe(true);
    expect(next.classList.contains("host-btn")).toBe(false);
});

test("instance role overrides, resets and normalized copies", async () => {
    DataGrid.setDefaultControlClasses({ button: "global", input: "first" });
    const supplied = { button: "  local local\tcompact  ", input: "" };
    const grid = await ready({ controlClasses: supplied });
    supplied.button = "mutated";
    expect(grid.controlClasses.button).toBe("local compact");
    // Property assignment also normalizes and copies.
    grid.controlClasses = { button: "  local local\tcompact  ", input: "" };
    expect(grid.controlClasses.button).toBe("local compact");
    expect(grid.querySelector(".dg-search").classList.contains("dg-skin")).toBe(true);
    DataGrid.setDefaultControlClasses({ button: "changed", select: "new-select" });
    expect(grid.querySelector(".dg-btn-next").classList.contains("local")).toBe(true);
    expect(grid.querySelector(".dg-select-per-page").classList.contains("new-select")).toBe(true);
    const copy = DataGrid.getDefaultControlClasses();
    copy.button = "bad";
    expect(DataGrid.getDefaultControlClasses().button).toBe("changed");
    grid.controlClasses = null;
    expect(grid.querySelector(".dg-btn-next").classList.contains("changed")).toBe(true);
    expect(grid.querySelector(".dg-search").classList.contains("first")).toBe(true);
});

test("classes survive query changes, data replacement and reconnect", async () => {
    DataGrid.setDefaultControlClasses({ button: "host-btn", action: "host-action", input: "host-input" });
    const grid = await ready();
    await grid.setQuery({ page: 2 });
    await grid.setQuery({ sort: [{ field: "name", direction: "desc" }] });
    await grid.setQuery({ filters: { name: { operator: "contains", value: "Ada" } } });
    grid.options.dataSource = new ArrayDataSource([{ id: 3, name: "Ada Lovelace" }]);
    grid.setupDataSource();
    await grid.load();
    expect(grid.querySelector('.dg-actions [data-action="open"]').classList.contains("host-action")).toBe(true);
    grid.remove();
    await new Promise((resolve) => setTimeout(resolve, 10));
    DataGrid.setDefaultControlClasses({ button: "new-default" });
    const connected = new Promise((resolve) => grid.addEventListener("connected", resolve, { once: true }));
    document.body.appendChild(grid);
    await connected;
    expect(grid.querySelector(".dg-btn-next").classList.contains("new-default")).toBe(true);
    expect(grid.querySelector(".dg-btn-next").classList.contains("host-btn")).toBe(false);
});

test("check and radio roles reach every grid checkbox and update in place", async () => {
    DataGrid.registerPlugins({ SelectableRows, EditableColumn });
    const grid = await ready({
        columns: [
            { field: "name" },
            { field: "active", editable: true, editableType: "checkbox" },
            { field: "team", filterType: "select", filterMultiple: true },
        ],
        dataSource: new ArrayDataSource([
            { id: 1, name: "Ada", active: true, team: "A" },
            { id: 2, name: "Grace", active: false, team: "B" },
        ]),
        initialQuery: {},
        selectable: true,
    });
    // The column menu needs the Popover API, which the test DOM lacks: build
    // it directly, inside the grid, as connected() does.
    const menu = new ContextMenu(grid);
    menu.menu = document.createElement("ul");
    menu.menu.className = "dg-menu dg-context-menu";
    grid.appendChild(menu.menu);
    menu.createMenu();
    const selectors = [
        ".dg-select-all",
        ".dg-selectable input[type='checkbox']",
        "input.dg-editable[type='checkbox']",
        ".dg-multiselect-panel input[type='checkbox']",
        ".dg-menu:not(.dg-multiselect-panel) input[type='checkbox']",
    ];
    const controls = selectors.map((selector) => grid.querySelector(selector));
    expect(selectors.filter((_, index) => !controls[index])).toEqual([]);
    for (const control of controls) {
        expect(control.classList.contains("dg-skin")).toBe(true);
        expect(control.dataset.dgControl).toBe("check");
    }
    const row = grid.querySelector(".dg-selectable input[type='checkbox']");
    row.focus();
    DataGrid.setDefaultControlClasses({ check: "host-check", radio: "host-radio" });
    expect(document.activeElement).toBe(row);
    controls.forEach((control, index) => {
        expect(grid.querySelector(selectors[index])).toBe(control);
        expect(control.classList.contains("host-check")).toBe(true);
        expect(control.classList.contains("dg-skin")).toBe(false);
    });
    // Structural classes stay: selection and editing still find their inputs.
    expect(controls[0].classList.contains("dg-select-all")).toBe(true);
    expect(controls[2].classList.contains("dg-editable")).toBe(true);
    DataGrid.setDefaultControlClasses({ check: "" });
    for (const control of controls) {
        expect(control.classList.contains("host-check")).toBe(false);
        expect(control.classList.contains("dg-skin")).toBe(true);
    }
});

test("single selection takes the radio role", async () => {
    DataGrid.registerPlugins({ SelectableRows });
    DataGrid.setDefaultControlClasses({ check: "host-check", radio: "host-radio" });
    const grid = await ready({ selectable: true, singleSelect: true });
    const radio = grid.querySelector(".dg-selectable input[type='radio']");
    expect(radio.classList.contains("host-radio")).toBe(true);
    expect(radio.classList.contains("host-check")).toBe(false);
    expect(radio.dataset.dgControl).toBe("radio");
});

test("class values stay class tokens and never become HTML", async () => {
    const grid = await ready({ controlClasses: { button: 'x-btn "><img src=x onerror=alert(1)>' } });
    expect(grid.querySelector("img")).toBeNull();
    expect(grid.querySelector(".dg-btn-next").classList.contains("x-btn")).toBe(true);
});
