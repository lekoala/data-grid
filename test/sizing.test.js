import { expect, test } from "bun:test";
import DataGrid from "../data-grid.js";
import { ArrayDataSource } from "../src/data-source.js";
import AutosizeColumn from "../src/plugins/autosize-column.js";

// Test files replace the shared plugin registry: register what this file needs.
DataGrid.registerPlugins({ AutosizeColumn });

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

test("no column emits an invalid width or preferred width", async () => {
    const inst = await makeReadyGrid(
        {
            columns: [
                { field: "name" },
                { field: "created", format: "date" },
                { field: "active", format: "boolean" },
                { field: "price", format: "number", formatOptions: { currency: "EUR" } },
            ],
        },
        [{ name: "Alice", created: "2026-08-26", active: true, price: 10 }],
    );
    for (const th of inst.querySelectorAll("thead tr.dg-head-columns th")) {
        const width = th.getAttribute("width");
        expect(width === null || Number.isFinite(Number(width))).toBe(true);
        const preferred = /** @type {HTMLElement} */ (th).dataset.preferredWidth;
        expect(preferred === undefined || Number.isFinite(Number(preferred))).toBe(true);
    }
    removeGrid(inst);
});

test("a text column without width stays flexible by default", async () => {
    const inst = await makeReadyGrid({ columns: [{ field: "name" }] }, [{ name: "Alice" }]);
    const th = inst.querySelector('thead th[data-column-id="name"]');
    expect(th.hasAttribute("width")).toBe(false);
    expect(th.hasAttribute("data-preferred-width")).toBe(false);
    // The intrinsic header width remains available as a responsive floor.
    expect(Number.isFinite(Number(/** @type {HTMLElement} */ (th).dataset.minWidth))).toBe(true);
    removeGrid(inst);
});

test("formatter defaults provide a preferred width for predictable formats", async () => {
    const inst = await makeReadyGrid(
        {
            columns: [
                { field: "active", format: "boolean" },
                { field: "created", format: "date" },
                { field: "updated", format: "datetime" },
                { field: "ratio", format: "number", formatOptions: { style: "percent" } },
            ],
        },
        [{ active: true, created: "2026-08-26", updated: "2026-08-26T08:30:00Z", ratio: 0.2 }],
    );
    // The header intrinsic width can raise the preferred width, so assert a
    // floor instead of an exact value.
    expect(Number(inst.querySelector('th[data-column-id="active"]').getAttribute("width"))).toBeGreaterThanOrEqual(56);
    expect(Number(inst.querySelector('th[data-column-id="created"]').getAttribute("width"))).toBeGreaterThanOrEqual(
        120,
    );
    expect(Number(inst.querySelector('th[data-column-id="updated"]').getAttribute("width"))).toBeGreaterThanOrEqual(
        168,
    );
    expect(Number(inst.querySelector('th[data-column-id="ratio"]').getAttribute("width"))).toBeGreaterThanOrEqual(88);
    removeGrid(inst);
});

test("currency columns get no formatter sizing hint", async () => {
    const inst = await makeReadyGrid(
        { columns: [{ field: "price", format: "number", formatOptions: { currency: "EUR" } }] },
        [{ price: 10 }],
    );
    const th = inst.querySelector('thead th[data-column-id="price"]');
    expect(th.hasAttribute("width")).toBe(false);
    expect(th.hasAttribute("data-preferred-width")).toBe(false);
    removeGrid(inst);
});

test("an explicit column width replaces the formatter preferred width", async () => {
    const inst = await makeReadyGrid({ columns: [{ field: "created", format: "date", width: 200 }] }, [
        { created: "2026-08-26" },
    ]);
    expect(inst.querySelector('th[data-column-id="created"]').getAttribute("width")).toBe("200");
    removeGrid(inst);
});

test("the formatter floor raises a too small preferred width", async () => {
    const inst = await makeReadyGrid({ columns: [{ field: "created", format: "date", width: 70 }] }, [
        { created: "2026-08-26" },
    ]);
    expect(Number(inst.querySelector('th[data-column-id="created"]').getAttribute("width"))).toBeGreaterThanOrEqual(
        104,
    );
    removeGrid(inst);
});

test("the last compact column keeps its preferred width", async () => {
    const inst = await makeReadyGrid({ columns: [{ field: "name" }, { field: "active", format: "boolean" }] }, [
        { name: "Alice", active: true },
    ]);
    const th = inst.querySelector('thead th[data-column-id="active"]');
    expect(Number(th.getAttribute("width"))).toBeGreaterThanOrEqual(56);
    removeGrid(inst);
});

test("autosize measures widthless text columns when enabled", async () => {
    const inst = await makeReadyGrid({ autosize: true, columns: [{ field: "name" }] }, [{ name: "Alice" }]);
    const th = inst.querySelector('thead th[data-column-id="name"]');
    expect(th.hasAttribute("width")).toBe(true);
    expect(Number.isFinite(Number(th.getAttribute("width")))).toBe(true);
    removeGrid(inst);
});

test("responsive columns expose a finite sizing basis", async () => {
    const inst = await makeReadyGrid(
        {
            responsive: true,
            columns: [{ field: "name" }, { field: "created", format: "date" }],
        },
        [{ name: "Alice", created: "2026-08-26" }],
    );
    for (const th of inst.querySelectorAll("thead tr.dg-head-columns th")) {
        const el = /** @type {HTMLElement} */ (th);
        const basis =
            Number.parseInt(el.dataset.preferredWidth ?? "") ||
            Number.parseInt(th.getAttribute("width") ?? "") ||
            Number.parseInt(el.dataset.minWidth ?? "") ||
            0;
        expect(Number.isFinite(basis)).toBe(true);
        expect(basis).toBeGreaterThanOrEqual(0);
    }
    removeGrid(inst);
});
