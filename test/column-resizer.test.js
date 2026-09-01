import { expect, test } from "bun:test";
import DataGrid from "../data-grid.js";
import { ArrayDataSource } from "../src/data-source.js";
import ColumnResizer from "../src/plugins/column-resizer.js";

async function makeGrid(column, dir = "ltr", viewportWidth = 500, resizable = true) {
    DataGrid.registerPlugins({ ColumnResizer });
    const grid = new DataGrid({
        columns: Array.isArray(column) ? column : [column],
        dataSource: new ArrayDataSource([{ value: true }]),
        dir,
        resizable,
        sortable: false,
    });
    document.body.appendChild(grid);
    await new Promise((resolve) => {
        grid.addEventListener("connected", resolve, { once: true });
        setTimeout(resolve, 2000);
    });
    Object.defineProperty(grid.scrollEl, "clientWidth", { configurable: true, value: viewportWidth });
    const headers = /** @type {NodeListOf<HTMLTableCellElement>} */ (
        grid.querySelectorAll("thead tr.dg-head-columns th")
    );
    for (const header of headers) {
        Object.defineProperty(header, "offsetWidth", {
            configurable: true,
            get() {
                return Number.parseFloat(header.getAttribute("width") ?? "") || 100;
            },
        });
    }
    const th = headers[0];
    return { grid, th };
}

test("registered column resizer stays disabled until resizable is enabled", async () => {
    const { grid } = await makeGrid(
        [
            { field: "value", title: "Value" },
            { field: "fixed", title: "Fixed", class: "dg-not-resizable" },
        ],
        "ltr",
        500,
        false,
    );

    expect(grid.querySelectorAll(".dg-resizer")).toHaveLength(0);

    grid.setAttribute("resizable", "");
    expect(grid.querySelectorAll(".dg-resizer")).toHaveLength(1);
    expect(grid.querySelector('th[data-column-id="fixed"] .dg-resizer')).toBeNull();

    const th = /** @type {HTMLTableCellElement} */ (grid.querySelector('th[data-column-id="value"]'));
    Object.defineProperty(th, "offsetWidth", { configurable: true, value: 100 });
    const resizer = /** @type {HTMLElement} */ (th.querySelector(".dg-resizer"));
    resizer.dispatchEvent(new MouseEvent("mousedown", { bubbles: true, cancelable: true, clientX: 100 }));
    const width = th.getAttribute("width");

    grid.removeAttribute("resizable");
    expect(grid.querySelectorAll(".dg-resizer")).toHaveLength(0);

    document.dispatchEvent(new MouseEvent("mousemove", { bubbles: true, clientX: 150 }));
    expect(th.getAttribute("width")).toBe(width);
    document.body.removeChild(grid);
});

function drag(th, startX, endX) {
    const resizer = /** @type {HTMLElement} */ (th.querySelector(".dg-resizer"));
    resizer.dispatchEvent(new MouseEvent("mousedown", { bubbles: true, cancelable: true, clientX: startX }));
    document.dispatchEvent(new MouseEvent("mousemove", { bubbles: true, clientX: endX }));
    document.dispatchEvent(new MouseEvent("mouseup", { bubbles: true, clientX: endX }));
}

test("column resizer clamps to an explicit minWidth and can grow again", async () => {
    const { grid, th } = await makeGrid({ field: "value", title: "Value", minWidth: 160, width: 200 });

    drag(th, 100, -200);
    expect(th.getAttribute("width")).toBe("160");

    drag(th, 100, 125);
    expect(th.getAttribute("width")).toBe("185");
    document.body.removeChild(grid);
});

test("column resizer respects formatter and global minimums", async () => {
    // A zero-width-space title keeps normalization from replacing it with the
    // field name while contributing no intrinsic text width.
    const formatted = await makeGrid({ field: "value", title: "\u200b", format: "boolean", width: 100 });
    drag(formatted.th, 100, -200);
    expect(formatted.th.getAttribute("width")).toBe("48");
    document.body.removeChild(formatted.grid);

    const compact = await makeGrid({ field: "value", title: "\u200b", width: 100 });
    expect(compact.th.dataset.minWidth).toBe("40");
    drag(compact.th, 100, -200);
    expect(compact.th.getAttribute("width")).toBe("40");
    document.body.removeChild(compact.grid);
});

test("column resizer applies the same clamp in RTL", async () => {
    const { grid, th } = await makeGrid({ field: "value", title: "", minWidth: 80, width: 120 }, "rtl");

    drag(th, 100, 300);
    expect(th.getAttribute("width")).toBe("80");

    drag(th, 100, 75);
    expect(th.getAttribute("width")).toBe("105");
    document.body.removeChild(grid);
});

test("column resizer reserves the minimum width of following columns", async () => {
    const { grid, th } = await makeGrid(
        [
            { field: "first", title: "\u200b", width: 100 },
            { field: "second", title: "\u200b", minWidth: 80, width: 100 },
            { field: "third", title: "\u200b", minWidth: 70, width: 100 },
        ],
        "ltr",
        300,
    );

    drag(th, 100, 500);
    expect(th.getAttribute("width")).toBe("150");
    document.body.removeChild(grid);
});
