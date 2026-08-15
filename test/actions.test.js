import { expect, test } from "bun:test";
import DataGrid from "../data-grid.js";
import { ArrayDataSource } from "../src/data-source.js";
import RowActions from "../src/plugins/row-actions.js";

globalThis.confirm = () => true;

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

test("renderCell returns a string -> textContent", async () => {
    const inst = await makeReadyGrid({ columns: [{ field: "name", renderCell: ({ value }) => `Hello ${value}` }] }, [
        { name: "a" },
    ]);
    expect(inst.querySelector("tbody td").textContent).toBe("Hello a");
    document.body.removeChild(inst);
});

test("renderCell returns a Node -> append", async () => {
    const inst = await makeReadyGrid(
        {
            columns: [
                {
                    field: "name",
                    renderCell: ({ value }) => {
                        const b = document.createElement("b");
                        b.textContent = value;
                        return b;
                    },
                },
            ],
        },
        [{ name: "a" }],
    );
    const td = inst.querySelector("tbody td");
    expect(td.querySelector("b")?.textContent).toBe("a");
    document.body.removeChild(inst);
});

test("renderCell returns { html } -> innerHTML", async () => {
    const inst = await makeReadyGrid({ columns: [{ field: "name", renderCell: () => ({ html: "<i>x</i>" }) }] }, [
        { name: "a" },
    ]);
    expect(inst.querySelector("tbody td i")?.textContent).toBe("x");
    document.body.removeChild(inst);
});

test("renderCell returning undefined leaves an empty cell", async () => {
    const inst = await makeReadyGrid({ columns: [{ field: "name", renderCell: () => undefined }] }, [{ name: "a" }]);
    expect(inst.querySelector("tbody td").textContent).toBe("");
    document.body.removeChild(inst);
});

test("actions expose data-action and data-intent", async () => {
    const inst = await makeReadyGrid(
        {
            columns: [{ field: "name" }],
            actions: [
                { name: "edit", label: "Edit" },
                { name: "delete", label: "Delete", intent: "danger" },
            ],
        },
        [{ name: "a" }],
        { RowActions },
    );
    const cell = inst.querySelector('tbody td[data-column-id="$actions"]');
    const buttons = cell.querySelectorAll("button[data-action]");
    expect(buttons).toHaveLength(2);
    expect(buttons[0].textContent).toBe("Edit");
    expect(buttons[0].dataset.action).toBe("edit");
    expect(buttons[1].dataset.intent).toBe("danger");
    expect(buttons[1].classList.contains("dg-intent-danger")).toBe(true);
    document.body.removeChild(inst);
});

test("action class is applied and label names a custom-rendered button", async () => {
    const inst = await makeReadyGrid(
        {
            columns: [{ field: "name" }],
            actions: [{ name: "edit", label: "Edit", class: "is-danger", render: () => ({ html: "<i>e</i>" }) }],
        },
        [{ id: 1, name: "a" }],
        { RowActions },
    );
    const button = inst.querySelector('tbody td[data-column-id="$actions"] button[data-action]');
    expect(button.classList.contains("is-danger")).toBe(true);
    expect(button.querySelector("i")?.textContent).toBe("e");
    expect(button.getAttribute("aria-label")).toBe("Edit");
    document.body.removeChild(inst);
});

test("a renderer returning its own button keeps its semantics", async () => {
    const inst = await makeReadyGrid(
        {
            columns: [{ field: "name" }],
            actions: [
                {
                    name: "edit",
                    label: "Edit",
                    render: () => {
                        const b = document.createElement("button");
                        b.type = "button";
                        b.textContent = "custom";
                        return b;
                    },
                },
            ],
        },
        [{ id: 1, name: "a" }],
        { RowActions },
    );
    const button = inst.querySelector('tbody td[data-column-id="$actions"] button[data-action]');
    expect(button.textContent).toBe("custom");
    expect(button.getAttribute("aria-label")).toBeNull();
    expect(button.dataset.action).toBe("edit");
    document.body.removeChild(inst);
});

test("visible and disabled are evaluated per row", async () => {
    const inst = await makeReadyGrid(
        {
            columns: [{ field: "name" }],
            actions: [
                { name: "even", label: "Even", visible: (row) => row.id % 2 === 0 },
                { name: "guarded", label: "Guarded", disabled: (row) => row.id === 1 },
            ],
        },
        [
            { id: 1, name: "a" },
            { id: 2, name: "b" },
        ],
        { RowActions },
    );
    const rows = inst.querySelectorAll("tbody tr");
    const first = rows[0].querySelector('td[data-column-id="$actions"]');
    expect(first.querySelector('button[data-action="even"]')).toBeFalsy();
    expect(first.querySelector('button[data-action="guarded"]').disabled).toBe(true);
    const second = rows[1].querySelector('td[data-column-id="$actions"]');
    expect(second.querySelector('button[data-action="even"]')).toBeTruthy();
    expect(second.querySelector('button[data-action="guarded"]').disabled).toBe(false);
    document.body.removeChild(inst);
});

test("href renders an <a> and supports functions", async () => {
    const inst = await makeReadyGrid(
        {
            columns: [{ field: "name" }],
            actions: [{ name: "edit", label: "Edit", href: (row) => `/users/${row.id}` }],
        },
        [{ id: 7, name: "a" }],
        { RowActions },
    );
    const link = inst.querySelector('tbody td[data-column-id="$actions"] a[data-action="edit"]');
    expect(link.getAttribute("href")).toBe("/users/7");
    document.body.removeChild(inst);
});

test("render (per action) and actionRenderer (global) replace the button content", async () => {
    const inst = await makeReadyGrid(
        {
            columns: [{ field: "name" }],
            actionRenderer: ({ action }) => `*${action.name}`,
            actions: [{ name: "a" }, { name: "b", render: () => document.createTextNode("custom") }],
        },
        [{ name: "x" }],
        { RowActions },
    );
    const buttons = inst.querySelectorAll('tbody td[data-column-id="$actions"] button[data-action]');
    expect(buttons[0].textContent).toBe("*a");
    expect(buttons[1].textContent).toBe("custom");
    document.body.removeChild(inst);
});

test("clicking an action dispatches the action event", async () => {
    const inst = await makeReadyGrid(
        {
            columns: [{ field: "name" }],
            actions: [{ name: "delete", label: "Delete" }],
        },
        [{ name: "a" }],
        { RowActions },
    );
    let detail = null;
    inst.addEventListener("action", (ev) => {
        detail = ev.detail;
    });
    inst.querySelector('tbody button[data-action="delete"]').click();
    expect(detail.action).toBe("delete");
    expect(detail.data.name).toBe("a");
    document.body.removeChild(inst);
});

test("default action makes the row clickable", async () => {
    const inst = await makeReadyGrid(
        {
            columns: [{ field: "name" }],
            actions: [{ name: "view", label: "View", default: true }],
        },
        [{ name: "a" }],
        { RowActions },
    );
    let detail = null;
    inst.addEventListener("action", (ev) => {
        detail = ev.detail;
    });
    const tr = inst.querySelector("tbody tr");
    expect(tr.classList.contains("dg-actionable")).toBe(true);
    tr.click();
    expect(detail.action).toBe("view");
    document.body.removeChild(inst);
});

test("more than two actions collapse into a popover menu", async () => {
    const inst = await makeReadyGrid(
        {
            columns: [{ field: "name" }],
            actions: [
                { name: "one", label: "One" },
                { name: "two", label: "Two" },
                { name: "three", label: "Three" },
            ],
        },
        [{ name: "a" }],
        { RowActions },
    );
    const cell = inst.tbody.querySelector('td[data-column-id="$actions"]');
    expect(cell.classList.contains("dg-actions-more")).toBe(true);
    expect(cell.querySelectorAll("button[data-action]").length).toBe(3);

    const toggle = cell.querySelector("button.dg-actions-toggle");
    toggle.click();
    const menu = inst.querySelector(".dg-actions-menu");
    expect(menu.classList.contains("dg-actions-open")).toBe(true);
    expect(toggle.getAttribute("aria-expanded")).toBe("true");
    const items = menu.querySelectorAll("button[data-action]");
    expect(items.length).toBe(3);
    // The menu shows the label next to the (icon-only) custom content
    expect(Array.from(items).map((b) => b.textContent)).toEqual(["One", "Two", "Three"]);

    // Selecting an action dispatches it and closes the menu
    let detail = null;
    inst.addEventListener("action", (ev) => {
        detail = ev.detail;
    });
    menu.querySelector('button[data-action="two"]').click();
    expect(detail.action).toBe("two");
    expect(menu.classList.contains("dg-actions-open")).toBe(false);
    expect(toggle.getAttribute("aria-expanded")).toBe("false");
    document.body.removeChild(inst);
});

test("icon-only render keeps its label visible in the menu", async () => {
    const inst = await makeReadyGrid(
        {
            columns: [{ field: "name" }],
            actions: [
                { name: "edit", label: "Edit", render: () => ({ html: "<i class='x'></i>" }) },
                { name: "delete", label: "Delete", render: () => ({ html: "<i class='y'></i>" }) },
            ],
        },
        [{ name: "a" }],
        { RowActions },
    );
    const toggle = inst.tbody.querySelector('td[data-column-id="$actions"] button.dg-actions-toggle');
    toggle.click();
    const menu = inst.querySelector(".dg-actions-menu");
    const items = menu.querySelectorAll("button[data-action]");
    expect(items.length).toBe(2);
    for (const item of items) {
        expect(item.querySelector("i")).toBeTruthy();
        expect(item.querySelector(".dg-action-label")?.textContent).toBeTruthy();
    }
    expect(Array.from(items).map((b) => b.querySelector(".dg-action-label")?.textContent)).toEqual(["Edit", "Delete"]);
    document.body.removeChild(inst);
});

test("Escape closes the actions popover", async () => {
    const inst = await makeReadyGrid(
        {
            columns: [{ field: "name" }],
            actions: [
                { name: "one", label: "One" },
                { name: "two", label: "Two" },
                { name: "three", label: "Three" },
            ],
        },
        [{ name: "a" }],
        { RowActions },
    );
    const toggle = inst.tbody.querySelector('td[data-column-id="$actions"] button.dg-actions-toggle');
    toggle.click();
    const menu = inst.querySelector(".dg-actions-menu");
    expect(menu.classList.contains("dg-actions-open")).toBe(true);

    document.dispatchEvent(new KeyboardEvent("keydown", { key: "Escape" }));
    expect(menu.classList.contains("dg-actions-open")).toBe(false);
    expect(toggle.getAttribute("aria-expanded")).toBe("false");
    document.body.removeChild(inst);
});
