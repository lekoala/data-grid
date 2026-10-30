import { expect, test } from "bun:test";
import DataGrid from "../data-grid.js";

const tick = () => new Promise((resolve) => setTimeout(resolve, 0));

test("a disconnected grid ignores a source that resolves despite cancellation", async () => {
    let resolveLoad;
    const grid = new DataGrid({
        columns: [{ field: "name" }],
        initialResult: { rows: [{ name: "Before" }], total: 1 },
        dataSource: {
            load() {
                return new Promise((resolve) => {
                    resolveLoad = resolve;
                });
            },
        },
    });
    const ready = new Promise((resolve) => grid.addEventListener("connected", resolve, { once: true }));
    document.body.append(grid);
    await ready;
    const loading = grid.refresh();
    const disconnected = new Promise((resolve) => grid.addEventListener("disconnected", resolve, { once: true }));
    grid.remove();
    await disconnected;
    let commits = 0;
    grid.addEventListener("bodyRendered", () => commits++);
    resolveLoad({ rows: [{ name: "Late" }], total: 1 });
    await loading;
    expect(grid.rows[0].name).toBe("Before");
    expect(commits).toBe(0);
    expect(grid.loading).toBe(false);
    expect(grid.hasAttribute("data-loading")).toBe(false);
});

test("an initial load completing after disconnection cannot finish bootstrapping the grid", async () => {
    let finish;
    let markStarted;
    const started = new Promise((resolve) => {
        markStarted = resolve;
    });
    const grid = new DataGrid({
        columns: [{ field: "name" }],
        dataSource: {
            load() {
                markStarted();
                return new Promise((resolve) => {
                    finish = resolve;
                });
            },
        },
    });
    let connected = 0;
    let committed = 0;
    grid.addEventListener("connected", () => connected++);
    grid.addEventListener("bodyRendered", () => committed++);
    document.body.append(grid);
    await started;
    const disconnected = new Promise((resolve) => grid.addEventListener("disconnected", resolve, { once: true }));
    grid.remove();
    await disconnected;
    finish({ rows: [{ name: "Late" }], total: 1 });
    await tick();
    expect(grid.rows).toEqual([]);
    expect(grid.classList.contains("dg-initialized")).toBe(false);
    expect(connected).toBe(0);
    expect(committed).toBe(0);
});

test("removal before deferred connection cancels initialization", async () => {
    const grid = new DataGrid({ columns: [{ field: "name" }] });
    let connected = 0;
    grid.addEventListener("connected", () => connected++);

    document.body.appendChild(grid);
    grid.remove();
    await tick();
    await tick();

    expect(connected).toBe(0);
    expect(grid.setup).toBe(false);
    expect(grid.rendered).toBe(false);

    const reconnected = new Promise((resolve) => grid.addEventListener("connected", resolve, { once: true }));
    document.body.appendChild(grid);
    await reconnected;

    expect(connected).toBe(1);
    expect(grid.rendered).toBe(true);
    grid.remove();
});
