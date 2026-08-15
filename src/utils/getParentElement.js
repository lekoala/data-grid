/**
 * @param {HTMLElement} el
 * @param {String} type
 * @param {String} prop
 * @returns {HTMLElement}
 */
export default function getParentElement(el, type, prop = "nodeName") {
    /** @type {HTMLElement | null} */
    let parent = el;
    while (parent && Reflect.get(parent, prop) !== type) {
        parent = parent.parentElement;
    }
    return /** @type {HTMLElement} */ (parent);
}
