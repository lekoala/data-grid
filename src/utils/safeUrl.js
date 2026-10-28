const UNSAFE_URL_PROTOCOLS = new Set(["data:", "javascript:", "vbscript:"]);

/**
 * Whether a URL is safe to use. Ordinary relative and application URLs pass;
 * protocols that can execute attacker-controlled code are rejected.
 * @param {*} value
 * @param {{allowData?: Boolean}} [options] Allow `data:` (resource attributes
 * such as `img[src]`); navigation attributes keep rejecting it.
 * @returns {Boolean}
 */
export function isSafeUrl(value, { allowData = false } = {}) {
    if (value === null || value === undefined) {
        return false;
    }
    try {
        const protocol = new URL(String(value), document.baseURI).protocol.toLowerCase();
        if (protocol === "data:") {
            return allowData;
        }
        return !UNSAFE_URL_PROTOCOLS.has(protocol);
    } catch {
        return false;
    }
}
