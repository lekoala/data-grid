/**
 * Create the disclosure control shared by the responsive and row details
 * toggle columns: a compact ghost button holding the chevron pictogram.
 * Only the geometry and the icon are shared; the state (aria-expanded,
 * aria-label, aria-controls and the plugin `-open` class) stays owned by the
 * calling plugin.
 * @param {String} controlClass - plugin specific class used by its own selectors
 * @returns {HTMLButtonElement}
 */
export function createDisclosureButton(controlClass) {
    const button = document.createElement("button");
    button.type = "button";
    button.className = `dg-disclosure ${controlClass}`;
    button.innerHTML = `<svg aria-hidden="true" viewBox="0 0 24 24" width="24" height="24"><path d="m9 6 6 6-6 6" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/></svg>`;
    return button;
}
