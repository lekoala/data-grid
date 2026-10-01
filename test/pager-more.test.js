import { expect, test } from "bun:test";
import DataGrid from "../data-grid.js";
import { ArrayDataSource } from "../src/data-source.js";
import RowDetails from "../src/plugins/row-details.js";
import SelectableRows from "../src/plugins/selectable-rows.js";

const rows = Array.from({ length: 65 }, (_, i) => ({
    id: i + 1,
    name: `row${i}`,
    status: i % 2 ? "active" : "archived",
}));

async function makeReadyGrid(opts = {}, data = rows) {
    DataGrid.unregisterPlugins();
    const inst = new DataGrid({
        columns: [{ field: "name" }],
        ...opts,
        dataSource: opts.dataSource ?? new ArrayDataSource(data),
    });
    document.body.appendChild(inst);
    await new Promise((resolve) => {
        inst.addEventListener("connected", resolve, { once: true });
        setTimeout(resolve, 2000);
    });
    return inst;
}

const flush = () => new Promise((resolve) => setTimeout(resolve, 20));

function moreButton(inst) {
    return inst.querySelector(".dg-load-more");
}

function metaText(inst) {
    return inst.querySelector(".dg-meta").textContent;
}

/** Wrap a source, record every query and optionally hang selected pages. */
function instrument(data, { hang = new Set(), fail = new Set() } = {}) {
    const ds = new ArrayDataSource(data);
    const queries = [];
    const releases = new Map();
    const original = ds.load.bind(ds);
    ds.load = (query, options) => {
        queries.push({ ...query });
        if (fail.has(query.page)) {
            return Promise.reject(new Error("boom"));
        }
        if (hang.has(query.page)) {
            return new Promise((resolve, reject) => {
                releases.set(query.page, () => original(query, options).then(resolve, reject));
            });
        }
        return original(query, options);
    };
    return { ds, queries, release: (page) => releases.get(page)?.() };
}

test("pager defaults to pages and parses the attribute", async () => {
    const inst = await makeReadyGrid();
    expect(inst.options.pager).toBe("pages");
    expect(inst.query.page).toBe(1);
    document.body.removeChild(inst);

    const more = await makeReadyGrid({ pager: "more", initialQuery: { pageSize: 20 } });
    expect(more.options.pager).toBe("more");
    expect(more.rows).toHaveLength(20);
    expect(more.total).toBe(65);
    expect(more.query.page).toBe(1);
    expect(metaText(more)).toBe("20 of 65");
    expect(moreButton(more).hidden).toBe(false);
    expect(moreButton(more).textContent).toBe("Load more");
    document.body.removeChild(more);
});

test("the page attribute accepts only pages or more", async () => {
    const inst = new DataGrid({ dataSource: new ArrayDataSource(rows) });
    inst.setAttribute("pager", "more");
    expect(inst.options.pager).toBe("more");
    inst.setAttribute("pager", "nope");
    expect(inst.options.pager).toBe("pages");
});

test("loadMore appends the next chunk with the same population", async () => {
    const { ds, queries } = instrument(rows);
    DataGrid.unregisterPlugins();
    const inst = new DataGrid({
        columns: [{ field: "name" }],
        pager: "more",
        initialQuery: { pageSize: 20 },
        dataSource: ds,
    });
    document.body.appendChild(inst);
    await new Promise((resolve) => {
        inst.addEventListener("connected", resolve, { once: true });
        setTimeout(resolve, 2000);
    });

    await inst.setQuery({ search: "row", sort: [{ field: "name", direction: "asc" }] });
    const before = inst.rows.length;
    await inst.loadMore();

    expect(queries.at(-1)).toMatchObject({
        page: 2,
        pageSize: 20,
        search: "row",
        sort: [{ field: "name", direction: "asc" }],
    });
    expect(inst.rows.length).toBeGreaterThan(before);
    // The public query never becomes a pseudo current page.
    expect(inst.query.page).toBe(1);
    document.body.removeChild(inst);
});

test("a second loadMore during a flight is a single fetch", async () => {
    const { ds, queries, release } = instrument(rows, { hang: new Set([2]) });
    DataGrid.unregisterPlugins();
    const inst = new DataGrid({
        columns: [{ field: "name" }],
        pager: "more",
        initialQuery: { pageSize: 20 },
        dataSource: ds,
    });
    document.body.appendChild(inst);
    await new Promise((resolve) => {
        inst.addEventListener("connected", resolve, { once: true });
        setTimeout(resolve, 2000);
    });

    const first = inst.loadMore();
    const second = inst.loadMore();
    expect(moreButton(inst).disabled).toBe(true);
    expect(moreButton(inst).getAttribute("aria-busy")).toBe("true");
    await second;
    expect(queries.filter((query) => query.page === 2)).toHaveLength(1);
    release(2);
    await first;
    expect(inst.rows).toHaveLength(40);
    expect(inst.loading).toBe(false);
    document.body.removeChild(inst);
});

test("the button hides once the list is exhausted", async () => {
    const inst = await makeReadyGrid({ pager: "more", initialQuery: { pageSize: 65 } });
    expect(inst.rows).toHaveLength(65);
    expect(moreButton(inst).hidden).toBe(true);
    expect(metaText(inst)).toBe("65 of 65");
    await inst.loadMore();
    expect(inst.rows).toHaveLength(65);
    document.body.removeChild(inst);
});

test("an empty chunk also terminates the list", async () => {
    const ds = new ArrayDataSource(rows);
    const original = ds.load.bind(ds);
    ds.load = (query, options) => {
        if (query.page === 2) {
            // A backend whose total lags behind the available rows.
            return Promise.resolve({ rows: [], total: 100, meta: {} });
        }
        return original(query, options);
    };
    const inst = await makeReadyGrid({ pager: "more", initialQuery: { pageSize: 20 }, dataSource: ds });
    expect(inst.rows).toHaveLength(20);
    expect(moreButton(inst).hidden).toBe(false);

    await inst.loadMore();

    expect(inst.rows).toHaveLength(20);
    expect(moreButton(inst).hidden).toBe(true);
    document.body.removeChild(inst);
});

test("a filter change restarts from the first chunk", async () => {
    const { ds, queries } = instrument(rows);
    DataGrid.unregisterPlugins();
    const inst = new DataGrid({
        columns: [{ field: "name" }],
        pager: "more",
        initialQuery: { pageSize: 20 },
        dataSource: ds,
    });
    document.body.appendChild(inst);
    await new Promise((resolve) => {
        inst.addEventListener("connected", resolve, { once: true });
        setTimeout(resolve, 2000);
    });

    await inst.loadMore();
    await inst.loadMore();
    expect(inst.rows).toHaveLength(60);
    expect(queries.map((query) => query.page)).toEqual([1, 2, 3]);

    await inst.setQuery({ filters: { status: { operator: "eq", value: "active" } } });

    expect(queries.at(-1).page).toBe(1);
    expect(inst.rows.length).toBeLessThanOrEqual(20);
    expect(inst.rows.every((row) => row.status === "active")).toBe(true);
    expect(inst.query.page).toBe(1);
    document.body.removeChild(inst);
});

test("search, sort and pageSize changes restart the chunks too", async () => {
    const inst = await makeReadyGrid({ pager: "more", initialQuery: { pageSize: 20 } });
    await inst.loadMore();
    expect(inst.rows).toHaveLength(40);

    await inst.setQuery({ search: "row1" });
    expect(inst.rows.length).toBeLessThanOrEqual(20);

    await inst.setQuery({ search: "", sort: [{ field: "name", direction: "desc" }] });
    expect(inst.rows.length).toBeLessThanOrEqual(20);

    await inst.setQuery({ search: "", sort: [], pageSize: 10 });
    expect(inst.rows).toHaveLength(10);
    await inst.loadMore();
    expect(inst.rows).toHaveLength(20);
    document.body.removeChild(inst);
});

test("a loadMore error keeps the rows and stays retryable", async () => {
    const small = Array.from({ length: 30 }, (_, i) => ({ id: i + 1, name: `row${i}` }));
    let failPage2 = true;
    const ds = new ArrayDataSource(small);
    const original = ds.load.bind(ds);
    ds.load = (query, options) => {
        if (query.page === 2 && failPage2) {
            return Promise.reject(new Error("boom"));
        }
        return original(query, options);
    };
    const inst = await makeReadyGrid({ pager: "more", initialQuery: { pageSize: 20 }, dataSource: ds }, null);

    await inst.loadMore();

    expect(inst.rows).toHaveLength(20);
    expect(inst.hasAttribute("data-error")).toBe(true);
    expect(moreButton(inst).hidden).toBe(false);
    expect(moreButton(inst).disabled).toBe(false);

    failPage2 = false;
    await inst.loadMore();

    expect(inst.rows).toHaveLength(30);
    expect(inst.hasAttribute("data-error")).toBe(false);
    expect(moreButton(inst).hidden).toBe(true);
    document.body.removeChild(inst);
});

test("a late chunk never appends after a population change", async () => {
    const { ds, release } = instrument(rows, { hang: new Set([3]) });
    DataGrid.unregisterPlugins();
    const inst = new DataGrid({
        columns: [{ field: "name" }],
        pager: "more",
        initialQuery: { pageSize: 20 },
        dataSource: ds,
    });
    document.body.appendChild(inst);
    await new Promise((resolve) => {
        inst.addEventListener("connected", resolve, { once: true });
        setTimeout(resolve, 2000);
    });

    await inst.loadMore();
    expect(inst.rows).toHaveLength(40);
    const pending = inst.loadMore();
    await inst.setQuery({ filters: { status: { operator: "eq", value: "active" } } });
    const filtered = inst.rows.length;
    release(3);
    await pending;
    await flush();

    // The stale page 3 must not append onto the filtered first chunk, and the
    // superseded flight must not clear the newer load's state.
    expect(inst.rows).toHaveLength(filtered);
    expect(inst.loading).toBe(false);
    expect(inst.hasAttribute("data-loading")).toBe(false);
    document.body.removeChild(inst);
});

test("selection survives a plain loadMore", async () => {
    DataGrid.unregisterPlugins();
    DataGrid.registerPlugins({ SelectableRows });
    const small = Array.from({ length: 30 }, (_, i) => ({ id: i + 1, name: `row${i}` }));
    const inst = new DataGrid({
        columns: [{ field: "name" }],
        pager: "more",
        initialQuery: { pageSize: 20 },
        selectable: true,
        dataSource: new ArrayDataSource(small),
    });
    document.body.appendChild(inst);
    await new Promise((resolve) => {
        inst.addEventListener("connected", resolve, { once: true });
        setTimeout(resolve, 2000);
    });

    const checkbox = inst.querySelector('tbody tr td[data-column-id="$selection"] input');
    checkbox.checked = true;
    checkbox.dispatchEvent(new Event("change", { bubbles: true }));
    expect(inst.getSelectionState().ids.size).toBe(1);

    await inst.loadMore();

    expect(inst.rows).toHaveLength(30);
    expect(inst.getSelectionState().ids.size).toBe(1);
    document.body.removeChild(inst);
});

test("expanded details survive appended chunks", async () => {
    DataGrid.unregisterPlugins();
    DataGrid.registerPlugins({ RowDetails });
    const small = Array.from({ length: 30 }, (_, i) => ({ id: i + 1, name: `row${i}` }));
    const inst = new DataGrid({
        columns: [{ field: "name" }],
        pager: "more",
        pageSize: 20,
        rowDetails: ({ row }) => `Details: ${row.name}`,
        dataSource: new ArrayDataSource(small),
    });
    document.body.appendChild(inst);
    await new Promise((resolve) => {
        inst.addEventListener("connected", resolve, { once: true });
        setTimeout(resolve, 2000);
    });

    inst.getPlugin("RowDetails").expand("1");
    await inst.loadMore();

    expect(inst.getPlugin("RowDetails").isExpanded("1")).toBe(true);
    expect(inst.querySelectorAll(".dg-row-details-row")).toHaveLength(1);
    document.body.removeChild(inst);
});

test("page stays 1 from every entry point in more mode", async () => {
    const fromInitial = await makeReadyGrid({
        pager: "more",
        pageSize: 20,
        initialQuery: { page: 3, pageSize: 20, search: "", sort: [], filters: {} },
    });
    expect(fromInitial.query.page).toBe(1);
    expect(fromInitial.rows).toHaveLength(20);
    document.body.removeChild(fromInitial);

    const fromAttribute = new DataGrid({ dataSource: new ArrayDataSource(rows) });
    fromAttribute.setAttribute("pager", "more");
    fromAttribute.setAttribute("page", "3");
    document.body.appendChild(fromAttribute);
    await new Promise((resolve) => {
        fromAttribute.addEventListener("connected", resolve, { once: true });
        setTimeout(resolve, 2000);
    });
    expect(fromAttribute.query.page).toBe(1);
    document.body.removeChild(fromAttribute);

    const inst = await makeReadyGrid({ pager: "more", initialQuery: { pageSize: 20 } });
    inst.restoreQuery({ page: 3, pageSize: 20, search: "", sort: [], filters: {} });
    expect(inst.query.page).toBe(1);
    await inst.setQuery({ page: 2 });
    expect(inst.query.page).toBe(1);
    expect(inst.rows).toHaveLength(20);
    document.body.removeChild(inst);
});

test("classic pagination controls stay in the DOM in more mode", async () => {
    const inst = await makeReadyGrid({ pager: "more", initialQuery: { pageSize: 20 } });
    // The mode switch is a host class; hiding itself is CSS, which unit
    // tests do not load. The groups stay in the DOM for classic mode.
    expect(inst.classList.contains("dg-pager-more")).toBe(true);
    expect(inst.querySelector(".dg-pagination")).not.toBeNull();
    expect(inst.querySelector(".dg-page-nav")).not.toBeNull();
    expect(moreButton(inst).hidden).toBe(false);
    document.body.removeChild(inst);

    const pages = await makeReadyGrid({ initialQuery: { pageSize: 20 } });
    expect(pages.classList.contains("dg-pager-more")).toBe(false);
    expect(moreButton(pages).hidden).toBe(true);
    document.body.removeChild(pages);
});

/** A backend without COUNT(*): chunks carry hasMore, never a total. */
function noCountSource(data) {
    const inner = new ArrayDataSource(data);
    return {
        queries: [],
        async load(query, options) {
            this.queries.push({ ...query });
            const result = await inner.load(query, options);
            return { rows: result.rows, hasMore: result.hasMore, meta: result.meta };
        },
    };
}

test("unknown total shows the bare count and follows hasMore", async () => {
    const ds = noCountSource(rows);
    const inst = await makeReadyGrid({ pager: "more", initialQuery: { pageSize: 20 }, dataSource: ds });

    expect(inst.total).toBeNull();
    expect(metaText(inst)).toBe("20");
    expect(inst.querySelector(".dg-status").textContent).not.toContain("null");
    expect(moreButton(inst).hidden).toBe(false);

    await inst.loadMore();
    expect(inst.rows).toHaveLength(40);
    expect(metaText(inst)).toBe("40");

    await inst.loadMore();
    await inst.loadMore();
    expect(inst.rows).toHaveLength(65);
    expect(metaText(inst)).toBe("65");
    expect(moreButton(inst).hidden).toBe(true);
    document.body.removeChild(inst);
});

test("explicit hasMore wins over the total in both directions", async () => {
    const ds = new ArrayDataSource(rows);
    const original = ds.load.bind(ds);
    ds.load = (query, options) => original(query, options).then((result) => ({ ...result, hasMore: query.page !== 1 }));
    const inst = await makeReadyGrid({ pager: "more", initialQuery: { pageSize: 20 }, dataSource: ds });

    // Total says 65 rows remain, hasMore says done: the button hides.
    expect(inst.total).toBe(65);
    expect(moreButton(inst).hidden).toBe(true);
    document.body.removeChild(inst);

    const ds2 = new ArrayDataSource(rows.slice(0, 20));
    const original2 = ds2.load.bind(ds2);
    ds2.load = (query, options) =>
        original2(query, options).then((result) => ({ ...result, total: 20, hasMore: true }));
    const inst2 = await makeReadyGrid({ pager: "more", initialQuery: { pageSize: 20 }, dataSource: ds2 });

    // Total says exhausted (20 of 20), hasMore says continue: it stays.
    expect(moreButton(inst2).hidden).toBe(false);
    document.body.removeChild(inst2);
});

test("without total or hasMore a full chunk assumes a sequel", async () => {
    const bare = Array.from({ length: 45 }, (_, i) => ({ id: i + 1, name: `row${i}` }));
    const ds = new ArrayDataSource(bare);
    const original = ds.load.bind(ds);
    ds.load = (query, options) => original(query, options).then(({ rows: chunk, meta }) => ({ rows: chunk, meta }));
    const inst = await makeReadyGrid({ pager: "more", initialQuery: { pageSize: 20 }, dataSource: ds });

    expect(inst.total).toBeNull();
    await inst.loadMore();
    expect(inst.rows).toHaveLength(40);
    expect(moreButton(inst).hidden).toBe(false);

    await inst.loadMore();
    expect(inst.rows).toHaveLength(45);
    expect(moreButton(inst).hidden).toBe(true);
    document.body.removeChild(inst);
});

test("an exactly full final chunk costs one empty extra click", async () => {
    const even = Array.from({ length: 40 }, (_, i) => ({ id: i + 1, name: `row${i}` }));
    const ds = new ArrayDataSource(even);
    const original = ds.load.bind(ds);
    ds.load = (query, options) => original(query, options).then(({ rows: chunk, meta }) => ({ rows: chunk, meta }));
    const inst = await makeReadyGrid({ pager: "more", initialQuery: { pageSize: 20 }, dataSource: ds });

    await inst.loadMore();
    expect(inst.rows).toHaveLength(40);
    // Indistinguishable from a sequel: one more click returns [] and ends it.
    expect(moreButton(inst).hidden).toBe(false);
    await inst.loadMore();
    expect(inst.rows).toHaveLength(40);
    expect(moreButton(inst).hidden).toBe(true);
    document.body.removeChild(inst);
});

test("a filter change keeps the total unknown and restarts paging", async () => {
    const ds = noCountSource(rows);
    const inst = await makeReadyGrid({ pager: "more", initialQuery: { pageSize: 20 }, dataSource: ds });

    await inst.loadMore();
    expect(inst.rows).toHaveLength(40);

    await inst.setQuery({ filters: { status: { operator: "eq", value: "active" } } });
    expect(inst.total).toBeNull();
    expect(inst.rows.length).toBeLessThanOrEqual(20);

    await inst.loadMore();
    expect(ds.queries.at(-1).page).toBe(2);
    expect(inst.query.page).toBe(1);
    document.body.removeChild(inst);
});

test("autohidePager keeps the status line while more may follow", async () => {
    const ds = noCountSource(rows);
    const inst = await makeReadyGrid({
        pager: "more",
        autohidePager: true,
        initialQuery: { pageSize: 20 },
        dataSource: ds,
    });

    expect(inst.footerEl.hasAttribute("hidden")).toBe(false);
    expect(metaText(inst)).toBe("20");
    document.body.removeChild(inst);
});
