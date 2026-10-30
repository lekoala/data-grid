import { afterAll, beforeAll, expect, test } from "bun:test";
import { ensureServer, IS_CHROME_BACKEND, IS_WINDOWS, read, stopServer, view, waitFor } from "./helpers.js";

const GRID = 'document.querySelector("#customers-grid")';
const OPEN = 'document.querySelector("#customers-grid dialog[open]")';
const NEXT = '#customers-grid dialog[open] [data-record-step="1"]';
const PREVIOUS = '#customers-grid dialog[open] [data-record-step="-1"]';
const POSITION = `${OPEN}?.querySelector('[data-record-position]')?.textContent`;
const TIMEOUT = 15000;
beforeAll(ensureServer);
afterAll(stopServer);

async function open(v) {
    await v.navigate(`${ensureServer()}/demo/customers.html`);
    await waitFor(v, `${GRID}?.rows.length === 10 && !${GRID}.loading`);
    await waitFor(v, `getComputedStyle(${GRID}.querySelector('table')).visibility === 'visible'`);
}

test.skipIf(IS_WINDOWS)(
    "record navigation keeps keyboard focus, page scope, selection and the original return target",
    async () => {
        await using v = view();
        await open(v);
        await v.click('#customers-grid tbody input[type="checkbox"]');
        await v.click("#customers-grid .customer-name");
        await waitFor(v, `${POSITION} === '1 of 10 on this page'`);
        expect(await read(v, `document.querySelector(${JSON.stringify(PREVIOUS)}).disabled`)).toBe(true);
        await v.evaluate(`document.querySelector(${JSON.stringify(NEXT)}).focus()`);
        for (let i = 2; i <= 10; i++) {
            await v.press("Space");
            await waitFor(v, `${POSITION} === '${i} of 10 on this page'`);
            expect(await read(v, "Boolean(document.activeElement.closest('dialog[open]'))")).toBe(true);
        }
        expect(await read(v, `document.querySelector(${JSON.stringify(NEXT)}).disabled`)).toBe(true);
        expect(await read(v, "document.activeElement.hasAttribute('data-record-position')")).toBe(true);
        await v.click(PREVIOUS);
        await waitFor(v, `${POSITION} === '9 of 10 on this page'`);
        expect(await read(v, `${GRID}.page`)).toBe(1);
        expect(await read(v, `${GRID}.getSelectionState().ids.size`)).toBe(1);
        expect(await read(v, `${GRID}.querySelectorAll('dialog[open]').length`)).toBe(1);
        await v.press("Escape");
        await waitFor(v, `!(${OPEN}) && document.activeElement.matches('.customer-name')`);
        expect(await read(v, "document.activeElement.textContent")).toBe("Avery Morgan");
        await v.click("#customers-grid .dg-row-details-toggle-control");
        await waitFor(v, `${POSITION} === '1 of 10 on this page'`);
        await v.click(NEXT);
        await waitFor(v, `${POSITION} === '2 of 10 on this page'`);
        await v.press("Escape");
        await waitFor(v, `!(${OPEN}) && document.activeElement.matches('.dg-row-details-toggle-control')`);
        expect(await read(v, "document.activeElement.closest('tr').dataset.rowIndex")).toBe("0");
    },
    TIMEOUT,
);

test.skipIf(IS_WINDOWS)(
    "query changes and delayed reloads close the inspection and reject old navigation callbacks",
    async () => {
        await using v = view();
        await open(v);
        await v.click("#customers-grid .dg-row-details-toggle-control");
        await waitFor(v, OPEN);
        await v.evaluate(`window.oldCustomerNext = document.querySelector(${JSON.stringify(NEXT)})`);
        await v.evaluate(`${GRID}.setQuery({ page: 2 })`);
        await waitFor(v, `!(${OPEN}) && document.activeElement.matches('[data-search-focus]')`);
        await v.evaluate("window.oldCustomerNext.click()");
        expect(await read(v, `Boolean(${OPEN})`)).toBe(false);

        await v.click("#customers-grid .customer-name");
        await waitFor(v, `${POSITION} === '1 of 10 on this page'`);
        await v.evaluate(`(() => {
            window.oldCustomerNext = document.querySelector(${JSON.stringify(NEXT)});
            ${GRID}.dataSource.load = () => new Promise(resolve => { window.finishCustomerReload = resolve; });
            window.customerReload = ${GRID}.refresh();
        })()`);
        await waitFor(v, `!(${OPEN})`);
        await v.evaluate("window.oldCustomerNext.click()");
        expect(await read(v, `Boolean(${OPEN})`)).toBe(false);
        await v.evaluate(`(async () => {
            window.finishCustomerReload({ rows: [{ id: 'replacement', name: 'Replacement customer' }], total: 11 });
            await window.customerReload;
        })()`);
        expect(await read(v, `Boolean(${OPEN})`)).toBe(false);
        await waitFor(v, `getComputedStyle(${GRID}.querySelector('table')).visibility === 'visible'`);
        await v.click("#customers-grid .customer-name");
        await waitFor(v, `${POSITION} === '1 of 1 on this page'`);
        expect(await read(v, `document.querySelector(${JSON.stringify(NEXT)}).disabled`)).toBe(true);
        await v.press("Escape");
        await waitFor(v, `!(${OPEN})`);
    },
    TIMEOUT,
);

test.skipIf(IS_WINDOWS)(
    "disconnect and reconnect cannot reactivate an old record navigation session",
    async () => {
        await using v = view();
        await open(v);
        await v.click("#customers-grid .customer-name");
        await waitFor(v, OPEN);
        await v.evaluate(`(async () => {
            window.oldCustomerNext = document.querySelector(${JSON.stringify(NEXT)});
            const grid = ${GRID};
            const parent = grid.parentNode;
            const disconnected = new Promise(resolve => grid.addEventListener('disconnected', resolve, { once: true }));
            grid.remove();
            await disconnected;
            window.oldCustomerNext.click();
            const connected = new Promise(resolve => grid.addEventListener('connected', resolve, { once: true }));
            parent.append(grid);
            await connected;
        })()`);
        expect(await read(v, `Boolean(${OPEN})`)).toBe(false);
        await waitFor(v, `getComputedStyle(${GRID}.querySelector('table')).visibility === 'visible'`);
        await v.click("#customers-grid .customer-name");
        await waitFor(v, `${POSITION} === '1 of 10 on this page'`);
        await v.evaluate("window.oldCustomerNext.click()");
        expect(await read(v, POSITION)).toBe("1 of 10 on this page");
        expect(await read(v, `${GRID}.querySelectorAll('.customers-record-navigation').length`)).toBe(1);
    },
    TIMEOUT,
);

test.skipIf(IS_WINDOWS)(
    "returning a pending search draft to its current value allows opening a record",
    async () => {
        await using v = view();
        await open(v);
        await v.evaluate(`(() => {
            const input = ${GRID}.querySelector('.dg-search');
            input.value = 'draft';
            input.dispatchEvent(new Event('input', { bubbles: true }));
            input.value = '';
            input.dispatchEvent(new Event('input', { bubbles: true }));
        })()`);
        await v.click("#customers-grid .customer-name");
        await waitFor(v, `${POSITION} === '1 of 10 on this page'`);
        expect(await read(v, `${GRID}.query.search`)).toBe("");
    },
    TIMEOUT,
);

test.skipIf(!IS_CHROME_BACKEND)(
    "the modal customer drawer docks to the inline end and fits desktop and narrow RTL viewports",
    async () => {
        await using v = view();
        await open(v);
        await v.click("#customers-grid .customer-name");
        await waitFor(v, OPEN);
        for (const width of [1280, 390]) {
            await v.cdp("Emulation.setDeviceMetricsOverride", {
                width,
                height: 844,
                deviceScaleFactor: 1,
                mobile: false,
            });
            for (const direction of ["ltr", "rtl"]) {
                await v.evaluate(`${GRID}.setAttribute('dir', '${direction}')`);
                await waitFor(
                    v,
                    `(() => {
                    const dialog = ${OPEN};
                    const r = dialog.getBoundingClientRect();
                    return r.left >= -1 && r.right <= innerWidth + 1 && r.top >= -1 && r.bottom <= innerHeight + 1 &&
                        (${JSON.stringify(direction)} === 'rtl' ? Math.abs(r.left) < 1 : Math.abs(r.right - document.documentElement.clientWidth) < 1);
                })()`,
                );
                expect(await read(v, `(${OPEN}).matches(':modal')`)).toBe(true);
                expect(
                    await read(
                        v,
                        `(${OPEN}).getAttribute('aria-labelledby') === (${OPEN}).querySelector('.dg-details-title').id`,
                    ),
                ).toBe(true);
            }
        }
        await v.press("Escape");
        await waitFor(v, `!(${OPEN}) && !document.activeElement.closest('dialog')`);
    },
    TIMEOUT,
);
