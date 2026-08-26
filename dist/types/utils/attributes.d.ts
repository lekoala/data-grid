/**
 * Parse a declarative boolean attribute value. A bare attribute (empty string),
 * "true" or "1" means true; "false" and "0" mean false.
 * @param {string} value
 * @returns {boolean}
 */
export declare function parseBooleanAttribute(value: string): boolean;
/**
 * Parse a comma-separated list of integers, dropping invalid entries.
 * @param {string} value
 * @returns {number[]}
 */
export declare function parseIntegerListAttribute(value: string): number[];
/**
 * Validate an attribute value against a set of allowed values, falling back to
 * a documented default when it does not match.
 * @param {string} value
 * @param {string[]} allowed
 * @param {string} fallback
 * @returns {string}
 */
export declare function parseEnumAttribute(value: string, allowed: string[], fallback: string): string;
//# sourceMappingURL=attributes.d.ts.map