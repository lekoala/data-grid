/**
 * Force value as arrays
 * @param {String|Array} v
 * @returns {Array}
 */
export default function convertArray(v) {
  if (typeof v === "string") {
    if (v[0] === "[") {
      // "['my', 'value']" would fail as a json
      if (v.indexOf('"') === -1) {
        v = v.replace(/'/g, '"');
      }
      return JSON.parse(v);
    }

    return v.split(",");
  }
  if (!Array.isArray(v)) {
    console.error("Invalid array", v);
    return [];
  }
  return v;
}
