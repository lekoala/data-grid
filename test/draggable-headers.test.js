import { expect, test } from "bun:test";
import DataGrid from "../data-grid.js";
import { ArrayDataSource } from "../src/data-source.js";
import DraggableHeaders from "../src/plugins/draggable-headers.js";

async function makeReadyGrid(options, rows) {
    DataGrid.registerPlugins({ DraggableHeaders });
    const inst = new DataGrid({ ...options, dataSource: new ArrayDataSource(rows) });
    document.body.appendChild(inst);
    await new Promise((resolve) => {
        inst.addEventListener("connected", resolve, { once: true });
        setTimeout(resolve, 2000);
    });
    return inst;
}

function columnIds(inst, selector) {
    return Array.from(inst.querySelectorAll(selector)).map((cell) => cell.getAttribute("data-column-id"));
}

function drop(inst, draggedId, targetId) {
    const target = inst.querySelector(`thead th[data-column-id="${targetId}"]`);
    const event = new Event("drop", { bubbles: true, cancelable: true });
    Object.defineProperty(event, "dataTransfer", { value: { getData: () => draggedId } });
    target.dispatchEvent(event);
}

test("dragging a column keeps header, filter and body column order aligned", async () => {
    const inst = await makeReadyGrid(
        {
            reorder: true,
            filterable: true,
            columns: [
                { field: "customer", title: "Customer", renderCell: ({ value }) => `Customer: ${value}` },
                { field: "email", title: "Email" },
                { field: "status", title: "Status" },
                { field: "plan", title: "Plan" },
            ],
        },
        [{ customer: "Ada", email: "ada@example.test", status: "Active", plan: "Pro" }],
    );

    drop(inst, "customer", "plan");

    const expected = ["email", "status", "plan", "customer"];
    expect(columnIds(inst, "thead .dg-head-columns > th[data-column-id]")).toEqual(expected);
    expect(columnIds(inst, "thead .dg-head-filters > th[data-column-id]")).toEqual(expected);
    expect(columnIds(inst, "tbody .dg-data-row:first-child > td[data-column-id]")).toEqual(expected);
    expect(inst.querySelector("tbody .dg-data-row:first-child > td:last-child").textContent).toBe("Customer: Ada");

    document.body.removeChild(inst);
});

test("reorder attribute enables and disables header dragging at runtime", async () => {
    const inst = await makeReadyGrid(
        {
            columns: [
                { field: "first", title: "First" },
                { field: "second", title: "Second" },
            ],
        },
        [{ first: "Ada", second: "Lovelace" }],
    );
    const headers = () => inst.querySelectorAll("thead .dg-head-columns > th[data-column-id]");

    expect(Array.from(headers()).every((header) => !header.draggable)).toBe(true);
    drop(inst, "first", "second");
    expect(columnIds(inst, "thead .dg-head-columns > th[data-column-id]")).toEqual(["first", "second"]);

    inst.setAttribute("reorder", "");
    expect(Array.from(headers()).every((header) => header.draggable)).toBe(true);
    drop(inst, "first", "second");
    expect(columnIds(inst, "thead .dg-head-columns > th[data-column-id]")).toEqual(["second", "first"]);

    inst.removeAttribute("reorder");
    expect(Array.from(headers()).every((header) => !header.draggable)).toBe(true);
    document.body.removeChild(inst);
});
