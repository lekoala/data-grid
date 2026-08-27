/**
 * Add the same listener for several event types.
 * @param {EventTarget} target
 * @param {String[]} types
 * @param {EventListenerOrEventListenerObject} listener
 * @param {Boolean|AddEventListenerOptions} [options]
 */
export declare function on(target: EventTarget, types: string[], listener: EventListenerOrEventListenerObject, options?: boolean | AddEventListenerOptions): void;
/**
 * Remove the same listener for several event types.
 * @param {EventTarget} target
 * @param {String[]} types
 * @param {EventListenerOrEventListenerObject} listener
 * @param {Boolean|EventListenerOptions} [options]
 */
export declare function off(target: EventTarget, types: string[], listener: EventListenerOrEventListenerObject, options?: boolean | EventListenerOptions): void;
//# sourceMappingURL=events.d.ts.map