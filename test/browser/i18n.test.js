import { afterAll, beforeAll, expect, test } from "bun:test";
import { ensureServer, IS_WINDOWS, read, stopServer, view, waitFor } from "./helpers.js";

const PAGE = "demo/i18n.html";
const META = "document.querySelector('#i18n-demo .dg-meta')";
const PAGINATION = "document.querySelector('#i18n-demo .dg-pagination')";
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
    "keeps the footer symbolic across locales while ARIA labels translate, including RTL",
    async () => {
        await using v = view();
        await v.navigate(`${ensureServer()}/${PAGE}`);

        // The visible footer is language-neutral: numbers only, no words.
        await waitFor(v, `${META} && /^\\d+–\\d+ \\/ \\d+$/.test(${META}.textContent.trim())`);
        expect(await read(v, `${PAGINATION}.getAttribute("aria-label")`)).toContain("Page 1 of");

        await selectLocale(v, "fr");
        await waitFor(v, `${PAGINATION}.getAttribute("aria-label").includes("Page 1 sur")`);
        expect(await read(v, "document.documentElement.lang")).toBe("fr");

        await selectLocale(v, "de");
        await waitFor(v, `${PAGINATION}.getAttribute("aria-label").includes("Seite 1 von")`);
        expect(await read(v, "document.documentElement.lang")).toBe("de");

        // Re-importing a cached module must re-apply the labels
        await selectLocale(v, "fr");
        await waitFor(v, `${PAGINATION}.getAttribute("aria-label").includes("Page 1 sur")`);
        expect(await read(v, "document.documentElement.lang")).toBe("fr");

        // Arabic flips the grid to RTL and translates the group label
        await selectLocale(v, "ar");
        await waitFor(v, `${PAGINATION}.getAttribute("aria-label").includes("صفحة")`);
        expect(await read(v, "document.documentElement.lang")).toBe("ar");
        expect(await read(v, "document.querySelector('#i18n-demo data-grid').getAttribute('dir')")).toBe("rtl");

        // The visible footer never gained any language words.
        expect(await read(v, `/^\\d+–\\d+ \\/ \\d+$/.test(${META}.textContent.trim())`)).toBe(true);
    },
    TIMEOUT,
);
