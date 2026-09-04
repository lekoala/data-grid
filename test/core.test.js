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
        pageRange: "{from}–{to} / {total}",
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

test("connected instances update labels only when explicitly requested", async () => {
    const inst = makeInst();
    document.body.appendChild(inst);

    await new Promise((resolve) => {
        setTimeout(() => {
            try {
                DataGrid.setLabels({ noData: "Nothing here" });
                expect(inst.labels.noData).toBe("Nothing here");
                expect(inst.querySelector(".dg-status").textContent).toBe("No data");
                inst.updateLabels();
                expect(inst.querySelector(".dg-status").textContent).toBe("Nothing here");
            } finally {
                resolve();
            }
        }, 50);
    });
    document.body.removeChild(inst);
    resetLabels();
});

test("labels are applied as text and attributes, never parsed as template HTML", async () => {
    const malicious = '"><img src=x data-injected="true">';
    DataGrid.setLabels({ noData: malicious });
    const inst = makeInst();
    const connected = new Promise((resolve) => inst.addEventListener("connected", resolve, { once: true }));

    try {
        document.body.appendChild(inst);
        await connected;

        expect(inst.querySelector("[data-injected]")).toBeNull();
        expect(inst.tbody.getAttribute("data-empty-message")).toBe(malicious);
        expect(inst.querySelector(".dg-status").textContent).toBe(malicious);
    } finally {
        inst.remove();
        resetLabels();
    }
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

test("plugin registration merges by name and exposes a snapshot", () => {
    class FirstPlugin {}
    class ReplacementPlugin {}

    const builtIns = DataGrid.registeredPlugins();
    expect(Object.keys(builtIns).length > 0).toBeTruthy();

    DataGrid.registerPlugins({ TestPlugin: FirstPlugin });
    expect(DataGrid.registeredPlugins()).toEqual({ ...builtIns, TestPlugin: FirstPlugin });

    DataGrid.registerPlugins({ TestPlugin: ReplacementPlugin });
    const snapshot = DataGrid.registeredPlugins();
    expect(snapshot.TestPlugin).toBe(ReplacementPlugin);

    delete snapshot.TestPlugin;
    expect(DataGrid.registeredPlugins().TestPlugin).toBe(ReplacementPlugin);

    DataGrid.unregisterPlugins("TestPlugin");
    expect(DataGrid.registeredPlugins()).toEqual(builtIns);
});

test("the ESM entry does not create legacy globals", () => {
    expect(globalThis.DataGrid).toBeUndefined();
    expect(globalThis.ArrayDataSource).toBeUndefined();
    expect(globalThis.FetchDataSource).toBeUndefined();
});
