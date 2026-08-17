/**
 * A debounced function with cancel/flush control. Callable like the wrapped
 * handler and safe to pass to addEventListener.
 * @typedef {((...args: any[]) => void) & { cancel: () => void, flush: () => void }} DebouncedFunction
 */

/**
 * Debounce a function. The returned function also exposes `cancel()` (drop a
 * pending invocation) and `flush()` (run a pending invocation immediately),
 * which are safe to call when nothing is pending.
 * @param {Function} handler
 * @param {Number} timeout
 * @returns {DebouncedFunction}
 */
export default function debounce(handler, timeout = 300) {
    /** @type {ReturnType<typeof setTimeout> | null} */
    let timer = null;
    /** @type {any[]|null} */
    let lastArgs = null;
    /** @type {DebouncedFunction} */
    const fn = (...args) => {
        lastArgs = args;
        if (timer !== null) {
            clearTimeout(timer);
        }
        timer = setTimeout(() => {
            timer = null;
            lastArgs = null;
            handler(...args);
        }, timeout);
    };
    /** Cancel a pending invocation. */
    fn.cancel = () => {
        if (timer !== null) {
            clearTimeout(timer);
            timer = null;
        }
        lastArgs = null;
    };
    /** Cancel a pending invocation and run the handler immediately. */
    fn.flush = () => {
        if (timer === null) {
            return;
        }
        clearTimeout(timer);
        timer = null;
        const args = lastArgs ?? [];
        lastArgs = null;
        handler(...args);
    };
    return fn;
}
