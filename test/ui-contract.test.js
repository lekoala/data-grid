import { expect, test } from "bun:test";
import DataGrid from "../data-grid.js";
import { ArrayDataSource } from "../src/data-source.js";
import RowActions from "../src/plugins/row-actions.js";
import SelectableRows from "../src/plugins/selectable-rows.js";
import { change } from "./helpers.js";

const tick = () => new Promise((resolve) => setTimeout(resolve, 0));

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

test("no ARIA grid roles or row/col indices remain", async () => {
    const inst = await makeReadyGrid(
        {
            columns: [{ field: "name", title: "Name" }],
            sortable: true,
            filterable: true,
            selectable: true,
        },
        [{ name: "a" }, { name: "b" }],
    );

    const roles = inst.querySelectorAll(
        '[role="grid"], [role="row"], [role="rowgroup"], [role="gridcell"], [role="columnheader"]',
    );
    expect(roles).toHaveLength(0);

    const indices = inst.querySelectorAll("[aria-rowindex], [aria-colindex], [aria-rowcount], [aria-colcount]");
    expect(indices).toHaveLength(0);
    document.body.removeChild(inst);
});

test("structural th/td/tr are not tabbable", async () => {
    const inst = await makeReadyGrid({ columns: [{ field: "name", title: "Name" }] }, [{ name: "a" }]);

    expect(inst.querySelectorAll("th[tabindex], td[tabindex], tr[tabindex]")).toHaveLength(0);
    document.body.removeChild(inst);
});

test("the core does not render an optional context-menu shell", async () => {
    const inst = await makeReadyGrid({ columns: [{ field: "name" }] }, []);

    expect(inst.querySelector(".dg-menu")).toBeNull();
    document.body.removeChild(inst);
});

test("sortable headers use a native button and only the sorted column carries aria-sort", async () => {
    const inst = await makeReadyGrid(
        {
            columns: [
                { field: "name", title: "Name" },
                { field: "age", title: "Age" },
            ],
            sortable: true,
        },
        [
            { name: "a", age: 1 },
            { name: "b", age: 2 },
        ],
    );

    const sortable = inst.querySelectorAll("thead tr.dg-head-columns th.dg-sortable");
    expect(sortable).toHaveLength(2);
    for (const th of sortable) {
        expect(th.querySelector("button[type=button]")).toBeTruthy();
    }
    expect(inst.querySelectorAll("thead tr.dg-head-columns th[aria-sort]")).toHaveLength(0);

    sortable[0].querySelector("button").click();
    const sorted = inst.querySelectorAll("thead tr.dg-head-columns th[aria-sort]");
    expect(sorted).toHaveLength(1);
    expect(sorted[0].getAttribute("data-sort")).toBe("asc");
    document.body.removeChild(inst);
});

test("data-loading reflects while loading and is removed after", async () => {
    let resolveLoad;
    const inst = new DataGrid({
        columns: [{ field: "name" }],
        dataSource: {
            load: () =>
                new Promise((resolve) => {
                    resolveLoad = resolve;
                }),
        },
    });
    document.body.appendChild(inst);
    await tick();
    await tick();
    await tick();
    expect(inst.hasAttribute("data-loading")).toBe(true);

    resolveLoad({ rows: [], total: 0, meta: {} });
    await tick();
    await tick();
    await tick();
    expect(inst.hasAttribute("data-loading")).toBe(false);
    document.body.removeChild(inst);
});

test("data-error is set on load failure without implying data-empty", async () => {
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

    expect(inst.hasAttribute("data-error")).toBe(true);
    expect(inst.hasAttribute("data-loading")).toBe(false);
    expect(inst.hasAttribute("data-empty")).toBe(false);
    expect(inst.tbody.getAttribute("data-empty-message")).toBeTruthy();
    document.body.removeChild(inst);
});

test("data-empty reflects the presence of rows", async () => {
    const empty = await makeReadyGrid({ columns: [{ field: "name" }] }, []);
    expect(empty.hasAttribute("data-empty")).toBe(true);

    const filled = await makeReadyGrid({ columns: [{ field: "name" }] }, [{ name: "a" }]);
    expect(filled.hasAttribute("data-empty")).toBe(false);
    document.body.removeChild(empty);
    document.body.removeChild(filled);
});

test("tr[data-selected] and button[data-action] follow the UI contract", async () => {
    const inst = await makeReadyGrid(
        {
            columns: [{ field: "name", title: "Name" }],
            selectable: true,
            actions: [{ name: "edit", title: "Edit" }],
        },
        [{ id: 1, name: "a" }],
        { SelectableRows, RowActions },
    );

    const input = inst.querySelector('tbody td[data-column-id="$selection"] input');
    input.checked = true;
    change(input);
    expect(inst.querySelector("tbody tr").hasAttribute("data-selected")).toBe(true);

    const actionButton = inst.querySelector('tbody td[data-column-id="$actions"] button[data-action]');
    expect(actionButton.getAttribute("data-action")).toBe("edit");
    document.body.removeChild(inst);
});
