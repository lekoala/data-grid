import { afterAll, beforeAll, expect, test } from "bun:test";
import { ensureServer, IS_WINDOWS, read, stopServer, view, waitFor } from "./helpers.js";

const FIXTURE = "test/browser/fixtures/dist-standalone.html";
const STYLE_ID = "lekoala-data-grid-style";
const TIMEOUT = 15000;

beforeAll(ensureServer);
afterAll(stopServer);

test.skipIf(IS_WINDOWS)(
    "renders a grid from a single standalone script with no stylesheet link",
    async () => {
        await using v = view();
        await v.navigate(`${ensureServer()}/${FIXTURE}`);
        await waitFor(v, "document.querySelectorAll('tbody tr.dg-data-row').length === 2");

        // The page ships no stylesheet: any grid styling must come from the
        // injected style element.
        expect(await read(v, "document.querySelectorAll('link').length")).toBe(0);
        expect(await read(v, `document.querySelectorAll('#${STYLE_ID}').length`)).toBe(1);
        expect(await read(v, `document.getElementById('${STYLE_ID}').textContent.includes('--dg-bg')`)).toBe(true);
        // The stylesheet applies structurally (computed), not just by presence.
        expect(await read(v, "getComputedStyle(document.querySelector('.dg-status')).position")).toBe("absolute");
        // The loading script's nonce is propagated to the injected <style>.
        expect(await read(v, `document.getElementById('${STYLE_ID}').nonce`)).toBe("data-grid-test");
        // The IIFE registers the element but leaks no application globals.
        expect(await read(v, "['DataGrid', 'ArrayDataSource', 'FetchDataSource'].every((k) => !(k in window))")).toBe(
            true,
        );
    },
    TIMEOUT,
);

test.skipIf(IS_WINDOWS)(
    "reloading the standalone script stays idempotent",
    async () => {
        await using v = view();
        await v.navigate(`${ensureServer()}/${FIXTURE}`);
        await waitFor(v, "document.querySelectorAll('tbody tr.dg-data-row').length === 2");

        // Load the bundle a second time, as a duplicate script element would.
        await v.evaluate(`(async () => {
            await new Promise((resolve, reject) => {
                const script = document.createElement('script');
                script.nonce = 'data-grid-test';
                script.src = '/dist/data-grid.standalone.min.js';
                script.onload = resolve;
                script.onerror = reject;
                document.body.append(script);
            });
        })()`);

        expect(await read(v, `document.querySelectorAll('#${STYLE_ID}').length`)).toBe(1);
        expect(await read(v, "document.querySelectorAll('tbody tr.dg-data-row').length")).toBe(2);
    },
    TIMEOUT,
);
