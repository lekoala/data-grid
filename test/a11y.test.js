import { expect, test } from "bun:test";
import DataGrid from "../data-grid.js";
import { ArrayDataSource } from "../src/data-source.js";
import BulkActions from "../src/plugins/bulk-actions.js";
import EditableColumn from "../src/plugins/editable-column.js";
import RowActions from "../src/plugins/row-actions.js";
import SelectableRows from "../src/plugins/selectable-rows.js";
import { change } from "./helpers.js";

async function makeReadyGrid(opts = {}, data = null, pluginSet = {}) {
    DataGrid.registerPlugins(pluginSet);
    const options = { ...opts };
    if (data !== null) {
        options.dataSource = new ArrayDataSource(data);
    }
    const inst = new DataGrid(options);
    document.body.appendChild(inst);
    await new Promise((resolve) => {
        inst.addEventListener("connected", resolve, { once: true });
        setTimeout(resolve, 2000);
    });
    return inst;
}

test("a persistent role=status live region announces loading / results / empty / error", async () => {
    const status = () => inst.querySelector(".dg-status");

    let resolveLoad;
    const inst = new DataGrid({
        columns: [{ field: "name" }],
        dataSource: {
            load: (query) =>
                new Promise((resolve) => {
                    resolveLoad = () => resolve({ rows: [{ name: "a" }], total: 1, meta: {} });
                }),
        },
    });
    document.body.appendChild(inst);
    await new Promise((resolve) => {
        inst.addEventListener("connected", resolve, { once: true });
        setTimeout(resolve, 2000);
    });

    expect(status()).toBeTruthy();
    expect(status().getAttribute("role")).toBe("status");
    expect(status().getAttribute("aria-atomic")).toBe("true");
    expect(status().textContent).toBe("Loading…");

    resolveLoad();
    await new Promise((resolve) => setTimeout(resolve, 0));
    expect(status().textContent).toBe("1 items");
    document.body.removeChild(inst);
});

test("empty results render a real row (no CSS-generated content)", async () => {
    const inst = await makeReadyGrid({ columns: [{ field: "name" }] }, []);

    const row = inst.tbody.querySelector("tr.dg-empty-row");
    expect(row).toBeTruthy();
    const td = row.querySelector("td");
    expect(td.colSpan).toBe(1);
    expect(td.textContent).toBe(inst.labels.noData);
    expect(inst.hasAttribute("data-empty")).toBe(true);
    document.body.removeChild(inst);
});

test("load failure renders a real error row without implying data-empty", async () => {
    const inst = new DataGrid({
        columns: [{ field: "name" }],
        dataSource: {
            load: async () => {
                throw new Error("boom");
            },
        },
    });
    document.body.appendChild(inst);
    await new Promise((resolve) => {
        inst.addEventListener("connected", resolve, { once: true });
        setTimeout(resolve, 2000);
    });

    const row = inst.tbody.querySelector("tr.dg-error-row");
    expect(row).toBeTruthy();
    expect(row.querySelector("td").textContent).toBe("boom");
    expect(inst.hasAttribute("data-error")).toBe(true);
    expect(inst.hasAttribute("data-empty")).toBe(false);
    expect(inst.querySelector(".dg-status").textContent).toBe("boom");
    document.body.removeChild(inst);
});

test("empty/error messages are real DOM text, not CSS pseudo-content", async () => {
    const css = await Bun.file("css/_core.css").text();
    expect(css).not.toContain("attr(data-empty-message)");
    expect(css).not.toMatch(/tbody:before/);
});

test("selection controls carry accessible names from rowLabel with fallbacks", async () => {
    const byKey = await makeReadyGrid(
        {
            columns: [{ field: "name", title: "Name" }],
            selectable: true,
        },
        [
            { id: 7, name: "Alice" },
            { id: 8, name: "Bob" },
        ],
        { SelectableRows },
    );
    const inputs = byKey.tbody.querySelectorAll('input[type="checkbox"]');
    expect(inputs).toHaveLength(2);
    expect(inputs[0].getAttribute("aria-label")).toBe("Select 7");
    expect(inputs[1].getAttribute("aria-label")).toBe("Select 8");
    document.body.removeChild(byKey);

    const byField = await makeReadyGrid(
        {
            columns: [{ field: "name", title: "Name" }],
            selectable: true,
            rowLabel: "name",
        },
        [
            { id: 7, name: "Alice" },
            { id: 8, name: "Bob" },
        ],
        { SelectableRows },
    );
    const fieldInputs = byField.tbody.querySelectorAll('input[type="checkbox"]');
    expect(fieldInputs[0].getAttribute("aria-label")).toBe("Select Alice");
    expect(fieldInputs[1].getAttribute("aria-label")).toBe("Select Bob");
    document.body.removeChild(byField);

    const byFn = await makeReadyGrid(
        {
            columns: [{ field: "name", title: "Name" }],
            selectable: true,
            rowLabel: (row) => `user-${row.id}`,
        },
        [{ id: 7, name: "Alice" }],
        { SelectableRows },
    );
    expect(byFn.tbody.querySelector('input[type="checkbox"]').getAttribute("aria-label")).toBe("Select user-7");
    document.body.removeChild(byFn);

    const byIndex = await makeReadyGrid(
        {
            columns: [{ field: "name", title: "Name" }],
            selectable: true,
            rowKey: null,
        },
        [{ name: "Alice" }, { name: "Bob" }],
        { SelectableRows },
    );
    const indexInputs = byIndex.tbody.querySelectorAll('input[type="checkbox"]');
    expect(indexInputs[0].getAttribute("aria-label")).toBe("Select 0");
    expect(indexInputs[1].getAttribute("aria-label")).toBe("Select 1");
    document.body.removeChild(byIndex);
});

test("the select-all checkbox carries a stable accessible name", async () => {
    const inst = await makeReadyGrid(
        {
            columns: [{ field: "name", title: "Name" }],
            selectable: true,
        },
        [{ id: 7, name: "Alice" }],
        { SelectableRows },
    );

    const selectAll = inst.querySelector("thead input.dg-select-all");
    expect(selectAll.getAttribute("aria-label")).toBe("Select all rows");
    document.body.removeChild(inst);
});

test("icon-only custom content keeps label as the accessible name", async () => {
    const inst = await makeReadyGrid(
        {
            columns: [{ field: "name", title: "Name" }],
            actions: [
                { name: "edit", label: "Edit", render: () => ({ html: "<i class='dg-edit-icon'></i>" }) },
                { name: "delete", render: () => ({ html: "<i class='dg-delete-icon'></i>" }) },
            ],
        },
        [{ id: 7, name: "Alice" }],
        { RowActions },
    );

    const buttons = inst.tbody.querySelectorAll("td[data-column-id='$actions'] button[data-action]");
    expect(buttons).toHaveLength(2);
    expect(buttons[0].getAttribute("aria-label")).toBe("Edit");
    expect(buttons[1].getAttribute("aria-label")).toBe("delete");
    document.body.removeChild(inst);
});

test("the row actions toggle has an accessible name and aria-expanded state", async () => {
    const inst = await makeReadyGrid(
        {
            columns: [{ field: "name", title: "Name" }],
            actions: [{ name: "edit", label: "Edit" }],
        },
        [{ id: 7, name: "Alice" }],
        { RowActions },
    );

    const toggle = inst.tbody.querySelector("td[data-column-id='$actions'] button.dg-actions-toggle");
    expect(toggle.getAttribute("aria-label")).toBe("Toggle row actions");
    expect(toggle.getAttribute("aria-expanded")).toBe("false");
    toggle.click();
    expect(toggle.getAttribute("aria-expanded")).toBe("true");
    toggle.click();
    expect(toggle.getAttribute("aria-expanded")).toBe("false");
    document.body.removeChild(inst);
});

test("inline edit inputs carry the column title as accessible name", async () => {
    const inst = await makeReadyGrid(
        {
            columns: [{ field: "name", title: "Name", editable: true }],
        },
        [{ id: 7, name: "Alice" }],
        { EditableColumn },
    );

    const input = inst.querySelector("tbody td input.dg-editable");
    expect(input.getAttribute("aria-label")).toBe("Name");
    document.body.removeChild(inst);
});

test("the pagination group exposes the page context and the selection badge is a live status", async () => {
    const inst = await makeReadyGrid(
        {
            columns: [{ field: "name", title: "Name" }],
            selectable: true,
            bulkActions: [{ name: "archive", label: "Archive" }],
        },
        [{ id: 7, name: "Alice" }],
        { SelectableRows, BulkActions },
    );

    const pagination = inst.querySelector(".dg-pagination");
    expect(pagination.getAttribute("role")).toBe("group");
    expect(pagination.getAttribute("aria-label")).toBe("Page 1 of 1");

    const count = inst.querySelector(".dg-selection-count");
    expect(count.getAttribute("role")).toBe("status");
    expect(count.getAttribute("aria-live")).toBe("polite");
    expect(count.getAttribute("aria-atomic")).toBe("true");
    expect(count.hidden).toBe(true);

    const input = inst.tbody.querySelector('td[data-column-id="$selection"] input');
    input.checked = true;
    change(input);
    expect(count.hidden).toBe(false);
    expect(count.querySelector('[aria-hidden="true"]').textContent).toBe("1");
    expect(count.querySelector(".dg-visually-hidden").textContent).toBe("1 selected");
    document.body.removeChild(inst);
});

test("options.caption creates a real table caption", async () => {
    const inst = await makeReadyGrid({ columns: [{ field: "name" }], caption: "Users" }, [{ name: "a" }]);

    const caption = inst.table.querySelector("caption");
    expect(caption).toBeTruthy();
    expect(caption.textContent).toBe("Users");
    expect(inst.table.hasAttribute("aria-label")).toBe(false);
    expect(inst.table.hasAttribute("aria-labelledby")).toBe(false);
    document.body.removeChild(inst);
});

test("table inherits the host aria-labelledby / aria-label when there is no caption", async () => {
    const labelledby = document.createElement("h1");
    labelledby.id = "users-title";
    labelledby.textContent = "Users";
    document.body.appendChild(labelledby);

    const inst = new DataGrid({ columns: [{ field: "name" }], dataSource: new ArrayDataSource([{ name: "a" }]) });
    inst.setAttribute("aria-labelledby", "users-title");
    document.body.appendChild(inst);
    await new Promise((resolve) => {
        inst.addEventListener("connected", resolve, { once: true });
        setTimeout(resolve, 2000);
    });
    expect(inst.table.getAttribute("aria-labelledby")).toBe("users-title");
    document.body.removeChild(inst);
    document.body.removeChild(labelledby);

    const aria = new DataGrid({ columns: [{ field: "name" }], dataSource: new ArrayDataSource([{ name: "a" }]) });
    aria.setAttribute("aria-label", "Users");
    document.body.appendChild(aria);
    await new Promise((resolve) => {
        aria.addEventListener("connected", resolve, { once: true });
        setTimeout(resolve, 2000);
    });
    expect(aria.table.getAttribute("aria-label")).toBe("Users");
    expect(aria.table.hasAttribute("aria-labelledby")).toBe(false);
    document.body.removeChild(aria);
});
