import { expect, test } from "bun:test";
import DataGrid from "../data-grid.js";
import { ArrayDataSource } from "../src/data-source.js";
import ResponsiveGrid from "../src/plugins/responsive-grid.js";
import RowDetails from "../src/plugins/row-details.js";
import SelectableRows from "../src/plugins/selectable-rows.js";
import { change } from "./helpers.js";

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

test("responsive can be disabled and re-enabled at the same width", async () => {
    const inst = await makeReadyGrid({ columns: COLS });
    inst.setAttribute("responsive", "");
    const plugin = forceResize(inst, 200);
    expect(hiddenFields(inst)).toEqual(["b", "c", "d"]);

    inst.removeAttribute("responsive");
    expect(hiddenFields(inst)).toEqual([]);
    expect(inst.querySelector('thead th[data-column-id="$responsive"]')).toBeNull();
    expect(inst.querySelector("tbody tr.dg-responsive-child-row")).toBeNull();
    expect(Array.from(inst.querySelectorAll("tbody td[data-column-id]")).every((cell) => !cell.hidden)).toBe(true);
    expect(plugin._lastProcessedWidth).toBeNull();

    inst.setAttribute("responsive", "");
    expect(inst.querySelector('thead th[data-column-id="$responsive"]')).toBeTruthy();
    forceResize(inst, 200);
    expect(hiddenFields(inst)).toEqual(["b", "c", "d"]);
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

test("the responsive toggle keeps an empty filter cell", async () => {
    const inst = await makeReadyGrid({ columns: COLS, filterable: true });
    const th = inst.querySelector('thead tr.dg-head-filters th[data-column-id="$responsive"]');
    expect(th).toBeTruthy();
    expect(th.querySelector("input, select, button")).toBeNull();
    document.body.removeChild(inst);
});

test("responsiveStartOpen defaults to false", () => {
    expect(new DataGrid({}).options.responsiveStartOpen).toBe(false);
});

test("responsiveStartOpen: true auto-opens detail rows when columns are hidden", async () => {
    const inst = await makeReadyGrid({ columns: COLS, responsiveStartOpen: true });
    expect(inst.querySelectorAll("tbody tr.dg-responsive-child-row").length).toBe(0);

    forceResize(inst, 200);
    expect(hiddenFields(inst).length).toBeGreaterThan(0);
    expect(inst.querySelectorAll("tbody tr.dg-data-row").length).toBe(ROWS.length);
    expect(inst.querySelectorAll("tbody tr.dg-responsive-child-row").length).toBe(ROWS.length);
    document.body.removeChild(inst);
});

test("responsiveToggle: false + responsiveStartOpen shows details without a toggle column", async () => {
    const inst = await makeReadyGrid({ columns: COLS, responsiveStartOpen: true, responsiveToggle: false });
    expect(inst.querySelector('thead th[data-column-id="$responsive"]')).toBeNull();

    forceResize(inst, 200);
    expect(inst.querySelectorAll("tbody tr.dg-responsive-child-row").length).toBe(ROWS.length);
    expect(inst.querySelector('thead th[data-column-id="$responsive"]')).toBeNull();
    document.body.removeChild(inst);
});

test("an actively sorted column is never hidden", async () => {
    const inst = await makeReadyGrid({ columns: COLS, sortable: true });
    const b = inst.options.columns.find((c) => c.field === "b");
    await inst.sortAsc("b");
    forceResize(inst, 150);
    expect(b.responsiveHidden).toBe(false);
    expect(hiddenFields(inst)).not.toContain("b");
    document.body.removeChild(inst);
});

test("an actively filtered column is never hidden", async () => {
    const inst = await makeReadyGrid({ columns: COLS, filterable: true });
    const b = inst.options.columns.find((c) => c.field === "b");
    inst.setQuery({ filters: { b: { operator: "contains", value: "x" } } });
    forceResize(inst, 150);
    expect(b.responsiveHidden).toBe(false);
    expect(hiddenFields(inst)).not.toContain("b");
    document.body.removeChild(inst);
});

test("narrow -> wide -> narrow roundtrip keeps canonical order and no lost/duplicated cells", async () => {
    const inst = await makeReadyGrid({ columns: COLS, responsiveStartOpen: true, responsiveToggle: false });
    const canonical = () =>
        Array.from(inst.querySelectorAll("tbody tr.dg-data-row")).map((tr) => {
            const next = tr.nextElementSibling;
            const detail = next?.classList.contains("dg-responsive-child-row") ? next : null;
            const main = Array.from(tr.children).map((td) => td.dataset.columnId);
            const detailIds = detail
                ? Array.from(detail.querySelectorAll(".dg-responsive-hidden")).map((td) => td.dataset.columnId)
                : [];
            return [...main, ...detailIds];
        });

    forceResize(inst, 200);
    expect(hiddenFields(inst).length).toBeGreaterThan(0);
    expect(canonical()).toEqual([["a", "b", "c", "d"]]);

    forceResize(inst, 1000);
    expect(hiddenFields(inst)).toEqual([]);
    expect(inst.querySelectorAll("tbody tr.dg-responsive-child-row").length).toBe(0);
    expect(canonical()).toEqual([["a", "b", "c", "d"]]);

    forceResize(inst, 200);
    expect(hiddenFields(inst).length).toBeGreaterThan(0);
    expect(canonical()).toEqual([["a", "b", "c", "d"]]);
    expect(inst.querySelectorAll("tbody tr.dg-responsive-child-row").length).toBe(ROWS.length);
    document.body.removeChild(inst);
});

test("a user-collapsed row stays collapsed across responsive rebuilds", async () => {
    const inst = await makeReadyGrid({ columns: COLS, responsiveStartOpen: true });
    const plugin = inst.plugins.ResponsiveGrid;

    forceResize(inst, 200);
    const first = inst.querySelector("tbody tr.dg-data-row");
    expect(first.dataset.responsiveExpanded).toBe("true");

    // Simulate the user collapsing the first row
    plugin._setRowExpanded(first, false);
    expect(first.dataset.responsiveExpanded).toBe("false");

    forceResize(inst, 1000); // wide: details disappear
    forceResize(inst, 200); // narrow again: rebuild
    expect(first.dataset.responsiveExpanded).toBe("false");
    expect(first.classList.contains("dg-responsive-expanded")).toBe(false);
    // The other rows are still expanded
    expect(inst.querySelectorAll("tbody tr.dg-data-row.dg-responsive-expanded").length).toBe(ROWS.length - 1);
    document.body.removeChild(inst);
});

test("selection maps rows correctly when responsive child rows are present", async () => {
    const rows = [
        { id: 1, a: 1, b: 2, c: 3, d: 4 },
        { id: 2, a: 5, b: 6, c: 7, d: 8 },
    ];
    const inst = await makeReadyGrid(
        { columns: COLS, responsiveStartOpen: true, selectable: true },
        { ResponsiveGrid, SelectableRows },
    );
    inst.dataSource = new ArrayDataSource(rows);
    await inst.refresh();
    forceResize(inst, 200);
    expect(inst.querySelectorAll("tbody tr.dg-responsive-child-row").length).toBe(rows.length);

    const checkboxes = inst.querySelectorAll("tbody tr.dg-data-row .dg-selectable input");
    expect(checkboxes.length).toBe(rows.length);
    checkboxes[1].checked = true;
    change(checkboxes[1]);
    expect(Array.from(inst.getSelectionState().ids)).toEqual(["2"]);
    document.body.removeChild(inst);
});

test("start-open details are restored after a body re-render (filter/search)", async () => {
    const inst = await makeReadyGrid({ columns: COLS, responsiveStartOpen: true });
    forceResize(inst, 200);
    expect(inst.querySelectorAll("tbody tr.dg-responsive-child-row").length).toBe(ROWS.length);

    // A query change re-renders the tbody and drops detail rows
    await inst.refresh();
    // Start-open must be re-applied on the fresh rows
    expect(inst.querySelectorAll("tbody tr.dg-responsive-child-row").length).toBe(ROWS.length);
    const tr = inst.querySelector("tbody tr.dg-data-row");
    expect(tr.classList.contains("dg-responsive-expanded")).toBe(true);
    document.body.removeChild(inst);
});

test("responsive disclosure uses a named native button and controls its detail row", async () => {
    const inst = await makeReadyGrid({
        columns: [{ field: "name" }, { field: "email", responsiveHidden: true }],
        rowLabel: "name",
    });
    inst.dataSource = new ArrayDataSource([{ id: 1, name: "Alice", email: "alice@example.com" }]);
    await inst.refresh();
    const button = inst.querySelector("tbody .dg-responsive-toggle-control");
    expect(button.tagName).toBe("BUTTON");
    // Shared disclosure primitive: same compact control as the row details
    // toggle, and never the full-cell click target of the selection column.
    expect(button.classList.contains("dg-disclosure")).toBe(true);
    expect(button.classList.contains("dg-clickable-cell")).toBe(false);
    expect(button.closest("td").classList.contains("dg-disclosure-cell")).toBe(true);
    expect(inst.querySelector('thead th[data-column-id="$responsive"]').classList.contains("dg-disclosure-cell")).toBe(
        true,
    );
    expect(button.childElementCount).toBe(0);
    expect(button.getAttribute("aria-expanded")).toBe("false");
    expect(button.classList.contains("dg-responsive-toggle-control-open")).toBe(false);
    expect(button.getAttribute("aria-label")).toBe("Show additional columns for Alice");
    button.click();
    expect(button.getAttribute("aria-expanded")).toBe("true");
    expect(button.classList.contains("dg-responsive-toggle-control-open")).toBe(true);
    expect(button.getAttribute("aria-label")).toBe("Hide additional columns for Alice");
    expect(document.getElementById(button.getAttribute("aria-controls"))).toBeTruthy();
    document.body.removeChild(inst);
});

test("stacked responsive columns compose with RowDetails across resize and body renders", async () => {
    const inst = await makeReadyGrid(
        {
            columns: [
                { field: "id", width: 100, responsive: 0 },
                { field: "name", width: 100, responsive: 1 },
                { field: "email", width: 100, responsive: 2 },
            ],
            responsiveStartOpen: true,
            responsiveToggle: false,
            rowLabel: "name",
            rowDetails: ({ row }) => `Profile for ${row.name}`,
        },
        { ResponsiveGrid, SelectableRows, RowDetails },
    );
    inst.dataSource = new ArrayDataSource([{ id: 1, name: "Alice", email: "alice@example.com" }]);
    await inst.refresh();
    const details = inst.getPlugin("RowDetails");
    details.expand("1");

    const expectStructure = (responsive) => {
        const rows = Array.from(inst.querySelectorAll("tbody > tr"));
        expect(rows.map((row) => row.className)).toEqual(
            responsive
                ? ["dg-data-row dg-responsive-expanded", "dg-responsive-child-row", "dg-row-details-row"]
                : ["dg-data-row", "dg-row-details-row"],
        );
        expect(inst.querySelector(".dg-responsive-toggle-control")).toBeNull();
        expect(inst.querySelector(".dg-row-details-toggle-control")).not.toBeNull();
        for (const cell of inst.querySelectorAll("[data-dg-span-columns]")) {
            expect(cell.colSpan).toBe(inst.columnsLength(true));
        }
    };

    forceResize(inst, 160);
    expectStructure(true);

    forceResize(inst, 1000);
    expectStructure(false);

    forceResize(inst, 160);
    expectStructure(true);

    await inst.refresh();
    expectStructure(true);

    await inst.setQuery({ search: "Alice" });
    expectStructure(true);
    document.body.removeChild(inst);
});

test("an explicit responsiveToggle: false keeps the responsive section out of the shared control", async () => {
    const inst = await makeReadyGrid(
        {
            columns: [
                { field: "a", title: "A" },
                { field: "b", title: "B", responsiveHidden: true },
            ],
            responsiveToggle: false,
            responsiveStartOpen: true,
            rowDetails: ({ row }) => `Profile for ${row.a}`,
        },
        { ResponsiveGrid, RowDetails },
    );
    // Start-open exposes the hidden values inline, with no responsive control
    expect(inst.querySelector(".dg-responsive-toggle-control")).toBeNull();
    expect(inst.querySelector("tbody tr.dg-responsive-child-row")).not.toBeNull();

    const toggle = inst.querySelector("tbody .dg-row-details-toggle-control");
    toggle.click();
    toggle.click();

    // The author opted this section out of any toggle: it is not swept away by
    // the row details control the way an implicitly yielded one would be.
    expect(inst.querySelector("tbody tr.dg-responsive-child-row")).not.toBeNull();
    expect(inst.querySelector("tbody tr.dg-row-details-row")).toBeNull();
    document.body.removeChild(inst);
});
