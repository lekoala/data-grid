/**
 * Replace elements within {} by URL-encoded data values.
 * This treats every placeholder as one URL component. Callers that need to
 * construct a complete URL should use the functional API instead.
 * @param {String} str
 * @param {Record<string, any>} data
 * @returns {String}
 */
export default function interpolate(str, data) {
    return str.replace(/\{([^}]+)?\}/g, ($1, $2) => encodeURIComponent(String(data[$2] ?? "")));
}
