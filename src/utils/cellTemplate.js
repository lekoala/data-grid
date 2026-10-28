import { isSafeUrl } from "./safeUrl.js";

const UNSAFE_ELEMENTS = new Set(["SCRIPT", "STYLE"]);
const URL_ATTRIBUTES = new Set(["href", "src", "action", "formaction", "xlink:href"]);
// A data: URL is a legitimate inline image (and media source), but not a
// navigation or an active document.
const DATA_URL_ELEMENTS = new Set(["IMG", "SOURCE", "VIDEO", "AUDIO", "TRACK"]);
const VALUE_BINDING = '[data-dg-text="value"]';

/**
 * @param {*} value
 * @returns {Boolean}
 */
function isScalar(value) {
    const type = typeof value;
    return type === "string" || type === "number" || type === "boolean" || type === "bigint";
}

/**
 * @param {*} value
 * @returns {String}
 */
function templateText(value) {
    return isScalar(value) ? String(value) : "";
}

/**
 * Conservative guard against common template mistakes. This is not a
 * sanitizer: the template itself is trusted application markup.
 * @param {HTMLTemplateElement} template
 * @returns {Boolean}
 */
export function isSafeCellTemplate(template) {
    for (const element of template.content.querySelectorAll("*")) {
        if (UNSAFE_ELEMENTS.has(element.tagName)) {
            return false;
        }
        for (const attribute of Array.from(element.attributes)) {
            const name = attribute.name.toLowerCase();
            if (/^on/i.test(name)) {
                return false;
            }
            if (URL_ATTRIBUTES.has(name)) {
                const allowData = name === "src" && DATA_URL_ELEMENTS.has(element.tagName);
                if (!isSafeUrl(attribute.value, { allowData })) {
                    return false;
                }
            }
        }
    }
    return true;
}

/**
 * @typedef {Object} CellTemplateCollection
 * @property {Map<String, HTMLTemplateElement>} templates
 * @property {Array<{field: String, template: HTMLTemplateElement}>} rejected
 * @property {String[]} duplicates
 */

/**
 * Collect the cell templates declared as direct children of `root`, independent
 * from the column schema. An unsafe template is reported, never registered.
 * @param {ParentNode} root
 * @returns {CellTemplateCollection}
 */
export function collectCellTemplates(root) {
    /** @type {Map<String, HTMLTemplateElement>} */
    const templates = new Map();
    /** @type {Array<{field: String, template: HTMLTemplateElement}>} */
    const rejected = [];
    /** @type {String[]} */
    const duplicates = [];

    for (const element of root.querySelectorAll(":scope > template[data-cell]")) {
        if (!(element instanceof HTMLTemplateElement)) {
            continue;
        }
        const field = element.dataset.cell;
        if (!field) {
            continue;
        }
        if (!isSafeCellTemplate(element)) {
            rejected.push({ field, template: element });
            continue;
        }
        if (templates.has(field)) {
            duplicates.push(field);
        }
        templates.set(field, element);
    }

    return { templates, rejected, duplicates };
}

/**
 * Clone a cell template and fill its `data-dg-text="value"` bindings with the
 * raw scalar value. Non-scalar values render as empty text and expose no
 * `data-value`, so nothing is serialized implicitly.
 * @param {HTMLElement} target
 * @param {HTMLTemplateElement} template
 * @param {*} value
 */
export function applyCellTemplate(target, template, value) {
    const fragment = /** @type {DocumentFragment} */ (template.content.cloneNode(true));
    const text = templateText(value);
    for (const element of fragment.querySelectorAll(VALUE_BINDING)) {
        element.textContent = text;
    }
    if (isScalar(value)) {
        target.dataset.value = text;
    } else {
        target.removeAttribute("data-value");
    }
    target.replaceChildren(fragment);
}
