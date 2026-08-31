import BasePlugin from "../core/base-plugin.js";
import { off, on } from "../utils/events.js";

const MENU_EVENTS = ["contextmenu", "change"];

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
        const menu = this.grid.ownerDocument.createElement("ul");
        if (typeof menu.showPopover !== "function") {
            return;
        }
        menu.className = "dg-menu dg-context-menu";
        menu.popover = "auto";
        this.grid.appendChild(menu);
        this.menu = menu;
        on(this.grid, MENU_EVENTS, this);
    }
    disconnected() {
        off(this.grid, MENU_EVENTS, this);
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
     * Only the column-visibility checkboxes inside the menu trigger this: the
     * `change` listener is delegated to the whole grid, so anything else
     * (pager, filters, selection) must be ignored.
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
        grid.fixPage(); //fixes Chrome footer flexbox resize issues that may appear when there is a large number of columns (i.e. more than 10).
    }

    /**
     * @param {MouseEvent} event
     */
    oncontextmenu(event) {
        const menu = this.menu;
        if (!this.grid.options.menu || !menu) {
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
        event.preventDefault();
        const x = event.clientX;
        const y = event.clientY;
        menu.style.left = `${x}px`;
        menu.style.top = `${y}px`;
        menu.showPopover();
        const rect = menu.getBoundingClientRect();
        const viewport = menu.ownerDocument.documentElement;
        menu.style.left = `${Math.min(x, viewport.clientWidth - rect.width)}px`;
        menu.style.top = `${Math.min(y, viewport.clientHeight - rect.height)}px`;
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
