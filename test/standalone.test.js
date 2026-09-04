import { expect, test } from "bun:test";

const BUNDLE_URL = new URL("../dist/data-grid.standalone.min.js", import.meta.url);
const STYLE_ID = "lekoala-data-grid-style";

/**
 * Evaluate the standalone bundle - a single IIFE with no exports - in the
 * current (happy-dom) global scope, the way a classic `<script>` tag would.
 * @returns {Promise<void>}
 */
async function loadStandalone() {
    const source = await Bun.file(BUNDLE_URL).text();
    // Global-scope function construction, the same execution context a classic
    // <script> element would get; the bundle body is opaque by design.
    new Function(source)();
}

test("injects the stylesheet and registers the element from a single script", async () => {
    await loadStandalone();

    const styleIds = document.querySelectorAll(`#${STYLE_ID}`);
    expect(styleIds.length).toBe(1);
    expect(styleIds[0].textContent).toContain("--dg-bg");

    const gridCtor = customElements.get("data-grid");
    expect(typeof gridCtor).toBe("function");
    // Minified standalone class names are not stable; test the upgrade with
    // instanceof, never with `gridCtor.name`.
    expect(document.createElement("data-grid") instanceof gridCtor).toBe(true);
});

test("re-evaluating the bundle stays idempotent", async () => {
    await loadStandalone();
    await loadStandalone();

    expect(document.querySelectorAll(`#${STYLE_ID}`).length).toBe(1);
    const gridCtor = customElements.get("data-grid");
    expect(typeof gridCtor).toBe("function");
    expect(document.createElement("data-grid") instanceof gridCtor).toBe(true);
});

test("a declarative grid renders rows through the bundled classes", async () => {
    await loadStandalone();

    const grid = document.createElement("data-grid");
    grid.innerHTML = `<table>
        <thead><tr><th data-field="name">Name</th><th data-field="age">Age</th></tr></thead>
        <tbody>
            <tr data-row-key="1"><td>Ada</td><td>36</td></tr>
            <tr data-row-key="2"><td>Grace</td><td>32</td></tr>
        </tbody>
    </table>`;
    document.body.appendChild(grid);
    await new Promise((resolve) => {
        grid.addEventListener("connected", resolve, { once: true });
        setTimeout(resolve, 2000);
    });

    expect(grid.rows.length).toBe(2);
    grid.remove();
});

test("the standalone bundle leaks no globals", async () => {
    await loadStandalone();

    expect("DataGrid" in globalThis).toBe(false);
    expect("ArrayDataSource" in globalThis).toBe(false);
    expect("FetchDataSource" in globalThis).toBe(false);
});
