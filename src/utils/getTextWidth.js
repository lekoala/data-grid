let canvas;

/**
 * Uses canvas.measureText to compute and return the width of the given text of given font in pixels.
 * Getting computed styles only works for dom that are added in the dom
 * @see https://stackoverflow.com/questions/118241/calculate-text-width-with-javascript/21015393#21015393
 * @param {String} text The text to be rendered.
 * @param {Element} el Target element (defaults to body)
 * @param {Boolean} withPadding Include padding on element
 * @returns {Number}
 */
export default function getTextWidth(text, el = document.body, withPadding = false) {
    const styles = window.getComputedStyle(el || document.createElement("div"));
    const fontWeight = styles.getPropertyValue("font-weight") || "normal";
    const fontSize = styles.getPropertyValue("font-size") || "1rem";
    const fontFamily = styles.getPropertyValue("font-family") || "Arial";

    let padding = 0;
    if (withPadding) {
        const paddingLeft = styles.getPropertyValue("padding-left") || "0";
        const paddingRight = styles.getPropertyValue("padding-right") || "0";
        padding = Number.parseInt(paddingLeft) + Number.parseInt(paddingRight);
    }

    // re-use canvas object for better performance
    if (!canvas) {
        canvas = document.createElement("canvas");
    }
    const context = canvas.getContext("2d");
    context.font = `${fontWeight} ${fontSize} ${fontFamily}`;
    const metrics = context.measureText(text);
    return Number.parseInt(metrics.width) + padding;
}
