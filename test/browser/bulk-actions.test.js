import { afterAll, beforeAll, expect, test } from "bun:test";
import { ensureServer, IS_CHROME_BACKEND, read, stopServer, view, waitFor } from "./helpers.js";

const FIXTURE = "test/browser/fixtures/bulk-floating.html";
const TIMEOUT = 20000;

beforeAll(ensureServer);
afterAll(stopServer);

/** Rounded viewport rects of the parts the floating bar is placed against. */
function geometry(v, name) {
    return read(
        v,
        `(() => {
            const g = grids.${name};
            const r = (el) => {
                if (!el || el.hidden) return null;
                const b = el.getBoundingClientRect();
                return { top: Math.round(b.top), bottom: Math.round(b.bottom) };
            };
            const boxes = g.querySelectorAll('tbody .dg-selectable input');
            return {
                vh: innerHeight,
                grid: r(g),
                frame: r(g.querySelector(':scope > .dg-frame')),
                footer: r(g.footerEl),
                bar: r(g.querySelector('.dg-bulk-actions')),
                lastBox: r(boxes[boxes.length - 1]),
                gridHeight: Math.round(g.getBoundingClientRect().height),
            };
        })()`,
    );
}

async function open(v) {
    await v.navigate(`${ensureServer()}/${FIXTURE}`);
    // A short viewport: the 50-row grid must scroll with the page.
    await v.cdp("Emulation.setDeviceMetricsOverride", {
        width: 1000,
        height: 700,
        deviceScaleFactor: 1,
        mobile: false,
    });
    await waitFor(v, "window.grids && Object.values(grids).every((g) => g.rows.length > 0 && !g.loading)");
}

async function select(v, name) {
    await v.evaluate(`grids.${name}.selectRow(grids.${name}.rows[0])`);
    await waitFor(v, `!grids.${name}.querySelector('.dg-bulk-layer').hidden`);
}

async function scrollGrid(v, name, edge, offset) {
    await v.evaluate(`(() => {
        const rect = grids.${name}.getBoundingClientRect();
        scrollTo(0, scrollY + rect.${edge} + (${offset}));
    })()`);
    await v.evaluate("new Promise((resolve) => requestAnimationFrame(() => requestAnimationFrame(resolve)))");
}

test.skipIf(!IS_CHROME_BACKEND)(
    "the floating bar follows the page inside the grid and rests on the footer without covering rows",
    async () => {
        await using v = view();
        await open(v);
        const idle = await geometry(v, "page");
        await select(v, "page");

        // Selecting never changes the grid height.
        expect((await geometry(v, "page")).gridHeight).toBe(idle.gridHeight);

        // Mid-grid: pinned near the viewport bottom.
        await scrollGrid(v, "page", "top", 400);
        let g = await geometry(v, "page");
        expect(g.bar.bottom).toBeLessThanOrEqual(g.vh);
        expect(g.vh - g.bar.bottom).toBeLessThan(24);

        // Grid barely entering the viewport: the bar never rises above the grid.
        await scrollGrid(v, "page", "top", `-innerHeight + 20`);
        g = await geometry(v, "page");
        expect(g.bar.top).toBeGreaterThanOrEqual(g.grid.top);

        // End of the grid: docked on the footer, clear of the last row checkbox.
        await scrollGrid(v, "page", "bottom", "-innerHeight + 40");
        g = await geometry(v, "page");
        expect(g.bar.bottom).toBeLessThanOrEqual(g.footer.bottom);
        expect(g.bar.bottom).toBeGreaterThan(g.footer.top);
        expect(g.bar.top).toBeGreaterThan(g.lastBox.bottom);
    },
    TIMEOUT,
);

test.skipIf(!IS_CHROME_BACKEND)(
    "without a footer the bar rests below the frame and still floats over a long single page",
    async () => {
        await using v = view();
        await open(v);
        await select(v, "short");
        await scrollGrid(v, "short", "top", -200);
        let g = await geometry(v, "short");
        expect(g.footer).toBeNull();
        expect(g.bar.top).toBeGreaterThanOrEqual(g.frame.bottom);
        expect(g.bar.bottom).toBeLessThanOrEqual(g.grid.bottom);

        await select(v, "single");
        await scrollGrid(v, "single", "top", 300);
        g = await geometry(v, "single");
        expect(g.bar.bottom).toBeLessThanOrEqual(g.vh);
        expect(g.bar.bottom).toBeLessThan(g.frame.bottom);
    },
    TIMEOUT,
);

test.skipIf(!IS_CHROME_BACKEND)(
    "a fixed-height grid keeps the bar on its footer while the viewport scrolls inside",
    async () => {
        await using v = view();
        await open(v);
        await select(v, "fixed");
        await scrollGrid(v, "fixed", "top", -100);
        await v.evaluate("grids.fixed.scrollEl.scrollTop = 1e6");
        await v.evaluate("new Promise((resolve) => requestAnimationFrame(() => requestAnimationFrame(resolve)))");
        const g = await geometry(v, "fixed");
        expect(g.bar.bottom).toBeLessThanOrEqual(g.footer.bottom);
        expect(g.bar.top).toBeGreaterThan(g.lastBox.bottom);
    },
    TIMEOUT,
);

test.skipIf(!IS_CHROME_BACKEND)(
    "a narrow footer sends the bar below the frame instead of over the pager",
    async () => {
        await using v = view();
        await open(v);
        await v.cdp("Emulation.setDeviceMetricsOverride", {
            width: 420,
            height: 700,
            deviceScaleFactor: 1,
            mobile: true,
        });
        await select(v, "page");
        await scrollGrid(v, "page", "bottom", "-innerHeight + 40");
        const g = await geometry(v, "page");
        expect(g.bar.top).toBeGreaterThanOrEqual(g.frame.bottom);
        expect(g.bar.bottom).toBeLessThanOrEqual(g.grid.bottom);
    },
    TIMEOUT,
);

test.skipIf(!IS_CHROME_BACKEND)(
    "clearing returns focus to a visible control, never to a row scrolled out of a fixed-height grid",
    async () => {
        await using v = view();
        await open(v);
        // The grid sits mid-window: a row scrolled two rows up stays inside the
        // window, clipped only by the scroll viewport and its sticky header.
        await scrollGrid(v, "fixed", "top", -300);
        await v.click('#grid-fixed tbody td[data-column-id="$selection"] input');
        await waitFor(v, "!grids.fixed.querySelector('.dg-bulk-layer').hidden");
        await v.evaluate(`(() => {
            const row = grids.fixed.querySelector('tbody tr');
            grids.fixed.scrollEl.scrollTop = row.getBoundingClientRect().height * 2;
        })()`);
        await v.evaluate("new Promise((resolve) => requestAnimationFrame(() => requestAnimationFrame(resolve)))");
        await v.evaluate(`(() => {
            grids.fixed.querySelector('.dg-bulk-actions button[data-action]').focus();
            grids.fixed.clearSelection();
        })()`);
        await waitFor(v, "grids.fixed.querySelector('.dg-bulk-layer').hidden");
        const focus = await read(
            v,
            `(() => {
                const el = document.activeElement;
                const rect = el.getBoundingClientRect();
                const scroll = grids.fixed.scrollEl.getBoundingClientRect();
                const first = grids.fixed.querySelector('tbody td[data-column-id="$selection"] input');
                return {
                    firstRowInWindow: first.getBoundingClientRect().top > 0,
                    inGrid: grids.fixed.contains(el),
                    firstRow: el === grids.fixed.querySelector('tbody td[data-column-id="$selection"] input'),
                    visible: rect.top >= scroll.top && rect.bottom <= scroll.bottom,
                };
            })()`,
        );
        expect(focus).toEqual({ firstRowInWindow: true, inGrid: true, firstRow: false, visible: true });
    },
    TIMEOUT,
);
