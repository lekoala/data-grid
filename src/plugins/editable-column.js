import BasePlugin from "../core/base-plugin.js";
import { dispatch } from "../utils/shortcuts.js";

/**
 * Make editable inputs in rows
 */
class EditableColumn extends BasePlugin {
  /**
   *
   * @param {HTMLTableCellElement} td
   * @param {import("../data-grid").Column} column
   * @param {Object} item
   * @param {number} i
   */
  makeEditableInput(td, column, item, i) {
    const gridId = this.grid.getAttribute("id");
    let input = document.createElement("input");
    input.type = "text";
    input.autocomplete = "off";
    input.spellcheck = false;
    input.tabIndex = 0;
    input.classList.add("dg-editable");
    input.name = gridId.replace("-", "_") + "[" + (i + 1) + "]" + "[" + column.field + "]";
    input.value = item[column.field];
    input.dataset.field = column.field;

    // Prevent row action
    input.addEventListener("click", (ev) => ev.stopPropagation());
    // Enter validates edit
    input.addEventListener("keypress", (ev) => {
      if (ev.type === "keypress") {
        const key = ev.keyCode || ev.key;
        if (key === 13 || key === "Enter") {
          input.blur();
          ev.preventDefault();
        }
      }
    });
    // Save on blur
    input.addEventListener("blur", () => {
      // Only fire on update
      if (input.value == item[input.dataset.field]) {
        return;
      }
      // Update underlying data
      item[input.dataset.field] = input.value;
      // Notify
      dispatch(this.grid, "edit", {
        data: item,
        value: input.value,
      });
    });
    td.appendChild(input);
  }
}

export default EditableColumn;
