import BasePlugin from "../core/base-plugin.js";
/**
 * Add bulk actions on the current selection.
 * A BulkAction receives the SelectionState and the QueryState, unlike a RowAction
 * which operates on a single row.
 */
declare class BulkActions extends BasePlugin {
    /** @type {HTMLDivElement|null} */
    bar: HTMLDivElement | null;
    /** @type {HTMLSpanElement|null} */
    countEl: HTMLSpanElement | null;
    /** @type {HTMLButtonElement[]|null} */
    buttons: HTMLButtonElement[] | null;
    connected(): void;
    disconnected(): void;
    /**
     * @param {Event} event
     */
    handleEvent(event: Event): void;
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