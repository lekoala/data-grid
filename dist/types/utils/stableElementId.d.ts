/**
 * Remember an automatically generated element id without exposing internal
 * state as an attribute or public component property.
 * @param {Element} element
 * @param {String} id
 */
export declare function markGeneratedId(element: Element, id: string): void;
/**
 * An authored id is stable across page loads. Replacing an automatically
 * generated id before connection also makes it authored and stable.
 * @param {Element} element
 * @returns {Boolean}
 */
export declare function hasStableId(element: Element): boolean;
//# sourceMappingURL=stableElementId.d.ts.map