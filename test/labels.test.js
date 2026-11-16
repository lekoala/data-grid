import { expect, spyOn, test } from "bun:test";
import DataGrid from "../data-grid.js";

function connected(grid) {
    const ready = new Promise((resolve) => grid.addEventListener("connected", resolve, { once: true }));
    document.body.append(grid);
    return ready;
}

function declaration(grid, text) {
    const script = document.createElement("script");
    script.type = "application/json";
    script.setAttribute("data-labels", "");
    script.textContent = text;
    grid.append(script);
    return script;
}

test("updateLabels is safe before connection and labels apply on first render", async () => {
    const grid = new DataGrid();
    try {
        expect(() => grid.updateLabels()).not.toThrow();
        await connected(grid);
        expect(grid.tbody.getAttribute("data-empty-message")).toBe(grid.labels.noData);
    } finally {
        grid.remove();
    }
});

test("declarative labels are isolated and shared changes refresh only non-overridden labels", async () => {
    const previous = DataGrid.getLabels();
    const grid = new DataGrid({ searchable: true });
    const other = new DataGrid({ searchable: true });
    const local = {
        search: "Find a customer",
        gotoNextPage: "More customers",
        pageRange: "{from} to {to} / {total} customers",
        pageStatus: "Customer page {page} / {pages}",
        noData: '<img src=x data-injected="true">',
    };
    declaration(grid, JSON.stringify(local));
    try {
        await Promise.all([connected(grid), connected(other)]);
        expect(grid.searchInput.getAttribute("aria-label")).toBe(local.search);
        expect(grid.searchInput.placeholder).toBe(`${local.search}…`);
        expect(grid.btnNext.getAttribute("aria-label")).toBe(local.gotoNextPage);
        expect(grid.querySelector(".dg-page-range").textContent).toBe("0 to 0 / 0 customers");
        expect(grid.querySelector(".dg-pagination").getAttribute("aria-label")).toBe("Customer page 1 / 1");
        expect(grid.tbody.getAttribute("data-empty-message")).toBe(local.noData);
        expect(grid.querySelector("[data-injected]")).toBeNull();
        expect(other.labels.search).toBe(previous.search);
        expect(DataGrid.getLabels()).toBe(previous);

        DataGrid.setLabels({ search: "Global search", gotoPrevPage: "Global previous" });
        grid.updateLabels();
        other.updateLabels();
        expect(grid.searchInput.getAttribute("aria-label")).toBe(local.search);
        expect(grid.btnPrev.getAttribute("aria-label")).toBe("Global previous");
        expect(other.searchInput.getAttribute("aria-label")).toBe("Global search");
    } finally {
        grid.remove();
        other.remove();
        DataGrid.setLabels(previous);
    }
});

for (const text of ["{", "null", "[]", '"hello"', "42", ""]) {
    test(`invalid declarative labels fall back to shared labels: ${JSON.stringify(text)}`, async () => {
        const grid = new DataGrid();
        declaration(grid, text);
        const warning = spyOn(console, "warn").mockImplementation(() => {});
        try {
            await connected(grid);
            expect(grid.labels).toBe(DataGrid.getLabels());
            expect(grid.tbody.getAttribute("data-empty-message")).toBe(DataGrid.getLabels().noData);
            expect(warning).toHaveBeenCalledTimes(1);
        } finally {
            grid.remove();
            warning.mockRestore();
        }
    });
}

test("declarative labels retain strings, including empty strings, and ignore invalid or unknown keys", async () => {
    const grid = new DataGrid();
    declaration(grid, '{"search":42,"noData":"","gotoNextPage":"Next customer","unknown":"ignored"}');
    const warning = spyOn(console, "warn").mockImplementation(() => {});
    try {
        await connected(grid);
        expect(grid.labels.search).toBe(DataGrid.getLabels().search);
        expect(grid.labels.noData).toBe("");
        expect(grid.labels.gotoNextPage).toBe("Next customer");
        expect(Object.hasOwn(grid.labels, "unknown")).toBe(false);
        expect(warning).toHaveBeenCalledTimes(1);
    } finally {
        grid.remove();
        warning.mockRestore();
    }
});

for (const initial of [null, "{}", '{"noData":"Initial label"}']) {
    test(`declarative labels are read only once, including after reconnection: ${initial}`, async () => {
        const grid = new DataGrid();
        const script = initial === null ? null : declaration(grid, initial);
        try {
            await connected(grid);
            const expected = grid.labels.noData;
            if (script) script.textContent = '{"noData":"Changed label"}';
            else declaration(grid, '{"noData":"Changed label"}');
            grid.updateLabels();
            expect(grid.tbody.getAttribute("data-empty-message")).toBe(expected);

            const removed = new Promise((resolve) => grid.addEventListener("disconnected", resolve, { once: true }));
            grid.remove();
            await removed;
            await connected(grid);
            expect(grid.tbody.getAttribute("data-empty-message")).toBe(expected);
            expect(grid.querySelectorAll(".dg-frame").length).toBe(1);
        } finally {
            grid.remove();
        }
    });
}

test("only a direct child declaration configures labels", async () => {
    const grid = new DataGrid();
    const wrapper = document.createElement("div");
    declaration(wrapper, '{"noData":"Nested label"}');
    grid.append(wrapper);
    try {
        await connected(grid);
        expect(grid.labels).toBe(DataGrid.getLabels());
    } finally {
        grid.remove();
    }
});
