import { expect, test } from "bun:test";
import DataGrid from "../data-grid.js";
import { ArrayDataSource } from "../src/data-source.js";
import ColumnResizer from "../src/plugins/column-resizer.js";

async function makeGrid(column, dir = "ltr", viewportWidth = 500, resizable = true) {
    DataGrid.unregisterPlugins();
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
    resizer.dispatchEvent(new PointerEvent("pointerdown", { bubbles: true, cancelable: true, clientX: 100 }));
    const width = th.getAttribute("width");

    grid.removeAttribute("resizable");
    expect(grid.querySelectorAll(".dg-resizer")).toHaveLength(0);

    resizer.dispatchEvent(new PointerEvent("pointermove", { bubbles: true, clientX: 150 }));
    expect(th.getAttribute("width")).toBe(width);
    document.body.removeChild(grid);
});

function drag(th, startX, endX, pointerType = "mouse") {
    const resizer = /** @type {HTMLElement} */ (th.querySelector(".dg-resizer"));
    const init = { bubbles: true, cancelable: true, pointerType };
    resizer.dispatchEvent(new PointerEvent("pointerdown", { ...init, clientX: startX }));
    resizer.dispatchEvent(new PointerEvent("pointermove", { ...init, clientX: endX }));
    resizer.dispatchEvent(new PointerEvent("pointerup", { ...init, clientX: endX }));
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

test("column resizer preserves explicit widths of following columns", async () => {
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
    expect(th.getAttribute("width")).toBe("100");
    expect(grid.querySelector('th[data-column-id="second"]').getAttribute("width")).toBe("100");
    expect(grid.querySelector('th[data-column-id="third"]').getAttribute("width")).toBe("100");
    document.body.removeChild(grid);
});

test("a committed resize also updates the column model width", async () => {
    const { grid, th } = await makeGrid({ field: "value", title: "Value", width: 120 });
    let detail;
    grid.addEventListener("columnResized", (event) => {
        detail = event.detail;
    });

    drag(th, 100, 160);

    expect(th.getAttribute("width")).toBe("180");
    expect(grid.options.columns[0].width).toBe(180);
    expect(detail).toEqual({ id: "value", col: "value", width: "180" });
    document.body.removeChild(grid);
});

test("a touch pointer resizes like a mouse", async () => {
    const { grid, th } = await makeGrid({ field: "value", title: "Value", width: 120 });

    drag(th, 100, 160, "touch");

    expect(th.getAttribute("width")).toBe("180");
    expect(grid.options.columns[0].width).toBe(180);
    document.body.removeChild(grid);
});

test("a cancelled gesture releases without committing", async () => {
    const { grid, th } = await makeGrid({ field: "value", title: "Value", width: 120 });
    let resized = 0;
    grid.addEventListener("columnResized", () => {
        resized++;
    });
    const resizer = /** @type {HTMLElement} */ (th.querySelector(".dg-resizer"));

    resizer.dispatchEvent(new PointerEvent("pointerdown", { bubbles: true, cancelable: true, clientX: 100 }));
    resizer.dispatchEvent(new PointerEvent("pointermove", { bubbles: true, clientX: 160 }));
    resizer.dispatchEvent(new PointerEvent("pointercancel", { bubbles: true }));
    // A late pointerup after the cancel must not commit either.
    resizer.dispatchEvent(new PointerEvent("pointerup", { bubbles: true, clientX: 160 }));

    expect(resized).toBe(0);
    expect(grid.options.columns[0].width).toBe(120);
    expect(th.getAttribute("width")).toBe("120");
    expect(resizer.classList.contains("dg-resizer-active")).toBe(false);
    document.body.removeChild(grid);
});

test("resize cancellation restores auto-sized columns and preserves fixed columns", async () => {
    const { grid, th } = await makeGrid([
        { field: "value", width: 100 },
        { field: "auto" },
        { id: "$actions", class: "dg-not-resizable", width: 80 },
    ]);
    const auto = grid.querySelector('th[data-column-id="auto"]');
    const fixed = grid.querySelector('th[data-column-id="$actions"]');
    auto.setAttribute("width", "140");
    const fixedWidth = fixed.getAttribute("width");
    const resizer = th.querySelector(".dg-resizer");
    resizer.dispatchEvent(new PointerEvent("pointerdown", { bubbles: true, cancelable: true, clientX: 100 }));
    expect(auto.hasAttribute("width")).toBe(false);
    expect(fixed.getAttribute("width")).toBe(fixedWidth);
    resizer.dispatchEvent(new PointerEvent("pointermove", { bubbles: true, clientX: 150 }));
    resizer.dispatchEvent(new PointerEvent("pointercancel", { bubbles: true }));
    expect(auto.getAttribute("width")).toBe("140");
    expect(th.getAttribute("width")).toBe("100");
    drag(th, 100, 150);
    expect(fixed.getAttribute("width")).toBe(fixedWidth);
    document.body.removeChild(grid);
});

test("flexible following columns still yield down to their minimum widths", async () => {
    const { grid, th } = await makeGrid(
        [
            { field: "first", title: "\u200b", width: 100 },
            { field: "second", title: "\u200b", minWidth: 80 },
            { field: "third", title: "\u200b", minWidth: 70 },
        ],
        "ltr",
        300,
    );
    drag(th, 100, 500);
    expect(th.getAttribute("width")).toBe("150");
    document.body.removeChild(grid);
});
