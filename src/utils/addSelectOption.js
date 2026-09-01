/**
 * @param {HTMLSelectElement} el
 * @param {String|Number} value
 * @param {String|Number} label
 * @param {Boolean} checked
 */
export default function addSelectOption(el, value, label, checked = false) {
    const opt = document.createElement("option");
    const text = String(label);
    opt.value = `${value}`;
    if (checked) {
        opt.selected = true;
    }
    opt.label = text;
    opt.text = text;
    el.appendChild(opt);
}
