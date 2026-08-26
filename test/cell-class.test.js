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

const data = [
    { name: "alpha", active: true, change: 12.4 },
    { name: "beta", active: false, change: -3.1 },
];

test("a static cellClass applies to body cells only", async () => {
    const inst = await makeReadyGrid({ columns: [{ field: "name", title: "Name", cellClass: "monetary" }] }, data);
    expect(inst.querySelector('tbody td[data-column-id="name"]').classList.contains("monetary")).toBe(true);
    expect(inst.querySelector('thead th[data-column-id="name"]').classList.contains("monetary")).toBe(false);
    removeGrid(inst);
});

test("a cellClass function receives the full cell context", async () => {
    /** @type {Array<any>} */
    const seen = [];
    const inst = await makeReadyGrid(
        {
            columns: [
                {
                    field: "change",
                    cellClass: (/** @type {any} */ ctx) => {
                        seen.push(ctx);
                        return "";
                    },
                },
            ],
        },
        data,
    );
    expect(seen.length).toBe(2);
    expect(seen[0].grid).toBe(inst);
    expect(seen[0].column.field).toBe("change");
    expect(seen[0].row).toBe(data[0]);
    expect(seen[0].rowIndex).toBe(0);
    expect(seen[0].value).toBe(12.4);
    expect(seen[0].tr.tagName).toBe("TR");
    removeGrid(inst);
});

test("falsy and whitespace-only returns add nothing and never throw", async () => {
    const base = await makeReadyGrid({ columns: [{ field: "name" }] }, data);
    const expected = /** @type {HTMLElement} */ (base.querySelector('tbody td[data-column-id="name"]')).className;
    removeGrid(base);
    for (const cellClass of [null, undefined, "", "   ", () => null, () => undefined, () => "", () => "   "]) {
        const inst = await makeReadyGrid({ columns: [{ field: "name", cellClass }] }, data);
        const td = /** @type {HTMLElement} */ (inst.querySelector('tbody td[data-column-id="name"]'));
        expect(td.className).toBe(expected);
        removeGrid(inst);
    }
});

test("multiple classes are added from a single space-separated string", async () => {
    const inst = await makeReadyGrid(
        { columns: [{ field: "name", cellClass: ({ value }) => `tag-${value} extra` }] },
        data,
    );
    const td = inst.querySelector('tbody td[data-column-id="name"]');
    expect(td.classList.contains("tag-alpha")).toBe(true);
    expect(td.classList.contains("extra")).toBe(true);
    removeGrid(inst);
});

test("cellClass composes with a formatter to drive its color hook", async () => {
    const inst = await makeReadyGrid(
        {
            columns: [
                {
                    field: "active",
                    format: "boolean",
                    cellClass: ({ value }) => (value ? "is-positive" : "is-muted"),
                },
            ],
        },
        data,
    );
    const positive = inst.querySelector('tbody tr[data-row-index="0"] td[data-column-id="active"]');
    const muted = inst.querySelector('tbody tr[data-row-index="1"] td[data-column-id="active"]');
    expect(positive.classList.contains("is-positive")).toBe(true);
    expect(muted.classList.contains("is-muted")).toBe(true);
    // The formatter stays neutral: state + semantics, presentation is CSS.
    expect(positive.querySelector("span.dg-boolean").dataset.value).toBe("true");
    expect(muted.querySelector("span.dg-boolean").dataset.value).toBe("false");
    removeGrid(inst);
});

test("cellClass composes with renderCell", async () => {
    const inst = await makeReadyGrid(
        {
            columns: [
                {
                    field: "active",
                    cellClass: ({ value }) => `status-${value ? "ok" : "ko"}`,
                    renderCell: ({ value }) => (value ? "on" : "off"),
                },
            ],
        },
        data,
    );
    const td = inst.querySelector('tbody tr[data-row-index="0"] td[data-column-id="active"]');
    expect(td.textContent).toBe("on");
    expect(td.classList.contains("status-ok")).toBe(true);
    removeGrid(inst);
});

test("cellClass is re-evaluated when rows re-render", async () => {
    const rows = [{ name: "alpha", flag: true }];
    const inst = await makeReadyGrid(
        { columns: [{ field: "name", cellClass: ({ row }) => (row.flag ? "on" : "off") }] },
        rows,
    );
    expect(inst.querySelector('tbody td[data-column-id="name"]').classList.contains("on")).toBe(true);

    rows[0].flag = false;
    await inst.load();
    expect(inst.querySelector('tbody td[data-column-id="name"]').classList.contains("off")).toBe(true);
    removeGrid(inst);
});
