import { afterEach, beforeEach, expect, test } from "bun:test";
import DataGrid from "../data-grid.js";

/**
 * Counting data source: records every load call and its query so tests can
 * assert that lazy grids do not hit the source before they are activated.
 */
class CountingSource {
    constructor(rows) {
        this.rows = rows;
        this.count = 0;
        this.queries = [];
    }

    async load(query) {
        this.count++;
        this.queries.push(query);
        return { rows: this.rows, total: this.rows.length };
    }
}

// happy-dom ships IntersectionObserver but never fires a callback on its own,
// so the tests stub it and trigger the intersection manually.
let lastObserverCallback = null;

class FakeIntersectionObserver {
    constructor(callback) {
        this.callback = callback;
        lastObserverCallback = callback;
    }

    observe() {}

    unobserve() {}

    disconnect() {
        if (lastObserverCallback === this.callback) {
            lastObserverCallback = null;
        }
    }
}

/** Fire an intersecting entry into the currently-observed grid. */
function intersect() {
    lastObserverCallback([{ isIntersecting: true }]);
}

beforeEach(() => {
    // @ts-expect-error
    globalThis.IntersectionObserver = FakeIntersectionObserver;
    lastObserverCallback = null;
});

afterEach(() => {
    // @ts-expect-error
    delete globalThis.IntersectionObserver;
    lastObserverCallback = null;
});

/**
 * @param {Object} opts
 * @returns {Promise<DataGrid>}
 */
async function connect(opts = {}) {
    const inst = new DataGrid(opts);
    document.body.appendChild(inst);
    await new Promise((resolve) => {
        inst.addEventListener("connected", resolve, { once: true });
        setTimeout(resolve, 2000);
    });
    return inst;
}

const ROWS = [
    { id: 1, name: "Alice" },
    { id: 2, name: "Bob" },
];

const tick = () => new Promise((resolve) => setTimeout(resolve, 0));

test("loading lazy defers the first data source load until visible", async () => {
    const ds = new CountingSource(ROWS);
    const inst = await connect({ loading: "lazy", dataSource: ds, columns: [{ field: "name", title: "Name" }] });

    // Connected and initialized, but no fetch yet
    expect(inst.classList.contains("dg-initialized")).toBe(true);
    expect(ds.count).toBe(0);
    expect(lastObserverCallback).toBeTruthy();
    expect(inst.rows).toEqual([]);

    // Approaching the viewport triggers exactly one load
    intersect();
    await tick();
    expect(ds.count).toBe(1);
    expect(inst.rows).toEqual(ROWS);
    document.body.removeChild(inst);
});

test("query changes before activation accumulate and load once with the final state", async () => {
    const ds = new CountingSource(ROWS);
    const inst = await connect({ loading: "lazy", dataSource: ds, columns: [{ field: "name", title: "Name" }] });

    inst.setQuery({ search: "Thomas" });
    inst.setQuery({ filters: { status: "active" } });

    // Zero HTTP so far, but the query state is accumulated
    expect(ds.count).toBe(0);
    expect(inst.query.search).toBe("Thomas");
    expect(inst.query.filters).toEqual({ status: { operator: "contains", value: "active" } });

    intersect();
    await tick();
    expect(ds.count).toBe(1);
    expect(ds.queries[0].search).toBe("Thomas");
    expect(ds.queries[0].filters).toEqual({ status: { operator: "contains", value: "active" } });
    document.body.removeChild(inst);
});

test("an explicit refresh bypasses lazy and disarms the observer", async () => {
    const ds = new CountingSource(ROWS);
    const inst = await connect({ loading: "lazy", dataSource: ds, columns: [{ field: "name", title: "Name" }] });

    expect(ds.count).toBe(0);
    await inst.refresh();

    expect(ds.count).toBe(1);
    expect(lastObserverCallback).toBeNull();
    document.body.removeChild(inst);
});

test("an explicit load() also bypasses lazy", async () => {
    const ds = new CountingSource(ROWS);
    const inst = await connect({ loading: "lazy", dataSource: ds, columns: [{ field: "name", title: "Name" }] });

    expect(ds.count).toBe(0);
    await inst.load();

    expect(ds.count).toBe(1);
    expect(lastObserverCallback).toBeNull();
    document.body.removeChild(inst);
});

test("initialResult renders immediately even under lazy", async () => {
    const ds = new CountingSource([]);
    const inst = await connect({
        loading: "lazy",
        dataSource: ds,
        columns: [{ field: "name", title: "Name" }],
        initialResult: { rows: [{ id: 9, name: "Preloaded" }], total: 1 },
    });

    expect(inst.rows).toEqual([{ id: 9, name: "Preloaded" }]);
    expect(ds.count).toBe(0);
    expect(lastObserverCallback).toBeNull();
    document.body.removeChild(inst);
});

test("a grid without an async source never defers, even under lazy", async () => {
    const inst = await connect({ loading: "lazy", columns: [{ field: "name", title: "Name" }] });

    expect(inst.classList.contains("dg-initialized")).toBe(true);
    expect(lastObserverCallback).toBeNull();
    expect(inst.rows).toEqual([]);
    document.body.removeChild(inst);
});

test("eager loading (default) fetches immediately and uses no observer", async () => {
    const ds = new CountingSource(ROWS);
    const inst = await connect({ dataSource: ds, columns: [{ field: "name", title: "Name" }] });

    expect(ds.count).toBe(1);
    expect(lastObserverCallback).toBeNull();
    document.body.removeChild(inst);
});

test("disconnecting a lazy grid cleans up the observer before it fires", async () => {
    const ds = new CountingSource(ROWS);
    const inst = await connect({ loading: "lazy", dataSource: ds, columns: [{ field: "name", title: "Name" }] });

    expect(ds.count).toBe(0);
    document.body.removeChild(inst);
    await tick();
    await tick();

    expect(lastObserverCallback).toBeNull();
    expect(ds.count).toBe(0);
});

test("loading lazy via the reflected attribute", async () => {
    const ds = new CountingSource(ROWS);
    const inst = new DataGrid({ dataSource: ds, columns: [{ field: "name", title: "Name" }] });
    inst.setAttribute("loading", "lazy");
    document.body.appendChild(inst);
    await new Promise((resolve) => {
        inst.addEventListener("connected", resolve, { once: true });
        setTimeout(resolve, 2000);
    });

    expect(inst.options.loading).toBe("lazy");
    expect(ds.count).toBe(0);

    inst.setAttribute("loading", "eager");
    expect(inst.options.loading).toBe("lazy");
    expect(ds.count).toBe(0);
    document.body.removeChild(inst);
});
