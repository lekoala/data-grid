import { expect, test } from "bun:test";
import DataGrid from "../data-grid.js";
import { ArrayDataSource } from "../src/data-source.js";
import BulkActions from "../src/plugins/bulk-actions.js";
import SelectableRows from "../src/plugins/selectable-rows.js";
import { input } from "./helpers.js";

DataGrid.unregisterPlugins();
DataGrid.registerPlugins({ SelectableRows, BulkActions });

const rows = Array.from({ length: 30 }, (_, i) => ({ id: i + 1, name: `Person ${i}` }));

async function makeReadyGrid(opts = {}, data = rows, declarative = null) {
    const options = { ...opts };
    if (data !== null) {
        options.dataSource = new ArrayDataSource(data);
    }
    const inst = new DataGrid(options);
    if (declarative) {
        inst.appendChild(declarative);
    }
    document.body.appendChild(inst);
    await new Promise((resolve) => {
        inst.addEventListener("connected", resolve, { once: true });
        setTimeout(resolve, 2000);
    });
    return inst;
}

function removeGrid(inst) {
    document.body.removeChild(inst);
}

const flush = () => new Promise((resolve) => setTimeout(resolve, 20));

function declarativeTopbar() {
    const topbar = document.createElement("div");
    topbar.className = "dg-topbar";
    const summary = document.createElement("span");
    summary.className = "app-summary";
    summary.textContent = "$22,550/mo";
    topbar.append("Custom prefix ", summary);
    return { topbar, summary };
}

test("a grid without search, bulk actions or declarative topbar creates none", async () => {
    const inst = await makeReadyGrid({});
    expect(inst.querySelector(".dg-topbar")).toBeNull();
    expect(inst.querySelector(":scope > .dg-frame")).toBeTruthy();
    removeGrid(inst);
});

test("the topbar lives inside the frame, above the scroll viewport", async () => {
    const inst = await makeReadyGrid({ searchable: true });
    const frame = inst.querySelector(":scope > .dg-frame");
    expect(frame).toBeTruthy();
    const topbar = frame.querySelector(":scope > .dg-topbar");
    expect(topbar).toBeTruthy();
    expect(frame.firstElementChild).toBe(topbar);
    expect(topbar.nextElementSibling.classList.contains("dg-scroll")).toBe(true);
    expect(frame.lastElementChild.classList.contains("dg-footer")).toBe(true);
    // No stray topbar outside the frame.
    expect(inst.querySelector(":scope > .dg-topbar")).toBeNull();
    removeGrid(inst);
});

test("a declarative topbar without zones is normalized, content preserved", async () => {
    const { topbar, summary } = declarativeTopbar();
    const inst = await makeReadyGrid({ searchable: true }, rows, topbar);

    const frame = inst.querySelector(":scope > .dg-frame");
    expect(topbar.parentElement).toBe(frame);
    expect(frame.firstElementChild).toBe(topbar);

    const start = topbar.querySelector(":scope > .dg-topbar-start");
    const end = topbar.querySelector(":scope > .dg-topbar-end");
    expect(start).toBeTruthy();
    expect(end).toBeTruthy();
    expect(topbar.firstElementChild).toBe(start);
    expect(topbar.lastElementChild).toBe(end);

    // Free declarative content (including the text node) moved to start, in order.
    expect(summary.parentElement).toBe(start);
    expect(start.textContent).toContain("Custom prefix");
    expect(start.textContent).toContain("$22,550/mo");

    // The search control landed in the end zone.
    const search = inst.querySelector(".dg-search");
    expect(search).toBeTruthy();
    expect(search.closest(".dg-topbar-end")).toBe(end);
    removeGrid(inst);
});

test("ensureTopbar is idempotent and keeps zone references", async () => {
    const { topbar } = declarativeTopbar();
    const inst = await makeReadyGrid({ searchable: true }, rows, topbar);

    const start = topbar.querySelector(":scope > .dg-topbar-start");
    const end = topbar.querySelector(":scope > .dg-topbar-end");
    const before = [...topbar.childNodes];

    inst.ensureTopbar();

    expect(topbar.querySelector(":scope > .dg-topbar-start")).toBe(start);
    expect(topbar.querySelector(":scope > .dg-topbar-end")).toBe(end);
    expect([...topbar.childNodes]).toEqual(before);
    expect(inst.querySelectorAll(".dg-topbar-start")).toHaveLength(1);
    expect(inst.querySelectorAll(".dg-topbar-end")).toHaveLength(1);
    removeGrid(inst);
});

test("a lone declarative topbar is normalized without search or bulk actions", async () => {
    const { topbar, summary } = declarativeTopbar();
    const inst = await makeReadyGrid({}, rows, topbar);

    const frame = inst.querySelector(":scope > .dg-frame");
    expect(topbar.parentElement).toBe(frame);
    const start = topbar.querySelector(":scope > .dg-topbar-start");
    const end = topbar.querySelector(":scope > .dg-topbar-end");
    expect(start).toBeTruthy();
    expect(end).toBeTruthy();
    expect(summary.parentElement).toBe(start);
    expect(inst.querySelector(".dg-search")).toBeNull();
    removeGrid(inst);
});

test("free content keeps its order around an existing start zone", async () => {
    const topbar = document.createElement("div");
    topbar.className = "dg-topbar";
    const a = document.createElement("button");
    a.type = "button";
    a.id = "dg-a";
    a.textContent = "A";
    const start = document.createElement("div");
    start.className = "dg-topbar-start";
    const b = document.createElement("button");
    b.type = "button";
    b.id = "dg-b";
    b.textContent = "B";
    start.appendChild(b);
    const c = document.createElement("button");
    c.type = "button";
    c.id = "dg-c";
    c.textContent = "C";
    topbar.append(a, start, c);

    const inst = await makeReadyGrid({}, rows, topbar);

    const normalized = topbar.querySelector(":scope > .dg-topbar-start");
    expect([...normalized.children].map((el) => el.id)).toEqual(["dg-a", "dg-b", "dg-c"]);
    removeGrid(inst);
});

test("a declarative topbar with only a start zone still mounts the search", async () => {
    const topbar = document.createElement("div");
    topbar.className = "dg-topbar";
    const start = document.createElement("div");
    start.className = "dg-topbar-start";
    const action = document.createElement("button");
    action.type = "button";
    action.textContent = "Export";
    start.appendChild(action);
    topbar.appendChild(start);

    const inst = await makeReadyGrid({ searchable: true }, rows, topbar);

    const search = inst.querySelector(".dg-search");
    expect(search).toBeTruthy();
    expect(search.closest(".dg-topbar-end")).toBeTruthy();
    expect(action.isConnected).toBe(true);
    expect(action.closest(".dg-topbar-start")).toBe(start);
    removeGrid(inst);
});

test("bulk actions mount into a declarative topbar without a start zone", async () => {
    const { topbar } = declarativeTopbar();
    const inst = await makeReadyGrid(
        { selectable: true, bulkActions: [{ name: "archive", label: "Archive" }] },
        rows,
        topbar,
    );

    const bar = inst.querySelector(".dg-bulk-actions");
    expect(bar).toBeTruthy();
    expect(bar.closest(".dg-topbar-start")).toBeTruthy();
    removeGrid(inst);
});

test("search keeps working after disconnect and reconnect", async () => {
    const inst = await makeReadyGrid({ searchable: true, searchDelay: 0 });
    const search = inst.querySelector(".dg-search");
    expect(search).toBeTruthy();

    // A synchronous remove/re-append is swallowed by the deferred lifecycle:
    // wait so the disconnection (and its debounce cleanup) really runs.
    document.body.removeChild(inst);
    await flush();
    const reconnected = new Promise((resolve) => inst.addEventListener("connected", resolve, { once: true }));
    document.body.appendChild(inst);
    await reconnected;

    const after = inst.querySelector(".dg-search");
    expect(after).toBe(search);
    input(after, "Person 2");
    await flush();
    expect(inst.query.search).toBe("Person 2");
    expect(inst.total).toBe(11);
    removeGrid(inst);
});

test("an empty search result names the query as text", async () => {
    const inst = await makeReadyGrid({ searchable: true, searchDelay: 0 });
    await inst.setSearch("zzz-no-match");
    const cell = inst.querySelector(".dg-empty-row td, .dg-empty-row th");
    expect(cell).toBeTruthy();
    expect(cell.textContent).toBe('No results for "zzz-no-match"');
    // The query is text, never HTML.
    expect(cell.querySelectorAll("*")).toHaveLength(0);
    removeGrid(inst);
});

test("options.noData still wins over the search-aware message", async () => {
    const inst = await makeReadyGrid({ searchable: true, searchDelay: 0, noData: "Custom empty" });
    await inst.setSearch("zzz-no-match");
    expect(inst.querySelector(".dg-empty-row").textContent).toBe("Custom empty");
    removeGrid(inst);
});

test("an empty grid without a search keeps the generic message", async () => {
    const inst = await makeReadyGrid({}, []);
    expect(inst.querySelector(".dg-empty-row").textContent).toBe("No data");
    removeGrid(inst);
});
