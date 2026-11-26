import BasePlugin from "../core/base-plugin.js";
/**
 * Create a right click menu on the headers
 */
declare class ContextMenu extends BasePlugin {
    /** @type {HTMLUListElement|null} */
    menu: HTMLUListElement | null;
    /**
     * @param {import("../data-grid.js").default} grid
     */
    constructor(grid: import("../data-grid.js").default);
    connected(): void;
    disconnected(): void;
    /**
     * @param {import("../core/base-plugin.js").RenderContext} context
     */
    afterRender(context: import("../core/base-plugin.js").RenderContext): void;
    /**
     * Handle column-visibility checkboxes in the menu.
     * @param {Event} event
     */
    onchange(event: Event): void;
    /**
     * @param {MouseEvent} event
     */
    oncontextmenu(event: MouseEvent): void;
    createMenu(): void;
}
export default ContextMenu;
//# sourceMappingURL=context-menu.d.ts.map