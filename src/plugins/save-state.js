import BasePlugin from "../core/base-plugin.js";
import { findAll } from "../utils/shortcuts.js";

/**
 * @typedef GridState
 * @property {Object} meta
 * @property {Number} pages
 * @property {Number} page
 * @property {Number} perPage
 * @property {Object} filters
 * @property {Array} columns
 * @property {String} sort
 * @property {String} sortDir
 * @property {Number} scrollTo
 */

class SaveState extends BasePlugin {
    constructor(grid) {
        super(grid);
        this.cachedState = null;
        this.isFilterSortSet = false;
        this.isDataLoaded = false;
        this.isScrolled = false;
        this.log("Init");
    }

    connected() {
        this.log("connected");
        const grid = this.grid;

        this.log(grid.options);

        if (!grid.options.saveState) {
            this.log("disabled");
            return;
        }

        this.log("enabled");

        const cachedState = this._getState();
        if (cachedState) {
            this.log("hide columns");

            for (const col of cachedState.columns) {
                if (col.hidden) {
                    const hideCol = grid.options.columns.find((c) => c.field === col.field);
                    hideCol.hidden = true;
                }
            }

            this.log("set: meta, pages");
            grid.options.perPage = cachedState.perPage;
            if (grid.options.server) {
                grid.meta = cachedState.meta;
                grid.pages = cachedState.pages;
                grid.page = cachedState.page;
            }
        }

        this.cachedState = cachedState;
        this.log("cachedState", this.cachedState);

        setTimeout(() => {
            const dgLoadData = grid.loadData;
            grid.loadData = function (...args) {
                return dgLoadData.apply(this, args).finally(() => {
                    const saveState = this.plugins.SaveState;
                    saveState.log("loadData", this.options.columns);

                    if (!grid.classList.contains("dg-initialized")) {
                        saveState.log("not init, loadData skipped");
                        return;
                    }

                    saveState.log("loadData finished, set param controls", this.options.columns);

                    if (saveState.cachedState && !saveState.isFilterSortSet) {
                        saveState.log("set sort and filters");

                        const sortableHeaders = findAll(grid, "thead tr.dg-head-columns th[aria-sort]");
                        for (const el of sortableHeaders) {
                            el.setAttribute("aria-sort", "none");
                        }

                        grid.querySelector(`thead tr.dg-head-columns th[field='${saveState.cachedState.sort}']`)
                            ?.setAttribute("aria-sort", saveState.cachedState.sortDir);

                        const filters = findAll(grid.filterRow, "[id^=dg-filter]");
                        saveState.log("filters", filters);

                        for (const el of filters) {
                            el.value = saveState?.cachedState?.filters?.[el.dataset.name] ?? "";
                            saveState.log({ name: el.dataset.name, val: el.value, saveState });
                        }
                        saveState.isFilterSortSet = true;
                    }

                    /** @type {GridState} */
                    const newState = {
                        meta: grid.meta,
                        pages: grid.pages,
                        page: grid.page,
                        perPage: grid.options.perPage,
                        filters: {},
                        columns: grid.options.columns.map((col) => ({ field: col.field, hidden: col.hidden })),
                        sort: grid.getSort(),
                        sortDir: grid.getSortDir(),
                        scrollTo: window.scrollY,
                    };

                    const filters = grid.getFilters();
                    saveState.log("filters", filters);

                    for (const key of Object.keys(filters)) {
                        newState.filters[key] = filters[key] ?? "";
                        saveState.log({ key, val: filters[key], newState, filters });
                    }

                    saveState.log("store new state", newState);
                    saveState._setState(newState);

                    if (!grid.options.server && saveState.cachedState && !saveState.isDataLoaded) {
                        saveState.isDataLoaded = true;
                        grid.filterData();
                        grid.page = saveState.cachedState.page;
                        grid.pageChanged();
                        saveState.log("data loaded");
                    }
                });
            };
        }, 0);

        const updateState = () => {
            const saveState = grid.plugins.SaveState;
            const state = saveState._getState();
            if (!state) {
                return;
            }
            state.columns = grid.options.columns.map((col) => ({ field: col.field, hidden: col.hidden }));
            state.sort = grid.getSort();
            state.sortDir = grid.getSortDir();
            state.scrollTo = window.scrollY;
            saveState._setState(state);
        };

        document.addEventListener("scrollend", updateState);
        grid.addEventListener("headerRendered", updateState);

        grid.addEventListener("bodyRendered", (ev) => {
            if (!grid.classList.contains("dg-initialized") || grid.classList.contains("dg-loading")) {
                return;
            }

            if (!grid.options.server) {
                updateState();
            }

            const saveState = grid.plugins.SaveState;
            if (!saveState.cachedState || !saveState.isFilterSortSet) {
                return;
            }

            if (!saveState.isDataLoaded) {
                saveState.isDataLoaded = true;
                grid.reload();
                saveState.log("***grid reloaded");
            } else if (!saveState.isScrolled) {
                saveState.isScrolled = true;
                window.scrollTo({ top: saveState.cachedState.scrollTo, left: 0, behavior: "instant" });
            }
        });
    }

    log(...data) {
        this.grid.log("[Save-State] ", ...data);
    }

    /**
     * @returns {GridState}
     */
    _getState() {
        let state;
        try {
            state = JSON.parse(sessionStorage.getItem(`gridSaveState_${this.grid.id}`));
        } catch (_) {}
        return state;
    }

    /**
     * @param {GridState} state
     */
    _setState(state) {
        sessionStorage.setItem(`gridSaveState_${this.grid.id}`, JSON.stringify(state));
    }
}

export default SaveState;
