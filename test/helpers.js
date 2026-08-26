/**
 * Semantic user-interaction helpers. They always bubble, like a real user
 * interaction, so delegated listeners on the grid receive them.
 */

/**
 * Dispatch a bubbling `change` on an element. Callers set the element state
 * (checked, value) first, as a real checkbox, select or radio interaction
 * would.
 * @param {HTMLElement} el
 */
export function change(el) {
    el.dispatchEvent(new Event("change", { bubbles: true }));
}

/**
 * Set the value and dispatch a bubbling `input`, like typing in a text
 * control.
 * @param {HTMLInputElement} el
 * @param {String} value
 */
export function input(el, value) {
    el.value = value;
    el.dispatchEvent(new Event("input", { bubbles: true }));
}
