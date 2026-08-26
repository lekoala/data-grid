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
    }
    disconnected() {
        const grid = this.grid;
        if (grid.headerRow) {
            grid.headerRow.removeEventListener("contextmenu", this);
        }
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
        this.attachContextMenu();
    }

    attachContextMenu() {
        const grid = this.grid;
        if (grid.headerRow) {
            grid.headerRow.addEventListener("contextmenu", this);
        }
    }

    onchange(/** @type {Event} */ e) {
        const grid = this.grid;
        const t = /** @type {HTMLInputElement} */ (e.target);
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

    oncontextmenu(/** @type {MouseEvent} */ e) {
        e.preventDefault();
        const target = /** @type {HTMLElement} */ (e.target).closest("thead");
        const menu = this.menu;
        if (!menu || !target) {
            return;
        }
        const rect = target.getBoundingClientRect();
        let x = e.clientX - rect.left;
        const y = e.clientY - rect.top;

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
        menu.addEventListener("change", this);

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
