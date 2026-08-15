/**
 * Uses canvas.measureText to compute and return the width of the given text of given font in pixels.
 * Getting computed styles only works for dom that are added in the dom
 * @see https://stackoverflow.com/questions/118241/calculate-text-width-with-javascript/21015393#21015393
 * @param {String} text The text to be rendered.
 * @param {Element} el Target element (defaults to body)
 * @param {Boolean} withPadding Include padding on element
 * @returns {Number}
 */
export default function getTextWidth(text: string, el?: Element, withPadding?: boolean): number;
//# sourceMappingURL=getTextWidth.d.ts.map