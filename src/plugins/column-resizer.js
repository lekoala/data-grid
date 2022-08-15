"use strict";

import elementOffset from "../utils/elementOffset.js";

class DataGridColumnResizer {
  static renderResizer(grid, resizeLabel) {
    const table = grid.root.querySelector("table");
    const cols = grid.root.querySelectorAll("thead tr.dg-head-columns th");

    cols.forEach((col) => {
      if (col.classList.contains("dg-selectable") || col.classList.contains("dg-actions")) {
        return;
      }
      // Create a resizer element
      const resizer = document.createElement("div");
      resizer.classList.add("dg-resizer");
      resizer.ariaLabel = resizeLabel;

      // Add a resizer element to the column
      col.appendChild(resizer);

      // Handle resizing
      let startX = 0;
      let startW = 0;
      let remainingSpace = 0;
      let max = 0;

      const mouseMoveHandler = (e) => {
        if (e.clientX > max) {
          return;
        }
        const newWidth = startW + (e.clientX - startX);
        if (col.dataset.minWidth && newWidth > col.dataset.minWidth) {
          col.width = newWidth;
        }
      };

      // When user releases the mouse, remove the existing event listeners
      const mouseUpHandler = () => {
        grid.log("resized column");

        grid.isResizing = false;
        resizer.classList.remove("dg-resizer-active");
        if (grid.state.reorder) {
          col.draggable = true;
        }
        col.style.overflow = "hidden";

        document.removeEventListener("mousemove", mouseMoveHandler);
        document.removeEventListener("mouseup", mouseUpHandler);
      };

      // Otherwise it could sort the col
      resizer.addEventListener("click", (e) => {
        e.stopPropagation();
      });

      resizer.addEventListener("mousedown", (e) => {
        e.stopPropagation();
        grid.isResizing = true;

        const currentCols = grid.root.querySelectorAll(".dg-head-columns th");
        const visibleCols = Array.from(currentCols).filter((col) => {
          return !col.hasAttribute("hidden");
        });
        const columns = Array.from(visibleCols);
        const columnIndex = columns.findIndex((column) => column == e.target.parentNode);
        grid.log("resize column");

        resizer.classList.add("dg-resizer-active");

        // Make sure we don't drag it
        if (col.hasAttribute("draggable")) {
          col.removeAttribute("draggable");
        }

        // Allow overflow when resizing
        col.style.overflow = "visible";

        // Show full column height (-1 to avoid scrollbar)
        resizer.style.height = table.offsetHeight - 1 + "px";

        // Register initial data
        startX = e.clientX;
        startW = col.offsetWidth;

        remainingSpace = (visibleCols.length - columnIndex) * 30;
        max = elementOffset(e.target).left + grid.offsetWidth - remainingSpace;

        // Remove width from next columns to allow auto layout
        col.setAttribute("width", startW);
        for (let j = 0; j < visibleCols.length; j++) {
          if (j > columnIndex) {
            cols[j].removeAttribute("width");
          }
        }

        // Attach handlers
        document.addEventListener("mousemove", mouseMoveHandler);
        document.addEventListener("mouseup", mouseUpHandler);
      });
    });
  }
}

export default DataGridColumnResizer;
