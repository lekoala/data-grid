import BasePlugin from "../core/base-plugin.js";

class SaveState extends BasePlugin {

    constructor(grid) {
        super(grid)
        this.cachedState = null
        this.isFilterSortSet = false
        this.isDataLoaded = false
        this.isScrolled = false
        this.log('Init')
    }

    connected() {
        this.log('connected')
        const grid = this.grid

        if (!grid.options.saveState) {
            return
        }

        this.log('enabled')

        let cachedState = this._getState()
        if (cachedState) {

            this.log('hide columns')
            cachedState.columns.forEach((col) => {
                if (col.hidden) {
                    const hideCol = grid.options.columns.find((c) => c.field == col.field)
                    hideCol.hidden = true
                }
            })

            this.log('set: meta, pages')
            grid.options.perPage = cachedState.perPage
            if (grid.options.server) {
                grid.meta = cachedState.meta
                grid.pages = cachedState.pages
                grid.page = cachedState.page
            }
        }

        this.cachedState = cachedState

        const dgLoadData = grid.loadData
        grid.loadData = function () {
            return (
                new Promise((resolve, reject) => {
                    dgLoadData.apply(this, arguments).finally(() => {
                        const saveState = this.plugins.SaveState

                        if (!grid.classList.contains('dg-initialized')) {
                            saveState.log('not init, loadData skipped')
                            return resolve()
                        }

                        saveState.log('loadData finished, set param controls')

                        if (saveState.cachedState && !saveState.isFilterSortSet) {
                            saveState.log('set sort and filters')

                            grid.querySelectorAll('thead tr.dg-head-columns th[aria-sort]').forEach((el) => {
                                el.setAttribute('aria-sort', 'none')
                            })

                            grid.querySelector(`thead tr.dg-head-columns th[field='${saveState.cachedState.sort}']`)?.setAttribute('aria-sort', saveState.cachedState.sortDir)
                            grid.filterRow.querySelectorAll('[id^=dg-filter]').forEach((el) => {
                                el.value = saveState.cachedState.filters[el.dataset.name]
                            })
                            saveState.isFilterSortSet = true
                        }

                        const newState = {
                            meta: grid.meta,
                            pages: grid.pages,
                            page: grid.page,
                            perPage: grid.options.perPage,
                            filters: {},
                            columns: grid.options.columns.map((col) => ({ field: col.field, hidden: col.hidden })),
                            sort: grid.getSort(),
                            sortDir: grid.getSortDir(),
                            scrollTo: window.scrollY
                        }

                        const filters = grid.getFilters()
                        Object.keys(filters).forEach((key) => {
                            newState.filters[key] = filters[key]
                        });

                        saveState.log('store new state')
                        saveState._setState(newState)

                        if (!grid.options.server && saveState.cachedState && !saveState.isDataLoaded) {
                            saveState.isDataLoaded = true
                            grid.filterData()
                            grid.page = saveState.cachedState.page
                            grid.pageChanged()
                        }

                        resolve()
                    });
                })
            );
        }

        const updateState = () => {
            const saveState = grid.plugins.SaveState
            const state = saveState._getState()
            if (!state) {
                return
            }
            state.columns = grid.options.columns.map((col) => ({ field: col.field, hidden: col.hidden }))
            state.sort = grid.getSort()
            state.sortDir = grid.getSortDir()
            state.scrollTo = window.scrollY
            saveState._setState(state)
        }

        document.addEventListener('scrollend', updateState)
        grid.addEventListener('headerRendered', updateState)

        grid.addEventListener('bodyRendered', function (ev) {
            if (!grid.classList.contains('dg-initialized') || grid.classList.contains('dg-loading')) {
                return
            }

            if (!grid.options.server) {
                updateState()
            }

            const saveState = grid.plugins.SaveState
            if (!saveState.cachedState || !saveState.isFilterSortSet) {
                return
            }

            if (!saveState.isDataLoaded) {
                saveState.isDataLoaded = true
                grid.reload()
            } else if (!saveState.isScrolled) {
                saveState.isScrolled = true
                window.scrollTo({ top: saveState.cachedState.scrollTo, left: 0, behavior: 'instant' })
            }
        })
    }

    log(message) {
        this.grid.log(`[Save-State] ${message}`)
    }

    _getState() {
        let state
        try {
            state = JSON.parse(sessionStorage.getItem(`gridSaveState_${this.grid.id}`))
        } catch (_) {
        }
        return state
    }

    _setState(state) {
        sessionStorage.setItem(`gridSaveState_${this.grid.id}`, JSON.stringify(state))
    }
}

export default SaveState 