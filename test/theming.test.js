import { expect, test } from "bun:test";
import { readFileSync } from "node:fs";

const coreCss = readFileSync(new URL("../dist/data-grid.css", import.meta.url), "utf8");
const themeCss = readFileSync(new URL("../themes/bootstrap.css", import.meta.url), "utf8");

test("core css exposes --dg-* tokens", () => {
    expect(coreCss).toContain("--dg-bg");
    expect(coreCss).toContain("--dg-color");
    expect(coreCss).toContain("--dg-accent");
    expect(coreCss).toContain("--dg-accent-soft");
    expect(coreCss).toContain("--dg-padding-y");
    expect(coreCss).toContain("--dg-padding-x");
    expect(coreCss).toContain("--dg-header-padding-y");
    expect(coreCss).toContain("--dg-radius");
});

test("core css is neutral: no bootstrap refs, no legacy tokens", () => {
    expect(coreCss).not.toMatch(/--bs-/);
    expect(coreCss).not.toMatch(/--padding(?!-)|--body-color|--btn-|--color-rgb/);
});

test("core css ships the density presets", () => {
    expect(coreCss).toMatch(/data-grid\[density=?["']?compact["']?\]/);
    expect(coreCss).toMatch(/data-grid\[density=?["']?comfortable["']?\]/);
});

test("all selects share the component caret", () => {
    expect(coreCss).toMatch(/data-grid select \{[\s\S]*?appearance: none;/);
    expect(coreCss).toMatch(/data-grid \.dg-select-field:after \{[\s\S]*?transform: translateY\(-70%\)rotate\(45deg\)/);
    // Physical LTR reserve, mirrored for [dir="rtl"] in _rtl.css (Bun CSS workaround)
    expect(coreCss).toContain("padding-right: 32px");
    expect(coreCss).toContain('data-grid[dir="rtl"] select');
    expect(coreCss).not.toContain("dg-filter-cell:has(select)");
});

test("multi-select filters use top-layer anchor positioning", () => {
    expect(coreCss).toMatch(/\.dg-multiselect-panel \{[\s\S]*?position: fixed;/);
    expect(coreCss).toMatch(/\.dg-multiselect-panel \{[\s\S]*?position-area: block-end span-inline-end;/);
    expect(coreCss).toMatch(/\.dg-multiselect-panel \{[\s\S]*?position-try-fallbacks:/);
    expect(coreCss).toMatch(/\.dg-filter-control \{[\s\S]*?box-sizing: border-box;/);
});

test("row action menus use top-layer anchor positioning", () => {
    expect(coreCss).toMatch(/\.dg-actions-menu \{[\s\S]*?position: fixed;/);
    expect(coreCss).toMatch(/\.dg-actions-menu \{[\s\S]*?position-area: block-end span-inline-start;/);
    expect(coreCss).toMatch(/\.dg-actions-menu \{[\s\S]*?position-try-fallbacks:/);
});

test("multi-select keyboard focus is drawn on the filter control", () => {
    expect(coreCss).toMatch(/\.dg-multiselect-trigger:focus-visible \{\s*outline: 0;/);
    expect(coreCss).toMatch(
        /\.dg-multiselect:has\(\s*> \.dg-multiselect-trigger:focus-visible\) \{[\s\S]*?box-shadow: inset 0 0 0 2px var\(--dg-focus-ring\);/,
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
