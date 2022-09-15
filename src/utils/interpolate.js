/**
 * Replace element within {} by their data value
 * @param {String} str
 * @param {Object} data
 * @returns {String}
 */
export default function interpolate(str, data) {
  return str.replace(/\{([^}]+)?\}/g, function ($1, $2) {
    return data[$2];
  });
}
