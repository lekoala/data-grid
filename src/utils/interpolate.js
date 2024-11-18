/**
 * Replace element within {} by their data value
 * @param {String} str
 * @param {Object} data
 * @returns {String}
 */
export default function interpolate(str, data) {
    return str.replace(/\{([^}]+)?\}/g, ($1, $2) => data[$2]);
}
