import { repositionAt } from "@lekoala/floating";
import BasePlugin from "../core/base-plugin.js";
import { styleControl } from "../utils/controlClasses.js";

/**
 * Create a right click menu on the headers
 */
class ContextMenu extends BasePlugin {
    /**
     * @param {import("../data-grid.js").default} grid
     */
    constructor(grid) {
        super(grid);
        /** @type {HTMLUListElement|null} */
        this.menu = null;
    }

    connected() {
        if (typeof HTMLElement.prototype.showPopover === "function") {
            this.grid.addEventListener("contextmenu", this);
        }
    }

    disconnected() {
        this.grid.removeEventListener("contextmenu", this);
        this.menu?.remove();
        this.menu = null;
    }

    /**
     * @param {import("../core/base-plugin.js").RenderContext} context
     */
    afterRender(context) {
        if (context !== "table" || !this.menu) {
            return;
        }
        this.createMenu();
    }

    /**
     * Handle column-visibility checkboxes in the menu.
     * @param {Event} event
     */
    onchange(event) {
        const target = event.target;
        if (!(target instanceof Element) || !this.grid.ownsControl(target)) {
            return;
        }
        const t = /** @type {HTMLInputElement|null} */ (target.closest(".dg-menu input[data-name]"));
        if (!t) {
            return;
        }
        const grid = this.grid;
        const field = t.dataset.name;
        if (!field) {
            return;
        }
        if (t.checked) {
            grid.showColumn(field);
        } else {
            // Prevent hidding last
            if (grid.visibleColumns().length <= 1) {
                // Restore checkbox value
                t.checked = true;
                return;
            }
            grid.hideColumn(field);
        }
    }

    /**
     * @param {MouseEvent} event
     */
    oncontextmenu(event) {
        if (!this.grid.options.menu) {
            return;
        }
        const target = event.target;
        if (!(target instanceof Element) || !this.grid.ownsControl(target)) {
            return;
        }
        const header = target.closest("thead th");
        if (!header) {
            return;
        }
        if (!this.menu) {
            const menu = this.grid.ownerDocument.createElement("ul");
            menu.className = "dg-menu dg-context-menu";
            menu.popover = "auto";
            menu.addEventListener("change", this);
            this.grid.appendChild(menu);
            this.menu = menu;
            this.createMenu();
        }
        const menu = this.menu;
        event.preventDefault();
        menu.showPopover();
        // Show first: the positioning engine refuses to measure a hidden
        // surface. Then open down-right from the pointer, flipping above when
        // there is no room below, and let shifting clamp it inside the
        // viewport. `--available-height` caps the menu height so it scrolls
        // instead of overflowing.
        repositionAt(event.clientX, event.clientY, menu, {
            placement: "bottom-start",
            distance: 0,
            shift: true,
            shiftPadding: 0,
        });
    }

    createMenu() {
        const grid = this.grid;
        const menu = this.menu;
        if (!menu) {
            return;
        }
        menu.replaceChildren();

        for (const col of grid.options.columns) {
            if (col.attr) {
                continue;
            }
            const li = document.createElement("li");
            const label = document.createElement("label");
            const checkbox = document.createElement("input");
            checkbox.setAttribute("type", "checkbox");
            checkbox.setAttribute("data-name", col.field ?? "");
            styleControl(grid, checkbox, "check");
            if (!col.hidden) {
                checkbox.checked = true;
            }
            const text = document.createTextNode(col.title ?? "");

            label.appendChild(checkbox);
            label.appendChild(text);

            li.appendChild(label);
            menu.appendChild(li);
        }
    }
}

export default ContextMenu;
