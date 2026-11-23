import { afterAll, beforeAll, expect, test } from "bun:test";
import { ensureServer, IS_WINDOWS, read, stopServer, view, waitFor } from "./helpers.js";

beforeAll(ensureServer);
afterAll(stopServer);

test.skipIf(IS_WINDOWS)(
    "responsive demos stay inside their cards on narrow screens",
    async () => {
        await using v = view();
        await v.navigate(`${ensureServer()}/demo/responsive.html`);
        const frames = "Array.from(document.querySelectorAll('main .resize-me'))";
        await waitFor(v, `${frames}.length === 3 && ${frames}.every(frame => frame.querySelector('.dg-data-row'))`);

        for (const width of [488, 320, 800]) {
            await v.resize(width, 800);
            await waitFor(v, `window.innerWidth === ${width}`);
            await waitFor(v, `document.querySelector('#stacked-demo .dg-responsive-table')`);

            expect(await read(v, "document.documentElement.scrollWidth <= window.innerWidth + 1")).toBe(true);
            expect(
                await read(
                    v,
                    `${frames}.every(frame => {
                        const grid = frame.querySelector('data-grid');
                        return frame.getBoundingClientRect().right <= frame.parentElement.getBoundingClientRect().right + 1 &&
                            frame.scrollWidth <= frame.clientWidth + 1 && grid.scrollWidth <= grid.clientWidth + 1;
                    })`,
                ),
            ).toBe(true);
        }
    },
    15000,
);

test.skipIf(IS_WINDOWS)(
    "the Basic demo scrolls the table inside its frame on a narrow viewport",
    async () => {
        await using v = view();
        await v.navigate(`${ensureServer()}/demo/index.html`);
        await v.resize(488, 800);
        const scroll = "document.querySelector('#basic-demo .dg-scroll')";
        const footer = "document.querySelector('#basic-demo .dg-footer')";
        await waitFor(
            v,
            `window.innerWidth === 488 && ${scroll}?.querySelector('.dg-data-row') && ${footer}?.clientWidth > 0`,
        );

        expect(await read(v, `${scroll}.scrollWidth > ${scroll}.clientWidth`)).toBe(true);
        expect(await read(v, "document.documentElement.scrollWidth <= window.innerWidth + 1")).toBe(true);
        const footerLeft = await read(v, `${footer}.getBoundingClientRect().left`);
        await v.evaluate(`${scroll}.scrollLeft = ${scroll}.scrollWidth`);
        await waitFor(v, `${scroll}.scrollLeft > 0`);
        expect(Math.abs((await read(v, `${footer}.getBoundingClientRect().left`)) - footerLeft)).toBeLessThan(1);

        await v.resize(1280, 800);
        await waitFor(v, `${scroll}.scrollWidth <= ${scroll}.clientWidth + 1`);
    },
    15000,
);

test.skipIf(IS_WINDOWS)(
    "start-open details leave room for values next to a wide primary column",
    async () => {
        await using v = view();
        await v.navigate(`${ensureServer()}/test/browser/fixtures/grid.html`);
        await waitFor(v, "window.grid && window.grid.rows.length > 0");
        await v.evaluate(`(() => {
            const Grid = customElements.get("data-grid");
            const grid = new Grid({
                columns: [
                    { field: "task", title: "Task", width: 270, responsive: 0 },
                    { field: "node", title: "Node", width: 220, responsive: 1 },
                    { field: "status", title: "Status", width: 180, responsive: 2 },
                ],
                dataSource: { async load() {
                    return { rows: [{ id: 1, task: "Mast guy-wire retension", node: "Summit mast", status: "Open" }], total: 1 };
                } },
                responsive: true,
                responsiveStartOpen: true,
                responsiveToggle: false,
                selectable: true,
            });
            grid.id = "responsive-sizing";
            grid.style.width = "380px";
            document.body.append(grid);
        })()`);

        const grid = 'document.querySelector("#responsive-sizing")';
        const table = `${grid}.querySelector(".dg-responsive-table")`;

        for (const width of [380, 350]) {
            await v.evaluate(`${grid}.style.width = "${width}px"`);
            await waitFor(v, `${table}?.querySelectorAll("td").length === 2`);
            const layout = await read(
                v,
                `(() => {
                    const grid = ${grid};
                    const table = ${table};
                    const label = table.querySelector("th");
                    const value = table.querySelector("td");
                    return {
                        taskWidth: grid.headerRow.querySelector('[field="task"]').offsetWidth,
                        labelWidth: label.offsetWidth,
                        valueWidth: value.offsetWidth,
                        value: value.textContent.trim(),
                        fits: table.offsetWidth <= table.parentElement.clientWidth + 1 &&
                            grid.scrollEl.scrollWidth <= grid.scrollEl.clientWidth + 1,
                    };
                })()`,
            );
            expect(layout.taskWidth).toBeGreaterThan(200);
            expect(layout.labelWidth).toBeGreaterThan(0);
            expect(layout.labelWidth).toBeLessThanOrEqual(124);
            expect(layout.valueWidth).toBeGreaterThan(layout.labelWidth);
            expect(layout.value).toBe("Summit mast");
            expect(layout.fits).toBe(true);

            await v.evaluate(`${grid}.style.width = "800px"`);
            await waitFor(v, `!${table}`);
        }
    },
    15000,
);
