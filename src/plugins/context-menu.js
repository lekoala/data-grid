import BasePlugin from "../core/base-plugin.js";

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
        /** @type {((e: MouseEvent) => void) | null} */
        this._docClickHandler = null;
    }
    connected() {
        /**
         * @type {HTMLUListElement|null}
         */
        this.menu = this.grid.querySelector(".dg-menu");
        this.grid.addEventListener("contextmenu", this);
        this.grid.addEventListener("change", this);
    }
    disconnected() {
        this.grid.removeEventListener("contextmenu", this);
        this.grid.removeEventListener("change", this);
        if (this._docClickHandler) {
            document.removeEventListener("click", this._docClickHandler);
            this._docClickHandler = null;
        }
    }

    /**
     * @param {import("../core/base-plugin.js").RenderContext} context
     */
    afterRender(context) {
        if (context !== "table") {
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
        if (!(target instanceof Element) || !this.grid._ownsControl(target)) {
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
        const target = event.target;
        if (!(target instanceof Element) || !this.grid._ownsControl(target)) {
            return;
        }
        const header = target.closest("thead");
        if (!header) {
            return;
        }
        event.preventDefault();
        const menu = this.menu;
        if (!menu) {
            return;
        }
        const rect = header.getBoundingClientRect();
        let x = event.clientX - rect.left;
        const y = event.clientY - rect.top;

        menu.style.top = `${y}px`;
        menu.style.left = `${x}px`;

        menu.removeAttribute("hidden");
        if (x + 150 > rect.width) {
            x -= menu.offsetWidth;
            menu.style.left = `${x}px`;
        }

        const documentClickHandler = (/** @type {MouseEvent} */ ev) => {
            if (!menu.contains(/** @type {Node} */ (ev.target))) {
                menu.setAttribute("hidden", "");
                document.removeEventListener("click", documentClickHandler);
                this._docClickHandler = null;
            }
        };
        this._docClickHandler = documentClickHandler;
        document.addEventListener("click", documentClickHandler);
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
