import { expect, test } from "bun:test";
import DataGrid from "../data-grid.js";

/**
 * @returns {import("../src/data-grid.js").default}
 */
function getGrid() {
    //@ts-expect-error
    return customElements.get("data-grid");
}

/**
 * @returns {DataGrid}
 */
function makeInst(opts = {}) {
    const ctor = getGrid();
    // @ts-expect-error
    return new ctor(opts);
}

// Need this otherwise it fails?
globalThis.Event = window.Event;
globalThis.CustomEvent = window.CustomEvent;

test("it is registered", () => {
    expect(makeInst() instanceof DataGrid).toBeTruthy();
});

test("options are registered", () => {
    const inst = makeInst({
        src: "/api/users",
    });
    expect(inst.options.src).toBe("/api/users");
    const inst2 = makeInst();
    expect(inst2.query.pageSize).toBe(10);
});

function resetLabels() {
    DataGrid.setLabels({
        pageRange: "{from} - {to} of {total} items",
        resultCount: "{count} items",
        selectedCount: "{count} selected",
        noData: "No data",
    });
}

test("it can set labels", async () => {
    DataGrid.setLabels({
        pageRange: "{from} - {to} of {total} rows",
        resultCount: "{count} rows",
    });

    const inst = makeInst();
    document.body.appendChild(inst);

    await new Promise((resolve) => {
        setTimeout(() => {
            try {
                expect(inst.textContent.includes("rows")).toBeTruthy();
                expect(inst.textContent.includes("items")).toBeFalsy();
            } finally {
                resolve();
            }
        }, 50);
    });
    document.body.removeChild(inst);
    resetLabels();
});

test("setLabels updates connected instances at runtime", async () => {
    const inst = makeInst();
    document.body.appendChild(inst);

    await new Promise((resolve) => {
        setTimeout(() => {
            try {
                DataGrid.setLabels({ noData: "Nothing here" });
                expect(inst.labels.noData).toBe("Nothing here");
                expect(inst.querySelector(".dg-status").textContent).toBe("Nothing here");
            } finally {
                resolve();
            }
        }, 50);
    });
    document.body.removeChild(inst);
    resetLabels();
});

test("loadLabels fetches and applies labels", async () => {
    const originalFetch = globalThis.fetch;
    globalThis.fetch = async () => ({
        ok: true,
        status: 200,
        json: async () => ({ noData: "Nada" }),
    });
    try {
        const loaded = await DataGrid.loadLabels("/i18n/fr.json");
        expect(loaded.noData).toBe("Nada");
        expect(DataGrid.getLabels().noData).toBe("Nada");
    } finally {
        globalThis.fetch = originalFetch;
        resetLabels();
    }
});

test("it can register plugins", () => {
    expect(Object.keys(DataGrid.registeredPlugins()).length > 0).toBeTruthy();
    DataGrid.unregisterPlugins();
    expect(Object.keys(DataGrid.registeredPlugins()).length).toBe(0);
});
