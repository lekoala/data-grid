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
    expect(button).toBeTruthy();
    expect(th.hasAttribute("aria-sort")).toBe(false);
    expect(th.hasAttribute("data-sort")).toBe(false);

    button.click();
    expect(th.getAttribute("aria-sort")).toBe("ascending");
    expect(th.getAttribute("data-sort")).toBe("asc");
    await tick();
    expect(inst.querySelector("tbody tr td").textContent).toBe("a");

    button.click();
    expect(th.getAttribute("aria-sort")).toBe("descending");
    expect(th.getAttribute("data-sort")).toBe("desc");
    await tick();
    expect(inst.querySelector("tbody tr td").textContent).toBe("b");

    button.click();
    expect(th.hasAttribute("aria-sort")).toBe(false);
    expect(th.hasAttribute("data-sort")).toBe(false);
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
