import { expect, test } from "bun:test";
import DataGrid from "../data-grid.js";
import { ArrayDataSource } from "../src/data-source.js";

/**
 * Create a connected grid instance, ready for assertions
 * @param {Object} opts
 * @param {Array|null} data
 * @returns {Promise<DataGrid>}
 */
async function makeReadyGrid(opts = {}, data = null) {
    const options = { ...opts };
    if (data !== null) {
        options.dataSource = new ArrayDataSource(data);
    }
    const inst = new DataGrid(options);
    document.body.appendChild(inst);
    await new Promise((resolve) => {
        inst.addEventListener("connected", resolve, { once: true });
        // Fallback if the connected event never fires
        setTimeout(resolve, 2000);
    });
    return inst;
}

function removeGrid(inst) {
    document.body.removeChild(inst);
}

const tick = () => new Promise((resolve) => setTimeout(resolve, 0));

test("it is registered", () => {
    const inst = customElements.get("data-grid");
    expect(inst).toBe(DataGrid);
});

test("cells carry a stable data-column-id", async () => {
    const inst = await makeReadyGrid(
        {
            columns: [
                { field: "name", title: "Name" },
                { field: "age", title: "Age" },
            ],
        },
        [{ name: "Alice", age: 30 }],
    );

    const tds = inst.querySelectorAll("tbody tr td[data-column-id]");
    expect(tds[0].getAttribute("data-column-id")).toBe("name");
    expect(tds[1].getAttribute("data-column-id")).toBe("age");
    removeGrid(inst);
});

test("reconnecting the element does not duplicate the template", async () => {
    const inst = await makeReadyGrid({}, []);
    expect(inst.querySelectorAll("table").length).toBe(1);

    // Disconnect and wait for the disconnected callback to complete
    removeGrid(inst);
    await new Promise((resolve) => setTimeout(resolve, 50));

    // Reconnect
    document.body.appendChild(inst);
    await new Promise((resolve) => {
        inst.addEventListener("connected", resolve, { once: true });
        setTimeout(resolve, 2000);
    });

    expect(inst.querySelectorAll("table").length).toBe(1);
    removeGrid(inst);
});

test("clicking the sort button toggles aria-sort/data-sort and sorts rows", async () => {
    const inst = await makeReadyGrid(
        {
            columns: [{ field: "name", title: "Name" }],
            sortable: true,
        },
        [{ name: "b" }, { name: "a" }],
    );

    const th = inst.querySelector("thead tr.dg-head-columns th.dg-sortable");
    const button = th.querySelector("button");
    const indicator = button.querySelector(".dg-sort-indicator");
    expect(button).toBeTruthy();
    expect(indicator).toBeTruthy();
    // Decorative glyph: always present, kept out of the accessibility tree
    expect(indicator.getAttribute("aria-hidden")).toBe("true");
    // The glyph is drawn in CSS: the element stays empty, state lives on the th
    expect(indicator.textContent).toBe("");
    expect(th.hasAttribute("aria-sort")).toBe(false);
    expect(th.hasAttribute("data-sort")).toBe(false);

    button.click();
    expect(th.getAttribute("aria-sort")).toBe("ascending");
    expect(th.getAttribute("data-sort")).toBe("asc");
    expect(indicator.textContent).toBe("");
    await tick();
    expect(inst.querySelector("tbody tr td").textContent).toBe("a");

    button.click();
    expect(th.getAttribute("aria-sort")).toBe("descending");
    expect(th.getAttribute("data-sort")).toBe("desc");
    expect(indicator.textContent).toBe("");
    await tick();
    expect(inst.querySelector("tbody tr td").textContent).toBe("b");

    button.click();
    expect(th.hasAttribute("aria-sort")).toBe(false);
    expect(th.hasAttribute("data-sort")).toBe(false);
    expect(indicator.textContent).toBe("");
    removeGrid(inst);
});

test("sortable header button is the tab stop and a click activates sorting", async () => {
    const inst = await makeReadyGrid(
        {
            columns: [{ field: "name", title: "Name" }],
            sortable: true,
        },
        [{ name: "b" }, { name: "a" }],
    );

    const th = inst.querySelector("thead tr.dg-head-columns th.dg-sortable");
    const button = th.querySelector("button[type=button]");
    expect(button.tabIndex).toBe(0); // native tab stop

    // Native buttons activate on Enter/Space by firing a click
    button.dispatchEvent(new Event("click"));
    expect(th.getAttribute("aria-sort")).toBe("ascending");
    removeGrid(inst);
});

test("a column with sortable: false cannot be sorted, even programmatically", async () => {
    const inst = await makeReadyGrid(
        {
            columns: [
                { field: "name", title: "Name" },
                { field: "age", title: "Age", sortable: false },
            ],
            sortable: true,
        },
        [
            { name: "b", age: 2 },
            { name: "a", age: 1 },
        ],
    );

    const headers = inst.querySelectorAll("thead tr.dg-head-columns th");
    expect(headers[0].querySelector(".dg-sort")).toBeTruthy();
    expect(headers[1].querySelector(".dg-sort")).toBeNull();
    expect(headers[1].classList.contains("dg-not-sortable")).toBe(true);

    // The programmatic API respects the column capability too
    await inst.sortAsc("age");
    expect(inst.query.sort).toEqual([]);
    removeGrid(inst);
});

test("scalar options are reflected as curated HTML attributes", async () => {
    const inst = await makeReadyGrid(
        {
            columns: [{ field: "name", title: "Name" }],
        },
        [{ name: "a" }],
    );

    inst.setAttribute("row-key", "UserID");
    inst.setAttribute("select-visible-only", "false");
    inst.setAttribute("responsive-toggle", "false");
    inst.setAttribute("collapse-actions", "");
    inst.setAttribute("save-state", "");
    inst.setAttribute("no-data", "No users");
    inst.setAttribute("error-message", "Unable to load");
    inst.setAttribute("page-sizes", "10,25,50");

    expect(inst.options.rowKey).toBe("UserID");
    expect(inst.options.selectVisibleOnly).toBe(false);
    expect(inst.options.responsiveToggle).toBe(false);
    expect(inst.options.collapseActions).toBe(true);
    expect(inst.options.saveState).toBe(true);
    expect(inst.options.noData).toBe("No users");
    expect(inst.options.errorMessage).toBe("Unable to load");
    expect(inst.options.pageSizes).toEqual([10, 25, 50]);
    removeGrid(inst);
});

test("clearFilters clears the filter inputs", async () => {
    const inst = await makeReadyGrid(
        {
            columns: [{ field: "name", title: "Name" }],
            filterable: true,
        },
        [{ name: "Alice" }],
    );

    const input = inst.querySelector(".dg-head-filters input");
    expect(input).toBeTruthy();
    input.value = "zzz";
    inst.clearFilters();
    expect(input.value).toBe("");
    removeGrid(inst);
});

test("setQuery resets page to 1 on population change unless page is provided", async () => {
    const inst = await makeReadyGrid(
        { initialQuery: { pageSize: 10 } },
        Array.from({ length: 30 }, (_, i) => ({ id: i + 1, name: `row${i}` })),
    );

    await inst.setQuery({ page: 3 });
    expect(inst.query.page).toBe(3);

    // pageSize change resets to page 1
    await inst.setQuery({ pageSize: 5 });
    expect(inst.query.page).toBe(1);

    // page-only change keeps the page
    await inst.setQuery({ page: 2 });
    expect(inst.query.page).toBe(2);

    // explicit page is respected alongside a filter change
    await inst.setQuery({ filters: { name: { operator: "contains", value: "row" } }, page: 4 });
    expect(inst.query.page).toBe(4);
    removeGrid(inst);
});

test("inferring columns from the first load rebuilds the table structure", async () => {
    const inst = await makeReadyGrid({}, []);

    // Initial empty state: no columns, but never an invalid colspan
    expect(inst.options.columns).toHaveLength(0);
    expect(inst.tfoot?.querySelector("td")?.colSpan).toBeGreaterThanOrEqual(1);

    // First load infers the schema and rebuilds header + footer
    inst.dataSource = new ArrayDataSource([
        { id: 1, name: "a" },
        { id: 2, name: "b" },
    ]);
    await inst.refresh();

    expect(inst.options.columns.map((c) => c.field)).toEqual(["id", "name"]);
    expect(inst.querySelectorAll("thead tr.dg-head-columns th")).toHaveLength(2);
    expect(inst.querySelector("tbody tr").querySelectorAll("td")).toHaveLength(2);
    expect(inst.tfoot?.querySelector("td")?.colSpan).toBe(2);

    // Clearing the data keeps the schema and the structure
    inst.dataSource = new ArrayDataSource([]);
    await inst.refresh();
    expect(inst.options.columns.map((c) => c.field)).toEqual(["id", "name"]);
    expect(inst.querySelectorAll("thead tr.dg-head-columns th")).toHaveLength(2);

    // Reloading again keeps the same structure, no duplicate columns
    inst.dataSource = new ArrayDataSource([{ id: 3, name: "c" }]);
    await inst.refresh();
    expect(inst.querySelectorAll("thead tr.dg-head-columns th")).toHaveLength(2);
    expect(inst.querySelectorAll('thead tr.dg-head-columns th[data-column-id="id"]')).toHaveLength(1);
    removeGrid(inst);
});
