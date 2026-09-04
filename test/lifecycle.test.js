import { expect, test } from "bun:test";
import DataGrid from "../data-grid.js";

const tick = () => new Promise((resolve) => setTimeout(resolve, 0));

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
