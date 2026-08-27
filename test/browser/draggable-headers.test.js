import { afterAll, beforeAll, expect, test } from "bun:test";
import { ensureServer, IS_WINDOWS, read, stopServer, view, waitFor } from "./helpers.js";

const FIXTURE = "test/browser/fixtures/grid.html";
const TIMEOUT = 15000;

beforeAll(ensureServer);
afterAll(stopServer);

test.skipIf(IS_WINDOWS)(
    "dragging a column keeps header, filter and body column order aligned",
    async () => {
        await using v = view();
        await v.navigate(`${ensureServer()}/${FIXTURE}`);
        await waitFor(v, "window.grid && window.grid.rows.length > 0");

        await v.evaluate(`(() => {
            window.grid.options.reorder = true;
            window.grid.options.columns.find((column) => column.field === "id").renderCell =
                ({ value }) => "ID: " + value;
            window.grid.renderTable();
            window.grid.renderBody();

            const transfer = new DataTransfer();
            transfer.setData("text/plain", "id");
            const target = window.grid.querySelector('thead th[data-column-id="company"]');
            target.dispatchEvent(new DragEvent("drop", { bubbles: true, cancelable: true, dataTransfer: transfer }));
        })()`);

        const orders = JSON.parse(
            await read(
                v,
                `JSON.stringify({
                    header: [...window.grid.querySelectorAll(
                        'thead .dg-head-columns > th[data-column-id]:not([data-column-id^="$"])'
                    )].map((cell) => cell.dataset.columnId),
                    filters: [...window.grid.querySelectorAll(
                        'thead .dg-head-filters > th[data-column-id]:not([data-column-id^="$"])'
                    )].map((cell) => cell.dataset.columnId),
                    body: [...window.grid.querySelectorAll(
                        'tbody .dg-data-row:first-child > td[data-column-id]:not([data-column-id^="$"])'
                    )].map((cell) => cell.dataset.columnId),
                })`,
            ),
        );

        const expected = ["name", "age", "company", "id"];
        expect(orders.header).toEqual(expected);
        expect(orders.filters).toEqual(expected);
        expect(orders.body).toEqual(expected);
        expect(await read(v, "window.grid.querySelector('tbody td[data-column-id=id]').textContent")).toBe("ID: 1");
    },
    TIMEOUT,
);
