/**
 * @callback FlexibleListener
 * @param {Event&MouseEvent&InputEvent&DragEvent&FocusEvent&KeyboardEvent&PointerEvent} event
 */

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
 *
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
export function setAttribute(el, name, v, check = false) {
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
 * @param {FlexibleListener} listener
 */
export function on(el, type, listener) {
  el.addEventListener(type, listener, passiveOpts(type));
}

/**
 * @param {EventTarget} el
 * @param {String} type
 * @param {EventListenerOrEventListenerObject&FlexibleListener} listener
 */
export function off(el, type, listener) {
  el.removeEventListener(type, listener, passiveOpts(type));
}

/**
 * @param {EventTarget} el
 * @param {String} type
 * @param {EventListenerOrEventListenerObject&FlexibleListener} listener
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
  el.classList.add(name);
}

/**
 * @param {Element} el
 * @param {String} name
 */
export function removeClass(el, name) {
  el.classList.remove(name);
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
 * @returns {HTMLElement|null}
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
 * @returns {Array<HTMLElement>}
 */
export function $$(selector, base = document) {
  return Array.from(base.querySelectorAll(selector));
}

/**
 * @param {HTMLElement} el
 * @param {String|HTMLElement} selector
 * @returns {any}
 */
export function find(el, selector) {
  return $(selector, el);
}

/**
 * @param {Element} el
 * @param {String} selector
 * @returns {Array<HTMLElement>}
 */
export function findAll(el, selector) {
  return $$(selector, el);
}

/**
 * @param {any} el
 * @returns {HTMLElement}
 */
export function asElement(el) {
  return el instanceof HTMLElement ? el : new HTMLElement();
}

/**
 * @param {any} el
 * @returns {any}
 */
export function asAnyElement(el) {
  return el instanceof HTMLElement ? el : new HTMLElement();
}
