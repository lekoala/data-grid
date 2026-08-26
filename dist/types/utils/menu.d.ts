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
export declare function openMenu({ root, trigger, panel }: {
    root: Element;
    trigger?: HTMLElement | null;
    panel: HTMLElement;
}): () => void;
//# sourceMappingURL=menu.d.ts.map