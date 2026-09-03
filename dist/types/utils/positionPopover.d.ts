export type PopoverPositioningOptions = {
    /**
     * CSS selector matching the popover panels to manage.
     */
    selector: string;
    /**
     * Desired placement; flip and shift keep the panel inside the viewport.
     */
    placement: import("@lekoala/floating").Placement;
    /**
     * Match the panel inline size to its trigger, like the former `anchor-size()`.
     */
    matchWidth?: boolean;
};
/**
 * Ensure one delegated popover positioning listener per grid and selector.
 * @param {Element} grid
 * @param {PopoverPositioningOptions} options
 */
export declare function attachPopoverPositioning(grid: Element, { selector, placement, matchWidth }: PopoverPositioningOptions): void;
//# sourceMappingURL=positionPopover.d.ts.map