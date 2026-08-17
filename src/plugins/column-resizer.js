import BasePlugin from "../core/base-plugin.js";
import elementOffset from "../utils/elementOffset.js";
import {
    addClass,
    dispatch,
    findAll,
    getAttribute,
    hasClass,
    off,
    on,
    removeAttribute,
    removeClass,
    setAttribute,
} from "../utils/shortcuts.js";

/**
 * Allows to resize columns
 */
class ColumnResizer extends BasePlugin {
    /**
     * @param {import("../core/base-plugin.js").RenderContext} context
     */
    afterRender(context) {
        if (context !== "table") {
            return;
        }
        this.renderResizer(this.grid.labels.resizeColumn);
    }

    updateLabels() {
        const resizeLabel = this.grid.labels.resizeColumn;
        const resizers = findAll(this.grid, ".dg-resizer");
        for (const resizer of resizers) {
            resizer.ariaLabel = resizeLabel;
        }
    }

    /**
     * @param {String} resizeLabel
     */
    renderResizer(resizeLabel) {
        const grid = this.grid;
        const table = grid.table;
        if (!table) {
            return;
        }
        const cols = findAll(grid, "thead tr.dg-head-columns th");

        for (const col of cols) {
            if (hasClass(col, "dg-not-resizable")) {
                continue;
            }
            // Create a resizer element
            const resizer = document.createElement("div");
            addClass(resizer, "dg-resizer");
            resizer.ariaLabel = resizeLabel;

            // Add a resizer element to the column
            col.appendChild(resizer);

            // Handle resizing
            let startX = 0;
            let startW = 0;
            let remainingSpace = 0;
            let max = 0;

            const mouseMoveHandler = (/** @type {MouseEvent} */ e) => {
                if (e.clientX > max) {
                    return;
                }
                const newWidth = startW + (e.clientX - startX);
                if (col.dataset.minWidth && newWidth > Number.parseInt(col.dataset.minWidth)) {
                    setAttribute(col, "width", newWidth);
                }
            };

            // When user releases the mouse, remove the existing event listeners
            const mouseUpHandler = () => {
                grid.log("resized column");

                removeClass(resizer, "dg-resizer-active");
                if (grid.options.reorder) {
                    col.draggable = true;
                }
                col.style.overflow = "hidden";

                // Remove handlers
                off(document, "mousemove", mouseMoveHandler);
                off(document, "mouseup", mouseUpHandler);

                dispatch(grid, "columnResized", {
                    col: getAttribute(col, "field"),
                    width: getAttribute(col, "width"),
                });
            };

            // Otherwise it could sort the col
            on(resizer, "click", (/** @type {MouseEvent} */ e) => {
                e.stopPropagation();
            });

            on(resizer, "mousedown", (/** @type {MouseEvent} */ e) => {
                e.preventDefault();
                e.stopPropagation();

                const target = /** @type {HTMLElement} */ (e.target);
                const currentCols = findAll(grid, "thead tr.dg-head-columns th");
                const visibleCols = currentCols.filter((col) => {
                    return !col.hasAttribute("hidden");
                });
                // biome-ignore lint/complexity/useIndexOf: indexOf requires a FlexibleHTMLElement arg; target.parentNode is a broader ParentNode
                const columnIndex = visibleCols.findIndex((col) => col === target.parentNode);
                grid.log("resize column");

                addClass(resizer, "dg-resizer-active");

                // Make sure we don't drag it
                removeAttribute(col, "draggable");

                // Allow overflow when resizing
                col.style.overflow = "visible";

                // Show full column height (-1 to avoid scrollbar)
                resizer.style.height = `${table.offsetHeight - 1}px`;

                // Register initial data
                startX = e.clientX;
                startW = col.offsetWidth;

                remainingSpace = (visibleCols.length - columnIndex) * 30;
                max = elementOffset(target).left + grid.offsetWidth - remainingSpace;

                // Remove width from next columns to allow auto layout
                setAttribute(col, "width", startW);
                for (let j = 0; j < visibleCols.length; j++) {
                    if (j > columnIndex) {
                        removeAttribute(visibleCols[j], "width");
                    }
                }

                // Attach handlers
                on(document, "mousemove", mouseMoveHandler);
                on(document, "mouseup", mouseUpHandler);
            });
        }
    }
}

export default ColumnResizer;
