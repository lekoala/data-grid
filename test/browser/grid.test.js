import { afterAll, beforeAll, expect, test } from "bun:test";
import { ensureServer, IS_WINDOWS, read, stopServer, view, waitFor } from "./helpers.js";

const FIXTURE = "test/browser/fixtures/grid.html";
const TIMEOUT = 15000;

beforeAll(ensureServer);
afterAll(stopServer);

test.skipIf(IS_WINDOWS)(
    "boots the component and renders rows",
    async () => {
        await using v = view();
        await v.navigate(`${ensureServer()}/${FIXTURE}`);
        await waitFor(v, "window.grid && window.grid.rows.length > 0");
        expect(await read(v, "window.grid.querySelectorAll('tbody tr.dg-data-row').length")).toBe(10);
        expect(await read(v, "window.grid.getSelectionState().mode")).toBe("explicit");
    },
    TIMEOUT,
);

test.skipIf(IS_WINDOWS)(
    "server grid paginates through a real click",
    async () => {
        await using v = view();
        await v.navigate(`${ensureServer()}/${FIXTURE}`);
        await waitFor(v, "window.sgrid && window.sgrid.rows.length > 0");
        expect(await read(v, "window.sgrid.query.page")).toBe(1);

        await v.click("#server-grid .dg-btn-next");
        await waitFor(v, "window.sgrid.query.page === 2 && window.sgrid.rows[0] && window.sgrid.rows[0].id === 11");
        expect(await read(v, "window.sgrid.rows.length")).toBe(10);
    },
    TIMEOUT,
);

test.skipIf(IS_WINDOWS)(
    "sorting the server grid updates the query and rows",
    async () => {
        await using v = view();
        await v.navigate(`${ensureServer()}/${FIXTURE}`);
        await waitFor(v, "window.sgrid && window.sgrid.rows.length > 0");

        await v.click("#server-grid thead tr.dg-head-columns th:nth-child(4) button");
        await waitFor(v, "window.sgrid.query.sort.length === 1 && window.sgrid.query.sort[0].field === 'company'");
        expect(await read(v, "window.sgrid.query.sort[0].direction")).toBe("asc");
        expect(await read(v, "window.sgrid.rows[0].company")).toBe("Acme");
    },
    TIMEOUT,
);

test.skipIf(IS_WINDOWS)(
    "typing in a filter narrows the server grid",
    async () => {
        await using v = view();
        await v.navigate(`${ensureServer()}/${FIXTURE}`);
        await waitFor(v, "window.sgrid && window.sgrid.rows.length > 0");

        await v.click('#server-grid .dg-head-filters input[data-name="company"]');
        await v.type("Acme");
        // Live filtering: the debounced request narrows the grid without Enter
        await waitFor(v, "window.sgrid.total === 333");
        expect(await read(v, "window.sgrid.rows.every((r) => r.company === 'Acme')")).toBe(true);
    },
    TIMEOUT,
);

test.skipIf(IS_WINDOWS)(
    "a failing endpoint sets data-error without data-empty",
    async () => {
        await using v = view();
        await v.navigate(`${ensureServer()}/${FIXTURE}`);
        await waitFor(v, "window.egrid && window.egrid.hasAttribute('data-error')");
        expect(await read(v, "window.egrid.hasAttribute('data-error')")).toBe(true);
        expect(await read(v, "window.egrid.hasAttribute('data-empty')")).toBe(false);
        expect(await read(v, "window.egrid.hasAttribute('data-loading')")).toBe(false);
    },
    TIMEOUT,
);

test.skipIf(IS_WINDOWS)(
    "reconnecting the element reloads its data",
    async () => {
        await using v = view();
        await v.navigate(`${ensureServer()}/${FIXTURE}`);
        await waitFor(v, "window.grid && window.grid.rows.length > 0");

        await v.evaluate(`(() => {
        const el = window.grid;
        el.remove();
        document.body.appendChild(el);
    })()`);
        await waitFor(v, "window.grid.rows.length > 0");
        expect(await read(v, "window.grid.rows.length")).toBe(10);
    },
    TIMEOUT,
);

test.skipIf(IS_WINDOWS)(
    "a rapid double setQuery keeps the last request (abort-race)",
    async () => {
        await using v = view();
        await v.navigate(`${ensureServer()}/${FIXTURE}`);
        await waitFor(v, "window.sgrid && window.sgrid.rows.length > 0");

        await v.evaluate(`(() => {
        window.sgrid.setQuery({ page: 2 });
        window.sgrid.setQuery({ page: 3 });
    })()`);
        await waitFor(v, "window.sgrid.query.page === 3 && window.sgrid.rows[0] && window.sgrid.rows[0].id === 21");
        expect(await read(v, "window.sgrid.rows[0].id")).toBe(21);
    },
    TIMEOUT,
);

test.skipIf(IS_WINDOWS)(
    "column wrapping allows long tokens without horizontal overflow",
    async () => {
        await using v = view();
        await v.navigate(`${ensureServer()}/${FIXTURE}`);
        await waitFor(v, "window.grid && window.grid.rows.length > 0");

        await v.evaluate(`(async () => {
            const { DataGrid, ArrayDataSource } = await import("/dist/data-grid.js");
            const grid = new DataGrid({
                columns: [
                    { field: "label", wrap: false },
                    { field: "description", wrap: true },
                ],
                dataSource: new ArrayDataSource([{
                    label: "Compact label",
                    description: "A normal sentence followed by " + "g".repeat(120),
                }]),
            });
            grid.id = "wrap-grid";
            grid.style.width = "600px";
            const connected = new Promise((resolve) => grid.addEventListener("connected", resolve, { once: true }));
            document.body.appendChild(grid);
            window.wrapGrid = grid;
            await connected;
        })()`);

        expect(
            await read(
                v,
                "getComputedStyle(window.wrapGrid.querySelector('tbody [data-column-id=\"label\"]')).whiteSpace",
            ),
        ).toBe("nowrap");
        expect(
            await read(
                v,
                "getComputedStyle(window.wrapGrid.querySelector('tbody [data-column-id=\"description\"]')).overflowWrap",
            ),
        ).toBe("anywhere");

        expect(
            await read(
                v,
                `(() => {
                    const cell = window.wrapGrid.querySelector('tbody [data-column-id="description"]');
                    const range = document.createRange();
                    range.selectNodeContents(cell);
                    return range.getClientRects().length;
                })()`,
            ),
        ).toBeGreaterThan(1);

        await v.evaluate(`(async () => {
            window.wrapGrid.style.width = "240px";
            await new Promise((resolve) => requestAnimationFrame(() => requestAnimationFrame(resolve)));
        })()`);
        expect(
            await read(
                v,
                `(() => {
                    const cell = window.wrapGrid.querySelector('tbody [data-column-id="description"]');
                    return cell.scrollWidth <= cell.clientWidth + 1;
                })()`,
            ),
        ).toBe(true);
    },
    TIMEOUT,
);
