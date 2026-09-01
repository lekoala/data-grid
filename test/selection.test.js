import { expect, test } from "bun:test";
import DataGrid from "../data-grid.js";
import { ArrayDataSource } from "../src/data-source.js";
import BulkActions from "../src/plugins/bulk-actions.js";
import SelectableRows from "../src/plugins/selectable-rows.js";
import { change } from "./helpers.js";

const rows = Array.from({ length: 30 }, (_, i) => ({ id: i + 1, name: `row${i}` }));

async function makeReadyGrid(opts = {}, data = rows) {
    DataGrid.unregisterPlugins();
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
    change(input);
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

test("selection survives a sort change", async () => {
    const inst = await makeReadyGrid({ columns: [{ field: "name" }], selectable: true, sortable: true });

    toggle(firstCheckbox(inst));
    expect(inst.getSelectionState().ids.has("1")).toBe(true);

    await inst.setQuery({ sort: [{ field: "name", direction: "asc" }] });
    expect(inst.getSelectionState().ids.has("1")).toBe(true);
    document.body.removeChild(inst);
});

test("selection clears on a filter change", async () => {
    const inst = await makeReadyGrid({ columns: [{ field: "name" }], selectable: true, filterable: true });

    toggle(firstCheckbox(inst));
    expect(inst.getSelectionState().ids.size).toBe(1);

    await inst.setQuery({ filters: { name: { operator: "contains", value: "row1" } } });
    const state = inst.getSelectionState();
    expect(state.mode).toBe("explicit");
    expect(state.ids.size).toBe(0);
    document.body.removeChild(inst);
});

test("selection clears on resetQuery", async () => {
    const inst = await makeReadyGrid({ columns: [{ field: "name" }], selectable: true, pageSize: 10 });

    toggle(firstCheckbox(inst));
    expect(inst.getSelectionState().ids.size).toBe(1);

    await inst.setQuery({ page: 2 });
    await inst.resetQuery();
    expect(inst.getSelectionState().ids.size).toBe(0);
    document.body.removeChild(inst);
});

test("an empty selection does not fire a redundant selectionChange", async () => {
    const inst = await makeReadyGrid({ columns: [{ field: "name" }], selectable: true });

    let fires = 0;
    inst.addEventListener("selectionChange", () => fires++);

    await inst.setQuery({ filters: { name: { operator: "contains", value: "row0" } } });
    expect(fires).toBe(0);
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
    change(selectAll);

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
    change(selectAll);
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
    radios[0].dispatchEvent(new MouseEvent("click", { bubbles: true }));
    expect(inst.getSelectionState().ids.has("1")).toBe(true);

    radios[1].dispatchEvent(new MouseEvent("click", { bubbles: true }));
    const state = inst.getSelectionState();
    expect(state.ids.has("2")).toBe(true);
    expect(state.ids.has("1")).toBe(false);
    expect(state.ids.size).toBe(1);

    radios[1].dispatchEvent(new MouseEvent("click", { bubbles: true }));
    expect(inst.getSelectionState().ids.size).toBe(0);
    document.body.removeChild(inst);
});

test("single select radios are scoped per grid so two grids stay independent", async () => {
    const a = await makeReadyGrid({ columns: [{ field: "name" }], singleSelect: true });
    const b = await makeReadyGrid({ columns: [{ field: "name" }], singleSelect: true });

    const radioNameA = a.querySelector("tbody input").name;
    const radioNameB = b.querySelector("tbody input").name;
    expect(radioNameA).not.toBe(radioNameB);
    expect(radioNameA).toBe(`dg-row-select-${a.id}`);
    expect(radioNameB).toBe(`dg-row-select-${b.id}`);

    document.body.removeChild(a);
    document.body.removeChild(b);
});

test("switching to singleSelect at runtime clears the multi selection", async () => {
    const inst = await makeReadyGrid({ columns: [{ field: "name" }], selectable: true });

    toggle(firstCheckbox(inst));
    toggle(inst.querySelectorAll('tbody tr td[data-column-id="$selection"] input')[1]);
    expect(inst.getSelectionState().ids.size).toBe(2);

    let fires = 0;
    inst.addEventListener("selectionChange", () => fires++);

    inst.setAttribute("single-select", "");
    const state = inst.getSelectionState();
    expect(state.mode).toBe("explicit");
    expect(state.ids.size).toBe(0);
    expect(inst.options.selectable).toBe(true);

    // The checkboxes were replaced by radios and only the non-empty clear fired.
    const input = inst.querySelector('tbody td[data-column-id="$selection"] input');
    expect(input.type).toBe("radio");
    expect(fires).toBe(1);
    document.body.removeChild(inst);
});

test("toggling selectable at runtime updates header and body", async () => {
    const inst = await makeReadyGrid({ columns: [{ field: "name" }] });

    const selector = 'th[data-column-id="$selection"]';
    expect(inst.querySelector(`thead ${selector}`)).toBeNull();
    expect(inst.querySelector('tbody td[data-column-id="$selection"]')).toBeNull();

    inst.setAttribute("selectable", "");
    expect(inst.querySelector(`thead ${selector}`)).toBeTruthy();
    expect(inst.querySelector('tbody td[data-column-id="$selection"] input')).toBeTruthy();

    inst.removeAttribute("selectable");
    expect(inst.querySelector(`thead ${selector}`)).toBeNull();
    expect(inst.querySelector('tbody td[data-column-id="$selection"]')).toBeNull();
    document.body.removeChild(inst);
});

test("changing row-key clears selection based on the previous identity", async () => {
    const inst = await makeReadyGrid({ columns: [{ field: "name" }], selectable: true });

    toggle(firstCheckbox(inst));
    expect(inst.getSelectionState().ids.size).toBe(1);

    inst.setAttribute("row-key", "name");
    expect(inst.getSelectionState().ids.size).toBe(0);
    expect(firstCheckbox(inst).checked).toBe(false);
    document.body.removeChild(inst);
});

test("header and body checkboxes share the same centering box", async () => {
    const inst = await makeReadyGrid({ columns: [{ field: "name" }], selectable: true });

    // The header select-all uses the exact same full-cell label as the rows
    const headerLabel = inst.querySelector('thead th[data-column-id="$selection"] label');
    const bodyLabel = inst.querySelector('tbody td[data-column-id="$selection"] label');
    expect(headerLabel.classList.contains("dg-clickable-cell")).toBe(true);
    expect(bodyLabel.classList.contains("dg-clickable-cell")).toBe(true);
    document.body.removeChild(inst);
});

test("bulkActions dispatch the enriched contract with confirm", async () => {
    const messages = [];
    globalThis.confirm = (message) => {
        messages.push(message);
        return true;
    };
    const inst = await makeReadyGrid({
        columns: [{ field: "name" }],
        selectable: true,
        bulkActions: [{ name: "archive", label: "Archive", confirm: (selection) => `Archive ${selection.ids.size}?` }],
    });

    toggle(firstCheckbox(inst));
    let detail = null;
    inst.addEventListener("bulkAction", (event) => {
        detail = event.detail;
    });
    const button = inst.querySelector('button[data-action="archive"]');
    button.click();

    expect(messages).toEqual(["Archive 1?"]);
    expect(detail.name).toBe("archive");
    expect(detail.action.name).toBe("archive");
    expect(detail.selection.ids.has("1")).toBe(true);
    expect(detail.trigger).toBe(button);
    document.body.removeChild(inst);
    globalThis.confirm = () => true;
});

test("bulkActions render a permanent bar and dispatch bulkAction", async () => {
    const inst = await makeReadyGrid({
        columns: [{ field: "name" }],
        selectable: true,
        pageSize: 10,
        bulkActions: [{ name: "archive", label: "Archive" }],
    });

    const bar = inst.querySelector(".dg-bulk-actions");
    const countEl = bar.querySelector(".dg-selection-count");
    const button = bar.querySelector('button[data-action="archive"]');
    // The toolbar exists as soon as bulkActions are configured
    expect(bar.hidden).toBe(false);
    // The badge is hidden and silent until something is selected
    expect(countEl.hidden).toBe(true);
    expect(button.disabled).toBe(true);

    // A disabled bulk action never dispatches
    let detail = null;
    inst.addEventListener("bulkAction", (event) => {
        detail = event.detail;
    });
    button.click();
    expect(detail).toBeNull();

    toggle(firstCheckbox(inst));
    expect(countEl.hidden).toBe(false);
    // Visible: a plain number. Accessible: the translated phrase in the status region.
    expect(countEl.querySelector('[aria-hidden="true"]').textContent).toBe("1");
    expect(countEl.querySelector(".dg-visually-hidden").textContent).toBe("1 selected");
    expect(button.disabled).toBe(false);

    button.click();
    expect(detail).toBeTruthy();
    expect(detail.name).toBe("archive");
    expect(detail.selection.ids.has("1")).toBe(true);
    expect(detail.query.page).toBe(1);

    toggle(firstCheckbox(inst));
    expect(countEl.hidden).toBe(true);
    expect(button.disabled).toBe(true);
    document.body.removeChild(inst);
});
