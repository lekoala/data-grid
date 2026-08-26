/**
 * Parse a declarative boolean attribute value. A bare attribute (empty string),
 * "true" or "1" means true; "false" and "0" mean false.
 * @param {string} value
 * @returns {boolean}
 */
export function parseBooleanAttribute(value) {
    return value === "" || value === "true" || value === "1";
}

/**
 * Parse a comma-separated list of integers, dropping invalid entries.
 * @param {string} value
 * @returns {number[]}
 */
export function parseIntegerListAttribute(value) {
    return value
        .split(",")
        .map((item) => Number.parseInt(item, 10))
        .filter((item) => Number.isFinite(item));
}

/**
 * Validate an attribute value against a set of allowed values, falling back to
 * a documented default when it does not match.
 * @param {string} value
 * @param {string[]} allowed
 * @param {string} fallback
 * @returns {string}
 */
export function parseEnumAttribute(value, allowed, fallback) {
    return allowed.includes(value) ? value : fallback;
}
