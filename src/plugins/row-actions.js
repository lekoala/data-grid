import BasePlugin from "../core/base-plugin.js";
import applyContent from "../utils/applyContent.js";
import interpolate from "../utils/interpolate.js";
import { dispatch, findAll, off, on } from "../utils/shortcuts.js";

/**
 * Add actions on rows
 */
class RowActions extends BasePlugin {
    /**
     * @param {import("../data-grid.js").default} grid
     */
    constructor(grid) {
        super(grid);
        /** @type {HTMLUListElement|null} */
        this.menu = null;
        /** @type {HTMLElement|null} */
        this.openCell = null;
        /** @type {((e: MouseEvent) => void) | null} */
        this._boundDocumentClick = null;
        /** @type {((e: KeyboardEvent) => void) | null} */
        this._boundKeydown = null;
    }

    disconnected() {
        this.closeActionMenu();
    }

    /**
     * Whether the actions column is active: static `options.actions`, the
     * `rowActions` capability or a declarative `<th data-actions>`.
     * @returns {Boolean}
     */
    hasActions() {
        const grid = this.grid;
        return grid.options.actions.length > 0 || grid.options.rowActions;
    }

    /**
     * Inject the actions column at the end.
     * @param {import("../data-grid.js").Column[]} columns
     */
    extendColumns(columns) {
        if (!this.hasActions()) {
            return;
        }
        columns.push({
            id: "$actions",
            virtual: true,
            position: "end",
            sortable: false,
            title: "",
            class: "dg-actions",
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
     * Close the popover on any full table render and keep the per-row
     * collapsed mode in sync with the resolved actions.
     * @param {import("../core/base-plugin.js").RenderContext} context
     */
    afterRender(context) {
        // The actions column mode depends on the actions resolved in the body,
        // which is only known after the rows render. The header is created on a
        // separate render pass (renderTable), so the mode must be applied on
        // both passes: body cells and the header/filter must share it.
        this.syncCellModes();
        if (context === "table") {
            this.closeActionMenu();
        }
    }

    /**
     * The collapsed vs inline mode is a property of the whole column, not of
     * individual cells: within one table column every row must share the same
     * geometry (header, filter and body cells alike), otherwise a fixed-layout
     * table constrains the column to one width while cells assume another,
     * creating artificial overflow.
     *
     * The mode derives from the widest set of inline actions on the current
     * page: if every row fits 1-2 inline actions the column sizes to its
     * intrinsic inline width, otherwise it collapses to the compact `more`
     * cell (the fixed structural width).
     */
    syncCellModes() {
        const grid = this.grid;
        const collapse = grid.options.collapseActions;
        let maxCount = 0;
        for (const row of grid.rows ?? []) {
            let count = 0;
            const actions = grid.getActionsForRow(row);
            const rowKey = grid.resolveRowKey(row);
            for (const action of actions) {
                if (action.visible && !action.visible(row, { grid, action, rowKey })) {
                    continue;
                }
                count++;
            }
            if (count > maxCount) {
                maxCount = count;
            }
        }
        let mode = "dg-actions-more";
        if (maxCount > 0 && !collapse && maxCount <= 2) {
            mode = `dg-actions-${maxCount}`;
        }
        const cells = findAll(grid, '[data-column-id="$actions"]');
        for (const cell of cells) {
            cell.classList.remove("dg-actions-0", "dg-actions-1", "dg-actions-2", "dg-actions-more");
            cell.classList.add(mode);
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
        const rowIndex = grid.rows.indexOf(row);
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
        const rowKey = grid.resolveRowKey(row, rowIndex);
        for (const action of grid.getActionsForRow(row)) {
            if (action.visible && !action.visible(row, { grid, action, rowKey })) {
                continue;
            }
            const li = document.createElement("li");
            const { el } = this.createActionElement(action, row, rowIndex, grid, labels, true);
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
     * Position the menu inside the grid, anchored to the toggle rather than
     * the whole cell. This matters when another cell makes the row unusually
     * tall. Flip up or to the left when the toggle sits close to an edge.
     * The menu stays inside the grid bounds so the grid scroll container never
     * clips it.
     * @param {HTMLElement} cell
     */
    positionActionMenu(cell) {
        const menu = this.menu;
        const grid = this.grid;
        if (!menu) {
            return;
        }
        const gridRect = grid.getBoundingClientRect();
        const toggle = /** @type {HTMLElement|null} */ (cell.querySelector(".dg-actions-toggle"));
        const anchorRect = (toggle ?? cell).getBoundingClientRect();
        const menuHeight = menu.offsetHeight;
        const menuWidth = menu.offsetWidth;
        let top = anchorRect.bottom - gridRect.top;
        if (top + menuHeight > gridRect.height) {
            top = anchorRect.top - gridRect.top - menuHeight;
        }
        menu.style.top = `${Math.max(0, top)}px`;
        let right = gridRect.right - anchorRect.right;
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
     * Build the actions cell content: a toggle button plus one element per
     * resolved action. A row without actions gets an empty cell.
     * @param {import("../data-grid.js").CellContext} ctx
     * @returns {DocumentFragment}
     */
    makeActionRow({ row, tr, grid, rowIndex }) {
        const labels = grid.labels;
        const rowData = row ?? {};
        const actions = grid.getActionsForRow(rowData);
        const fragment = document.createDocumentFragment();
        if (!actions.length) {
            return fragment;
        }

        // Add menu toggle
        const actionsToggle = document.createElement("button");
        actionsToggle.type = "button";
        actionsToggle.classList.add("dg-actions-toggle");
        actionsToggle.textContent = "⋯";
        actionsToggle.setAttribute("aria-label", labels.toggleActions);
        actionsToggle.setAttribute("aria-expanded", "false");
        actionsToggle.title = labels.toggleActions;
        on(actionsToggle, "click", (/** @type {MouseEvent} */ ev) => {
            ev.stopPropagation();
            const cell = /** @type {HTMLElement} */ (actionsToggle.closest("td") ?? actionsToggle.parentElement);
            if (cell) {
                this.toggleActionMenu(cell, rowData);
            }
        });
        fragment.appendChild(actionsToggle);

        let defaultApplied = false;
        const rowKey = grid.resolveRowKey(rowData, rowIndex ?? 0);
        for (const action of actions) {
            if (action.visible && !action.visible(rowData, { grid, action, rowKey })) {
                continue;
            }
            const { el } = this.createActionElement(action, rowData, rowIndex ?? 0, grid, labels);
            fragment.appendChild(el);

            // Default row action: only the first resolved default applies. The
            // rendered element is marked so the core can activate it on a row
            // click; the row interaction itself is delegated by the core.
            if (action.default) {
                if (defaultApplied) {
                    grid.log(`multiple default actions for row ${rowKey}, using the first one`);
                } else {
                    defaultApplied = true;
                    el.dataset.dgDefaultAction = "";
                    // The cursor must not promise an unavailable interaction: a
                    // disabled default keeps its marker (activation stays uniform)
                    // but the row is not presented as clickable.
                    if (grid.options.rowClick === "action" && tr && el.getAttribute("aria-disabled") !== "true") {
                        tr.classList.add("dg-clickable-row");
                    }
                }
            }
        }

        return fragment;
    }

    /**
     * Activate the rendered default action of a data row: the element marked
     * with `data-dg-default-action` at render time is clicked, so href
     * navigation, confirmation, disabled state and the `action` event all behave
     * exactly as if the control itself was clicked.
     * @param {Number} rowIndex
     */
    activateDefaultAction(rowIndex) {
        const tr = this.grid.tbody?.querySelector(`tr.dg-data-row[data-row-index="${rowIndex}"]`);
        const action = tr?.querySelector("[data-dg-default-action]");
        if (action instanceof HTMLElement) {
            action.click();
        }
    }

    /**
     * Create the button (or link) for a single action.
     * @param {import("../data-grid.js").Action} action
     * @param {Record<string, any>} row
     * @param {Number} rowIndex
     * @param {import("../data-grid.js").default} grid
     * @param {import("../data-grid.js").Labels} labels
     * @param {Boolean} [menu] Render for the collapsed menu: keep the icon but
     * add a visible label next to it.
     * @returns {{ el: HTMLElement, dispatchAction: (ev: Event) => void }}
     */
    createActionElement(action, row, rowIndex, grid, labels, menu = false) {
        const rowKey = grid.resolveRowKey(row, rowIndex);
        const ctx = { grid, action, rowKey };
        const href = action.href
            ? typeof action.href === "function"
                ? action.href(row, ctx)
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
                applyContent(el, content);
                if (menu) {
                    // In the collapsed menu the custom content (often an icon)
                    // is kept, with the label shown next to it.
                    const label = document.createElement("span");
                    label.className = "dg-action-label";
                    label.textContent = action.label ?? action.name;
                    el.append(label);
                } else if (content instanceof Node || (typeof content === "object" && content.html !== undefined)) {
                    // Custom content (Node or { html }) may be icon-only: keep the
                    // label as the accessible name of the element RowActions creates.
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
            el.classList.add(...action.class.trim().split(/\s+/));
        }

        // Disabled actions must really block: a native `disabled` on buttons,
        // `aria-disabled` on any element, a class hook and a guarded click.
        const isDisabled = typeof action.disabled === "function" ? action.disabled(row, ctx) : Boolean(action.disabled);
        if (isDisabled) {
            if (el.tagName === "BUTTON") {
                /** @type {HTMLButtonElement} */ (el).disabled = true;
            }
            el.setAttribute("aria-disabled", "true");
            el.classList.add("dg-disabled");
        }

        // Confirmation: boolean, message string or a resolver.
        let mustConfirm = Boolean(action.confirm);
        let message = labels.areYouSure;
        if (typeof action.confirm === "string") {
            message = action.confirm;
        } else if (typeof action.confirm === "function") {
            const result = action.confirm(row, ctx);
            if (typeof result === "string") {
                message = result;
            } else if (result === false) {
                mustConfirm = false;
            }
        }

        const dispatchAction = (/** @type {Event} */ ev) => {
            ev.stopPropagation();
            if (isDisabled) {
                ev.preventDefault();
                return;
            }
            if (mustConfirm && !window.confirm(message)) {
                ev.preventDefault();
                return;
            }
            dispatch(grid, "action", {
                action,
                name: action.name,
                row,
                rowKey,
                rowIndex,
                trigger: el,
            });
        };
        el.addEventListener("click", dispatchAction);

        return { el, dispatchAction };
    }
}

export default RowActions;
