import { expect, test } from "bun:test";
import DataGrid from "../data-grid.js";
import { ArrayDataSource } from "../src/data-source.js";
import BulkActions from "../src/plugins/bulk-actions.js";
import SelectableRows from "../src/plugins/selectable-rows.js";

DataGrid.registerPlugins({ SelectableRows, BulkActions });

const rows = Array.from({ length: 30 }, (_, i) => ({ id: i + 1, name: `Person ${i}` }));

async function makeReadyGrid(opts = {}, data = rows) {
    const options = { ...opts };
    if (data !== null) {
        options.dataSource = new ArrayDataSource(data);
    }
    const inst = new DataGrid(options);
    document.body.appendChild(inst);
    await new Promise((resolve) => {
        inst.addEventListener("connected", resolve, { once: true });
        setTimeout(resolve, 2000);
    });
    return inst;
}

function removeGrid(inst) {
    document.body.removeChild(inst);
}

const flush = () => new Promise((resolve) => setTimeout(resolve, 20));

function typeInto(input, value) {
    input.value = value;
    input.dispatchEvent(new Event("input"));
}

test("searchable renders a labelled search input in the topbar end", async () => {
    const inst = await makeReadyGrid({ searchable: true });
    const input = inst.querySelector(".dg-search");
    expect(input).toBeTruthy();
    expect(input.type).toBe("search");
    expect(input.getAttribute("aria-label")).toBe("Search");
    expect(input.closest(".dg-topbar-end")).toBeTruthy();
    expect(input.closest(".dg-topbar")).toBeTruthy();
    removeGrid(inst);
});

test("a non-searchable grid has no search input and no topbar", async () => {
    const inst = await makeReadyGrid({});
    expect(inst.querySelector(".dg-search")).toBeNull();
    expect(inst.querySelector(".dg-topbar")).toBeNull();
    removeGrid(inst);
});

test("typing applies the search after the debounce and resets the page", async () => {
    const inst = await makeReadyGrid({ searchable: true, searchDelay: 0, pageSize: 10 });

    await inst.setQuery({ page: 2 });
    expect(inst.query.page).toBe(2);

    const input = inst.querySelector(".dg-search");
    typeInto(input, "Person 2");
    await flush();

    expect(inst.query.search).toBe("Person 2");
    expect(inst.query.page).toBe(1);
    expect(inst.total).toBe(11);
    expect(inst.rows.every((r) => r.name.includes("Person 2"))).toBe(true);
    removeGrid(inst);
});

test("minSearchLength gates the commit while keeping current results", async () => {
    const inst = await makeReadyGrid({ searchable: true, minSearchLength: 3, searchDelay: 0 });
    const input = inst.querySelector(".dg-search");

    typeInto(input, "Pe");
    await flush();
    expect(inst.query.search).toBe("");

    typeInto(input, "Per");
    await flush();
    expect(inst.query.search).toBe("Per");
    expect(inst.total).toBe(30); // every "Person N" row matches
    removeGrid(inst);
});

test("below minSearchLength the input can diverge from the query", async () => {
    const inst = await makeReadyGrid({ searchable: true, minSearchLength: 3, searchDelay: 0 });
    const input = inst.querySelector(".dg-search");

    typeInto(input, "Person 1");
    await flush();
    expect(inst.query.search).toBe("Person 1");

    typeInto(input, "Pe");
    await flush();
    // Input shows "Pe" but the query still matches the previous search
    expect(input.value).toBe("Pe");
    expect(inst.query.search).toBe("Person 1");
    expect(inst.total).toBe(11); // Person 1, 10..19
    removeGrid(inst);
});

test("Enter flushes the debounced search immediately", async () => {
    const inst = await makeReadyGrid({ searchable: true, searchDelay: 500 });
    const input = inst.querySelector(".dg-search");

    typeInto(input, "Person 3");
    expect(inst.query.search).toBe("");
    input.dispatchEvent(new KeyboardEvent("keydown", { key: "Enter" }));
    expect(inst.query.search).toBe("Person 3");
    await flush();
    expect(inst.total).toBe(1); // only "Person 3" matches (no row 30..39)
    removeGrid(inst);
});

test("Escape clears the search", async () => {
    const inst = await makeReadyGrid({ searchable: true, searchDelay: 0 });
    const input = inst.querySelector(".dg-search");

    typeInto(input, "Person 5");
    await flush();
    expect(inst.query.search).toBe("Person 5");

    input.dispatchEvent(new KeyboardEvent("keydown", { key: "Escape" }));
    expect(input.value).toBe("");
    expect(inst.query.search).toBe("");
    await flush();
    expect(inst.total).toBe(rows.length);
    removeGrid(inst);
});

test("setSearch and clearSearch update the query and the input", async () => {
    const inst = await makeReadyGrid({ searchable: true });
    const input = inst.querySelector(".dg-search");

    await inst.setSearch("Person 7");
    expect(inst.query.search).toBe("Person 7");
    expect(input.value).toBe("Person 7");
    expect(inst.rows.every((r) => r.name.includes("Person 7"))).toBe(true);

    await inst.clearSearch();
    expect(inst.query.search).toBe("");
    expect(input.value).toBe("");
    expect(inst.total).toBe(rows.length);
    removeGrid(inst);
});

test("changing the search clears the selection", async () => {
    const inst = await makeReadyGrid({ searchable: true, selectable: true, pageSize: 10 });
    const input = inst.querySelector(".dg-search");
    const first = inst.querySelector('tbody tr td[data-column-id="$selection"] input');

    first.checked = true;
    first.dispatchEvent(new Event("change"));
    expect(inst.getSelectionState().ids.size).toBe(1);

    typeInto(input, "Person 2");
    await flush();
    expect(inst.getSelectionState().ids.size).toBe(0);
    removeGrid(inst);
});

test("editing the search input clears the selection before the commit", async () => {
    const inst = await makeReadyGrid({ searchable: true, selectable: true, minSearchLength: 3, searchDelay: 500 });
    const input = inst.querySelector(".dg-search");
    const first = inst.querySelector('tbody tr td[data-column-id="$selection"] input');

    first.checked = true;
    first.dispatchEvent(new Event("change"));
    expect(inst.getSelectionState().ids.size).toBe(1);

    // Below min and never committed, yet the selection is already invalidated
    typeInto(input, "Pe");
    expect(inst.getSelectionState().ids.size).toBe(0);
    expect(inst.query.search).toBe("");
    removeGrid(inst);
});

test("bulk actions bar lives inside the topbar start", async () => {
    const inst = await makeReadyGrid({
        searchable: true,
        selectable: true,
        bulkActions: [{ name: "archive", label: "Archive" }],
    });

    const bar = inst.querySelector(".dg-bulk-actions");
    expect(bar).toBeTruthy();
    expect(bar.closest(".dg-topbar-start")).toBeTruthy();
    expect(inst.querySelector(".dg-search").closest(".dg-topbar-end")).toBeTruthy();
    removeGrid(inst);
});

test("toggling searchable at runtime adds and removes the search input", async () => {
    const inst = await makeReadyGrid({});
    expect(inst.querySelector(".dg-search")).toBeNull();

    inst.setAttribute("searchable", "");
    expect(inst.querySelector(".dg-search")).toBeTruthy();

    inst.removeAttribute("searchable");
    expect(inst.querySelector(".dg-search")).toBeNull();
    removeGrid(inst);
});
