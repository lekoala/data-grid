import { expect, test } from "bun:test";
import DataGrid from "../data-grid.js";

/**
 * Create a connected grid instance, ready for assertions
 * @param {Object} opts
 * @param {Array|null} data
 * @returns {Promise<DataGrid>}
 */
async function makeReadyGrid(opts = {}, data = null) {
    const inst = new DataGrid(opts);
    if (data !== null) {
        inst.preload({ data });
    }
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

test("it is registered", () => {
    const inst = customElements.get("data-grid");
    expect(inst).toBe(DataGrid);
});

test("row cells get the correct aria-colindex", async () => {
    const inst = await makeReadyGrid(
        {
            columns: [
                { field: "name", title: "Name" },
                { field: "age", title: "Age" },
            ],
        },
        [{ name: "Alice", age: 30 }],
    );

    const tds = inst.querySelectorAll("tbody tr td[aria-colindex]");
    expect(tds[0].getAttribute("aria-colindex")).toBe("1");
    expect(tds[1].getAttribute("aria-colindex")).toBe("2");
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

test("clicking a sortable header toggles aria-sort and sorts rows", async () => {
    const inst = await makeReadyGrid(
        {
            columns: [{ field: "name", title: "Name" }],
            sort: true,
        },
        [{ name: "b" }, { name: "a" }],
    );

    const th = inst.querySelector("thead tr.dg-head-columns th[aria-sort]");
    expect(th).toBeTruthy();

    th.click();
    expect(th.getAttribute("aria-sort")).toBe("ascending");
    expect(inst.querySelector("tbody tr td").textContent).toBe("a");

    th.click();
    expect(th.getAttribute("aria-sort")).toBe("descending");
    expect(inst.querySelector("tbody tr td").textContent).toBe("b");
    removeGrid(inst);
});

test("sortable header reacts to Enter and Space", async () => {
    const inst = await makeReadyGrid(
        {
            columns: [{ field: "name", title: "Name" }],
            sort: true,
        },
        [{ name: "b" }, { name: "a" }],
    );

    const th = inst.querySelector("thead tr.dg-head-columns th[aria-sort]");
    th.dispatchEvent(new KeyboardEvent("keydown", { key: "Enter" }));
    expect(th.getAttribute("aria-sort")).toBe("ascending");
    th.dispatchEvent(new KeyboardEvent("keydown", { key: " " }));
    expect(th.getAttribute("aria-sort")).toBe("descending");
    removeGrid(inst);
});

test("clearFilters clears the filter inputs", async () => {
    const inst = await makeReadyGrid(
        {
            columns: [{ field: "name", title: "Name" }],
            filter: true,
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
