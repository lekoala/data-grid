import randstr from "./randstr.js";

/**
 * Compact multi-value select filter: a trigger button summarizing the current
 * selection opens a checkbox panel reusing the `.dg-menu` presentation of the
 * context menu. The root element carries the `dg-filter-*` id contract of the
 * filter row, and the checked values map onto an `in` query filter (see
 * DataGrid.filterData()).
 *
 * The control is passive: it owns no listeners. Opening and closing are routed
 * through the grid delegation (trigger click) and the open/dismiss lifecycle
 * lives in utils/menu.js, whose cleanup handle is owned by DataGrid.
 */

/**
 * @param {HTMLElement} root
 * @returns {NodeListOf<HTMLInputElement>}
 */
function checkboxes(root) {
    return /** @type {NodeListOf<HTMLInputElement>} */ (
        root.querySelectorAll(".dg-multiselect-panel input[data-value]")
    );
}

/**
 * Join the checked labels for the closed-state summary: all labels up to two,
 * then the first two plus "+N".
 * @param {Array<String>} labels
 * @returns {String}
 */
function summarize(labels) {
    if (labels.length <= 2) {
        return labels.join(", ");
    }
    return `${labels.slice(0, 2).join(", ")} +${labels.length - 2}`;
}

/**
 * Refresh the trigger summary from the checked boxes. With no selection the
 * empty-state text is shown instead: the firstFilterOption label when it has
 * one ("All"), otherwise the filter placeholder ("…").
 * @param {HTMLElement} root
 */
export function updateMultiSelectSummary(root) {
    const summary = /** @type {HTMLElement|null} */ (root.querySelector(".dg-multiselect-summary"));
    if (!summary) {
        return;
    }
    const labels = [];
    for (const box of checkboxes(root)) {
        if (box.checked) {
            const label = box.closest("label");
            labels.push(label ? label.textContent.trim() : `${box.dataset.value}`);
        }
    }
    summary.textContent = labels.length ? summarize(labels) : `${root.dataset.emptyText ?? ""}`;
    summary.classList.toggle("dg-multiselect-empty", labels.length === 0);
}

/**
 * Build the control for a `filterMultiple` select column. Options are rendered
 * as-is except empty values, which cannot participate in a set (placeholders
 * like "All" are meaningless as checkboxes) but keep their label as the
 * empty-state summary.
 * @param {import("../data-grid.js").Column} column
 * @param {Array<import("../data-source.js").FilterOption>} options
 * @param {HTMLTableCellElement} relatedTh
 * @returns {HTMLDivElement}
 */
export function createMultiSelect(column, options, relatedTh) {
    const doc = relatedTh.ownerDocument;
    const root = doc.createElement("div");
    root.className = "dg-multiselect dg-filter-control";
    // Filter-row contract: the id prefix collects the control in
    // filterData()/clearFilters(), data-name binds it to the column.
    root.id = randstr("dg-filter-");
    root.dataset.name = column.field ?? "";
    root.dataset.filterMode = "multi";
    root.dataset.emptyText = column.firstFilterOption?.text || column.filterPlaceholder || "";

    const trigger = doc.createElement("button");
    trigger.type = "button";
    trigger.className = "dg-multiselect-trigger";
    trigger.setAttribute("aria-expanded", "false");

    const panelId = randstr("dg-multiselect-");
    trigger.setAttribute("aria-controls", panelId);
    // Same accessible-name mechanism as the other filters: the column header
    const headerId = relatedTh.getAttribute("id");
    if (headerId) {
        trigger.setAttribute("aria-labelledby", headerId);
    }

    const summary = doc.createElement("span");
    summary.className = "dg-multiselect-summary";
    trigger.appendChild(summary);

    const panel = doc.createElement("ul");
    panel.className = "dg-menu dg-multiselect-panel";
    panel.id = panelId;
    panel.hidden = true;

    for (const option of options) {
        if (`${option.value}` === "") {
            continue;
        }
        const li = doc.createElement("li");
        const label = doc.createElement("label");
        const checkbox = doc.createElement("input");
        checkbox.type = "checkbox";
        checkbox.dataset.value = `${option.value}`;
        label.appendChild(checkbox);
        label.appendChild(doc.createTextNode(`${option.text}`));
        li.appendChild(label);
        panel.appendChild(li);
    }

    root.appendChild(trigger);
    root.appendChild(panel);
    updateMultiSelectSummary(root);
    return root;
}

/**
 * Whether the checkbox panel is currently shown.
 * @param {HTMLElement} root
 * @returns {Boolean}
 */
export function isMultiSelectOpen(root) {
    const panel = /** @type {HTMLElement|null} */ (root.querySelector(".dg-multiselect-panel"));
    return Boolean(panel && !panel.hidden);
}

/**
 * Checked values, in DOM order.
 * @param {HTMLElement} root
 * @returns {String[]}
 */
export function readMultiSelect(root) {
    const values = [];
    for (const box of checkboxes(root)) {
        if (box.checked) {
            values.push(`${box.dataset.value}`);
        }
    }
    return values;
}

/**
 * Reflect a query value onto the checkboxes and refresh the summary.
 * @param {HTMLElement} root
 * @param {Array<any>} values
 */
export function setMultiSelectValues(root, values) {
    const selected = (values ?? []).map((v) => `${v}`);
    for (const box of checkboxes(root)) {
        box.checked = selected.includes(`${box.dataset.value}`);
    }
    updateMultiSelectSummary(root);
}

/**
 * Uncheck every box and refresh the summary.
 * @param {HTMLElement} root
 */
export function clearMultiSelect(root) {
    for (const box of checkboxes(root)) {
        box.checked = false;
    }
    updateMultiSelectSummary(root);
}
