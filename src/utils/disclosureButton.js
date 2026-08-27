/**
 * Create the disclosure control shared by the responsive and row details
 * toggle columns: a compact ghost button whose chevron is drawn by CSS.
 * Only the geometry and the icon hook are shared; the state (aria-expanded,
 * aria-label, aria-controls and the plugin `-open` class) stays owned by the
 * calling plugin.
 * @param {String} controlClass - plugin specific class used by its own selectors
 * @returns {HTMLButtonElement}
 */
export function createDisclosureButton(controlClass) {
    const button = document.createElement("button");
    button.type = "button";
    button.className = `dg-disclosure ${controlClass}`;
    return button;
}
