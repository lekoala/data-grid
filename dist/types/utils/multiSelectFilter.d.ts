/**
 * Refresh the trigger summary from the checked boxes. With no selection the
 * empty-state text is shown instead. It may intentionally be blank; a custom
 * firstFilterOption can provide a business label such as "All".
 * @param {HTMLElement} root
 */
export declare function updateMultiSelectSummary(root: HTMLElement): void;
/**
 * Build the control for a `filterMultiple` select column. Options are rendered
 * as-is except empty values, which cannot participate in a set (placeholders
 * like "All" are meaningless as checkboxes) but keep their label as the
 * empty-state summary.
 * @param {import("../data-grid.js").Column} column
 * @param {Array<import("../data-source.js").FilterOption>} options
 * @param {HTMLTableCellElement} relatedTh
 * @returns {HTMLDivElement}
 */
export declare function createMultiSelect(column: import("../data-grid.js").Column, options: Array<import("../data-source.js").FilterOption>, relatedTh: HTMLTableCellElement): HTMLDivElement;
/**
 * Checked values, in DOM order.
 * @param {HTMLElement} root
 * @returns {String[]}
 */
export declare function readMultiSelect(root: HTMLElement): string[];
/**
 * Reflect a query value onto the checkboxes and refresh the summary.
 * @param {HTMLElement} root
 * @param {Array<any>} values
 */
export declare function setMultiSelectValues(root: HTMLElement, values: Array<any>): void;
/**
 * Uncheck every box and refresh the summary.
 * @param {HTMLElement} root
 */
export declare function clearMultiSelect(root: HTMLElement): void;
//# sourceMappingURL=multiSelectFilter.d.ts.map