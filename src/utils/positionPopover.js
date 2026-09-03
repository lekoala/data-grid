import { autoUpdate, reposition } from "@lekoala/floating";

/**
 * Position popover panels while the native Popover keeps owning lifecycle,
 * top-layer rendering, light dismissal, Escape handling and focus restoration.
 * Opening and closing still come from the browser (invoker, outside click); this
 * module only supplies the JS geometry that CSS Anchor Positioning used to
 * provide, so the surface stays aligned with its trigger while the grid or the
 * page scrolls, and flips/shifts back inside the viewport when there is no
 * room. One delegated capture-phase `toggle` listener per grid covers panels
 * rebuilt by filter-row or body rerenders without re-attaching anything. The
 * popover `toggle` event is composed but does not bubble, so the listener is
 * registered on the capture phase to be reached from the grid ancestor.
 *
 * @typedef {Object} PopoverPositioningOptions
 * @property {String} selector CSS selector matching the popover panels to manage.
 * @property {import("@lekoala/floating").Placement} placement Desired placement; flip and shift keep the panel inside the viewport.
 * @property {Boolean} [matchWidth] Match the panel inline size to its trigger, like the former `anchor-size()`.
 */

/**
 * Per-grid positioning state: stop functions for the autoUpdate of every open
 * panel, the delegated `toggle` listeners already attached per selector so
 * repeated attachment calls stay idempotent, and the last invoker clicked per
 * panel id (a shared row-actions menu has one toggle per row and must follow
 * the one that was actually clicked, not the first match in the DOM).
 * @type {WeakMap<Element, { panels: WeakMap<HTMLElement, () => void>, listeners: Map<String, (event: Event) => void>, invokers: Map<String, HTMLElement> }>}
 */
const ACTIVE_STATE = new WeakMap();

/**
 * Ensure one delegated popover positioning listener per grid and selector.
 * @param {Element} grid
 * @param {PopoverPositioningOptions} options
 */
export function attachPopoverPositioning(grid, { selector, placement, matchWidth = false }) {
    let state = ACTIVE_STATE.get(grid);
    if (!state) {
        const created = { panels: new WeakMap(), listeners: new Map(), invokers: new Map() };
        state = created;
        ACTIVE_STATE.set(grid, created);
        grid.addEventListener("click", (event) => {
            if (!(event.target instanceof Element)) {
                return;
            }
            const trigger = event.target.closest("[popovertarget]");
            const panelId = trigger?.getAttribute("popovertarget");
            if (panelId) {
                created.invokers.set(panelId, trigger);
            }
        });
    }
    if (state.listeners.has(selector)) {
        return;
    }

    /**
     * @param {Event & { newState?: "open" | "closed" }} event
     */
    const listener = (event) => {
        const panel = event.target;
        if (!(panel instanceof HTMLElement) || !panel.matches(selector)) {
            return;
        }
        if (event.newState !== "open") {
            const stop = state.panels.get(panel);
            if (stop) {
                stop();
                state.panels.delete(panel);
            }
            return;
        }
        if (!panel.isConnected) {
            return;
        }
        const trigger = state.invokers.get(panel.id) ?? grid.querySelector(`[popovertarget="${panel.id}"]`);
        if (!trigger?.isConnected) {
            return;
        }
        const update = () => {
            // A rebuilt filter row or a removed panel may have dropped both the
            // trigger and the panel while the popover was open.
            if (!panel.isConnected || !trigger.isConnected) {
                state.panels.get(panel)?.();
                return true;
            }
            if (matchWidth) {
                panel.style.inlineSize = `${trigger.getBoundingClientRect().width}px`;
            }
            return reposition(trigger, panel, { placement, distance: 0, flip: true, shift: true });
        };
        if (update()) {
            state.panels.set(panel, autoUpdate(trigger, panel, update));
        }
    };
    grid.addEventListener("toggle", listener, true);
    state.listeners.set(selector, listener);
}
