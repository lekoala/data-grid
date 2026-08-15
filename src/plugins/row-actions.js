import BasePlugin from "../core/base-plugin.js";
import interpolate from "../utils/interpolate.js";
import { dispatch, findAll, off, on } from "../utils/shortcuts.js";

/**
 * Add actions on rows
 */
class RowActions extends BasePlugin {
    /**
     * @returns {Boolean}
     */
    hasActions() {
        return this.grid.options.actions.length > 0;
    }

    /**
     * Inject the actions column at the end.
     * @param {import("../data-grid.js").Column[]} columns
     */
    extendColumns(columns) {
        if (!this.grid.options.actions.length) {
            return;
        }
        columns.push({
            id: "$actions",
            virtual: true,
            position: "end",
            noSort: true,
            title: "",
            class: `dg-actions ${this.actionClass}`,
            renderHeaderCell: (th) => this.createHeaderCell(th),
            renderFilterCell: () => this.createFilterCell(),
            renderCell: (ctx) => this.makeActionRow(/** @type {import("../data-grid.js").CellContext} */ (ctx)),
        });
    }

    /**
     * @param {HTMLTableCellElement} th
     */
    createHeaderCell(th) {
        th.classList.add("dg-not-sortable", "dg-not-resizable");
    }

    createFilterCell() {}

    updateLabels() {
        const toggleLabel = this.grid.labels.toggleActions;
        const toggles = findAll(this.grid, ".dg-actions-toggle");
        for (const toggle of toggles) {
            toggle.setAttribute("aria-label", toggleLabel);
            toggle.setAttribute("title", toggleLabel);
        }
    }

    /**
     * Close the popover on any full table render.
     * @param {import("../core/base-plugin.js").RenderContext} context
     */
    afterRender(context) {
        if (context === "table") {
            this.closeActionMenu();
        }
    }

    /**
     * Toggle the popover menu for a collapsed actions cell.
     * @param {HTMLElement} cell
     * @param {Record<string, any>} row
     */
    toggleActionMenu(cell, row) {
        if (this.openCell === cell) {
            this.closeActionMenu();
            return;
        }
        this.openActionMenu(cell, row);
    }

    /**
     * Open (and fill) the popover menu anchored to the given actions cell.
     * @param {HTMLElement} cell
     * @param {Record<string, any>} row
     */
    openActionMenu(cell, row) {
        const grid = this.grid;
        const labels = grid.labels;
        if (!this.menu) {
            this.menu = document.createElement("ul");
            this.menu.classList.add("dg-actions-menu");
            grid.appendChild(this.menu);
            // Capture: close even when an action handler stops propagation.
            this.menu.addEventListener("click", () => this.closeActionMenu(), true);
        }
        const menu = this.menu;
        while (menu.lastChild) {
            menu.removeChild(menu.lastChild);
        }
        for (const action of grid.options.actions) {
            if (action.visible && !action.visible(row)) {
                continue;
            }
            const li = document.createElement("li");
            const { el } = this.createActionElement(action, row, grid, labels);
            li.appendChild(el);
            menu.appendChild(li);
        }
        if (!menu.lastChild) {
            return;
        }
        this.openCell = cell;
        cell.querySelector(".dg-actions-toggle")?.setAttribute("aria-expanded", "true");
        menu.classList.add("dg-actions-open");
        this.positionActionMenu(cell);
        this._boundDocumentClick = (/** @type {MouseEvent} */ ev) => {
            if (!menu.contains(/** @type {Node} */ (ev.target))) {
                this.closeActionMenu();
            }
        };
        on(document, "click", this._boundDocumentClick);
        this._boundKeydown = (/** @type {KeyboardEvent} */ ev) => {
            if (ev.key === "Escape") {
                this.closeActionMenu();
            }
        };
        on(document, "keydown", this._boundKeydown);
    }

    /**
     * Position the menu inside the grid, flipping up or to the left when the
     * cell sits close to an edge. The menu stays inside the grid bounds so the
     * grid scroll container never clips it.
     * @param {HTMLElement} cell
     */
    positionActionMenu(cell) {
        const menu = this.menu;
        const grid = this.grid;
        if (!menu) {
            return;
        }
        const gridRect = grid.getBoundingClientRect();
        const cellRect = cell.getBoundingClientRect();
        const menuHeight = menu.offsetHeight;
        const menuWidth = menu.offsetWidth;
        let top = cellRect.bottom - gridRect.top;
        if (top + menuHeight > gridRect.height) {
            top = cellRect.top - gridRect.top - menuHeight;
        }
        menu.style.top = `${Math.max(0, top)}px`;
        let right = gridRect.right - cellRect.right;
        if (right + menuWidth > gridRect.width) {
            right = gridRect.width - menuWidth;
        }
        menu.style.right = `${Math.max(0, right)}px`;
        menu.style.left = "auto";
    }

    /**
     * Close and reset the popover menu.
     */
    closeActionMenu() {
        if (this._boundDocumentClick) {
            off(document, "click", this._boundDocumentClick);
            this._boundDocumentClick = null;
        }
        if (this._boundKeydown) {
            off(document, "keydown", this._boundKeydown);
            this._boundKeydown = null;
        }
        if (this.openCell) {
            this.openCell.querySelector(".dg-actions-toggle")?.setAttribute("aria-expanded", "false");
        }
        this.openCell = null;
        this.menu?.classList.remove("dg-actions-open");
    }

    /**
     * Build the actions cell content: a toggle button plus one element per action.
     * @param {import("../data-grid.js").CellContext} ctx
     * @returns {DocumentFragment}
     */
    makeActionRow({ row, tr, grid }) {
        const labels = grid.labels;
        const rowData = row ?? {};
        const fragment = document.createDocumentFragment();

        // Add menu toggle
        const actionsToggle = document.createElement("button");
        actionsToggle.type = "button";
        actionsToggle.classList.add("dg-actions-toggle");
        actionsToggle.textContent = "⋯";
        actionsToggle.setAttribute("aria-label", labels.toggleActions);
        actionsToggle.setAttribute("aria-expanded", "false");
        actionsToggle.setAttribute("aria-haspopup", "menu");
        actionsToggle.title = labels.toggleActions;
        on(actionsToggle, "click", (/** @type {MouseEvent} */ ev) => {
            ev.stopPropagation();
            const cell = /** @type {HTMLElement} */ (actionsToggle.closest("td") ?? actionsToggle.parentElement);
            if (cell) {
                this.toggleActionMenu(cell, rowData);
            }
        });
        fragment.appendChild(actionsToggle);

        for (const action of grid.options.actions) {
            if (action.visible && !action.visible(rowData)) {
                continue;
            }
            const { el, dispatchAction } = this.createActionElement(action, rowData, grid, labels);
            fragment.appendChild(el);

            // Row action
            if (action.default && tr) {
                tr.classList.add("dg-actionable");
                on(tr, "click", dispatchAction);
            }
        }

        return fragment;
    }

    /**
     * Create the button (or link) for a single action.
     * @param {import("../data-grid.js").Action} action
     * @param {Record<string, any>} row
     * @param {import("../data-grid.js").default} grid
     * @param {import("../data-grid.js").Labels} labels
     * @returns {{ el: HTMLElement, dispatchAction: (ev: Event) => void }}
     */
    createActionElement(action, row, grid, labels) {
        const href = action.href
            ? typeof action.href === "function"
                ? action.href(row)
                : interpolate(action.href, row)
            : null;

        // Custom renderer (per-action first, then global)
        const render = action.render ?? grid.options.actionRenderer;
        const content = render ? render({ action, row, grid }) : null;

        /** @type {HTMLElement} */
        let el;
        if (content instanceof Element && (content.tagName === "BUTTON" || content.tagName === "A")) {
            el = /** @type {HTMLElement} */ (content);
        } else {
            const isLink = href !== null;
            el = document.createElement(isLink ? "a" : "button");
            if (!isLink) {
                /** @type {HTMLButtonElement} */ (el).type = "button";
            }
            if (content === null || content === undefined) {
                el.textContent = action.label ?? action.name;
            } else {
                this.applyContent(el, content);
                // Custom content (Node or { html }) may be icon-only: keep the
                // label as the accessible name of the element RowActions creates.
                if (content instanceof Node || (typeof content === "object" && content.html !== undefined)) {
                    el.setAttribute("aria-label", action.label ?? action.name);
                }
            }
        }

        if (href !== null && !el.hasAttribute("href")) {
            /** @type {HTMLAnchorElement} */ (el).href = href;
        }
        el.dataset.action = action.name;
        if (action.intent) {
            el.dataset.intent = action.intent;
            el.classList.add(`dg-intent-${action.intent}`);
        }
        if (action.class) {
            el.classList.add(...action.class.split(" "));
        }
        if (action.disabled?.(row)) {
            /** @type {HTMLButtonElement} */ (el).disabled = true;
        }

        const dispatchAction = (/** @type {Event} */ ev) => {
            ev.stopPropagation();
            if (action.confirm) {
                const c = confirm(labels.areYouSure);
                if (!c) {
                    ev.preventDefault();
                    return;
                }
            }
            dispatch(grid, "action", {
                data: row,
                action: action.name,
            });
        };
        el.addEventListener("click", dispatchAction);

        return { el, dispatchAction };
    }

    /**
     * Apply renderer content to an element (same contract as renderCell).
     * @param {HTMLElement} el
     * @param {*} content
     */
    applyContent(el, content) {
        if (content instanceof Node) {
            el.appendChild(content);
        } else if (typeof content === "object" && content.html !== undefined) {
            el.innerHTML = content.html;
        } else {
            el.textContent = content;
        }
    }

    get actionClass() {
        if (this.grid.options.actions.length < 3 && !this.grid.options.collapseActions) {
            return `dg-actions-${this.grid.options.actions.length}`;
        }
        return "dg-actions-more";
    }
}

export default RowActions;
