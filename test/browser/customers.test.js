import { afterAll, beforeAll, expect, test } from "bun:test";
import { ensureServer, IS_CHROME_BACKEND, IS_WINDOWS, read, stopServer, view, waitFor } from "./helpers.js";

const GRID = 'document.querySelector("#customers-grid")';
const SEARCH = "#customers-grid .dg-search";
const OPEN = 'document.querySelector("#customers-grid dialog[open]")';
const TIMEOUT = 15000;

beforeAll(ensureServer);
afterAll(stopServer);

async function open(v) {
    await v.navigate(`${ensureServer()}/demo/customers.html`);
    await waitFor(v, `${GRID}?.rows.length === 10 && !${GRID}.loading`);
    await waitFor(v, `getComputedStyle(${GRID}.querySelector('table')).visibility === 'visible'`);
}

test.skipIf(IS_WINDOWS)(
    "customer search shortcut preserves the value on Escape, normal search still clears it",
    async () => {
        await using v = view();
        await open(v);
        await v.evaluate(`(() => {
            const search = document.querySelector('${SEARCH}');
            search.value = 'Acme';
            search.dispatchEvent(new Event('input', { bubbles: true }));
        })()`);
        await waitFor(v, `${GRID}.query.search === 'Acme' && !${GRID}.loading`);
        await v.evaluate(`(() => {
            document.querySelector('[data-search-focus]').focus();
            // Explicitly exercise the app's keydown handler, not text insertion.
            document.activeElement.dispatchEvent(new KeyboardEvent('keydown', {
                key: '/', bubbles: true, composed: true, cancelable: true
            }));
        })()`);
        await waitFor(v, "document.activeElement.matches('.dg-search')");
        expect(await read(v, "document.activeElement.value")).toBe("Acme");
        await v.press("Escape");
        await waitFor(v, "document.activeElement.matches('[data-search-focus]')");
        expect(await read(v, `${GRID}.query.search`)).toBe("Acme");

        await v.click(SEARCH);
        await v.press("Escape");
        await waitFor(v, `${GRID}.query.search === '' && !${GRID}.loading`);

        // Editable fields retain ownership of slash; the shortcut must not consume it.
        expect(
            await read(
                v,
                `document.activeElement.dispatchEvent(new KeyboardEvent('keydown', {
                key: '/', bubbles: true, composed: true, cancelable: true
            }))`,
            ),
        ).toBe(true);
        await v.click("#customers-grid .customer-name");
        await waitFor(v, OPEN);
        await v.evaluate(`document.activeElement.dispatchEvent(new KeyboardEvent('keydown', {
            key: '/', bubbles: true, composed: true, cancelable: true
        }))`);
        expect(await read(v, "Boolean(document.activeElement.closest('dialog[open]'))")).toBe(true);
    },
    TIMEOUT,
);

test.skipIf(!IS_CHROME_BACKEND)(
    "the customer View panel remains on screen on narrow LTR and RTL layouts",
    async () => {
        await using v = view();
        await open(v);
        await v.cdp("Emulation.setDeviceMetricsOverride", {
            width: 390,
            height: 844,
            deviceScaleFactor: 1,
            mobile: true,
        });
        for (const direction of ["ltr", "rtl"]) {
            await v.evaluate(`(() => {
                document.documentElement.dir = '${direction}';
                ${GRID}.setAttribute('dir', '${direction}');
            })()`);
            await v.evaluate("document.querySelector('.customers-view').open = true");
            await waitFor(
                v,
                `(() => {
                const box = document.querySelector('.customers-view-panel').getBoundingClientRect();
                return box.left >= 0 && box.right <= innerWidth;
            })()`,
            );
            expect(await read(v, "document.querySelector('[data-density]').getClientRects().length > 0")).toBe(true);
        }
    },
    TIMEOUT,
);

test.skipIf(IS_WINDOWS)(
    "customer progressive selection restores focus and previews all matching scope with exclusions",
    async () => {
        await using v = view();
        await open(v);
        await v.click("#customers-grid .dg-select-all");
        await waitFor(v, "!document.querySelector('[data-select-matching]').hidden");
        // The visually hidden scope is the only live region announcing the selection.
        expect(await read(v, `${GRID}.querySelector('.dg-selection-count').getAttribute('aria-live')`)).toBe("off");
        expect(await read(v, "document.querySelector('[data-selection-scope]').textContent")).toBe(
            "All 10 rows on this page selected.",
        );
        expect(await read(v, "document.querySelector('[data-select-matching]').textContent")).toBe(
            "Select all 64 records",
        );
        await v.click('#customers-grid tbody input[type="checkbox"]');
        await waitFor(v, "document.querySelector('[data-selection-scope]').textContent === '9 selected.'");
        // A partial selection can be extended too.
        expect(await read(v, "document.querySelector('[data-select-matching]').hidden")).toBe(false);
        await v.click('#customers-grid tbody input[type="checkbox"]');
        await waitFor(v, "document.querySelector('[data-selection-scope]').textContent.startsWith('All 10')");
        await v.evaluate("document.querySelector('[data-select-matching]').focus()");
        await v.press("Space");
        await waitFor(v, `${GRID}.getSelectionState().mode === 'all'`);
        expect(await read(v, "document.activeElement.matches('.dg-bulk-actions button[data-action]')")).toBe(true);
        await v.click('#customers-grid tbody input[type="checkbox"]');
        await v.click("#customers-grid .dg-bulk-actions button[data-action]");
        expect(await read(v, "document.querySelector('[data-action-feedback]').textContent")).toContain("excluding 1");
        await v.click('[data-status-pills] button[data-status="trial"]');
        await waitFor(v, `${GRID}.query.filters.status?.value === 'trial' && !${GRID}.loading`);
        expect(await read(v, "document.querySelector('[data-clear-selection]').hidden")).toBe(true);
        expect(await read(v, "document.querySelector('[data-selection-scope]').textContent")).toBe("");
    },
    TIMEOUT,
);

test.skipIf(IS_WINDOWS)(
    "floating customer actions restore focus on action clearing and preserve unrelated focus",
    async () => {
        await using v = view();
        await open(v);
        expect(await read(v, `${GRID}.querySelector('.dg-bulk-actions').hidden`)).toBe(true);
        await v.click('#customers-grid tbody input[type="checkbox"]');
        await waitFor(v, `!${GRID}.querySelector('.dg-bulk-actions').hidden`);
        await v.evaluate(`${GRID}.addEventListener('bulkAction', () => ${GRID}.clearSelection(), { once: true })`);
        await v.evaluate(`${GRID}.querySelector('.dg-bulk-actions button[data-action]').focus()`);
        await v.press("Space");
        await waitFor(v, `${GRID}.querySelector('.dg-bulk-actions').hidden`);
        expect(await read(v, "document.activeElement.matches('[data-search-focus]')")).toBe(true);

        await v.evaluate(`(() => {
            const grid = ${GRID};
            grid.selectAllMatching();
            grid.querySelector('.dg-search').focus();
            grid.clearSelection();
        })()`);
        expect(await read(v, "document.activeElement.matches('.dg-search')")).toBe(true);
        await v.evaluate(`(async () => {
            const grid = ${GRID};
            grid.selectAllMatching();
            grid.querySelector('.dg-bulk-actions button[data-action]').focus();
            await grid.setQuery({ filters: { status: { operator: 'eq', value: 'trial' } } });
        })()`);
        await waitFor(v, `${GRID}.querySelector('.dg-bulk-actions').hidden`);
        expect(await read(v, "document.activeElement.matches('[data-search-focus]')")).toBe(true);

        // The same source may shrink its known population without a query change.
        await v.evaluate(`(async () => {
            const grid = ${GRID};
            grid.selectAllMatching();
            grid.querySelector('.dg-bulk-actions button[data-action]').focus();
            grid.dataSource.load = async () => ({ rows: [], total: 0 });
            await grid.refresh();
        })()`);
        await waitFor(v, `${GRID}.querySelector('.dg-bulk-actions').hidden`);
        expect(await read(v, "document.activeElement.matches('[data-search-focus]')")).toBe(true);
    },
    TIMEOUT,
);

test.skipIf(IS_WINDOWS)(
    "floating actions retain unknown-total scope and synchronize after reconnect",
    async () => {
        await using v = view();
        await open(v);
        await v.evaluate(`(async () => {
            const grid = ${GRID};
            grid.setAttribute('pager', 'more');
            grid.dataSource = { async load() {
                return { rows: [{ id: 'remote-1', name: 'Remote customer' }], total: null, hasMore: false };
            } };
            await grid.refresh();
            grid.selectAllMatching();
        })()`);
        await waitFor(v, `!${GRID}.querySelector('.dg-bulk-actions').hidden`);
        expect(await read(v, `${GRID}.querySelector('.dg-selection-count').hidden`)).toBe(true);
        await v.evaluate(`(async () => {
            const grid = ${GRID};
            const parent = grid.parentNode;
            const disconnected = new Promise(resolve => grid.addEventListener('disconnected', resolve, { once: true }));
            grid.remove();
            await disconnected;
            const connected = new Promise(resolve => grid.addEventListener('connected', resolve, { once: true }));
            parent.append(grid);
            await connected;
        })()`);
        await waitFor(v, `!${GRID}.querySelector('.dg-bulk-actions').hidden`);
        expect(await read(v, `${GRID}.querySelectorAll('.dg-bulk-actions').length`)).toBe(1);
        await v.evaluate(`${GRID}.clearSelection()`);
        await waitFor(v, `${GRID}.querySelector('.dg-bulk-actions').hidden`);
    },
    TIMEOUT,
);

test.skipIf(!IS_CHROME_BACKEND)(
    "floating customer actions preserve layout and remain reachable on narrow LTR and RTL grids",
    async () => {
        await using v = view();
        await open(v);
        await v.cdp("Emulation.setDeviceMetricsOverride", {
            width: 390,
            height: 844,
            deviceScaleFactor: 1,
            mobile: true,
        });
        for (const direction of ["ltr", "rtl"]) {
            await v.evaluate(`(() => {
                document.documentElement.dir = '${direction}';
                ${GRID}.dir = '${direction}';
                ${GRID}.style.blockSize = '28rem';
            })()`);
            await waitFor(v, `${GRID}.querySelector('td.dg-responsive-hidden')`);
            await v.evaluate(`${GRID}.scrollIntoView({ block: 'start' })`);
            const before = await read(v, `${GRID}.querySelector('tbody tr').getBoundingClientRect().top`);
            await v.evaluate(`${GRID}.selectRow(${GRID}.rows[0])`);
            await waitFor(v, `!${GRID}.querySelector('.dg-bulk-actions').hidden`);
            const after = await read(v, `${GRID}.querySelector('tbody tr').getBoundingClientRect().top`);
            expect(Math.abs(after - before)).toBeLessThan(1);
            await waitFor(
                v,
                `(() => {
                const bar = ${GRID}.querySelector('.dg-bulk-actions');
                const rect = bar.getBoundingClientRect();
                const button = bar.querySelector('button[data-action]');
                const b = button.getBoundingClientRect();
                return rect.left >= 0 && rect.right <= innerWidth &&
                    rect.top >= ${GRID}.querySelector('.dg-scroll').getBoundingClientRect().top &&
                    rect.bottom <= ${GRID}.querySelector('.dg-footer').getBoundingClientRect().top &&
                    button.contains(document.elementFromPoint(b.left + b.width / 2, b.top + b.height / 2));
            })()`,
            );
            await v.evaluate(`${GRID}.clearSelection()`);
        }

        await v.evaluate(`${GRID}.setAttribute('searchable', 'false')`);
        await waitFor(v, `!${GRID}.querySelector('.dg-search')`);
        expect(await read(v, `${GRID}.querySelector('.customers-view').getClientRects().length > 0`)).toBe(true);
        await v.evaluate(`${GRID}.setAttribute('searchable', 'true')`);
        await waitFor(v, `${GRID}.querySelector('.dg-search')`);
        expect(await read(v, `${GRID}.querySelector('.dg-search').getClientRects().length > 0`)).toBe(true);
    },
    TIMEOUT,
);

test.skipIf(!IS_CHROME_BACKEND)(
    "the CRM uses one search with an inline shortcut, horizontal metrics and a centered selection bar",
    async () => {
        await using v = view();
        await open(v);
        expect(await read(v, `${GRID}.querySelectorAll('.dg-search').length`)).toBe(1);
        expect(await read(v, "document.querySelectorAll('button[data-search-focus]').length")).toBe(0);
        await waitFor(
            v,
            `(() => {
            const controls = ${GRID}.querySelector('.dg-topbar').getBoundingClientRect();
            const table = ${GRID}.querySelector('.dg-scroll').getBoundingClientRect();
            return Math.abs(controls.bottom - table.top) < 1;
        })()`,
        );
        expect(await read(v, `${GRID}.querySelector('.dg-search-field .customer-search-shortcut').textContent`)).toBe(
            "/",
        );
        await waitFor(
            v,
            `(() => {
            const metric = ${GRID}.querySelector('tbody [data-column-id="health"] .customer-metric');
            const bar = metric.querySelector('.customer-metric-track').getBoundingClientRect();
            const value = metric.querySelector('.customer-metric-value').getBoundingClientRect();
            return bar.top < value.bottom && bar.bottom > value.top && value.right <= bar.left;
        })()`,
        );
        const tableTop = await read(v, `${GRID}.querySelector('.dg-scroll').getBoundingClientRect().top`);
        await v.click("#customers-grid .dg-select-all");
        await waitFor(
            v,
            `(() => {
            // Two lines: the selection summary above the actions.
            const summary = ${GRID}.querySelector('.dg-bulk-actions .customers-selection').getBoundingClientRect();
            const action = ${GRID}.querySelector('.dg-bulk-actions button[data-action]').getBoundingClientRect();
            const count = ${GRID}.querySelector('.customers-selection .dg-selection-count');
            return summary.height > 0 && summary.bottom <= action.top && count?.getClientRects().length > 0;
        })()`,
        );
        await waitFor(
            v,
            `(() => {
            const grid = ${GRID}.getBoundingClientRect();
            const bar = ${GRID}.querySelector('.dg-bulk-actions').getBoundingClientRect();
            return Math.abs((bar.left + bar.right) / 2 - (grid.left + grid.right) / 2) < 2;
        })()`,
        );
        expect(await read(v, `${GRID}.querySelectorAll('.dg-bulk-actions button[data-action]').length`)).toBe(3);
        await waitFor(
            v,
            `(() => {
            const banner = ${GRID}.querySelector('.customers-selection');
            const table = ${GRID}.querySelector('.dg-scroll').getBoundingClientRect();
            return ${GRID}.querySelector('.dg-bulk-actions').contains(banner) && Math.abs(table.top - ${tableTop}) < 1;
        })()`,
        );
        await v.click("#customers-grid [data-toggle-filters]");
        await waitFor(v, `!${GRID}.querySelector('tr.dg-head-filters').hidden`);
        await v.click("#customers-grid [data-toggle-filters]");
        await waitFor(v, `${GRID}.querySelector('tr.dg-head-filters').hidden`);
    },
    TIMEOUT,
);

test.skipIf(IS_WINDOWS)(
    "the customer floating presentation does not hide another grid's permanent empty toolbar",
    async () => {
        await using v = view();
        await open(v);
        await v.evaluate(`(async () => {
            const { DataGrid, ArrayDataSource } = await import('/data-grid.js');
            const grid = new DataGrid({
                id: 'ordinary-grid', columns: [{ field: 'name' }], selectable: true,
                dataSource: new ArrayDataSource([{ id: 'other', name: 'Other customer' }]),
                bulkActions: [{ name: 'preview', label: 'Ordinary action' }],
            });
            const ready = new Promise(resolve => grid.addEventListener('connected', resolve, { once: true }));
            document.querySelector('[data-customers-demo]').append(grid);
            await ready;
            ${GRID}.selectAllMatching();
        })()`);
        expect(await read(v, "document.querySelector('#ordinary-grid .dg-bulk-actions').hidden")).toBe(false);
        expect(
            await read(v, "document.querySelector('#ordinary-grid .dg-bulk-actions').getClientRects().length > 0"),
        ).toBe(true);
        expect(
            await read(v, "document.querySelector('#ordinary-grid .dg-bulk-actions button[data-action]').disabled"),
        ).toBe(true);
    },
    TIMEOUT,
);

test.skipIf(IS_WINDOWS)(
    "both customer detail entry points keep selection and render a plain name in the sheet",
    async () => {
        await using v = view();
        await open(v);
        await v.click('#customers-grid tbody input[type="checkbox"]');
        await v.click("#customers-grid .customer-name");
        await waitFor(v, OPEN);
        expect(await read(v, `Boolean((${OPEN}).querySelector('.customer-name'))`)).toBe(false);
        expect(await read(v, `(${OPEN}).textContent.includes('Avery Morgan')`)).toBe(true);
        await v.press("Escape");
        await waitFor(v, `!(${OPEN}) && !document.activeElement.closest('dialog')`);
        await v.click("#customers-grid .dg-row-details-toggle-control");
        await waitFor(v, OPEN);
        expect(await read(v, `(${OPEN}).textContent.includes('Avery Morgan')`)).toBe(true);
        expect(await read(v, `${GRID}.getSelectionState().ids.size`)).toBe(1);
        await v.evaluate(`${GRID}.refresh()`);
        await v.press("Escape");
        await waitFor(v, `!(${OPEN}) && !document.activeElement.closest('dialog')`);
    },
    TIMEOUT,
);
