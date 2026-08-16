import { expect, test } from "bun:test";
import DataGrid from "../data-grid.js";
import { ArrayDataSource } from "../src/data-source.js";

const rows = Array.from({ length: 30 }, (_, i) => ({ id: i + 1, name: `row${i}` }));

async function makeReadyGrid(opts = {}, data = rows) {
    const options = { ...opts };
    if (data !== null) {
        options.dataSource = new ArrayDataSource(data);
    }
    const inst = new DataGrid(options);
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

test("the page input only navigates on change and clamps out-of-range values", async () => {
    const inst = await makeReadyGrid({ pageSize: 10 });

    const input = inst.querySelector(".dg-input-page");
    expect(input.max).toBe("3");
    expect(inst.querySelector(".dg-pagination").getAttribute("aria-label")).toBe("Page 1 of 3");

    // Typing alone must not trigger a request
    input.value = "12";
    input.dispatchEvent(new Event("input"));
    expect(inst.query.page).toBe(1);

    // Change clamps to the last valid page
    input.value = "12";
    input.dispatchEvent(new Event("change"));
    await flush();
    expect(inst.query.page).toBe(3);
    expect(inst.rows[0].id).toBe(21);
    expect(inst.querySelector(".dg-pagination").getAttribute("aria-label")).toBe("Page 3 of 3");

    // Change back to page 1
    input.value = "1";
    input.dispatchEvent(new Event("change"));
    await flush();
    expect(inst.query.page).toBe(1);
    expect(inst.rows[0].id).toBe(1);
    removeGrid(inst);
});

test("an invalid page value is discarded without navigating", async () => {
    const inst = await makeReadyGrid({ pageSize: 10 });
    const input = inst.querySelector(".dg-input-page");

    input.value = "abc";
    input.dispatchEvent(new Event("change"));
    expect(inst.query.page).toBe(1);
    expect(input.value).toBe("1");
    removeGrid(inst);
});

test("zero results report a logical page 1/1", async () => {
    const inst = await makeReadyGrid({ pageSize: 10 }, []);
    expect(inst.totalPages()).toBe(1);
    const input = inst.querySelector(".dg-input-page");
    expect(input.value).toBe("1");
    expect(input.disabled).toBe(true);
    removeGrid(inst);
});

test("a requested page beyond the last page refetches on the last valid page", async () => {
    const inst = await makeReadyGrid({ pageSize: 10 });

    await inst.setQuery({ page: 5 });
    // ArrayDataSource returns total 30 => 3 pages; page 5 no longer exists
    expect(inst.query.page).toBe(3);
    expect(inst.rows[0].id).toBe(21);
    expect(inst.rows).toHaveLength(10);
    removeGrid(inst);
});

test("setQuery keeps the page for page-only changes", async () => {
    const inst = await makeReadyGrid({ pageSize: 10 });

    await inst.setQuery({ page: 2 });
    await inst.setQuery({ page: 2 });
    expect(inst.query.page).toBe(2);
    expect(inst.rows[0].id).toBe(11);
    removeGrid(inst);
});
