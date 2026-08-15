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
                noSort: true,
                title: "",
                renderCell: (td, ctx) => {
                    td.textContent = `x:${ctx.row.name}`;
                },
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
