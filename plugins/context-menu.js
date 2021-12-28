"use strict";

class DataGridContextMenu {
  static showContextMenu(e, grid) {
    e.preventDefault();

    const target = grid.constructor.getParentNode(e.target, "THEAD");
    const menu = grid.root.querySelector(".dg-menu");
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

    const documentClickHandler = (e) => {
      if (!menu.contains(e.target)) {
        menu.setAttribute("hidden", true);
        document.removeEventListener("click", documentClickHandler);
      }
    };
    document.addEventListener("click", documentClickHandler);
  }

  static createMenu(grid) {
    const menu = grid.root.querySelector(".dg-menu");
    grid.state.columns.forEach((col) => {
      if (col.attr) {
        return;
      }
      const field = col.field;
      const li = document.createElement("li");
      const label = document.createElement("label");
      const checkbox = document.createElement("input");
      checkbox.setAttribute("type", "checkbox");
      if (!col.hidden) {
        checkbox.checked = true;
      }
      checkbox.addEventListener("change", (e) => {
        e.target.checked ? this.showColumn(field, e.target, grid) : this.hideColumn(field, e.target, grid);
      });

      const text = document.createTextNode(col.title);

      label.appendChild(checkbox);
      label.appendChild(text);

      li.appendChild(label);
      menu.appendChild(li);
    });
  }
  static showColumn(field, checkbox = null, grid) {
    if (checkbox) {
      checkbox.checked = true;
    }
    grid.setColProp(field, "hidden", false);
    grid.renderHeader();
  }
  static hideColumn(field, checkbox = null, grid) {
    const numHiddenCols = grid.state.columns.filter((th) => {
      return th.hidden === true;
    }).length;

    if (numHiddenCols === grid.columnsLength() - 1) {
      // Restore checkbox value
      if (checkbox) {
        checkbox.checked = true;
      }
      return;
    }
    grid.setColProp(field, "hidden", true);
    grid.renderHeader();
  }
}

// Register in global scope
window["DataGridContextMenu"] = DataGridContextMenu;

export default DataGridContextMenu;
