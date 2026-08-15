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
