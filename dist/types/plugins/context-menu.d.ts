export default ContextMenu;
/**
 * Create a right click menu on the headers
 */
declare class ContextMenu extends BasePlugin {
    /**
     * @type {HTMLUListElement|null}
     */
    menu: HTMLUListElement | null | undefined;
    attachContextMenu(): void;
    onchange(e: Event): void;
    oncontextmenu(e: MouseEvent): void;
    createMenu(): void;
}
import BasePlugin from "../core/base-plugin.js";
//# sourceMappingURL=context-menu.d.ts.map