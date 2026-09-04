/** @type {WeakMap<Element, String>} */
const generatedIds = new WeakMap();

/**
 * Remember an automatically generated element id without exposing internal
 * state as an attribute or public component property.
 * @param {Element} element
 * @param {String} id
 */
export function markGeneratedId(element, id) {
    generatedIds.set(element, id);
}

/**
 * An authored id is stable across page loads. Replacing an automatically
 * generated id before connection also makes it authored and stable.
 * @param {Element} element
 * @returns {Boolean}
 */
export function hasStableId(element) {
    const id = element.getAttribute("id") ?? "";
    return Boolean(id && generatedIds.get(element) !== id);
}
