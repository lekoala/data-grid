import { afterAll, beforeAll, expect, test } from "bun:test";
import { ensureServer, IS_WINDOWS, read, stopServer, view, waitFor } from "./helpers.js";

const FIXTURE = "test/browser/fixtures/grid.html";
const TIMEOUT = 15000;

beforeAll(ensureServer);
afterAll(stopServer);

test.skipIf(IS_WINDOWS)(
    "clicking a checkbox selects the row",
    async () => {
        await using v = view();
        await v.navigate(`${ensureServer()}/${FIXTURE}`);
        await waitFor(v, "window.grid && window.grid.rows.length > 0");

        await v.click('#local-grid tbody td[data-column-id="$selection"] input');
        expect(await read(v, "window.grid.getSelectionState().ids.size")).toBe(1);
        expect(await read(v, "!!document.querySelector('#local-grid tbody tr[data-selected]')")).toBe(true);
    },
    TIMEOUT,
);

test.skipIf(IS_WINDOWS)(
    "clicking an action button dispatches the action event",
    async () => {
        await using v = view();
        await v.navigate(`${ensureServer()}/${FIXTURE}`);
        await waitFor(v, "window.grid && window.grid.rows.length > 0");

        await v.click('#local-grid tbody button[data-action="edit"]');
        await waitFor(v, "window.lastAction && window.lastAction.action === 'edit'");
        expect(await read(v, "window.lastAction.data.id")).toBe(1);
    },
    TIMEOUT,
);

test.skipIf(IS_WINDOWS)(
    "a clicked checkbox keeps keyboard focus",
    async () => {
        await using v = view();
        await v.navigate(`${ensureServer()}/${FIXTURE}`);
        await waitFor(v, "window.grid && window.grid.rows.length > 0");

        await v.click('#local-grid tbody td[data-column-id="$selection"] input');
        expect(await read(v, "document.activeElement.type")).toBe("checkbox");
        expect(await read(v, "document.activeElement.closest('#local-grid') !== null")).toBe(true);
    },
    TIMEOUT,
);

test.skipIf(IS_WINDOWS)(
    "the theme resolves --dg tokens and density overrides spacing",
    async () => {
        await using v = view();
        await v.navigate(`${ensureServer()}/${FIXTURE}`);
        await waitFor(v, "window.grid && window.grid.rows.length > 0");

        const bg = await read(v, "getComputedStyle(window.grid).getPropertyValue('--dg-bg').trim()");
        expect(bg.length).toBeGreaterThan(0);

        const defaultPad = await read(
            v,
            "parseFloat(getComputedStyle(window.grid).getPropertyValue('--dg-padding-y'))",
        );
        await v.evaluate(`(() => window.grid.setAttribute('density', 'compact'))()`);
        await waitFor(
            v,
            `parseFloat(getComputedStyle(window.grid).getPropertyValue('--dg-padding-y')) < ${defaultPad}`,
        );
        const compactPad = await read(
            v,
            "parseFloat(getComputedStyle(window.grid).getPropertyValue('--dg-padding-y'))",
        );
        // Density behavior plus the deliberate 4px-based geometry contract
        expect(defaultPad).toBe(8);
        expect(compactPad).toBe(4);
        expect(defaultPad).toBeGreaterThan(compactPad);
    },
    TIMEOUT,
);

test.skipIf(IS_WINDOWS)(
    "responsive mode hides columns on a narrow viewport",
    async () => {
        await using v = view();
        await v.navigate(`${ensureServer()}/${FIXTURE}`);
        await waitFor(v, "window.grid && window.grid.rows.length > 0");

        await v.evaluate(`(() => window.grid.setAttribute('responsive', ''))()`);
        await v.resize(380, 700);
        await waitFor(v, "document.querySelectorAll('#local-grid thead tr.dg-head-columns th[hidden]').length > 0");
    },
    TIMEOUT,
);

test.skipIf(IS_WINDOWS)(
    "a host button color rule does not recolor sort headers",
    async () => {
        await using v = view();
        await v.navigate(`${ensureServer()}/${FIXTURE}`);
        await waitFor(v, "window.grid && window.grid.rows.length > 0");

        const color = await read(
            v,
            "getComputedStyle(document.querySelector('#local-grid thead th.dg-sortable button.dg-sort')).color",
        );
        expect(color.toLowerCase()).toBe("rgb(17, 24, 39)"); // --dg-header-color
    },
    TIMEOUT,
);

test.skipIf(IS_WINDOWS)(
    "responsive hides then restores columns across a shrink/grow sequence",
    async () => {
        await using v = view();
        await v.navigate(`${ensureServer()}/${FIXTURE}`);
        await waitFor(v, "window.grid && window.grid.rows.length > 0");
        await v.evaluate(`(() => window.grid.setAttribute('responsive', ''))()`);

        const hiddenFields = () => "window.grid.options.columns.filter(c => c.responsiveHidden).map(c => c.field)";
        const hiddenJson = () => `JSON.stringify(${hiddenFields()})`;

        await v.resize(1280, 900);
        await waitFor(v, `${hiddenJson()} === '[]'`);

        await v.resize(640, 900);
        await waitFor(v, `${hiddenFields()}.length > 0`);
        const at640 = await read(v, hiddenJson());

        await v.resize(400, 900);
        await waitFor(v, `${hiddenFields()}.length > ${JSON.parse(at640).length}`);
        const at400 = await read(v, hiddenJson());
        expect(JSON.parse(at400).length).toBeGreaterThan(JSON.parse(at640).length);
        // Header and body must agree on the hidden columns
        expect(
            await read(
                v,
                "document.querySelector('#local-grid thead th[data-column-id=\"company\"]').hasAttribute('hidden')",
            ),
        ).toBe(true);
        expect(
            await read(
                v,
                "document.querySelector('#local-grid tbody td[data-column-id=\"company\"]').hasAttribute('hidden')",
            ),
        ).toBe(true);

        await v.resize(640, 900);
        await waitFor(v, `${hiddenFields()}.length === ${JSON.parse(at640).length}`);

        await v.resize(1280, 900);
        await waitFor(v, `${hiddenJson()} === '[]'`);
    },
    TIMEOUT,
);

test.skipIf(IS_WINDOWS)(
    "responsive state is idempotent at a fixed width",
    async () => {
        await using v = view();
        await v.navigate(`${ensureServer()}/${FIXTURE}`);
        await waitFor(v, "window.grid && window.grid.rows.length > 0");
        await v.evaluate(`(() => window.grid.setAttribute('responsive', ''))()`);

        const hiddenFields = () => "window.grid.options.columns.filter(c => c.responsiveHidden).map(c => c.field)";
        const hiddenJson = () => `JSON.stringify(${hiddenFields()})`;

        await v.resize(500, 900);
        await waitFor(v, `${hiddenFields()}.length > 0`);
        const snapshot = await read(v, hiddenJson());

        // Hold the width: the hidden set must never change again
        for (let i = 0; i < 12; i++) {
            await new Promise((resolve) => setTimeout(resolve, 100));
            expect(await read(v, hiddenJson())).toBe(snapshot);
        }
    },
    TIMEOUT,
);

test.skipIf(IS_WINDOWS)(
    "a selected row keeps its background over the stripe",
    async () => {
        await using v = view();
        await v.navigate(`${ensureServer()}/${FIXTURE}`);
        await waitFor(v, "window.grid && window.grid.rows.length > 0");

        const rowBg = (n) =>
            `getComputedStyle(document.querySelectorAll('#local-grid tbody tr')[${n}]).backgroundColor`;

        await v.evaluate("window.grid.selectAll()");
        // Wait for the 120ms background transition to settle
        await waitFor(v, `${rowBg(0)} !== 'rgba(0, 0, 0, 0)'`);
        await new Promise((resolve) => setTimeout(resolve, 200));

        const bgs = await read(v, `JSON.stringify([${rowBg(0)}, ${rowBg(1)}, ${rowBg(2)}])`);
        const [first, second, third] = JSON.parse(bgs);
        expect(second).toBe(first);
        expect(third).toBe(first);

        // Deselecting restores the normal (transparent) row background
        await v.evaluate("window.grid.clearSelection()");
        await waitFor(v, `${rowBg(0)} === 'rgba(0, 0, 0, 0)'`);
        expect(await read(v, rowBg(1))).toBe("rgba(0, 0, 0, 0)");
    },
    TIMEOUT,
);
