/*** Data Grid Web Component v2.0.13 * https://github.com/lekoala/data-grid ***/

// src/utils/camelize.js
function camelize(str) {
  return str.toLowerCase().replace(/[^a-zA-Z0-9]+(.)/g, (m, chr) => chr.toUpperCase());
}

// src/utils/normalizeData.js
function normalizeData(v) {
  if (v === "true") {
    return true;
  }
  if (v === "false") {
    return false;
  }
  if (v === "" || v === "null") {
    return null;
  }
  if (v === Number(v).toString()) {
    return Number(v);
  }
  if (v && typeof v.substring === "function" && ["[", "{"].includes(v.substring(0, 1))) {
    try {
      let val = v;
      if (val.indexOf('"') === -1) {
        val = val.replace(/'/g, '"');
      }
      return JSON.parse(decodeURIComponent(val));
    } catch {
      console.error(`Failed to parse ${v}`);
      return {};
    }
  }
  return v;
}

// src/utils/shortcuts.js
var supportedPassiveTypes = [
  "scroll",
  "wheel",
  "touchstart",
  "touchmove",
  "touchenter",
  "touchend",
  "touchleave",
  "mouseout",
  "mouseleave",
  "mouseup",
  "mousedown",
  "mousemove",
  "mouseenter",
  "mousewheel",
  "mouseover"
];
function passiveOpts(type) {
  if (supportedPassiveTypes.includes(type)) {
    return { passive: true };
  }
  return {};
}
function getAttribute(el, name) {
  return el.getAttribute(name);
}
function hasAttribute(el, name) {
  return el.hasAttribute(name);
}
function setAttribute(el, name, v = "", check = false) {
  if (check && hasAttribute(el, name)) return;
  el.setAttribute(name, `${v}`);
}
function removeAttribute(el, name) {
  if (hasAttribute(el, name)) {
    el.removeAttribute(name);
  }
}
function on(el, type, listener) {
  el.addEventListener(type, listener, passiveOpts(type));
}
function off(el, type, listener) {
  el.removeEventListener(type, listener, passiveOpts(type));
}
function dispatch(el, name, data = {}, bubbles = false) {
  const opts = {};
  if (bubbles) {
    opts.bubbles = true;
  }
  if (data) {
    opts.detail = data;
  }
  el.dispatchEvent(new CustomEvent(name, opts));
}
function hasClass(el, name) {
  return el.classList.contains(name);
}
function addClass(el, name) {
  el.classList.add(...name.split(" "));
}
function removeClass(el, name) {
  el.classList.remove(...name.split(" "));
}
function toggleClass(el, name) {
  el.classList.toggle(name);
}
function $(selector, base = document) {
  if (selector instanceof HTMLElement) {
    return selector;
  }
  return base.querySelector(selector);
}
function $$(selector, base = document) {
  return Array.from(base.querySelectorAll(selector));
}
function find(el, selector) {
  return $(selector, el);
}
function findAll(el, selector) {
  return $$(selector, el);
}
function ce(tagName, parent = null) {
  const el = document.createElement(tagName);
  if (parent) {
    parent.appendChild(el);
  }
  return el;
}
function insertAfter(newNode, existingNode) {
  existingNode.parentNode.insertBefore(newNode, existingNode.nextSibling);
}

// src/core/base-element.js
var BaseElement = class extends HTMLElement {
  /**
   * @param {Object} options
   */
  constructor(options = {}) {
    super();
    this.options = Object.assign({}, this.defaultOptions, this.normalizedDataset, options);
    this.log("constructor");
    this.setup = false;
    this.fireEvents = true;
    this._ready();
    this.log("ready");
  }
  get defaultOptions() {
    return {};
  }
  /**
   * @param {String} opt
   * @returns {any}
   */
  getOption(opt) {
    return this.options[opt];
  }
  /**
   * @param {String} opt
   * @param {any} v
   */
  setOption(opt, v) {
    setAttribute(this, `data-${opt}`, v);
  }
  /**
   * @param {String} opt
   */
  toggleOption(opt) {
    setAttribute(this, `data-${opt}`, !this.getOption(opt));
  }
  get normalizedDataset() {
    const jsonConfig = this.dataset.config ? JSON.parse(this.dataset.config) : {};
    const data = { ...this.dataset };
    for (const key in data) {
      if (key === "config" || !data.hasOwnProperty(key) || typeof data[key] === "function") {
        continue;
      }
      data[key] = normalizeData(data[key]);
    }
    Object.assign(data, jsonConfig);
    return data;
  }
  /**
   * @returns {String}
   */
  static template() {
    return "";
  }
  /**
   * This is called at the end of constructor. Extend in subclass if needed.
   */
  _ready() {
  }
  /**
   * @param {any[]} data
   */
  log(...data) {
    if (this.options.debug) {
      console.log(`[${getAttribute(this, "id")}] `, ...data);
    }
  }
  /**
   * Handle events within the component
   * @link https://gist.github.com/WebReflection/ec9f6687842aa385477c4afca625bbf4#handling-events
   * @param {Event} event
   */
  handleEvent(event) {
    if (this[`on${event.type}`]) {
      this[`on${event.type}`](event);
    }
  }
  /**
   * This is called when connected. Extend in subclass if needed.
   */
  _connected() {
  }
  connectedCallback() {
    if (this.setup) {
      return;
    }
    this.setup = true;
    setTimeout(async () => {
      this.log("connectedCallback");
      const template = document.createElement("template");
      template.innerHTML = this.constructor.template();
      this.appendChild(template.content.cloneNode(true));
      await this._connected();
      dispatch(this, "connected");
    }, 0);
  }
  /**
   * This is called when disconnected. Extend in subclass if needed.
   */
  _disconnected() {
  }
  /**
   * @link https://nolanlawson.com/2024/12/01/avoiding-unnecessary-cleanup-work-in-disconnectedcallback/
   */
  disconnectedCallback() {
    setTimeout(() => {
      if (!this.isConnected && this.setup) {
        this.log("disconnectedCallback");
        this._disconnected();
        dispatch(this, "disconnected");
        this.setup = false;
      }
    }, 0);
  }
  /**
   * @link https://gist.github.com/WebReflection/ec9f6687842aa385477c4afca625bbf4#a-props-like-accessor
   * @returns {Object}
   */
  get transformAttributes() {
    return {};
  }
  /**
   * This is only meant to work with data attributes
   * This allows us to have properties that reflect automatically in the component
   * @link https://gist.github.com/WebReflection/ec9f6687842aa385477c4afca625bbf4#reflected-dataset-attributes
   * @param {String} attributeName
   * @param {String} oldValue
   * @param {String} newValue
   */
  attributeChangedCallback(attributeName, oldValue, newValue) {
    if (oldValue === newValue) {
      return;
    }
    this.log(`attributeChangedCallback: ${attributeName}`);
    let isOption = false;
    const transformer = this.transformAttributes[attributeName] ?? normalizeData;
    let attr = attributeName;
    if (attr.indexOf("data-") === 0) {
      attr = attr.slice(5);
      isOption = true;
    }
    attr = camelize(attr);
    if (isOption) {
      this.options[attr] = transformer(newValue);
    } else {
      this[attr] = transformer(newValue);
    }
    if (this.fireEvents && this[`${attr}Changed`]) {
      this[`${attr}Changed`]();
    }
  }
};
var base_element_default = BaseElement;

// src/utils/addSelectOption.js
function addSelectOption(el, value, label, checked = false) {
  const opt = document.createElement("option");
  opt.value = `${value}`;
  if (checked) {
    opt.selected = true;
  }
  opt.label = label;
  el.appendChild(opt);
}

// src/utils/appendParamsToUrl.js
function appendParamsToUrl(url, params = {}) {
  for (const key of Object.keys(params)) {
    if (Array.isArray(params[key])) {
      for (const k of Object.keys(params[key])) {
        url.searchParams.append(isNaN(k) ? `${key}[${k}]` : key, params[key][k]);
      }
    } else {
      url.searchParams.append(key, params[key]);
    }
  }
}

// src/utils/convertArray.js
function convertArray(v) {
  if (typeof v === "string") {
    if (v[0] === "[") {
      let bv = v;
      if (bv.indexOf('"') === -1) {
        bv = bv.replace(/'/g, '"');
      }
      return JSON.parse(bv);
    }
    return v.split(",");
  }
  if (!Array.isArray(v)) {
    console.error("Invalid array", v);
    return [];
  }
  return v;
}

// src/utils/elementOffset.js
function elementOffset(el) {
  const rect = el.getBoundingClientRect();
  const scrollLeft = window.pageXOffset || document.documentElement.scrollLeft;
  const scrollTop = window.pageYOffset || document.documentElement.scrollTop;
  return { top: rect.top + scrollTop, left: rect.left + scrollLeft };
}

// src/utils/interpolate.js
function interpolate(str, data) {
  return str.replace(/\{([^}]+)?\}/g, ($1, $2) => data[$2]);
}

// src/utils/getTextWidth.js
var canvas;
function getTextWidth(text, el = document.body, withPadding = false) {
  const styles = window.getComputedStyle(el || document.createElement("div"));
  const fontWeight = styles.getPropertyValue("font-weight") || "normal";
  const fontSize = styles.getPropertyValue("font-size") || "1rem";
  const fontFamily = styles.getPropertyValue("font-family") || "Arial";
  let padding = 0;
  if (withPadding) {
    const paddingLeft = styles.getPropertyValue("padding-left") || "0";
    const paddingRight = styles.getPropertyValue("padding-right") || "0";
    padding = Number.parseInt(paddingLeft) + Number.parseInt(paddingRight);
  }
  if (!canvas) {
    canvas = document.createElement("canvas");
  }
  const context = canvas.getContext("2d");
  context.font = `${fontWeight} ${fontSize} ${fontFamily}`;
  const metrics = context.measureText(text);
  return Number.parseInt(metrics.width) + padding;
}

// src/utils/randstr.js
function randstr(prefix) {
  return Math.random().toString(36).replace("0.", prefix || "");
}

// src/utils/debounce.js
function debounce(handler, timeout = 300) {
  let timer = null;
  return (...args) => {
    clearTimeout(timer);
    timer = setTimeout(() => {
      timer = null;
      handler(...args);
    }, timeout);
  };
}

// src/data-grid.js
var plugins = {};
var labels = {
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
  networkError: "Network response error"
};
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
var DataGrid = class _DataGrid extends base_element_default {
  _filterSelector = "[id^=dg-filter]";
  _excludedRowElementSelector = "a,button,input,select,textarea";
  _excludedKeys = [
    37,
    39,
    38,
    40,
    45,
    36,
    35,
    33,
    34,
    27,
    20,
    16,
    17,
    91,
    92,
    18,
    93,
    144,
    231,
    "ArrowLeft",
    "ArrowRight",
    "ArrowUp",
    "ArrowDown",
    "Insert",
    "Home",
    "End",
    "PageUp",
    "PageDown",
    "Escape",
    "CapsLock",
    "Shift",
    "Control",
    "Meta",
    "Alt",
    "ContextMenu",
    "NumLock",
    "Unidentified"
  ];
  _ready() {
    setAttribute(this, "id", this.options.id ?? randstr("el-"), true);
    this.data = [];
    this.originalData;
    this.options = this.options || this.defaultOptions;
    if (this.options.singleSelect) this.options.selectable = true;
    this.fireEvents = false;
    this.page = this.options.defaultPage || 1;
    this.pages = 0;
    this.meta;
    this.plugins = {};
    for (const [pluginName, pluginClass] of Object.entries(plugins)) {
      this.plugins[pluginName] = new pluginClass(this);
    }
    for (const attr of _DataGrid.observedAttributes) {
      if (attr.indexOf("data-") === 0) {
        setAttribute(this, attr, this.options[camelize(attr.slice(5))]);
      }
    }
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
  /** Gets the text to be displayed when no data is loaded. */
  get noData() {
    return this.options.noData || this.labels.noData;
  }
  /**
   * @param {HTMLTableSectionElement} tbody
   */
  #setNoData(tbody) {
    if (!this.hasDataError && tbody.getAttribute("data-empty") !== this.noData) {
      tbody.setAttribute("data-empty", this.noData);
    }
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
      url: "",
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
        paramsKey: "params"
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
      singleSelect: false,
      defaultPage: 1,
      resizable: false,
      autosize: true,
      expand: false,
      autoheight: true,
      autohidePager: false,
      responsive: false,
      responsiveToggle: true,
      filterOnEnter: true,
      filterKeypressDelay: 500,
      spinnerClass: "",
      saveState: false,
      errorMessage: "",
      noData: ""
    };
  }
  /**
   * Determines if the grid is initialized.
   * @returns {Boolean}
   */
  get isInit() {
    return this.classList.contains("dg-initialized");
  }
  /**
   * Determines if data load has failed.
   * @returns {Boolean}
   */
  get hasDataError() {
    return this.classList.contains("dg-network-error");
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
    const cols = [];
    if (typeof columns === "object" && !Array.isArray(columns)) {
      for (const key of Object.keys(columns)) {
        const col = Object.assign({}, this.defaultColumn);
        col.title = columns[key];
        col.field = key;
        cols.push(col);
      }
    } else {
      for (const item of columns) {
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
      }
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
      "data-single-select",
      "data-url",
      "data-per-page",
      "data-responsive"
    ];
  }
  get transformAttributes() {
    return {
      columns: (v) => this.convertColumns(convertArray(v)),
      actions: (v) => convertArray(v),
      defaultPage: (v) => Number.parseInt(v),
      perPage: (v) => Number.parseInt(v)
    };
  }
  /** @returns {HTMLTableSectionElement} */
  get thead() {
    return $("thead", this);
  }
  /** @returns {HTMLTableSectionElement} */
  get tbody() {
    return $("tbody", this);
  }
  /** @returns {HTMLTableSectionElement} */
  get tfoot() {
    return $("tfoot", this);
  }
  get page() {
    return Number.parseInt(this.getAttribute("page"));
  }
  set page(val) {
    setAttribute(this, "page", this.constrainPageValue(val));
  }
  /**
   * Loads data and configures the grid.
   * @param {Boolean} initOnly
   */
  urlChanged(initOnly = false) {
    if (initOnly && !this.isInit) return this;
    this.reconfig();
    return this.loadData().then(() => this.configureUi());
  }
  /**
   * Clears columns, re-renders table, and repopulates columns to ensure consistent column widths rendering.
   */
  reconfig() {
    const cols = this.options.columns;
    this.options.columns = [];
    this.configureUi();
    return this.options.columns = cols, this;
  }
  constrainPageValue(v) {
    let pv = v;
    if (this.pages < pv) {
      pv = this.pages;
    }
    if (pv < 1 || !pv) {
      pv = 1;
    }
    return pv;
  }
  fixPage() {
    if (!this.inputPage) return this;
    this.pages = this.totalPages();
    this.page = this.constrainPageValue(this.page);
    setAttribute(this.inputPage, "max", this.pages);
    this.inputPage.value = `${this.page}`;
    return this.inputPage.disabled = this.pages < 2, this;
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
    this.options.perPage = Number.parseInt(this.selectPerPage.options[this.selectPerPage.selectedIndex].value);
    this.perPageChanged();
  }
  /**
   * This is the actual event triggered on attribute change
   */
  perPageChanged() {
    if (this.options.perPage !== Number.parseInt(this.selectPerPage.options[this.selectPerPage.selectedIndex].value)) {
      this.perPageValuesChanged();
    }
    let updatePage = this.page;
    while (updatePage > 1 && this.page * this.options.perPage > this.totalRecords()) {
      updatePage--;
    }
    if (updatePage !== this.page) {
      this.page = updatePage;
    } else {
      this.reload(() => {
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
    for (const v of this.options.perPageValues) {
      addSelectOption(this.selectPerPage, v, v, v === this.options.perPage);
    }
  }
  async _connected() {
    this.table = this.querySelector("table");
    this.btnFirst = this.querySelector(".dg-btn-first");
    this.btnPrev = this.querySelector(".dg-btn-prev");
    this.btnNext = this.querySelector(".dg-btn-next");
    this.btnLast = this.querySelector(".dg-btn-last");
    this.selectPerPage = this.querySelector(".dg-select-per-page");
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
    for (const plugin of Object.values(this.plugins)) {
      await plugin.connected();
    }
    this.dirChanged();
    this.perPageValuesChanged();
    await this.init();
  }
  _disconnected() {
    this.btnFirst?.removeEventListener("click", this.getFirst);
    this.btnPrev?.removeEventListener("click", this.getPrev);
    this.btnNext?.removeEventListener("click", this.getNext);
    this.btnLast?.removeEventListener("click", this.getLast);
    this.selectPerPage?.removeEventListener("change", this.changePerPage);
    this.inputPage?.removeEventListener("input", this.gotoPage);
    for (const plugin of Object.values(this.plugins)) {
      plugin.disconnected();
    }
  }
  init() {
    return this.loadData().finally(() => {
      this.configureUi();
      this.sortChanged();
      this.classList.add("dg-initialized");
      this.filterChanged();
      this.reorderChanged();
      this.dirChanged();
      this.perPageValuesChanged();
      this.pageChanged();
      this.fireEvents = true;
      this.log("initialized");
    });
  }
  /**
   * @param {string} field
   * @returns {Column}
   */
  getCol(field) {
    let found = null;
    for (const col of this.options.columns) {
      if (col.field === field) {
        found = col;
      }
    }
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
    if (render) this.renderTable();
    dispatch(this, "columnVisibility", {
      col: field,
      visibility: "visible"
    });
  }
  hideColumn(field, render = true) {
    this.setColProp(field, "hidden", true);
    if (render) this.renderTable();
    dispatch(this, "columnVisibility", {
      col: field,
      visibility: "hidden"
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
    for (const col of this.options.columns) {
      if (visibleOnly && col.hidden) {
        continue;
      }
      if (!col.attr) {
        len++;
      }
    }
    if (this.options.selectable && this.plugins.SelectableRows) {
      len++;
    }
    if (this.options.actions.length && this.plugins.RowActions) {
      len++;
    }
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
    if (!this.table) return this;
    this.table.style.visibility = "hidden";
    this.renderTable();
    if (this.options.responsive && this.plugins.ResponsiveGrid) {
    } else {
      this.table.style.visibility = "visible";
    }
    if (!this.rowHeight) {
      const tr = find(this, "tbody tr") || find(this, "table tr");
      if (tr) {
        this.rowHeight = tr.offsetHeight;
      }
    }
    this.#setNoData(this.tbody);
    return this.fixPage();
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
    for (const th of headers) {
      if (th.classList.contains("dg-selectable") || th.classList.contains("dg-actions")) {
        continue;
      }
      if (this.options.reorder && this.plugins.DraggableHeaders) {
        th.draggable = true;
      } else {
        th.removeAttribute("draggable");
      }
    }
  }
  sortChanged() {
    this.log("toggle sort");
    const headers = findAll(this, "thead tr.dg-head-columns th");
    for (const th of headers) {
      const fieldName = th.getAttribute("field");
      if (th.classList.contains("dg-not-sortable") || !this.fireEvents && fieldName === this.options.defaultSort) {
        return;
      }
      if (this.options.sort && !this.getColProp(fieldName, "noSort")) {
        setAttribute(th, "aria-sort", "none");
      } else {
        removeAttribute(th, "aria-sort");
      }
    }
  }
  selectableChanged() {
    this.renderTable();
  }
  addRow(row) {
    if (!Array.isArray(this.originalData)) {
      return;
    }
    this.log("add row");
    this.originalData.push(row);
    this.data = this.originalData.slice();
    this.sortData();
  }
  /**
   * @param {any} value Value to remove. Defaults to last row.
   * @param {String} key The key of the item to remove. Defaults to first column
   */
  removeRow(value = null, key = null) {
    if (!Array.isArray(this.originalData)) {
      return;
    }
    let v = value;
    let k = key;
    if (k === null) {
      k = this.options.columns[0].field;
    }
    if (v === null) {
      v = this.originalData[this.originalData.length - 1][k];
    }
    this.log(`remove row ${k}:${v}`);
    for (let i = 0; i < this.originalData.length; i++) {
      if (this.originalData[i][k] === v) {
        this.originalData.splice(i, 1);
        break;
      }
    }
    this.data = this.originalData.slice();
    this.sortData();
  }
  /**
   * Get selected rows or specific fields from selected rows.
   * If no keys are provided, returns the full row objects.
   * If one key is provided, returns an array of values for that key.
   * If multiple keys are provided, returns an array of objects with those keys and values.
   * In single select mode, returns a single object or value.
   * @param {...String} keys - Field names to select from each row.
   * @returns {Array|Object} Selected rows, values, or objects depending on selection and keys.
   */
  getSelection(...keys) {
    if (!this.plugins.SelectableRows) {
      return [];
    }
    return this.plugins.SelectableRows.getSelection(...keys);
  }
  getData() {
    return this.originalData;
  }
  clearData(force = false) {
    if (!force && this.data.length === 0) {
      return;
    }
    this.classList.remove("dg-empty", "dg-network-error");
    this.tbody?.setAttribute("data-empty", this.noData);
    this.data = this.originalData = [];
    this.renderBody();
  }
  /**
   * Preloads the data intended to bypass the initial fetch operation, allowing for faster intial page load time.
   * Subsequent grid actions after initialization will operate as normal.
   * @param {Object} data - an object with meta ({total, filtered, start}) and data (array of objects) properties.
   */
  preload(data) {
    const metaKey = this.options.serverParams.metaKey;
    const dataKey = this.options.serverParams.dataKey;
    if (data?.[metaKey]) {
      this.meta = data[metaKey];
    }
    if (data?.[dataKey]) {
      this.data = this.originalData = data[dataKey];
    }
  }
  /**
   * Clears and reloads data from url.
   * @param {Function|String} callbackOrUrl
   * @returns {DataGrid}
   */
  refresh(callbackOrUrl = null) {
    this.data = this.originalData = [];
    return this.reload(callbackOrUrl);
  }
  /**
   * Reloads data from url.
   * @param {Function|String} callbackOrUrl
   * @returns {DataGrid}
   */
  reload(callbackOrUrl = null) {
    this.log("reload");
    if (typeof callbackOrUrl === "string") {
      this.options.url = callbackOrUrl;
    }
    const needRender = !this.originalData?.length;
    this.fixPage();
    return this.loadData().finally(() => {
      if (this.hasDataError) return;
      this.options.server || needRender ? this.renderBody() : this.paginate();
      if (typeof callbackOrUrl === "function") {
        callbackOrUrl();
      }
    }).then(() => this);
  }
  /**
   * @returns {Promise}
   */
  loadData() {
    const flagEmpty = () => !this.data.length && this.classList.add("dg-empty");
    const tbody = this.tbody;
    if (this.meta || this.originalData || this.isInit) {
      if (!this.options.server || this.options.server && !this.fireEvents) {
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
    return this.fetchData().then((response) => {
      if (Array.isArray(response)) {
        this.data = response;
      } else {
        if (!response[this.options.serverParams.dataKey]) {
          console.error(
            "Invalid response, it should contain a data key with an array or be a plain array",
            response
          );
          this.options.url = null;
          return;
        }
        this.options = Object.assign(
          this.options,
          response[this.options.serverParams.optionsKey] ?? {}
        );
        this.meta = response[this.options.serverParams.metaKey] ?? {};
        this.data = response[this.options.serverParams.dataKey];
      }
      this.originalData = this.data.slice();
      this.fixPage();
      if (this.options.columns.length === 0 && this.originalData.length) {
        this.options.columns = this.convertColumns(Object.keys(this.originalData[0]));
      } else {
        this.options.columns = this.convertColumns(this.options.columns);
      }
    }).catch((err) => {
      this.log(err);
      tbody.setAttribute(
        "data-empty",
        this.options.errorMessage || err.message?.replace(/^\s+|\r\n|\n|\r$/g, "") || labels.networkError
      );
      this.classList.add("dg-empty", "dg-network-error");
      dispatch(this, "loadDataFailed", err);
    }).finally(() => {
      flagEmpty();
      this.#setNoData(tbody);
      this.classList.remove("dg-loading");
      setAttribute(this.table, "aria-rowcount", this.data.length);
      this.loading = false;
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
    this.page = Number.parseInt(this.inputPage.value);
  }
  getSort() {
    const col = this.querySelector("thead tr.dg-head-columns th[aria-sort$='scending']");
    if (col) {
      return col.getAttribute("field");
    }
    return this.options.defaultSort;
  }
  getSortDir() {
    const col = this.querySelector("thead tr.dg-head-columns th[aria-sort$='scending']");
    if (col) {
      return col.getAttribute("aria-sort") || "";
    }
    return "";
  }
  getFilters() {
    const filters = [];
    const inputs = findAll(this, this._filterSelector);
    for (const input of inputs) {
      filters[input.dataset.name] = input.value;
    }
    return filters;
  }
  clearFilters() {
    const inputs = findAll(this, this._filterSelector);
    for (const input of inputs) {
      input.value = "";
    }
    this.filterData();
  }
  filterData() {
    this.log("filter data");
    this.page = 1;
    if (this.options.server) {
      this.reload();
    } else {
      this.data = this.originalData?.slice() ?? [];
      const inputs = findAll(this, this._filterSelector);
      for (const input of inputs) {
        const value = input.value;
        if (value) {
          const name = input.dataset.name;
          this.data = this.data.filter((item) => {
            const str = `${item[name]}`;
            return str.toLowerCase().indexOf(value.toLowerCase()) !== -1;
          });
        }
      }
      this.pageChanged();
      const col = this.querySelector("thead tr.dg-head-columns th[aria-sort$='scending']");
      if (this.options.sort && col) {
        this.sortData();
      } else {
        this.renderBody();
      }
    }
  }
  /**
   * Data will be sorted then rendered using renderBody
   * @param {Element} baseCol The column that was clicked or null to use current sort
   */
  sortData(baseCol = null) {
    this.log("sort data");
    let col = baseCol;
    if (col && this.getColProp(col.getAttribute("field"), "noSort")) {
      this.log("sorting prevented because column is not sortable");
      return;
    }
    if (this.plugins.ColumnResizer?.isResizing) {
      this.log("sorting prevented because resizing");
      return;
    }
    if (this.loading) {
      this.log("sorting prevented because loading");
      return;
    }
    if (col !== null) {
      const haveClasses = (c) => ["dg-selectable", "dg-actions", "dg-responsive-toggle"].includes(c);
      const headers = findAll(this, "thead tr:first-child th");
      for (const th of headers) {
        if ([...th.classList].some(haveClasses) || !th.hasAttribute("aria-sort")) {
          continue;
        }
        if (th !== col) {
          th.setAttribute("aria-sort", "none");
        }
      }
      if (!col.hasAttribute("aria-sort") || col.getAttribute("aria-sort") === "none") {
        col.setAttribute("aria-sort", "ascending");
      } else if (col.getAttribute("aria-sort") === "ascending") {
        col.setAttribute("aria-sort", "descending");
      } else if (col.getAttribute("aria-sort") === "descending") {
        col.setAttribute("aria-sort", "none");
      }
    } else {
      col = this.querySelector("thead tr.dg-head-columns th[aria-sort$='scending']");
    }
    if (this.options.server) {
      this.loadData().finally(() => {
        this.renderBody();
      });
    } else {
      const sort = col ? col.getAttribute("aria-sort") : "none";
      if (sort === "none") {
        const stack = [];
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
  _sort(columnName, sortDir) {
    const col = this.querySelector(`.dg-head-columns th[field=${columnName}]`);
    const dir = sortDir === "ascending" ? "none" : sortDir === "descending" ? "ascending" : "descending";
    col?.setAttribute("aria-sort", dir);
    this.sortData(col);
  }
  sortAsc = (columnName) => this._sort(columnName, "ascending");
  sortDesc = (columnName) => this._sort(columnName, "descending");
  sortNone = (columnName) => this._sort(columnName, "none");
  fetchData() {
    if (!this.options.url) {
      return new Promise((resolve, reject) => reject("No url set"));
    }
    let base = window.location.href;
    if (!base.split("/").pop().includes(".")) {
      base += base.endsWith("/") ? "" : "/";
    }
    const url = new URL(this.options.url, base);
    let params = {
      r: Date.now()
    };
    if (this.options.server) {
      params[this.options.serverParams.start] = this.page - 1;
      params[this.options.serverParams.length] = this.options.perPage;
      if (this.options.filter) params[this.options.serverParams.search] = this.getFilters();
      params[this.options.serverParams.sort] = this.getSort() || "";
      params[this.options.serverParams.sortDir] = this.getSortDir();
      if (this.meta?.[this.options.serverParams.paramsKey]) {
        params = Object.assign(params, this.meta[this.options.serverParams.paramsKey]);
      }
    }
    appendParamsToUrl(url, params);
    return fetch(url).then((response) => {
      const newError = new Error(response.statusText || labels.networkError);
      if (!response.ok) {
        newError.response = response;
        throw newError;
      }
      return response.clone().json().catch((err) => {
        let error = err;
        if (!this.options.debug) {
          error = newError;
        }
        error.response = response;
        throw error;
      });
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
      sortedColumn = this.querySelector(`thead tr.dg-head-columns th[field="${this.options.defaultSort}"]`);
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
    const thead = this.thead;
    this.createColumnHeaders(thead);
    this.createColumnFilters(thead);
    if (this.options.resizable && this.plugins.ColumnResizer) {
      this.plugins.ColumnResizer.renderResizer(labels.resizeColumn);
    }
    dispatch(this, "headerRendered");
  }
  renderFooter() {
    this.log("render footer");
    const tfoot = this.tfoot;
    if (!tfoot) return;
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
    const availableWidth = this.clientWidth;
    const colMaxWidth = Math.round(availableWidth / this.columnsLength(true) * 2);
    let idx = 0;
    let tr;
    tr = ce("tr");
    this.headerRow = tr;
    tr.setAttribute("role", "row");
    tr.setAttribute("aria-rowindex", "1");
    tr.setAttribute("class", "dg-head-columns");
    let sampleTh = thead?.querySelector("tr.dg-head-columns th");
    this.log("createColumnHeaders - sampleTh", sampleTh);
    if (!sampleTh) {
      sampleTh = ce("th");
      thead?.querySelector("tr").appendChild(sampleTh);
    }
    if (this.options.selectable && this.plugins.SelectableRows) {
      this.plugins.SelectableRows.createHeaderCol(tr);
    }
    if (this.options.responsive && this.plugins.ResponsiveGrid && this.plugins.ResponsiveGrid.hasHiddenColumns()) {
      this.plugins.ResponsiveGrid.createHeaderCol(tr);
    }
    idx = 0;
    let totalWidth = 0;
    this.log("createColumnHeaders - columns", this.options.columns);
    for (const column of this.options.columns) {
      if (column.attr) {
        continue;
      }
      const colIdx = idx + this.startColIndex();
      const th = ce("th");
      th.setAttribute("scope", "col");
      th.setAttribute("role", "columnheader button");
      th.setAttribute("aria-colindex", `${colIdx}`);
      th.setAttribute("id", randstr("dg-col-"));
      if (this.options.sort) {
        th.setAttribute("aria-sort", "none");
      }
      th.setAttribute("field", column.field);
      if (this.plugins.ResponsiveGrid && this.options.responsive) {
        setAttribute(th, "data-responsive", column.responsive || "");
      }
      const computedWidth = getTextWidth(column.title, sampleTh, true) + 20;
      th.dataset.minWidth = `${computedWidth}`;
      applyColumnDefinition(th, column);
      th.tabIndex = 0;
      th.textContent = column.title;
      let w = 0;
      if (this.options.autosize && this.plugins.AutosizeColumn) {
        const colAvailableWidth = Math.min(availableWidth - totalWidth, colMaxWidth);
        w = this.plugins.AutosizeColumn.computeSize(
          th,
          column,
          Number.parseInt(th.dataset.minWidth),
          colAvailableWidth
        );
      } else {
        w = Math.max(Number.parseInt(th.dataset.minWidth), Number.parseInt(th.getAttribute("width")));
      }
      setAttribute(th, "width", w);
      if (column.hidden) {
        th.setAttribute("hidden", "");
      } else {
        totalWidth += w;
      }
      if (this.options.reorder && this.plugins.DraggableHeaders) {
        this.plugins.DraggableHeaders.makeHeaderDraggable(th);
      }
      tr.appendChild(th);
      idx++;
    }
    if (totalWidth < availableWidth) {
      const visibleCols = findAll(tr, "th:not([hidden],.dg-not-resizable)");
      if (visibleCols.length) {
        const lastCol = visibleCols[visibleCols.length - 1];
        removeAttribute(lastCol, "width");
      }
    }
    if (this.options.actions.length && this.plugins.RowActions) {
      this.plugins.RowActions.makeActionHeader(tr);
    }
    thead?.replaceChild(tr, thead.querySelector("tr.dg-head-columns"));
    if (thead && thead.offsetWidth > availableWidth) {
      this.log(`adjust width to fix size, ${thead.offsetWidth} > ${availableWidth}`);
      const scrollbarWidth = this.offsetWidth - this.clientWidth;
      let diff = thead.offsetWidth - availableWidth - scrollbarWidth;
      if (this.options.responsive && this.plugins.ResponsiveGrid) {
        diff += scrollbarWidth;
      }
      const thWithWidth = findAll(tr, "th[width]");
      for (const th of thWithWidth) {
        if (hasClass(th, "dg-not-resizable")) {
          continue;
        }
        if (diff <= 0) {
          continue;
        }
        const actualWidth = Number.parseInt(th.getAttribute("width"));
        const minWidth = th.dataset.minWidth ? Number.parseInt(th.dataset.minWidth) : 0;
        if (actualWidth > minWidth) {
          let newWidth = actualWidth - diff;
          if (newWidth < minWidth) {
            newWidth = minWidth;
          }
          diff -= actualWidth - newWidth;
          setAttribute(th, "width", newWidth);
        }
      }
    }
    if (this.options.menu && this.plugins.ContextMenu) {
      this.plugins.ContextMenu.attachContextMenu();
    }
    const rowsWithSort = findAll(tr, "[aria-sort]");
    for (const sortableRow of rowsWithSort) {
      sortableRow.addEventListener("click", () => this.sortData(sortableRow));
    }
    this.table && setAttribute(this.table, "aria-colcount", this.columnsLength(true));
  }
  createColumnFilters(thead) {
    let idx = 0;
    let tr;
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
    this.log("createColumnFilters - columns", this.options.columns);
    for (const column of this.options.columns) {
      if (column.attr) {
        continue;
      }
      const colIdx = idx + this.startColIndex();
      const relatedTh = thead?.querySelector(`tr.dg-head-columns th[aria-colindex="${colIdx}"]`);
      if (!relatedTh) {
        console.warn("Related th not found", colIdx);
        continue;
      }
      const th = ce("th");
      th.setAttribute("aria-colindex", `${colIdx}`);
      const filter = this.createFilterElement(column, relatedTh);
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
    }
    if (this.options.actions.length && this.plugins.RowActions) {
      this.plugins.RowActions.makeActionFilter(tr);
    }
    thead?.replaceChild(tr, thead.querySelector("tr.dg-head-filters"));
    if (typeof this.options.filterKeypressDelay !== "number" || this.options.filterOnEnter)
      this.options.filterKeypressDelay = 0;
    const filteredRows = findAll(tr, this._filterSelector);
    for (const el of filteredRows) {
      const eventName = /select/i.test(el.tagName) ? "change" : "keyup";
      const eventHandler = debounce((e) => {
        const key = e.keyCode || e.key;
        const isKeyPressFilter = !this.options.filterOnEnter && !this._excludedKeys.some((k) => k === key);
        if (key === 13 || key === "Enter" || isKeyPressFilter || e.type === "change") {
          this.filterData.call(this);
        }
      }, this.options.filterKeypressDelay);
      el.addEventListener(eventName, eventHandler);
    }
  }
  createFilterElement(column, relatedTh) {
    const isSelect = column.filterType === "select";
    const filter = isSelect ? ce("select") : ce("input");
    if (isSelect) {
      if (!Array.isArray(column.filterList)) {
        const uniqueValues = [...new Set((this.data ?? []).map((e) => e[column.field]))].filter((v) => v).sort();
        column.filterList = [column.firstFilterOption || this.defaultColumn.firstFilterOption].concat(
          uniqueValues.map((e) => ({ value: e, text: e }))
        );
      }
      for (const e of column.filterList) {
        const opt = ce("option");
        opt.value = e.value;
        opt.text = e.text;
        if (filter instanceof HTMLSelectElement) {
          filter.add(opt);
        }
      }
    } else {
      filter.type = "text";
      filter.inputMode = "search";
      filter.autocomplete = "off";
      filter.spellcheck = false;
    }
    filter.dataset.name = column.field;
    filter.id = randstr("dg-filter-");
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
    const tbody = ce("tbody");
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
      if (this.options.expand) {
        tr.classList.add("dg-expandable");
        on(tr, "click", (ev) => {
          if (ev.target.matches(this._excludedRowElementSelector)) return;
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
      for (const column of this.options.columns) {
        if (!column) {
          console.error("Empty column found!", this.options.columns);
        }
        if (column.attr) {
          if (item[column.field]) {
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
        td.setAttribute("aria-colindex", `${idx}${this.startColIndex()}`);
        applyColumnDefinition(td, column);
        td.setAttribute("data-name", column.title);
        td.tabIndex = -1;
        if (column.editable && this.plugins.EditableColumn) {
          addClass(td, "dg-editable-col");
          this.plugins.EditableColumn.makeEditableInput(td, column, item, i);
        } else {
          const v = item[column.field] ?? "";
          let tv;
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
            if (column.defaultFormatValue !== void 0 && (tv === "" || tv === null)) {
              tv = `${column.defaultFormatValue}`;
            }
            if (typeof column.format === "string" && tv) {
              td.innerHTML = interpolate(
                // @ts-ignore
                column.format,
                Object.assign(
                  {
                    _v: v,
                    _tv: tv
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
      }
      if (this.options.actions.length && this.plugins.RowActions) {
        this.plugins.RowActions.makeActionRow(tr, item);
      }
      tbody.appendChild(tr);
      dispatch(this, "rowRendered", { rowData: item, tr });
    });
    tbody.setAttribute("role", "rowgroup");
    const prev = this.tbody;
    prev && tbody.setAttribute("data-empty", prev.getAttribute("data-empty"));
    this.table?.replaceChild(tbody, prev);
    if (this.plugins.FixedHeight) {
      this.plugins.FixedHeight.createFakeRow();
    }
    this.paginate();
    if (this.plugins.SelectableRows) {
      this.plugins.SelectableRows.shouldSelectAll(tbody);
    }
    this.classList.toggle("dg-empty", !this.data.length);
    dispatch(this, "bodyRendered");
  }
  paginate() {
    this.log("paginate");
    const total = this.totalRecords();
    const p = this.page || 1;
    const tbody = this.tbody;
    const tfoot = this.tfoot;
    if (!tbody || !tfoot) return;
    const bodyRows = findAll(tbody, "tr");
    this.pages = this.totalPages();
    let index;
    let high = p * this.options.perPage;
    let low = high - this.options.perPage + 1;
    if (high > total) {
      high = total;
    }
    if (!total) {
      low = 0;
    }
    for (const tr of bodyRows) {
      if (this.options.server) {
        removeAttribute(tr, "hidden");
        continue;
      }
      index = Number(getAttribute(tr, "aria-rowindex"));
      if (index > high || index < low) {
        setAttribute(tr, "hidden", "");
      } else {
        removeAttribute(tr, "hidden");
      }
    }
    if (this.options.selectable && this.plugins.SelectableRows) {
      this.plugins.SelectableRows.clearCheckboxes(tbody);
    }
    if (this.plugins.FixedHeight) {
      this.plugins.FixedHeight.updateFakeRow();
    }
    if (this.btnFirst) {
      this.btnFirst.disabled = this.page <= 1;
      this.btnPrev.disabled = this.page <= 1;
      this.btnNext.disabled = this.page >= this.pages;
      this.btnLast.disabled = this.page >= this.pages;
    }
    tfoot.querySelector(".dg-low").textContent = low.toString();
    tfoot.querySelector(".dg-high").textContent = high.toString();
    tfoot.querySelector(".dg-total").textContent = `${this.totalRecords()}`;
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
};
var data_grid_default = DataGrid;

// src/core/base-plugin.js
var BasePlugin = class {
  /**
   * @param {DataGrid} grid
   */
  constructor(grid) {
    this.grid = grid;
  }
  connected() {
  }
  disconnected() {
  }
  /**
   * Handle events within the plugin
   * @link https://gist.github.com/WebReflection/ec9f6687842aa385477c4afca625bbf4#handling-events
   * @param {Event} event
   */
  handleEvent(event) {
    if (this[`on${event.type}`]) {
      this[`on${event.type}`](event);
    }
  }
};
var base_plugin_default = BasePlugin;

// src/plugins/column-resizer.js
var ColumnResizer = class extends base_plugin_default {
  constructor(grid) {
    super(grid);
    this.isResizing = false;
  }
  /**
   * @param {String} resizeLabel
   */
  renderResizer(resizeLabel) {
    const grid = this.grid;
    const table = grid.table;
    const cols = findAll(grid, "thead tr.dg-head-columns th");
    for (const col of cols) {
      if (hasClass(col, "dg-not-resizable")) {
        continue;
      }
      const resizer = document.createElement("div");
      addClass(resizer, "dg-resizer");
      resizer.ariaLabel = resizeLabel;
      col.appendChild(resizer);
      let startX = 0;
      let startW = 0;
      let remainingSpace = 0;
      let max = 0;
      const mouseMoveHandler = (e) => {
        if (e.clientX > max) {
          return;
        }
        const newWidth = startW + (e.clientX - startX);
        if (col.dataset.minWidth && newWidth > Number.parseInt(col.dataset.minWidth)) {
          setAttribute(col, "width", newWidth);
        }
      };
      const mouseUpHandler = () => {
        grid.log("resized column");
        setTimeout(() => {
          this.isResizing = false;
        }, 0);
        removeClass(resizer, "dg-resizer-active");
        if (grid.options.reorder) {
          col.draggable = true;
        }
        col.style.overflow = "hidden";
        off(document, "mousemove", mouseMoveHandler);
        off(document, "mouseup", mouseUpHandler);
        dispatch(grid, "columnResized", {
          col: getAttribute(col, "field"),
          width: getAttribute(col, "width")
        });
      };
      on(resizer, "click", (e) => {
        e.stopPropagation();
      });
      on(resizer, "mousedown", (e) => {
        e.stopPropagation();
        this.isResizing = true;
        const target = e.target;
        const currentCols = findAll(grid, "dg-head-columns th");
        const visibleCols = currentCols.filter((col2) => {
          return !col2.hasAttribute("hidden");
        });
        const columnIndex = visibleCols.findIndex((column) => column === target.parentNode);
        grid.log("resize column");
        addClass(resizer, "dg-resizer-active");
        removeAttribute(col, "draggable");
        col.style.overflow = "visible";
        resizer.style.height = `${table.offsetHeight - 1}px`;
        startX = e.clientX;
        startW = col.offsetWidth;
        remainingSpace = (visibleCols.length - columnIndex) * 30;
        max = elementOffset(target).left + grid.offsetWidth - remainingSpace;
        setAttribute(col, "width", startW);
        for (let j = 0; j < visibleCols.length; j++) {
          if (j > columnIndex) {
            removeAttribute(cols[j], "width");
          }
        }
        on(document, "mousemove", mouseMoveHandler);
        on(document, "mouseup", mouseUpHandler);
      });
    }
  }
};
var column_resizer_default = ColumnResizer;

// src/utils/getParentElement.js
function getParentElement(el, type, prop = "nodeName") {
  let parent = el;
  while (parent[prop] !== type) {
    parent = parent.parentElement;
  }
  return parent;
}

// src/plugins/context-menu.js
var ContextMenu = class extends base_plugin_default {
  connected() {
    this.menu = this.grid.querySelector(".dg-menu");
  }
  disconnected() {
    if (this.grid.headerRow) {
      off(this.grid.headerRow, "contextmenu", this);
    }
  }
  attachContextMenu() {
    const grid = this.grid;
    on(grid.headerRow, "contextmenu", this);
  }
  onchange(e) {
    const grid = this.grid;
    const t = e.target;
    const field = t.dataset.name;
    if (t.checked) {
      grid.showColumn(field);
    } else {
      if (grid.visibleColumns().length <= 1) {
        t.checked = true;
        return;
      }
      grid.hideColumn(field);
    }
    grid.fixPage();
  }
  oncontextmenu(e) {
    e.preventDefault();
    const grid = this.grid;
    const target = getParentElement(e.target, "THEAD");
    const menu = this.menu;
    const rect = target.getBoundingClientRect();
    let x = e.clientX - rect.left;
    const y = e.clientY - rect.top;
    menu.style.top = `${y}px`;
    menu.style.left = `${x}px`;
    removeAttribute(menu, "hidden");
    if (x + 150 > rect.width) {
      x -= menu.offsetWidth;
      menu.style.left = `${x}px`;
    }
    const documentClickHandler = (e2) => {
      if (!menu.contains(e2.target)) {
        setAttribute(menu, "hidden", "");
        off(document, "click", documentClickHandler);
      }
    };
    on(document, "click", documentClickHandler);
  }
  createMenu() {
    const grid = this.grid;
    const menu = this.menu;
    while (menu.lastChild) {
      menu.removeChild(menu.lastChild);
    }
    menu.addEventListener("change", this);
    for (const col of grid.options.columns) {
      if (col.attr) {
        continue;
      }
      const li = document.createElement("li");
      const label = document.createElement("label");
      const checkbox = document.createElement("input");
      setAttribute(checkbox, "type", "checkbox");
      setAttribute(checkbox, "data-name", col.field);
      if (!col.hidden) {
        checkbox.checked = true;
      }
      const text = document.createTextNode(col.title);
      label.appendChild(checkbox);
      label.appendChild(text);
      li.appendChild(label);
      menu.appendChild(li);
    }
  }
};
var context_menu_default = ContextMenu;

// src/plugins/draggable-headers.js
var DraggableHeaders = class extends base_plugin_default {
  /**
   * @param {HTMLTableCellElement} th
   */
  makeHeaderDraggable(th) {
    const grid = this.grid;
    th.draggable = true;
    on(th, "dragstart", (e) => {
      if (grid.plugins.ColumnResizer?.isResizing && e.preventDefault) {
        e.preventDefault();
        return;
      }
      grid.log("reorder col");
      e.dataTransfer.effectAllowed = "move";
      e.dataTransfer.setData("text/plain", e.target.getAttribute("aria-colindex"));
    });
    on(th, "dragover", (e) => {
      if (e.preventDefault) {
        e.preventDefault();
      }
      e.dataTransfer.dropEffect = "move";
      return false;
    });
    on(th, "drop", (e) => {
      if (e.stopPropagation) {
        e.stopPropagation();
      }
      const t = e.target;
      const target = getParentElement(t, "TH");
      const index = Number.parseInt(e.dataTransfer.getData("text/plain"));
      const targetIndex = Number.parseInt(target.getAttribute("aria-colindex"));
      if (index === targetIndex) {
        grid.log("reordered col stayed the same");
        return;
      }
      grid.log(`reordered col from ${index} to ${targetIndex}`);
      const offset = grid.startColIndex();
      const tmp = grid.options.columns[index - offset];
      grid.options.columns[index - offset] = grid.options.columns[targetIndex - offset];
      grid.options.columns[targetIndex - offset] = tmp;
      const swapNodes = (selector, el1) => {
        const rowIndex = el1.parentNode.getAttribute("aria-rowindex");
        const el2 = grid.querySelector(
          `${selector} tr[aria-rowindex="${rowIndex}"] [aria-colindex="${targetIndex}"]`
        );
        setAttribute(el1, "aria-colindex", targetIndex);
        setAttribute(el2, "aria-colindex", index);
        const newNode = document.createElement("th");
        el1.parentNode.insertBefore(newNode, el1);
        el2.parentNode.replaceChild(el1, el2);
        newNode.parentNode.replaceChild(el2, newNode);
      };
      for (const el1 of findAll(grid, `thead th[aria-colindex="${index}"]`)) {
        swapNodes("thead", el1);
      }
      for (const el1 of findAll(grid, `tbody td[aria-colindex="${index}"]`)) {
        swapNodes("tbody", el1);
      }
      grid.options.columns = findAll(grid, "thead tr.dg-head-columns th[field]").map(
        (th2) => grid.options.columns.find((c) => c.field === getAttribute(th2, "field"))
      );
      dispatch(grid, "columnReordered", {
        col: tmp.field,
        from: index,
        to: targetIndex
      });
      return false;
    });
  }
};
var draggable_headers_default = DraggableHeaders;

// src/plugins/touch-support.js
var TouchSupport = class extends base_plugin_default {
  constructor(grid) {
    super(grid);
    this.touch = null;
  }
  connected() {
    const grid = this.grid;
    grid.addEventListener("touchstart", this, { passive: true });
    grid.addEventListener("touchmove", this, { passive: true });
  }
  disconnected() {
    const grid = this.grid;
    grid.removeEventListener("touchstart", this);
    grid.removeEventListener("touchmove", this);
  }
  ontouchstart(e) {
    this.touch = e.touches[0];
  }
  ontouchmove(e) {
    if (!this.touch) {
      return;
    }
    const grid = this.grid;
    const xDiff = this.touch.clientX - e.touches[0].clientX;
    const yDiff = this.touch.clientY - e.touches[0].clientY;
    if (Math.abs(xDiff) > Math.abs(yDiff)) {
      if (xDiff > 0) {
        grid.getNext();
      } else {
        grid.getPrev();
      }
    }
    this.touch = null;
  }
};
var touch_support_default = TouchSupport;

// src/plugins/selectable-rows.js
var SELECTABLE_CLASS = "dg-selectable";
var SELECT_ALL_CLASS = "dg-select-all";
var CHECKBOX_CLASS = "form-check-input";
var SelectableRows = class extends base_plugin_default {
  #cbSelector = `tbody tr${this.visibleOnly ? ":not([hidden])" : ""} .${SELECTABLE_CLASS} input[type=checkbox]`;
  #inputSelector = `tbody .${SELECTABLE_CLASS} input`;
  disconnected() {
    if (this.selectAll) {
      this.selectAll.removeEventListener("change", this);
    }
  }
  get isSingleSelect() {
    return this.grid.options.singleSelect;
  }
  get visibleOnly() {
    return this.grid.options.selectVisibleOnly;
  }
  /**
   * Get selected rows or fields.
   * Returns full rows, a single field's values, or objects with specified fields.
   * In single select mode, returns a single item.
   * @param {...string} keys Field names to select.
   * @returns {Array|Object} Selected data.
   */
  getSelection(...keys) {
    const grid = this.grid;
    const selectedData = [];
    const inputs = findAll(grid, `${this.#inputSelector}:checked`);
    for (const checkbox of inputs) {
      const idx = Number.parseInt(checkbox.dataset.id);
      const item = grid.data[idx - 1];
      if (!item) {
        console.warn(`Item ${idx} not found`);
        continue;
      }
      if (keys.length === 0) {
        selectedData.push(item);
      } else if (keys.length === 1) {
        selectedData.push(item[keys[0]]);
      } else {
        selectedData.push(Object.fromEntries(keys.map((k) => [k, item[k]])));
      }
    }
    return this.isSingleSelect ? selectedData[0] ?? {} : selectedData;
  }
  /**
   * Uncheck box if hidden and visible only
   * @param {HTMLTableSectionElement} tbody
   */
  clearCheckboxes(tbody) {
    const grid = this.grid;
    if (!grid.options.selectVisibleOnly) {
      return;
    }
    const inputs = findAll(tbody, `tr[hidden] .${SELECTABLE_CLASS} input`);
    for (const input of inputs) {
      input.checked = false;
      if (this.isSingleSelect) {
        input.dataset.toggled = "false";
      }
    }
    this.selectAll.checked = false;
  }
  colIndex() {
    return this.grid.startColIndex() - 2;
  }
  /**
   * @param {HTMLTableRowElement} tr
   */
  createHeaderCol(tr) {
    const th = document.createElement("th");
    setAttribute(th, "scope", "col");
    setAttribute(th, "role", "columnheader button");
    setAttribute(th, "aria-colindex", this.colIndex());
    th.classList.add(...[SELECTABLE_CLASS, "dg-not-resizable", "dg-not-sortable"]);
    th.tabIndex = 0;
    this.selectAll = document.createElement("input");
    this.selectAll.type = "checkbox";
    this.selectAll.classList.add(SELECT_ALL_CLASS);
    this.selectAll.classList.add(CHECKBOX_CLASS);
    this.selectAll.addEventListener("change", this);
    const label = document.createElement("label");
    label.hidden = this.isSingleSelect;
    label.appendChild(this.selectAll);
    th.appendChild(label);
    th.setAttribute("width", "40");
    tr.appendChild(th);
  }
  /**
   * @param {HTMLTableRowElement} tr
   */
  createFilterCol(tr) {
    const th = document.createElement("th");
    setAttribute(th, "role", "columnheader button");
    setAttribute(th, "aria-colindex", this.colIndex());
    th.classList.add(SELECTABLE_CLASS);
    th.tabIndex = 0;
    tr.appendChild(th);
  }
  /**
   * Handles the selectAll checkbox when any other .dg-selectable checkbox is checked on table body.
   * It should check selectAll if all is checked
   * It should uncheck selectAll if any is unchecked
   * @param {HTMLTableSectionElement} tbody
   */
  shouldSelectAll(tbody) {
    if (!this.selectAll) {
      return;
    }
    tbody.addEventListener("change", this);
    tbody.dispatchEvent(new Event("change"));
  }
  /**
   * @param {HTMLTableRowElement} tr
   */
  createDataCol(tr) {
    const td = document.createElement("td");
    setAttribute(td, "role", "gridcell button");
    setAttribute(td, "aria-colindex", this.colIndex());
    td.classList.add(SELECTABLE_CLASS);
    const input = document.createElement("input");
    input.dataset.id = tr.getAttribute("aria-rowindex");
    input.type = this.isSingleSelect ? "radio" : "checkbox";
    input.classList.add(CHECKBOX_CLASS);
    if (this.isSingleSelect) {
      input.name = "dg-row-select";
      input.dataset.toggled = "false";
    }
    const label = document.createElement("label");
    label.classList.add("dg-clickable-cell");
    label.appendChild(input);
    td.appendChild(label);
    label.addEventListener("click", this);
    tr.appendChild(td);
  }
  /**
   * @param {Event} e
   */
  onclick(e) {
    if (!this.isSingleSelect) return e.stopPropagation();
    const el = e.target, unchecked = el.dataset.toggled !== "true";
    unchecked && $$(`${this.#cbSelector.replace("checkbox", "radio")}`, this.grid)?.forEach((r) => {
      if (r.name === el.name && r !== el) r.checked = r.dataset.toggled = false;
    });
    el.checked = el.dataset.toggled = unchecked;
    !unchecked && this.onchange(e);
  }
  /**
   * Handle change event on select all or any select checkbox in the table body
   * @param {import("../utils/shortcuts.js").FlexibleEvent} e
   */
  onchange(e) {
    const el = e.target, grid = this.grid;
    if (hasClass(e.target, SELECT_ALL_CLASS)) {
      findAll(grid, this.#inputSelector).forEach((cb) => {
        if (!this.visibleOnly || cb.offsetWidth) cb.checked = this.selectAll.checked;
      });
    } else if (el.matches(this.#cbSelector)) {
      if (!el.closest(`.${SELECTABLE_CLASS}`)) return;
      const totalCheckboxes = findAll(grid, this.#cbSelector);
      this.selectAll.checked = totalCheckboxes.every((n) => n.checked);
    }
    if (el.matches(`.${SELECT_ALL_CLASS},${this.#inputSelector}`)) {
      dispatch(el, "rowsSelected", {
        selection: grid.getSelection()
      }, true);
    }
  }
};
var selectable_rows_default = SelectableRows;

// src/plugins/fixed-height.js
var FixedHeight = class extends base_plugin_default {
  constructor(grid) {
    super(grid);
    this.hasFixedHeight = false;
    if (grid.style.height) {
      grid.style.overflowY = "auto";
      this.hasFixedHeight = true;
    }
  }
  /**
   */
  createFakeRow() {
    const grid = this.grid;
    const tbody = grid.querySelector("tbody");
    const tr = document.createElement("tr");
    setAttribute(tr, "role", "row");
    setAttribute(tr, "hidden", "");
    tr.classList.add("dg-fake-row");
    tr.tabIndex = 0;
    tbody?.appendChild(tr);
  }
  get fakeRow() {
    return this.grid.querySelector(".dg-fake-row");
  }
  /**
   * On last page, use a fake row to push footer down
   */
  updateFakeRow() {
    const grid = this.grid;
    const fakeRow = this.fakeRow;
    if (!fakeRow) {
      return;
    }
    if (grid.options.perPage > grid.totalRecords()) {
      return;
    }
    if (grid.page !== grid.totalPages()) {
      return;
    }
    if (!grid.options.autoheight) {
      return;
    }
    const max = grid.options.perPage * grid.rowHeight;
    const visibleRows = grid.querySelectorAll("tbody tr:not([hidden])").length;
    const fakeHeight = visibleRows > 1 ? max - visibleRows * grid.rowHeight : max;
    if (fakeHeight > 0) {
      setAttribute(fakeRow, "height", fakeHeight);
      fakeRow.removeAttribute("hidden");
    } else {
      fakeRow.removeAttribute("height");
    }
  }
};
var fixed_height_default = FixedHeight;

// src/plugins/autosize-column.js
var AutosizeColumn = class extends base_plugin_default {
  /**
   * Autosize col based on column data
   * @param {HTMLTableCellElement} th
   * @param {import("../data-grid").Column} column
   * @param {Number} min
   * @param {Number} max
   * @returns {Number}
   */
  computeSize(th, column, min, max) {
    const grid = this.grid;
    if (hasAttribute(th, "width")) {
      return getAttribute(th, "width");
    }
    if (!grid.data.length) {
      return;
    }
    const firstVal = grid.data[0];
    const lastVal = grid.data[grid.data.length - 1];
    let v = firstVal[column.field] ? firstVal[column.field].toString() : "";
    const v2 = lastVal[column.field] ? lastVal[column.field].toString() : "";
    if (v2.length > v.length) {
      v = v2;
    }
    let width = 0;
    if (v.length <= 6) {
      width = min;
    } else if (v.length > 50) {
      width = max;
    } else {
      width = getTextWidth(`${v}0000`, th);
    }
    if (width > max) {
      width = max;
    }
    if (width < min) {
      width = min;
    }
    setAttribute(th, "width", width);
    return width;
  }
};
var autosize_column_default = AutosizeColumn;

// src/plugins/responsive-grid.js
var RESPONSIVE_CLASS = "dg-responsive";
var obsTo;
function sortByPriority(list) {
  return list.sort((a, b) => {
    const v1 = Number.parseInt(a.dataset.responsive) || 1;
    const v2 = Number.parseInt(b.dataset.responsive) || 1;
    return v2 - v1;
  });
}
var callback = debounce((entries) => {
  for (const entry of entries) {
    const grid = entry.target;
    const table = grid.table;
    if (grid.plugins.ResponsiveGrid.observerBlocked) {
      return;
    }
    const contentBoxSize = Array.isArray(entry.contentBoxSize) ? entry.contentBoxSize[0] : entry.contentBoxSize;
    const size = Number.parseInt(contentBoxSize.inlineSize);
    const tableWidth = table.offsetWidth;
    const realTableWidth = findAll(grid.headerRow, "th").reduce((result, th) => {
      return result + th.offsetWidth;
    }, 0);
    const diff = (realTableWidth || tableWidth) - size - 1;
    const minWidth = 50;
    const prevAction = grid.plugins.ResponsiveGrid.prevAction;
    const headerCols = sortByPriority(
      findAll(grid.headerRow, "th[field]").reverse().filter((col) => {
        return col.dataset.responsive !== "0";
      })
    );
    let changed = false;
    grid.log(`table is ${tableWidth}/${realTableWidth} and available size is ${size}. Diff: ${diff}`);
    if (diff > 0) {
      if (prevAction === "show") {
        return;
      }
      grid.plugins.ResponsiveGrid.prevAction = "hide";
      let remaining = diff;
      let cols = headerCols.filter((col) => {
        return !col.hasAttribute("hidden") && col.hasAttribute("data-responsive");
      });
      if (cols.length === 0) {
        cols = headerCols.filter((col) => {
          return !col.hasAttribute("hidden");
        });
        if (cols.length === 1) {
          return;
        }
      }
      for (const col of cols) {
        if (remaining < 0) {
          continue;
        }
        const colWidth = col.offsetWidth;
        const field = col.getAttribute("field");
        if (!field) {
          continue;
        }
        col.dataset.baseWidth = `${col.offsetWidth}`;
        grid.hideColumn(field, false);
        grid.setColProp(field, "responsiveHidden", true);
        changed = true;
        remaining -= colWidth;
        remaining = Math.round(remaining);
      }
    } else {
      if (prevAction === "hide") {
        return;
      }
      grid.plugins.ResponsiveGrid.prevAction = "show";
      const requiredWidth = headerCols.filter((col) => {
        return !col.hasAttribute("hidden");
      }).reduce((result, col) => {
        const width = col.dataset.minWidth ? Number.parseInt(col.dataset.minWidth) : col.offsetWidth;
        return result + width;
      }, 0) + minWidth;
      let remaining = size - requiredWidth;
      const filteredHeaderCols = headerCols.slice().reverse().filter((col) => {
        return col.hasAttribute("hidden");
      });
      for (const col of filteredHeaderCols) {
        if (remaining < minWidth) {
          continue;
        }
        const colWidth = Number.parseInt(col.dataset.minWidth);
        if (colWidth > remaining) {
          remaining = -1;
          continue;
        }
        const field = col.getAttribute("field");
        if (!field) {
          continue;
        }
        grid.showColumn(field, false);
        grid.setColProp(field, "responsiveHidden", false);
        changed = true;
        remaining -= colWidth;
        remaining = Math.round(remaining);
      }
    }
    const footer = find(grid.table, "tfoot");
    const realFooterWidth = findAll(grid.table, ".dg-footer > div").reduce((result, div) => {
      return result + div.offsetWidth;
    }, 0);
    const availableFooterWidth = footer.offsetWidth - realFooterWidth;
    if (realFooterWidth > size) {
      addClass(footer, "dg-footer-compact");
    } else if (availableFooterWidth > 250) {
      removeClass(footer, "dg-footer-compact");
    }
    if (changed) {
      grid.renderTable();
    }
    setTimeout(() => {
      grid.plugins.ResponsiveGrid.prevAction = null;
    }, 1e3);
    grid.table.style.visibility = "visible";
  }
}, 100);
var resizeObserver = new ResizeObserver(callback);
var ResponsiveGrid = class extends base_plugin_default {
  constructor(grid) {
    super(grid);
    this.observerBlocked = false;
    this.prevAction = null;
  }
  connected() {
    if (this.grid.options.responsive) {
      this.observe();
    }
  }
  disconnected() {
    this.unobserve();
  }
  observe() {
    if (!this.grid.options.responsive) {
      return;
    }
    resizeObserver.observe(this.grid);
    this.grid.style.display = "block";
    this.grid.style.overflowX = "hidden";
  }
  unobserve() {
    resizeObserver.unobserve(this.grid);
    this.grid.style.display = "unset";
    this.grid.style.overflowX = "unset";
  }
  blockObserver() {
    this.observerBlocked = true;
    if (obsTo) {
      clearTimeout(obsTo);
    }
  }
  unblockObserver() {
    obsTo = setTimeout(() => {
      this.observerBlocked = false;
    }, 200);
  }
  /**
   * @returns {Boolean}
   */
  hasHiddenColumns() {
    let flag = false;
    for (const col of this.grid.options.columns) {
      if (col.responsiveHidden) {
        flag = true;
      }
    }
    return flag;
  }
  colIndex() {
    return this.grid.startColIndex() - 1;
  }
  /**
   * @param {HTMLTableRowElement} tr
   */
  createHeaderCol(tr) {
    if (!this.grid.options.responsiveToggle) {
      return;
    }
    const th = ce("th", tr);
    setAttribute(th, "scope", "col");
    setAttribute(th, "role", "columnheader button");
    setAttribute(th, "aria-colindex", this.colIndex());
    setAttribute(th, "width", "40");
    th.classList.add(...[`${RESPONSIVE_CLASS}-toggle`, "dg-not-resizable", "dg-not-sortable"]);
    th.tabIndex = 0;
  }
  /**
   * @param {HTMLTableRowElement} tr
   */
  createFilterCol(tr) {
    if (!this.grid.options.responsiveToggle) {
      return;
    }
    const th = ce("th", tr);
    setAttribute(th, "role", "columnheader button");
    setAttribute(th, "aria-colindex", this.colIndex());
    th.classList.add(`${RESPONSIVE_CLASS}-toggle`);
    th.tabIndex = 0;
  }
  /**
   * @param {HTMLTableRowElement} tr
   */
  createDataCol(tr) {
    if (!this.grid.options.responsiveToggle) {
      return;
    }
    const td = document.createElement("td");
    setAttribute(td, "role", "gridcell button");
    setAttribute(td, "aria-colindex", this.colIndex());
    td.classList.add(`${RESPONSIVE_CLASS}-toggle`);
    td.innerHTML = `<div class='dg-clickable-cell'><svg class='${RESPONSIVE_CLASS}-open' viewbox="0 0 24 24" height="24" width="24">
  <line x1="7" y1="12" x2="17" y2="12" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" />
  <line y1="7" x1="12" y2="17" x2="12" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" />
</svg>
<svg class='${RESPONSIVE_CLASS}-close' viewbox="0 0 24 24" height="24" width="24" style="display:none">
  <line x1="7" y1="12" x2="17" y2="12" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" />
</svg></div>`;
    tr.appendChild(td);
    td.addEventListener("click", this);
    td.addEventListener("mousedown", this);
  }
  computeLabelWidth() {
    let idealWidth = 0;
    let consideredCol = 0;
    while (idealWidth < 120) {
      consideredCol++;
      const hCol = find(this.grid, `.dg-head-columns th[aria-colindex="${consideredCol}"]`);
      if (hCol) {
        idealWidth += hCol.offsetWidth;
      } else {
        break;
      }
    }
    return idealWidth;
  }
  /**
   * @param {Event} ev
   */
  onmousedown(ev) {
    ev.preventDefault();
  }
  /**
   * @param {Event} ev
   */
  onclick(ev) {
    ev.stopPropagation();
    const td = ev.currentTarget;
    const tr = td.parentElement;
    const open = find(td, `.${RESPONSIVE_CLASS}-open`);
    const close = find(td, `.${RESPONSIVE_CLASS}-close`);
    this.blockObserver();
    const isExpanded = hasClass(tr, `${RESPONSIVE_CLASS}-expanded`);
    if (isExpanded) {
      removeClass(tr, `${RESPONSIVE_CLASS}-expanded`);
      open.style.display = "unset";
      close.style.display = "none";
      const childRow = tr.nextElementSibling;
      const hiddenCols = findAll(childRow, `.${RESPONSIVE_CLASS}-hidden`);
      for (const col of hiddenCols) {
        tr.appendChild(col);
        setAttribute(col, "hidden");
      }
      childRow.parentElement.removeChild(childRow);
    } else {
      addClass(tr, `${RESPONSIVE_CLASS}-expanded`);
      open.style.display = "none";
      close.style.display = "unset";
      const childRow = ce("tr");
      insertAfter(childRow, tr);
      addClass(childRow, `${RESPONSIVE_CLASS}-child-row`);
      const childRowTd = ce("td", childRow);
      setAttribute(childRowTd, "colspan", this.grid.columnsLength(true));
      const childTable = ce("table", childRowTd);
      addClass(childTable, `${RESPONSIVE_CLASS}-table`);
      const hiddenCols = findAll(tr, `.${RESPONSIVE_CLASS}-hidden`);
      const idealWidth = this.computeLabelWidth();
      for (const col of hiddenCols) {
        const childTableRow = ce("tr", childTable);
        const label = col.dataset.name;
        const labelCol = ce("th", childTableRow);
        labelCol.style.width = `${idealWidth}px`;
        labelCol.innerHTML = label;
        childTableRow.appendChild(col);
        removeAttribute(col, "hidden");
      }
    }
    this.unblockObserver();
  }
};
var responsive_grid_default = ResponsiveGrid;

// src/plugins/row-actions.js
var RowActions = class extends base_plugin_default {
  /**
   * @returns {Boolean}
   */
  hasActions() {
    return this.grid.options.actions.length > 0;
  }
  /**
   *
   * @param {HTMLTableRowElement} tr
   */
  makeActionHeader(tr) {
    const actionsTh = document.createElement("th");
    setAttribute(actionsTh, "role", "columnheader button");
    setAttribute(actionsTh, "aria-colindex", this.grid.columnsLength(true));
    actionsTh.classList.add(...["dg-actions", "dg-not-sortable", "dg-not-resizable", this.actionClass]);
    actionsTh.tabIndex = 0;
    tr.appendChild(actionsTh);
  }
  /**
   *
   * @param {HTMLTableRowElement} tr
   */
  makeActionFilter(tr) {
    const actionsTh = document.createElement("th");
    actionsTh.setAttribute("role", "columnheader button");
    setAttribute(actionsTh, "aria-colindex", this.grid.columnsLength(true));
    actionsTh.classList.add(...["dg-actions", this.actionClass]);
    actionsTh.tabIndex = 0;
    tr.appendChild(actionsTh);
  }
  /**
   * @param {HTMLTableRowElement} tr
   * @param {Object} item
   */
  makeActionRow(tr, item) {
    const labels2 = this.grid.labels;
    const td = document.createElement("td");
    setAttribute(td, "role", "gridcell");
    setAttribute(td, "aria-colindex", this.grid.columnsLength(true));
    td.classList.add(...["dg-actions", this.actionClass]);
    td.tabIndex = 0;
    const actionsToggle = document.createElement("button");
    actionsToggle.classList.add("dg-actions-toggle");
    actionsToggle.innerHTML = "\u2630";
    td.appendChild(actionsToggle);
    on(actionsToggle, "click", (ev) => {
      ev.stopPropagation();
      ev.target.parentElement.classList.toggle("dg-actions-expand");
    });
    for (const action of this.grid.options.actions) {
      const button = document.createElement("button");
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
          const c = confirm(labels2.areYouSure);
          if (!c) {
            ev.preventDefault();
            return;
          }
        }
        dispatch(this.grid, "action", {
          data: item,
          action: action.name
        });
      };
      button.addEventListener("click", actionHandler);
      td.appendChild(button);
      if (action.default) {
        tr.classList.add("dg-actionable");
        tr.addEventListener("click", actionHandler);
      }
    }
    tr.appendChild(td);
  }
  get actionClass() {
    if (this.grid.options.actions.length < 3 && !this.grid.options.collapseActions) {
      return `dg-actions-${this.grid.options.actions.length}`;
    }
    return "dg-actions-more";
  }
};
var row_actions_default = RowActions;

// src/plugins/editable-column.js
var EditableColumn = class extends base_plugin_default {
  /**
   *
   * @param {HTMLTableCellElement} td
   * @param {import("../data-grid").Column} column
   * @param {Object} item
   * @param {number} i
   */
  makeEditableInput(td, column, item, i) {
    const gridId = this.grid.getAttribute("id");
    const input = document.createElement("input");
    input.type = column.editableType || "text";
    if (input.type === "email") {
      input.inputMode = "email";
    }
    if (input.type === "decimal") {
      input.type = "text";
      input.inputMode = "decimal";
    }
    input.autocomplete = "off";
    input.spellcheck = false;
    input.tabIndex = 0;
    input.classList.add("dg-editable");
    input.name = `${gridId.replace("-", "_")}[${i + 1}][${column.field}]`;
    input.value = item[column.field];
    input.dataset.field = column.field;
    input.addEventListener("click", (ev) => ev.stopPropagation());
    input.addEventListener("keypress", (ev) => {
      if (ev.type === "keypress") {
        const key = ev.keyCode || ev.key;
        if (key === 13 || key === "Enter") {
          input.blur();
          ev.preventDefault();
        }
      }
    });
    input.addEventListener("blur", () => {
      if (input.value === item[input.dataset.field]) {
        return;
      }
      item[input.dataset.field] = input.value;
      dispatch(this.grid, "edit", {
        data: item,
        value: input.value
      });
    });
    td.appendChild(input);
  }
};
var editable_column_default = EditableColumn;

// src/plugins/spinner-support.js
var SpinnerSupport = class extends base_plugin_default {
  connected() {
    if (this.grid.options.spinnerClass && this.grid.plugins.SpinnerSupport) {
      this.add();
    }
  }
  /**
   * Adds a spinner element with its associated css styles.
   */
  add() {
    const grid = this.grid;
    const classes = grid.options.spinnerClass;
    if (!classes) {
      return;
    }
    const cls = classes.split(" ").map((e) => `.${e}`).join("");
    const template = `
<style id="dg-styles">
  data-grid ${cls} { position: absolute; top: 37%; left: 47%; z-index: 999; }
  data-grid:not(.dg-loading) ${cls} { display: none; }
  data-grid:not(.dg-initialized).dg-loading ${cls} { top: 0; }
  @media only screen and (max-width: 767px) {
    data-grid[responsive] ${cls} { top: 8rem; left: 42%; }
  }
</style>
`;
    if (!$("#dg-styles")) {
      const styleParent = $("head") ?? $("body");
      const position = /head/i.test(styleParent.tagName) ? "beforeend" : "afterbegin";
      styleParent.insertAdjacentHTML(position, template);
    }
    !$(`i${cls}`, grid) && grid.insertAdjacentHTML("afterbegin", `<i class="${classes}"></i>`);
  }
};
var spinner_support_default = SpinnerSupport;

// src/plugins/save-state.js
var SaveState = class extends base_plugin_default {
  constructor(grid) {
    super(grid);
    this.cachedState = null;
    this.isFilterSortSet = false;
    this.isDataLoaded = false;
    this.isScrolled = false;
    this.log("Init");
  }
  async connected() {
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
      const waitForColumns = async () => {
        if (!grid.options.server) return;
        let timeout = 500, start = Date.now(), colAbsent;
        while ((colAbsent = !grid.options.columns?.length) && Date.now() - start < timeout) {
          await new Promise((resolve) => requestAnimationFrame(resolve));
        }
        colAbsent && this.log("Timeout waiting for columns.");
      };
      const restoreState = async () => {
        await waitForColumns();
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
      };
      await restoreState();
    }
    this.cachedState = cachedState;
    this.log("cachedState", this.cachedState);
    const dgLoadData = grid.loadData;
    grid.loadData = function(...args) {
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
          grid.querySelector(`thead tr.dg-head-columns th[field='${saveState.cachedState.sort}']`)?.setAttribute("aria-sort", saveState.cachedState.sortDir);
          const filters2 = findAll(grid.filterRow, "[id^=dg-filter]");
          saveState.log("filters", filters2);
          for (const el of filters2) {
            el.value = saveState?.cachedState?.filters?.[el.dataset.name] ?? "";
            saveState.log({ name: el.dataset.name, val: el.value, saveState });
          }
          saveState.isFilterSortSet = true;
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
    } catch (_) {
    }
    return state;
  }
  /**
   * @param {GridState} state
   */
  _setState(state) {
    sessionStorage.setItem(`gridSaveState_${this.grid.id}`, JSON.stringify(state));
  }
};
var save_state_default = SaveState;

// data-grid.js
data_grid_default.registerPlugins({
  ColumnResizer: column_resizer_default,
  ContextMenu: context_menu_default,
  DraggableHeaders: draggable_headers_default,
  TouchSupport: touch_support_default,
  SelectableRows: selectable_rows_default,
  FixedHeight: fixed_height_default,
  AutosizeColumn: autosize_column_default,
  ResponsiveGrid: responsive_grid_default,
  RowActions: row_actions_default,
  EditableColumn: editable_column_default,
  SpinnerSupport: spinner_support_default,
  SaveState: save_state_default
});
if (!customElements.get("data-grid")) {
  customElements.define("data-grid", data_grid_default);
}
var data_grid_default2 = data_grid_default;
var global = typeof globalThis !== "undefined" ? globalThis : self;
global.DataGrid = data_grid_default;
export {
  data_grid_default2 as default
};
/**
 * Data Grid custom element
 * https://github.com/lekoala/data-grid/
 * @license MIT
 */
//# sourceMappingURL=data-grid.js.map
