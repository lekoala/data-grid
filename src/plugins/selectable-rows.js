import BasePlugin from "../core/base-plugin.js";
import { dispatch } from "../utils/shortcuts.js";

/**
 * Allows to select rows
 */
class SelectableRows extends BasePlugin {
  static get pluginName() {
    return "SelectableRows";
  }

  /**
   * @param {import("../data-grid").default} grid
   */
  static disconnected(grid) {
    if (grid.selectAll) {
      grid.selectAll.removeEventListener("change", grid.toggleSelectAll);
    }
  }

  /**
   * @param {import("../data-grid").default} grid
   * @param {String} key Return a specific key (eg: id) instead of the whole row
   * @returns {Array}
   */
  static getSelection(grid, key = null) {
    let selectedData = [];

    Array.from(grid.querySelectorAll("tbody .dg-selectable input:checked")).forEach((checkbox) => {
      if (!(checkbox instanceof HTMLElement)) {
        return;
      }
      const idx = parseInt(checkbox.dataset.id);
      const item = grid.data[idx - 1];
      if (!item) {
        console.warn(`Item ${idx} not found`);
      }
      if (key) {
        selectedData.push(item[key]);
      } else {
        selectedData.push(item);
      }
    });
    return selectedData;
  }

  /**
   * Uncheck box if hidden and visible only
   * @param {import("../data-grid").default} grid
   * @param {HTMLTableSectionElement} tbody
   */
  static clearCheckboxes(grid, tbody) {
    if (!grid.options.selectVisibleOnly) {
      return;
    }
    tbody.querySelectorAll("tr[hidden] .dg-selectable input").forEach((input) => {
      if (input instanceof HTMLInputElement) {
        input.checked = false;
      }
    });
  }

  /**
   * @param {import("../data-grid").default} grid
   * @param {HTMLTableRowElement} tr
   */
  static createHeaderCol(grid, tr) {
    let th = document.createElement("th");
    th.setAttribute("scope", "col");
    th.setAttribute("role", "columnheader button");
    th.setAttribute("aria-colindex", "1");
    th.classList.add(...["dg-selectable", "dg-not-resizable", "dg-not-sortable"]);
    th.tabIndex = 0;

    grid.selectAll = document.createElement("input");
    grid.selectAll.type = "checkbox";
    grid.selectAll.classList.add("dg-select-all");

    grid.toggleSelectAll = this.toggleSelectAll.bind(grid);
    grid.selectAll.addEventListener("change", grid.toggleSelectAll);

    let label = document.createElement("label");
    label.appendChild(grid.selectAll);

    th.appendChild(label);

    th.setAttribute("width", "40");
    tr.appendChild(th);
  }

  /**
   * @param {import("../data-grid").default} grid
   * @param {HTMLTableRowElement} tr
   */
  static createFilterCol(grid, tr) {
    let th = document.createElement("th");
    th.setAttribute("role", "columnheader button");
    th.setAttribute("aria-colindex", "1");
    th.classList.add("dg-selectable");
    th.tabIndex = 0;

    let label = document.createElement("label");
    th.appendChild(label);
    tr.appendChild(th);
  }

  /**
   * Handles the selectAll checkbox when any other .dg-selectable checkbox is checked.
   * It should check selectAll if all is checked
   * It should uncheck selectAll if any is unchecked
   * @param {import("../data-grid").default} grid
   * @param {HTMLTableSectionElement} tbody
   */
  static shouldSelectAll(grid, tbody) {
    if (!grid.selectAll) {
      return;
    }
    // Delegate listener for change events on input checkboxes
    tbody.addEventListener("change", (e) => {
      if (e.target instanceof HTMLInputElement) {
        if (!e.target.closest(".dg-selectable")) {
          return;
        }
        const totalCheckboxes = grid.querySelectorAll("tbody .dg-selectable input[type=checkbox]");
        // @ts-ignore
        const totalChecked = Array.from(totalCheckboxes).filter((n) => n.checked);
        grid.selectAll.checked = totalChecked.length == totalCheckboxes.length;

        dispatch(grid, "rowsSelected", {
          selection: grid.getSelection(),
        });
      }
    });
    tbody.dispatchEvent(new Event("change"));
  }

  /**
   * @param {import("../data-grid").default} grid
   * @param {HTMLTableRowElement} tr
   */
  static createDataCol(grid, tr) {
    // Create col
    let td = document.createElement("td");
    td.setAttribute("role", "gridcell button");
    td.setAttribute("aria-colindex", "1");
    td.classList.add("dg-selectable");

    // Create input
    let selectOne = document.createElement("input");
    // Alias row id for easy retrieval in getSelection
    selectOne.dataset.id = tr.getAttribute("aria-rowindex");
    selectOne.type = "checkbox";
    // Label need to take full space thanks to css to make the whole cell clickable
    let label = document.createElement("label");
    label.appendChild(selectOne);
    td.appendChild(label);

    tr.appendChild(td);
  }

  /**
   * Reflect state
   * @this {import("../data-grid").default}
   */
  static toggleSelectAll() {
    const visibleOnly = this.options.selectVisibleOnly;
    this.querySelectorAll("tbody .dg-selectable input").forEach((cb) => {
      if (!(cb instanceof HTMLInputElement)) {
        return;
      }
      if (visibleOnly && !cb.offsetWidth) {
        return;
      }
      cb.checked = this.selectAll.checked;
    });

    dispatch(this, "rowsSelected", {
      selection: this.getSelection(),
    });
  }
}

export default SelectableRows;
