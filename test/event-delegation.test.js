import { afterEach, expect, test } from "bun:test";
import DataGrid from "../data-grid.js";
import { ArrayDataSource } from "../src/data-source.js";
import DraggableHeaders from "../src/plugins/draggable-headers.js";
import SelectableRows from "../src/plugins/selectable-rows.js";
import { change, input } from "./helpers.js";

class CountingSource {
    constructor(rows) {
        this.rows = rows;
        this.count = 0;
    }

    async load(query) {
        this.count++;
        const search = query.search ?? "";
        const rows = this.rows.filter(
            (r) => search === "" || (r.name ?? "").toLowerCase().includes(search.toLowerCase()),
        );
        return { rows, total: rows.length };
    }
}

async function connectGrid(opts = {}) {
    const options = { ...opts };
    if (!options.dataSource) {
        options.dataSource = new ArrayDataSource([]);
    }
    const inst = new DataGrid(options);
    document.body.appendChild(inst);
    await new Promise((resolve) => {
        inst.addEventListener("connected", resolve, { once: true });
        setTimeout(resolve, 2000);
    });
    return inst;
}

afterEach(() => {
    for (const el of document.body.querySelectorAll("data-grid")) {
        el.remove();
    }
});

const sleep = (ms) => new Promise((resolve) => setTimeout(resolve, ms));

const CONTROL_COLUMNS = [{ field: "name", title: "Name" }];
const ROWS = Array.from({ length: 25 }, (_, i) => ({ id: i + 1, name: `Person ${i}` }));

function click(el, bubbles = true) {
    el.dispatchEvent(new MouseEvent("click", { bubbles }));
}

test("pager buttons navigate through delegated clicks", async () => {
    const ds = new CountingSource(ROWS);
    const inst = await connectGrid({ dataSource: ds, columns: CONTROL_COLUMNS, pageSize: 10 });
    expect(ds.count).toBe(1);

    click(inst.querySelector(".dg-btn-next"));
    await sleep(1);
    expect(inst.query.page).toBe(2);

    click(inst.querySelector(".dg-btn-last"));
    await sleep(1);
    expect(inst.query.page).toBe(3);

    click(inst.querySelector(".dg-btn-prev"));
    await sleep(1);
    expect(inst.query.page).toBe(2);

    click(inst.querySelector(".dg-btn-first"));
    await sleep(1);
    expect(inst.query.page).toBe(1);
});

test("page-size change navigates via delegated change", async () => {
    const ds = new CountingSource(ROWS);
    const inst = await connectGrid({ dataSource: ds, columns: CONTROL_COLUMNS });

    const select = inst.querySelector(".dg-select-per-page");
    select.value = "25";
    change(select);
    await sleep(1);
    expect(inst.query.pageSize).toBe(25);
});

test("page input navigates on change and on Enter, but not twice", async () => {
    const ds = new CountingSource(ROWS);
    const inst = await connectGrid({ dataSource: ds, columns: CONTROL_COLUMNS, pageSize: 10 });
    const input = inst.querySelector(".dg-input-page");

    // Enter navigates
    input.value = "2";
    input.dispatchEvent(new KeyboardEvent("keydown", { key: "Enter", bubbles: true }));
    await sleep(1);
    expect(inst.query.page).toBe(2);
    const afterEnter = ds.count;

    // A later change to the same page must not issue a second load
    change(input);
    await sleep(1);
    expect(inst.query.page).toBe(2);
    expect(ds.count).toBe(afterEnter);
});

test("search input works through delegated input and Enter", async () => {
    const ds = new CountingSource(ROWS);
    const inst = await connectGrid({ dataSource: ds, columns: CONTROL_COLUMNS, searchable: true, searchDelay: 0 });

    input(inst.querySelector(".dg-search"), "Person 3");
    await sleep(20);
    expect(inst.query.search).toBe("Person 3");
});

test("rerendered filter inputs keep working via delegation", async () => {
    const ds = new CountingSource(ROWS);
    const inst = await connectGrid({
        dataSource: ds,
        columns: [{ field: "name", title: "Name" }],
        filterable: true,
        filterDelay: 0,
    });

    const filterInput = () => inst.querySelector('.dg-head-filters input[data-name="name"]');
    input(filterInput(), "Person 2");
    await sleep(20);
    expect(inst.query.filters.name).toEqual({ operator: "contains", value: "Person 2" });

    // Rerender rebuilds the filter row; the new input still works without
    // re-attaching anything.
    inst.renderTable();
    input(filterInput(), "Person 4");
    await sleep(20);
    expect(inst.query.filters.name).toEqual({ operator: "contains", value: "Person 4" });
});

test("a pending filter debounce is cancelled when the filter row is replaced", async () => {
    const ds = new CountingSource(ROWS);
    const inst = await connectGrid({
        dataSource: ds,
        columns: [{ field: "name", title: "Name" }],
        filterable: true,
        filterDelay: 200,
    });
    const before = ds.count;

    // Start typing: the debounce is pending, nothing committed yet.
    input(inst.querySelector('.dg-head-filters input[data-name="name"]'), "Person 9");
    expect(inst.query.filters.name).toBeUndefined();

    // Replace the filter row before the debounce can fire.
    inst.renderTable();
    await sleep(250);

    // The stale pending update must not have fired on the detached input.
    expect(inst.query.filters.name).toBeUndefined();
    expect(ds.count).toBe(before);
});

test("reconnecting does not duplicate delegated listeners", async () => {
    const ds = new CountingSource(ROWS);
    const inst = await connectGrid({ dataSource: ds, columns: CONTROL_COLUMNS, pageSize: 10 });

    inst.remove();
    await sleep(30);
    document.body.appendChild(inst);
    await new Promise((resolve) => {
        inst.addEventListener("connected", resolve, { once: true });
        setTimeout(resolve, 2000);
    });

    const before = ds.count;
    click(inst.querySelector(".dg-btn-next"));
    await sleep(1);
    // One navigation = exactly one load (no duplicated listeners).
    expect(ds.count).toBe(before + 1);
});

test("an inner grid interaction never triggers the outer grid", async () => {
    const outerDs = new CountingSource(ROWS);
    const outer = await connectGrid({ dataSource: outerDs, columns: CONTROL_COLUMNS, searchable: true });
    const outerCountBefore = outerDs.count;

    const innerDs = new CountingSource(ROWS);
    const inner = await connectGrid({
        dataSource: innerDs,
        columns: CONTROL_COLUMNS,
        searchable: true,
        searchDelay: 0,
    });
    outer.appendChild(inner);

    input(inner.querySelector(".dg-search"), "Person 5");
    await sleep(20);

    // Inner handled its own search; the outer grid ignored the bubbled event.
    expect(innerDs.count).toBeGreaterThan(0);
    expect(outerDs.count).toBe(outerCountBefore);
    expect(outer.query.search).toBe("");
});

test("rerendering does not duplicate delegated plugin handlers", async () => {
    DataGrid.registerPlugins({ SelectableRows });
    const inst = await connectGrid({
        dataSource: new ArrayDataSource(ROWS),
        columns: CONTROL_COLUMNS,
        selectable: true,
    });

    // A few full renders: the delegated listener is installed once, so a single
    // interaction must produce a single action.
    inst.renderTable();
    inst.refresh();
    await sleep(20);

    const checkbox = inst.querySelector('tbody tr td[data-column-id="$selection"] input');
    checkbox.checked = true;
    change(checkbox);
    // A duplicated listener would toggle twice and net out to zero.
    expect(inst.getSelectionState().ids.size).toBe(1);
});

test("reconnecting does not duplicate delegated plugin handlers", async () => {
    DataGrid.registerPlugins({ SelectableRows });
    const inst = await connectGrid({
        dataSource: new ArrayDataSource(ROWS),
        columns: CONTROL_COLUMNS,
        selectable: true,
    });

    inst.remove();
    await sleep(30);
    document.body.appendChild(inst);
    await new Promise((resolve) => {
        inst.addEventListener("connected", resolve, { once: true });
        setTimeout(resolve, 2000);
    });

    const checkbox = inst.querySelector('tbody tr td[data-column-id="$selection"] input');
    checkbox.checked = true;
    change(checkbox);
    expect(inst.getSelectionState().ids.size).toBe(1);
});

test("an inner grid selection never triggers the outer grid selection plugin", async () => {
    DataGrid.registerPlugins({ SelectableRows });
    const outer = await connectGrid({
        dataSource: new ArrayDataSource(ROWS),
        columns: CONTROL_COLUMNS,
        selectable: true,
    });
    const inner = await connectGrid({
        dataSource: new ArrayDataSource(ROWS),
        columns: CONTROL_COLUMNS,
        selectable: true,
    });
    outer.appendChild(inner);

    const innerCheckbox = inner.querySelector('tbody tr td[data-column-id="$selection"] input');
    innerCheckbox.checked = true;
    change(innerCheckbox);

    expect(inner.getSelectionState().ids.size).toBe(1);
    expect(outer.getSelectionState().ids.size).toBe(0);
});

test("an inner grid header drop never reorders the outer grid columns", async () => {
    DataGrid.registerPlugins({ SelectableRows, DraggableHeaders });
    const outer = await connectGrid({
        dataSource: new ArrayDataSource(ROWS),
        columns: [
            { field: "id", title: "Id" },
            { field: "name", title: "Name" },
        ],
        reorder: true,
    });
    const inner = await connectGrid({
        dataSource: new ArrayDataSource(ROWS),
        columns: [
            { field: "id", title: "Id" },
            { field: "name", title: "Name" },
        ],
        reorder: true,
    });
    outer.appendChild(inner);

    const target = inner.querySelector('thead th[data-column-id="name"]');
    const event = new window.Event("drop", { bubbles: true, cancelable: true });
    Object.defineProperty(event, "dataTransfer", { value: { getData: () => "id" } });
    target.dispatchEvent(event);

    const outerIds = () =>
        Array.from(outer.querySelectorAll("thead tr.dg-head-columns th")).map((th) =>
            th.getAttribute("data-column-id"),
        );
    expect(outerIds()[0]).toBe("id");
    expect(outerIds()[1]).toBe("name");
});
