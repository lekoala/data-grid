/**
 * Whether a URL is safe to use. Ordinary relative and application URLs pass;
 * protocols that can execute attacker-controlled code are rejected.
 * @param {*} value
 * @param {{allowData?: Boolean}} [options] Allow `data:` (resource attributes
 * such as `img[src]`); navigation attributes keep rejecting it.
 * @returns {Boolean}
 */
export declare function isSafeUrl(value: any, { allowData }?: {
    allowData?: boolean;
}): boolean;
//# sourceMappingURL=safeUrl.d.ts.map