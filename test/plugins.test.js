import { expect, test } from "bun:test";
import DataGrid from "../data-grid.js";
import { ArrayDataSource } from "../src/data-source.js";
import RowActions from "../src/plugins/row-actions.js";
import SelectableRows from "../src/plugins/selectable-rows.js";

const tick = () => new Promise((resolve) => setTimeout(resolve, 0));

async function makeReadyGrid(pluginSet, opts = {}, rows = [{ name: "Alice" }]) {
    DataGrid.registerPlugins(pluginSet);
    const options = { ...opts, dataSource: new ArrayDataSource(rows) };
    const inst = new DataGrid(options);
    document.body.appendChild(inst);
    await new Promise((resolve) => {
        inst.addEventListener("connected", resolve, { once: true });
        setTimeout(resolve, 2000);
    });
    return inst;
}

test("extendColumns injects a virtual column rendered by renderCell", async () => {
    const hookOrder = [];
    class TestPlugin {
        constructor(grid) {
            this.grid = grid;
        }
        extendColumns(columns) {
            hookOrder.push("extend");
            columns.push({
                id: "$test",
                virtual: true,
                position: "end",
                sortable: false,
                title: "",
                renderCell: (ctx) => `x:${ctx.row.name}`,
            });
        }
        beforeRender() {
            hookOrder.push("before");
        }
        afterRender(context) {
            hookOrder.push(`after:${context}`);
        }
    }

    const inst = await makeReadyGrid({ TestPlugin }, { columns: [{ field: "name", title: "Name" }] });

    // The virtual column is rendered at the end
    const td = inst.querySelector('tbody td[data-column-id="$test"]');
    expect(td).toBeTruthy();
    expect(td.textContent).toBe("x:Alice");

    // Header and body cells carry data-column-id
    expect(inst.querySelector('thead th[data-column-id="$test"]')).toBeTruthy();
    expect(inst.querySelector('thead th[data-column-id="name"]')).toBeTruthy();
    expect(inst.querySelector('tbody td[data-column-id="name"]')).toBeTruthy();

    // Hook order: extend runs before render, afterRender fires for body and table
    expect(hookOrder.indexOf("extend")).toBeGreaterThanOrEqual(0);
    expect(hookOrder.indexOf("before")).toBeLessThan(hookOrder.indexOf("after:body"));
    expect(hookOrder).toContain("after:body");
    expect(hookOrder).toContain("after:table");
    document.body.removeChild(inst);
});

test("SelectableRows and RowActions inject start/end columns", async () => {
    const inst = await makeReadyGrid(
        { SelectableRows, RowActions },
        {
            columns: [{ field: "name", title: "Name" }],
            selectable: true,
            actions: [{ name: "edit", title: "Edit" }],
        },
    );

    const headerThs = inst.querySelectorAll("thead tr.dg-head-columns th");
    expect(headerThs[0].getAttribute("data-column-id")).toBe("$selection");
    expect(headerThs[headerThs.length - 1].getAttribute("data-column-id")).toBe("$actions");

    // A checkbox exists in the selection body cell
    const selTd = inst.querySelector('tbody td[data-column-id="$selection"]');
    expect(selTd.querySelector("input[type=checkbox]")).toBeTruthy();

    // The actions cell renders a button
    const actionsTd = inst.querySelector('tbody td[data-column-id="$actions"]');
    expect(actionsTd).toBeTruthy();
    expect(actionsTd.querySelector("button")).toBeTruthy();
    document.body.removeChild(inst);
});

test("afterRender body context is used by FixedHeight to add the fake row", async () => {
    const { default: FixedHeight } = await import("../src/plugins/fixed-height.js");
    const inst = await makeReadyGrid({ FixedHeight }, { columns: [{ field: "name", title: "Name" }] });

    await tick();
    expect(inst.querySelector("tbody tr.dg-fake-row")).toBeTruthy();
    document.body.removeChild(inst);
});

test("plugins are disconnected once", async () => {
    let connectedCount = 0;
    let disconnectedCount = 0;
    class LifecyclePlugin {
        constructor(grid) {
            this.grid = grid;
        }
        connected() {
            connectedCount++;
        }
        disconnected() {
            disconnectedCount++;
        }
    }

    const inst = await makeReadyGrid({ LifecyclePlugin }, { columns: [{ field: "name", title: "Name" }] });
    expect(connectedCount).toBe(1);

    document.body.removeChild(inst);
    await tick();
    await tick();
    expect(disconnectedCount).toBe(1);
});

test("hideColumn and showColumn sync header, body and footer", async () => {
    const inst = await makeReadyGrid(
        {},
        {
            columns: [
                { field: "name", title: "Name" },
                { field: "age", title: "Age" },
            ],
        },
        [{ name: "a", age: 1 }],
    );

    inst.hideColumn("age");
    expect(inst.querySelector('thead th[data-column-id="age"]').hasAttribute("hidden")).toBe(true);
    expect(inst.querySelector('tbody td[data-column-id="age"]').hasAttribute("hidden")).toBe(true);
    expect(inst.tfoot?.querySelector("td").colSpan).toBe(1);

    inst.showColumn("age");
    expect(inst.querySelector('thead th[data-column-id="age"]').hasAttribute("hidden")).toBe(false);
    expect(inst.querySelector('tbody td[data-column-id="age"]').hasAttribute("hidden")).toBe(false);
    expect(inst.tfoot?.querySelector("td").colSpan).toBe(2);
    document.body.removeChild(inst);
});

test("reorder keeps the $selection column pinned and fixed width", async () => {
    const { default: DraggableHeaders } = await import("../src/plugins/draggable-headers.js");
    const inst = await makeReadyGrid(
        { SelectableRows, DraggableHeaders },
        {
            columns: [
                { field: "first_name", title: "First" },
                { field: "last_name", title: "Last" },
            ],
            selectable: true,
            reorder: true,
        },
        [{ first_name: "Ada", last_name: "Lovelace" }],
    );

    const headerIds = () =>
        Array.from(inst.querySelectorAll("thead tr.dg-head-columns th")).map((th) => th.getAttribute("data-column-id"));
    const firstBodyRowIds = () =>
        Array.from(inst.querySelectorAll("tbody tr td[data-column-id]")).map((td) => td.getAttribute("data-column-id"));

    // $selection is first, carries its own fixed width and is not draggable
    expect(headerIds()[0]).toBe("$selection");
    expect(inst.querySelector('thead th[data-column-id="$selection"]').getAttribute("width")).toBe("40");
    expect(firstBodyRowIds()[0]).toBe("$selection");
    expect(inst.querySelector('tbody tr td[data-column-id="$selection"] input')).toBeTruthy();
    expect(inst.querySelector('thead th[data-column-id="$selection"]').hasAttribute("draggable")).toBe(false);

    const reorder = (draggedId, targetId) => {
        const target = inst.querySelector(`thead th[data-column-id="${targetId}"]`);
        const event = new window.Event("drop", { bubbles: true, cancelable: true });
        Object.defineProperty(event, "dataTransfer", { value: { getData: () => draggedId } });
        target.dispatchEvent(event);
    };

    reorder("first_name", "last_name");
    expect(headerIds()[0]).toBe("$selection");
    expect(inst.querySelector('thead th[data-column-id="$selection"]').getAttribute("width")).toBe("40");
    expect(firstBodyRowIds()[0]).toBe("$selection");
    expect(inst.querySelector('thead th[data-column-id="$selection"]').hasAttribute("draggable")).toBe(false);

    // Multiple reorders still keep it pinned
    reorder("last_name", "first_name");
    reorder("first_name", "last_name");
    expect(headerIds()[0]).toBe("$selection");
    expect(firstBodyRowIds()[0]).toBe("$selection");
    document.body.removeChild(inst);
});

test("reorder pins both $selection and $actions at the extremes", async () => {
    const { default: DraggableHeaders } = await import("../src/plugins/draggable-headers.js");
    const inst = await makeReadyGrid(
        { SelectableRows, RowActions, DraggableHeaders },
        {
            columns: [
                { field: "first_name", title: "First" },
                { field: "last_name", title: "Last" },
            ],
            selectable: true,
            reorder: true,
            actions: [{ name: "edit", title: "Edit" }],
        },
        [{ first_name: "Ada", last_name: "Lovelace" }],
    );

    const headerIds = () =>
        Array.from(inst.querySelectorAll("thead tr.dg-head-columns th")).map((th) => th.getAttribute("data-column-id"));

    const reorder = (draggedId, targetId) => {
        const target = inst.querySelector(`thead th[data-column-id="${targetId}"]`);
        const event = new window.Event("drop", { bubbles: true, cancelable: true });
        Object.defineProperty(event, "dataTransfer", { value: { getData: () => draggedId } });
        target.dispatchEvent(event);
    };

    expect(headerIds()[0]).toBe("$selection");
    expect(headerIds()[headerIds().length - 1]).toBe("$actions");
    expect(inst.querySelector('thead th[data-column-id="$selection"]').getAttribute("width")).toBe("40");

    reorder("first_name", "last_name");
    expect(headerIds()[0]).toBe("$selection");
    expect(headerIds()[headerIds().length - 1]).toBe("$actions");
    document.body.removeChild(inst);
});
