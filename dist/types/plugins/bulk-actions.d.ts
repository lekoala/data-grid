import BasePlugin from "../core/base-plugin.js";
/**
 * Add bulk actions on the current selection.
 * A BulkAction receives the SelectionState and the QueryState, unlike a RowAction
 * which operates on a single row.
 */
declare class BulkActions extends BasePlugin {
    #private;
    /** @type {HTMLDivElement|null} */
    bar: HTMLDivElement | null;
    /** @type {HTMLSpanElement|null} */
    countEl: HTMLSpanElement | null;
    /** @type {HTMLSpanElement|null} */
    countVisible: HTMLSpanElement | null;
    /** @type {HTMLSpanElement|null} */
    countStatus: HTMLSpanElement | null;
    /** @type {HTMLButtonElement[]|null} */
    buttons: HTMLButtonElement[] | null;
    /** @type {HTMLDivElement|null} Floating display only: the sticky layer holding the bar. */
    layer: HTMLDivElement | null;
    /** @type {ResizeObserver|null} */
    observer: ResizeObserver | null;
    /** @type {MutationObserver|null} Floating display only: follows load start and end. */
    loadingObserver: MutationObserver | null;
    /** @type {HTMLButtonElement|null} Floating display only: extends a full page to every match. */
    matchingButton: HTMLButtonElement | null;
    /** @type {HTMLButtonElement|null} Floating display only. */
    clearButton: HTMLButtonElement | null;
    /** @type {HTMLInputElement|null} The row checkbox last toggled, the preferred focus return. */
    lastToggle: HTMLInputElement | null;
    /** Rendered rows predate the current query until the next body render. */
    staleRows: boolean;
    /**
     * @param {import("../data-grid.js").default} grid
     */
    constructor(grid: import("../data-grid.js").default);
    connected(): void;
    disconnected(): void;
    onselectionChange(): void;
    onquerychange(): void;
    /**
     * Remember the row checkbox the user last toggled: when the bar hides, focus
     * returns there instead of jumping to the header.
     * @param {Event} event
     */
    onchange(event: Event): void;
    /**
     * @param {import("../core/base-plugin.js").RenderContext} context
     */
    afterRender(context: import("../core/base-plugin.js").RenderContext): void;
    updateLabels(): void;
    /**
     * Reflect the current selection on the toolbar state.
     */
    render(): void;
}
export default BulkActions;
//# sourceMappingURL=bulk-actions.d.ts.map