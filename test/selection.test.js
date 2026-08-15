import { expect, test } from "bun:test";
import DataGrid from "../data-grid.js";
import { ArrayDataSource } from "../src/data-source.js";
import BulkActions from "../src/plugins/bulk-actions.js";
import SelectableRows from "../src/plugins/selectable-rows.js";

const rows = Array.from({ length: 30 }, (_, i) => ({ id: i + 1, name: `row${i}` }));

async function makeReadyGrid(opts = {}, data = rows) {
    DataGrid.registerPlugins({ SelectableRows, BulkActions });
    const options = { ...opts, dataSource: new ArrayDataSource(data) };
    const inst = new DataGrid(options);
    document.body.appendChild(inst);
    await new Promise((resolve) => {
        inst.addEventListener("connected", resolve, { once: true });
        setTimeout(resolve, 2000);
    });
    return inst;
}

function firstCheckbox(inst) {
    return inst.querySelector('tbody tr td[data-column-id="$selection"] input');
}

function toggle(input) {
    input.checked = !input.checked;
    input.dispatchEvent(new Event("change"));
}

test("selection survives a page change", async () => {
    const inst = await makeReadyGrid({ columns: [{ field: "name" }], selectable: true, pageSize: 10 });

    toggle(firstCheckbox(inst));
    expect(inst.getSelectionState().ids.has("1")).toBe(true);

    await inst.setQuery({ page: 2 });
    toggle(firstCheckbox(inst));

    const state = inst.getSelectionState();
    expect(state.ids.size).toBe(2);
    expect(state.ids.has("1")).toBe(true);
    expect(state.ids.has("11")).toBe(true);
    document.body.removeChild(inst);
});

test("tr[data-selected] reflects the selection", async () => {
    const inst = await makeReadyGrid({ columns: [{ field: "name" }], selectable: true });

    const tr = inst.querySelector("tbody tr");
    expect(tr.hasAttribute("data-selected")).toBe(false);

    toggle(firstCheckbox(inst));
    expect(tr.hasAttribute("data-selected")).toBe(true);

    toggle(firstCheckbox(inst));
    expect(tr.hasAttribute("data-selected")).toBe(false);
    document.body.removeChild(inst);
});

test("selectVisibleOnly=false switches to mode 'all' with an except set", async () => {
    const inst = await makeReadyGrid({
        columns: [{ field: "name" }],
        selectable: true,
        selectVisibleOnly: false,
        pageSize: 10,
    });

    const selectAll = inst.querySelector(".dg-select-all");
    selectAll.checked = true;
    selectAll.dispatchEvent(new Event("change"));

    let state = inst.getSelectionState();
    expect(state.mode).toBe("all");
    expect(state.except.size).toBe(0);

    // Unchecking one row records it in except
    toggle(firstCheckbox(inst));
    state = inst.getSelectionState();
    expect(state.mode).toBe("all");
    expect(state.except.has("1")).toBe(true);

    // getSelection reflects the current page minus the exceptions
    const selection = inst.getSelection("id");
    expect(selection.length).toBe(9);
    expect(selection.includes(1)).toBe(false);

    // Unchecking select-all clears the whole selection
    selectAll.checked = false;
    selectAll.dispatchEvent(new Event("change"));
    state = inst.getSelectionState();
    expect(state.mode).toBe("explicit");
    expect(state.ids.size).toBe(0);
    document.body.removeChild(inst);
});

test("getSelection keeps the keys contract", async () => {
    const inst = await makeReadyGrid({ columns: [{ field: "name" }], selectable: true, pageSize: 10 });

    toggle(firstCheckbox(inst));
    const second = inst.querySelectorAll('tbody tr td[data-column-id="$selection"] input')[1];
    toggle(second);

    expect(inst.getSelection()).toHaveLength(2);
    expect(inst.getSelection("id")).toEqual([1, 2]);
    expect(inst.getSelection("id", "name")).toEqual([
        { id: 1, name: "row0" },
        { id: 2, name: "row1" },
    ]);
    document.body.removeChild(inst);
});

test("clearSelection resets state and DOM", async () => {
    const inst = await makeReadyGrid({ columns: [{ field: "name" }], selectable: true });

    toggle(firstCheckbox(inst));
    expect(inst.getSelectionState().ids.size).toBe(1);

    inst.clearSelection();
    const state = inst.getSelectionState();
    expect(state.mode).toBe("explicit");
    expect(state.ids.size).toBe(0);
    expect(inst.querySelector("tbody tr").hasAttribute("data-selected")).toBe(false);
    document.body.removeChild(inst);
});

test("selectionChange fires after a mutation", async () => {
    const inst = await makeReadyGrid({ columns: [{ field: "name" }], selectable: true });

    let detail = null;
    inst.addEventListener("selectionChange", (event) => {
        detail = event.detail;
    });

    toggle(firstCheckbox(inst));
    expect(detail).toBeTruthy();
    expect(detail.selectionState.ids.has("1")).toBe(true);
    document.body.removeChild(inst);
});

test("single select keeps at most one selected row and allows toggling off", async () => {
    const inst = await makeReadyGrid({ columns: [{ field: "name" }], singleSelect: true });

    const radios = inst.querySelectorAll('tbody tr td[data-column-id="$selection"] input');
    radios[0].dispatchEvent(new Event("click"));
    expect(inst.getSelectionState().ids.has("1")).toBe(true);

    radios[1].dispatchEvent(new Event("click"));
    const state = inst.getSelectionState();
    expect(state.ids.has("2")).toBe(true);
    expect(state.ids.has("1")).toBe(false);
    expect(state.ids.size).toBe(1);

    radios[1].dispatchEvent(new Event("click"));
    expect(inst.getSelectionState().ids.size).toBe(0);
    document.body.removeChild(inst);
});

test("bulkActions render a bar and dispatch bulkAction", async () => {
    const inst = await makeReadyGrid({
        columns: [{ field: "name" }],
        selectable: true,
        pageSize: 10,
        bulkActions: [{ name: "archive", label: "Archive" }],
    });

    const bar = inst.querySelector(".dg-bulk-actions");
    expect(bar.hidden).toBe(true);

    toggle(firstCheckbox(inst));
    expect(bar.hidden).toBe(false);
    expect(bar.querySelector(".dg-bulk-count").textContent).toBe("1 selected");

    let detail = null;
    inst.addEventListener("bulkAction", (event) => {
        detail = event.detail;
    });
    bar.querySelector('button[data-action="archive"]').click();

    expect(detail).toBeTruthy();
    expect(detail.action).toBe("archive");
    expect(detail.selection.ids.has("1")).toBe(true);
    expect(detail.query.page).toBe(1);
    document.body.removeChild(inst);
});
