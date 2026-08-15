import BasePlugin from "../core/base-plugin.js";
/**
 * Create a right click menu on the headers
 */
declare class ContextMenu extends BasePlugin {
    /**
     * @type {HTMLUListElement|null}
     */
    menu: HTMLUListElement | null;
    connected(): void;
    disconnected(): void;
    /**
     * @param {import("../core/base-plugin.js").RenderContext} context
     */
    afterRender(context: import("../core/base-plugin.js").RenderContext): void;
    attachContextMenu(): void;
    onchange(/** @type {Event} */ e: Event): void;
    oncontextmenu(/** @type {MouseEvent} */ e: MouseEvent): void;
    createMenu(): void;
}
export default ContextMenu;
//# sourceMappingURL=context-menu.d.ts.map