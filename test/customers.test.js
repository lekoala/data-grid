import { afterEach, expect, test } from "bun:test";
import DataGrid from "../data-grid.js";
import { mountCustomers } from "../demo/customers.js";
import BulkActions from "../src/plugins/bulk-actions.js";
import ResponsiveGrid from "../src/plugins/responsive-grid.js";
import RowDetails from "../src/plugins/row-details.js";
import SelectableRows from "../src/plugins/selectable-rows.js";
import { change } from "./helpers.js";

let demo;
let root;
afterEach(() => {
    demo?.destroy();
    root?.remove();
});

async function open() {
    DataGrid.unregisterPlugins();
    DataGrid.registerPlugins({ BulkActions, ResponsiveGrid, RowDetails, SelectableRows });
    const html = await Bun.file(new URL("../demo/customers.html", import.meta.url)).text();
    // Parse only the application markup: loading the page head would fetch styles in happy-dom.
    root = new DOMParser()
        .parseFromString(html.match(/<main\b[\s\S]*?<\/main>/)[0], "text/html")
        .querySelector("[data-customers-demo]");
    document.body.append(root);
    demo = mountCustomers(root);
    await new Promise((resolve) => demo.grid.addEventListener("connected", resolve, { once: true }));
    return demo.grid;
}

const find = (selector) => root.querySelector(selector);

test("customer pills preserve unrelated filters and follow the column's filter state", async () => {
    const grid = await open();
    await grid.setQuery({ filters: { company: { operator: "contains", value: "Acme" } } });
    find('button[data-status="active"]').click();
    expect(grid.query.filters.company.value).toBe("Acme");
    expect(grid.query.filters.status).toEqual({ operator: "eq", value: "active" });
    await grid.setQuery({ filters: { status: { operator: "eq", value: "trial" } } });
    expect(find('button[data-status="trial"]').getAttribute("aria-pressed")).toBe("true");
    await grid.setQuery({ filters: { status: { operator: "in", value: ["trial", "active"] } } });
    expect(root.querySelectorAll('[data-status-pills] [aria-pressed="true"]').length).toBe(0);
    find('button[data-status=""]').click();
    expect(grid.query.filters.status).toBeUndefined();
});

test("customer selection invitation and action feedback distinguish page and global scope", async () => {
    const grid = await open();
    grid.selectAll();
    expect(find("[data-select-matching]").hidden).toBe(false);
    expect(find("[data-selection-scope]").textContent).toContain("10 rows on this page");
    find("[data-select-matching]").click();
    grid.deselectRow(grid.rows[0]);
    expect(find("[data-select-matching]").hidden).toBe(true);
    expect(find("[data-selection-scope]").textContent).toContain("excluding 1");
    grid.querySelector(".dg-bulk-actions button").click();
    expect(find("[data-action-feedback]").textContent).toContain("Mode: all");
    expect(find("[data-action-feedback]").textContent).toContain("excluding 1");
    find("[data-clear-selection]").click();
    expect(find("[data-clear-selection]").hidden).toBe(true);
    expect(find("[data-selection-scope]").textContent).toBe("");
});

test("loaded-results invitation updates on append and never fabricates an unknown total", async () => {
    const grid = await open();
    grid.setAttribute("pager", "more");
    grid.dataSource = {
        async load(query) {
            return { rows: [{ id: `loaded-${query.page}`, name: "Loaded customer" }], total: null, hasMore: true };
        },
    };
    await grid.refresh();
    grid.selectAll();
    expect(find("[data-selection-scope]").textContent).toContain("1 loaded results");
    expect(find("[data-select-matching]").textContent).toBe("Select all matching results");
    await grid.loadMore();
    expect(find("[data-select-matching]").hidden).toBe(true);
    grid.selectAll();
    expect(find("[data-selection-scope]").textContent).toContain("2 loaded results");
    grid.selectAllMatching();
    expect(find("[data-selection-scope]").textContent).toBe("All matching results selected.");
    expect(grid.querySelector(".dg-bulk-actions").hidden).toBe(false);
    expect(grid.querySelector(".dg-selection-count").hidden).toBe(true);
});

test("floating customer actions keep their DOM and hide when known selection becomes empty", async () => {
    const grid = await open();
    const bar = grid.querySelector(".dg-bulk-actions");
    const button = bar.querySelector("button");
    expect(bar.hidden).toBe(true);
    grid.selectRow(grid.rows[0]);
    expect(bar.hidden).toBe(false);
    grid.clearSelection();
    expect(bar.hidden).toBe(true);
    grid.selectAllMatching();
    expect(bar.hidden).toBe(false);
    for (const row of grid.dataSource.rows) grid.deselectRow(row);
    expect(bar.hidden).toBe(true);
    expect(bar.querySelector("button")).toBe(button);
    expect(grid.querySelectorAll(".dg-bulk-actions").length).toBe(1);
});

test("a pending page does not advertise the previous rows as the selected current page", async () => {
    const grid = await open();
    let finish;
    grid.dataSource.load = () =>
        new Promise((resolve) => {
            finish = resolve;
        });
    const loading = grid.setQuery({ page: 2 });
    grid.selectAll();
    expect(find("[data-select-matching]").hidden).toBe(true);
    expect(find("[data-selection-scope]").textContent).toBe("");
    finish({ rows: [{ id: "new-page", name: "New page" }], total: 64 });
    await loading;
    expect(find("[data-select-matching]").hidden).toBe(true);
    grid.selectAll();
    expect(find("[data-select-matching]").hidden).toBe(false);
});

test("View settings compose explicit visibility, density and bars without changing query or selection", async () => {
    const grid = await open();
    grid.selectRow(grid.rows[0]);
    const query = grid.query;
    const selection = grid.getSelectionState();
    const email = find('[data-field="email"]');
    expect(email.checked).toBe(false);
    email.checked = true;
    change(email);
    expect(grid.getCol("email").hidden).toBe(false);
    grid.hideColumn("email");
    expect(email.checked).toBe(false);
    for (const value of ["compact", "comfortable", "default"]) {
        find("[data-density]").value = value;
        change(find("[data-density]"));
        expect(grid.getAttribute("density")).toBe(value);
    }
    for (const checked of [false, true]) {
        find("[data-bars]").checked = checked;
        change(find("[data-bars]"));
        expect(root.classList.contains("customers-no-bars")).toBe(!checked);
    }
    expect(grid.query).toEqual(query);
    expect(grid.getSelectionState()).toEqual(selection);
});

test("name and native disclosure open the same read-only sheet without a recursive name button", async () => {
    const grid = await open();
    grid.selectRow(grid.rows[0]);
    const selection = grid.getSelectionState();
    const name = grid.rows[0].name;
    grid.querySelector(".customer-name").click();
    let dialog = grid.querySelector("dialog[open]");
    expect(dialog.textContent).toContain(name);
    expect(dialog.querySelector(".customer-name")).toBeNull();
    expect(dialog.querySelector(".customer-health-track")).toBeNull();
    grid.getPlugin("RowDetails").collapse(String(grid.rows[0].id));
    grid.querySelector(".dg-row-details-toggle-control").click();
    dialog = grid.querySelector("dialog[open]");
    expect(dialog.textContent).toContain(name);
    expect(grid.getSelectionState()).toEqual(selection);
});

test("customer record navigation stays on the loaded page and preserves selection", async () => {
    const grid = await open();
    grid.selectRow(grid.rows[0]);
    const selected = grid.getSelectionState();
    let queryChanges = 0;
    grid.addEventListener("querychange", () => queryChanges++);
    grid.querySelector(".customer-name").click();
    const previous = () => grid.querySelector('[data-record-step="-1"]');
    const next = () => grid.querySelector('[data-record-step="1"]');
    const position = () => grid.querySelector("[data-record-position]").textContent;
    expect(position()).toBe("1 of 10 on this page");
    expect(previous().disabled).toBe(true);
    for (let i = 1; i < 10; i++) {
        next().click();
        expect(position()).toBe(`${i + 1} of 10 on this page`);
        expect(grid.getPlugin("RowDetails").isExpanded(String(grid.rows[i].id))).toBe(true);
    }
    expect(next().disabled).toBe(true);
    next().click();
    expect(position()).toBe("10 of 10 on this page");
    previous().click();
    expect(position()).toBe("9 of 10 on this page");
    expect(grid.page).toBe(1);
    expect(queryChanges).toBe(0);
    expect(grid.getSelectionState()).toEqual(selected);
    expect(grid.querySelectorAll("dialog[open]").length).toBe(1);
});

test("changing records or query invalidates detached navigation callbacks", async () => {
    const grid = await open();
    grid.querySelector(".customer-name").click();
    const oldNext = grid.querySelector('[data-record-step="1"]');
    oldNext.click();
    grid.querySelector('[data-record-step="-1"]').click();
    oldNext.click();
    expect(grid.querySelector("[data-record-position]").textContent).toBe("1 of 10 on this page");
    for (const query of [
        { page: 2 },
        { sort: [{ field: "name", direction: "desc" }] },
        { filters: { status: { operator: "eq", value: "trial" } } },
    ]) {
        await grid.setQuery(query);
        expect(grid.querySelector("dialog[open]")).toBeNull();
        oldNext.click();
        expect(grid.querySelector("dialog[open]")).toBeNull();
        grid.querySelector(".customer-name").click();
        expect(grid.querySelector("[data-record-position]").textContent).toBe("1 of 10 on this page");
    }
    await grid.refresh();
    expect(grid.querySelector("dialog[open]")).toBeNull();
});

test("progressive record navigation describes loaded rows without loading another chunk", async () => {
    const grid = await open();
    let loads = 0;
    grid.setAttribute("pager", "more");
    grid.dataSource = {
        async load(query) {
            loads++;
            return { rows: [{ id: `loaded-${query.page}`, name: `Loaded ${query.page}` }], total: null, hasMore: true };
        },
    };
    await grid.refresh();
    grid.querySelector(".customer-name").click();
    expect(grid.querySelector("[data-record-position]").textContent).toBe("1 of 1 loaded results");
    expect(grid.querySelector('[data-record-step="1"]').disabled).toBe(true);
    const before = loads;
    grid.querySelector('[data-record-step="1"]').click();
    expect(loads).toBe(before);
    await grid.loadMore();
    expect(grid.querySelector("dialog[open]")).toBeNull();
    grid.querySelector(".customer-name").click();
    grid.querySelector('[data-record-step="1"]').click();
    expect(grid.querySelector("[data-record-position]").textContent).toBe("2 of 2 loaded results");
    expect(loads).toBe(before + 1);
});
