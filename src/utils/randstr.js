/**
 * @param {String} prefix
 * @returns {String}
 */
export default function randstr(prefix) {
  return Math.random()
    .toString(36)
    .replace("0.", prefix || "");
}
