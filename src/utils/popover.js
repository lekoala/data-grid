/**
 * Whether the browser can also place a popover with CSS Anchor Positioning.
 * @returns {Boolean}
 */
export function supportsPopoverAnchor() {
    return (
        "popover" in HTMLElement.prototype &&
        typeof CSS !== "undefined" &&
        typeof CSS.supports === "function" &&
        CSS.supports("position-area", "block-end span-inline-start") &&
        CSS.supports("top", "anchor(bottom)") &&
        CSS.supports("min-width", "anchor-size(width)") &&
        CSS.supports("position-try-fallbacks", "flip-block flip-inline")
    );
}
