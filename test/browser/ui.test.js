import { afterAll, beforeAll, expect, test } from "bun:test";
import { ensureServer, IS_WINDOWS, read, stopServer, view, waitFor } from "./helpers.js";

const FIXTURE = "test/browser/fixtures/grid.html";

beforeAll(ensureServer);
afterAll(stopServer);

test.skipIf(IS_WINDOWS)("clicking a checkbox selects the row", async () => {
    await using v = view();
    await v.navigate(`${ensureServer()}/${FIXTURE}`);
    await waitFor(v, "window.grid && window.grid.rows.length > 0");

    await v.click('#local-grid tbody td[data-column-id="$selection"] input');
    expect(await read(v, "window.grid.getSelectionState().ids.size")).toBe(1);
    expect(await read(v, "!!document.querySelector('#local-grid tbody tr[data-selected]')")).toBe(true);
});

test.skipIf(IS_WINDOWS)("clicking an action button dispatches the action event", async () => {
    await using v = view();
    await v.navigate(`${ensureServer()}/${FIXTURE}`);
    await waitFor(v, "window.grid && window.grid.rows.length > 0");

    await v.click('#local-grid tbody button[data-action="edit"]');
    await waitFor(v, "window.lastAction && window.lastAction.action === 'edit'");
    expect(await read(v, "window.lastAction.data.id")).toBe(1);
});

test.skipIf(IS_WINDOWS)("a clicked checkbox keeps keyboard focus", async () => {
    await using v = view();
    await v.navigate(`${ensureServer()}/${FIXTURE}`);
    await waitFor(v, "window.grid && window.grid.rows.length > 0");

    await v.click('#local-grid tbody td[data-column-id="$selection"] input');
    expect(await read(v, "document.activeElement.type")).toBe("checkbox");
    expect(await read(v, "document.activeElement.closest('#local-grid') !== null")).toBe(true);
});

test.skipIf(IS_WINDOWS)("the theme resolves --dg tokens and density overrides spacing", async () => {
    await using v = view();
    await v.navigate(`${ensureServer()}/${FIXTURE}`);
    await waitFor(v, "window.grid && window.grid.rows.length > 0");

    const bg = await read(v, "getComputedStyle(window.grid).getPropertyValue('--dg-bg').trim()");
    expect(bg.length).toBeGreaterThan(0);

    const defaultPad = await read(v, "getComputedStyle(window.grid).getPropertyValue('--dg-padding-y').trim()");
    await v.evaluate(`(() => window.grid.setAttribute('density', 'compact'))()`);
    await waitFor(v, "getComputedStyle(window.grid).getPropertyValue('--dg-padding-y').trim() === '0.25rem'");
    const compactPad = await read(v, "getComputedStyle(window.grid).getPropertyValue('--dg-padding-y').trim()");
    expect(defaultPad).not.toBe(compactPad);
    expect(compactPad).toBe("0.25rem");
});

test.skipIf(IS_WINDOWS)("responsive mode hides columns on a narrow viewport", async () => {
    await using v = view();
    await v.navigate(`${ensureServer()}/${FIXTURE}`);
    await waitFor(v, "window.grid && window.grid.rows.length > 0");

    await v.evaluate(`(() => window.grid.setAttribute('responsive', ''))()`);
    await v.resize(380, 700);
    await waitFor(v, "document.querySelectorAll('#local-grid thead tr.dg-head-columns th[hidden]').length > 0");
});
