/**
 * @param {HTMLElement} el
 * @param {String} type
 * @param {String} prop
 * @returns {HTMLElement}
 */
export default function getParentElement(el, type, prop = "nodeName") {
  let parent = el;
  while (parent[prop] != type) {
    parent = parent.parentElement;
  }
  return parent;
}
