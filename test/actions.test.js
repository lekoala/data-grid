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
    expect(detail.name).toBe("delete");
    expect(detail.action.name).toBe("delete");
    expect(detail.row.name).toBe("a");
    expect(detail.rowKey).toBe("0");
    expect(detail.trigger).toBe(inst.querySelector('tbody button[data-action="delete"]'));
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
    expect(tr.classList.contains("dg-clickable-row")).toBe(true);
    tr.click();
    expect(detail.name).toBe("view");
    document.body.removeChild(inst);
});

test("more than two actions use one shared native popover", async () => {
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
    expect(menu.getAttribute("popover")).toBe("auto");
    expect(toggle.getAttribute("popovertarget")).toBe(menu.id);
    expect(toggle.hasAttribute("aria-expanded")).toBe(false);
    const items = menu.querySelectorAll("button[data-action]");
    expect(items.length).toBe(3);
    // The menu shows the label next to the (icon-only) custom content
    expect(Array.from(items).map((b) => b.textContent)).toEqual(["One", "Two", "Three"]);

    // Selecting an action dispatches it and asks the native popover to close.
    let detail = null;
    let closes = 0;
    menu.hidePopover = () => closes++;
    inst.addEventListener("action", (ev) => {
        detail = ev.detail;
    });
    menu.querySelector('button[data-action="two"]').click();
    expect(detail.name).toBe("two");
    expect(closes).toBe(1);
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

test("confirm supports a message string and a row resolver", async () => {
    const calls = [];
    globalThis.confirm = (message) => {
        calls.push(message);
        return true;
    };
    const inst = await makeReadyGrid(
        {
            columns: [{ field: "name" }],
            actions: [
                { name: "one", confirm: "Delete this?" },
                { name: "two", confirm: (row) => `Delete ${row.name}?` },
            ],
        },
        [{ name: "a" }],
        { RowActions },
    );
    const buttons = inst.querySelectorAll('tbody td[data-column-id="$actions"] button[data-action]');
    buttons[0].click();
    buttons[1].click();
    expect(calls).toEqual(["Delete this?", "Delete a?"]);
    document.body.removeChild(inst);
    globalThis.confirm = () => true;
});

test("a disabled action really blocks, including on links", async () => {
    const inst = await makeReadyGrid(
        {
            columns: [{ field: "name" }],
            actions: [{ name: "view", label: "View", href: "/u/1", disabled: true }],
        },
        [{ id: 1, name: "a" }],
        { RowActions },
    );
    const link = inst.querySelector('tbody td[data-column-id="$actions"] a[data-action="view"]');
    expect(link.getAttribute("aria-disabled")).toBe("true");
    expect(link.classList.contains("dg-disabled")).toBe(true);

    let detail = null;
    inst.addEventListener("action", (ev) => {
        detail = ev.detail;
    });
    link.click();
    expect(detail).toBeNull();
    document.body.removeChild(inst);
});

test("visible, disabled and href receive the action context", async () => {
    let seen;
    const inst = await makeReadyGrid(
        {
            columns: [{ field: "name" }],
            actions: [
                {
                    name: "ctx",
                    label: "Ctx",
                    visible: (row, ctx) => {
                        seen = ctx;
                        return Boolean(ctx.grid);
                    },
                    href: (row, ctx) => `/u/${ctx.rowKey}`,
                },
            ],
        },
        [{ id: 5, name: "a" }],
        { RowActions },
    );
    expect(seen.grid).toBe(inst);
    expect(seen.action.name).toBe("ctx");
    expect(seen.rowKey).toBe("5");
    expect(inst.querySelector('a[data-action="ctx"]').getAttribute("href")).toBe("/u/5");
    document.body.removeChild(inst);
});

test("the default action ignores interactive elements inside the row", async () => {
    const inst = await makeReadyGrid(
        {
            columns: [
                {
                    field: "name",
                    renderCell: () => Object.assign(document.createElement("a"), { href: "/pdf", textContent: "PDF" }),
                },
            ],
            actions: [{ name: "view", label: "View", default: true }],
        },
        [{ name: "a" }],
        { RowActions },
    );
    let detail = null;
    inst.addEventListener("action", (ev) => {
        detail = ev.detail;
    });

    inst.querySelector("tbody a").click();
    expect(detail).toBeNull();

    inst.querySelector("tbody tr").click();
    expect(detail.name).toBe("view");
    document.body.removeChild(inst);
});

test("updateRow mutates the current view without reloading", async () => {
    let loads = 0;
    const ds = {
        load: async () => {
            loads++;
            return { rows: [{ id: 1, name: "a" }], total: 1, meta: {} };
        },
    };
    const inst = new DataGrid({ dataSource: ds, columns: [{ field: "name" }] });
    document.body.appendChild(inst);
    await new Promise((resolve) => {
        inst.addEventListener("connected", resolve, { once: true });
        setTimeout(resolve, 2000);
    });

    expect(loads).toBe(1);
    const ok = inst.updateRow("1", { name: "b" });
    expect(ok).toBe(true);
    expect(loads).toBe(1);
    expect(inst.rows[0].name).toBe("b");
    expect(inst.querySelector("tbody td").textContent).toBe("b");

    expect(inst.updateRow("nope", { name: "x" })).toBe(false);
    document.body.removeChild(inst);
});

test("updateRow works on an ArrayDataSource and keeps the source in sync", async () => {
    const inst = await makeReadyGrid(
        { columns: [{ field: "name" }] },
        [
            { id: 1, name: "a" },
            { id: 2, name: "b" },
        ],
        { RowActions },
    );
    expect(inst.updateRow("2", { name: "renamed" })).toBe(true);
    expect(inst.dataSource.rows[1].name).toBe("renamed");
    expect(inst.rows[1].name).toBe("renamed");
    document.body.removeChild(inst);
});

test("removeRow mutates a local dataset and returns false for remote sources", async () => {
    const inst = await makeReadyGrid({ columns: [{ field: "name" }] }, [
        { id: 1, name: "a" },
        { id: 2, name: "b" },
    ]);
    expect(inst.removeRow("1")).toBe(true);
    expect(inst.dataSource.rows).toEqual([{ id: 2, name: "b" }]);
    await new Promise((resolve) => setTimeout(resolve, 10));
    expect(inst.rows).toHaveLength(1);
    expect(inst.removeRow("missing")).toBe(false);

    let loads = 0;
    const remote = {
        load: async () => {
            loads++;
            return { rows: [{ id: 1, name: "a" }], total: 1, meta: {} };
        },
    };
    const inst2 = new DataGrid({ dataSource: remote, columns: [{ field: "name" }] });
    document.body.appendChild(inst2);
    await new Promise((resolve) => {
        inst2.addEventListener("connected", resolve, { once: true });
        setTimeout(resolve, 2000);
    });
    expect(inst2.removeRow("1")).toBe(false);
    expect(loads).toBe(1);
    document.body.removeChild(inst2);
    document.body.removeChild(inst);
});

test("row.$actions is authoritative and resolves references and overrides", async () => {
    const inst = await makeReadyGrid(
        {
            columns: [{ field: "name" }],
            actions: [
                { name: "view", label: "View", href: "/{id}" },
                { name: "delete", label: "Delete" },
            ],
        },
        [
            { id: 1, name: "a", $actions: ["view"] },
            { id: 2, name: "b", $actions: ["delete", { name: "view", label: "Custom View" }] },
            { id: 3, name: "c" },
        ],
        { RowActions },
    );
    const cells = inst.querySelectorAll('tbody td[data-column-id="$actions"]');

    const row1 = cells[0];
    expect(row1.querySelectorAll("[data-action]")).toHaveLength(1);
    expect(row1.querySelector('a[data-action="view"]').getAttribute("href")).toBe("/1");
    expect(row1.querySelector('a[data-action="view"]').textContent).toBe("View");
    expect(row1.querySelector('[data-action="delete"]')).toBeNull();

    const row2 = cells[1];
    expect(row2.querySelectorAll("[data-action]")).toHaveLength(2);
    expect(row2.querySelector('a[data-action="view"]').getAttribute("href")).toBe("/2");
    expect(row2.querySelector('a[data-action="view"]').textContent).toBe("Custom View");
    expect(row2.querySelector('button[data-action="delete"]')).toBeTruthy();

    // A row without $actions falls back to the static list.
    const row3 = cells[2];
    expect(row3.querySelectorAll("[data-action]")).toHaveLength(2);
    document.body.removeChild(inst);
});

test("meta.actions provide server-driven definitions per load", async () => {
    const inst = await makeReadyGrid(
        {
            columns: [{ field: "name" }],
            actions: [{ name: "download", label: "Client Download" }],
        },
        [{ id: 1, name: "a", $actions: ["download"] }],
        { RowActions },
    );
    // No meta.actions: the client definition is used.
    expect(inst.querySelector('button[data-action="download"]').textContent).toBe("Client Download");

    inst.meta = {
        actions: {
            download: { label: "Server Download", intent: "primary" },
        },
    };
    inst.renderBody();
    const button = inst.querySelector('button[data-action="download"]');
    expect(button.textContent).toBe("Client Download"); // options.actions override meta
    expect(button.dataset.intent).toBe("primary");
    document.body.removeChild(inst);
});

test("multiple resolved default actions only fire the first one", async () => {
    const inst = await makeReadyGrid(
        {
            rowActions: true,
            columns: [{ field: "name" }],
        },
        [
            {
                id: 1,
                name: "a",
                $actions: [
                    { name: "first", default: true },
                    { name: "second", default: true },
                ],
            },
        ],
        { RowActions },
    );
    let count = 0;
    inst.addEventListener("action", () => count++);
    inst.querySelector("tbody tr").click();
    expect(count).toBe(1);
    document.body.removeChild(inst);
});

test("a row without actions renders an empty cell without the toggle", async () => {
    const inst = await makeReadyGrid(
        { rowActions: true, columns: [{ field: "name" }] },
        [
            { id: 1, name: "a", $actions: [] },
            { id: 2, name: "b", $actions: [{ name: "view" }] },
        ],
        { RowActions },
    );
    const cells = inst.querySelectorAll('tbody td[data-column-id="$actions"]');
    expect(cells[0].querySelector(".dg-actions-toggle")).toBeNull();
    expect(cells[0].querySelectorAll("[data-action]")).toHaveLength(0);
    expect(cells[1].querySelector(".dg-actions-toggle")).toBeTruthy();
    document.body.removeChild(inst);
});

test("the actions column aligns header, filter placeholder, and body to the inline end", async () => {
    const inst = await makeReadyGrid(
        {
            filterable: true,
            columns: [{ field: "name" }],
            actions: [{ name: "view", label: "View" }],
        },
        [{ name: "a" }],
        { RowActions },
    );

    const selector = '[data-column-id="$actions"]';
    expect(inst.querySelector(`thead tr.dg-head-columns ${selector}`).dataset.align).toBe("end");
    expect(inst.querySelector(`thead tr.dg-head-filters ${selector}`).dataset.align).toBe("end");
    expect(inst.querySelector(`tbody ${selector}`).dataset.align).toBe("end");
    expect(inst.querySelector(`thead tr.dg-head-columns ${selector}`).getAttribute("width")).toBe("80");
    document.body.removeChild(inst);
});

test("the actions column shares one mode across header and body", async () => {
    const inst = await makeReadyGrid(
        { rowActions: true, columns: [{ field: "name" }] },
        [
            {
                id: 1,
                name: "a",
                $actions: [
                    { name: "view", label: "View" },
                    { name: "delete", label: "Delete" },
                ],
            },
            { id: 2, name: "b", $actions: [{ name: "view", label: "View" }] },
        ],
        { RowActions },
    );

    // Two inline actions at most: the whole column becomes dg-actions-2, so the
    // header width matches the body cells instead of collapsing to ~48px.
    const headerTh = inst.querySelector('thead tr.dg-head-columns th[data-column-id="$actions"]');
    expect(headerTh.classList.contains("dg-actions-2")).toBe(true);
    expect(headerTh.classList.contains("dg-actions-more")).toBe(false);
    expect(headerTh.getAttribute("width")).toBe("148");
    expect(headerTh.dataset.minWidth).toBe("148");
    expect(headerTh.dataset.preferredWidth).toBe("148");
    const bodyCells = inst.querySelectorAll('tbody td[data-column-id="$actions"]');
    expect(bodyCells.length).toBeGreaterThan(0);
    for (const cell of bodyCells) {
        expect(cell.classList.contains("dg-actions-2")).toBe(true);
        expect(cell.classList.contains("dg-actions-more")).toBe(false);
    }
    document.body.removeChild(inst);
});

test("a row needing more than two inline actions collapses the whole column", async () => {
    const inst = await makeReadyGrid(
        { rowActions: true, columns: [{ field: "name" }] },
        [{ id: 1, name: "a", $actions: [{ name: "x" }, { name: "y" }, { name: "z" }] }],
        { RowActions },
    );

    const headerTh = inst.querySelector('thead tr.dg-head-columns th[data-column-id="$actions"]');
    expect(headerTh.classList.contains("dg-actions-more")).toBe(true);
    expect(headerTh.getAttribute("width")).toBe("48");
    expect(headerTh.dataset.minWidth).toBe("48");
    const bodyCells = inst.querySelectorAll('tbody td[data-column-id="$actions"]');
    for (const cell of bodyCells) {
        expect(cell.classList.contains("dg-actions-more")).toBe(true);
    }
    document.body.removeChild(inst);
});

test("actions stay inline when native floating UI is unavailable", async () => {
    const popoverDescriptor = Object.getOwnPropertyDescriptor(HTMLElement.prototype, "popover");
    delete HTMLElement.prototype.popover;
    try {
        const inst = await makeReadyGrid(
            {
                collapseActions: true,
                columns: [{ field: "name" }],
                actions: [{ name: "one" }, { name: "two" }, { name: "three" }],
            },
            [{ name: "a" }],
            { RowActions },
        );

        const cell = inst.tbody.querySelector('td[data-column-id="$actions"]');
        expect(cell.classList.contains("dg-actions-inline")).toBe(true);
        expect(cell.getAttribute("width")).toBe("216");
        expect(cell.querySelector(".dg-actions-toggle")).toBeNull();
        expect(cell.querySelectorAll("[data-action]")).toHaveLength(3);
        expect(inst.querySelector(".dg-actions-menu")).toBeNull();
        document.body.removeChild(inst);
    } finally {
        if (popoverDescriptor) {
            Object.defineProperty(HTMLElement.prototype, "popover", popoverDescriptor);
        }
    }
});
