import BasePlugin from "../core/base-plugin.js";
import { dispatch } from "../utils/dispatch.js";
import elementOffset from "../utils/elementOffset.js";

/**
 * Allows to resize columns
 */
class ColumnResizer extends BasePlugin {
    /**
     * @param {import("../data-grid.js").default} grid
     */
    constructor(grid) {
        super(grid);
        /** @type {AbortController|null} */
        this._resizeController = null;
    }

    connected() {
        this.grid.addEventListener("mousedown", this);
        this.grid.addEventListener("click", this);
    }

    disconnected() {
        this.grid.removeEventListener("mousedown", this);
        this.grid.removeEventListener("click", this);
        this._resizeController?.abort();
        this._resizeController = null;
    }

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
        const resizers = this.grid.querySelectorAll(".dg-resizer");
        for (const resizer of resizers) {
            resizer.ariaLabel = resizeLabel;
        }
    }

    /**
     * @param {String} resizeLabel
     */
    renderResizer(resizeLabel) {
        const cols = /** @type {NodeListOf<HTMLTableCellElement>} */ (
            this.grid.querySelectorAll("thead tr.dg-head-columns th")
        );

        for (const col of cols) {
            if (col.classList.contains("dg-not-resizable")) {
                continue;
            }
            // Create a resizer element
            const resizer = document.createElement("div");
            resizer.classList.add("dg-resizer");
            resizer.ariaLabel = resizeLabel;

            // Add a resizer element to the column
            col.appendChild(resizer);
        }
    }

    /**
     * @param {MouseEvent} event
     */
    onclick(event) {
        const target = event.target;
        if (!(target instanceof Element) || !this.grid._ownsControl(target)) {
            return;
        }
        // Otherwise it could sort the col
        if (target.closest(".dg-resizer")) {
            event.stopPropagation();
        }
    }

    /**
     * @param {MouseEvent} event
     */
    onmousedown(event) {
        const target = event.target;
        if (!(target instanceof Element) || !this.grid._ownsControl(target)) {
            return;
        }
        const resizer = /** @type {HTMLElement|null} */ (target.closest(".dg-resizer"));
        if (!resizer) {
            return;
        }
        event.preventDefault();
        event.stopPropagation();

        const grid = this.grid;
        const table = grid.table;
        const col = /** @type {HTMLTableCellElement|null} */ (resizer.closest("th"));
        if (!table || !col) {
            return;
        }

        const currentCols = [...grid.querySelectorAll("thead tr.dg-head-columns th")];
        const visibleCols = currentCols.filter((col) => {
            return !col.hasAttribute("hidden");
        });
        // biome-ignore lint/complexity/useIndexOf: indexOf requires an Element arg; closest returns a broader Node
        const columnIndex = visibleCols.findIndex((col) => col === resizer.parentNode);
        grid.log("resize column");

        resizer.classList.add("dg-resizer-active");

        // Make sure we don't drag it
        col.removeAttribute("draggable");

        // Allow overflow when resizing
        col.style.overflow = "visible";

        // Show full column height (-1 to avoid scrollbar)
        resizer.style.height = `${table.offsetHeight - 1}px`;

        // Register initial data
        const startX = event.clientX;
        const startW = col.offsetWidth;

        const remainingSpace = (visibleCols.length - columnIndex) * 30;
        const max = elementOffset(resizer).left + grid.offsetWidth - remainingSpace;

        // Remove width from next columns to allow auto layout
        col.setAttribute("width", String(startW));
        for (let j = 0; j < visibleCols.length; j++) {
            if (j > columnIndex) {
                visibleCols[j].removeAttribute("width");
            }
        }

        // Abort any previous resize gesture (e.g. a disconnect mid-drag)
        this._resizeController?.abort();
        this._resizeController = new AbortController();
        const { signal } = this._resizeController;

        const mouseMoveHandler = (/** @type {MouseEvent} */ e) => {
            if (e.clientX > max) {
                return;
            }
            const newWidth = startW + (e.clientX - startX);
            if (col.dataset.minWidth && newWidth > Number.parseInt(col.dataset.minWidth)) {
                col.setAttribute("width", String(newWidth));
            }
        };

        // When user releases the mouse, remove the existing event listeners
        const mouseUpHandler = () => {
            grid.log("resized column");

            resizer.classList.remove("dg-resizer-active");
            if (grid.options.reorder) {
                col.draggable = true;
            }
            col.style.overflow = "hidden";

            this._resizeController?.abort();
            this._resizeController = null;

            dispatch(grid, "columnResized", {
                col: col.getAttribute("field"),
                width: col.getAttribute("width"),
            });
        };

        document.addEventListener("mousemove", mouseMoveHandler, { signal });
        document.addEventListener("mouseup", mouseUpHandler, { signal, once: true });
    }
}

export default ColumnResizer;
