import { afterAll, beforeAll, expect, test } from "bun:test";
import { ensureServer, IS_CHROME_BACKEND, IS_WINDOWS, read, stopServer, view, waitFor } from "./helpers.js";

const FIXTURE = "test/browser/fixtures/details-dialog.html";
const TIMEOUT = 15000;

const OPEN = "document.querySelector('#sheet-grid dialog.dg-details-dialog')?.open";

beforeAll(ensureServer);
afterAll(stopServer);

/**
 * Load the fixture and open the first row of the sheet grid.
 * @param {Bun.WebView} v
 */
async function openSheet(v) {
    await v.navigate(`${ensureServer()}/${FIXTURE}`);
    await waitFor(v, "window.sheetGrid && window.sheetGrid.rows.length > 0");
    await v.click("#sheet-grid tbody tr.dg-data-row .dg-row-details-toggle-control");
    await waitFor(v, OPEN);
}

test.skipIf(IS_WINDOWS)(
    "the details dialog is modal, outside the scroll viewport, and closes on Escape",
    async () => {
        await using v = view();
        await openSheet(v);

        const state = JSON.parse(
            await read(
                v,
                `JSON.stringify((() => {
                    const grid = document.querySelector('#sheet-grid');
                    const dialog = grid.querySelector('dialog.dg-details-dialog');
                    const panel = dialog.querySelector(':scope > .dg-details-panel');
                    const header = panel.querySelector(':scope > .dg-details-header');
                    const body = panel.querySelector(':scope > .dg-details-body');
                    const close = dialog.querySelector(':scope > .dg-details-close');
                    return {
                        direct: dialog.parentElement === grid,
                        inScroll: Boolean(dialog.closest('.dg-scroll')),
                        modal: dialog.matches(':modal'),
                        labelledby: dialog.getAttribute('aria-labelledby') === dialog.querySelector('.dg-details-title').id,
                        closeOutsideBody: !body.contains(close),
                        headerVisible: header.getBoundingClientRect().height > 0,
                        bodyOverflow: getComputedStyle(body).overflowY,
                        dialogOverflow: getComputedStyle(dialog).overflow,
                        closeType: close.getAttribute('type'),
                    };
                })())`,
            ),
        );
        expect(state.direct).toBe(true);
        expect(state.inScroll).toBe(false);
        expect(state.modal).toBe(true);
        expect(state.labelledby).toBe(true);
        expect(state.closeOutsideBody).toBe(true);
        expect(state.headerVisible).toBe(true);
        expect(state.bodyOverflow).toBe("auto");
        expect(state.dialogOverflow).toBe("hidden");
        expect(state.closeType).toBe("button");

        // A body rerender keeps the session and its snapshot.
        await v.evaluate("window.sheetGrid.renderBody()");
        expect(await read(v, OPEN)).toBe(true);

        await v.press("Escape");
        await waitFor(v, `!(${OPEN}) && window.events.at(-1)?.expanded === false`);
        expect(await read(v, "window.events.at(-1).expanded")).toBe(false);

        // Focus restoration is engine-specific; the observable contract is that
        // the closed dialog no longer holds focus. Assert the Chrome backend.
        if (IS_CHROME_BACKEND) {
            expect(await read(v, "document.activeElement.classList.contains('dg-row-details-toggle-control')")).toBe(
                true,
            );
        }
    },
    TIMEOUT,
);

test.skipIf(IS_WINDOWS)(
    "the dialog keeps a viewport margin and the application content follows the sheet",
    async () => {
        await using v = view();
        await v.navigate(`${ensureServer()}/${FIXTURE}`);
        await waitFor(v, "window.sheetGrid && window.sheetGrid.rows.length > 0");
        await v.resize(400, 700);
        await v.click("#sheet-grid tbody tr.dg-data-row .dg-row-details-toggle-control");
        await waitFor(v, OPEN);

        const geometry = JSON.parse(
            await read(
                v,
                `JSON.stringify((() => {
                    const dialog = document.querySelector('#sheet-grid dialog.dg-details-dialog');
                    const box = dialog.getBoundingClientRect();
                    return {
                        width: box.width,
                        left: box.left,
                        right: box.right,
                        viewport: window.innerWidth,
                    };
                })())`,
            ),
        );
        expect(geometry.width).toBeLessThan(geometry.viewport);
        // `100vw` includes the scrollbar, so the authored 2rem margin renders
        // slightly narrower than intended. Assert a real margin, not an exact
        // value that engine scrollbars would break.
        expect(geometry.left).toBeGreaterThanOrEqual(4);
        expect(geometry.viewport - geometry.right).toBeGreaterThanOrEqual(4);

        await v.press("Escape");
        await waitFor(v, `!(${OPEN}) && window.events.at(-1)?.expanded === false`);

        await v.evaluate(
            "document.querySelector('#app-grid tbody tr.dg-data-row .dg-row-details-toggle-control').click()",
        );
        await waitFor(v, OPEN.replace("#sheet-grid", "#app-grid"));
        const body = JSON.parse(
            await read(
                v,
                `JSON.stringify((() => {
                    const dialog = document.querySelector('#app-grid dialog.dg-details-dialog');
                    const body = dialog.querySelector('.dg-details-body');
                    return {
                        sheet: Boolean(body.querySelector('.dg-details-list')),
                        app: body.querySelector('.dg-details-app .activity')?.textContent ?? '',
                    };
                })())`,
            ),
        );
        expect(body.sheet).toBe(true);
        expect(body.app).toBe("Activity for Name 1");
    },
    TIMEOUT,
);

test.skipIf(IS_WINDOWS)(
    "closing and reopening in one task keeps the last session open",
    async () => {
        await using v = view();
        await openSheet(v);

        // Both closes queue their native close event, delivered after the last
        // reopen: they must not end the session that is on screen.
        await v.evaluate(`(() => {
            const dialog = document.querySelector('#sheet-grid dialog.dg-details-dialog');
            window.closeEchoes = 0;
            dialog.addEventListener('close', () => window.closeEchoes++);
            const plugin = window.sheetGrid.getPlugin('RowDetails');
            plugin.expand('2');
            plugin.expand('1');
        })()`);
        // Both queued echoes must have been delivered before the state is read.
        await waitFor(v, "window.closeEchoes >= 2");

        const state = JSON.parse(
            await read(
                v,
                `JSON.stringify({
                    open: ${OPEN},
                    expanded: window.sheetGrid.getPlugin('RowDetails').isExpanded('1'),
                    title: document.querySelector('#sheet-grid .dg-details-title').textContent,
                    events: window.events.map((event) => event.rowKey + ':' + event.expanded),
                })`,
            ),
        );
        expect(state.open).toBe(true);
        expect(state.expanded).toBe(true);
        expect(state.title).toBe("Name 1");
        expect(state.events).toEqual(["1:true", "1:false", "2:true", "2:false", "1:true"]);
    },
    TIMEOUT,
);
