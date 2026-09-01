import { expect, test } from "bun:test";
import DataGrid from "../data-grid.js";
import { ArrayDataSource } from "../src/data-source.js";
import RowActions from "../src/plugins/row-actions.js";
import SelectableRows from "../src/plugins/selectable-rows.js";

// Register exactly the plugins this file exercises.
DataGrid.unregisterPlugins();
DataGrid.registerPlugins({ RowActions, SelectableRows });

async function makeReadyGrid(opts = {}, data = null) {
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

function removeGrid(inst) {
    document.body.removeChild(inst);
}

test("row-click defaults to action and survives the attribute transformer", async () => {
    const inst = await makeReadyGrid({ columns: [{ field: "name" }] }, [{ id: 1, name: "a" }]);
    expect(inst.options.rowClick).toBe("action");

    inst.setAttribute("row-click", "");
    expect(inst.options.rowClick).toBe("action");

    inst.removeAttribute("row-click");
    expect(inst.options.rowClick).toBe("action");
    removeGrid(inst);
});

test('rowClick "select" toggles the selection and a second click deselects', async () => {
    const inst = await makeReadyGrid({ columns: [{ field: "name" }], selectable: true, rowClick: "select" }, [
        { id: 1, name: "a" },
        { id: 2, name: "b" },
    ]);

    const first = inst.querySelector("tbody tr");
    expect(first.classList.contains("dg-clickable-row")).toBe(true);

    first.click();
    expect(inst.isRowSelected(inst.rows[0], 0)).toBe(true);

    first.click();
    expect(inst.isRowSelected(inst.rows[0], 0)).toBe(false);
    removeGrid(inst);
});

test('rowClick "select" with singleSelect replaces the selection and allows toggling off', async () => {
    const inst = await makeReadyGrid({ columns: [{ field: "name" }], singleSelect: true, rowClick: "select" }, [
        { id: 1, name: "a" },
        { id: 2, name: "b" },
    ]);

    const rows = inst.querySelectorAll("tbody tr");
    rows[0].click();
    expect(inst.getSelectionState().ids.has("1")).toBe(true);

    rows[1].click();
    expect(inst.getSelectionState().ids.has("2")).toBe(true);
    expect(inst.getSelectionState().ids.has("1")).toBe(false);
    expect(inst.getSelectionState().ids.size).toBe(1);

    rows[1].click();
    expect(inst.getSelectionState().ids.size).toBe(0);
    removeGrid(inst);
});

test("clicking the selection checkbox never double-toggles the row", async () => {
    const inst = await makeReadyGrid({ columns: [{ field: "name" }], selectable: true, rowClick: "select" }, [
        { id: 1, name: "a" },
    ]);

    let rowClicks = 0;
    inst.addEventListener("rowClick", () => rowClicks++);

    const input = inst.querySelector('tbody td[data-column-id="$selection"] input');
    // A real user click on the control toggles the checkbox (change -> toggleRow).
    // The selection label stops propagation and the input is excluded, so the
    // delegated row handler must never run and never toggle the row a second time.
    input.click();
    expect(rowClicks).toBe(0);
    expect(inst.isRowSelected(inst.rows[0], 0)).toBe(true);

    input.click();
    expect(inst.isRowSelected(inst.rows[0], 0)).toBe(false);
    removeGrid(inst);
});

test('interactive elements inside a row never trigger rowClick "select"', async () => {
    const inst = await makeReadyGrid(
        {
            columns: [
                {
                    field: "name",
                    renderCell: () => Object.assign(document.createElement("a"), { href: "/pdf", textContent: "PDF" }),
                },
                {
                    field: "x",
                    renderCell: () => {
                        const button = document.createElement("button");
                        button.type = "button";
                        button.textContent = "go";
                        return button;
                    },
                },
                {
                    field: "y",
                    renderCell: () => {
                        const select = document.createElement("select");
                        const option = document.createElement("option");
                        option.textContent = "one";
                        select.appendChild(option);
                        return select;
                    },
                },
                {
                    field: "z",
                    renderCell: () => Object.assign(document.createElement("textarea"), { textContent: "text" }),
                },
            ],
            selectable: true,
            rowClick: "select",
        },
        [{ id: 1, name: "a", x: 1, y: 1, z: 1 }],
    );

    const tr = inst.querySelector("tbody tr");
    tr.querySelector("a").click();
    tr.querySelector("button").click();
    tr.querySelector("select").click();
    tr.querySelector("textarea").click();
    expect(inst.isRowSelected(inst.rows[0], 0)).toBe(false);

    tr.click();
    expect(inst.isRowSelected(inst.rows[0], 0)).toBe(true);
    removeGrid(inst);
});

test("[data-row-click-ignore] and [contenteditable] follow the exclusion rule", async () => {
    const inst = await makeReadyGrid(
        {
            columns: [
                {
                    field: "name",
                    renderCell: () => {
                        const span = document.createElement("span");
                        span.dataset.rowClickIgnore = "";
                        span.textContent = "ignored";
                        return span;
                    },
                },
                {
                    field: "x",
                    renderCell: () => {
                        const div = document.createElement("div");
                        div.contentEditable = "true";
                        div.textContent = "editable";
                        return div;
                    },
                },
                {
                    field: "y",
                    renderCell: () => {
                        const div = document.createElement("div");
                        div.contentEditable = "false";
                        div.textContent = "plain";
                        return div;
                    },
                },
            ],
            selectable: true,
            rowClick: "select",
        },
        [{ id: 1, name: "a", x: 1, y: 1 }],
    );

    const tr = inst.querySelector("tbody tr");
    // opt-out subtree and editable content are excluded
    tr.querySelector("[data-row-click-ignore]").click();
    tr.querySelector('[contenteditable="true"]').click();
    expect(inst.isRowSelected(inst.rows[0], 0)).toBe(false);

    // contenteditable="false" is deliberately NOT excluded: it still triggers
    tr.querySelector('[contenteditable="false"]').click();
    expect(inst.isRowSelected(inst.rows[0], 0)).toBe(true);
    removeGrid(inst);
});

test('rowClick "action" runs the rendered default action and adds dg-clickable-row', async () => {
    const inst = await makeReadyGrid(
        { columns: [{ field: "name" }], actions: [{ name: "view", label: "View", default: true }] },
        [{ id: 1, name: "a" }],
    );

    let detail = null;
    inst.addEventListener("action", (ev) => {
        detail = ev.detail;
    });

    const tr = inst.querySelector("tbody tr");
    expect(tr.classList.contains("dg-clickable-row")).toBe(true);
    expect(tr.querySelector("[data-dg-default-action]")?.dataset.action).toBe("view");

    tr.click();
    expect(detail.name).toBe("view");
    removeGrid(inst);
});

test("only the first visible default action fires", async () => {
    const inst = await makeReadyGrid(
        {
            columns: [{ field: "name" }],
            actions: [
                { name: "first", default: true },
                { name: "second", default: true },
            ],
        },
        [{ id: 1, name: "a" }],
    );

    let count = 0;
    inst.addEventListener("action", () => count++);
    inst.querySelector("tbody tr").click();
    expect(count).toBe(1);

    const marked = inst.querySelectorAll("[data-dg-default-action]");
    expect(marked).toHaveLength(1);
    expect(marked[0].dataset.action).toBe("first");
    removeGrid(inst);
});

test("an invisible default action makes the row inert and not clickable", async () => {
    const inst = await makeReadyGrid(
        {
            columns: [{ field: "name" }],
            actions: [{ name: "view", label: "View", default: true, visible: () => false }],
        },
        [{ id: 1, name: "a" }],
    );

    let count = 0;
    inst.addEventListener("action", () => count++);
    const tr = inst.querySelector("tbody tr");
    expect(tr.classList.contains("dg-clickable-row")).toBe(false);
    tr.click();
    expect(count).toBe(0);
    removeGrid(inst);
});

test("a disabled default action blocks the row click and is not presented as clickable", async () => {
    const inst = await makeReadyGrid(
        {
            columns: [{ field: "name" }],
            actions: [{ name: "view", label: "View", default: true, disabled: true }],
        },
        [{ id: 1, name: "a" }],
    );

    let count = 0;
    inst.addEventListener("action", () => count++);

    const tr = inst.querySelector("tbody tr");
    // The marker stays (activation stays uniform) but the cursor promise is dropped.
    expect(tr.querySelector("[data-dg-default-action]")).toBeTruthy();
    expect(tr.classList.contains("dg-clickable-row")).toBe(false);

    tr.click();
    expect(count).toBe(0);
    removeGrid(inst);
});

test('rowClick "select" without selectable fires the policy event but never toggles', async () => {
    const inst = await makeReadyGrid({ columns: [{ field: "name" }], rowClick: "select" }, [{ id: 1, name: "a" }]);

    let rowClicks = 0;
    inst.addEventListener("rowClick", () => rowClicks++);

    const tr = inst.querySelector("tbody tr");
    expect(tr.classList.contains("dg-clickable-row")).toBe(false);

    tr.click();
    expect(rowClicks).toBe(1);
    expect(inst.isRowSelected(inst.rows[0], 0)).toBe(false);
    removeGrid(inst);
});

test("a default action with href activates the rendered link on row click", async () => {
    const inst = await makeReadyGrid(
        {
            columns: [{ field: "name" }],
            actions: [{ name: "open", label: "Open", href: (row) => `/users/${row.id}`, default: true }],
        },
        [{ id: 7, name: "a" }],
    );

    let detail = null;
    inst.addEventListener("action", (ev) => {
        detail = ev.detail;
    });

    const tr = inst.querySelector("tbody tr");
    tr.click();
    expect(detail.name).toBe("open");
    const link = tr.querySelector('a[data-action="open"]');
    expect(detail.trigger).toBe(link);
    expect(link.getAttribute("href")).toBe("/users/7");
    removeGrid(inst);
});

test('rowClick "action" resolves the default per row via $actions', async () => {
    const inst = await makeReadyGrid({ rowActions: true, columns: [{ field: "name" }] }, [
        { id: 1, name: "a", $actions: [{ name: "resume", default: true }] },
        { id: 2, name: "b", $actions: [{ name: "open", default: true }] },
    ]);

    const names = [];
    inst.addEventListener("action", (ev) => {
        names.push(ev.detail.name);
    });

    const rows = inst.querySelectorAll("tbody tr");
    rows[0].click();
    rows[1].click();
    expect(names).toEqual(["resume", "open"]);
    removeGrid(inst);
});

test("the default action still works when the actions column is collapsed", async () => {
    const inst = await makeReadyGrid(
        {
            columns: [{ field: "name" }],
            actions: [
                { name: "one", label: "One" },
                { name: "two", label: "Two", default: true },
                { name: "three", label: "Three" },
            ],
        },
        [{ id: 1, name: "a" }],
    );

    let detail = null;
    inst.addEventListener("action", (ev) => {
        detail = ev.detail;
    });

    const tr = inst.querySelector("tbody tr");
    expect(tr.querySelector('[data-column-id="$actions"]').classList.contains("dg-actions-more")).toBe(true);
    tr.click();
    expect(detail.name).toBe("two");
    removeGrid(inst);
});

test('rowClick "none" is totally inert: no class, no action, no rowClick event', async () => {
    const inst = await makeReadyGrid(
        {
            columns: [{ field: "name" }],
            selectable: true,
            rowClick: "none",
            actions: [{ name: "view", label: "View", default: true }],
        },
        [{ id: 1, name: "a" }],
    );

    let actions = 0;
    let rowClicks = 0;
    inst.addEventListener("action", () => actions++);
    inst.addEventListener("rowClick", () => rowClicks++);

    const tr = inst.querySelector("tbody tr");
    expect(tr.classList.contains("dg-clickable-row")).toBe(false);

    tr.click();
    expect(actions).toBe(0);
    expect(rowClicks).toBe(0);
    expect(inst.isRowSelected(inst.rows[0], 0)).toBe(false);
    removeGrid(inst);
});

test("the cancelable rowClick event fires first and preventDefault vetoes the behavior", async () => {
    const inst = await makeReadyGrid({ columns: [{ field: "name" }], selectable: true, rowClick: "select" }, [
        { id: 1, name: "a", locked: true },
    ]);

    let detail = null;
    inst.addEventListener("rowClick", (ev) => {
        detail = ev.detail;
        if (ev.detail.row.locked) {
            ev.preventDefault();
        }
    });

    inst.querySelector("tbody tr").click();
    expect(detail).toBeTruthy();
    expect(detail.rowKey).toBe("1");
    expect(detail.rowIndex).toBe(0);
    expect(detail.row.name).toBe("a");
    expect(detail.originalEvent.type).toBe("click");
    expect(inst.isRowSelected(inst.rows[0], 0)).toBe(false);
    removeGrid(inst);
});

test("changing row-click at runtime re-wires behavior and classes without per-row listeners", async () => {
    const inst = await makeReadyGrid(
        {
            columns: [{ field: "name" }],
            selectable: true,
            actions: [{ name: "view", label: "View", default: true }],
        },
        [{ id: 1, name: "a" }],
    );

    // Default: action mode
    let detail = null;
    inst.addEventListener("action", (ev) => {
        detail = ev.detail;
    });
    const tr = inst.querySelector("tbody tr");
    expect(tr.classList.contains("dg-clickable-row")).toBe(true);
    tr.click();
    expect(detail.name).toBe("view");

    // none: no behavior, no class
    inst.setAttribute("row-click", "none");
    expect(inst.options.rowClick).toBe("none");
    const inertTr = inst.querySelector("tbody tr");
    expect(inertTr.classList.contains("dg-clickable-row")).toBe(false);
    detail = null;
    inertTr.click();
    expect(detail).toBeNull();
    expect(inst.isRowSelected(inst.rows[0], 0)).toBe(false);

    // select: class back, clicks toggle the selection
    inst.setAttribute("row-click", "select");
    const selectableTr = inst.querySelector("tbody tr");
    expect(selectableTr.classList.contains("dg-clickable-row")).toBe(true);
    selectableTr.click();
    expect(inst.isRowSelected(inst.rows[0], 0)).toBe(true);
    removeGrid(inst);
});

test("declarative single-select + row-click=select is functional", async () => {
    const inst = document.createElement("data-grid");
    inst.setAttribute("single-select", "");
    inst.setAttribute("row-click", "select");
    const table = document.createElement("table");
    table.innerHTML = `
        <thead><tr><th data-field="name">Name</th></tr></thead>
        <tbody>
            <tr data-row-key="1"><td>a</td></tr>
            <tr data-row-key="2"><td>b</td></tr>
        </tbody>
    `;
    inst.appendChild(table);
    document.body.appendChild(inst);
    await new Promise((resolve) => {
        inst.addEventListener("connected", resolve, { once: true });
        setTimeout(resolve, 2000);
    });

    expect(inst.options.singleSelect).toBe(true);
    expect(inst.options.selectable).toBe(true);
    expect(inst.options.rowClick).toBe("select");

    const rows = inst.querySelectorAll("tbody tr");
    expect(rows[0].classList.contains("dg-clickable-row")).toBe(true);
    rows[0].click();
    expect(inst.getSelectionState().ids.has("1")).toBe(true);
    rows[1].click();
    expect(inst.getSelectionState().ids.has("2")).toBe(true);
    expect(inst.getSelectionState().ids.has("1")).toBe(false);
    removeGrid(inst);
});
