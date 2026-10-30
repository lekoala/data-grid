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
            await v.evaluate(`document.documentElement.dir = '${direction}'`);
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
        await v.evaluate("document.querySelector('[data-select-matching]').focus()");
        await v.press("Space");
        await waitFor(v, `${GRID}.getSelectionState().mode === 'all'`);
        expect(await read(v, "document.activeElement.matches('[data-search-focus]')")).toBe(true);
        await v.click('#customers-grid tbody input[type="checkbox"]');
        await v.click("#customers-grid .dg-bulk-actions button");
        expect(await read(v, "document.querySelector('[data-action-feedback]').textContent")).toContain("excluding 1");
        await v.click('[data-status-pills] button[data-status="trial"]');
        await waitFor(v, `${GRID}.query.filters.status?.value === 'trial' && !${GRID}.loading`);
        expect(await read(v, "document.querySelector('[data-clear-selection]').hidden")).toBe(true);
        expect(await read(v, "document.querySelector('[data-selection-scope]').textContent")).toBe("");
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
