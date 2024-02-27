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
import interpolate from "./utils/interpolate.js";
import getTextWidth from "./utils/getTextWidth.js";
import randstr from "./utils/randstr.js";
import {
  dispatch,
  find,
  findAll,
  hasClass,
  removeAttribute,
  getAttribute,
  setAttribute,
  addClass,
  toggleClass,
  on,
  ce,
} from "./utils/shortcuts.js";

/**
 * Column definition
 * @typedef Column
 * @property {String} field - the key in the data
 * @property {String} title - the title to display in the header (defaults to "field" if not set)
 * @property {Number} [width] - the width of the column (auto otherwise)
 * @property {String} [class] - class to set on the column (target body or header with th.class or td.class)
 * @property {String} [attr] - don't render the column and set a matching attribute on the row with the value of the field
 * @property {Boolean} [hidden] - hide the column
 * @property {Boolean} [noSort] - allow disabling sort for a given column
 * @property {String | Function} [format] - custom data formatting
 * @property {String} [defaultFormatValue] - default value to use for formatting
 * @property {String} [transform] - custom value transformation
 * @property {Boolean} [editable] - replace with input (EditableColumn module)
 * @property {String} [editableType] - type of input (EditableColumn module)
 * @property {Number} [responsive] - the higher the value, the sooner it will be hidden, disable with 0 (ResponsiveGrid module)
 * @property {Boolean} [responsiveHidden] - hidden through responsive module (ResponsiveGrid module)
 * @property {String} [filterType] - defines a filter field type ("text" or "select" - defaults to "text")
 * @property {Array} [filterList] - defines a custom array to populate a filter select field in the format of [{value: "", text: ""},...]. When defined, it overrides the default behaviour where the filter select elements are populated by the unique values from the corresponding column records.
 * @property {Object} [firstFilterOption] - defines an object for the first option element of the filter select field. defaults to {value: "", text: ""}
 */

/**
 * Row action
 * @typedef Action
 * @property {String} title - the title of the button
 * @property {String} name - the name of the action
 * @property {String} class - the class for the button
 * @property {String} url - link for the action
 * @property {String} html - custom button data
 * @property {Boolean} [confirm] - needs confirmation
 * @property {Boolean} default - is the default row action
 */

/** @typedef {import('./plugins/autosize-column').default} AutosizeColumn */
/** @typedef {import('./plugins/column-resizer').default} ColumnResizer */
/** @typedef {import('./plugins/context-menu').default} ContextMenu */
/** @typedef {import('./plugins/draggable-headers').default} DraggableHeaders */
/** @typedef {import('./plugins/editable-column').default} EditableColumn */
/** @typedef {import('./plugins/fixed-height').default} FixedHeight */
/** @typedef {import('./plugins/responsive-grid').default} ResponsiveGrid */
/** @typedef {import('./plugins/row-actions').default} RowActions */
/** @typedef {import('./plugins/selectable-rows').default} SelectableRows */
/** @typedef {import('./plugins/touch-support').default} TouchSupport */
/** @typedef {import('./plugins/spinner-support').default} SpinnerSupport */

/**
 * These plugins are all optional
 * @typedef {Object} Plugins
 * @property {ColumnResizer} [ColumnResizer] resize handlers in the headers
 * @property {ContextMenu} [ContextMenu] menu to show/hide columns
 * @property {DraggableHeaders} [DraggableHeaders] draggable headers columns
 * @property {EditableColumn} [EditableColumn] draggable headers columns
 * @property {TouchSupport} [TouchSupport] touch swipe
 * @property {SelectableRows} [SelectableRows] create a column with checkboxes to select rows
 * @property {FixedHeight} [FixedHeight] allows having fixed height tables
 * @property {AutosizeColumn} [AutosizeColumn] compute ideal width based on column content
 * @property {ResponsiveGrid} [ResponsiveGrid] hide/show column on the fly
 * @property {RowActions} [RowActions] add action on rows
 * @property {SpinnerSupport} [SpinnerSupport] inserts a spinning icon element to indicate grid loading.
 */

/**
 * Parameters to pass along or receive from the server
 * @typedef ServerParams
 * @property {String} serverParams.start
 * @property {String} serverParams.length
 * @property {String} serverParams.search
 * @property {String} serverParams.sort
 * @property {String} serverParams.sortDir
 * @property {String} serverParams.dataKey
 * @property {String} serverParams.metaKey
 * @property {String} serverParams.metaTotalKey
 * @property {String} serverParams.metaFilteredKey
 * @property {String} serverParams.optionsKey
 * @property {String} serverParams.paramsKey
 */

/**
 * Available data grid options, plugins included
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
 * @property {Boolean} hidePerPage Hides the page size select element
 * @property {Column[]} columns Available columns
 * @property {Number} defaultPage Starting page
 * @property {Number} perPage Number of records displayed per page (page size)
 * @property {Boolean} expand  Allow cell content to spawn over multiple lines
 * @property {Action[]} actions Row actions (RowActions module)
 * @property {Boolean} collapseActions Group actions (RowActions module)
 * @property {Boolean} resizable Make columns resizable (ColumnResizer module)
 * @property {Boolean} selectable Allow selecting rows with a checkbox (SelectableRows module)
 * @property {Boolean} selectVisibleOnly Select all only selects visible rows (SelectableRows module)
 * @property {Boolean} autosize Compute column sizes based on given data (Autosize module)
 * @property {Boolean} autoheight Adjust height so that it matches table size (FixedHeight module)
 * @property {Boolean} autohidePager auto-hides the pager when number of records falls below the selected page size
 * @property {Boolean} menu Right click menu on column headers (ContextMenu module)
 * @property {Boolean} reorder Allows a column reordering functionality (DraggableHeaders module)
 * @property {Boolean} responsive Change display mode on small screens (ResponsiveGrid module)
 * @property {Boolean} responsiveToggle Show toggle column (ResponsiveGrid module)
 * @property {Boolean} filterOnEnter Toggles the ability to filter column data by pressing the Enter or Return key 
 * @property {String} spinnerClass Sets a space-delimited string of css classes for a spinner (use spinner-border css class for bootstrap 5 spinner)
 */

/**
 * Available labels that can be translated
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
 * @property {String} networkError
 */

/**
 * List of registered plugins
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
  networkError: "Network response error",
};

/**
 * Column definition will update some props on the html element
 * @param {HTMLElement} el
 * @param {Column} column
 */
function applyColumnDefinition(el, column) {
  if (column.width) {
    setAttribute(el, "width", column.width);
  }
  if (column.class) {
    addClass(el, column.class);
  }
  if (column.hidden) {
    setAttribute(el, "hidden", "");
    if (column.responsiveHidden) {
      addClass(el, "dg-responsive-hidden");
    }
  }
}

/**
 */
class DataGrid extends BaseElement {
  #filterSelector = "[id^=dg-filter]";

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
    this.originalData; // declared uninitialized to allow data preloading before fetch.

    // Make the IDE happy
    /**
     * @type {Options}
     */
    this.options = this.options || this.defaultOptions;

    // Init values
    this.fireEvents = false;
    this.page = this.options.defaultPage || 1;
    this.pages = 0;
    this.meta; // declared uninitialized to allow data preloading before fetch.
    /**
     * @type {Plugins}
     */
    this.plugins = {};
    // Init plugins
    for (const [pluginName, pluginClass] of Object.entries(plugins)) {
      // @ts-ignore until we can set typeof import ...
      this.plugins[pluginName] = new pluginClass(this);
    }

    // Expose options as observed attributes in the dom
    // Do it when fireEvents is disabled to avoid firing change callbacks
    for (const attr of DataGrid.observedAttributes) {
      if (attr.indexOf("data-") === 0) {
        setAttribute(this, attr, this.options[camelize(attr.slice(5))]);
      }
    }

    // Inserts spinner
    if (this.options.spinnerClass && this.plugins.SpinnerSupport)
      this.plugins.SpinnerSupport.add();
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
   * @returns {Labels}
   */
  get labels() {
    return labels;
  }

  /**
   * @returns {Labels}
   */
  static getLabels() {
    return labels;
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
      responsiveHidden: false,
      format: "",
      transform: "",
      filterType: "text",
      firstFilterOption: { value: "", text: "" }
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
      hidePerPage: false,
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
      autohidePager: false,
      responsive: false,
      responsiveToggle: true,
      filterOnEnter: true
    };
  }

  /**
   * @param {Plugins} list
   */
  static registerPlugins(list) {
    plugins = list;
  }

  /**
   * @param {String} plugin
   */
  static unregisterPlugins(plugin = null) {
    if (plugin === null) {
      plugins = {};
    } else {
      delete plugins[plugin];
    }
  }

  /**
   * @returns {Plugins}
   */
  static registeredPlugins() {
    return plugins;
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
        let col = Object.assign({}, this.defaultColumn);
        col.title = columns[key];
        col.field = key;
        cols.push(col);
      });
    } else {
      columns.forEach((item) => {
        let col = Object.assign({}, this.defaultColumn);
        if (typeof item === "string") {
          col.title = item;
          col.field = item;
        } else if (typeof item === "object") {
          col = Object.assign(col, item);
          if (!col.field) {
            console.error("Invalid column definition", item);
          }
          if (!col.title) {
            col.title = col.field;
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
    this.inputPage.disabled = this.pages < 2;
  }

  pageChanged() {
    this.reload();
  }

  responsiveChanged() {
    if (!this.plugins.ResponsiveGrid) {
      return;
    }
    if (this.options.responsive) {
      this.plugins.ResponsiveGrid.observe();
    } else {
      this.plugins.ResponsiveGrid.unobserve();
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
      // Triggers pageChanged, which will trigger reload
      this.page = updatePage;
    } else {
      // Simply reload current page
      this.reload(() => {
        // Preserve distance between top of page and select control if no fixed height
        if (!this.plugins.FixedHeight || !this.plugins.FixedHeight.hasFixedHeight) {
          this.selectPerPage.scrollIntoView();
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
    this.table = this.querySelector("table");
    /**
     * @type {HTMLInputElement}
     */
    this.btnFirst = this.querySelector(".dg-btn-first");
    /**
     * @type {HTMLInputElement}
     */
    this.btnPrev = this.querySelector(".dg-btn-prev");
    /**
     * @type {HTMLInputElement}
     */
    this.btnNext = this.querySelector(".dg-btn-next");
    /**
     * @type {HTMLInputElement}
     */
    this.btnLast = this.querySelector(".dg-btn-last");
    /**
     * @type {HTMLSelectElement}
     */
    this.selectPerPage = this.querySelector(".dg-select-per-page");
    /**
     * @type {HTMLInputElement}
     */
    this.inputPage = this.querySelector(".dg-input-page");

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
    this.selectPerPage.toggleAttribute("hidden", this.options.hidePerPage);
    this.inputPage.addEventListener("input", this.gotoPage);

    Object.values(this.plugins).forEach((plugin) => {
      plugin.connected();
    });

    // Display even if we don't have data
    this.dirChanged();
    this.perPageValuesChanged();

    // @ts-ignore
    this.loadData().finally(() => {
      this.configureUi();

      this.sortChanged();
      this.classList.add("dg-initialized"); //acts as a flag to prevent unnecessary server calls down the chain.

      this.filterChanged();
      this.reorderChanged();

      this.dirChanged();
      this.perPageValuesChanged();
      this.pageChanged();

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

    Object.values(this.plugins).forEach((plugin) => {
      plugin.disconnected();
    });
  }

  /**
   * @param {string} field
   * @returns {Column}
   */
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
    let start = 1;
    if (this.options.selectable && this.plugins.SelectableRows) {
      start++;
    }
    if (this.options.responsive && this.plugins.ResponsiveGrid && this.plugins.ResponsiveGrid.hasHiddenColumns()) {
      start++;
    }
    return start;
  }

  /**
   * @returns {Boolean}
   */
  isSticky() {
    return this.hasAttribute("sticky");
  }

  /**
   * @param {Boolean} visibleOnly
   * @returns {Number}
   */
  columnsLength(visibleOnly = false) {
    let len = 0;
    // One column per (visible) column
    this.options.columns.forEach((col) => {
      if (visibleOnly && col.hidden) {
        return;
      }
      if (!col.attr) {
        len++;
      }
    });
    // Add one col for selectable checkbox at the beginning
    if (this.options.selectable && this.plugins.SelectableRows) {
      len++;
    }
    // Add one col for actions at the end
    if (this.options.actions.length && this.plugins.RowActions) {
      len++;
    }
    // Add one col for the responsive toggle
    if (this.options.responsive && this.plugins.ResponsiveGrid && this.plugins.ResponsiveGrid.hasHiddenColumns()) {
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
    if (this.options.responsive && this.plugins.ResponsiveGrid) {
      // Let the observer make the table visible
    } else {
      this.table.style.visibility = "visible";
    }

    // Store row height for later usage
    if (!this.rowHeight) {
      const tr = find(this, "tbody tr") || find(this, "table tr");
      if (tr) {
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
    const headers = findAll(this, "thead tr.dg-head-columns th");
    headers.forEach((th) => {
      if (th.classList.contains("dg-selectable") || th.classList.contains("dg-actions")) {
        return;
      }
      if (this.options.reorder && this.plugins.DraggableHeaders) {
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
    if (!Array.isArray(this.originalData)) return;
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
    if (!Array.isArray(this.originalData)) return;
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
    if (!this.plugins.SelectableRows) {
      return [];
    }
    return this.plugins.SelectableRows.getSelection(key);
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
  }

  /**
   * Preloads the data intended to bypass the initial fetch operation, allowing for faster intial page load time.
   * Subsequent grid actions after initialization will operate as normal.
   * @param {Object} data - an object with meta ({total, filtered, start}) and data (array of objects) properties.
   */
  preload(data) {
    const metaKey = this.options.serverParams.metaKey,
      dataKey = this.options.serverParams.dataKey;
    if (data?.[metaKey]) this.meta = data[metaKey];
    if (data?.[dataKey]) this.data = this.originalData = data[dataKey];
  }

  refresh(cb = null) {
    this.data = this.originalData = [];
    return this.reload(cb);
  }

  reload(cb = null) {
    this.log("reload");

    // If the data was cleared, we need to render again
    const needRender = !this.originalData?.length;
    this.fixPage();
    // @ts-ignore
    this.loadData().finally(() => {
      // If we load data from the server, we redraw the table body
      // Otherwise, we just need to paginate
      this.options.server || needRender ? this.renderBody() : this.paginate();
      if (cb) {
        cb();
      }
    });
  }

  /**
   * @returns {Promise}
   */
  loadData() {
    const flagEmpty = () => !this.data.length && this.classList.add("dg-empty"),
      tbody = this.querySelector("tbody");
    // We already have some data
    if (this.meta || this.originalData || this.classList.contains("dg-initialized")) {
      // We don't use server side data
      if (!this.options.server || (this.options.server && !this.fireEvents)) {
        this.log("skip loadData");
        flagEmpty();
        return new Promise((resolve) => {
          resolve();
        });
      }
    }
    this.log("loadData");
    this.loading = true;
    this.classList.add("dg-loading");
    this.classList.remove("dg-empty", "dg-network-error");
    return (
      this.fetchData()
        .then((response) => {
          // We can get a straight array or an object
          if (Array.isArray(response)) {
            this.data = response;
          } else {
            // Object must contain data key
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
          } else {
            this.options.columns = this.convertColumns(this.options.columns);
          }
        })
        .catch((err) => {
          this.log(err);
          if (err.message) {
            tbody.setAttribute("data-empty", err.message.replace(/^\s+|\r\n|\n|\r$/g, ""));
          }
          this.classList.add("dg-empty", "dg-network-error");
        })
        // @ts-ignore
        .finally(() => {
          flagEmpty();
          if (!this.classList.contains("dg-network-error") && tbody.getAttribute("data-empty") != this.labels.noData) {
            tbody.setAttribute("data-empty", this.labels.noData);
          }
          this.classList.remove("dg-loading");
          this.loading = false;
        })
    );
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
    const inputs = findAll(this, this.#filterSelector);
    inputs.forEach((input) => {
      filters[input.dataset.name] = input.value;
    });
    return filters;
  }

  clearFilters() {
    const inputs = findAll(this, this.#filterSelector);
    inputs.forEach((input) => {
      input.value = "";
    });
    this.filterData();
  }

  filterData() {
    this.log("filter data");

    this.page = 1;

    if (this.options.server) {
      this.reload();
    } else {
      this.data = this.originalData?.slice() ?? [];

      // Look for rows matching the filters
      const inputs = findAll(this, this.#filterSelector);
      inputs.forEach((input) => {
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
    if (this.plugins.ColumnResizer && this.plugins.ColumnResizer.isResizing) {
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
      const haveClasses = (c) => ["dg-selectable", "dg-actions", "dg-responsive-toggle"].includes(c);
      this.querySelectorAll("thead tr:first-child th").forEach((th) => {
        // @ts-ignore
        if ([...th.classList].some(haveClasses)) {
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
        this.originalData?.some((itemA) => {
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
      if (this.options.filter) params[this.options.serverParams.search] = this.getFilters();
      params[this.options.serverParams.sort] = this.getSort() || "";
      params[this.options.serverParams.sortDir] = this.getSortDir();

      // extra params ?
      if (this.meta?.[this.options.serverParams.paramsKey]) {
        params = Object.assign(params, this.meta[this.options.serverParams.paramsKey]);
      }
    }

    appendParamsToUrl(url, params);

    return fetch(url).then((response) => {
      if (!response.ok) {
        throw new Error(response.statusText || labels.networkError);
      }
      return response.json();
    });
  }

  renderTable() {
    this.log("render table");

    if (this.options.menu && this.plugins.ContextMenu) {
      this.plugins.ContextMenu.createMenu();
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

    if (this.options.resizable && this.plugins.ColumnResizer) {
      this.plugins.ColumnResizer.renderResizer(labels.resizeColumn);
    }

    dispatch(this, "headerRendered");
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
    const availableWidth = this.clientWidth;
    const colMaxWidth = Math.round((availableWidth / this.columnsLength(true)) * 2);

    let idx = 0;
    let tr;

    // Create row
    tr = ce("tr");
    this.headerRow = tr;
    tr.setAttribute("role", "row");
    tr.setAttribute("aria-rowindex", "1");
    tr.setAttribute("class", "dg-head-columns");

    // We need a real th from the dom to compute the size
    let sampleTh = thead.querySelector("tr.dg-head-columns th");
    if (!sampleTh) {
      sampleTh = ce("th");
      thead.querySelector("tr").appendChild(sampleTh);
    }

    if (this.options.selectable && this.plugins.SelectableRows) {
      this.plugins.SelectableRows.createHeaderCol(tr);
    }
    if (this.options.responsive && this.plugins.ResponsiveGrid && this.plugins.ResponsiveGrid.hasHiddenColumns()) {
      this.plugins.ResponsiveGrid.createHeaderCol(tr);
    }

    // Create columns
    idx = 0;
    let totalWidth = 0;
    this.options.columns.forEach((column) => {
      if (column.attr) {
        return;
      }
      const colIdx = idx + this.startColIndex();
      let th = ce("th");
      th.setAttribute("scope", "col");
      th.setAttribute("role", "columnheader button");
      th.setAttribute("aria-colindex", "" + colIdx);
      th.setAttribute("id", randstr("dg-col-"));
      if (this.options.sort) {
        th.setAttribute("aria-sort", "none");
      }
      th.setAttribute("field", column.field);
      if (this.plugins.ResponsiveGrid && this.options.responsive) {
        setAttribute(th, "data-responsive", column.responsive || "");
      }
      // Make sure the header fits (+ add some room for sort icon if necessary)
      const computedWidth = getTextWidth(column.title, sampleTh, true) + 20;
      th.dataset.minWidth = "" + computedWidth;
      applyColumnDefinition(th, column);
      th.tabIndex = 0;
      th.textContent = column.title;

      let w = 0;
      // Autosize small based on first/last row ?
      // Take into account minWidth of the header and max available size based on col numbers
      if (this.options.autosize && this.plugins.AutosizeColumn) {
        const colAvailableWidth = Math.min(availableWidth - totalWidth, colMaxWidth);
        w = this.plugins.AutosizeColumn.computeSize(th, column, parseInt(th.dataset.minWidth), colAvailableWidth);
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
      if (this.options.reorder && this.plugins.DraggableHeaders) {
        this.plugins.DraggableHeaders.makeHeaderDraggable(th);
      }

      tr.appendChild(th);
      idx++;
    });

    // There is too much available width, and we want to avoid fixed layout to split remaining amount
    if (totalWidth < availableWidth) {
      const visibleCols = findAll(tr, "th:not([hidden],.dg-not-resizable)");
      if (visibleCols.length) {
        const lastCol = visibleCols[visibleCols.length - 1];
        removeAttribute(lastCol, "width");
      }
    }

    // Actions
    if (this.options.actions.length && this.plugins.RowActions) {
      this.plugins.RowActions.makeActionHeader(tr);
    }

    thead.replaceChild(tr, thead.querySelector("tr.dg-head-columns"));

    // Once columns are inserted, we have an actual dom to query
    if (thead.offsetWidth > availableWidth) {
      this.log(`adjust width to fix size, ${thead.offsetWidth} > ${availableWidth}`);
      const scrollbarWidth = this.offsetWidth - this.clientWidth;
      let diff = thead.offsetWidth - availableWidth - scrollbarWidth;
      if (this.options.responsive && this.plugins.ResponsiveGrid) {
        diff += scrollbarWidth;
      }
      // Remove diff for columns that can afford it
      const thWithWidth = findAll(tr, "th[width]");
      thWithWidth.forEach((th) => {
        if (hasClass(th, "dg-not-resizable")) {
          return;
        }
        if (diff <= 0) {
          return;
        }
        const actualWidth = parseInt(th.getAttribute("width"));
        const minWidth = th.dataset.minWidth ? parseInt(th.dataset.minWidth) : 0;
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
    if (this.options.menu && this.plugins.ContextMenu) {
      this.plugins.ContextMenu.attachContextMenu();
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
    tr = ce("tr");
    this.filterRow = tr;
    tr.setAttribute("role", "row");
    tr.setAttribute("aria-rowindex", "2");
    tr.setAttribute("class", "dg-head-filters");
    if (!this.options.filter) {
      tr.setAttribute("hidden", "");
    }

    if (this.options.selectable && this.plugins.SelectableRows) {
      this.plugins.SelectableRows.createFilterCol(tr);
    }
    if (this.options.responsive && this.plugins.ResponsiveGrid && this.plugins.ResponsiveGrid.hasHiddenColumns()) {
      this.plugins.ResponsiveGrid.createFilterCol(tr);
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
      let th = ce("th");
      th.setAttribute("aria-colindex", "" + colIdx);

      let filter = this.createFilterElement(column, relatedTh);
      if (!this.options.filter) {
        th.tabIndex = 0;
      } else {
        filter.tabIndex = 0;
      }

      if (column.hidden) {
        th.setAttribute("hidden", "");
      }

      th.appendChild(filter);
      tr.appendChild(th);
      idx++;
    });

    // Actions
    if (this.options.actions.length && this.plugins.RowActions) {
      this.plugins.RowActions.makeActionFilter(tr);
    }

    thead.replaceChild(tr, thead.querySelector("tr.dg-head-filters"));

    // Filter content by field events
    tr.querySelectorAll(this.#filterSelector).forEach((el) => {
      const eventName = /select/i.test(el.tagName) ? "change" : "keyup";
      el.addEventListener(eventName, (e) => {
        const key = e.keyCode || e.key;
        if (key === 13 || key === "Enter" || !this.options.filterOnEnter || e.type == "change") {
          this.filterData.call(this);
        }
      });
    });
  }

  createFilterElement(column, relatedTh) {
    const isSelect = column.filterType == "select",
      filter = isSelect ? ce("select") : ce("input");
    if (isSelect) {
      if (!Array.isArray(column.filterList)) { // Gets unique values from column records
        const uniqueValues = [...new Set((this.data ?? []).map((e) => e[column.field]))].filter((v) => v).sort();
        column.filterList = [column.firstFilterOption || this.defaultColumn.firstFilterOption].concat(uniqueValues.map((e) => ({ value: e, text: e })));
      }
      column.filterList.forEach((e) => {
        const opt = ce("option");
        opt.value = e.value;
        opt.text = e.text;
        filter.add(opt);
      });
    } else {
      filter.type = "text";
      filter.inputMode = "search";
      filter.autocomplete = "off";
      filter.spellcheck = false;
    }
    // Allows binding filter to this column
    filter.dataset.name = column.field;
    filter.id = randstr("dg-filter-");
    // Don't use aria-label as it triggers autocomplete
    filter.setAttribute("aria-labelledby", relatedTh.getAttribute("id"));
    return filter;
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
    let tbody = ce("tbody");

    this.data.forEach((item, i) => {
      tr = ce("tr");
      setAttribute(tr, "role", "row");
      setAttribute(tr, "hidden", "");
      setAttribute(tr, "aria-rowindex", i + 1);
      tr.tabIndex = 0;

      if (this.options.selectable && this.plugins.SelectableRows) {
        this.plugins.SelectableRows.createDataCol(tr);
      }
      if (this.options.responsive && this.plugins.ResponsiveGrid && this.plugins.ResponsiveGrid.hasHiddenColumns()) {
        this.plugins.ResponsiveGrid.createDataCol(tr);
      }

      // Expandable
      if (this.options.expand) {
        tr.classList.add("dg-expandable");

        on(tr, "click", (ev) => {
          if (this.plugins.ResponsiveGrid) {
            this.plugins.ResponsiveGrid.blockObserver();
          }
          toggleClass(ev.currentTarget, "dg-expanded");
          if (this.plugins.ResponsiveGrid) {
            this.plugins.ResponsiveGrid.unblockObserver();
          }
        });
      }

      idx = 0;
      this.options.columns.forEach((column) => {
        if (!column) {
          console.error("Empty column found!", this.options.columns);
        }
        // It should be applied as an attr of the row
        if (column.attr) {
          if (item[column.field]) {
            // Special case if we try to write over the class attr
            if (column.attr === "class") {
              addClass(tr, item[column.field]);
            } else {
              tr.setAttribute(column.attr, item[column.field]);
            }
          }
          return;
        }
        td = ce("td");
        td.setAttribute("role", "gridcell");
        td.setAttribute("aria-colindex", idx + this.startColIndex());
        applyColumnDefinition(td, column);
        // This is required for pure css responsive layout
        td.setAttribute("data-name", column.title);
        td.tabIndex = -1;

        // Inline editing ...
        if (column.editable && this.plugins.EditableColumn) {
          addClass(td, "dg-editable-col");
          this.plugins.EditableColumn.makeEditableInput(td, column, item, i);
        } else {
          // ... or formatting
          const v = item[column.field] ?? "";
          let tv;
          // TODO: make this modular
          switch (column.transform) {
            case "uppercase":
              tv = v.toUpperCase();
              break;
            case "lowercase":
              tv = v.toLowerCase();
              break;
            default:
              tv = v;
              break;
          }
          if (column.format) {
            // Only use formatting with values or if defaultFormatValue is set
            if (column.defaultFormatValue != undefined && (tv === "" || tv === null)) {
              tv = column.defaultFormatValue + "";
            }
            if (typeof column.format === "string" && tv) {
              td.innerHTML = interpolate(
                // @ts-ignore
                column.format,
                Object.assign(
                  {
                    _v: v,
                    _tv: tv,
                  },
                  item
                )
              );
            } else if (column.format instanceof Function) {
              const val = column.format.call(this, { column, rowData: item, cellData: tv, td, tr });
              td.innerHTML = val || tv || v;
            }
          } else {
            td.textContent = tv;
          }
        }
        tr.appendChild(td);
        idx++;
      });

      // Actions
      if (this.options.actions.length && this.plugins.RowActions) {
        this.plugins.RowActions.makeActionRow(tr, item);
      }

      tbody.appendChild(tr);
    });

    tbody.setAttribute("role", "rowgroup");

    // Keep data empty message
    const prev = this.querySelector("tbody");
    tbody.setAttribute("data-empty", prev.getAttribute("data-empty"));
    this.querySelector("table").replaceChild(tbody, prev);

    if (this.plugins.FixedHeight) {
      this.plugins.FixedHeight.createFakeRow();
    }

    this.paginate();

    if (this.plugins.SelectableRows) {
      this.plugins.SelectableRows.shouldSelectAll(tbody);
    }

    this.data.length && this.classList.remove("dg-empty");

    dispatch(this, "bodyRendered");
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

    if (this.options.selectable && this.plugins.SelectableRows) {
      this.plugins.SelectableRows.clearCheckboxes(tbody);
    }

    // Store default height and update styles if needed
    if (this.plugins.FixedHeight) {
      this.plugins.FixedHeight.updateFakeRow();
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
    tfoot.querySelector(".dg-total").textContent = "" + this.totalRecords();
    tfoot.toggleAttribute("hidden", this.options.autohidePager && this.options.perPage > this.totalRecords());
  }

  /**
   * @returns {number}
   */
  totalPages() {
    return Math.ceil(this.totalRecords() / this.options.perPage);
  }

  /**
   * @returns {number}
   */
  totalRecords() {
    if (this.options.server) {
      return this.meta?.[this.options.serverParams.metaFilteredKey] || 0;
    }
    return this.data.length;
  }
}

export default DataGrid;
