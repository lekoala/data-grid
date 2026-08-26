/**
 * Disclosure lifecycle shared by menu-like popovers: show a panel, maintain
 * aria-expanded on its trigger, and dismiss on outside click or Escape.
 * Positioning and content stay consumer concerns.
 *
 * Every listener attaches to the panel's own document, so the helper also
 * works across documents and each dismissal path funnels through the returned
 * cleanup function. The caller owns that handle: it must invoke it on
 * rerender/disconnect so a detached panel never leaks its listeners.
 */

/**
 * Open a popover panel and return its close function.
 * @param {Object} options
 * @param {Element} options.root - clicks inside this element never dismiss the panel
 * @param {HTMLElement|null} [options.trigger] - disclosure button carrying aria-expanded
 * @param {HTMLElement} options.panel - the element toggled through the hidden attribute
 * @returns {() => void} cleanup - closes the panel and detaches the listeners
 */
export function openMenu({ root, trigger = null, panel }) {
    const doc = panel.ownerDocument;

    /**
     * @param {Boolean} restoreFocus
     */
    function close(restoreFocus) {
        doc.removeEventListener("click", onDocClick);
        doc.removeEventListener("keydown", onDocKeydown);
        panel.hidden = true;
        trigger?.setAttribute("aria-expanded", "false");
        // Focus returns to the trigger on explicit dismissal only: an outside
        // click already moved focus somewhere intentional.
        if (restoreFocus && trigger?.isConnected) {
            trigger.focus();
        }
    }

    /**
     * @param {MouseEvent} ev
     */
    function onDocClick(ev) {
        if (!root.contains(/** @type {Node} */ (ev.target))) {
            close(false);
        }
    }

    /**
     * @param {KeyboardEvent} ev
     */
    function onDocKeydown(ev) {
        if (ev.key === "Escape") {
            ev.preventDefault();
            close(true);
        }
    }

    panel.hidden = false;
    trigger?.setAttribute("aria-expanded", "true");
    doc.addEventListener("click", onDocClick);
    doc.addEventListener("keydown", onDocKeydown);
    return () => close(false);
}
