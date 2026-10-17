/** @typedef {import("../data-grid.js").ControlClasses} ControlClasses */

/** Normalize class tokens at the API boundary; classes are applied through classList. */
/** @param {unknown} value @returns {string[]} */
function tokens(value) {
    return typeof value === "string"
        ? [...new Set(value.trim().split(/\s+/).filter(Boolean))].filter((token) => token !== "dg-skin")
        : [];
}

/** @param {Partial<ControlClasses>|null} value @returns {Partial<ControlClasses>} */
export function normalizeControlClasses(value) {
    const result = /** @type {Partial<ControlClasses>} */ ({});
    for (const role of /** @type {const} */ (["button", "action", "input", "select"])) {
        if (value && Object.hasOwn(value, role)) result[role] = tokens(value[role]).join(" ");
    }
    return result;
}

/** @type {WeakMap<HTMLElement, {role: keyof ControlClasses, extra: string, applied: string[]}>} */
const controls = new WeakMap();

/**
 * Apply host classes without replacing structural classes or recreating controls.
 * @param {import("../data-grid.js").default} grid
 * @param {HTMLElement} element
 * @param {keyof ControlClasses} role
 * @param {string} [extra]
 */
export function styleControl(grid, element, role, extra = "") {
    const previous = controls.get(element);
    if (previous) for (const token of previous.applied) element.classList.remove(token);
    const structural = new Set(element.classList);
    const classes = tokens(`${grid.controlClasses[role]} ${extra}`);
    element.classList.toggle("dg-skin", classes.length === 0);
    element.classList.add(...classes);
    element.dataset.dgControl = role;
    controls.set(element, { role, extra, applied: classes.filter((token) => !structural.has(token)) });
    if (element.matches(".dg-search")) {
        element.parentElement?.classList.toggle("dg-host-input", classes.length > 0);
    }
    if (element.matches(".dg-select-per-page")) {
        element.parentElement?.classList.toggle("dg-host-select", classes.length > 0);
    }
}

/** @param {import("../data-grid.js").default} grid */
export function refreshControlClasses(grid) {
    for (const element of grid.querySelectorAll("[data-dg-control]")) {
        if (!(element instanceof HTMLElement) || !grid.ownsControl(element)) continue;
        const state = controls.get(element);
        if (state) styleControl(grid, element, state.role, state.extra);
    }
}
