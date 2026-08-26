import { expect, test } from "bun:test";
import DataGrid from "../data-grid.js";
import { ArrayDataSource } from "../src/data-source.js";
import formatValue, { getFormatDefaults } from "../src/utils/formatValue.js";

/**
 * Minimal grid context for unit-testing the formatters without a DOM tree.
 * @param {String} [lang]
 */
function fakeGrid(lang = "en-US") {
    return {
        closest: () => (lang ? { getAttribute: () => lang } : null),
        ownerDocument: {
            documentElement: { lang: "" },
            createElement: (...args) => document.createElement(...args),
        },
        labels: { booleanTrue: "Yes", booleanFalse: "No" },
    };
}

const ctx = { grid: fakeGrid() };

/**
 * Create a connected grid instance, ready for assertions
 * @param {Object} opts
 * @param {Array|null} data
 * @param {String|null} lang
 * @returns {Promise<DataGrid>}
 */
async function makeReadyGrid(opts = {}, data = null, lang = null) {
    const options = { ...opts };
    if (data !== null) {
        options.dataSource = new ArrayDataSource(data);
    }
    const inst = new DataGrid(options);
    if (lang) {
        inst.setAttribute("lang", lang);
    }
    document.body.appendChild(inst);
    await new Promise((resolve) => {
        inst.addEventListener("connected", resolve, { once: true });
        // Fallback if the connected event never fires
        setTimeout(resolve, 2000);
    });
    return inst;
}

function removeGrid(inst) {
    document.body.removeChild(inst);
}

// --- getFormatDefaults -----------------------------------------------------

test("getFormatDefaults exposes the presentation defaults", () => {
    expect(getFormatDefaults("boolean")).toEqual({ align: "center", minWidth: 48, width: 56 });
    expect(getFormatDefaults("date")).toEqual({ minWidth: 104, width: 120 });
    expect(getFormatDefaults("datetime")).toEqual({ minWidth: 152, width: 168 });
    expect(getFormatDefaults("number")).toEqual({ align: "end" });
    expect(getFormatDefaults("money")).toBeNull();
});

test("percent is the only number style with a sizing hint", () => {
    expect(getFormatDefaults("number", { style: "percent" })).toEqual({ align: "end", minWidth: 72, width: 88 });
    // Currency, unit and plain numbers vary too much: generic defaults only.
    expect(getFormatDefaults("number", { currency: "EUR" })).toEqual({ align: "end" });
    expect(getFormatDefaults("number", { unit: "kilometer" })).toEqual({ align: "end" });
});

// --- boolean ---------------------------------------------------------------

test("boolean formats obvious booleans and rejects other conventions", () => {
    for (const truthy of [true, 1, "1", "true"]) {
        const span = formatValue(truthy, "boolean", undefined, ctx);
        expect(span.nodeName).toBe("SPAN");
        expect(span.className).toBe("dg-boolean");
        expect(span.dataset.value).toBe("true");
        expect(span.getAttribute("role")).toBe("img");
        expect(span.getAttribute("aria-label")).toBe("Yes");
        // The shape is CSS-drawn: the contract is state only, never a glyph.
        expect(span.textContent).toBe("");
    }
    for (const falsy of [false, 0, "0", "false"]) {
        const span = formatValue(falsy, "boolean", undefined, ctx);
        expect(span.dataset.value).toBe("false");
        expect(span.getAttribute("aria-label")).toBe("No");
        expect(span.textContent).toBe("");
    }
    for (const other of [null, undefined, "", "yes", "on", "enabled", 2]) {
        expect(formatValue(other, "boolean", undefined, ctx)).toBe("");
    }
});

test("boolean aria-labels come from the grid labels", () => {
    const local = { grid: { ...fakeGrid(), labels: { booleanTrue: "Oui", booleanFalse: "Non" } } };
    expect(formatValue(true, "boolean", undefined, local).getAttribute("aria-label")).toBe("Oui");
    expect(formatValue(false, "boolean", undefined, local).getAttribute("aria-label")).toBe("Non");
});

// --- date ------------------------------------------------------------------

test("date treats YYYY-MM-DD as a local calendar date", () => {
    const time = formatValue("2026-08-26", "date", undefined, ctx);
    expect(time.nodeName).toBe("TIME");
    expect(time.getAttribute("datetime")).toBe("2026-08-26");
    expect(time.textContent).toBe("8/26/26");
});

test("date derives YYYY-MM-DD from local components, never UTC", () => {
    // Instant just after UTC midnight: its UTC date is 2026-08-26, its local
    // date depends on the runtime zone — the contract is the local date.
    const d = new Date(Date.UTC(2026, 7, 26, 0, 30));
    const expected = `${d.getFullYear()}-${`${d.getMonth() + 1}`.padStart(2, "0")}-${`${d.getDate()}`.padStart(2, "0")}`;
    const time = formatValue(d.getTime(), "date", undefined, ctx);
    expect(time.getAttribute("datetime")).toBe(expected);
});

test("date accepts a Date and a timestamp", () => {
    const fromDate = formatValue(new Date(2026, 7, 26), "date", undefined, ctx);
    const fromTimestamp = formatValue(new Date(2026, 7, 26).getTime(), "date", undefined, ctx);
    expect(fromDate.getAttribute("datetime")).toBe("2026-08-26");
    expect(fromTimestamp.getAttribute("datetime")).toBe("2026-08-26");
});

test("date rejects values outside its contract", () => {
    expect(formatValue("26/08/2026", "date", undefined, ctx)).toBe("");
    expect(formatValue("2026-08-26T10:00:00", "date", undefined, ctx)).toBe("");
    expect(formatValue("not a date", "date", undefined, ctx)).toBe("");
    expect(formatValue(null, "date", undefined, ctx)).toBe("");
    expect(formatValue(undefined, "date", undefined, ctx)).toBe("");
});

// --- datetime --------------------------------------------------------------

test("datetime uses the instant and exposes it as ISO", () => {
    const time = formatValue("2026-08-26T08:30:00Z", "datetime", { timeZone: "UTC" }, ctx);
    expect(time.nodeName).toBe("TIME");
    expect(time.getAttribute("datetime")).toBe("2026-08-26T08:30:00.000Z");
    expect(time.textContent).toBe("8/26/26, 8:30 AM");
});

test("datetime accepts a timestamp and a Date", () => {
    const d = new Date("2026-08-26T08:30:00Z");
    const fromDate = formatValue(d, "datetime", undefined, ctx);
    const fromTimestamp = formatValue(d.getTime(), "datetime", undefined, ctx);
    expect(fromDate.getAttribute("datetime")).toBe("2026-08-26T08:30:00.000Z");
    expect(fromTimestamp.getAttribute("datetime")).toBe("2026-08-26T08:30:00.000Z");
});

test("datetime requires a real ISO datetime string with a time zone", () => {
    expect(formatValue("26/08/2026", "datetime", undefined, ctx)).toBe("");
    expect(formatValue("not a date", "datetime", undefined, ctx)).toBe("");
    // A bare date and a timezone-less datetime are a local time, not an instant.
    expect(formatValue("2026-08-26", "datetime", undefined, ctx)).toBe("");
    expect(formatValue("2026-08-26T10:30:00", "datetime", undefined, ctx)).toBe("");
    // Offsets are accepted.
    const zulu = formatValue("2026-08-26T08:30:00Z", "datetime", undefined, ctx);
    const offset = formatValue("2026-08-26T10:30:00+02:00", "datetime", undefined, ctx);
    expect(zulu.getAttribute("datetime")).toBe("2026-08-26T08:30:00.000Z");
    expect(offset.getAttribute("datetime")).toBe("2026-08-26T08:30:00.000Z");
});

test("date validates YYYY-MM-DD strictly", () => {
    expect(formatValue("2028-02-29", "date", undefined, ctx).nodeName).toBe("TIME");
    expect(formatValue("2026-02-29", "date", undefined, ctx)).toBe("");
    expect(formatValue("2026-13-01", "date", undefined, ctx)).toBe("");
    expect(formatValue("2026-04-31", "date", undefined, ctx)).toBe("");
});

test("date rejects time and timeZone options", () => {
    for (const options of [
        { timeZone: "UTC" },
        { timeStyle: "short" },
        { hour: "numeric" },
        { minute: "2-digit" },
        { second: "2-digit" },
        { fractionalSecondDigits: 1 },
        { dayPeriod: "long" },
    ]) {
        expect(() => formatValue("2026-08-26", "date", options, ctx)).toThrow(TypeError);
    }
});

// --- date / datetime Intl options -------------------------------------------

test("the date style shortcut maps to dateStyle", () => {
    const time = formatValue("2026-08-26", "date", { style: "medium" }, ctx);
    expect(time.textContent).toBe("Aug 26, 2026");
});

test("granular Intl options suppress the automatic default style", () => {
    const time = formatValue("2026-08-26", "date", { year: "numeric", month: "long" }, ctx);
    expect(time.textContent).toBe("August 2026");
});

test("datetime completes a missing dateStyle without clobbering timeStyle", () => {
    const time = formatValue("2026-08-26T08:30:00Z", "datetime", { timeStyle: "long", timeZone: "UTC" }, ctx);
    expect(time.textContent).toContain("8:30:00 AM");
});

test("datetime style shortcut maps both, explicit options win", () => {
    const time = formatValue(
        "2026-08-26T08:30:00Z",
        "datetime",
        { style: "medium", timeStyle: "short", timeZone: "UTC" },
        ctx,
    );
    expect(time.textContent).toBe("Aug 26, 2026, 8:30 AM");
});

// --- number ----------------------------------------------------------------

test("number formats via Intl with the resolved locale", () => {
    expect(formatValue(1234.5, "number", undefined, ctx)).toBe("1,234.5");
});

test("number never coerces missing values to 0", () => {
    expect(formatValue(null, "number", undefined, ctx)).toBe("");
    expect(formatValue(undefined, "number", undefined, ctx)).toBe("");
    expect(formatValue("", "number", undefined, ctx)).toBe("");
    expect(formatValue("   ", "number", undefined, ctx)).toBe("");
    expect(formatValue("abc", "number", undefined, ctx)).toBe("");
});

test("number currency and unit shortcuts imply style", () => {
    expect(formatValue(1234.5, "number", { currency: "EUR" }, ctx)).toBe("€1,234.50");
    expect(formatValue(1234.5, "number", { unit: "kilometer" }, ctx)).toBe("1,234.5 km");
});

test("currency and unit cannot both infer number style", () => {
    expect(() => formatValue(1, "number", { currency: "EUR", unit: "kilometer" }, ctx)).toThrow(TypeError);
});

test("an invalid Intl configuration throws instead of hiding the bug", () => {
    expect(() => formatValue(1234.5, "number", { style: "currency" }, ctx)).toThrow();
});

// --- unknown format ----------------------------------------------------------

test("an unknown format leaves the value unchanged", () => {
    expect(formatValue("hello", "money", undefined, ctx)).toBe("hello");
});

// --- grid integration --------------------------------------------------------

test("number formats a column with Intl and aligns to the end", async () => {
    const inst = await makeReadyGrid({ columns: [{ field: "price", format: "number" }] }, [{ price: 1234.5 }], "en-US");
    const td = inst.querySelector('tbody td[data-column-id="price"]');
    expect(td.textContent).toBe("1,234.5");
    expect(td.dataset.format).toBe("number");
    expect(td.dataset.align).toBe("end");
    removeGrid(inst);
});

test("number currency shortcut works in a column", async () => {
    const inst = await makeReadyGrid(
        { columns: [{ field: "price", format: "number", formatOptions: { currency: "EUR" } }] },
        [{ price: 1234.5 }],
        "en-US",
    );
    expect(inst.querySelector('tbody td[data-column-id="price"]').textContent).toBe("€1,234.50");
    removeGrid(inst);
});

test("date renders a semantic <time> with the authored ISO date", async () => {
    const inst = await makeReadyGrid(
        { columns: [{ field: "created", format: "date" }] },
        [{ created: "2026-08-26" }],
        "en-US",
    );
    const time = inst.querySelector('tbody td[data-column-id="created"] time');
    expect(time).toBeTruthy();
    expect(time.getAttribute("datetime")).toBe("2026-08-26");
    expect(time.textContent).toBe("8/26/26");
    removeGrid(inst);
});

test("datetime renders the instant as ISO in <time>", async () => {
    const inst = await makeReadyGrid(
        {
            columns: [{ field: "lastLogin", format: "datetime", formatOptions: { timeZone: "UTC" } }],
        },
        [{ lastLogin: "2026-08-26T08:30:00Z" }],
        "en-US",
    );
    const time = inst.querySelector('tbody td[data-column-id="lastLogin"] time');
    expect(time.getAttribute("datetime")).toBe("2026-08-26T08:30:00.000Z");
    expect(time.textContent).toBe("8/26/26, 8:30 AM");
    removeGrid(inst);
});

test("the host lang drives the Intl locale", async () => {
    const inst = await makeReadyGrid(
        { columns: [{ field: "created", format: "date" }] },
        [{ created: "2026-08-26" }],
        "fr-FR",
    );
    const time = inst.querySelector('tbody td[data-column-id="created"] time');
    expect(time.textContent).toBe("26/08/2026");
    removeGrid(inst);
});

test("boolean renders an accessible stateful mark per row", async () => {
    const inst = await makeReadyGrid(
        { columns: [{ field: "active", format: "boolean" }] },
        [{ active: true }, { active: false }],
        "en-US",
    );
    const cells = inst.querySelectorAll('tbody td[data-column-id="active"] span.dg-boolean');
    expect(cells[0].getAttribute("role")).toBe("img");
    expect(cells[0].getAttribute("aria-label")).toBe("Yes");
    expect(cells[0].dataset.value).toBe("true");
    expect(cells[0].textContent).toBe("");
    expect(cells[1].getAttribute("aria-label")).toBe("No");
    expect(cells[1].dataset.value).toBe("false");
    removeGrid(inst);
});

test("boolean labels are translatable through setLabels", async () => {
    const before = DataGrid.getLabels();
    DataGrid.setLabels({ booleanTrue: "Oui", booleanFalse: "Non" });
    try {
        const inst = await makeReadyGrid(
            { columns: [{ field: "active", format: "boolean" }] },
            [{ active: true }, { active: false }],
            "en-US",
        );
        const cells = inst.querySelectorAll('tbody td[data-column-id="active"] span.dg-boolean');
        expect(cells[0].getAttribute("aria-label")).toBe("Oui");
        expect(cells[1].getAttribute("aria-label")).toBe("Non");
        removeGrid(inst);
    } finally {
        DataGrid.setLabels(before);
    }
});

test("the formatter safe width feeds the column minimum", async () => {
    const inst = await makeReadyGrid(
        {
            columns: [
                { field: "created", format: "date" },
                { field: "lastLogin", format: "datetime" },
                { field: "price", format: "number" },
            ],
        },
        [{ created: "2026-08-26", lastLogin: "2026-08-26T08:30:00Z", price: 1 }],
        "en-US",
    );
    expect(Number(inst.querySelector('th[data-column-id="created"]').dataset.minWidth)).toBeGreaterThanOrEqual(104);
    expect(Number(inst.querySelector('th[data-column-id="lastLogin"]').dataset.minWidth)).toBeGreaterThanOrEqual(152);
    // number has no safe width: the header intrinsic text wins
    expect(Number(inst.querySelector('th[data-column-id="price"]').dataset.minWidth)).toBeLessThan(152);
    removeGrid(inst);
});

test("an explicit column minWidth can raise the formatter minimum", async () => {
    const inst = await makeReadyGrid(
        { columns: [{ field: "created", format: "date", minWidth: 180 }] },
        [{ created: "2026-08-26" }],
        "en-US",
    );
    expect(Number(inst.querySelector('th[data-column-id="created"]').dataset.minWidth)).toBeGreaterThanOrEqual(180);
    removeGrid(inst);
});

test("explicit align wins over the formatter default", async () => {
    const inst = await makeReadyGrid(
        {
            columns: [
                { field: "price", format: "number", align: "center" },
                { field: "active", format: "boolean" },
            ],
        },
        [{ price: 1, active: true }],
        "en-US",
    );
    expect(inst.querySelector('tbody td[data-column-id="price"]').dataset.align).toBe("center");
    expect(inst.querySelector('tbody td[data-column-id="active"]').dataset.align).toBe("center");
    expect(inst.querySelector('thead tr.dg-head-columns th[data-column-id="price"]').dataset.align).toBe("center");
    removeGrid(inst);
});

test("the header shares the column alignment", async () => {
    const inst = await makeReadyGrid(
        {
            columns: [{ field: "price", format: "number" }, { field: "active", format: "boolean" }, { field: "name" }],
        },
        [{ price: 1, active: true, name: "a" }],
        "en-US",
    );
    expect(inst.querySelector('thead tr.dg-head-columns th[data-column-id="price"]').dataset.align).toBe("end");
    expect(inst.querySelector('thead tr.dg-head-columns th[data-column-id="active"]').dataset.align).toBe("center");
    // A plain column keeps the natural grid alignment
    expect(inst.querySelector('thead tr.dg-head-columns th[data-column-id="name"]').hasAttribute("data-align")).toBe(
        false,
    );
    removeGrid(inst);
});

test("filter cells keep their natural alignment", async () => {
    const inst = await makeReadyGrid(
        {
            filterable: true,
            sortable: true,
            columns: [{ field: "price", title: "Price", format: "number" }],
        },
        [{ price: 1 }],
        "en-US",
    );
    const th = inst.querySelector('.dg-head-filters th[data-column-id="price"]');
    expect(th.querySelector(".dg-filter")).toBeTruthy();
    expect(th.hasAttribute("data-align")).toBe(false);
    removeGrid(inst);
});

test("a custom renderHeaderCell still receives the column alignment", async () => {
    const inst = await makeReadyGrid(
        {
            columns: [
                {
                    field: "price",
                    format: "number",
                    renderHeaderCell: (th) => {
                        th.textContent = "Price";
                    },
                },
            ],
        },
        [{ price: 1 }],
        "en-US",
    );
    expect(inst.querySelector('thead tr.dg-head-columns th[data-column-id="price"]').dataset.align).toBe("end");
    removeGrid(inst);
});

test("data-format and data-align map declaratively", async () => {
    const inst = new DataGrid({});
    inst.innerHTML = `
        <table>
            <thead>
                <tr>
                    <th data-field="created" data-format="date">Created</th>
                    <th data-field="active" data-align="center">Active</th>
                </tr>
            </thead>
            <tbody>
                <tr><td data-value="2026-08-26"></td><td data-value="true"></td></tr>
            </tbody>
        </table>
    `;
    inst.setAttribute("lang", "en-US");
    document.body.appendChild(inst);
    await new Promise((resolve) => {
        inst.addEventListener("connected", resolve, { once: true });
        setTimeout(resolve, 2000);
    });

    expect(inst.options.columns[0].format).toBe("date");
    expect(inst.options.columns[1].align).toBe("center");
    const time = inst.querySelector('tbody td[data-column-id="created"] time');
    expect(time).toBeTruthy();
    expect(time.getAttribute("datetime")).toBe("2026-08-26");
    expect(inst.querySelector('tbody td[data-column-id="active"]').dataset.align).toBe("center");
    removeGrid(inst);
});

test("an invalid data-align is ignored, not turned into an option", async () => {
    const inst = new DataGrid({});
    inst.innerHTML = `
        <table>
            <thead><tr><th data-field="a" data-align="middle">A</th></tr></thead>
            <tbody><tr><td>1</td></tr></tbody>
        </table>
    `;
    document.body.appendChild(inst);
    await new Promise((resolve) => {
        inst.addEventListener("connected", resolve, { once: true });
        setTimeout(resolve, 2000);
    });
    expect(inst.options.columns[0].align).toBeNull();
    expect(inst.querySelector('tbody td[data-column-id="a"]').hasAttribute("data-align")).toBe(false);
    removeGrid(inst);
});

test("renderCell takes full control over format", async () => {
    const inst = await makeReadyGrid(
        {
            columns: [{ field: "created", format: "date", renderCell: ({ value }) => `[${value}]` }],
        },
        [{ created: "2026-08-26" }],
        "en-US",
    );
    const td = inst.querySelector('tbody td[data-column-id="created"]');
    expect(td.textContent).toBe("[2026-08-26]");
    expect(td.querySelector("time")).toBeNull();
    removeGrid(inst);
});

test("transform output feeds the formatter", async () => {
    const inst = await makeReadyGrid(
        {
            columns: [{ field: "created", format: "date", transform: (value) => `20${value}` }],
        },
        [{ created: "26-08-26" }],
        "en-US",
    );
    const time = inst.querySelector('tbody td[data-column-id="created"] time');
    expect(time.getAttribute("datetime")).toBe("2026-08-26");
    removeGrid(inst);
});

test("an unknown format renders the raw value", async () => {
    const inst = await makeReadyGrid({ columns: [{ field: "name", format: "money" }] }, [{ name: "42.50" }], "en-US");
    const td = inst.querySelector('tbody td[data-column-id="name"]');
    expect(td.textContent).toBe("42.50");
    expect(td.dataset.format).toBe("money");
    removeGrid(inst);
});
