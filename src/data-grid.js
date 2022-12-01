/**
 * Data Grid Web component
 *
 * Credits for inspiration
 * @link https://github.com/riverside/zino-grid
 */
"use strict";

import BaseElement from "./core/base-element.js";
import addSelectOption from "./utils/addSelectOption.js";
import appendParamsToUrl from "./utils/appendParamsToUrl.js";
import camelize from "./utils/camelize.js";
import convertArray from "./utils/convertArray.js";
import elementOffset from "./utils/elementOffset.js";
import getTextWidth from "./utils/getTextWidth.js";
import interpolate from "./utils/interpolate.js";
import randstr from "./utils/randstr.js";
import { asElement, dispatch, find, findAll, hasClass, removeAttribute, getAttribute, setAttribute } from "./utils/shortcuts.js";

/**
 * @typedef Column
 * @property {String} field - the key in the data
 * @property {String} title - the title to display in the header (defaults to "field" if not set)
 * @property {Number} width - the width of the column (auto otherwise)
 * @property {String} class - class to set on the column (target body or header with th.class or td.class)
 * @property {String} attr - don't render the column and set a matching attribute on the row with the value of the field
 * @property {Boolean} hidden - hide the column
 * @property {Boolean} editable - replace with input
 * @property {Boolean} noSort - allow disabling sort for a given column
 * @property {Number} responsive - the higher the value, the sooner it will be hidden, disable with 0
 */

/**
 * @typedef Action
 * @property {String} title - the title of the button
 * @property {String} name - the name of the action
 * @property {String} class - the class for the button
 * @property {String} url - link for the action
 * @property {String} html - custom button data
 * @property {Boolean} confirm - needs confirmation
 * @property {Boolean} default - is the default row action
 */

/**
 * @link https://dev.to/dakmor/type-safe-web-components-with-jsdoc-4icf
 * @typedef {Object} Plugins
 * @property {module:ColumnResizer} [ColumnResizer] resize handlers in the headers
 * @property {module:ContextMenu} [ContextMenu] menu to show/hide columns
 * @property {module:DraggableHeaders} [DraggableHeaders] draggable headers columns
 * @property {module:TouchSupport} [TouchSupport] touch swipe
 * @property {module:SelectableRows} [SelectableRows] create a column with checkboxes to select rows
 * @property {module:FixedHeight} [FixedHeight] allows having fixed height tables
 * @property {module:AutosizeColumn} [AutosizeColumn] compute ideal width based on column content
 * @property {module:ResponsiveGrid} [ResponsiveGrid] hide/show column on the fly
 */

/**
 * @typedef ServerParams
 * @property {String} serverParams.start
 * @property {String} serverParams.length
 * @property {String} serverParams.search
 * @property {String} serverParams.sort
 * @property {String} serverParams.sortDir
 * @property {String} serverParams.dataKey
 * @property {String} serverParams.errorKey
 * @property {String} serverParams.metaKey
 * @property {String} serverParams.metaTotalKey
 * @property {String} serverParams.metaFilteredKey
 * @property {String} serverParams.optionsKey
 * @property {String} serverParams.paramsKey
 */

/**
 * @typedef Options
 * @property {?String} id Custom id for the grid
 * @property {?String} url An URL with data to display in JSON format
 * @property {Boolean} debug Log actions in DevTools console
 * @property {Boolean} filter Allows a filtering functionality
 * @property {Boolean} sort Allows a sort by column functionality
 * @property {String} defaultSort Default sort field if sorting is enabled
 * @property {Boolean} server Is a server side powered grid
 * @property {ServerParams} serverParams Describe keys passed to the server backend
 * @property {String} dir Dir
 * @property {Array} perPageValues Available per page options
 * @property {Column[]} columns Available columns
 * @property {Action[]} actions Row actions
 * @property {Boolean} collapseActions Group actions
 * @property {Number} defaultPage Starting page
 * @property {Number} perPage Number of records displayed per page
 * @property {Boolean} expand  Allow cell content to spawn over multiple lines
 * @property {Boolean} resizable Make columns resizable (ColumnResizer module)
 * @property {Boolean} selectable Allow selecting rows with a checkbox (SelectableRows module)
 * @property {Boolean} selectVisibleOnly Select all only selects visible rows (SelectableRows module)
 * @property {Boolean} autosize Compute column sizes based on given data (Autosize module)
 * @property {Boolean} autoheight Adjust fixed height so that it matches table size (Autoheight module)
 * @property {Boolean} menu Right click menu on column headers (ContextMenu module)
 * @property {Boolean} reorder Allows a column reordering functionality (DraggableHeaders module)
 * @property {Boolean} responsive Change display mode on small screens (ResponsiveGrid module)
 */

/**
 * @typedef Labels
 * @property {String} itemsPerPage
 * @property {String} gotoPage
 * @property {String} gotoFirstPage
 * @property {String} gotoPrevPage
 * @property {String} gotoNextPage
 * @property {String} gotoLastPage
 * @property {String} of
 * @property {String} items
 * @property {String} resizeColumn
 * @property {String} noData
 * @property {String} areYouSure
 */

/**
 * @type {Plugins}
 */
let plugins = {};

/**
 * @type {Labels}
 */
let labels = {
  itemsPerPage: "Items per page",
  gotoPage: "Go to page",
  gotoFirstPage: "Go to first page",
  gotoPrevPage: "Go to previous page",
  gotoNextPage: "Go to next page",
  gotoLastPage: "Go to last page",
  of: "of",
  items: "items",
  resizeColumn: "Resize column",
  noData: "No data",
  areYouSure: "Are you sure?",
};

/**
 */
class DataGrid extends BaseElement {
  _ready() {
    setAttribute(this, "id", this.options.id ?? randstr("el-"), true);

    /**
     * The grid displays that data
     * @type {Array}
     */
    this.data = [];
    /**
     * We store the original data in this
     * @type {Array}
     */
    this.originalData = [];

    /**
     * @type {Options}
     */
    this.options = this.options || this.defaultOptions;

    // Init values
    this.fireEvents = false;
    this.defaultHeight = 0;
    this.page = this.options.defaultPage || 1;
    this.pages = 0;
    this.meta = {};

    // Expose options as observed attributes in the dom
    // Do it when fireEvents is disabled to avoid firing change callbacks
    for (const attr of DataGrid.observedAttributes) {
      if (attr.indexOf("data-") === 0) {
        setAttribute(this, attr, this.options[camelize(attr.slice(5))]);
      }
    }

    // Some IDE types stuff

    /**
     * @type {Column[]}
     */
    this.columns = this.columns ?? null;
    /**
     * @type {Column[]}
     */
    this.actions = this.actions ?? null;

    // selectable-rows.js
    /**
     * @type {HTMLInputElement}
     */
    this.selectAll = null;
    /**
     * @type {EventListenerOrEventListenerObject}
     */
    this.toggleSelectAll = null;

    // touch-support.js
    this.touch = null;
    /**
     * @type {EventListenerOrEventListenerObject}
     */
    this.touchstart = null;
    /**
     * @type {EventListenerOrEventListenerObject}
     */
    this.touchmove = null;

    // column-resizer.js
    this.isResizing = false;
  }

  static template() {
    return `
<table role="grid" >
    <thead role="rowgroup">
        <tr role="row" aria-rowindex="1" class="dg-head-columns"><th><!-- keep for getTextWidth --></th></tr>
        <tr role="row" aria-rowindex="2" class="dg-head-filters"></tr>
    </thead>
    <tbody role="rowgroup" data-empty="${labels.noData}"></tbody>
    <tfoot role="rowgroup" hidden>
        <tr role="row" aria-rowindex="1">
            <td role="gridcell">
            <div class="dg-footer">
                <div class="dg-page-nav">
                  <select class="dg-select-per-page" aria-label="${labels.itemsPerPage}"></select>
                </div>
                <div class="dg-pagination">
                  <button type="button" class="dg-btn-first dg-rotate" title="${labels.gotoFirstPage}" aria-label="${labels.gotoFirstPage}" disabled>
                    <i class="dg-skip-icon"></i>
                  </button>
                  <button type="button" class="dg-btn-prev dg-rotate" title="${labels.gotoPrevPage}" aria-label="${labels.gotoPrevPage}" disabled>
                    <i class="dg-nav-icon"></i>
                  </button>
                  <input type="number" class="dg-input-page" min="1" step="1" value="1" aria-label="${labels.gotoPage}">
                  <button type="button" class="dg-btn-next" title="${labels.gotoNextPage}" aria-label="${labels.gotoNextPage}" disabled>
                    <i class="dg-nav-icon"></i>
                  </button>
                  <button type="button" class="dg-btn-last" title="${labels.gotoLastPage}" aria-label="${labels.gotoLastPage}" disabled>
                    <i class="dg-skip-icon"></i>
                  </button>
                </div>
                <div class="dg-meta">
                  <span class="dg-low">0</span> - <span class="dg-high">0</span> ${labels.of} <span class="dg-total">0</span> ${labels.items}
                </div>
            </div>
            </td>
        </tr>
    </tfoot>
    <ul class="dg-menu" hidden></ul>
</table>
`;
  }

  /**
   * @param {Object} v
   */
  static setLabels(v) {
    labels = Object.assign(labels, v);
  }

  /**
   * @returns {Column}
   */
  get defaultColumn() {
    return {
      field: "",
      title: "",
      width: 0,
      class: "",
      attr: "",
      hidden: false,
      editable: false,
      noSort: false,
      responsive: 1,
    };
  }

  /**
   * @returns {Options}
   */
  get defaultOptions() {
    return {
      id: null,
      url: null,
      perPage: 10,
      debug: false,
      filter: false,
      menu: false,
      sort: false,
      server: false,
      serverParams: {
        start: "start",
        length: "length",
        search: "search",
        sort: "sort",
        sortDir: "sortDir",
        dataKey: "data",
        errorKey: "error",
        metaKey: "meta",
        metaTotalKey: "total",
        metaFilteredKey: "filtered",
        optionsKey: "options",
        paramsKey: "params",
      },
      defaultSort: "",
      reorder: false,
      dir: "ltr",
      perPageValues: [10, 25, 50, 100, 250],
      columns: [],
      actions: [],
      collapseActions: false,
      selectable: false,
      selectVisibleOnly: true,
      defaultPage: 1,
      resizable: false,
      autosize: true,
      expand: false,
      autoheight: true,
      responsive: false,
    };
  }

  /**
   * @param {Plugins} list
   */
  static registerPlugins(list) {
    plugins = list;
  }

  static unregisterPlugins() {
    plugins = {};
  }

  /**
   * @returns {Plugins}
   */
  static plugins() {
    return plugins;
  }

  /**
   * @param {HTMLElement} el
   * @param {Object} definition
   */
  static applyColumnDefinition(el, definition) {
    if (definition.width) {
      el.setAttribute("width", definition.width);
    }
    if (definition.class) {
      el.setAttribute("class", definition.class);
    }
  }

  /**
   * @param {Object|Array} columns
   * @returns {Column[]}
   */
  convertColumns(columns) {
    let cols = [];
    // Convert key:value objects to actual columns
    if (typeof columns === "object" && !Array.isArray(columns)) {
      Object.keys(columns).forEach((key) => {
        let col = this.defaultColumn;
        col.title = columns[key];
        col.field = key;
        cols.push(col);
      });
    } else {
      columns.forEach((item) => {
        let col = this.defaultColumn;
        if (typeof item === "string") {
          col.title = item;
          col.field = item;
        } else if (typeof item === "object") {
          col = item;
          if (!col.field) {
            console.error("Invalid column definition", item);
          }
        } else {
          console.error("Column definition must be a string or an object");
        }
        cols.push(col);
      });
    }
    return cols;
  }

  /**
   * @link https://gist.github.com/WebReflection/ec9f6687842aa385477c4afca625bbf4#reflected-dom-attributes
   * @returns {Array}
   */
  static get observedAttributes() {
    return [
      "page",
      "data-filter",
      "data-sort",
      "data-debug",
      "data-reorder",
      "data-menu",
      "data-selectable",
      "data-url",
      "data-per-page",
      "data-responsive",
    ];
  }

  get transformAttributes() {
    return {
      columns: (v) => this.convertColumns(convertArray(v)),
      actions: (v) => convertArray(v),
      defaultPage: (v) => parseInt(v),
      perPage: (v) => parseInt(v),
    };
  }

  get page() {
    return parseInt(this.getAttribute("page"));
  }

  set page(val) {
    setAttribute(this, "page", this.constrainPageValue(val));
  }

  urlChanged() {
    this.loadData().then(() => {
      this.configureUi();
    });
  }

  constrainPageValue(v) {
    if (this.pages < v) {
      v = this.pages;
    }
    if (v < 1 || !v) {
      v = 1;
    }
    return v;
  }

  fixPage() {
    this.pages = this.totalPages();
    this.page = this.constrainPageValue(this.page);

    // Show current page in input
    setAttribute(this.inputPage, "max", this.pages);
    this.inputPage.value = "" + this.page;
    this.inputPage.disabled = this.pages === 1;
  }

  pageChanged() {
    this.reload();
  }

  responsiveChanged() {
    if (!plugins.ResponsiveGrid) {
      return;
    }
    if (this.options.responsive) {
      plugins.ResponsiveGrid.observe(this);
    } else {
      plugins.ResponsiveGrid.unobserve(this);
    }
  }

  menuChanged() {
    this.renderHeader();
  }

  /**
   * This is the callback for the select control
   */
  changePerPage() {
    this.options.perPage = parseInt(this.selectPerPage.options[this.selectPerPage.selectedIndex].value);
    this.perPageChanged();
  }

  /**
   * This is the actual event triggered on attribute change
   */
  perPageChanged() {
    // Refresh UI
    if (this.options.perPage !== parseInt(this.selectPerPage.options[this.selectPerPage.selectedIndex].value)) {
      this.perPageValuesChanged();
    }
    // Make sure current page is still valid
    let updatePage = this.page;
    while (updatePage > 1 && this.page * this.options.perPage > this.totalRecords()) {
      updatePage--;
    }
    if (updatePage != this.page) {
      this.page = updatePage;
    } else {
      this.reload(() => {
        // Scroll and keep a sizable amount of data displayed
        if (this.hasAttribute("sticky")) {
          window.scroll({ top: elementOffset(this.selectPerPage).top - this.defaultHeight });
        }
      });
    }
  }

  dirChanged() {
    setAttribute(this, "dir", this.options.dir);
  }

  defaultSortChanged() {
    this.sortChanged();
  }

  /**
   * Populate the select dropdown according to options
   */
  perPageValuesChanged() {
    if (!this.selectPerPage) {
      return;
    }
    while (this.selectPerPage.lastChild) {
      this.selectPerPage.removeChild(this.selectPerPage.lastChild);
    }
    this.options.perPageValues.forEach((v) => {
      addSelectOption(this.selectPerPage, v, v, v === this.options.perPage);
    });
  }

  _connected() {
    /**
     * @type {HTMLTableElement}
     */
    this.table = find(this, "table");
    /**
     * @type {HTMLInputElement}
     */
    this.btnFirst = find(this, ".dg-btn-first");
    /**
     * @type {HTMLInputElement}
     */
    this.btnPrev = find(this, ".dg-btn-prev");
    /**
     * @type {HTMLInputElement}
     */
    this.btnNext = find(this, ".dg-btn-next");
    /**
     * @type {HTMLInputElement}
     */
    this.btnLast = find(this, ".dg-btn-last");
    /**
     * @type {HTMLSelectElement}
     */
    this.selectPerPage = find(this, ".dg-select-per-page");
    /**
     * @type {HTMLInputElement}
     */
    this.inputPage = find(this, ".dg-input-page");

    this.getFirst = this.getFirst.bind(this);
    this.getPrev = this.getPrev.bind(this);
    this.getNext = this.getNext.bind(this);
    this.getLast = this.getLast.bind(this);
    this.changePerPage = this.changePerPage.bind(this);
    this.gotoPage = this.gotoPage.bind(this);

    this.btnFirst.addEventListener("click", this.getFirst);
    this.btnPrev.addEventListener("click", this.getPrev);
    this.btnNext.addEventListener("click", this.getNext);
    this.btnLast.addEventListener("click", this.getLast);
    this.selectPerPage.addEventListener("change", this.changePerPage);
    this.inputPage.addEventListener("input", this.gotoPage);

    for (const plugin in plugins) {
      plugins[plugin].connected(this);
    }

    // Display even if we don't have data
    this.dirChanged();
    this.perPageValuesChanged();

    this.loadData().finally(() => {
      this.configureUi();

      this.sortChanged();
      this.filterChanged();
      this.reorderChanged();

      this.dirChanged();
      this.perPageValuesChanged();
      this.pageChanged();

      this.classList.add("dg-initialized");
      this.fireEvents = true; // We can now fire attributeChangedCallback events

      this.log("initialized");
    });
  }

  _disconnected() {
    this.btnFirst.removeEventListener("click", this.getFirst);
    this.btnPrev.removeEventListener("click", this.getPrev);
    this.btnNext.removeEventListener("click", this.getNext);
    this.btnLast.removeEventListener("click", this.getLast);
    this.selectPerPage.removeEventListener("change", this.changePerPage);
    this.inputPage.removeEventListener("input", this.gotoPage);

    for (const plugin in plugins) {
      plugins[plugin].disconnected(this);
    }
  }

  getCol(field) {
    let found = null;
    this.options.columns.forEach((col) => {
      if (col.field == field) {
        found = col;
      }
    });
    return found;
  }

  getColProp(field, prop) {
    const c = this.getCol(field);
    return c ? c[prop] : null;
  }

  setColProp(field, prop, val) {
    const c = this.getCol(field);
    if (c) {
      c[prop] = val;
    }
  }

  visibleColumns() {
    return this.options.columns.filter((col) => {
      return !col.hidden;
    });
  }

  hiddenColumns() {
    return this.options.columns.filter((col) => {
      return col.hidden === true;
    });
  }

  showColumn(field, render = true) {
    this.setColProp(field, "hidden", false);

    // We need to render the whole table otherwise layout fixed won't do its job
    if (render) this.renderTable();

    dispatch(this, "columnVisibility", {
      col: field,
      visibility: "visible",
    });
  }

  hideColumn(field, render = true) {
    this.setColProp(field, "hidden", true);

    // We need to render the whole table otherwise layout fixed won't do its job
    if (render) this.renderTable();

    dispatch(this, "columnVisibility", {
      col: field,
      visibility: "hidden",
    });
  }

  /**
   * Returns the starting index of actual data
   * @returns {Number}
   */
  startColIndex() {
    return this.options.selectable && plugins.SelectableRows ? 2 : 1;
  }

  hasActions() {
    return this.options.actions.length > 0;
  }

  get actionClass() {
    if (this.options.actions.length < 3 && !this.options.collapseActions) {
      return "dg-actions-" + this.options.actions.length;
    }
    return "dg-actions-more";
  }

  /**
   * @param {Boolean} visibleOnly
   * @returns {Number}
   */
  columnsLength(visibleOnly = false) {
    let len = 0;
    this.options.columns.forEach((col) => {
      if (visibleOnly && col.hidden) {
        return;
      }
      if (!col.attr) {
        len++;
      }
    });
    if (this.options.selectable && plugins.SelectableRows) {
      len++;
    }
    if (this.options.actions.length) {
      len++;
    }
    return len;
  }

  /**
   * Global configuration and renderTable
   * This should be called after your data has been loaded
   */
  configureUi() {
    setAttribute(this.querySelector("table"), "aria-rowcount", this.data.length);

    this.table.style.visibility = "hidden";
    this.renderTable();
    if (this.options.responsive && plugins.ResponsiveGrid) {
      // Let the observer make the table visible
    } else {
      this.table.style.visibility = "visible";
    }

    // Store row height for later usage
    if (!this.rowHeight) {
      const tr = this.querySelector("tbody tr") || this.querySelector("table tr");
      if (tr instanceof HTMLTableRowElement) {
        this.rowHeight = tr.offsetHeight;
      }
    }
  }

  filterChanged() {
    const row = this.querySelector("thead tr.dg-head-filters");
    if (this.options.filter) {
      removeAttribute(row, "hidden");
    } else {
      this.clearFilters();
      setAttribute(row, "hidden", "");
    }
  }

  reorderChanged() {
    this.querySelectorAll("thead tr.dg-head-columns th").forEach((th) => {
      if (th.classList.contains("dg-selectable") || th.classList.contains("dg-actions")) {
        return;
      }
      if (!(th instanceof HTMLTableRowElement)) {
        return;
      }
      if (this.options.reorder && plugins.DraggableHeaders) {
        th.draggable = true;
      } else {
        th.removeAttribute("draggable");
      }
    });
  }

  sortChanged() {
    this.log("toggle sort");

    this.querySelectorAll("thead tr.dg-head-columns th").forEach((th) => {
      const fieldName = th.getAttribute("field");
      if (th.classList.contains("dg-not-sortable") || (!this.fireEvents && fieldName == this.options.defaultSort)) {
        return;
      }
      if (this.options.sort && !this.getColProp(fieldName, "noSort")) {
        setAttribute(th, "aria-sort", "none");
      } else {
        removeAttribute(th, "aria-sort");
      }
    });
  }

  selectableChanged() {
    this.renderTable();
  }

  addRow(row) {
    this.log("Add row");
    this.originalData.push(row);
    this.data = this.originalData.slice();
    this.sortData();
  }

  /**
   * @param {any} value Value to remove. Defaults to last row.
   * @param {String} key The key of the item to remove. Defaults to first column
   */
  removeRow(value = null, key = null) {
    if (key === null) {
      key = this.options.columns[0]["field"];
    }
    if (value === null) {
      value = this.originalData[this.originalData.length - 1][key];
    }
    this.log("Removing " + key + ":" + value);
    for (let i = 0; i < this.originalData.length; i++) {
      if (this.originalData[i][key] === value) {
        this.originalData.splice(i, 1);
        break;
      }
    }
    this.data = this.originalData.slice();
    this.sortData();
  }

  /**
   * @param {String} key Return a specific key (eg: id) instead of the whole row
   * @returns {Array}
   */
  getSelection(key = null) {
    if (!plugins.SelectableRows) {
      return [];
    }
    return plugins.SelectableRows.getSelection(this, key);
  }

  getData() {
    return this.originalData;
  }

  clearData() {
    // Already empty
    if (this.data.length === 0) {
      return;
    }
    this.data = this.originalData = [];
    this.renderBody();
    // Recompute height if needed
    plugins.FixedHeight && plugins.FixedHeight.computeDefaultHeight(this);
  }

  refresh(cb = null) {
    this.data = this.originalData = [];
    return this.reload(cb);
  }

  reload(cb = null) {
    this.log("reload");

    // If the data was cleared, we need to render again
    const needRender = this.originalData.length === 0;
    this.fixPage();
    this.loadData().finally(() => {
      // If we load data from the server, we redraw the table body
      // Otherwise, we just need to paginate
      this.options.server || needRender ? this.renderBody() : this.paginate();

      // Recompute height if needed
      // plugins.FixedHeight && plugins.FixedHeight.computeDefaultHeight(this);
      if (cb) {
        cb();
      }
    });
  }

  /**
   * @returns {Promise}
   */
  loadData() {
    // We already have some data
    if (this.originalData.length) {
      // We don't use server side data
      if (!this.options.server || (this.options.server && !this.fireEvents)) {
        // if (!this.options.server) {
        this.log("skip loadData");
        return new Promise((resolve) => {
          resolve();
        });
      }
    }
    this.log("loadData");
    this.loading = true;
    this.classList.add("dg-loading");
    return this.fetchData()
      .then((response) => {
        this.classList.remove("dg-loading");
        this.loading = false;

        // We can get a straight array or an object
        if (Array.isArray(response)) {
          this.data = response;
        } else {
          // Object must contain data key
          if (response[this.options.serverParams.errorKey]) {
            this.querySelector("tbody").setAttribute(
              "data-empty",
              response[this.options.serverParams.errorKey].replace(/^\s+|\r\n|\n|\r$/g, "")
            );
            this.removeAttribute("data-url");
            return;
          }
          if (!response[this.options.serverParams.dataKey]) {
            console.error("Invalid response, it should contain a data key with an array or be a plain array", response);
            this.options.url = null;
            return;
          }

          // We may have a config object
          this.options = Object.assign(this.options, response[this.options.serverParams.optionsKey] ?? {});
          // It should return meta data (see metaFilteredKey)
          this.meta = response[this.options.serverParams.metaKey] ?? {};

          this.data = response[this.options.serverParams.dataKey];
        }
        this.originalData = this.data.slice();
        this.fixPage();

        // Make sure we have a proper set of columns
        if (this.options.columns.length === 0 && this.originalData.length) {
          this.options.columns = this.convertColumns(Object.keys(this.originalData[0]));
        }
      })
      .catch((err) => {
        this.log(err);
      });
  }

  getFirst() {
    if (this.loading) {
      return;
    }
    this.page = 1;
  }

  getLast() {
    if (this.loading) {
      return;
    }
    this.page = this.pages;
  }

  getPrev() {
    if (this.loading) {
      return;
    }
    this.page = this.page - 1;
  }

  getNext() {
    if (this.loading) {
      return;
    }
    this.page = this.page + 1;
  }

  gotoPage(event) {
    if (event.type === "keypress") {
      const key = event.keyCode || event.key;
      if (key === 13 || key === "Enter") {
        event.preventDefault();
      } else {
        return;
      }
    }
    this.page = parseInt(this.inputPage.value);
  }

  getSort() {
    let col = this.querySelector("thead tr.dg-head-columns th[aria-sort$='scending']");
    if (col) {
      return col.getAttribute("field");
    }
    return this.options.defaultSort;
  }

  getSortDir() {
    let col = this.querySelector("thead tr.dg-head-columns th[aria-sort$='scending']");
    if (col) {
      return col.getAttribute("aria-sort") || "";
    }
    return "";
  }

  getFilters() {
    let filters = [];
    this.querySelectorAll("thead tr.dg-head-filters input").forEach((input) => {
      if (input instanceof HTMLInputElement) {
        filters[input.dataset.name] = input.value;
      }
    });
    return filters;
  }

  clearFilters() {
    this.querySelectorAll("thead tr.dg-head-filters input").forEach((input) => {
      if (input instanceof HTMLInputElement) {
        input.value = "";
      }
    });
    this.filterData();
  }

  filterData() {
    this.log("filter data");

    this.page = 1;

    if (this.options.server) {
      this.reload();
    } else {
      this.data = this.originalData.slice();

      // Look for rows matching the filters
      this.querySelectorAll("thead tr.dg-head-filters input").forEach((input) => {
        if (!(input instanceof HTMLInputElement)) {
          return;
        }
        let value = input.value;
        if (value) {
          let name = input.dataset.name;
          this.data = this.data.filter((item) => {
            let str = item[name] + "";
            return str.toLowerCase().indexOf(value.toLowerCase()) !== -1;
          });
        }
      });
      this.pageChanged();

      let col = this.querySelector("thead tr.dg-head-columns th[aria-sort$='scending']");
      if (this.options.sort && col) {
        this.sortData();
      } else {
        this.renderBody();
      }
    }
  }

  /**
   * Data will be sorted then rendered using renderBody
   * @param {Element} col The column that was clicked or null to use current sort
   */
  sortData(col = null) {
    this.log("sort data");

    // Early exit
    if (col && this.getColProp(col.getAttribute("field"), "noSort")) {
      this.log("sorting prevented because column is not sortable");
      return;
    }
    if (this.isResizing) {
      this.log("sorting prevented because resizing");
      return;
    }
    if (this.loading) {
      this.log("sorting prevented because loading");
      return;
    }

    // We clicked on a column, update sort state
    if (col !== null) {
      // Remove active sort if any
      this.querySelectorAll("thead tr:first-child th").forEach((th) => {
        if (th.classList.contains("dg-selectable") || th.classList.contains("dg-actions")) {
          return;
        }
        if (th !== col) {
          th.setAttribute("aria-sort", "none");
        }
      });

      // Set tristate col
      if (!col.hasAttribute("aria-sort") || col.getAttribute("aria-sort") === "none") {
        col.setAttribute("aria-sort", "ascending");
      } else if (col.getAttribute("aria-sort") === "ascending") {
        col.setAttribute("aria-sort", "descending");
      } else if (col.getAttribute("aria-sort") === "descending") {
        col.setAttribute("aria-sort", "none");
      }
    } else {
      // Or fetch current sort
      col = this.querySelector("thead tr.dg-head-columns th[aria-sort$='scending']");
    }

    if (this.options.server) {
      // Reload data with updated sort
      this.loadData().finally(() => {
        this.renderBody();
      });
    } else {
      const sort = col ? col.getAttribute("aria-sort") : "none";
      if (sort === "none") {
        let stack = [];

        // Restore order while keeping filters
        this.originalData.some((itemA) => {
          this.data.some((itemB) => {
            if (JSON.stringify(itemA) === JSON.stringify(itemB)) {
              stack.push(itemB);
              return true;
            }
            return false;
          });
          return stack.length === this.data.length;
        });

        this.data = stack;
      } else {
        const field = col.getAttribute("field");
        this.data.sort((a, b) => {
          if (!isNaN(a[field]) && !isNaN(b[field])) {
            return sort === "ascending" ? a[field] - b[field] : b[field] - a[field];
          }
          const valA = sort === "ascending" ? a[field].toUpperCase() : b[field].toUpperCase();
          const valB = sort === "ascending" ? b[field].toUpperCase() : a[field].toUpperCase();

          switch (true) {
            case valA > valB:
              return 1;
            case valA < valB:
              return -1;
            case valA === valB:
              return 0;
          }
        });
      }
      this.renderBody();
    }
  }

  fetchData() {
    if (!this.options.url) {
      return new Promise((resolve, reject) => reject("No url set"));
    }

    let base = window.location.href;
    // Fix trailing slash if no extension is present
    if (!base.split("/").pop().includes(".")) {
      base += base.endsWith("/") ? "" : "/";
    }
    let url = new URL(this.options.url, base);
    let params = {
      r: Date.now(),
    };
    if (this.options.server) {
      // 0 based
      params[this.options.serverParams.start] = this.page - 1;
      params[this.options.serverParams.length] = this.options.perPage;
      params[this.options.serverParams.search] = this.getFilters();
      params[this.options.serverParams.sort] = this.getSort() || "";
      params[this.options.serverParams.sortDir] = this.getSortDir();

      // extra params ?
      if (this.meta[this.options.serverParams.paramsKey]) {
        params = Object.assign(params, this.meta[this.options.serverParams.paramsKey]);
      }
    }

    appendParamsToUrl(url, params);

    return fetch(url)
      .then((response) => {
        if (!response.ok) {
          throw new Error(response.statusText);
        }
        return response.json();
      })
      .catch((err) => {
        return {
          error: err.message,
        };
      });
  }

  renderTable() {
    this.log("render table");

    if (this.options.menu && plugins.ContextMenu) {
      plugins.ContextMenu.createMenu(this);
    }

    let sortedColumn;

    this.renderHeader();
    if (this.options.defaultSort) {
      // We can have a default sort even with sort disabled
      sortedColumn = this.querySelector("thead tr.dg-head-columns th[field='" + this.options.defaultSort + "']");
    }

    if (sortedColumn) {
      this.sortData(sortedColumn);
    } else {
      this.renderBody();
    }

    this.renderFooter();
  }

  /**
   * Create table header
   * - One row for the column headers
   * - One row for the filters
   */
  renderHeader() {
    this.log("render header");

    const thead = this.querySelector("thead");
    this.createColumnHeaders(thead);
    this.createColumnFilters(thead);

    if (this.options.resizable && plugins.ColumnResizer) {
      plugins.ColumnResizer.renderResizer(this, labels.resizeColumn);
    }

    this.dispatchEvent(new CustomEvent("headerRendered"));
  }

  renderFooter() {
    this.log("render footer");

    const tfoot = this.querySelector("tfoot");
    const td = tfoot.querySelector("td");
    tfoot.removeAttribute("hidden");
    setAttribute(td, "colspan", this.columnsLength(true));
    tfoot.style.display = "";
  }

  /**
   * Create the column headers based on column definitions and set options
   * @param {HTMLTableSectionElement} thead
   */
  createColumnHeaders(thead) {
    // @link https://stackoverflow.com/questions/21064101/understanding-offsetwidth-clientwidth-scrollwidth-and-height-respectively
    // const computedStyles = getComputedStyle(this.table);
    // const scrollbarWidth = this.offsetWidth - this.clientWidth - parseInt(computedStyles.borderLeftWidth) - parseInt(computedStyles.borderRightWidth);
    const scrollbarWidth = 8;
    const availableWidth = this.clientWidth;
    const colMaxWidth = Math.round((availableWidth / this.columnsLength(true)) * 2);

    let idx = 0;
    let tr;

    // Create row
    tr = document.createElement("tr");
    this.headerRow = tr;
    tr.setAttribute("role", "row");
    tr.setAttribute("aria-rowindex", "1");
    tr.setAttribute("class", "dg-head-columns");

    if (this.options.selectable && plugins.SelectableRows) {
      plugins.SelectableRows.createHeaderCol(this, tr);
    }

    // We need a real th from the dom to compute the size
    let sampleTh = thead.querySelector("tr.dg-head-columns th");
    if (!sampleTh) {
      sampleTh = document.createElement("th");
      thead.querySelector("tr").appendChild(sampleTh);
    }

    // Create columns
    idx = 0;
    let totalWidth = 0;
    this.options.columns.forEach((column) => {
      if (column.attr) {
        return;
      }
      const colIdx = idx + this.startColIndex();
      let th = document.createElement("th");
      th.setAttribute("scope", "col");
      th.setAttribute("role", "columnheader button");
      th.setAttribute("aria-colindex", "" + colIdx);
      th.setAttribute("id", randstr("dg-col-"));
      if (this.options.sort) {
        th.setAttribute("aria-sort", "none");
      }
      th.setAttribute("field", column.field);
      if (plugins.ResponsiveGrid) {
        setAttribute(th, "data-responsive", column.responsive);
      }
      // Make sure the header fits (+ add some room for sort icon if necessary)
      const computedWidth = getTextWidth(column.title, sampleTh, true) + 20;
      th.dataset.minWidth = "" + computedWidth;
      DataGrid.applyColumnDefinition(th, column);
      th.tabIndex = 0;
      th.textContent = column.title;

      let w = 0;
      // Autosize small based on first/last row ?
      // Take into account minWidth of the header and max available size based on col numbers
      if (this.options.autosize && plugins.AutosizeColumn) {
        const colAvailableWidth = Math.min(availableWidth - totalWidth, colMaxWidth);
        w = plugins.AutosizeColumn.autosizeColumn(this, th, column, parseInt(th.dataset.minWidth), colAvailableWidth);
      } else {
        w = Math.max(parseInt(th.dataset.minWidth), parseInt(th.getAttribute("width")));
      }

      setAttribute(th, "width", w);
      if (column.hidden) {
        th.setAttribute("hidden", "");
      } else {
        totalWidth += w;
      }

      // Reorder columns with drag/drop
      if (this.options.reorder && plugins.DraggableHeaders) {
        plugins.DraggableHeaders.makeHeaderDraggable(this, th);
      }

      tr.appendChild(th);
      idx++;
    });

    // There is too much available width, and we want to avoid fixed layout to split remaining amount
    if (totalWidth <= availableWidth) {
      const visibleCols = findAll(tr, "th:not([hidden])");
      if (visibleCols.length) {
        const lastCol = visibleCols[visibleCols.length - 1];
        removeAttribute(lastCol, "width");
      }
    }

    // Actions
    if (this.options.actions.length) {
      let actionsTh = document.createElement("th");
      setAttribute(actionsTh, "role", "columnheader button");
      setAttribute(actionsTh, "aria-colindex", this.columnsLength(true));
      actionsTh.classList.add(...["dg-actions", "dg-not-sortable", "dg-not-resizable", this.actionClass]);
      actionsTh.tabIndex = 0;
      tr.appendChild(actionsTh);
    }

    thead.replaceChild(tr, thead.querySelector("tr.dg-head-columns"));

    // Once columns are inserted, we have an actual dom to query
    if (thead.offsetWidth > availableWidth) {
      this.log("adjust width to fix size");
      let diff = thead.offsetWidth - availableWidth - scrollbarWidth;
      if (this.options.responsive && plugins.ResponsiveGrid) {
        diff += scrollbarWidth;
      }
      // Remove diff for columns that can afford it
      tr.querySelectorAll("th[width]").forEach((th) => {
        if (hasClass(th, "dg-not-resizable")) {
          return;
        }
        if (diff <= 0) {
          return;
        }
        const col = asElement(th);
        const actualWidth = parseInt(col.getAttribute("width"));
        const minWidth = col.dataset.minWidth ? parseInt(col.dataset.minWidth) : 0;
        if (actualWidth > minWidth) {
          let newWidth = actualWidth - diff;
          if (newWidth < minWidth) {
            newWidth = minWidth;
          }
          diff -= actualWidth - newWidth;

          setAttribute(th, "width", newWidth);
        }
      });
    }

    // Context menu
    if (this.options.menu && plugins.ContextMenu) {
      plugins.ContextMenu.attachContextMenu(this);
    }

    // Sort col on click
    tr.querySelectorAll("[aria-sort]").forEach((sortableRow) => {
      sortableRow.addEventListener("click", () => this.sortData(sortableRow));
    });

    setAttribute(this.querySelector("table"), "aria-colcount", this.columnsLength(true));
  }

  createColumnFilters(thead) {
    let idx = 0;
    let tr;

    // Create row for filters
    tr = document.createElement("tr");
    this.filterRow = tr;
    tr.setAttribute("role", "row");
    tr.setAttribute("aria-rowindex", "2");
    tr.setAttribute("class", "dg-head-filters");
    if (!this.options.filter) {
      tr.setAttribute("hidden", "");
    }

    // Selectable
    if (this.options.selectable && plugins.SelectableRows) {
      plugins.SelectableRows.createFilterCol(this, tr);
    }

    this.options.columns.forEach((column) => {
      if (column.attr) {
        return;
      }
      const colIdx = idx + this.startColIndex();
      let relatedTh = thead.querySelector("tr.dg-head-columns th[aria-colindex='" + colIdx + "']");
      if (!relatedTh) {
        console.warn("Related th not found", colIdx);
        return;
      }
      let th = document.createElement("th");
      th.setAttribute("aria-colindex", "" + colIdx);

      let input = document.createElement("input");
      input.type = "text";
      input.autocomplete = "off";
      input.spellcheck = false;
      // Allows binding filter to this column
      input.dataset.name = column.field;
      input.id = randstr("dg-filter-");
      // Don't use aria-label as it triggers autocomplete
      input.setAttribute("aria-labelledby", relatedTh.getAttribute("id"));
      if (!this.options.filter) {
        th.tabIndex = 0;
      } else {
        input.tabIndex = 0;
      }

      if (column.hidden) {
        th.setAttribute("hidden", "");
      }

      th.appendChild(input);
      tr.appendChild(th);
      idx++;
    });

    // Actions
    if (this.options.actions.length) {
      let actionsTh = document.createElement("th");
      actionsTh.setAttribute("role", "columnheader button");
      actionsTh.setAttribute("aria-colindex", "" + this.columnsLength(true));
      actionsTh.classList.add(...["dg-actions", this.actionClass]);
      actionsTh.tabIndex = 0;
      tr.appendChild(actionsTh);
    }

    thead.replaceChild(tr, thead.querySelector("tr.dg-head-filters"));

    // Filter content on enter
    tr.querySelectorAll("input").forEach((input) => {
      input.addEventListener("keypress", (e) => {
        const key = e.keyCode || e.key;
        if (key === 13 || key === "Enter") {
          this.filterData.call(this);
        }
      });
    });
  }

  /**
   * Render the data as rows in tbody
   * It will call paginate() at the end
   */
  renderBody() {
    this.log("render body");
    let tr;
    let td;
    let idx;
    let tbody = document.createElement("tbody");

    this.data.forEach((item, i) => {
      tr = document.createElement("tr");
      setAttribute(tr, "role", "row");
      setAttribute(tr, "hidden", "");
      setAttribute(tr, "aria-rowindex", i + 1);
      tr.tabIndex = 0;

      // Selectable
      if (this.options.selectable && plugins.SelectableRows) {
        plugins.SelectableRows.createDataCol(this, tr);
      }

      // Expandable
      if (this.options.expand) {
        tr.classList.add("dg-expandable");
        tr.addEventListener("click", function () {
          this.classList.toggle("dg-expanded");
        });
      }

      idx = 0;
      this.options.columns.forEach((column) => {
        if (!column) {
          console.log(this.options.columns);
        }
        // It should be applied as an attr of the row
        if (column.attr) {
          tr.setAttribute(column.attr, item[column.field]);
          return;
        }
        td = document.createElement("td");
        td.setAttribute("role", "gridcell");
        td.setAttribute("aria-colindex", idx + this.startColIndex());
        DataGrid.applyColumnDefinition(td, column);
        td.setAttribute("data-name", column.title);
        td.tabIndex = -1;

        // Inline editing
        if (column.editable) {
          let input = document.createElement("input");
          input.type = "text";
          input.autocomplete = "off";
          input.spellcheck = false;
          input.tabIndex = 0;
          input.classList.add("dg-editable");
          input.name = this.getAttribute("id").replace("-", "_") + "[" + (i + 1) + "]" + "[" + column.field + "]";
          input.value = item[column.field];
          input.dataset.field = column.field;

          input.addEventListener("click", (ev) => ev.stopPropagation());
          input.addEventListener("keypress", (ev) => {
            if (ev.type === "keypress") {
              const key = ev.keyCode || ev.key;
              if (key === 13 || key === "Enter") {
                input.blur();
              }
            }
          });
          input.addEventListener("blur", () => {
            // Only fire on update
            if (input.value == item[input.dataset.field]) {
              return;
            }
            // Update underlying data
            item[input.dataset.field] = input.value;
            // Notify
            dispatch(this, "edit", {
              data: item,
              value: input.value,
            });
          });
          td.appendChild(input);
        } else {
          td.textContent = item[column.field];
        }
        if (column.hidden) {
          setAttribute(td, "hidden", "");
        }
        tr.appendChild(td);
        idx++;
      });

      // Actions
      if (this.options.actions.length) {
        td = document.createElement("td");
        setAttribute(td, "role", "gridcell");
        setAttribute(td, "aria-colindex", this.columnsLength(true));
        td.classList.add(...["dg-actions", this.actionClass]);
        td.tabIndex = 0;

        // Add menu toggle
        let actionsToggle = document.createElement("button");
        actionsToggle.classList.add("dg-actions-toggle");
        actionsToggle.innerHTML = "☰";
        td.appendChild(actionsToggle);
        actionsToggle.addEventListener("click", (ev) => {
          if (ev.target instanceof HTMLElement) {
            ev.target.parentElement.classList.toggle("dg-actions-expand");
          }
        });

        this.options.actions.forEach((action) => {
          let button = document.createElement("button");
          if (action.html) {
            button.innerHTML = action.html;
          } else {
            button.innerText = action.title ?? action.name;
          }
          if (action.title) {
            button.title = action.title;
          }
          if (action.url) {
            button.type = "submit";
            button.formAction = interpolate(action.url, item);
          }
          if (action.class) {
            button.classList.add(...action.class.split(" "));
          }
          const actionHandler = (ev) => {
            ev.stopPropagation();
            if (action.confirm) {
              let c = confirm(labels.areYouSure);
              if (!c) {
                ev.preventDefault();
                return;
              }
            }
            dispatch(this, "action", {
              data: item,
              action: action.name,
            });
          };
          button.addEventListener("click", actionHandler);
          td.appendChild(button);

          // Row action
          if (action.default) {
            tr.classList.add("dg-actionable");
            tr.addEventListener("click", actionHandler);
          }
        });

        tr.appendChild(td);
      }

      tbody.appendChild(tr);
    });

    tbody.setAttribute("role", "rowgroup");

    // Keep data empty message
    const prev = this.querySelector("tbody");
    tbody.setAttribute("data-empty", prev.getAttribute("data-empty"));
    this.querySelector("table").replaceChild(tbody, prev);

    if (plugins.FixedHeight) {
      plugins.FixedHeight.createFakeRow(this);
    }

    this.paginate();

    if (plugins.SelectableRows) {
      plugins.SelectableRows.shouldSelectAll(this, tbody);
    }

    this.dispatchEvent(new CustomEvent("bodyRendered"));
  }

  paginate() {
    this.log("paginate");

    const total = this.totalRecords();
    const p = this.page || 1;

    let index;
    let high = p * this.options.perPage;
    let low = high - this.options.perPage + 1;
    const tbody = this.querySelector("tbody");
    const tfoot = this.querySelector("tfoot");

    if (high > total) {
      high = total;
    }
    if (!total) {
      low = 0;
    }

    // Display all rows within the set indexes
    // For server side paginated grids, we display everything
    // since the server is taking care of actual pagination
    tbody.querySelectorAll("tr").forEach((tr) => {
      if (this.options.server) {
        removeAttribute(tr, "hidden");
        return;
      }
      index = Number(getAttribute(tr, "aria-rowindex"));
      if (index > high || index < low) {
        setAttribute(tr, "hidden", "");
      } else {
        removeAttribute(tr, "hidden");
      }
    });

    if (this.options.selectable && plugins.SelectableRows) {
      plugins.SelectableRows.clearCheckboxes(this, tbody);
    }

    // Store default height and update styles if needed
    if (plugins.FixedHeight) {
      if (this.defaultHeight == 0) {
        plugins.FixedHeight.computeDefaultHeight(this);
      }
      plugins.FixedHeight.updateFakeRow(this);
    }

    // Enable/disable buttons if shown
    if (this.btnFirst) {
      this.btnFirst.disabled = this.page <= 1;
      this.btnPrev.disabled = this.page <= 1;
      this.btnNext.disabled = this.page >= this.pages;
      this.btnLast.disabled = this.page >= this.pages;
    }
    tfoot.querySelector(".dg-low").textContent = low.toString();
    tfoot.querySelector(".dg-high").textContent = high.toString();
    tfoot.querySelector(".dg-total").textContent = this.totalRecords();
  }

  totalPages() {
    return Math.ceil(this.totalRecords() / this.options.perPage);
  }

  totalRecords() {
    if (this.options.server) {
      return this.meta[this.options.serverParams.metaFilteredKey] || 0;
    }
    return this.data.length;
  }
}

export default DataGrid;
