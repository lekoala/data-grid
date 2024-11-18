/**
 * @param {HTMLSelectElement} el
 * @param {String} value
 * @param {String} label
 * @param {Boolean} checked
 */
export default function addSelectOption(el, value, label, checked = false) {
    const opt = document.createElement("option");
    opt.value = `${value}`;
    if (checked) {
        opt.selected = true;
    }
    opt.label = label;
    el.appendChild(opt);
}
