/**
 * Build-only entry for the zero-config standalone bundle
 * (`dist/data-grid.standalone.min.js`).
 *
 * The standalone ships a single IIFE that auto-registers the `<data-grid>`
 * element AND injects the grid stylesheet, so a page can use the grid with
 * just one `<script>` tag. It is never imported by `src/` and is not part of
 * the package's source distribution (see AGENTS.md: Bun is build tooling only).
 *
 * The stylesheet is read from the built `dist/data-grid.min.css` through the
 * text `loader` (Bun inlines the file content as a string), not from the
 * `css/data-grid.css` entry: its `@import` of partials would be inlined
 * verbatim and never resolved inside an injected `<style>`.
 *
 * Registration runs through `data-grid.js` - the same module shipped as the
 * package main - which registers the built-in plugin set and defines the
 * element. Referencing its default export below is what keeps that module,
 * and its top-level registration side effects, in the minified bundle: a bare
 * side-effect import is eliminated by tree-shaking (documented in
 * .temp/bundle-plan.md).
 */
// @ts-expect-error inlined as text by the Bun bundler (`loader: { ".css": "text" }`),
// so no type declarations exist for the stylesheet.
import styles from "../dist/data-grid.min.css";
import DataGrid from "../data-grid.js";

/** @type {string} */
const cssText = styles;

const STYLE_ID = "lekoala-data-grid-style";

if (!document.getElementById(STYLE_ID)) {
    const style = document.createElement("style");
    style.id = STYLE_ID;
    style.textContent = cssText;

    const nonce = document.currentScript?.nonce;
    if (nonce) {
        style.nonce = nonce;
    }

    document.head.append(style);
}

// `data-grid.js` (imported above) already registers the built-in plugins and
// defines the element. Referencing the class here keeps that module in the
// bundle; for direct loads the define below stays a no-op.
if (!customElements.get("data-grid") && DataGrid) {
    customElements.define("data-grid", DataGrid);
}