/**
 * @typedef FlexibleHTMLProps
 * @property {boolean} [checked] (HTMLInputElement)
 * @property {string} [value] (HTMLInputElement)
 * @property {number} [rowHeight] (HTMLTableRowElement)
 *
 * A flexible type HTMLElement type that does not require using instanceof all over the place
 * Make sure that your selector is indeed valid
 * Only includes most commons props
 * @typedef {HTMLElement & FlexibleHTMLProps} FlexibleHTMLElement
 */

/**
 * Keep this as reference for easy documentation
 * @typedef {HTMLElement&HTMLInputElement&HTMLTableRowElement} MixedHTMLElement
 */

/**
 * @typedef FlexibleEventProps
 * @property {FlexibleHTMLElement} target
 * @property {FlexibleHTMLElement} currentTarget
 * @property {DataTransfer} [dataTransfer] (DragEvent)
 * @property {number} [clientX] (MouseEvent)
 * @property {number} [clientY] (MouseEvent)
 *
 * @typedef {Event & FlexibleEventProps} FlexibleEvent
 */

/**
 * Keep this as reference for easy documentation
 * @typedef {Event&MouseEvent&InputEvent&DragEvent&FocusEvent&KeyboardEvent&PointerEvent} MixedEvent
 */

/**
 * @callback FlexibleListener
 * @param {FlexibleEvent} event
 */

class FlexibleEventListenerObject {
  /**
   * @param {FlexibleEvent} e
   */
  handleEvent(e) {}
}

const supportedPassiveTypes = [
  "scroll",
  "wheel",
  "touchstart",
  "touchmove",
  "touchenter",
  "touchend",
  "touchleave",
  "mouseout",
  "mouseleave",
  "mouseup",
  "mousedown",
  "mousemove",
  "mouseenter",
  "mousewheel",
  "mouseover",
];

/**
 * Automatically set passive options based on type
 * @param {string} type
 * @returns {AddEventListenerOptions}
 */
function passiveOpts(type) {
  if (supportedPassiveTypes.includes(type)) {
    return { passive: true };
  }
  return {};
}

/**
 * @param {Element} el
 * @param {String} name
 * @returns {any}
 */
export function getAttribute(el, name) {
  return el.getAttribute(name);
}

/**
 * @param {Element} el
 * @param {String} name
 * @returns {Boolean}
 */
export function hasAttribute(el, name) {
  return el.hasAttribute(name);
}

/**
 * @param {Element} el
 * @param {String} name
 * @param {any} v
 * @param {Boolean} check Prevent setting if attribute is already there
 */
export function setAttribute(el, name, v = "", check = false) {
  if (check && hasAttribute(el, name)) return;
  el.setAttribute(name, "" + v);
}

/**
 * @param {Element} el
 * @param {String} name
 */
export function removeAttribute(el, name) {
  if (hasAttribute(el, name)) {
    el.removeAttribute(name);
  }
}

/**
 * @param {EventTarget} el
 * @param {String} type
 * @param {EventListenerObject|FlexibleListener} listener
 */
export function on(el, type, listener) {
  el.addEventListener(type, listener, passiveOpts(type));
}

/**
 * @param {EventTarget} el
 * @param {String} type
 * @param {EventListenerObject|FlexibleListener} listener
 */
export function off(el, type, listener) {
  el.removeEventListener(type, listener, passiveOpts(type));
}

/**
 * @param {EventTarget} el
 * @param {String} type
 * @param {EventListenerObject|FlexibleListener} listener
 */
export function one(el, type, listener) {
  el.addEventListener(type, listener, {
    once: true,
  });
}

/**
 * @param {HTMLElement} el
 * @param {String} name
 * @param {any} data
 * @param {Boolean} bubbles
 */
export function dispatch(el, name, data = {}, bubbles = false) {
  let opts = {};
  if (bubbles) {
    opts.bubbles = true;
  }
  if (data) {
    opts.detail = data;
  }
  el.dispatchEvent(new CustomEvent(name, opts));
}

/**
 * @param {Element} el
 * @param {String} name
 * @returns {Boolean}
 */
export function hasClass(el, name) {
  return el.classList.contains(name);
}

/**
 * @param {Element} el
 * @param {String} name
 */
export function addClass(el, name) {
  el.classList.add(...name.split(" "));
}

/**
 * @param {Element} el
 * @param {String} name
 */
export function removeClass(el, name) {
  el.classList.remove(...name.split(" "));
}

/**
 * @param {Element} el
 * @param {String} name
 */
export function toggleClass(el, name) {
  el.classList.toggle(name);
}

/**
 * @param {String|HTMLElement} selector
 * @param {HTMLElement|Document} base
 * @returns {FlexibleHTMLElement|null}
 */
export function $(selector, base = document) {
  if (selector instanceof HTMLElement) {
    return selector;
  }
  return base.querySelector(selector);
}

/**
 * @param {String} selector
 * @param {Element|Document} base
 * @returns {Array<FlexibleHTMLElement>}
 */
export function $$(selector, base = document) {
  return Array.from(base.querySelectorAll(selector));
}

/**
 * Easily retrieve untyped element
 * For actual type, prefer use of el.querySelector
 * @param {HTMLElement} el
 * @param {String|HTMLElement} selector
 * @returns {FlexibleHTMLElement}
 */
export function find(el, selector) {
  return $(selector, el);
}

/**
 * Easily retrieve untyped elements
 * For actual type, prefer use of el.querySelectorAll
 * @param {Element} el
 * @param {String} selector
 * @returns {Array<FlexibleHTMLElement>}
 */
export function findAll(el, selector) {
  return $$(selector, el);
}

/**
 * @param {*} el
 * @returns {FlexibleHTMLElement}
 */
export function el(el) {
  return el;
}

/**
 * @param {string} tagName
 * @param {HTMLElement} parent
 * @returns {FlexibleHTMLElement}
 */
export function ce(tagName, parent = null) {
  const el = document.createElement(tagName);
  if (parent) {
    parent.appendChild(el);
  }
  return el;
}

/**
 * @param {HTMLElement} newNode
 * @param {HTMLElement} existingNode
 */
export function insertAfter(newNode, existingNode) {
  existingNode.parentNode.insertBefore(newNode, existingNode.nextSibling);
}
