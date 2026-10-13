import { afterAll, beforeAll, expect, test } from "bun:test";
import { ensureServer, IS_WINDOWS, read, stopServer, view, waitFor } from "./helpers.js";

const TIMEOUT = 15000;

beforeAll(ensureServer);
afterAll(stopServer);

const SETUP = `(async () => {
    const { default: DataGrid, ArrayDataSource } = await import("/dist/data-grid.js");
    const grid = new DataGrid({
        columns: [{ field: "name", title: "Name" }],
        dataSource: new ArrayDataSource([{ name: "Acme" }, { name: "Globex" }]),
        searchable: true,
        searchDelay: 0,
    });
    const topbar = document.createElement("div");
    topbar.className = "dg-topbar";
    const summary = document.createElement("span");
    summary.id = "topbar-summary";
    summary.textContent = "2 items";
    topbar.append("Custom prefix ", summary);
    grid.appendChild(topbar);
    const connected = new Promise((resolve) => grid.addEventListener("connected", resolve, { once: true }));
    document.body.appendChild(grid);
    window.tgrid = grid;
    await connected;
})()`;

test.skipIf(IS_WINDOWS)(
    "a declarative topbar is normalized inside the frame",
    async () => {
        await using v = view();
        await v.navigate(`${ensureServer()}/test/browser/fixtures/grid.html`);
        await waitFor(v, "window.grid && window.grid.rows.length > 0");
        await v.evaluate(SETUP);
        await waitFor(v, "window.tgrid.querySelector('.dg-search')");

        expect(await read(v, "window.tgrid.querySelector(':scope > .dg-frame > .dg-topbar') !== null")).toBe(true);
        expect(
            await read(v, "window.tgrid.querySelector('.dg-frame').firstElementChild.classList.contains('dg-topbar')"),
        ).toBe(true);
        expect(
            await read(v, "window.tgrid.querySelector('#topbar-summary').closest('.dg-topbar-start') !== null"),
        ).toBe(true);
        expect(await read(v, "window.tgrid.querySelector('.dg-search').closest('.dg-topbar-end') !== null")).toBe(true);
    },
    TIMEOUT,
);

test.skipIf(IS_WINDOWS)(
    "declarative content and search survive a reconnect",
    async () => {
        await using v = view();
        await v.navigate(`${ensureServer()}/test/browser/fixtures/grid.html`);
        await waitFor(v, "window.grid && window.grid.rows.length > 0");
        await v.evaluate(SETUP);
        await waitFor(v, "window.tgrid.querySelector('.dg-search')");

        await v.evaluate(`(async () => {
            const grid = window.tgrid;
            grid.remove();
            await new Promise((r) => setTimeout(r, 50));
            const connected = new Promise((resolve) => grid.addEventListener("connected", resolve, { once: true }));
            document.body.appendChild(grid);
            await connected;
        })()`);
        await waitFor(v, "window.tgrid.rows.length > 0");

        expect(await read(v, "window.tgrid.querySelector('#topbar-summary') !== null")).toBe(true);
        await v.evaluate(`(() => window.tgrid.setSearch("Acme"))()`);
        await waitFor(v, "window.tgrid.query.search === 'Acme' && window.tgrid.rows.length === 1");
        expect(await read(v, "window.tgrid.rows[0].name")).toBe("Acme");
    },
    TIMEOUT,
);

const FOCUS_SETUP = `(async () => {
    const { default: DataGrid, ArrayDataSource } = await import("/dist/data-grid.js");
    const grid = new DataGrid({
        columns: [{ field: "name", title: "Name" }],
        dataSource: new ArrayDataSource([{ name: "Acme" }, { name: "Globex" }]),
        searchable: true,
        searchDelay: 0,
    });
    const topbar = document.createElement("div");
    topbar.className = "dg-topbar";
    const action = document.createElement("button");
    action.type = "button";
    action.id = "topbar-action";
    action.textContent = "Export";
    topbar.append(action);
    window.__topbarClicks = 0;
    action.addEventListener("click", () => {
        window.__topbarClicks += 1;
    });
    grid.appendChild(topbar);
    const connected = new Promise((resolve) => grid.addEventListener("connected", resolve, { once: true }));
    document.body.appendChild(grid);
    window.tgrid = grid;
    window.tbtn = action;
    await connected;
})()`;

test.skipIf(IS_WINDOWS)(
    "a declarative topbar control stays operable and focusable after normalization and reconnect",
    async () => {
        await using v = view();
        await v.navigate(`${ensureServer()}/test/browser/fixtures/grid.html`);
        await waitFor(v, "window.grid && window.grid.rows.length > 0");
        await v.evaluate(FOCUS_SETUP);
        await waitFor(v, "window.tgrid.querySelector('.dg-search')");

        // Initialization: the same node survived normalization, in the start zone.
        expect(await read(v, "window.tbtn.isConnected")).toBe(true);
        expect(await read(v, "window.tgrid.querySelector('#topbar-action') === window.tbtn")).toBe(true);
        expect(await read(v, "window.tbtn.closest('.dg-topbar-start') !== null")).toBe(true);

        // Operable and focusable after normalization: focus and click from the
        // connected state, never from a detached node.
        await v.evaluate(`(() => window.tbtn.focus())()`);
        expect(await read(v, "document.activeElement === window.tbtn")).toBe(true);
        await v.evaluate(`(() => window.tbtn.click())()`);
        expect(await read(v, "window.__topbarClicks")).toBe(1);

        await v.evaluate(`(async () => {
            const grid = window.tgrid;
            grid.remove();
            await new Promise((r) => setTimeout(r, 50));
            const connected = new Promise((resolve) => grid.addEventListener("connected", resolve, { once: true }));
            document.body.appendChild(grid);
            await connected;
        })()`);
        await waitFor(v, "window.tgrid.rows.length > 0");

        // Reconnect: the same node is still there and works again. Focus is
        // taken anew after reconnection; detaching normally drops it.
        expect(await read(v, "window.tgrid.querySelector('#topbar-action') === window.tbtn")).toBe(true);
        expect(await read(v, "window.tbtn.closest('.dg-topbar-start') !== null")).toBe(true);
        await v.evaluate(`(() => window.tbtn.focus())()`);
        expect(await read(v, "document.activeElement === window.tbtn")).toBe(true);
        await v.evaluate(`(() => window.tbtn.click())()`);
        expect(await read(v, "window.__topbarClicks")).toBe(2);
    },
    TIMEOUT,
);
