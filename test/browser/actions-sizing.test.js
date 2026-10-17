import { afterAll, beforeAll, expect, test } from "bun:test";
import { ensureServer, IS_CHROME_BACKEND, read, stopServer, view, waitFor } from "./helpers.js";

beforeAll(ensureServer);
afterAll(stopServer);
const TIMEOUT = 15000;

const SETUP = `(async () => {
    const Grid = customElements.get("data-grid");
    const style = document.createElement("style");
    style.textContent = ".x-action { display: inline-flex; border: 3px solid black; padding: 4px 2rem; white-space: nowrap; box-shadow: 3px 3px black; } .x-wide { padding: 4px 3rem; } .x-narrow { padding: 4px .5rem; }";
    document.head.append(style);
    Grid.setDefaultControlClasses({ action: "x-action" });
    const rows = [
        { id: 1, name: "Ada", $actions: [{ name: "view", label: "View" }, { name: "delete", label: "Delete" }] },
        { id: 2, name: "Grace", $actions: [{ name: "download", label: "Download invoice as CSV" }] },
    ];
    const grid = new Grid({
        columns: [{ field: "name" }], rowActions: true, filterable: true,
        dataSource: { async load(query) { return { rows: query.search ? rows.slice(0, 1) : rows, total: query.search ? 1 : 2 }; } },
    });
    grid.style.width = "800px";
    grid.id = "action-sizing";
    window.actionGrid = grid;
    const connected = new Promise((resolve) => grid.addEventListener("connected", resolve, { once: true }));
    document.body.append(grid);
    await connected;
})()`;

// Chrome-only: these assertions deliberately inspect physical pixel geometry.
for (const dir of ["ltr", "rtl"]) {
    test.skipIf(!IS_CHROME_BACKEND)(
        `host action widths retain end padding and shadow room in ${dir}`,
        async () => {
            await using v = view();
            await v.navigate(`${ensureServer()}/test/browser/fixtures/host-controls.html`);
            await waitFor(v, 'document.querySelector("#host .dg-search")');
            await v.evaluate(SETUP);
            await v.evaluate(`window.actionGrid.setAttribute("dir", "${dir}")`);
            const fits = `(() => {
            const grid = window.actionGrid;
            const cells = Array.from(grid.querySelectorAll('tbody > tr.dg-data-row > td[data-column-id="$actions"]'));
            return cells.length > 0 && cells.every((cell) => {
                const last = Array.from(cell.querySelectorAll("[data-action]")).at(-1);
                const control = last.getBoundingClientRect();
                const bounds = cell.getBoundingClientRect();
                const style = getComputedStyle(cell);
                const gap = ${dir === "rtl" ? "control.left - bounds.left" : "bounds.right - control.right"};
                const padding = parseFloat(style.${dir === "rtl" ? "paddingLeft" : "paddingRight"});
                return gap >= padding - 1 && gap >= 3;
            });
        })()`;
            await waitFor(v, fits);
            expect(await read(v, fits)).toBe(true);
            expect(
                await read(
                    v,
                    `(() => {
            const grid = window.actionGrid;
            const widths = Array.from(grid.querySelectorAll('[data-column-id="$actions"]')).map((cell) => cell.getAttribute("width"));
            return widths.every((width) => width === String(grid.getColumnById("$actions").width));
        })()`,
                ),
            ).toBe(true);
            const initialWidth = await read(v, 'window.actionGrid.getColumnById("$actions").width');
            await v.evaluate('customElements.get("data-grid").setDefaultControlClasses({ action: "x-action x-wide" })');
            await waitFor(v, `window.actionGrid.getColumnById("$actions").width > ${initialWidth}`);
            await waitFor(v, fits);
            await v.evaluate(
                '(() => { window.actionGrid.querySelector("tbody [data-action]").focus(); window.actionGrid.controlClasses = { action: "x-action x-narrow" }; })()',
            );
            await waitFor(v, `window.actionGrid.getColumnById("$actions").width < ${initialWidth}`);
            expect(
                await read(v, 'document.activeElement === window.actionGrid.querySelector("tbody [data-action]")'),
            ).toBe(true);
            await waitFor(v, fits);
            await v.evaluate('window.actionGrid.setQuery({ search: "Ada" })');
            await waitFor(v, "window.actionGrid.rows.length === 1 && !window.actionGrid.loading");
            await waitFor(v, fits);
            // A hidden grid keeps its estimate, then measures once it is visible.
            await v.evaluate(`(async () => {
            window.actionGrid.hidden = true;
            await window.actionGrid.setQuery({ search: "" });
            window.actionGrid.controlClasses = { action: "x-action x-wide" };
            window.actionGrid.hidden = false;
        })()`);
            await waitFor(v, `window.actionGrid.getColumnById("$actions").width > ${initialWidth}`);
            await waitFor(v, fits);
        },
        TIMEOUT,
    );
}
