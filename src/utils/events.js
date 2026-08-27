/**
 * Add the same listener for several event types.
 * @param {EventTarget} target
 * @param {String[]} types
 * @param {EventListenerOrEventListenerObject} listener
 * @param {Boolean|AddEventListenerOptions} [options]
 */
export function on(target, types, listener, options) {
    for (const type of types) {
        target.addEventListener(type, listener, options);
    }
}

/**
 * Remove the same listener for several event types.
 * @param {EventTarget} target
 * @param {String[]} types
 * @param {EventListenerOrEventListenerObject} listener
 * @param {Boolean|EventListenerOptions} [options]
 */
export function off(target, types, listener, options) {
    for (const type of types) {
        target.removeEventListener(type, listener, options);
    }
}
