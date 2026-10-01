import { expect, test } from "bun:test";
import DataGrid from "../data-grid.js";
import { ArrayDataSource } from "../src/data-source.js";
import ResponsiveGrid from "../src/plugins/responsive-grid.js";

const ROWS = [{ id: 1, a: "a", b: "b", c: "c" }];

async function makeReadyGrid(opts = {}, rows = ROWS) {
    DataGrid.unregisterPlugins();
    const inst = new DataGrid({ ...opts, dataSource: new ArrayDataSource(rows) });
    document.body.appendChild(inst);
    await new Promise((resolve) => {
        inst.addEventListener("connected", resolve, { once: true });
        setTimeout(resolve, 2000);
    });
    return inst;
}

function stubWidths(inst, widths) {
    for (const [id, width] of Object.entries(widths)) {
        const th = inst.querySelector(`thead th[data-column-id="${id}"]`);
        Object.defineProperty(th, "offsetWidth", { configurable: true, value: width });
    }
    inst.syncFrozenColumns();
}

function header(inst, id) {
    return inst.querySelector(`thead th[data-column-id="${id}"]`);
}

test("end columns stack from the right and mark the leftmost edge", async () => {
    const inst = await makeReadyGrid({
        columns: [
            { field: "a", title: "A", width: 200 },
            { field: "b", title: "B", width: 100, frozen: "end" },
            { field: "c", title: "C", width: 80, frozen: "end" },
        ],
    });
    stubWidths(inst, { b: 100, c: 80 });

    expect(header(inst, "b").dataset.frozen).toBe("end");
    expect(header(inst, "c").dataset.frozen).toBe("end");
    expect(header(inst, "a").dataset.frozen).toBeUndefined();
    expect(header(inst, "c").style.getPropertyValue("--dg-frozen-offset")).toBe("0px");
    expect(header(inst, "b").style.getPropertyValue("--dg-frozen-offset")).toBe("80px");
    // Only the boundary of the frozen block draws a divider.
    expect(header(inst, "b").hasAttribute("data-frozen-edge")).toBe(true);
    expect(header(inst, "c").hasAttribute("data-frozen-edge")).toBe(false);
    expect(inst.scrollEl.style.getPropertyValue("--dg-frozen-end-width")).toBe("180px");
    expect(inst.scrollEl.style.getPropertyValue("--dg-frozen-start-width")).toBe("0px");
    document.body.removeChild(inst);
});

test("start and end groups resolve independently", async () => {
    const inst = await makeReadyGrid({
        columns: [
            { field: "a", title: "A", width: 50, frozen: "start" },
            { field: "b", title: "B", width: 200 },
            { field: "c", title: "C", width: 70, frozen: "end" },
        ],
    });
    stubWidths(inst, { a: 50, c: 70 });

    expect(header(inst, "a").style.getPropertyValue("--dg-frozen-offset")).toBe("0px");
    expect(header(inst, "a").hasAttribute("data-frozen-edge")).toBe(true);
    expect(header(inst, "c").style.getPropertyValue("--dg-frozen-offset")).toBe("0px");
    expect(header(inst, "c").hasAttribute("data-frozen-edge")).toBe(true);
    expect(inst.scrollEl.style.getPropertyValue("--dg-frozen-start-width")).toBe("50px");
    expect(inst.scrollEl.style.getPropertyValue("--dg-frozen-end-width")).toBe("70px");
    document.body.removeChild(inst);
});

test("a hidden end column leaves the group and moves the edge", async () => {
    const inst = await makeReadyGrid({
        columns: [
            { field: "a", title: "A", width: 200 },
            { field: "b", title: "B", width: 100, frozen: "end" },
            { field: "c", title: "C", width: 80, frozen: "end" },
        ],
    });
    stubWidths(inst, { b: 100, c: 80 });
    expect(header(inst, "b").hasAttribute("data-frozen-edge")).toBe(true);

    inst.hideColumn("b");
    inst.syncFrozenColumns();

    expect(header(inst, "c").hasAttribute("data-frozen-edge")).toBe(true);
    expect(inst.scrollEl.style.getPropertyValue("--dg-frozen-end-width")).toBe("80px");
    document.body.removeChild(inst);
});

test("a grid without frozen columns marks no edge", async () => {
    const inst = await makeReadyGrid({
        columns: [
            { field: "a", title: "A", width: 100 },
            { field: "b", title: "B", width: 100 },
        ],
    });
    inst.syncFrozenColumns();

    expect(inst.querySelectorAll("[data-frozen-edge]").length).toBe(0);
    expect(inst.scrollEl.style.getPropertyValue("--dg-frozen-end-width")).toBe("0px");
    document.body.removeChild(inst);
});

test("a frozen end column is never hidden by responsive", async () => {
    DataGrid.unregisterPlugins();
    DataGrid.registerPlugins({ ResponsiveGrid });
    const inst = new DataGrid({
        columns: [
            { field: "a", title: "A", width: 100 },
            { field: "b", title: "B", width: 100 },
            { field: "c", title: "C", width: 100, frozen: "end" },
        ],
        responsive: true,
        dataSource: new ArrayDataSource([{ a: 1, b: 2, c: 3 }]),
    });
    document.body.appendChild(inst);
    await new Promise((resolve) => {
        inst.addEventListener("connected", resolve, { once: true });
        setTimeout(resolve, 2000);
    });

    inst.getPlugin("ResponsiveGrid").resize(50);
    const hidden = inst.options.columns.filter((column) => column.responsiveHidden).map((column) => column.field);
    expect(hidden).not.toContain("c");
    document.body.removeChild(inst);
});

test("a frozen end declarative column is parsed and rendered", async () => {
    DataGrid.unregisterPlugins();
    const inst = new DataGrid();
    inst.innerHTML = `<table><thead><tr><th data-field="name" data-frozen="end">Name</th></tr></thead><tbody></tbody></table>`;
    document.body.appendChild(inst);
    await new Promise((resolve) => {
        inst.addEventListener("connected", resolve, { once: true });
        setTimeout(resolve, 2000);
    });

    expect(inst.options.columns[0].frozen).toBe("end");
    expect(inst.querySelector('th[data-column-id="name"]').dataset.frozen).toBe("end");
    document.body.removeChild(inst);
});
