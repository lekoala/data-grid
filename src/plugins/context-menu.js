import BasePlugin from "../core/base-plugin.js";
import getParentElement from "../utils/getParentElement.js";
import { asAnyElement, find, off, on, removeAttribute, setAttribute } from "../utils/shortcuts.js";

/**
 * Create a right click menu on the headers
 */
class ContextMenu extends BasePlugin {
  disconnected() {
    if (this.grid.headerRow) {
      off(this.grid.headerRow, "oncontextmenu", this);
    }
  }
  attachContextMenu() {
    const grid = this.grid;
    on(grid.headerRow, "contextmenu", this);
  }

  oncontextmenu(e) {
    e.preventDefault();
    const grid = this.grid;
    const target = getParentElement(e.target, "THEAD");
    /**
     * @type {HTMLUListElement}
     */
    const menu = find(grid, ".dg-menu");
    const rect = target.getBoundingClientRect();
    let x = e.clientX - rect.left;
    const y = e.clientY - rect.top;

    menu.style.top = `${y}px`;
    menu.style.left = `${x}px`;

    removeAttribute(menu, "hidden");
    if (x + 150 > rect.width) {
      x -= menu.offsetWidth;
      menu.style.left = `${x}px`;
    }

    const documentClickHandler = (e) => {
      if (!menu.contains(e.target)) {
        setAttribute(menu, "hidden", "");
        off(document, "click", documentClickHandler);
      }
    };
    on(document, "click", documentClickHandler);
  }
  createMenu() {
    const grid = this.grid;
    /**
     * @type {HTMLUListElement}
     */
    const menu = find(grid, ".dg-menu");
    while (menu.lastChild) {
      menu.removeChild(menu.lastChild);
    }
    grid.options.columns.forEach((col) => {
      if (col.attr) {
        return;
      }
      const field = col.field;
      const li = document.createElement("li");
      const label = document.createElement("label");
      const checkbox = document.createElement("input");
      setAttribute(checkbox, "type", "checkbox");
      setAttribute(checkbox, "data-name", col.field);
      if (!col.hidden) {
        checkbox.checked = true;
      }
      on(checkbox, "change", (e) => {
        /**
         * @type {HTMLInputElement}
         */
        const t = asAnyElement(e.target);
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
      });

      const text = document.createTextNode(col.title);

      label.appendChild(checkbox);
      label.appendChild(text);

      li.appendChild(label);
      menu.appendChild(li);
    });
  }
}

export default ContextMenu;
