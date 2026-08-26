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
        await waitFor(v, "window.lastAction && window.lastAction.name === 'edit'");
        expect(await read(v, "window.lastAction.row.id")).toBe(1);
        expect(await read(v, "window.lastAction.rowKey")).toBe("1");
        expect(await read(v, "window.lastAction.action.name")).toBe("edit");
    },
    TIMEOUT,
);

test.skipIf(IS_WINDOWS)(
    "keyboard selection preserves checkbox focus",
    async () => {
        await using v = view();
        await v.navigate(`${ensureServer()}/${FIXTURE}`);
        await waitFor(v, "window.grid && window.grid.rows.length > 0");

        const selector = '#local-grid tbody td[data-column-id="$selection"] input';
        await v.evaluate(`(() => {
            document.querySelector(${JSON.stringify(selector)}).focus();
        })()`);
        expect(await read(v, "document.activeElement.type")).toBe("checkbox");

        await v.press("Space");
        await waitFor(v, "window.grid.getSelectionState().ids.size === 1");

        // The selection refresh must not steal focus from the keyboard user
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
    "page-size and filter selects share the same caret geometry",
    async () => {
        await using v = view();
        await v.navigate(`${ensureServer()}/${FIXTURE}`);
        await waitFor(v, "window.grid && window.grid.rows.length > 0");

        await v.evaluate(`(() => {
            window.grid.options.columns.find((column) => column.field === "company").filterType = "select";
            window.grid.renderTable();
        })()`);
        await waitFor(v, "document.querySelector('#local-grid .dg-head-filters select')");

        const styles = JSON.parse(
            await read(
                v,
                `JSON.stringify([
                    document.querySelector('#local-grid .dg-select-per-page'),
                    document.querySelector('#local-grid .dg-head-filters select'),
                ].map((select) => {
                    const style = getComputedStyle(select);
                    const caret = getComputedStyle(select.closest('.dg-select-field'), '::after');
                    return {
                        appearance: style.appearance,
                        paddingInlineEnd: style.paddingInlineEnd,
                        caret: {
                            width: caret.width,
                            height: caret.height,
                            borderInlineEndWidth: caret.borderInlineEndWidth,
                            transform: caret.transform,
                            insetInlineEnd: caret.insetInlineEnd,
                        },
                    };
                }))`,
            ),
        );
        expect(styles[0].appearance).toBe("none");
        expect(styles[1].appearance).toBe("none");
        expect(styles[0].paddingInlineEnd).toBe("32px");
        expect(styles[0].caret).toEqual(styles[1].caret);
        expect(styles[0].caret.width).toBe("6px");
        expect(styles[0].caret.borderInlineEndWidth).toBe("1px");
        expect(styles[0].caret.insetInlineEnd).toBe("12px");
    },
    TIMEOUT,
);

test.skipIf(IS_WINDOWS)(
    "multi-select filter keeps its panel usable across immediate applies",
    async () => {
        await using v = view();
        await v.navigate(`${ensureServer()}/${FIXTURE}`);
        await waitFor(v, "window.grid && window.grid.rows.length > 0");

        await v.evaluate(`(() => {
            const column = window.grid.options.columns.find((c) => c.field === "company");
            column.filterType = "select";
            column.filterMultiple = true;
            window.grid.renderTable();
        })()`);
        await waitFor(v, "document.querySelector('#local-grid .dg-head-filters .dg-multiselect')");

        const filterHeights = JSON.parse(
            await read(
                v,
                `JSON.stringify({
                    text: document.querySelector('#local-grid .dg-head-filters input.dg-filter-control')
                        .getBoundingClientRect().height,
                    multi: document.querySelector('#local-grid .dg-head-filters .dg-multiselect')
                        .getBoundingClientRect().height,
                })`,
            ),
        );
        expect(filterHeights.multi).toBe(filterHeights.text);

        await v.evaluate(`(() => {
            document.querySelector('#local-grid .dg-multiselect-trigger').click();
        })()`);
        expect(await read(v, "document.querySelector('#local-grid .dg-multiselect-panel').hidden")).toBe(false);
        expect(
            await read(
                v,
                `(() => {
                    const panel = document.querySelector('#local-grid .dg-multiselect-panel');
                    const rect = panel.getBoundingClientRect();
                    const hit = document.elementFromPoint(rect.left + 4, rect.top + 4);
                    return panel.contains(hit);
                })()`,
            ),
        ).toBe(true);
        expect(
            await read(
                v,
                "getComputedStyle(document.querySelector('#local-grid .dg-multiselect-trigger'), '::after').content",
            ),
        ).not.toBe("none");

        const check = (value, checked) =>
            `(() => {
                const box = document.querySelector('#local-grid .dg-multiselect input[data-value="${value}"]');
                box.checked = ${checked};
                box.dispatchEvent(new Event('change', { bubbles: true }));
            })()`;

        // Each change applies immediately; the panel must stay open and keep
        // the same usable nodes instead of being rebuilt by the reload
        await v.evaluate(check("Acme", true));
        await waitFor(v, "window.grid.query.filters.company.value.length === 1");
        expect(await read(v, "JSON.stringify(window.grid.query.filters.company)")).toBe(
            JSON.stringify({ operator: "in", value: ["Acme"] }),
        );
        expect(await read(v, "document.querySelector('#local-grid .dg-multiselect-panel').hidden")).toBe(false);
        expect(await read(v, "document.querySelectorAll('#local-grid tbody tr.dg-data-row').length")).toBe(10);

        await v.evaluate(check("Google", true));
        await waitFor(v, "window.grid.query.filters.company.value.length === 2");
        expect(await read(v, "JSON.stringify(window.grid.query.filters.company.value)")).toBe(
            JSON.stringify(["Acme", "Google"]),
        );

        await v.evaluate(check("Acme", false));
        await waitFor(v, "window.grid.query.filters.company.value.length === 1");
        expect(await read(v, "JSON.stringify(window.grid.query.filters.company.value)")).toBe(
            JSON.stringify(["Google"]),
        );

        // Unchecking everything drops the filter entirely
        await v.evaluate(check("Google", false));
        await waitFor(v, "window.grid.query.filters.company === undefined");
        expect(await read(v, "document.querySelectorAll('#local-grid tbody tr.dg-data-row').length")).toBe(10);

        // Escape dismisses and restores focus to the trigger
        await v.evaluate(`(() => {
            document.querySelector('#local-grid .dg-multiselect-trigger').click();
            document.querySelector('#local-grid .dg-multiselect-panel').focus();
        })()`);
        await v.press("Escape");
        await waitFor(v, "document.querySelector('#local-grid .dg-multiselect-panel').hidden === true");
        expect(await read(v, "document.activeElement.className.includes('dg-multiselect-trigger')")).toBe(true);
        expect(
            await read(v, "getComputedStyle(document.querySelector('#local-grid .dg-multiselect')).boxShadow"),
        ).not.toBe("none");
        expect(
            await read(
                v,
                "getComputedStyle(document.querySelector('#local-grid .dg-multiselect-trigger')).outlineStyle",
            ),
        ).toBe("none");
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
    "a selected row overrides stripes and then restores the baseline backgrounds",
    async () => {
        await using v = view();
        await v.navigate(`${ensureServer()}/${FIXTURE}`);
        await waitFor(v, "window.grid && window.grid.rows.length > 0");

        const rowBg = (n) =>
            `getComputedStyle(document.querySelectorAll('#local-grid tbody tr')[${n}]).backgroundColor`;
        const baseline = await read(v, `JSON.stringify([${rowBg(0)}, ${rowBg(1)}, ${rowBg(2)}])`);

        await v.evaluate("window.grid.selectAll()");
        // Wait for the 120ms background transition to settle
        await waitFor(v, `${rowBg(0)} !== 'rgba(0, 0, 0, 0)'`);
        await new Promise((resolve) => setTimeout(resolve, 200));

        const bgs = await read(v, `JSON.stringify([${rowBg(0)}, ${rowBg(1)}, ${rowBg(2)}])`);
        const [first, second, third] = JSON.parse(bgs);
        expect(second).toBe(first);
        expect(third).toBe(first);

        // Deselecting restores each row's original background state.
        await v.evaluate("window.grid.clearSelection()");
        await waitFor(v, "document.querySelectorAll('#local-grid tbody tr[data-selected]').length === 0");
        await new Promise((resolve) => setTimeout(resolve, 200));
        expect(await read(v, `JSON.stringify([${rowBg(0)}, ${rowBg(1)}, ${rowBg(2)}])`)).toBe(baseline);
    },
    TIMEOUT,
);

test.skipIf(IS_WINDOWS)(
    "responsive start-open keeps details and protects active columns across resize",
    async () => {
        await using v = view();
        await v.navigate(`${ensureServer()}/${FIXTURE}`);
        await waitFor(v, "window.stacked && window.stacked.rows.length > 0");

        const childRows = () => "document.querySelectorAll('#stacked-grid tbody tr.dg-responsive-child-row').length";
        const hiddenFields = () => "window.stacked.options.columns.filter(c => c.responsiveHidden).map(c => c.field)";

        // Narrow grid: lower-priority columns hidden and details open by default
        await waitFor(v, `${childRows()} > 0`);
        expect(await read(v, childRows())).toBeGreaterThan(0);
        expect(await read(v, `document.querySelectorAll('#stacked-grid tbody tr.dg-data-row').length`)).toBe(20);

        // An actively sorted column is protected from hiding
        await v.evaluate("window.stacked.sortAsc('company')");
        await waitFor(v, `${hiddenFields()}.includes('company') === false`);
        expect(await read(v, `${hiddenFields()}.includes('company')`)).toBe(false);

        // Filtering re-renders the body but must keep the start-open details
        await v.evaluate("window.stacked.setSearch('Name 1')");
        await waitFor(v, `${childRows()} > 0`);

        // Widen: details disappear, cells restored
        await v.evaluate("window.stacked.style.width = '1200px'");
        await waitFor(v, `${childRows()} === 0`);
        expect(await read(v, hiddenFields())).toEqual([]);

        // Narrow again: details rebuild for the open rows
        await v.evaluate("window.stacked.style.width = '380px'");
        await waitFor(v, `${childRows()} > 0`);
        expect(await read(v, childRows())).toBeGreaterThan(0);
    },
    TIMEOUT,
);

test.skipIf(IS_WINDOWS)(
    "the sticky header does not jump on the first pixel of scroll",
    async () => {
        await using v = view();
        await v.navigate(`${ensureServer()}/${FIXTURE}`);
        await waitFor(v, "window.grid && window.grid.rows.length > 0");

        // Constrain the host so the .dg-scroll viewport (the table's scroll
        // area) is the vertical stick container for thead/tfoot.
        await v.evaluate("window.grid.style.maxHeight = '200px'");
        await new Promise((resolve) => setTimeout(resolve, 150));

        const relTop = async () =>
            await read(
                v,
                "Number((document.querySelector('#local-grid thead').getBoundingClientRect().top - window.grid.scrollEl.getBoundingClientRect().top).toFixed(2))",
            );

        const atTop = await relTop();
        await v.evaluate("window.grid.scrollEl.scrollTop = 10");
        await new Promise((resolve) => setTimeout(resolve, 150));
        const scrolled = await relTop();

        // Subpixel: engaging the sticky state must not translate the header.
        expect(Math.abs(scrolled - atTop)).toBeLessThan(0.5);
    },
    TIMEOUT,
);
