import BasePlugin from "../core/base-plugin.js";
import getParentElement from "../utils/getParentElement.js";
import { dispatch, findAll, getAttribute, on, setAttribute } from "../utils/shortcuts.js";

/**
 * Allows to move headers
 */
class DraggableHeaders extends BasePlugin {
  /**
   * @param {HTMLTableCellElement} th
   */
  makeHeaderDraggable(th) {
    const grid = this.grid;
    th.draggable = true;
    on(th, "dragstart", (e) => {
      if (grid.plugins.ColumnResizer && grid.plugins.ColumnResizer.isResizing && e.preventDefault) {
        e.preventDefault();
        return;
      }
      grid.log("reorder col");
      e.dataTransfer.effectAllowed = "move";
      e.dataTransfer.setData("text/plain", e.target.getAttribute("aria-colindex"));
    });
    on(th, "dragover", (e) => {
      if (e.preventDefault) {
        e.preventDefault();
      }
      e.dataTransfer.dropEffect = "move";
      return false;
    });
    on(th, "drop", (e) => {
      if (e.stopPropagation) {
        e.stopPropagation();
      }
      const t = e.target;
      const target = getParentElement(t, "TH");
      const index = parseInt(e.dataTransfer.getData("text/plain"));
      const targetIndex = parseInt(target.getAttribute("aria-colindex"));

      if (index === targetIndex) {
        grid.log("reordered col stayed the same");
        return;
      }
      grid.log("reordered col from " + index + " to " + targetIndex);

      const offset = grid.startColIndex();
      const tmp = grid.options.columns[index - offset];
      grid.options.columns[index - offset] = grid.options.columns[targetIndex - offset];
      grid.options.columns[targetIndex - offset] = tmp;

      const swapNodes = (selector, el1) => {
        const rowIndex = el1.parentNode.getAttribute("aria-rowindex");
        const el2 = grid.querySelector(selector + " tr[aria-rowindex='" + rowIndex + "'] [aria-colindex='" + targetIndex + "']");
        setAttribute(el1, "aria-colindex", targetIndex);
        setAttribute(el2, "aria-colindex", index);
        const newNode = document.createElement("th");
        el1.parentNode.insertBefore(newNode, el1);
        el2.parentNode.replaceChild(el1, el2);
        newNode.parentNode.replaceChild(el2, newNode);
      };

      // Swap all rows in header and body
      findAll(grid, "thead th[aria-colindex='" + index + "']").forEach((el1) => {
        swapNodes("thead", el1);
      });
      findAll(grid, 'tbody td[aria-colindex="' + index + '"]').forEach((el1) => {
        swapNodes("tbody", el1);
      });

      // Updates the columns
      grid.options.columns = findAll(grid, "thead tr.dg-head-columns th[field]").map((th) =>
        grid.options.columns.find((c) => c.field == getAttribute(th, "field"))
      );

      dispatch(grid, "columnReordered", {
        col: tmp.field,
        from: index,
        to: targetIndex,
      });
      return false;
    });
  }
}

export default DraggableHeaders;
