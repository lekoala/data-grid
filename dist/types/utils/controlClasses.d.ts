/** @typedef {import("../data-grid.js").ControlClasses} ControlClasses */
export type ControlClasses = import("../data-grid.js").ControlClasses;
/** @param {Partial<ControlClasses>|null} value @returns {Partial<ControlClasses>} */
export declare function normalizeControlClasses(value: Partial<ControlClasses> | null): Partial<ControlClasses>;
/**
 * Apply host classes without replacing structural classes or recreating controls.
 * @param {import("../data-grid.js").default} grid
 * @param {HTMLElement} element
 * @param {keyof ControlClasses} role
 * @param {string} [extra]
 */
export declare function styleControl(grid: import("../data-grid.js").default, element: HTMLElement, role: keyof ControlClasses, extra?: string): void;
/** @param {import("../data-grid.js").default} grid */
export declare function refreshControlClasses(grid: import("../data-grid.js").default): void;
//# sourceMappingURL=controlClasses.d.ts.map