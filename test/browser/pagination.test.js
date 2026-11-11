import { afterAll, beforeAll, expect, test } from "bun:test";
import { ensureServer, IS_WINDOWS, read, stopServer, view, waitFor } from "./helpers.js";

beforeAll(ensureServer);
afterAll(stopServer);

test.skipIf(IS_WINDOWS)(
    "a compact footer preserves the results window and progressive loaded count",
    async () => {
        await using v = view();
        await v.navigate(`${ensureServer()}/test/browser/fixtures/grid.html`);
        await v.evaluate(`(async () => {
            const { default: DataGrid, ArrayDataSource } = await import('/dist/data-grid.js');
            const grid = new DataGrid({
                id: 'pagination-grid',
                columns: [{ field: 'name' }],
                dataSource: new ArrayDataSource(Array.from({ length: 30 }, (_, i) => ({ id: i, name: 'Row ' + i }))),
                responsive: true,
                showPageSize: false,
                pageSize: 10,
            });
            grid.style.width = '800px';
            document.body.prepend(grid);
            window.paginationGrid = grid;
        })()`);
        await waitFor(v, "window.paginationGrid.rows.length === 10 && !window.paginationGrid.loading");
        const grid = "window.paginationGrid";
        const visibleMeta = `(() => {
            const meta = ${grid}.querySelector('.dg-meta');
            return meta.getClientRects().length > 0 && getComputedStyle(meta).visibility === 'visible';
        })()`;
        expect(await read(v, `${grid}.footerEl.classList.contains('dg-footer-compact')`)).toBe(false);
        await v.evaluate(`${grid}.style.width = '240px'`);
        await waitFor(v, `${grid}.footerEl.classList.contains('dg-footer-compact')`);
        expect(await read(v, visibleMeta)).toBe(true);
        expect(await read(v, `${grid}.querySelector('.dg-meta').textContent`)).toBe("1–10 of 30");

        await v.evaluate(`${grid}.setQuery({ page: 2 })`);
        await waitFor(v, `${grid}.query.page === 2 && !${grid}.loading`);
        expect(await read(v, visibleMeta)).toBe(true);
        expect(await read(v, `${grid}.querySelector('.dg-meta').textContent`)).toBe("11–20 of 30");

        await v.evaluate(`${grid}.setAttribute('show-page-size', 'true')`);
        await waitFor(v, `${grid}.querySelector('.dg-page-range').getClientRects().length > 0`);
        expect(await read(v, `${grid}.querySelector('.dg-meta').getClientRects().length`)).toBe(0);
        await v.evaluate(`${grid}.setAttribute('show-page-size', 'false')`);
        await waitFor(v, visibleMeta);

        await v.evaluate(`${grid}.setAttribute('pager', 'more')`);
        await waitFor(v, `${grid}.options.pager === 'more' && !${grid}.loading && ${grid}.rows.length === 10`);
        expect(await read(v, `${grid}.footerEl.classList.contains('dg-footer-compact')`)).toBe(true);
        expect(await read(v, visibleMeta)).toBe(true);
        expect(await read(v, `${grid}.querySelector('.dg-meta').textContent`)).toBe("10 of 30");

        await v.evaluate(`${grid}.style.width = '800px'`);
        await waitFor(v, `!${grid}.footerEl.classList.contains('dg-footer-compact')`);
        expect(await read(v, visibleMeta)).toBe(true);
    },
    15000,
);
