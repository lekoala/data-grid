/**
 * Parse data attribute and return properly typed data
 * @param {String} v
 * @returns {any}
 */
export default function normalizeData(v) {
  // Bool
  if (v === "true") {
    return true;
  }
  if (v === "false") {
    return false;
  }
  // Null or empty
  if (v === "" || v === "null") {
    return null;
  }
  // Numeric attributes
  if (v === Number(v).toString()) {
    return Number(v);
  }
  // Only attempt json parsing for array or objects
  if (v && ["[", "{"].includes(v.substring(0, 1))) {
    try {
      // In case we have only single quoted values, like ['one', 'two', 'three']
      if (v.indexOf('"') === -1) {
        v = v.replace(/'/g, '"');
      }
      return JSON.parse(decodeURIComponent(v));
    } catch {
      console.log("Failed to parse " + v);
      return {};
    }
  }
  return v;
}
