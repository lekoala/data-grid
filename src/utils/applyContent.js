/**
 * Apply a renderer result to an element.
 * primitive -> textContent, Node -> append, { html } -> innerHTML (opt-in).
 * @param {HTMLElement} el
 * @param {*} content
 */
export default function applyContent(el, content) {
    if (content === undefined || content === null) {
        return;
    }
    if (content instanceof Node) {
        el.appendChild(content);
        return;
    }
    if (typeof content === "object" && content.html !== undefined) {
        el.innerHTML = content.html;
        return;
    }
    el.textContent = content;
}
