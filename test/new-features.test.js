import { expect, test } from "bun:test";
import DataGrid from "../data-grid.js";
import { ArrayDataSource } from "../src/data-source.js";
import ResponsiveGrid from "../src/plugins/responsive-grid.js";
import RowDetails from "../src/plugins/row-details.js";
import SelectableRows from "../src/plugins/selectable-rows.js";

async function makeReadyGrid(options, rows = [{ id: 1, name: "Alice", email: "alice@example.com" }]) {
    DataGrid.registerPlugins({ ResponsiveGrid, SelectableRows, RowDetails });
    const inst = new DataGrid({ ...options, dataSource: new ArrayDataSource(rows) });
    document.body.appendChild(inst);
    await new Promise((resolve) => {
        inst.addEventListener("connected", resolve, { once: true });
        setTimeout(resolve, 2000);
    });
    return inst;
}

function forceResponsiveResize(inst, size) {
    const plugin = inst.getPlugin("ResponsiveGrid");
    if (plugin.unblockTimeout) {
        clearTimeout(plugin.unblockTimeout);
    }
    plugin.observerBlocked = false;
    plugin._lastEntry = { contentBoxSize: [{ inlineSize: size }] };
    plugin.resize();
}

test("column wrap overrides the grid-wide wrapping policy without adding row interaction", async () => {
    const inst = await makeReadyGrid({
        columns: [{ field: "name", wrap: true }, { field: "email", wrap: false }, { field: "id" }],
    });
    expect(inst.querySelector('tbody td[data-column-id="name"]').classList.contains("dg-wrap")).toBe(true);
    expect(inst.querySelector('tbody td[data-column-id="email"]').classList.contains("dg-wrap")).toBe(false);
    expect(inst.querySelector('tbody td[data-column-id="id"]').classList.contains("dg-wrap")).toBe(false);

    inst.setAttribute("wrap", "");
    const tr = inst.querySelector("tbody tr.dg-data-row");
    expect(tr.querySelector('td[data-column-id="name"]').classList.contains("dg-wrap")).toBe(true);
    expect(tr.querySelector('td[data-column-id="email"]').classList.contains("dg-wrap")).toBe(false);
    expect(tr.querySelector('td[data-column-id="id"]').classList.contains("dg-wrap")).toBe(true);
    expect(tr.classList.contains("dg-expandable")).toBe(false);
    tr.click();
    expect(tr.classList.contains("dg-expanded")).toBe(false);
    document.body.removeChild(inst);
});

test("the scroll viewport is focusable and only becomes a named region with a business label", async () => {
    const unnamed = await makeReadyGrid({ columns: [{ field: "name" }] });
    expect(unnamed.scrollEl.tabIndex).toBe(0);
    expect(unnamed.scrollEl.hasAttribute("role")).toBe(false);
    document.body.removeChild(unnamed);

    const named = await makeReadyGrid({ columns: [{ field: "name" }], caption: "Customers" });
    expect(named.scrollEl.getAttribute("role")).toBe("region");
    expect(named.scrollEl.getAttribute("aria-label")).toBe("Customers");
    document.body.removeChild(named);
});

test("frozen columns stack after frozen control columns and mark the edge", async () => {
    const inst = await makeReadyGrid({
        columns: [
            { field: "name", frozen: "start", width: 120 },
            { field: "email", width: 180 },
        ],
        selectable: true,
        responsive: true,
    });
    const selection = inst.querySelector('thead th[data-column-id="$selection"]');
    const name = inst.querySelector('thead th[data-column-id="name"]');
    Object.defineProperty(selection, "offsetWidth", { configurable: true, value: 40 });
    Object.defineProperty(name, "offsetWidth", { configurable: true, value: 120 });
    inst.syncFrozenColumns();

    expect(selection.dataset.frozen).toBe("start");
    expect(name.dataset.frozen).toBe("start");
    expect(selection.style.getPropertyValue("--dg-frozen-offset")).toBe("0px");
    expect(name.style.getPropertyValue("--dg-frozen-offset")).toBe("40px");
    expect(name.hasAttribute("data-frozen-edge")).toBe(true);
    expect(inst.scrollEl.style.getPropertyValue("--dg-frozen-start-width")).toBe("160px");
    expect(inst.getPlugin("ResponsiveGrid")._isEssential(inst.getCol("name"))).toBe(true);

    inst.hideColumn("name");
    inst.syncFrozenColumns();
    expect(selection.hasAttribute("data-frozen-edge")).toBe(true);
    expect(inst.scrollEl.style.getPropertyValue("--dg-frozen-start-width")).toBe("40px");
    inst.showColumn("name");
    inst.syncFrozenColumns();
    expect(inst.scrollEl.style.getPropertyValue("--dg-frozen-start-width")).toBe("160px");
    document.body.removeChild(inst);
});

test("snapColumns enables proximity snapping and has an observed attribute", () => {
    const inst = new DataGrid({ snapColumns: true });
    inst.snapColumnsChanged();
    expect(inst.classList.contains("dg-snap-columns")).toBe(true);
    expect(DataGrid.observedAttributes).toContain("snap-columns");
});

test("responsive disclosure uses a named native button and controls its detail row", async () => {
    const columns = [{ field: "name" }, { field: "email", responsiveHidden: true }];
    const inst = await makeReadyGrid({ columns, responsive: true, rowLabel: "name" });
    const button = inst.querySelector("tbody .dg-responsive-toggle-control");
    expect(button.tagName).toBe("BUTTON");
    expect(button.getAttribute("aria-expanded")).toBe("false");
    expect(button.getAttribute("aria-label")).toBe("Show additional columns for Alice");
    button.click();
    expect(button.getAttribute("aria-expanded")).toBe("true");
    expect(button.getAttribute("aria-label")).toBe("Hide additional columns for Alice");
    expect(document.getElementById(button.getAttribute("aria-controls"))).toBeTruthy();
    document.body.removeChild(inst);
});

test("RowDetails renders application content, exposes state methods and emits one stateful event", async () => {
    const inst = await makeReadyGrid({
        columns: [{ field: "name" }],
        rowLabel: "name",
        rowDetails: ({ row }) => {
            const content = document.createElement("p");
            content.textContent = `Details: ${row.name}`;
            return content;
        },
    });
    const plugin = inst.getPlugin("RowDetails");
    const button = inst.querySelector("tbody .dg-row-details-toggle-control");
    expect(button.getAttribute("aria-label")).toBe("Show details for Alice");
    let detail;
    inst.addEventListener("rowDetailsToggle", (event) => {
        detail = event.detail;
    });

    button.click();
    expect(plugin.isExpanded("1")).toBe(true);
    expect(button.getAttribute("aria-expanded")).toBe("true");
    expect(inst.querySelector(".dg-row-details-row").textContent).toBe("Details: Alice");
    expect(detail).toEqual({ row: inst.rows[0], rowKey: "1", expanded: true });

    plugin.collapse("1");
    expect(plugin.isExpanded("1")).toBe(false);
    expect(inst.querySelector(".dg-row-details-row")).toBeNull();
    document.body.removeChild(inst);
});

test("RowDetails coexists with responsive child rows without becoming a data row", async () => {
    const inst = await makeReadyGrid({
        columns: [{ field: "name" }, { field: "email", responsiveHidden: true }],
        responsive: true,
        selectable: true,
        rowDetails: ({ row }) => `Profile for ${row.name}`,
    });
    inst.querySelector("tbody .dg-responsive-toggle-control").click();
    inst.querySelector("tbody .dg-row-details-toggle-control").click();

    const rows = inst.querySelectorAll("tbody > tr");
    expect(rows[0].classList.contains("dg-data-row")).toBe(true);
    expect(rows[1].classList.contains("dg-responsive-child-row")).toBe(true);
    expect(rows[2].classList.contains("dg-row-details-row")).toBe(true);
    expect(inst.querySelectorAll("tbody > tr.dg-data-row").length).toBe(1);
    expect(inst.querySelectorAll("tbody .dg-selectable input").length).toBe(1);
    expect(
        Array.from(inst.querySelectorAll('thead th[data-column-id^="$"]')).every((th) => th.dataset.frozen === "start"),
    ).toBe(true);
    document.body.removeChild(inst);
});

test("stacked responsive columns compose with RowDetails across resize and body renders", async () => {
    const inst = await makeReadyGrid({
        columns: [
            { field: "id", width: 100, responsive: 0 },
            { field: "name", width: 100, responsive: 1 },
            { field: "email", width: 100, responsive: 2 },
        ],
        responsive: true,
        responsiveStartOpen: true,
        responsiveToggle: false,
        rowLabel: "name",
        rowDetails: ({ row }) => `Profile for ${row.name}`,
    });
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

    forceResponsiveResize(inst, 160);
    expectStructure(true);

    forceResponsiveResize(inst, 1000);
    expectStructure(false);

    forceResponsiveResize(inst, 160);
    expectStructure(true);

    await inst.refresh();
    expectStructure(true);

    await inst.setQuery({ search: "Alice" });
    expectStructure(true);
    document.body.removeChild(inst);
});

test("a frozen declarative column is parsed and rendered", async () => {
    const inst = new DataGrid({ dataSource: new ArrayDataSource([{ name: "Alice" }]) });
    inst.innerHTML = `<table><thead><tr><th data-field="name" data-frozen="start">Name</th></tr></thead><tbody></tbody></table>`;
    document.body.appendChild(inst);
    await new Promise((resolve) => {
        inst.addEventListener("connected", resolve, { once: true });
        setTimeout(resolve, 2000);
    });
    expect(inst.options.columns[0].frozen).toBe("start");
    expect(inst.querySelector('th[data-column-id="name"]').dataset.frozen).toBe("start");
    document.body.removeChild(inst);
});
