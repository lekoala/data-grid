/**
 * Define a function that can be happily passed to addEventListener
 * @typedef {Function & EventListenerOrEventListenerObject} ExtendedFunction
 */
/**
 * @param {Function} handler
 * @param {Number} timeout
 * @returns {ExtendedFunction}
 */
export default function debounce(handler: Function, timeout?: number): ExtendedFunction;
/**
 * Define a function that can be happily passed to addEventListener
 */
export type ExtendedFunction = Function & EventListenerOrEventListenerObject;
//# sourceMappingURL=debounce.d.ts.map