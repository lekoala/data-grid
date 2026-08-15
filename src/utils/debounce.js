/**
 * Define a function that can be happily passed to addEventListener
 * @typedef {Function & EventListenerOrEventListenerObject} ExtendedFunction
 */

/**
 * @param {Function} handler
 * @param {Number} timeout
 * @returns {ExtendedFunction}
 */
export default function debounce(handler, timeout = 300) {
    /** @type {ReturnType<typeof setTimeout> | null} */
    let timer = null;
    return (...args) => {
        if (timer !== null) {
            clearTimeout(timer);
        }
        timer = setTimeout(() => {
            timer = null;
            handler(...args);
        }, timeout);
    };
}
