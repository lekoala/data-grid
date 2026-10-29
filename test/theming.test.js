import { expect, test } from "bun:test";
import { readFileSync } from "node:fs";
// Side-effect import: registers the element. This file must not rely on
// another test file having imported the grid first (test files share one
// custom element registry).
import "../data-grid.js";

const coreCss = readFileSync(new URL("../dist/data-grid.css", import.meta.url), "utf8");
const themeCss = readFileSync(new URL("../themes/bootstrap.css", import.meta.url), "utf8");
const actualThemeCss = readFileSync(new URL("../themes/actual.css", import.meta.url), "utf8");

test("core css exposes --dg-* tokens", () => {
    expect(coreCss).toContain("--dg-border-width");
    expect(coreCss).toContain("--dg-bg");
    expect(coreCss).toContain("--dg-color");
    expect(coreCss).toContain("--dg-accent");
    expect(coreCss).toContain("--dg-accent-soft");
    expect(coreCss).toContain("--dg-focus-color");
    expect(coreCss).toContain("--dg-focus-width");
    expect(coreCss).toContain("--dg-padding-y");
    expect(coreCss).toContain("--dg-padding-x");
    expect(coreCss).toContain("--dg-header-padding-y");
    expect(coreCss).toContain("--dg-radius");
});

test("focus is a solid outline in its own color, not a translucent halo", () => {
    expect(coreCss).toMatch(/--dg-focus-color: var\(--dg-accent\);/);
    expect(coreCss).toMatch(/--dg-focus-width: 2px;/);
    expect(coreCss).not.toContain("--dg-focus-ring");
    expect(coreCss).not.toMatch(/box-shadow: 0 0 0 3px/);
});

test("core css is neutral: no bootstrap refs, no legacy tokens", () => {
    expect(coreCss).not.toMatch(/--bs-/);
    expect(coreCss).not.toMatch(/--padding(?!-)|--body-color|--btn-|--color-rgb/);
});

test("core css ships the density presets", () => {
    expect(coreCss).toMatch(/data-grid\[density=?["']?compact["']?\]/);
    expect(coreCss).toMatch(/data-grid\[density=?["']?comfortable["']?\]/);
});

test("the scroll viewport lets wheel input chain to the page", () => {
    expect(coreCss).not.toContain("overscroll-behavior: contain");
});

test("grid-skinned selects share the component caret", () => {
    expect(coreCss).toMatch(/data-grid select:where\(\.dg-skin\) \{[\s\S]*?appearance: none;/);
    expect(coreCss).toMatch(
        /data-grid :is\(\.dg-select-field:not\(\.dg-host-select\), \.dg-caret\):after \{[\s\S]*?transform: translateY\(-70%\)rotate\(45deg\)/,
    );
    // Physical LTR reserve, mirrored for [dir="rtl"] in _rtl.css (Bun CSS workaround)
    expect(coreCss).toContain("padding-right: 32px");
    expect(coreCss).toContain('data-grid[dir="rtl"] select:where(');
    expect(coreCss).not.toContain("dg-filter-cell:has(select)");
});

test("empty text filters show an I-beam affordance, mirrored in RTL", () => {
    expect(coreCss).toMatch(
        /\.dg-text-field:has\(\s*>\s*input\.dg-filter-control\.dg-skin\[placeholder=""\]:not\(:focus\):placeholder-shown\)::?after/,
    );
    expect(coreCss).toMatch(/\.dg-text-field[\s\S]*?mask: var\(--dg-icon-filter-text\)/);
    expect(coreCss).toMatch(/\[dir="rtl"\][\s\S]*?\.dg-text-field[\s\S]*?::?after \{[\s\S]*?left: 12px/);
    expect(coreCss).toMatch(/forced-colors[\s\S]*?\.dg-text-field::?after \{\s*display: none/);
});

test("filter cell layout belongs to the grid's own wrappers", () => {
    // A custom renderFilterCell control keeps its own box; only the built-in
    // wrappers fill the cell.
    expect(coreCss).toMatch(
        /th\.dg-filter-cell > :(?:-webkit-any|-moz-any|is)\(\.dg-text-field, \.dg-select-field, \.dg-multiselect\) \{[\s\S]*?width: 100%;[\s\S]*?margin: 0;/,
    );
    expect(coreCss).not.toMatch(/thead tr\.dg-head-filters th > \*/);
    expect(coreCss).toMatch(
        /thead tr\.dg-head-filters \.dg-filter-control\.dg-skin \{[\s\S]*?padding: 4px var\(--dg-padding-x\);[\s\S]*?text-align: inherit;/,
    );
});

test("text filters keep the column alignment gutter", () => {
    expect(coreCss).not.toMatch(/input\.dg-filter-control \{[^}]*padding-(right|left)/);
});

test("decorative SVG masks keep standard and legacy WebKit declarations", () => {
    for (const selector of [".dg-search-icon", ".dg-actions-toggle:before", ".dg-disclosure:before"]) {
        const escaped = selector.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
        expect(coreCss).toMatch(
            new RegExp(
                `${escaped} \\{[\\s\\S]*?-webkit-mask: var\\(--dg-icon-[a-z-]+\\)[\\s\\S]*?mask: var\\(--dg-icon-[a-z-]+\\)`,
            ),
        );
    }
});

test("icon masks are defined once as overridable tokens", () => {
    for (const name of ["search", "actions", "disclosure", "details", "filter-text", "close"]) {
        expect(coreCss).toContain(`--dg-icon-${name}: url(`);
    }
});

test("inline action buttons and links share one box model", () => {
    expect(coreCss).toMatch(
        /data-grid \.dg-actions button\.dg-skin,\s*data-grid \.dg-actions a\.dg-skin \{\s*box-sizing: border-box;/,
    );
});

test("row backgrounds never paint over the viewport focus ring", () => {
    // A positioned row paints its background above the scroll viewport's inset
    // outline, which segments the ring on opaque rows. Rows stay in normal flow.
    expect(coreCss).not.toMatch(/data-grid tr \{[^}]*position: relative;/);
});

test("the shared caret is reusable and sort glyphs share the label axis", () => {
    expect(coreCss).toMatch(/\.dg-caret\)::?after/);
    expect(coreCss).toMatch(/data-grid\[dir="rtl"\] \.dg-caret::?after/);
    expect(coreCss).toMatch(/th\.dg-sortable > \.dg-sort,[\s\S]*?align-items:\s+center;/);
});

test("the shared caret replaces the native datalist glyph", () => {
    // Chromium shows its own list button on hover/focus and paints its display
    // through an internal hint, so only !important suppresses it. The [list]
    // scope leaves date/time pickers alone.
    expect(coreCss).toMatch(/\.dg-caret \[list\]::-webkit-calendar-picker-indicator \{\s*display: none !important;/);
});

test("pager hover is a wash, the focus ring marks the active control", () => {
    expect(coreCss).toMatch(
        /\.dg-pagination > button\.dg-skin:hover:not\(:disabled\) \{[^}]*background-color: var\(--dg-row-hover-bg\);[^}]*\}/,
    );
    expect(coreCss).not.toMatch(
        /\.dg-pagination > button\.dg-skin:hover:not\(:disabled\) \{[^}]*border-color: var\(--dg-accent\);/,
    );
});

test("multi-select filters use a JS-positioned fixed floating panel", () => {
    expect(coreCss).toMatch(/\.dg-multiselect-panel \{[\s\S]*?position: fixed;/);
    expect(coreCss).toMatch(/\.dg-multiselect-panel \{[\s\S]*?var\(--available-height/);
    expect(coreCss).toMatch(/\.dg-filter-control\.dg-skin \{[\s\S]*?box-sizing: border-box;/);
});

test("row action menus use a JS-positioned fixed floating panel", () => {
    expect(coreCss).toMatch(/\.dg-actions-menu \{[\s\S]*?position: fixed;/);
    expect(coreCss).toMatch(/\.dg-actions-menu \{[\s\S]*?var\(--available-height/);
});

test("floating panels no longer depend on CSS Anchor Positioning", () => {
    expect(coreCss).not.toMatch(/position-area|position-try-fallbacks|anchor-size\(/);
});

test("multi-select keyboard focus is drawn on the filter control", () => {
    expect(coreCss).toMatch(/\.dg-multiselect-trigger\.dg-skin:focus-visible \{\s*outline: 0;/);
    expect(coreCss).toMatch(
        /\.dg-multiselect\.dg-skin:has\(\s*> \.dg-multiselect-trigger:focus-visible\) \{[\s\S]*?outline: var\(--dg-focus-width\) solid var\(--dg-focus-color\);[\s\S]*?outline-offset: calc\(var\(--dg-focus-width\) \* -1\);/,
    );
});

test("filter focus is an inset outline on the skinned control", () => {
    expect(coreCss).toMatch(
        /\.dg-filter-control\.dg-skin:focus-visible \{[\s\S]*?outline: var\(--dg-focus-width\) solid var\(--dg-focus-color\);[\s\S]*?outline-offset: calc\(var\(--dg-focus-width\) \* -1\);/,
    );
});

test("fields, discrete buttons and compact controls use the documented geometry", () => {
    // Fields and selects: inset.
    expect(coreCss).toMatch(
        /data-grid input:where\(\.dg-skin\):not\([^\n]*\):focus-visible \{\n {2}outline: var\(--dg-focus-width\) solid var\(--dg-focus-color\);\n {2}outline-offset: calc\(var\(--dg-focus-width\) \* -1\);\n\}/,
    );
    // Discrete buttons: outer ring with a 2px offset.
    expect(coreCss).toMatch(
        /data-grid button:where\(\.dg-skin\):focus-visible \{[\s\S]*?outline: var\(--dg-focus-width\) solid var\(--dg-focus-color\);[\s\S]*?outline-offset: 2px;/,
    );
    // Compact icon controls override the button ring with an inset one.
    expect(coreCss).toMatch(
        /\.dg-actions button:where\(\.dg-skin\):focus-visible \{[\s\S]*?outline-offset: calc\(var\(--dg-focus-width\) \* -1\);/,
    );
    expect(coreCss).toMatch(
        /\.dg-pagination button:where\(\.dg-skin\):focus-visible \{[\s\S]*?outline-offset: calc\(var\(--dg-focus-width\) \* -1\);/,
    );
    expect(coreCss).toMatch(
        /\.dg-disclosure\.dg-skin:focus-visible \{[\s\S]*?outline-offset: calc\(var\(--dg-focus-width\) \* -1\);/,
    );
});

test("the scroll viewport keeps its focus ring inside the clipped frame", () => {
    expect(coreCss).toMatch(
        /\.dg-scroll:focus-visible \{[\s\S]*?outline: var\(--dg-focus-width\) solid var\(--dg-focus-color\);[\s\S]*?outline-offset: calc\(var\(--dg-focus-width\) \* -1\);/,
    );
});

test("sortable headers focus the sort button, not the whole header", () => {
    expect(coreCss).toMatch(
        /th\.dg-sortable > \.dg-sort:focus-visible \{[\s\S]*?outline: var\(--dg-focus-width\) solid var\(--dg-focus-color\);[\s\S]*?outline-offset: calc\(var\(--dg-focus-width\) \* -1\);/,
    );
    expect(coreCss).not.toMatch(/th\.dg-sortable:focus-within/);
});

test("filter styling is gated on the grid's skin marker", () => {
    // An application control may reuse .dg-filter-control for behavior; only
    // .dg-skin hands its appearance and focus to the grid.
    expect(coreCss).toMatch(/thead tr\.dg-head-filters \.dg-filter-control\.dg-skin \{/);
    expect(coreCss).toMatch(/thead tr\.dg-head-filters \.dg-filter-control\.dg-skin:focus-visible \{/);
    expect(coreCss).toMatch(/input\.dg-filter-control\.dg-skin\[placeholder=""\]/);
    expect(coreCss).not.toMatch(/thead tr\.dg-head-filters \.dg-filter-control:focus-visible/);
});

test("editable controls paint their own focus outline, the cell stays neutral", () => {
    expect(coreCss).toMatch(
        /td input\.dg-editable:not\(\[type="checkbox"\]\):focus \{[\s\S]*?outline: var\(--dg-focus-width\) solid var\(--dg-focus-color\);[\s\S]*?outline-offset: calc\(var\(--dg-focus-width\) \* -1\);/,
    );
    expect(coreCss).toMatch(
        /td select\.dg-editable:focus-visible \{[\s\S]*?outline: var\(--dg-focus-width\) solid var\(--dg-focus-color\);[\s\S]*?outline-offset: calc\(var\(--dg-focus-width\) \* -1\);/,
    );
    expect(coreCss).toMatch(
        /td input\.dg-editable\[type="checkbox"\]:focus-visible \{[\s\S]*?outline: var\(--dg-focus-width\) solid var\(--dg-focus-color\);[\s\S]*?outline-offset: 2px;/,
    );
    expect(coreCss).toMatch(
        /td\.dg-editable-col\[data-invalid\] input\.dg-editable:focus \{[\s\S]*?outline-color: var\(--dg-danger-color\);/,
    );
    expect(coreCss).not.toMatch(/td\.dg-editable-col\[data-editing\] \{[\s\S]*?background-color/);
});

test("editable text inputs underline on hover only", () => {
    expect(coreCss).toMatch(
        /td input\.dg-editable:not\(\[type="checkbox"\]\):hover \{[\s\S]*?box-shadow: inset 0 -1px 0 var\(--dg-control-border-color\);/,
    );
});

test("editable text inputs fill their cell", () => {
    // Bun folds the zero offsets into `inset: 0`.
    expect(coreCss).toMatch(
        /td input\.dg-editable:not\(\[type="checkbox"\]\) \{[\s\S]*?position: absolute;[\s\S]*?inset: 0;/,
    );
    expect(coreCss).not.toContain("dg-editable-col:hover");
});

test("collapsed action items show one neutral keyboard focus, links included", () => {
    // Bun splits the selector list into one rule per selector; both share the
    // neutral wash plus the inset focus outline. Intent items keep their
    // hover fill when hovered and focused at once, so only the base variants
    // are asserted here.
    for (const selector of [
        "\\.dg-actions-menu button\\.dg-skin:focus-visible",
        "\\.dg-actions-menu a\\.dg-skin:focus-visible",
    ]) {
        expect(coreCss).toMatch(
            new RegExp(
                `${selector} \\{[\\s\\S]*?background-color: var\\(--dg-row-hover-bg\\);[\\s\\S]*?outline: var\\(--dg-focus-width\\) solid var\\(--dg-focus-color\\);`,
            ),
        );
    }
});

test("the filter row uses --dg-filter-bg while column headers keep --dg-header-bg", () => {
    expect(coreCss).toMatch(/data-grid thead tr\.dg-head-filters \{[\s\S]*?background-color: var\(--dg-filter-bg\);/);
    expect(coreCss).toMatch(
        /data-grid thead tr\.dg-head-filters th \{[\s\S]*?background-color: var\(--dg-filter-bg\);/,
    );
    expect(coreCss).toMatch(
        /data-grid thead tr\.dg-head-columns th \{[\s\S]*?background-color: var\(--dg-header-bg\);/,
    );
});

test("multi-select filters keep the same control height as adjacent filters", () => {
    expect(coreCss).toMatch(/\.dg-multiselect-trigger \{[\s\S]*?height: auto;/);
    expect(coreCss).toMatch(/min-height: calc\(var\(--dg-control-height\)\s*-\s*var\(--dg-space-2\)\)/);
});

test("generated css never downlevels logical properties into :lang() sets", () => {
    expect(coreCss).not.toContain(":lang(");
});

test("cell alignment stays logical in both text directions", () => {
    expect(coreCss).toMatch(/data-grid th,\s*data-grid td \{[\s\S]*?text-align: start;/);
    expect(coreCss).toMatch(
        /data-grid th\[data-align=["']?end["']?\],\s*data-grid td\[data-align=["']?end["']?\] \{\s*text-align: end;/,
    );
    expect(coreCss).not.toMatch(/data-grid\[dir=rtl\] th,\s*data-grid\[dir=rtl\] td \{\s*text-align: right;/);
});

test("bootstrap theme maps --dg-* onto --bs-* and covers dark mode", () => {
    expect(themeCss).toContain("--dg-bg: var(--bs-body-bg");
    expect(themeCss).toContain("--dg-accent: var(--bs-primary");
    expect(themeCss).toContain('[data-bs-theme="dark"] data-grid');
});

test("actual theme maps --dg-* onto Actual CSS tokens", () => {
    expect(actualThemeCss).not.toMatch(/--primary-soft|--danger-soft|var\(--focus-ring\)/);
    expect(actualThemeCss).toContain("--dg-focus-color: var(--focus)");
    expect(actualThemeCss).toContain("--dg-focus-width: var(--focus-ring-width, 2px)");
    expect(actualThemeCss).not.toContain("--dg-focus-ring");
    expect(actualThemeCss).toContain("--dg-border-width: var(--border-width)");
    expect(actualThemeCss).toContain("--dg-bg: var(--surface");
    expect(actualThemeCss).toContain("--dg-color: var(--text");
    expect(actualThemeCss).toContain("--dg-border-color: var(--border");
    expect(actualThemeCss).toContain("--dg-accent: var(--link, var(--primary))");
});

test("bootstrap theme uses an opaque focus color, not its translucent ring", () => {
    expect(themeCss).toContain("--dg-focus-color: var(--bs-primary");
    expect(themeCss).not.toContain("--dg-focus-ring");
    expect(themeCss).not.toMatch(/--dg-focus-color:\s*var\(--bs-focus-ring-color/);
});

test("density attribute maps to the density option", () => {
    const ctor = customElements.get("data-grid");
    // @ts-expect-error
    const grid = new ctor();
    document.body.appendChild(grid);
    expect(grid.options.density).toBe("default");
    grid.setAttribute("density", "compact");
    expect(grid.options.density).toBe("compact");
    grid.remove();
});
