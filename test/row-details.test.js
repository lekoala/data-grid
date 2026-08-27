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
    // Shared disclosure primitive: same compact control as the responsive
    // toggle, and never the full-cell click target of the selection column.
    expect(button.classList.contains("dg-disclosure")).toBe(true);
    expect(button.classList.contains("dg-clickable-cell")).toBe(false);
    expect(button.querySelectorAll("svg").length).toBe(1);
    expect(button.closest("td").classList.contains("dg-disclosure-cell")).toBe(true);
    expect(inst.querySelector('thead th[data-column-id="$details"]').classList.contains("dg-disclosure-cell")).toBe(
        true,
    );
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
