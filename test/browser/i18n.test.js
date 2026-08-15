import { afterAll, beforeAll, expect, test } from "bun:test";
import { ensureServer, IS_WINDOWS, read, stopServer, view, waitFor } from "./helpers.js";

const PAGE = "demo/i18n.html";
const META = "document.querySelector('#i18n-demo .dg-meta')";
const TIMEOUT = 15000;

beforeAll(ensureServer);
afterAll(stopServer);

/**
 * Pick a language in the demo select and fire the change event.
 * @param {Bun.WebView} view
 * @param {String} locale
 */
async function selectLocale(view, locale) {
    await view.evaluate(`(() => {
        const select = document.getElementById("locale");
        select.value = "${locale}";
        select.dispatchEvent(new Event("change", { bubbles: true }));
    })()`);
}

test.skipIf(IS_WINDOWS)(
    "switches locale live and back, including ESM module cache and RTL",
    async () => {
        await using v = view();
        await v.navigate(`${ensureServer()}/${PAGE}`);

        // English footer
        await waitFor(v, `${META} && ${META}.textContent.includes("of")`);

        await selectLocale(v, "fr");
        await waitFor(v, `${META}.textContent.includes("sur")`);

        await selectLocale(v, "de");
        await waitFor(v, `${META}.textContent.includes("von")`);

        // Re-importing a cached module must re-apply the labels
        await selectLocale(v, "fr");
        await waitFor(v, `${META}.textContent.includes("sur")`);

        // Arabic flips the grid to RTL
        await selectLocale(v, "ar");
        await waitFor(v, `${META}.textContent.includes("من")`);
        expect(await read(v, "document.querySelector('#i18n-demo data-grid').getAttribute('dir')")).toBe("rtl");
    },
    TIMEOUT,
);
