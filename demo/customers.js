import { ArrayDataSource, DataGrid } from "../data-grid.js";

const STATUSES = [
    ["active", "Active"],
    ["churned", "Churned"],
    ["past-due", "Past due"],
    ["trial", "Trial"],
];
const NAMES = ["Avery Morgan", "Camille Laurent", "Jordan Chen", "Noor Haddad", "Robin Silva", "Sasha Patel"];
const COMPANIES = ["Northstar Studio", "Acme Labs", "Atelier Étoile", "Harbor & Co", "Long Horizon Research Group"];

export function customerRows() {
    return Array.from({ length: 64 }, (_, i) => ({
        id: `customer-${i + 1}`,
        name: `${NAMES[i % NAMES.length]}${i < NAMES.length ? "" : ` ${i + 1}`}`,
        company: COMPANIES[i % COMPANIES.length],
        email: `customer${i + 1}@example.com`,
        status: STATUSES[i % STATUSES.length][0],
        mrr: i % 9 === 0 ? 0 : 149 + ((i * 173) % 2400),
        seats: i % 11 === 0 ? 0 : 1 + ((i * 7) % 180),
        health: i % 13 === 0 ? null : ((i * 17) % 101) / 100,
    }));
}

/** Application composition only; the grid owns query, results and selection. */
export function mountCustomers(root) {
    const doc = root.ownerDocument;
    const controller = new AbortController();
    const listen = (target, type, handler, capture = false) =>
        target.addEventListener(type, handler, { signal: controller.signal, capture });
    const find = (selector) => root.querySelector(selector);
    const focusSearch = find("[data-search-focus]");
    const scope = find("[data-selection-scope]");
    const extend = find("[data-select-matching]");
    const clear = find("[data-clear-selection]");
    const count = find("[data-result-count]");
    const density = find("[data-density]");
    const bars = find("[data-bars]");
    const sample = customerRows();
    let pending = true;
    let searchReturn = null;
    let detailsReturn = null;
    let focusFrame = null;
    let openDetailsKey = null;
    let navigatingDetails = false;

    const columns = [
        {
            field: "name",
            title: "Customer",
            width: 220,
            frozen: "start",
            position: "start",
            renderCell: ({ row, tr }) => {
                if (!tr) return row.name;
                const button = doc.createElement("button");
                button.type = "button";
                button.className = "customer-name";
                button.textContent = row.name;
                button.addEventListener("click", () => {
                    if (pending || grid.loading) return;
                    detailsReturn = button;
                    grid.getPlugin("RowDetails").expand(String(row.id));
                });
                return button;
            },
        },
        { field: "company", title: "Company", width: 210 },
        { field: "email", title: "Email", width: 230, hidden: true },
        {
            field: "status",
            title: "Status",
            width: 130,
            filterType: "select",
            filterList: STATUSES.map(([value, text]) => ({ value, text })),
            renderCell: ({ value }) => {
                const badge = doc.createElement("span");
                badge.className = "customer-status";
                badge.dataset.status = value;
                badge.textContent = STATUSES.find(([key]) => key === value)?.[1] ?? value;
                return badge;
            },
        },
        {
            field: "mrr",
            title: "MRR",
            width: 130,
            align: "end",
            format: "number",
            formatOptions: { style: "currency", currency: "USD", maximumFractionDigits: 0 },
        },
        { field: "seats", title: "Seats", width: 90, align: "end", format: "number" },
        {
            field: "health",
            title: "Health",
            width: 110,
            align: "end",
            format: "number",
            formatOptions: { style: "percent", maximumFractionDigits: 0 },
            renderCell: ({ value, column, tr }) => {
                if (value == null) return "—";
                const text = new Intl.NumberFormat("en-US", column.formatOptions).format(value);
                if (!tr) return text;
                const cell = doc.createElement("span");
                cell.className = "customer-health";
                cell.textContent = text;
                const track = doc.createElement("span");
                track.className = "customer-health-track";
                track.setAttribute("aria-hidden", "true");
                const fill = doc.createElement("span");
                fill.className = "customer-health-fill";
                fill.style.width = `${Math.max(0, Math.min(1, value)) * 100}%`;
                track.append(fill);
                cell.append(track);
                return cell;
            },
        },
    ];
    const grid = new DataGrid({
        id: "customers-grid",
        dataSource: new ArrayDataSource(sample),
        columns,
        rowKey: "id",
        rowLabel: "name",
        pageSize: 10,
        selectable: true,
        selectVisibleOnly: true,
        searchable: true,
        searchPlaceholder: "Search customers",
        sortable: true,
        filterable: true,
        responsive: true,
        detailsDisplay: "dialog",
        rowDetails: ({ rowKey }) => createRecordNavigation(rowKey),
        bulkActions: [{ name: "preview", label: "Preview action scope" }],
    });
    grid.lang = "en-US";
    grid.setAttribute("aria-label", "Customers");
    grid.classList.add("customers-floating-actions", "customers-record-drawer");

    function createRecordNavigation(rowKey) {
        const index = grid.rows.findIndex((row) => String(row.id) === rowKey);
        if (index < 0) return null;
        const source = grid.dataSource;
        const nav = doc.createElement("nav");
        nav.className = "customers-record-navigation";
        nav.setAttribute("aria-label", "Browse loaded customers");
        const position = doc.createElement("p");
        position.dataset.recordPosition = "";
        position.tabIndex = -1;
        position.setAttribute("role", "status");
        position.setAttribute("aria-live", "polite");
        const label = doc.createElement("bdi");
        label.textContent = `${index + 1} of ${grid.rows.length} ${grid.options.pager === "more" ? "loaded results" : "on this page"}`;
        position.append(label);
        nav.append(position);
        for (const [step, label] of [
            [-1, "Previous"],
            [1, "Next"],
        ]) {
            const button = doc.createElement("button");
            button.type = "button";
            button.dataset.recordStep = String(step);
            button.textContent = label;
            button.setAttribute("aria-label", `${label} customer`);
            button.disabled = index + step < 0 || index + step >= grid.rows.length;
            button.addEventListener("click", () => {
                // Detached application content must never reopen an obsolete sheet.
                if (
                    button.matches(":disabled") ||
                    !button.isConnected ||
                    !grid.isConnected ||
                    pending ||
                    grid.loading ||
                    openDetailsKey !== rowKey ||
                    grid.dataSource !== source
                )
                    return;
                const current = grid.rows.findIndex((row) => String(row.id) === rowKey);
                const next = current < 0 ? null : grid.rows[current + step];
                if (!next) return;
                navigatingDetails = true;
                try {
                    grid.getPlugin("RowDetails").expand(String(next.id));
                } finally {
                    navigatingDetails = false;
                }
                const controls = grid.querySelector(".customers-record-navigation");
                const nextButton = controls?.querySelector(`[data-record-step="${step}"]`);
                const focus =
                    nextButton && !nextButton.matches(":disabled")
                        ? nextButton
                        : controls?.querySelector("[data-record-position]");
                focus?.focus();
            });
            nav.append(button);
        }
        return nav;
    }

    function closeRecord() {
        if (openDetailsKey === null) return;
        // Query/response changes may remove the original row. Use a stable target.
        detailsReturn = focusSearch;
        grid.getPlugin("RowDetails").collapse(openDetailsKey);
    }

    function canFocus(target) {
        return (
            target?.isConnected &&
            !target.matches(":disabled") &&
            !target.closest("[hidden], [inert], dialog:not([open])") &&
            getComputedStyle(target).visibility === "visible" &&
            target.getClientRects().length > 0
        );
    }

    function restore(target) {
        (canFocus(target) ? target : focusSearch).focus();
    }

    function hideButton(button, hidden) {
        if (hidden && button === doc.activeElement) restore(focusSearch);
        button.hidden = hidden;
    }

    function hasActionableSelection() {
        const selection = grid.getSelectionState();
        return selection.mode === "all"
            ? grid.total == null || grid.total > selection.except.size
            : selection.ids.size > 0;
    }

    function updateFloatingActions() {
        if (!grid.isConnected) return;
        const bar = grid.querySelector(".dg-bulk-actions");
        if (!bar) return;
        const actionable = hasActionableSelection();
        // Count visibility is not selection state: all-results mode may have no total.
        if (!actionable && bar.contains(doc.activeElement)) restore(focusSearch);
        bar.hidden = !actionable;
        bar.setAttribute("role", "group");
        bar.setAttribute("aria-label", "Selected customer actions");

        const topbar = bar.closest(".dg-topbar");
        const start = topbar?.querySelector(":scope > .dg-topbar-start");
        const end = topbar?.querySelector(":scope > .dg-topbar-end");
        const startOnly = start?.childNodes.length === 1 && start.firstChild === bar;
        grid.classList.toggle("customers-floating-start-only", Boolean(startOnly));
        grid.classList.toggle("customers-actions-only", Boolean(startOnly && !end?.hasChildNodes()));
    }

    function updateSelection() {
        updateFloatingActions();
        const selection = grid.getSelectionState();
        const all = selection.mode === "all";
        const any = all || selection.ids.size > 0;
        const allCurrent = grid.rows.length > 0 && grid.rows.every((row, index) => grid.isRowSelected(row, index));
        const moreMatches = grid.total == null || grid.total > grid.rows.length;
        hideButton(extend, pending || all || !allCurrent || !moreMatches);
        hideButton(clear, !any);
        extend.textContent =
            grid.total == null ? "Select all matching results" : `Select all ${grid.total} matching results`;
        if (pending || !any) {
            scope.textContent = "";
        } else if (all) {
            scope.textContent = `All matching results selected${selection.except.size ? `, excluding ${selection.except.size}` : ""}.`;
        } else {
            const loaded = grid.options.pager === "more" ? "loaded results" : "rows on this page";
            scope.textContent = allCurrent ? `All ${grid.rows.length} ${loaded} selected.` : "";
        }
    }

    const pillButtons = [];
    for (const [value, label] of [["", "All"], ...STATUSES]) {
        const button = doc.createElement("button");
        button.type = "button";
        button.dataset.status = value;
        button.textContent = `${label} ${value ? sample.filter((row) => row.status === value).length : sample.length}`;
        listen(button, "click", () => {
            const filters = { ...grid.query.filters };
            if (value) filters.status = { operator: "eq", value };
            else delete filters.status;
            grid.setQuery({ filters });
        });
        find("[data-status-pills]").append(button);
        pillButtons.push(button);
    }

    const columnInputs = new Map();
    for (const column of columns) {
        const label = doc.createElement("label");
        const input = doc.createElement("input");
        input.type = "checkbox";
        input.dataset.field = column.field;
        listen(input, "change", () => {
            if (input.checked) grid.showColumn(column.field);
            else grid.hideColumn(column.field);
        });
        label.append(input, ` ${column.title}`);
        find("[data-column-settings]").append(label);
        columnInputs.set(column.field, input);
    }

    function updateView() {
        density.value = grid.getAttribute("density") ?? "default";
        for (const [field, input] of columnInputs) input.checked = !grid.getCol(field)?.hidden;
    }

    function updatePills() {
        const status = grid.query.filters.status;
        for (const button of pillButtons) {
            const active =
                button.dataset.status === ""
                    ? !status
                    : status?.operator === "eq" && String(status.value) === button.dataset.status;
            button.setAttribute("aria-pressed", String(active));
        }
    }

    function updateResultCount() {
        count.textContent = pending
            ? "Updating results…"
            : grid.total == null
              ? `${grid.rows.length} loaded results · total unknown`
              : `${grid.total} matching customers`;
    }

    listen(grid, "querychange", () => {
        closeRecord();
        pending = true;
        updateResultCount();
        updatePills();
        updateSelection();
    });
    listen(
        grid,
        "input",
        (event) => {
            if (!event.target.matches(".dg-search")) return;
            // A pending search edit is already a new intent, even before debounce commits it.
            pending = event.target.value !== grid.query.search || grid.loading;
            if (pending) closeRecord();
            updateResultCount();
            updateSelection();
        },
        true,
    );
    listen(grid, "bodyRendered", () => {
        closeRecord();
        pending = false;
        updateResultCount();
        updatePills();
        updateSelection();
        updateView();
    });
    listen(grid, "loadError", () => {
        pending = true;
        count.textContent = "Customers could not be loaded.";
        updateSelection();
    });
    listen(grid, "selectionChange", updateSelection);
    // Rebuilds can replace the toolbar; a reload also ends the demo's inspection
    // session. Class/hidden changes cannot schedule another observer callback.
    const gridObserver = new MutationObserver(() => {
        updateFloatingActions();
        if (grid.isConnected && grid.loading) closeRecord();
    });
    gridObserver.observe(grid, { childList: true, subtree: true, attributes: true, attributeFilter: ["data-loading"] });
    listen(grid, "columnVisibility", updateView);
    listen(extend, "click", () => grid.selectAllMatching());
    listen(clear, "click", () => grid.clearSelection());
    listen(density, "change", () => grid.setAttribute("density", density.value));
    listen(bars, "change", () => root.classList.toggle("customers-no-bars", !bars.checked));
    listen(grid, "bulkAction", (event) => {
        const { selection, query } = event.detail;
        const target =
            selection.mode === "all"
                ? `All matching customers, excluding ${selection.except.size}`
                : `${selection.ids.size} explicit customer keys`;
        find("[data-action-feedback]").textContent =
            `${target}. Mode: ${selection.mode}. Scope: search ${JSON.stringify(query.search)}, filters ${JSON.stringify(query.filters)}. Preview only; no records changed.`;
    });

    listen(
        grid,
        "click",
        (event) => {
            const button = event.target.closest(".dg-row-details-toggle-control");
            if (!button || button.closest("data-grid") !== grid) return;
            if (pending || grid.loading) {
                event.preventDefault();
                event.stopPropagation();
                return;
            }
            detailsReturn = button;
        },
        true,
    );
    listen(grid, "rowDetailsToggle", (event) => {
        openDetailsKey = event.detail.expanded ? String(event.detail.rowKey) : null;
        if (event.detail.expanded) {
            if (focusFrame != null) cancelAnimationFrame(focusFrame);
            focusFrame = null;
            return;
        }
        if (navigatingDetails) return;
        const target = detailsReturn;
        detailsReturn = null;
        if (focusFrame != null) cancelAnimationFrame(focusFrame);
        focusFrame = requestAnimationFrame(() => {
            focusFrame = null;
            if (grid.isConnected && !grid.querySelector("dialog[open]")) restore(target);
        });
    });
    listen(grid, "disconnected", () => {
        openDetailsKey = null;
        detailsReturn = null;
        if (focusFrame != null) cancelAnimationFrame(focusFrame);
        focusFrame = null;
    });

    function enterSearch(remember = false) {
        const search = grid.querySelector(".dg-search");
        if (!search || search.matches(":disabled") || !canFocus(search)) return false;
        searchReturn = remember ? doc.activeElement : null;
        search.focus();
        return true;
    }
    listen(focusSearch, "click", () => enterSearch());
    listen(doc, "keydown", (event) => {
        if (
            event.key !== "/" ||
            event.defaultPrevented ||
            event.isComposing ||
            event.ctrlKey ||
            event.metaKey ||
            event.altKey ||
            event.shiftKey
        )
            return;
        if (doc.activeElement !== doc.body && !root.contains(doc.activeElement)) return;
        if (doc.querySelector("dialog[open]") || root.querySelector(".customers-view[open]")) return;
        if (
            event
                .composedPath()
                .some(
                    (target) =>
                        target instanceof HTMLElement &&
                        (target.matches("input, textarea, select, [role='textbox']") || target.isContentEditable),
                )
        )
            return;
        if (enterSearch(true)) event.preventDefault();
    });
    // Capture before the delegated grid handler, which normally clears search on Escape.
    listen(
        grid,
        "keydown",
        (event) => {
            if (event.key !== "Escape" || !searchReturn || !event.target.matches(".dg-search")) return;
            const target = searchReturn;
            searchReturn = null;
            event.preventDefault();
            event.stopPropagation();
            restore(target);
        },
        true,
    );
    listen(grid, "focusout", (event) => {
        if (event.target.matches(".dg-search")) searchReturn = null;
        // A refresh can disable the focused action before bodyRendered hides its bar.
        if (
            grid.isConnected &&
            event.target.closest(".dg-bulk-actions") &&
            !event.relatedTarget &&
            !hasActionableSelection()
        )
            restore(focusSearch);
    });
    updatePills();
    find("[data-customer-grid]").replaceChildren(grid);

    return {
        grid,
        destroy() {
            controller.abort();
            gridObserver.disconnect();
            openDetailsKey = null;
            detailsReturn = null;
            if (focusFrame != null) cancelAnimationFrame(focusFrame);
            grid.remove();
        },
    };
}
