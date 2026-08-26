/**
 * Resolve an action's confirmation request into a message (or `null` when no
 * confirmation is required).
 *
 * `confirm` may be:
 * - falsy -> no confirmation (`null`)
 * - a string -> that message
 * - a function `(subject, context) => string | false` -> a returned string is
 *   used as the message, `false` disables confirmation, anything else keeps the
 *   fallback message
 *
 * @param {string|boolean|Function|undefined} confirm
 * @param {string} fallback
 * @param {any} subject
 * @param {any} context
 * @returns {string|null}
 */
export declare function resolveActionConfirmation(confirm: string | boolean | Function | undefined, fallback: string, subject: any, context: any): string | null;
//# sourceMappingURL=actionConfirm.d.ts.map