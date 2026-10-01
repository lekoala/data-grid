import { expect, test } from "bun:test";
import DataGrid from "../data-grid.js";
import { ArrayDataSource } from "../src/data-source.js";

const rows = Array.from({ length: 30 }, (_, i) => ({
    id: i + 1,
    name: `row${i}`,
    status: i % 2 ? "active" : "archived",
}));

async function makeReadyGrid(opts = {}, data = rows) {
    DataGrid.unregisterPlugins();
    const inst = new DataGrid({ ...opts, dataSource: new ArrayDataSource(data) });
    document.body.appendChild(inst);
    await new Promise((resolve) => {
        inst.addEventListener("connected", resolve, { once: true });
        setTimeout(resolve, 2000);
    });
    return inst;
}

function listen(inst) {
    const received = [];
    inst.addEventListener("querychange", (event) => received.push(event.detail.query));
    return received;
}

test("setQuery emits querychange with the normalized snapshot", async () => {
    const inst = await makeReadyGrid({ columns: [{ field: "name" }, { field: "status" }] });
    const received = listen(inst);

    await inst.setQuery({ search: "row1" });

    expect(received.length).toBe(1);
    expect(received[0].search).toBe("row1");
    expect(received[0].page).toBe(1);
    expect(received[0]).toEqual(inst.query);

    // Mutating the snapshot never affects the grid.
    received[0].search = "mutated";
    received[0].filters.injected = { operator: "eq", value: "x" };
    expect(inst.query.search).toBe("row1");
    expect(inst.query.filters.injected).toBeUndefined();
    document.body.removeChild(inst);
});

test("setQuery filters emit a normalized snapshot and reset the page", async () => {
    const inst = await makeReadyGrid({ columns: [{ field: "name" }] });
    const received = listen(inst);

    await inst.setQuery({ page: 2 });
    expect(received.length).toBe(1);
    expect(received[0].page).toBe(2);

    await inst.setQuery({ filters: { name: "row1" } });
    expect(received.length).toBe(2);
    expect(received[1].page).toBe(1);
    expect(received[1].filters).toEqual({ name: { operator: "contains", value: "row1" } });
    document.body.removeChild(inst);
});

test("resetQuery emits querychange", async () => {
    const inst = await makeReadyGrid({
        columns: [{ field: "name" }],
        initialQuery: { pageSize: 10 },
    });
    const received = listen(inst);

    await inst.setQuery({ search: "row1" });
    await inst.resetQuery();

    expect(received.length).toBe(2);
    expect(received[1].search).toBe("");
    expect(received[1]).toEqual(inst.query);
    document.body.removeChild(inst);
});

test("setQuery in lazy mode emits querychange without loading", async () => {
    DataGrid.unregisterPlugins();
    const ds = new ArrayDataSource(rows);
    let loads = 0;
    const original = ds.load.bind(ds);
    ds.load = (...args) => {
        loads++;
        return original(...args);
    };
    const inst = new DataGrid({ columns: [{ field: "name" }], loading: "lazy", dataSource: ds });
    document.body.appendChild(inst);
    await new Promise((resolve) => {
        inst.addEventListener("connected", resolve, { once: true });
        setTimeout(resolve, 2000);
    });
    expect(loads).toBe(0);

    const received = listen(inst);
    await inst.setQuery({ search: "row1" });

    expect(loads).toBe(0);
    expect(received.length).toBe(1);
    expect(received[0].search).toBe("row1");
    document.body.removeChild(inst);
});

test("restoreQuery, refresh and load never emit querychange", async () => {
    const inst = await makeReadyGrid({ columns: [{ field: "name" }] });
    const received = listen(inst);

    inst.restoreQuery({ page: 1, pageSize: 10, search: "row1", sort: [], filters: {} });
    await inst.refresh();
    await inst.load();

    expect(received).toEqual([]);
    // The restored state is still applied without notification.
    expect(inst.query.search).toBe("row1");
    document.body.removeChild(inst);
});

test("a mutation that leaves the normalized query identical stays silent", async () => {
    const inst = await makeReadyGrid({ columns: [{ field: "name" }] });
    const received = listen(inst);

    await inst.setQuery({ search: "row1" });
    // Same search, and a page already at 1: nothing changes.
    await inst.setQuery({ search: "row1" });
    await inst.setQuery({ page: 1 });
    expect(received.length).toBe(1);

    await inst.resetQuery();
    // Already at the initial state.
    await inst.resetQuery();
    expect(received.length).toBe(2);
    expect(received[1].search).toBe("");
    document.body.removeChild(inst);
});
