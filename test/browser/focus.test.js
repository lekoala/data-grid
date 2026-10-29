import { afterAll, beforeAll, expect, test } from "bun:test";
import { ensureServer, IS_CHROME_BACKEND, IS_WINDOWS, read, stopServer, view, waitFor } from "./helpers.js";

const FIXTURE = "test/browser/fixtures/grid.html";
const HOST_FIXTURE = "test/browser/fixtures/host-focus.html";
const TIMEOUT = 15000;

beforeAll(ensureServer);
afterAll(stopServer);

function focusStyle(v, selector) {
    return read(
        v,
        `(() => {
            const style = getComputedStyle(document.querySelector(${JSON.stringify(selector)}));
            return {
                outlineStyle: style.outlineStyle,
                outlineWidth: style.outlineWidth,
                outlineColor: style.outlineColor,
                outlineOffset: style.outlineOffset,
                boxShadow: style.boxShadow,
            };
        })()`,
    );
}

test.skipIf(IS_WINDOWS)(
    "grid fields paint one inset outline and keep their border neutral",
    async () => {
        await using v = view();
        await v.navigate(`${ensureServer()}/${FIXTURE}`);
        await waitFor(v, "window.grid && window.grid.rows.length > 0");
        await v.evaluate(`(() => {
            window.grid.style.setProperty("--dg-focus-color", "rgb(1, 2, 3)");
            document.querySelector("#local-grid .dg-input-page").focus();
        })()`);
        await waitFor(v, 'document.querySelector("#local-grid .dg-input-page").matches(":focus-visible")');
        const focus = await focusStyle(v, "#local-grid .dg-input-page");
        expect(focus.outlineStyle).toBe("solid");
        expect(focus.outlineWidth).toBe("2px");
        expect(focus.outlineColor).toBe("rgb(1, 2, 3)");
        expect(focus.outlineOffset).toBe("-2px");
        expect(focus.boxShadow).toBe("none");
        expect(
            await read(v, 'getComputedStyle(document.querySelector("#local-grid .dg-input-page")).borderTopColor'),
        ).not.toBe("rgb(1, 2, 3)");
    },
    TIMEOUT,
);

test.skipIf(IS_WINDOWS)(
    "sort focus stays on the sort button and never lights the whole header",
    async () => {
        await using v = view();
        await v.navigate(`${ensureServer()}/${FIXTURE}`);
        await waitFor(v, "window.grid && window.grid.rows.length > 0");
        await v.evaluate(`(() => {
            window.grid.style.setProperty("--dg-focus-color", "rgb(1, 2, 3)");
            document.querySelector("#local-grid .dg-sort").focus();
        })()`);
        await waitFor(v, 'document.querySelector("#local-grid .dg-sort").matches(":focus-visible")');
        const focus = await focusStyle(v, "#local-grid .dg-sort");
        expect(focus.outlineStyle).toBe("solid");
        expect(focus.outlineColor).toBe("rgb(1, 2, 3)");
        expect(focus.outlineOffset).toBe("-2px");
        expect(await read(v, 'getComputedStyle(document.querySelector("#local-grid th.dg-sortable")).boxShadow')).toBe(
            "none",
        );

        // A custom control in the header owns its focus: the sort button must
        // not keep a ring and the header must not grow a bottom bar.
        await v.evaluate(`(() => {
            const th = document.querySelector("#local-grid th.dg-sortable");
            const button = document.createElement("button");
            button.id = "header-host";
            button.textContent = "x";
            th.appendChild(button);
            button.focus();
        })()`);
        await waitFor(v, 'document.querySelector("#header-host").matches(":focus-visible")');
        // The host button paints (or omits) its own ring; the grid must not
        // add its accent to the header.
        expect(await read(v, 'getComputedStyle(document.querySelector("#local-grid th.dg-sortable")).boxShadow')).toBe(
            "none",
        );
        expect(await read(v, 'getComputedStyle(document.querySelector("#local-grid .dg-sort")).outlineStyle')).toBe(
            "none",
        );
    },
    TIMEOUT,
);

test.skipIf(IS_WINDOWS)(
    "the scroll viewport focus ring stays inside the clipped frame",
    async () => {
        await using v = view();
        await v.navigate(`${ensureServer()}/${FIXTURE}`);
        await waitFor(v, "window.grid && window.grid.rows.length > 0");
        await v.evaluate('document.querySelector("#local-grid .dg-scroll").focus()');
        await waitFor(v, 'document.querySelector("#local-grid .dg-scroll").matches(":focus-visible")');
        const focus = await focusStyle(v, "#local-grid .dg-scroll");
        expect(focus.outlineStyle).toBe("solid");
        expect(focus.outlineWidth).toBe("2px");
        expect(focus.outlineOffset).toBe("-2px");
        expect(await read(v, 'getComputedStyle(document.querySelector("#local-grid .dg-frame")).overflow')).toBe(
            "hidden",
        );
    },
    TIMEOUT,
);

test.skipIf(!IS_CHROME_BACKEND)(
    "editable focus survives forced colors and keeps the invalid signal",
    async () => {
        await using v = view();
        await v.navigate(`${ensureServer()}/${FIXTURE}`);
        await waitFor(
            v,
            'document.querySelector("#local-grid tbody td[data-column-id=\\"company\\"] input.dg-editable")',
        );
        await v.evaluate(`(() => {
            const input = document.querySelector('#local-grid tbody td[data-column-id="company"] input.dg-editable');
            input.focus();
            input.closest("td").dataset.invalid = "";
        })()`);
        await waitFor(
            v,
            'document.querySelector(\'#local-grid tbody td[data-column-id="company"]\').hasAttribute("data-invalid")',
        );
        const invalid = await focusStyle(v, '#local-grid tbody td[data-column-id="company"] input.dg-editable');
        expect(invalid.outlineStyle).toBe("solid");
        expect(invalid.outlineColor).toBe("rgb(180, 35, 24)");
        await waitFor(
            v,
            'getComputedStyle(document.querySelector(\'#local-grid tbody td[data-column-id="company"] input.dg-editable\')).backgroundColor === "rgb(254, 243, 242)"',
        );
        expect(
            await read(
                v,
                "getComputedStyle(document.querySelector('#local-grid tbody td[data-column-id=\"company\"] input.dg-editable')).backgroundColor",
            ),
        ).toBe("rgb(254, 243, 242)");

        await v.cdp("Emulation.setEmulatedMedia", { features: [{ name: "forced-colors", value: "active" }] });
        await waitFor(v, 'matchMedia("(forced-colors: active)").matches');
        const forced = await focusStyle(v, '#local-grid tbody td[data-column-id="company"] input.dg-editable');
        expect(forced.outlineStyle).toBe("solid");
        expect(parseFloat(forced.outlineWidth)).toBeGreaterThanOrEqual(2);
        expect(
            await read(
                v,
                'document.querySelector(\'#local-grid tbody td[data-column-id="company"]\').hasAttribute("data-invalid")',
            ),
        ).toBe(true);
    },
    TIMEOUT,
);

test.skipIf(IS_WINDOWS)(
    "application filter controls keep their own skin and focus",
    async () => {
        await using v = view();
        await v.navigate(`${ensureServer()}/${HOST_FIXTURE}`);
        await waitFor(v, 'document.querySelector("#app-filter")');
        expect(await read(v, 'document.querySelector("#app-filter").classList.contains("dg-skin")')).toBe(false);
        const idle = await read(
            v,
            `(() => {
                const style = getComputedStyle(document.querySelector("#app-filter"));
                return { border: style.borderTopWidth, width: style.width, outline: style.outlineStyle };
            })()`,
        );
        expect(idle.border).toBe("3px");
        expect(idle.width).toBe("140px");
        expect(idle.outline).toBe("none");

        await v.evaluate('document.querySelector("#app-filter").focus()');
        await waitFor(v, 'document.querySelector("#app-filter").matches(":focus-visible")');
        const focus = await focusStyle(v, "#app-filter");
        expect(focus.outlineStyle).toBe("solid");
        expect(focus.outlineWidth).toBe("3px");
        expect(focus.outlineColor).toBe("rgb(0, 0, 255)");
        expect(focus.outlineOffset).toBe("2px");
        expect(focus.boxShadow).toBe("rgb(255, 165, 0) 0px 0px 0px 5px");
    },
    TIMEOUT,
);
