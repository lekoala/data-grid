import { afterAll, beforeAll, expect, test } from "bun:test";
import { ensureServer, IS_CHROME_BACKEND, IS_WINDOWS, read, stopServer, view, waitFor } from "./helpers.js";

const GRID = 'document.querySelector("#revenue-grid")';
const FOOT = `${GRID}.querySelector('tfoot')`;
const TIMEOUT = 15000;
beforeAll(ensureServer);
afterAll(stopServer);

async function open(v) {
    await v.navigate(`${ensureServer()}/demo/aggregates.html`);
    await waitFor(v, `${GRID}?.rows.length === 10 && !${GRID}.loading && ${FOOT}`);
    await waitFor(v, `getComputedStyle(${GRID}.querySelector('table')).visibility === 'visible'`);
}

test.skipIf(IS_WINDOWS)(
    "server aggregates follow filters and empty results, while paging and selection preserve their scope",
    async () => {
        await using v = view();
        await open(v);
        const original = await read(v, `${FOOT}.textContent`);
        await v.evaluate(`${GRID}.setQuery({ page: 2 })`);
        expect(await read(v, `${FOOT}.textContent`)).toBe(original);
        await v.click('#revenue-grid tbody input[type="checkbox"]');
        expect(await read(v, `${FOOT}.textContent`)).toBe(original);
        await v.evaluate(`(() => {
            const input = ${GRID}.querySelector('select[data-name="status"]');
            input.value = 'active';
            input.dispatchEvent(new Event('change', { bubbles: true }));
        })()`);
        await waitFor(v, `${GRID}.query.filters.status?.value === 'active' && !${GRID}.loading`);
        expect(await read(v, `${FOOT}.textContent === ${JSON.stringify(original)}`)).toBe(false);
        expect(await read(v, `${GRID}.page`)).toBe(1);
        const formatted = await read(
            v,
            `new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD' }).format(${GRID}.meta.aggregates.mrr)`,
        );
        expect(await read(v, `${FOOT}.querySelector('[data-column-id="mrr"]').textContent`)).toBe(formatted);
        await v.evaluate(`${GRID}.setQuery({ search: 'does-not-exist' })`);
        expect(await read(v, `${FOOT}.querySelector('[data-column-id="mrr"]').textContent`)).toBe("$0.00");
        expect(await read(v, `${FOOT}.querySelector('[data-column-id="health"]').textContent`)).toBe("—");
    },
    TIMEOUT,
);

test.skipIf(IS_WINDOWS)(
    "aggregate cells share visibility and headers, and responsive hiding restores them",
    async () => {
        await using v = view();
        await open(v);
        await v.click("#show-health");
        await waitFor(v, `${FOOT}.querySelector('[data-column-id="health"]').hidden`);
        await v.click("#show-health");
        await v.evaluate(`${GRID}.style.inlineSize = '360px'`);
        await waitFor(v, `${FOOT}.querySelector('[data-column-id="health"]').hidden`);
        expect(await read(v, `${GRID}.querySelector('tbody [data-column-id="health"]').hidden`)).toBe(true);
        await v.evaluate(`${GRID}.style.inlineSize = '1100px'`);
        await waitFor(v, `!${FOOT}.querySelector('[data-column-id="health"]').hidden`);
        expect(
            await read(
                v,
                `(() => {
            const cell = ${FOOT}.querySelector('[data-column-id="health"]');
            const header = document.getElementById(cell.getAttribute('headers'));
            return header?.dataset.columnId === 'health' && header.scope === 'col';
        })()`,
            ),
        ).toBe(true);
        expect(await read(v, `${FOOT}.querySelectorAll('input,button').length`)).toBe(0);
        expect(await read(v, `${FOOT}.querySelector('[data-column-id="$selection"]').textContent`)).toBe("");
    },
    TIMEOUT,
);

test.skipIf(!IS_CHROME_BACKEND)(
    "frozen aggregate cells stay aligned and opaque through LTR and RTL horizontal scrolling",
    async () => {
        await using v = view();
        await open(v);
        await v.evaluate(`(() => {
            ${GRID}.setAttribute('responsive', 'false');
            ${GRID}.style.inlineSize = '600px';
        })()`);
        for (const direction of ["ltr", "rtl"]) {
            await v.evaluate(`${GRID}.setAttribute('dir', '${direction}')`);
            await waitFor(
                v,
                `(() => {
                const scroller = ${GRID}.querySelector('.dg-scroll');
                return scroller.scrollWidth > scroller.clientWidth;
            })()`,
            );
            await v.evaluate(`${GRID}.querySelector('.dg-scroll').scrollLeft = ${direction === "rtl" ? -300 : 300}`);
            await waitFor(
                v,
                `(() => {
                const foot = ${FOOT}.querySelector('[data-column-id="mrr"]');
                const head = ${GRID}.querySelector('thead [data-column-id="mrr"]');
                const f = foot.getBoundingClientRect(); const h = head.getBoundingClientRect();
                return Math.abs(f.left - h.left) < 2 && Math.abs(f.right - h.right) < 2;
            })()`,
            );
            expect(
                await read(v, `getComputedStyle(${FOOT}.querySelector('[data-column-id="mrr"]')).backgroundColor`),
            ).not.toBe("rgba(0, 0, 0, 0)");
            expect(await read(v, `Math.abs(${GRID}.querySelector('.dg-scroll').scrollLeft) > 0`)).toBe(true);
        }
    },
    TIMEOUT,
);
