import { expect, test } from "bun:test";
import DataGrid from "../data-grid.js";
import { ArrayDataSource } from "../src/data-source.js";
import BulkActions from "../src/plugins/bulk-actions.js";
import SelectableRows from "../src/plugins/selectable-rows.js";
import { change } from "./helpers.js";

const rows = Array.from({ length: 30 }, (_, i) => ({ id: i + 1, name: `row${i}` }));

async function makeReadyGrid(opts = {}, dataSource = new ArrayDataSource(rows)) {
    DataGrid.unregisterPlugins();
    DataGrid.registerPlugins({ SelectableRows, BulkActions });
    const inst = new DataGrid({
        columns: [{ field: "name" }],
        selectable: true,
        bulkActions: [{ name: "archive", label: "Archive" }],
        ...opts,
        dataSource,
    });
    const connected = new Promise((resolve) => inst.addEventListener("connected", resolve, { once: true }));
    document.body.appendChild(inst);
    await connected;
    return inst;
}

/** A source without COUNT(*): total stays null. */
function noCountSource(data) {
    const inner = new ArrayDataSource(data);
    return {
        async load(query, options) {
            const result = await inner.load(query, options);
            return { rows: result.rows, hasMore: result.hasMore };
        },
    };
}

const layer = (inst) => inst.querySelector(":scope > .dg-bulk-layer");
const matching = (inst) => inst.querySelector(".dg-select-matching");
const visibleCount = (inst) => inst.querySelector('.dg-selection-count [aria-hidden="true"]').textContent;
const statusCount = (inst) => inst.querySelector(".dg-selection-count .dg-visually-hidden").textContent;

function toggleFirst(inst) {
    const input = inst.querySelector('tbody td[data-column-id="$selection"] input');
    input.checked = !input.checked;
    change(input);
    return input;
}

test("the floating bar is the default: a hidden layer after the frame until rows are selected", async () => {
    const inst = await makeReadyGrid();
    const bar = inst.querySelector(".dg-bulk-actions");
    expect(layer(inst)).toBeTruthy();
    expect(layer(inst).previousElementSibling?.matches(".dg-frame")).toBe(true);
    expect(bar.parentElement).toBe(layer(inst));
    expect(inst.classList.contains("dg-bulk-floating")).toBe(true);
    expect(inst.querySelector(".dg-topbar-start .dg-bulk-actions")).toBeNull();
    expect(bar.getAttribute("role")).toBe("group");
    expect(bar.getAttribute("aria-label")).toBe("Selection actions");
    expect(layer(inst).hidden).toBe(true);

    toggleFirst(inst);
    expect(layer(inst).hidden).toBe(false);
    expect(visibleCount(inst)).toBe("1");
    expect(statusCount(inst)).toBe("1 selected");
    expect(inst.querySelector(".dg-clear-selection").getAttribute("aria-label")).toBe("Clear selection");

    toggleFirst(inst);
    expect(layer(inst).hidden).toBe(true);
    inst.remove();
});

test("bulk-actions-display is initial-only and inline keeps the topbar bar", async () => {
    DataGrid.unregisterPlugins();
    DataGrid.registerPlugins({ SelectableRows, BulkActions });
    const inst = new DataGrid({
        columns: [{ field: "name" }],
        selectable: true,
        bulkActions: [{ name: "archive" }],
        dataSource: new ArrayDataSource(rows),
    });
    inst.setAttribute("bulk-actions-display", "inline");
    const connected = new Promise((resolve) => inst.addEventListener("connected", resolve, { once: true }));
    document.body.appendChild(inst);
    await connected;
    expect(inst.querySelector(".dg-topbar-start .dg-bulk-actions")).toBeTruthy();
    expect(layer(inst)).toBeNull();
    expect(inst.classList.contains("dg-bulk-floating")).toBe(false);
    inst.setAttribute("bulk-actions-display", "floating");
    expect(inst.options.bulkActionsDisplay).toBe("inline");
    inst.remove();
});

test("select all matching is opt-in", async () => {
    const inst = await makeReadyGrid();
    inst.selectAll();
    expect(layer(inst).hidden).toBe(false);
    expect(matching(inst).hidden).toBe(true);
    inst.remove();
});

test("select all matching is offered only once the whole page is selected and more results match", async () => {
    const inst = await makeReadyGrid({ selectMatching: true });
    toggleFirst(inst);
    expect(matching(inst).hidden).toBe(true);

    inst.selectAll();
    expect(matching(inst).hidden).toBe(false);
    expect(matching(inst).textContent).toBe("Select all 30");

    // Activating it keeps focus inside the bar, then counts every match.
    matching(inst).focus();
    matching(inst).click();
    expect(inst.getSelectionState().mode).toBe("all");
    expect(matching(inst).hidden).toBe(true);
    expect(document.activeElement?.matches('button[data-action="archive"]')).toBe(true);
    expect(visibleCount(inst)).toBe("30");

    inst.deselectRow(inst.rows[0]);
    expect(visibleCount(inst)).toBe("29");
    expect(matching(inst).hidden).toBe(true);
    inst.remove();
});

test("a single page holding every result offers no extension", async () => {
    const inst = await makeReadyGrid({ selectMatching: true }, new ArrayDataSource(rows.slice(0, 5)));
    inst.selectAll();
    expect(layer(inst).hidden).toBe(false);
    expect(matching(inst).hidden).toBe(true);
    inst.remove();
});

test("an unknown total keeps the extension and an all selection actionable without a count", async () => {
    const inst = await makeReadyGrid({ selectMatching: true, pager: "more" }, noCountSource(rows));
    expect(inst.total).toBeNull();
    inst.selectAll();
    expect(matching(inst).textContent).toBe("Select all matching");
    matching(inst).click();
    expect(layer(inst).hidden).toBe(false);
    expect(visibleCount(inst)).toBe("All selected");
    expect(statusCount(inst)).toBe("All selected");
    expect(inst.querySelector('button[data-action="archive"]').disabled).toBe(false);

    toggleFirst(inst);
    expect(inst.getSelectionState().except.size).toBe(1);
    expect(visibleCount(inst)).toBe("All selected except 1");
    expect(statusCount(inst)).toBe("All selected except 1");
    expect(inst.querySelector('button[data-action="archive"]').disabled).toBe(false);

    inst.deselectRow(inst.rows[1]);
    expect(visibleCount(inst)).toBe("All selected except 2");
    expect(statusCount(inst)).toBe("All selected except 2");
    const previous = DataGrid.getLabels();
    try {
        DataGrid.setLabels({ allSelectedExcept: "Tout sauf {count}" });
        inst.updateLabels();
        expect(visibleCount(inst)).toBe("Tout sauf 2");
        expect(statusCount(inst)).toBe("Tout sauf 2");
    } finally {
        DataGrid.setLabels(previous);
    }

    inst.selectRow(inst.rows[1]);
    toggleFirst(inst);
    expect(inst.getSelectionState().except.size).toBe(0);
    expect(visibleCount(inst)).toBe("All selected");
    expect(statusCount(inst)).toBe("All selected");
    inst.remove();
});

test("clear and Escape empty the selection and move focus out before the actions disable", async () => {
    const inst = await makeReadyGrid();
    const action = inst.querySelector('button[data-action="archive"]');
    const input = toggleFirst(inst);
    action.focus();
    inst.querySelector(".dg-clear-selection").click();
    expect(inst.getSelectionState().ids.size).toBe(0);
    expect(layer(inst).hidden).toBe(true);
    expect(action.disabled).toBe(true);
    // Never dropped to <body>: the grid keeps the focus.
    expect(inst.contains(document.activeElement)).toBe(true);
    expect(layer(inst).contains(document.activeElement)).toBe(false);

    input.checked = true;
    change(input);
    action.focus();
    action.dispatchEvent(new KeyboardEvent("keydown", { key: "Escape", bubbles: true, cancelable: true }));
    expect(inst.getSelectionState().ids.size).toBe(0);
    expect(layer(inst).hidden).toBe(true);
    expect(inst.contains(document.activeElement)).toBe(true);
    expect(layer(inst).contains(document.activeElement)).toBe(false);
    inst.remove();
});

test("a programmatic clear while an action has focus keeps the focus in the grid", async () => {
    const inst = await makeReadyGrid();
    toggleFirst(inst);
    const action = inst.querySelector('button[data-action="archive"]');
    action.focus();
    inst.clearSelection();
    expect(document.activeElement).not.toBe(document.body);
    expect(inst.contains(document.activeElement)).toBe(true);
    inst.remove();
});

test("rows of a pending page never advertise an extension, the next render does", async () => {
    const inst = await makeReadyGrid({ selectMatching: true });
    const source = inst.dataSource;
    let finish;
    const inner = source.load.bind(source);
    source.load = (query, options) =>
        new Promise((resolve) => {
            finish = () => resolve(inner(query, options));
        });
    const loading = inst.setQuery({ page: 2 });
    inst.selectAll();
    expect(matching(inst).hidden).toBe(true);
    finish();
    await loading;
    expect(inst.page).toBe(2);
    inst.selectAll();
    expect(matching(inst).hidden).toBe(false);
    inst.remove();
});

test("a refresh of a fully selected page withholds the extension while busy and restores it after", async () => {
    const inst = await makeReadyGrid({ selectMatching: true });
    const source = inst.dataSource;
    const inner = source.load.bind(source);
    let finish;
    source.load = (query, options) =>
        new Promise((resolve) => {
            finish = () => resolve(inner(query, options));
        });
    inst.selectAll();
    expect(matching(inst).hidden).toBe(false);

    const refreshing = inst.refresh();
    // The loading edge is observed asynchronously, like the attribute itself.
    await Promise.resolve();
    expect(inst.loading).toBe(true);
    expect(matching(inst).hidden).toBe(true);

    finish();
    await refreshing;
    await Promise.resolve();
    expect(inst.loading).toBe(false);
    expect(inst.rows.every((row, index) => inst.isRowSelected(row, index))).toBe(true);
    expect(matching(inst).hidden).toBe(false);
    inst.remove();
});

test("a bulk action from the floating bar dispatches the selection and the query", async () => {
    const inst = await makeReadyGrid();
    let detail = null;
    inst.addEventListener("bulkAction", (event) => {
        detail = event.detail;
    });
    toggleFirst(inst);
    inst.querySelector('button[data-action="archive"]').click();
    expect(detail.name).toBe("archive");
    expect(detail.selection.ids.has("1")).toBe(true);
    expect(detail.query.page).toBe(1);
    inst.remove();
});

test("labels follow updateLabels", async () => {
    const inst = await makeReadyGrid({ selectMatching: true });
    inst.selectAll();
    const previous = DataGrid.getLabels();
    try {
        DataGrid.setLabels({ selectAllResults: "Tout ({total})", clearSelection: "Vider", selectionActions: "Lot" });
        inst.updateLabels();
        expect(matching(inst).textContent).toBe("Tout (30)");
        expect(inst.querySelector(".dg-clear-selection").getAttribute("aria-label")).toBe("Vider");
        expect(inst.querySelector(".dg-bulk-actions").getAttribute("aria-label")).toBe("Lot");
    } finally {
        DataGrid.setLabels(previous);
    }
    inst.remove();
});

test("disconnect removes the layer and its geometry, reconnect builds a single bar", async () => {
    const inst = await makeReadyGrid();
    toggleFirst(inst);
    const disconnected = new Promise((resolve) => inst.addEventListener("disconnected", resolve, { once: true }));
    inst.remove();
    await disconnected;
    expect(layer(inst)).toBeNull();
    expect(inst.classList.contains("dg-bulk-floating")).toBe(false);
    expect(inst.querySelector(":scope > .dg-frame").style.marginBottom).toBe("");
    expect(inst.scrollEl.style.paddingBottom).toBe("");

    const connected = new Promise((resolve) => inst.addEventListener("connected", resolve, { once: true }));
    document.body.appendChild(inst);
    await connected;
    expect(inst.querySelectorAll(".dg-bulk-actions").length).toBe(1);
    expect(inst.querySelectorAll(".dg-bulk-layer").length).toBe(1);
    inst.remove();
});
