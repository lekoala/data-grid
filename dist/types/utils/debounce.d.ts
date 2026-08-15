/**
 * A debounced function with cancel/flush control. Callable like the wrapped
 * handler and safe to pass to addEventListener.
 * @typedef {((...args: any[]) => void) & { cancel: () => void, flush: () => void }} DebouncedFunction
 */
export type DebouncedFunction = ((...args: any[]) => void) & {
    cancel: () => void;
    flush: () => void;
};
/**
 * Debounce a function. The returned function also exposes `cancel()` (drop a
 * pending invocation) and `flush()` (run a pending invocation immediately),
 * which are safe to call when nothing is pending.
 * @param {Function} handler
 * @param {Number} timeout
 * @returns {DebouncedFunction}
 */
export default function debounce(handler: Function, timeout?: number): DebouncedFunction;
//# sourceMappingURL=debounce.d.ts.map