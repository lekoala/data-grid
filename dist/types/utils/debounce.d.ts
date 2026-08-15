/**
 * Define a function that can be happily passed to addEventListener
 * @typedef {Function & EventListenerOrEventListenerObject} ExtendedFunction
 */
export type ExtendedFunction = Function & EventListenerOrEventListenerObject;
/**
 * @param {Function} handler
 * @param {Number} timeout
 * @returns {ExtendedFunction}
 */
export default function debounce(handler: Function, timeout?: number): ExtendedFunction;
//# sourceMappingURL=debounce.d.ts.map