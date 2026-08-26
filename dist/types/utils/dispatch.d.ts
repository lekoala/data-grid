/**
 * Dispatch a CustomEvent on a target with a stable contract for DataGrid events.
 *
 * `detail` is always the 3rd argument; `options` accepts the standard
 * CustomEvent options (`bubbles`, `cancelable`, `composed`). Returns the
 * boolean from `dispatchEvent()`, so a canceled (`cancelable`) event yields
 * `false`.
 *
 * @param {EventTarget} target
 * @param {string} type
 * @param {any} [detail]
 * @param {CustomEventInit} [options]
 * @returns {boolean} `false` when the event was cancelled via `preventDefault()`
 */
export declare function dispatch(target: EventTarget, type: string, detail?: any, options?: CustomEventInit): boolean;
//# sourceMappingURL=dispatch.d.ts.map