import { afterAll, beforeAll, expect, test } from "bun:test";
import { ensureServer, IS_CHROME_BACKEND, IS_WINDOWS, read, stopServer, view, waitFor } from "./helpers.js";

const FIXTURE = "test/browser/fixtures/disclosure.html";
const TIMEOUT = 15000;

const ROW = '#disclosure-grid tbody tr[data-row-index="$INDEX"]';
const TOGGLES = {
    responsive: `${ROW} .dg-responsive-toggle-control`,
    details: `${ROW} .dg-row-details-toggle-control`,
};

/** @param {String} template @param {Number} rowIndex @returns {String} */
function at(template, rowIndex) {
    return template.replace("$INDEX", String(rowIndex));
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
 * Both disclosure columns must be rendered before anything is measured: the
 * responsive toggle column stays hidden until the plugin has actually hidden
 * a data column.
 * @param {Bun.WebView} v
 */
async function open(v) {
    await v.navigate(`${ensureServer()}/${FIXTURE}`);
    await waitFor(v, "window.grid && window.grid.rows.length > 0");
    await waitFor(
        v,
        `document.querySelector('#disclosure-grid tbody td[data-column-id="$responsive"]:not([hidden])') && ` +
            `document.querySelector('#disclosure-grid tbody .dg-row-details-toggle-control')`,
    );
    await v.evaluate("new Promise((resolve) => requestAnimationFrame(() => resolve()))");
}

test.skipIf(IS_WINDOWS)(
    "responsive and row details toggles are the same compact, centered control",
    async () => {
        await using v = view();
        await open(v);

        for (const template of Object.values(TOGGLES)) {
            const selector = JSON.stringify(at(template, 0));
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

        // Row 0 selected, row 1 left plain: the same control in both contexts.
        await v.click(`${at(ROW, 0)} td[data-column-id="$selection"] input`);
        await waitFor(v, `document.querySelector('${at(ROW, 0)}[data-selected]')`);

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
        for (const [name, template] of Object.entries(TOGGLES)) {
            for (const [state, rowIndex] of [
                ["plain", 1],
                ["selected", 0],
            ]) {
                const result = await styles(at(template, rowIndex));

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
        for (const name of Object.keys(TOGGLES)) {
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

        const headerOrder = await read(
            v,
            `JSON.stringify([...document.querySelectorAll('#disclosure-grid thead .dg-head-columns th[data-column-id]')]
                .filter((th) => !th.hasAttribute("hidden"))
                .map((th) => th.dataset.columnId))`,
        );

        for (const template of Object.values(TOGGLES)) {
            const selector = JSON.stringify(at(template, 0));
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
                    `JSON.stringify([...document.querySelector(${JSON.stringify(at(ROW, 0))}).children]
                        .filter((td) => !td.hasAttribute("hidden"))
                        .map((td) => td.dataset.columnId))`,
                ),
            ).toBe(headerOrder);
        }
    },
    TIMEOUT,
);
