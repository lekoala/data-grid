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

test("options are registed", () => {
    const inst = makeInst({
        perPage: 20,
    });
    expect(inst.options.perPage).toBe(20);
    const inst2 = makeInst();
    expect(inst2.options.perPage).toBe(10);
});

test("it can set labels", async () => {
    DataGrid.setLabels({
        items: "rows",
    });

    const inst = makeInst();
    document.body.appendChild(inst);

    await new Promise((resolve) => {
        setTimeout(() => {
            expect(inst.textContent.includes("rows")).toBeTruthy();
            expect(inst.textContent.includes("items")).toBeFalsy();
            resolve();
        }, 50);
    });
});

test("it can register plugins", () => {
    expect(Object.keys(DataGrid.registeredPlugins()).length > 0).toBeTruthy();
    DataGrid.unregisterPlugins();
    expect(Object.keys(DataGrid.registeredPlugins()).length).toBe(0);
});
