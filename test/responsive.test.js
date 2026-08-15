import { expect, test } from "bun:test";
import DataGrid from "../data-grid.js";
import { ArrayDataSource } from "../src/data-source.js";
import ResponsiveGrid from "../src/plugins/responsive-grid.js";
import SelectableRows from "../src/plugins/selectable-rows.js";

const ROWS = [{ a: 1, b: 2, c: 3, d: 4 }];

const COLS = [
    { field: "a", title: "A", width: 100 },
    { field: "b", title: "B", width: 100 },
    { field: "c", title: "C", width: 100 },
    { field: "d", title: "D", width: 100 },
];

async function makeReadyGrid(opts = {}, pluginSet = { ResponsiveGrid }) {
    DataGrid.registerPlugins(pluginSet);
    const options = { ...opts, responsive: true, dataSource: new ArrayDataSource(ROWS) };
    const inst = new DataGrid(options);
    document.body.appendChild(inst);
    await new Promise((resolve) => {
        inst.addEventListener("connected", resolve, { once: true });
        setTimeout(resolve, 2000);
    });
    return inst;
}

function forceResize(inst, size) {
    const plugin = inst.plugins.ResponsiveGrid;
    // Release the post-render observer block so tests can drive consecutive cycles.
    if (plugin.unblockTimeout) {
        clearTimeout(plugin.unblockTimeout);
    }
    plugin.observerBlocked = false;
    plugin._lastEntry = { contentBoxSize: [{ inlineSize: size }] };
    plugin.resize();
    return plugin;
}

function hiddenFields(inst) {
    return inst.options.columns.filter((c) => c.responsiveHidden).map((c) => c.field);
}

test("responsive hides columns until the grid fits", async () => {
    const inst = await makeReadyGrid({ columns: COLS });
    forceResize(inst, 300);
    expect(hiddenFields(inst)).toEqual(["c", "d"]);
    forceResize(inst, 200);
    expect(hiddenFields(inst)).toEqual(["b", "c", "d"]);
    document.body.removeChild(inst);
});

test("responsive restores columns when space comes back", async () => {
    const inst = await makeReadyGrid({ columns: COLS });
    forceResize(inst, 200);
    expect(hiddenFields(inst)).toEqual(["b", "c", "d"]);
    forceResize(inst, 1000);
    expect(hiddenFields(inst)).toEqual([]);
    document.body.removeChild(inst);
});

test("a responsive:0 column is never hidden", async () => {
    const cols = COLS.map((c) => ({ ...c }));
    cols[0].responsive = 0;
    const inst = await makeReadyGrid({ columns: cols });
    forceResize(inst, 50);
    expect(hiddenFields(inst)).toEqual(["b", "c", "d"]);
    const a = inst.options.columns.find((c) => c.field === "a");
    expect(a.responsiveHidden).toBe(false);
    document.body.removeChild(inst);
});

test("higher priority values are hidden first", async () => {
    const cols = [
        { field: "a", title: "A", width: 100, responsive: 1 },
        { field: "b", title: "B", width: 100, responsive: 2 },
        { field: "c", title: "C", width: 100, responsive: 3 },
    ];
    const inst = await makeReadyGrid({ columns: cols });
    forceResize(inst, 250);
    expect(hiddenFields(inst)).toEqual(["c"]);
    forceResize(inst, 1000);
    expect(hiddenFields(inst)).toEqual([]);
    document.body.removeChild(inst);
});

test("a single render per changed cycle", async () => {
    const inst = await makeReadyGrid({ columns: COLS });
    let calls = 0;
    const orig = inst._syncColumnVisibility.bind(inst);
    inst._syncColumnVisibility = () => {
        calls++;
        orig();
    };
    // No change -> no sync
    forceResize(inst, 1000);
    expect(calls).toBe(0);
    // Change -> exactly one sync
    forceResize(inst, 100);
    expect(calls).toBe(1);
    document.body.removeChild(inst);
});

test("responsive adaptation does not emit columnVisibility", async () => {
    const inst = await makeReadyGrid({ columns: COLS });
    let events = 0;
    inst.addEventListener("columnVisibility", () => {
        events++;
    });
    forceResize(inst, 100);
    expect(hiddenFields(inst).length).toBeGreaterThan(0);
    forceResize(inst, 1000);
    expect(hiddenFields(inst)).toEqual([]);
    expect(events).toBe(0);
    document.body.removeChild(inst);
});

test("a manually hidden column stays hidden after shrink/grow", async () => {
    const cols = COLS.map((c) => ({ ...c }));
    cols[1].hidden = true;
    const inst = await makeReadyGrid({ columns: cols });
    forceResize(inst, 100);
    const b = inst.options.columns.find((c) => c.field === "b");
    expect(b.hidden).toBe(true);
    expect(b.responsiveHidden).toBe(false);
    forceResize(inst, 1000);
    expect(hiddenFields(inst)).toEqual([]);
    expect(inst.options.columns.find((c) => c.field === "b").hidden).toBe(true);
    document.body.removeChild(inst);
});

test("fixed virtual columns consume width", async () => {
    const inst = await makeReadyGrid({ columns: COLS }, { ResponsiveGrid, SelectableRows });
    // Selection column (40px) counts against the available width
    forceResize(inst, 300);
    expect(hiddenFields(inst)).toEqual(["c", "d"]);
    document.body.removeChild(inst);
});

test("responsive works without a footer", async () => {
    const inst = await makeReadyGrid({ columns: COLS });
    inst.querySelector("tfoot")?.remove();
    expect(() => forceResize(inst, 100)).not.toThrow();
    expect(hiddenFields(inst)).toEqual(["b", "c", "d"]);
    document.body.removeChild(inst);
});

test("hidden columns are reflected on header and body cells", async () => {
    const inst = await makeReadyGrid({ columns: COLS });
    forceResize(inst, 100);
    const th = inst.querySelector('thead tr.dg-head-columns th[field="d"]');
    const td = inst.querySelector('tbody td[data-column-id="d"]');
    expect(th.hasAttribute("hidden")).toBe(true);
    expect(td.hasAttribute("hidden")).toBe(true);
    forceResize(inst, 1000);
    expect(th.hasAttribute("hidden")).toBe(false);
    expect(td.hasAttribute("hidden")).toBe(false);
    document.body.removeChild(inst);
});

test("the responsive toggle column always exists and toggles visibility", async () => {
    const inst = await makeReadyGrid({ columns: COLS });
    const th = inst.querySelector('thead tr.dg-head-columns th[data-column-id="$responsive"]');
    expect(th).toBeTruthy();
    expect(th.hasAttribute("hidden")).toBe(true);
    forceResize(inst, 100);
    expect(th.hasAttribute("hidden")).toBe(false);
    forceResize(inst, 1000);
    expect(th.hasAttribute("hidden")).toBe(true);
    document.body.removeChild(inst);
});
