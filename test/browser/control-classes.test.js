import { afterAll, beforeAll, expect, test } from "bun:test";
import { ensureServer, IS_CHROME_BACKEND, IS_WINDOWS, read, stopServer, view, waitFor } from "./helpers.js";

beforeAll(ensureServer);
afterAll(stopServer);
const TIMEOUT = 15000;
const FIXTURE = "/test/browser/fixtures/host-controls.html";

for (const order of ["before", "after"]) {
    test.skipIf(IS_WINDOWS)(
        `standalone host classes survive CSS loaded ${order} the grid stylesheet`,
        async () => {
            await using v = view();
            await v.navigate(`${ensureServer()}${FIXTURE}`);
            await waitFor(
                v,
                'document.querySelector("#host .dg-btn-next.x-btn") && document.querySelector("#host .dg-search.x-input")',
            );
            await v.evaluate(`(() => {
            const host = document.querySelector("#host-style");
            const grid = document.querySelector("#lekoala-data-grid-style");
            grid.${order === "before" ? "before" : "after"}(host);
        })()`);
            await waitFor(
                v,
                // Host-owned controls only: roles left empty (the column menu's
                // checks here) keep the grid skin.
                `Array.from(document.querySelectorAll("#host [data-dg-control]:not(.dg-skin)")).every((control) => {
            const style = getComputedStyle(control);
            return parseFloat(style.borderTopWidth) === 3 && parseFloat(style.borderRadius) === 11 && parseFloat(style.height) === 44;
        })`,
            );
            expect(
                await read(v, 'parseFloat(getComputedStyle(document.querySelector("#host .dg-btn-next")).width)'),
            ).toBe(48);
            expect(await read(v, 'document.querySelector("#host .dg-btn-next").classList.contains("dg-skin")')).toBe(
                false,
            );
            expect(await read(v, 'document.querySelector("#host .dg-search").placeholder')).toBe("Search…");
            expect(await read(v, 'document.querySelector("#plain .dg-search").placeholder')).toBe("Search…");
            await v.evaluate('customElements.get("data-grid").setDefaultControlClasses({ button: "x-btn late" })');
            await waitFor(v, 'document.querySelector("#host .dg-btn-next.late")');
            // Space is the established keyboard activation primitive in this suite.
            await v.evaluate('document.querySelector("#host .dg-btn-next").focus()');
            await v.press("Space");
            await waitFor(v, 'document.querySelector("#host").query.page === 2');
            expect(await read(v, 'document.querySelector("#host tbody").textContent.includes("Grace")')).toBe(true);
            if (IS_CHROME_BACKEND) {
                await v.evaluate('document.querySelector("#host .dg-btn-prev").focus()');
                await waitFor(v, 'document.querySelector("#host .dg-btn-prev").matches(":focus-visible")');
                expect(
                    await read(
                        v,
                        'parseFloat(getComputedStyle(document.querySelector("#host .dg-btn-prev")).outlineWidth)',
                    ),
                ).toBe(3);
            }
        },
        TIMEOUT,
    );
}

test.skipIf(IS_WINDOWS)(
    "border width reaches the frame, rows, footer and grid-skinned controls",
    async () => {
        await using v = view();
        await v.navigate(`${ensureServer()}${FIXTURE}`);
        await waitFor(v, 'document.querySelector("#plain tbody td") && document.querySelector("#plain .dg-search")');
        expect(
            await read(
                v,
                `[
        [".dg-frame", "borderTopWidth"], ["tbody td", "borderBottomWidth"],
        [".dg-footer", "borderTopWidth"], [".dg-btn-next", "borderTopWidth"],
        [".dg-search", "borderTopWidth"], [".dg-select-per-page", "borderTopWidth"]
    ].every(([selector, property]) => parseFloat(getComputedStyle(document.querySelector("#plain " + selector))[property]) === 3)`,
            ),
        ).toBe(true);
    },
    TIMEOUT,
);

test.skipIf(IS_WINDOWS)(
    "host checks own their box while grid-skinned checks keep the native size",
    async () => {
        await using v = view();
        await v.navigate(`${ensureServer()}${FIXTURE}`);
        await waitFor(v, 'document.querySelector("#checks tbody .dg-selectable input.x-check")');
        expect(
            await read(
                v,
                `["#checks .dg-select-all", "#checks tbody .dg-selectable input"].map((selector) => {
        const style = getComputedStyle(document.querySelector(selector));
        return [parseFloat(style.width), style.appearance];
    })`,
            ),
        ).toEqual([
            [20, "none"],
            [20, "none"],
        ]);
        // Same check through the role, then back to the grid skin in place.
        await v.evaluate('document.querySelector("#checks").controlClasses = { check: "" }');
        await waitFor(v, 'document.querySelector("#checks .dg-select-all.dg-skin")');
        expect(
            await read(v, 'parseFloat(getComputedStyle(document.querySelector("#checks .dg-select-all")).width)'),
        ).toBe(16);
        // Selection still works through a host-classed box.
        await v.evaluate('document.querySelector("#checks").controlClasses = { check: "x-check" }');
        await v.evaluate('document.querySelector("#checks tbody .dg-selectable input").click()');
        await waitFor(v, 'document.querySelector("#checks").getSelection().length === 1');
    },
    TIMEOUT,
);

test.skipIf(!IS_CHROME_BACKEND)(
    "host keyboard focus remains visible in forced colors",
    async () => {
        await using v = view();
        await v.navigate(`${ensureServer()}${FIXTURE}`);
        await waitFor(v, 'document.querySelector("#host .dg-btn-next.x-btn")');
        await v.cdp("Emulation.setEmulatedMedia", { features: [{ name: "forced-colors", value: "active" }] });
        await v.evaluate('document.querySelector("#host .dg-btn-next").focus()');
        await v.press("Space");
        await waitFor(v, 'document.querySelector("#host").query.page === 2');
        await v.evaluate('document.querySelector("#host .dg-btn-prev").focus()');
        await waitFor(v, 'document.querySelector("#host .dg-btn-prev").matches(":focus-visible")');
        expect(
            await read(
                v,
                `(() => {
        const style = getComputedStyle(document.querySelector("#host .dg-btn-prev"));
        return matchMedia("(forced-colors: active)").matches && style.outlineStyle === "solid" && parseFloat(style.outlineWidth) === 3;
    })()`,
            ),
        ).toBe(true);
    },
    TIMEOUT,
);

test.skipIf(IS_WINDOWS)(
    "Actual header hooks and accent ink follow the current host tokens",
    async () => {
        await using v = view();
        await v.navigate(`${ensureServer()}${FIXTURE}`);
        await waitFor(v, 'document.querySelector("#host tbody td")');
        await v.evaluate(`(async () => {
        const theme = document.createElement("style");
        theme.textContent = await (await fetch("/themes/actual.css")).text();
        document.head.append(theme);
        const grid = document.querySelector("#host");
        for (const [token, value] of Object.entries({
            "--surface": "white", "--surface-subtle": "silver", "--surface-raised": "white",
            "--text": "black", "--text-muted": "gray", "--border": "black", "--border-width": "2px",
            "--primary": "yellow", "--link": "blue", "--focus": "blue", "--soft-bg-mix": "90%",
            "--danger": "red", "--radius": "4px", "--hover-overlay": "silver"
        })) grid.style.setProperty(token, value);
        grid.querySelector(".dg-sort").click();
    })()`);
        await waitFor(v, 'document.querySelector("#host th[aria-sort] .dg-sort-indicator")');
        expect(
            await read(
                v,
                `(() => {
        const header = document.querySelector("#host th[aria-sort]");
        return getComputedStyle(header).backgroundColor === getComputedStyle(document.querySelector("#host .dg-footer")).backgroundColor
            && getComputedStyle(header.querySelector(".dg-sort-indicator")).color !== getComputedStyle(header).backgroundColor;
    })()`,
            ),
        ).toBe(true);
        await v.evaluate('document.querySelector("#host").style.setProperty("--table-header-bg", "pink")');
        await waitFor(
            v,
            'getComputedStyle(document.querySelector("#host th[aria-sort]")).backgroundColor === "rgb(255, 192, 203)"',
        );
        await v.evaluate('document.querySelector("#host").style.removeProperty("--table-header-bg")');
        await waitFor(
            v,
            'getComputedStyle(document.querySelector("#host th[aria-sort]")).backgroundColor === "rgb(192, 192, 192)"',
        );
    },
    TIMEOUT,
);
