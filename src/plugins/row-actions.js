import BasePlugin from "../core/base-plugin.js";
import interpolate from "../utils/interpolate.js";
import { dispatch, on } from "../utils/shortcuts.js";

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
            renderCell: (ctx) => this.makeActionRow(ctx),
        });
    }

    /**
     * @param {HTMLTableCellElement} th
     */
    createHeaderCell(th) {
        th.classList.add("dg-not-sortable", "dg-not-resizable");
    }

    createFilterCell() {}

    /**
     * Build the actions cell content: a toggle button plus one element per action.
     * @param {Object} ctx
     * @returns {DocumentFragment}
     */
    makeActionRow({ row, tr, grid }) {
        const labels = grid.labels;
        const fragment = document.createDocumentFragment();

        // Add menu toggle
        const actionsToggle = document.createElement("button");
        actionsToggle.type = "button";
        actionsToggle.classList.add("dg-actions-toggle");
        actionsToggle.innerHTML = "☰";
        on(actionsToggle, "click", (ev) => {
            ev.stopPropagation();
            ev.target.parentElement.classList.toggle("dg-actions-expand");
        });
        fragment.appendChild(actionsToggle);

        for (const action of grid.options.actions) {
            if (action.visible && !action.visible(row)) {
                continue;
            }
            const { el, dispatchAction } = this.createActionElement(action, row, grid, labels);
            fragment.appendChild(el);

            // Row action
            if (action.default) {
                tr.classList.add("dg-actionable");
                on(tr, "click", dispatchAction);
            }
        }

        return fragment;
    }

    /**
     * Create the button (or link) for a single action.
     * @param {import("../data-grid.js").Action} action
     * @param {Object} row
     * @param {import("../data-grid.js").default} grid
     * @param {Object} labels
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
            // @ts-expect-error narrowed to HTMLButtonElement | HTMLAnchorElement
            el = content;
        } else {
            const isLink = href !== null;
            el = document.createElement(isLink ? "a" : "button");
            if (!isLink) {
                // @ts-expect-error button only
                el.type = "button";
            }
            if (content === null || content === undefined) {
                if (action.html) {
                    el.innerHTML = action.html;
                } else {
                    el.textContent = action.label ?? action.title ?? action.name;
                }
            } else {
                this.applyContent(el, content);
            }
        }

        if (href !== null && !el.hasAttribute("href")) {
            // @ts-expect-error anchor only
            el.href = href;
        }
        el.dataset.action = action.name;
        if (action.intent) {
            el.dataset.intent = action.intent;
            el.classList.add(`dg-intent-${action.intent}`);
        }
        if (action.title) {
            el.title = action.title;
        }
        if (action.class) {
            el.classList.add(...action.class.split(" "));
        }
        if (action.disabled?.(row)) {
            // @ts-expect-error button/link only
            el.disabled = true;
        }

        const dispatchAction = (ev) => {
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
