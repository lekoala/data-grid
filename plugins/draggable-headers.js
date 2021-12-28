"use strict";

class DataGridDraggableHeaders {
  static makeHeaderDraggable(th, grid) {
    th.draggable = true;
    th.addEventListener("dragstart", (e) => {
      if (grid.isResizing && e.preventDefault) {
        e.preventDefault();
        return;
      }
      grid.log("reorder col");
      e.dataTransfer.effectAllowed = "move";
      e.dataTransfer.setData("text/plain", e.target.getAttribute("aria-colindex"));
    });
    th.addEventListener("dragover", (e) => {
      if (e.preventDefault) {
        e.preventDefault();
      }
      e.dataTransfer.dropEffect = "move";
      return false;
    });
    th.addEventListener("drop", (e) => {
      if (e.stopPropagation) {
        e.stopPropagation();
      }
      const target = grid.constructor.getParentNode(e.target, "TH");
      const index = e.dataTransfer.getData("text/plain");
      const targetIndex = target.getAttribute("aria-colindex");

      if (index === targetIndex) {
        grid.log("reordered col stayed the same");
        return;
      }
      grid.log("reordered col from " + index + " to " + targetIndex);

      const tmp = grid.state.columns[index - 1];
      grid.state.columns[index - 1] = grid.columns[targetIndex - 1];
      grid.state.columns[targetIndex - 1] = tmp;

      const swapNodes = (selector, el1) => {
        const rowIndex = el1.parentNode.getAttribute("aria-rowindex");
        const el2 = grid.root.querySelector(selector + " tr[aria-rowindex='" + rowIndex + "'] [aria-colindex='" + targetIndex + "']");
        el1.setAttribute("aria-colindex", targetIndex);
        el2.setAttribute("aria-colindex", index);
        const newNode = document.createElement("th");
        el1.parentNode.insertBefore(newNode, el1);
        el2.parentNode.replaceChild(el1, el2);
        newNode.parentNode.replaceChild(el2, newNode);
      };

      // Swap all rows in header and body
      grid.root.querySelectorAll("thead th[aria-colindex='" + index + "']").forEach((el1) => {
        swapNodes("thead", el1);
      });
      grid.root.querySelectorAll('tbody td[aria-colindex="' + index + '"]').forEach((el1) => {
        swapNodes("tbody", el1);
      });

      return false;
    });
  }
}

// Register in global scope
window["DataGridDraggableHeaders"] = DataGridDraggableHeaders;

export default DataGridDraggableHeaders;
