import { afterAll, beforeAll, expect, test } from "bun:test";
import { ensureServer, IS_CHROME_BACKEND, IS_WINDOWS, read, stopServer, view, waitFor } from "./helpers.js";

const FIXTURE = "test/browser/fixtures/disclosure.html";
const TIMEOUT = 15000;

const GRIDS = {
    responsive: { id: "disclosure-grid", control: ".dg-responsive-toggle-control" },
    details: { id: "details-grid", control: ".dg-row-details-toggle-control" },
};

/** @param {{id: String}} grid @param {Number} rowIndex @returns {String} */
function rowOf(grid, rowIndex) {
    return `#${grid.id} tbody tr[data-row-index="${rowIndex}"]`;
}

/** @param {{id: String, control: String}} grid @param {Number} rowIndex @returns {String} */
function controlOf(grid, rowIndex) {
    return `${rowOf(grid, rowIndex)} ${grid.control}`;
}

/**
 * Alpha of a computed color. Chrome serializes a color-mix result as
 * `color(srgb r g b / a)`, the plain fallback as `rgba(r, g, b, a)`.
 * @param {String} value
 * @returns {Number}
 */
function alphaOf(value) {
    const slash = value.match(/\/\s*([0-9.]+)\s*\)/);
    if (slash) {
        return Number.parseFloat(slash[1]);
    }
    const parts = (value.match(/^rgba?\(([^)]+)\)/)?.[1] ?? "").split(",");
    return parts.length === 4 ? Number.parseFloat(parts[3]) : 1;
}

beforeAll(ensureServer);
afterAll(stopServer);

/**
 * Both grids must have hidden a column before anything is measured: that is
 * what puts a disclosure control on screen.
 * @param {Bun.WebView} v
 */
async function open(v) {
    await v.navigate(`${ensureServer()}/${FIXTURE}`);
    await waitFor(v, "window.grid && window.detailsGrid && window.grid.rows.length > 0");
    await waitFor(
        v,
        `document.querySelector('#disclosure-grid tbody td[data-column-id="$responsive"]:not([hidden])') && ` +
            `document.querySelector('#details-grid tbody td.dg-responsive-hidden')`,
    );
    await v.evaluate("new Promise((resolve) => requestAnimationFrame(() => resolve()))");
}

test.skipIf(IS_WINDOWS)(
    "responsive and row details toggles are the same compact, centered control",
    async () => {
        await using v = view();
        await open(v);

        for (const grid of Object.values(GRIDS)) {
            const selector = JSON.stringify(controlOf(grid, 0));
            const box = JSON.parse(
                await read(
                    v,
                    `JSON.stringify((() => {
                        const button = document.querySelector(${selector});
                        const cell = button.closest("td");
                        const b = button.getBoundingClientRect();
                        const c = cell.getBoundingClientRect();
                        return {
                            classes: [...button.classList],
                            position: getComputedStyle(button).position,
                            width: Math.round(b.width),
                            height: Math.round(b.height),
                            cellWidth: Math.round(c.width),
                            cellHeight: Math.round(c.height),
                            offsetStart: Math.round(b.left - c.left),
                            offsetEnd: Math.round(c.right - b.right),
                            offsetTop: Math.round(b.top - c.top),
                            offsetBottom: Math.round(c.bottom - b.bottom),
                        };
                    })())`,
                ),
            );

            // Shared primitive, never the full-cell click target of the selection column
            expect(box.classes).toContain("dg-disclosure");
            expect(box.classes).not.toContain("dg-clickable-cell");
            expect(box.position).toBe("static");

            // Compact: a 2rem square that does not stretch over the whole cell
            expect(box.width).toBe(32);
            expect(box.height).toBe(32);
            expect(box.width).toBeLessThan(box.cellWidth);

            // Centered on both axes (sub-pixel rounding tolerance)
            expect(Math.abs(box.offsetStart - box.offsetEnd)).toBeLessThanOrEqual(1);
            expect(Math.abs(box.offsetTop - box.offsetBottom)).toBeLessThanOrEqual(1);
        }
    },
    TIMEOUT,
);

test.skipIf(!IS_CHROME_BACKEND)(
    "the disclosure hover reads the same on plain and selected rows",
    async () => {
        await using v = view();
        await open(v);

        const styles = async (selector) => {
            const expression = JSON.stringify(selector);
            const snapshot = `(() => {
                const style = getComputedStyle(document.querySelector(${expression}));
                return { background: style.backgroundColor, color: style.color };
            })()`;
            const normal = await read(v, snapshot);
            const point = await read(
                v,
                `(() => {
                    const rect = document.querySelector(${expression}).getBoundingClientRect();
                    return { x: rect.left + rect.width / 2, y: rect.top + rect.height / 2 };
                })()`,
            );
            await v.cdp("Input.dispatchMouseEvent", { type: "mouseMoved", x: point.x, y: point.y });
            await waitFor(v, `document.querySelector(${expression}).matches(':hover')`);
            await v.evaluate("new Promise((resolve) => setTimeout(resolve, 180))");
            const hover = await read(v, snapshot);
            return { normal, hover };
        };

        /** @type {Record<String, {normal: any, hover: any}>} */
        const seen = {};
        for (const [name, grid] of Object.entries(GRIDS)) {
            // Row 0 selected, row 1 left plain: the same control in both contexts.
            await v.click(`${rowOf(grid, 0)} td[data-column-id="$selection"] input`);
            await waitFor(v, `document.querySelector('${rowOf(grid, 0)}[data-selected]')`);

            for (const [state, rowIndex] of [
                ["plain", 1],
                ["selected", 0],
            ]) {
                const result = await styles(controlOf(grid, rowIndex));

                // Transparent at rest: the row background shows through
                expect(result.normal.background).toBe("rgba(0, 0, 0, 0)");

                // Subtle but real feedback, in every row state
                expect(result.hover.background).not.toBe(result.normal.background);
                const alpha = alphaOf(result.hover.background);
                expect(alpha).toBeGreaterThan(0.02);
                expect(alpha).toBeLessThan(0.25);
                expect(result.hover.color).not.toBe(result.normal.color);

                seen[`${name}:${state}`] = result;
            }
        }

        // One interaction model: selection must not change how the control reacts
        for (const name of Object.keys(GRIDS)) {
            expect(seen[`${name}:selected`].hover).toEqual(seen[`${name}:plain`].hover);
        }

        // Both plugins share the very same rendering
        expect(seen["responsive:plain"].hover).toEqual(seen["details:plain"].hover);
        expect(seen["responsive:plain"].normal).toEqual(seen["details:plain"].normal);
    },
    TIMEOUT,
);

test.skipIf(IS_WINDOWS)(
    "toggling from the keyboard keeps the focus on the control",
    async () => {
        await using v = view();
        await open(v);

        for (const grid of Object.values(GRIDS)) {
            const selector = JSON.stringify(controlOf(grid, 0));
            const headerOrder = await read(
                v,
                `JSON.stringify([...document.querySelectorAll('#${grid.id} thead .dg-head-columns th[data-column-id]')]
                    .filter((th) => !th.hasAttribute("hidden"))
                    .map((th) => th.dataset.columnId))`,
            );
            await v.evaluate(`(() => document.querySelector(${selector}).focus())()`);

            // Expand, then collapse: both rebuild row content around the button
            for (const expected of ["true", "false"]) {
                await v.press("Enter");
                await waitFor(v, `document.querySelector(${selector}).getAttribute("aria-expanded") === "${expected}"`);

                // The control the user is operating must survive the DOM churn
                expect(await read(v, `document.activeElement === document.querySelector(${selector})`)).toBe(true);
            }

            // Cells restored from a detail row keep the canonical column order
            expect(
                await read(
                    v,
                    `JSON.stringify([...document.querySelector(${JSON.stringify(rowOf(grid, 0))}).children]
                        .filter((td) => !td.hasAttribute("hidden"))
                        .map((td) => td.dataset.columnId))`,
                ),
            ).toBe(headerOrder);
        }
    },
    TIMEOUT,
);

test.skipIf(IS_WINDOWS)(
    "one control governs both sections when responsive and row details are combined",
    async () => {
        await using v = view();
        await open(v);

        const detailsRows = "#details-grid tbody";

        // Responsive yielded its own toggle: a single chevron per row
        expect(await read(v, `document.querySelectorAll('${detailsRows} tr.dg-data-row .dg-disclosure').length`)).toBe(
            5,
        );
        expect(await read(v, `!!document.querySelector('#details-grid .dg-responsive-toggle-control')`)).toBe(false);

        // Collapsed by default: the hidden values are not stacked in every row
        expect(await read(v, `!!document.querySelector('${detailsRows} tr.dg-responsive-child-row')`)).toBe(false);

        const control = controlOf(GRIDS.details, 0);
        const selector = JSON.stringify(control);
        await v.click(control);
        await waitFor(v, `document.querySelector(${selector}).getAttribute("aria-expanded") === "true"`);

        // Both sections open: responsive values first, then application content
        expect(
            await read(
                v,
                `JSON.stringify([...document.querySelector(${JSON.stringify(rowOf(GRIDS.details, 0))}).parentNode.children]
                    .slice(0, 3)
                    .map((tr) => tr.className))`,
            ),
        ).toBe(JSON.stringify(["dg-data-row dg-responsive-expanded", "dg-responsive-child-row", "dg-row-details-row"]));

        // And both come down together
        await v.click(control);
        await waitFor(v, `document.querySelector(${selector}).getAttribute("aria-expanded") === "false"`);
        expect(await read(v, `!!document.querySelector('${detailsRows} tr.dg-responsive-child-row')`)).toBe(false);
        expect(await read(v, `!!document.querySelector('${detailsRows} tr.dg-row-details-row')`)).toBe(false);
    },
    TIMEOUT,
);
