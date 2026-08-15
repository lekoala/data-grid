/*** Data Grid Web Component * https://github.com/lekoala/data-grid ***/

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
function $$2(selector, base = document) {
  return Array.from(base.querySelectorAll(selector));
}
function find(el, selector) {
  return $(selector, el);
}
function findAll(el, selector) {
  return $$2(selector, el);
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
    this.options = /** @type {Options} */
    Object.assign({}, this.defaultOptions, options);
    this.log("constructor");
    this.setup = false;
    this.rendered = false;
    this.fireEvents = true;
    this._ready();
    this.log("ready");
  }
  /**
   * @returns {Object}
   */
  get defaultOptions() {
    return {};
  }
  /**
   * @returns {Array}
   */
  static get observedAttributes() {
    return [];
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
   * This is called when connected. Extend in subclass if needed.
   */
  _connected() {
  }
  /**
   * This is called when disconnected. Extend in subclass if needed.
   */
  _disconnected() {
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
  connectedCallback() {
    if (this.setup) {
      return;
    }
    this.setup = true;
    setTimeout(async () => {
      this.log("connectedCallback");
      if (!this.rendered) {
        const template = document.createElement("template");
        template.innerHTML = this.constructor.template();
        this.appendChild(template.content.cloneNode(true));
        this.rendered = true;
      }
      await this._connected();
      dispatch(this, "connected");
    }, 0);
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
   * Custom transformers per attribute name.
   * @returns {Object}
   */
  get transformAttributes() {
    return {};
  }
  /**
   * Observed attributes map to options (kebab-case -> camelCase).
   * An attribute without a value means "true".
   * @param {String} attributeName
   * @param {String} oldValue
   * @param {String} newValue
   */
  attributeChangedCallback(attributeName, oldValue, newValue) {
    if (oldValue === newValue) {
      return;
    }
    this.log(`attributeChangedCallback: ${attributeName}`);
    const transformer = this.transformAttributes[attributeName] ?? normalizeData;
    const attr = camelize(attributeName);
    const raw = newValue === "" ? "true" : newValue;
    this.options[attr] = transformer(raw);
    if (this.fireEvents && this[`${attr}Changed`]) {
      this[`${attr}Changed`]();
    }
  }
};
var base_element_default = BaseElement;

// src/data-source.js
function encodeSearchParams(value, prefix = "", out = new URLSearchParams()) {
  if (value === null || value === void 0) {
    return out;
  }
  if (Array.isArray(value)) {
    for (let i = 0; i < value.length; i++) {
      encodeSearchParams(value[i], `${prefix}[${i}]`, out);
    }
    return out;
  }
  if (typeof value === "object") {
    for (const key of Object.keys(value)) {
      encodeSearchParams(value[key], prefix ? `${prefix}[${key}]` : key, out);
    }
    return out;
  }
  let v = value;
  if (typeof v === "boolean") {
    v = v ? "true" : "false";
  }
  out.append(prefix, `${v}`);
  return out;
}
function applyFilters(rows, filters) {
  if (!filters) {
    return rows.slice();
  }
  return rows.filter((item) => {
    for (const [field, filter] of Object.entries(filters)) {
      const operator = filter?.operator ?? "contains";
      const value = filter?.value;
      if (value === null || value === void 0 || value === "") {
        continue;
      }
      const cell = `${item[field] ?? ""}`;
      const cellLower = cell.toLowerCase();
      const valueLower = String(value).toLowerCase();
      switch (operator) {
        case "eq":
          if (cell !== String(value)) return false;
          break;
        case "neq":
          if (cell === String(value)) return false;
          break;
        case "startsWith":
          if (!cellLower.startsWith(valueLower)) return false;
          break;
        case "endsWith":
          if (!cellLower.endsWith(valueLower)) return false;
          break;
        default:
          if (!cellLower.includes(valueLower)) return false;
      }
    }
    return true;
  });
}
function applySort(rows, sort) {
  if (!sort?.length) {
    return rows.slice();
  }
  const { field, direction } = sort[0];
  const dir = direction === "desc" ? -1 : 1;
  return rows.slice().sort((a, b) => {
    if (typeof a[field] === "number" && typeof b[field] === "number") {
      return (a[field] - b[field]) * dir;
    }
    const valA = `${a[field] ?? ""}`.toUpperCase();
    const valB = `${b[field] ?? ""}`.toUpperCase();
    if (valA > valB) return dir;
    if (valA < valB) return -dir;
    return 0;
  });
}
function paginate(rows, page, pageSize) {
  const start = (page - 1) * pageSize;
  return rows.slice(start, start + pageSize);
}
function parseResult(json) {
  if (Array.isArray(json)) {
    return { rows: json, total: json.length, meta: {} };
  }
  const rows = Array.isArray(json?.data) ? json.data : [];
  const meta = json?.meta ?? {};
  return { rows, total: meta.filtered ?? rows.length, meta };
}
var FetchDataSource = class {
  /**
   * @param {String} url
   * @param {Object} [options]
   * @param {Object} [options.params] Extra constant HTTP params appended to each request
   * @param {(query: QueryState) => any} [options.serializeQuery] Defaults to identity (QueryState preserved)
   * @param {(response: any) => PageResult} [options.parseResponse] Defaults to parseResult
   */
  constructor(url, { params = {}, serializeQuery = null, parseResponse = null } = {}) {
    this.url = url;
    this.params = params;
    this.serializeQuery = serializeQuery;
    this.parseResponse = parseResponse;
  }
  /**
   * @param {QueryState} query
   * @returns {URL}
   */
  buildUrl(query) {
    let base = window.location.href;
    if (!base || base === "about:blank") {
      base = "http://localhost/";
    }
    if (!base.split("/").pop().includes(".")) {
      base += base.endsWith("/") ? "" : "/";
    }
    const url = new URL(this.url, base);
    const serialized = this.serializeQuery ? this.serializeQuery(query) : query;
    const merged = { ...serialized, ...this.params, r: Date.now() };
    encodeSearchParams(merged, "", url.searchParams);
    return url;
  }
  /**
   * @param {QueryState} query
   * @param {{signal?: AbortSignal}} [options]
   * @returns {Promise<PageResult>}
   */
  async load(query, { signal } = {}) {
    const url = this.buildUrl(query);
    let response;
    try {
      response = await fetch(url, { signal });
    } catch (err) {
      if (signal?.aborted) {
        throw err;
      }
      throw new Error("Network response error");
    }
    if (!response.ok) {
      const error = (
        /** @type {any} */
        new Error(response.statusText || "Network response error")
      );
      error.response = response;
      throw error;
    }
    const json = await response.json();
    return this.parseResponse ? this.parseResponse(json) : parseResult(json);
  }
};
var ArrayDataSource = class _ArrayDataSource {
  /**
   * @param {Array<Record<string, any>>} [rows]
   */
  constructor(rows = []) {
    this.rows = Array.isArray(rows) ? rows : [];
  }
  /**
   * Create a local data source by fetching a static file once.
   * @param {String} url
   * @param {(response: any) => PageResult} [parseResponse]
   * @returns {Promise<ArrayDataSource>}
   */
  static async fromUrl(url, parseResponse = null) {
    const response = await fetch(url);
    if (!response.ok) {
      throw new Error(response.statusText || "Network response error");
    }
    const json = await response.json();
    const result = parseResponse ? parseResponse(json) : parseResult(json);
    return new _ArrayDataSource(result.rows);
  }
  /**
   * @param {QueryState} query
   * @returns {Promise<PageResult>}
   */
  async load(query) {
    let rows = applyFilters(this.rows, query.filters);
    rows = applySort(rows, query.sort);
    const total = rows.length;
    return {
      rows: paginate(rows, query.page || 1, query.pageSize || 10),
      total,
      meta: { total: this.rows.length }
    };
  }
  /**
   * @param {Record<string, any>} row
   */
  add(row) {
    this.rows.push(row);
  }
  /**
   * @param {any} value
   * @param {String} [key] Field to match. Defaults to the first field.
   */
  remove(value, key = null) {
    const k = key ?? (this.rows[0] && Object.keys(this.rows[0])[0]);
    if (k === void 0) {
      return;
    }
    const idx = this.rows.findIndex((row) => row[k] === value);
    if (idx !== -1) {
      this.rows.splice(idx, 1);
    }
  }
};

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

// src/utils/interpolate.js
function interpolate(str, data) {
  return str.replace(/\{([^}]+)?\}/g, ($1, $2) => data[$2]);
}

// src/utils/randstr.js
function randstr(prefix) {
  return Math.random().toString(36).replace("0.", prefix || "");
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
function normalizeQuery(query) {
  const q = (
    /** @type {QueryState} */
    query || {}
  );
  const page = Math.floor(Number(q.page)) || 1;
  const pageSize = Math.floor(Number(q.pageSize)) || 10;
  const sort = Array.isArray(q.sort) ? q.sort.filter((s) => s?.field).map((s) => ({
    field: String(s.field),
    direction: (
      /** @type {"asc"|"desc"} */
      s.direction === "desc" ? "desc" : "asc"
    )
  })) : [];
  const filters = {};
  if (q.filters && typeof q.filters === "object") {
    for (const [key, filter] of Object.entries(q.filters)) {
      if (filter && typeof filter === "object" && "value" in filter) {
        filters[key] = { operator: filter.operator ?? "contains", value: filter.value };
      }
    }
  }
  return { page: Math.max(1, page), pageSize: Math.max(1, pageSize), sort, filters };
}
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
  if (column.noSort && el.tagName === "TH") {
    addClass(el, "dg-not-sortable");
  }
}
var DataGrid = class extends base_element_default {
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
    this.options = this.options || this.defaultOptions;
    if (this.options.singleSelect) this.options.selectable = true;
    this.fireEvents = false;
    this.plugins = {};
    for (const [pluginName, pluginClass] of Object.entries(plugins)) {
      this.plugins[pluginName] = new pluginClass(this);
    }
    this._initialQuery = normalizeQuery(this.options.initialQuery);
    this._query = normalizeQuery(this._initialQuery);
    this._requestSeq = 0;
    this._controller = null;
    this.initialResult = null;
    this._initialResult = this.options.initialResult || this.initialResult || null;
    this.rows = [];
    this.total = 0;
    this.meta = {};
    this.pages = 0;
    this.loading = false;
    this.error = null;
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
      src: "",
      params: {},
      debug: false,
      sortable: false,
      filterable: false,
      menu: false,
      reorder: false,
      dir: "ltr",
      pageSizes: [10, 25, 50, 100, 250],
      showPageSize: true,
      columns: [],
      actions: [],
      collapseActions: false,
      selectable: false,
      selectVisibleOnly: true,
      singleSelect: false,
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
      noData: "",
      initialQuery: null,
      initialResult: null,
      dataSource: null
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
    return Boolean(this.error);
  }
  /**
   * Snapshot of the current query state.
   * @returns {QueryState}
   */
  get query() {
    return normalizeQuery(this._query);
  }
  /**
   * Convenience read-only accessor for the current page.
   * @returns {Number}
   */
  get page() {
    return this._query.page;
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
      "src",
      "sortable",
      "filterable",
      "responsive",
      "selectable",
      "single-select",
      "reorder",
      "menu",
      "expand",
      "autosize",
      "resizable",
      "autoheight",
      "autohide-pager",
      "show-page-size",
      "debug",
      "dir"
    ];
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
  /**
   * Pick the data source based on configuration.
   */
  setupDataSource() {
    if (this.options.dataSource) {
      this.dataSource = this.options.dataSource;
    } else if (this.options.src) {
      this.dataSource = new FetchDataSource(this.options.src, { params: this.options.params });
    } else {
      this.dataSource = new ArrayDataSource([]);
    }
  }
  /**
   * Seed the initial query from optional page / page-size attributes.
   */
  setupInitialState() {
    if (!this._initialResult) {
      this._initialResult = this.options.initialResult || this.initialResult || null;
    }
    if (this.options.initialQuery) {
      return;
    }
    if (this.hasAttribute("page-size")) {
      const pageSize = Number.parseInt(this.getAttribute("page-size"));
      if (pageSize) {
        this._query.pageSize = pageSize;
        this._initialQuery.pageSize = pageSize;
      }
    }
    if (this.hasAttribute("page")) {
      const page = Number.parseInt(this.getAttribute("page"));
      if (page) {
        this._query.page = page;
        this._initialQuery.page = page;
      }
    }
  }
  /**
   * Merge a patch into the query state and reload.
   * Changing filters, sort or pageSize resets the page to 1 unless an explicit
   * page is provided in the patch.
   * @param {Object} patch
   * @returns {Promise}
   */
  setQuery(patch) {
    const next = normalizeQuery(this._query);
    const touchesPopulation = patch.filters !== void 0 || patch.sort !== void 0 || patch.pageSize !== void 0;
    if (patch.pageSize !== void 0) next.pageSize = patch.pageSize;
    if (patch.sort !== void 0) next.sort = patch.sort;
    if (patch.filters !== void 0) next.filters = patch.filters;
    if (touchesPopulation && patch.page === void 0) next.page = 1;
    if (patch.page !== void 0) next.page = patch.page;
    this._query = normalizeQuery(next);
    return this.refresh();
  }
  /**
   * Reset the query to its initial state and reload.
   * @returns {Promise}
   */
  resetQuery() {
    this._query = normalizeQuery(this._initialQuery);
    return this.refresh();
  }
  /**
   * Reload the result matching the current query.
   * @returns {Promise}
   */
  refresh() {
    return this.load();
  }
  /**
   * Single load path: abort previous request, load the current query,
   * protect against stale responses, then render.
   * @returns {Promise}
   */
  async load() {
    const requestId = ++this._requestSeq;
    this._controller?.abort();
    const controller = new AbortController();
    this._controller = controller;
    this.loading = true;
    this.error = null;
    this.classList.add("dg-loading");
    this.classList.remove("dg-empty", "dg-network-error");
    try {
      let result;
      if (this._initialResult) {
        result = this._initialResult;
        this._initialResult = null;
      } else {
        result = await this.dataSource.load(this.query, { signal: controller.signal });
      }
      if (requestId !== this._requestSeq) return;
      this.applyResult(result);
    } catch (err) {
      if (requestId !== this._requestSeq) return;
      if (err?.name === "AbortError" || controller.signal.aborted) return;
      this.error = err;
      this.classList.add("dg-empty", "dg-network-error");
      this.tbody?.setAttribute(
        "data-empty",
        this.options.errorMessage || err.message?.replace(/^\s+|\r\n|\n|\r$/g, "") || labels.networkError
      );
      dispatch(this, "loadError", err);
    } finally {
      if (requestId === this._requestSeq) {
        this.loading = false;
        this.classList.remove("dg-loading");
      }
    }
  }
  /**
   * Apply a PageResult and render.
   * @param {PageResult|Array} result
   */
  applyResult(result) {
    const page = Array.isArray(result) ? { rows: result, total: result.length, meta: {} } : result;
    this.rows = page.rows || [];
    this.total = page.total ?? this.rows.length;
    this.meta = page.meta || {};
    if (this.options.columns.length === 0 && this.rows.length) {
      this.options.columns = this.convertColumns(Object.keys(this.rows[0]));
    } else {
      this.options.columns = this.convertColumns(this.options.columns);
    }
    this.fixPage();
    this.renderBody();
  }
  /**
   * Pick the data source based on configuration.
   */
  srcChanged() {
    this.setupDataSource();
    return this.refresh();
  }
  dirChanged() {
    setAttribute(this, "dir", this.options.dir);
  }
  showPageSizeChanged() {
    this.selectPerPage?.toggleAttribute("hidden", !this.options.showPageSize);
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
  selectableChanged() {
    this.renderTable();
  }
  reorderChanged() {
    this.renderTable();
  }
  sortableChanged() {
    this.renderTable();
  }
  filterableChanged() {
    this.renderTable();
  }
  /**
   * Populate the page size select according to options
   */
  populatePageSizes() {
    if (!this.selectPerPage) {
      return;
    }
    while (this.selectPerPage.lastChild) {
      this.selectPerPage.removeChild(this.selectPerPage.lastChild);
    }
    for (const v of this.options.pageSizes) {
      addSelectOption(this.selectPerPage, v, v, v === this._query.pageSize);
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
    this.selectPerPage.toggleAttribute("hidden", !this.options.showPageSize);
    this.inputPage.addEventListener("input", this.gotoPage);
    this.setupDataSource();
    this.setupInitialState();
    for (const plugin of Object.values(this.plugins)) {
      await plugin.connected();
    }
    this.dirChanged();
    this.populatePageSizes();
    await this.init();
  }
  _disconnected() {
    this._controller?.abort();
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
    return this.load().finally(() => {
      this.configureUi();
      this.classList.add("dg-initialized");
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
    if (this.options.responsive && this.plugins.ResponsiveGrid?.hasHiddenColumns()) {
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
    if (this.options.responsive && this.plugins.ResponsiveGrid?.hasHiddenColumns()) {
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
  getFirst() {
    if (this.loading) {
      return;
    }
    return this.setQuery({ page: 1 });
  }
  getLast() {
    if (this.loading) {
      return;
    }
    return this.setQuery({ page: this.pages });
  }
  getPrev() {
    if (this.loading) {
      return;
    }
    return this.setQuery({ page: Math.max(1, this._query.page - 1) });
  }
  getNext() {
    if (this.loading) {
      return;
    }
    return this.setQuery({ page: this._query.page + 1 });
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
    const page = Number.parseInt(this.inputPage.value);
    if (page) {
      return this.setQuery({ page });
    }
  }
  /**
   * This is the callback for the select control
   */
  changePerPage() {
    const pageSize = Number.parseInt(this.selectPerPage.options[this.selectPerPage.selectedIndex].value);
    return this.setQuery({ pageSize });
  }
  /**
   * Compute the aria-sort value for a column based on the current query.
   * @param {String} field
   * @returns {"ascending"|"descending"|"none"}
   */
  getColumnSort(field) {
    const s = (this._query.sort || []).find((x) => x.field === field);
    if (!s) {
      return "none";
    }
    return s.direction === "asc" ? "ascending" : "descending";
  }
  /**
   * Trigger sort based on the current header state.
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
    if (col === null) {
      col = this.querySelector("thead tr.dg-head-columns th[aria-sort$='scending']");
    }
    if (!col) {
      return;
    }
    const current = col.getAttribute("aria-sort");
    let next;
    if (!current || current === "none") {
      next = "ascending";
    } else if (current === "ascending") {
      next = "descending";
    } else {
      next = "none";
    }
    const sort = next === "none" ? [] : [{ field: col.getAttribute("field"), direction: next === "ascending" ? "asc" : "desc" }];
    const headers = findAll(this, "thead tr.dg-head-columns th");
    for (const th of headers) {
      if (!th.hasAttribute("aria-sort")) {
        continue;
      }
      const match = sort.find((s) => s.field === th.getAttribute("field"));
      th.setAttribute("aria-sort", match ? match.direction === "asc" ? "ascending" : "descending" : "none");
    }
    return this.setQuery({ sort });
  }
  _sort(columnName, direction) {
    return this.setQuery({ sort: direction === "none" ? [] : [{ field: columnName, direction }] });
  }
  sortAsc = (columnName) => this._sort(columnName, "asc");
  sortDesc = (columnName) => this._sort(columnName, "desc");
  sortNone = (columnName) => this._sort(columnName, "none");
  clearFilters() {
    const inputs = findAll(this, this._filterSelector);
    for (const input of inputs) {
      input.value = "";
    }
    return this.filterData();
  }
  /**
   * Collect current filter inputs into the query and reload.
   */
  filterData() {
    this.log("filter data");
    const filters = {};
    const inputs = findAll(this, this._filterSelector);
    for (const input of inputs) {
      const value = input.value;
      if (value) {
        const isSelect = /select/i.test(input.tagName);
        filters[input.dataset.name] = {
          operator: isSelect ? "eq" : "contains",
          value
        };
      }
    }
    return this.setQuery({ filters });
  }
  renderTable() {
    this.log("render table");
    if (this.options.menu && this.plugins.ContextMenu) {
      this.plugins.ContextMenu.createMenu();
    }
    this.renderHeader();
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
    if (this.options.responsive && this.plugins.ResponsiveGrid?.hasHiddenColumns()) {
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
      th.setAttribute("role", "columnheader");
      th.setAttribute("aria-colindex", `${colIdx}`);
      th.setAttribute("id", randstr("dg-col-"));
      if (this.options.sortable && !column.noSort) {
        th.setAttribute("aria-sort", this.getColumnSort(column.field));
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
      sortableRow.addEventListener("keydown", (event) => {
        if (event.key === "Enter" || event.key === " ") {
          event.preventDefault();
          this.sortData(sortableRow);
        }
      });
    }
    this.table && setAttribute(this.table, "aria-colcount", this.columnsLength(true));
  }
  createColumnFilters(thead) {
    let idx = 0;
    let tr;
    tr = ce("tr");
    tr.setAttribute("role", "row");
    tr.setAttribute("aria-rowindex", "2");
    tr.setAttribute("class", "dg-head-filters");
    if (!this.options.filterable) {
      tr.setAttribute("hidden", "");
    }
    if (this.options.selectable && this.plugins.SelectableRows) {
      this.plugins.SelectableRows.createFilterCol(tr);
    }
    if (this.options.responsive && this.plugins.ResponsiveGrid?.hasHiddenColumns()) {
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
      if (!this.options.filterable) {
        th.tabIndex = 0;
      } else {
        filter.tabIndex = 0;
      }
      if (column.hidden) {
        th.setAttribute("hidden", "");
      }
      const filterState = this._query.filters?.[column.field];
      if (filterState) {
        filter.value = filterState.value ?? "";
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
      const isSelect = /select/i.test(el.tagName);
      const eventName = isSelect ? "change" : "keyup";
      const eventHandler = debounce((e) => {
        const key = e.keyCode || e.key;
        const isKeyPressFilter = !this.options.filterOnEnter && !this._excludedKeys.some((k) => k === key);
        if (key === 13 || key === "Enter" || isKeyPressFilter || e.type === "change" || e.type === "paste") {
          this.filterData.call(this);
        }
      }, this.options.filterKeypressDelay);
      el.addEventListener(eventName, eventHandler);
      if (!isSelect) {
        el.addEventListener("paste", eventHandler);
      }
    }
  }
  createFilterElement(column, relatedTh) {
    const isSelect = column.filterType === "select";
    const filter = isSelect ? ce("select") : ce("input");
    if (isSelect) {
      if (!Array.isArray(column.filterList)) {
        const sourceRows = this.dataSource instanceof ArrayDataSource ? this.dataSource.rows : this.rows;
        const uniqueValues = [...new Set((sourceRows ?? []).map((e) => e[column.field]))].filter((v) => v).sort();
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
   * Render the rows of the current page into tbody
   * It will call paginate() at the end
   */
  renderBody() {
    this.log("render body");
    let tr;
    let td;
    let idx;
    const tbody = ce("tbody");
    let i = 0;
    for (const item of this.rows) {
      tr = ce("tr");
      setAttribute(tr, "role", "row");
      setAttribute(tr, "aria-rowindex", i + 1);
      tr.tabIndex = 0;
      if (this.options.selectable && this.plugins.SelectableRows) {
        this.plugins.SelectableRows.createDataCol(tr);
      }
      if (this.options.responsive && this.plugins.ResponsiveGrid?.hasHiddenColumns()) {
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
        td.setAttribute("aria-colindex", `${idx + this.startColIndex()}`);
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
      i++;
    }
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
    this.classList.toggle("dg-empty", !this.rows.length);
    setAttribute(this.table, "aria-rowcount", this.rows.length);
    dispatch(this, "bodyRendered");
  }
  paginate() {
    this.log("paginate");
    const total = this.total;
    const p = this._query.page || 1;
    const tfoot = this.tfoot;
    if (!tfoot) return;
    this.pages = this.totalPages();
    let high = p * this._query.pageSize;
    let low = high - this._query.pageSize + 1;
    if (high > total) {
      high = total;
    }
    if (!total) {
      low = 0;
    }
    if (this.options.selectable && this.plugins.SelectableRows) {
      this.plugins.SelectableRows.clearCheckboxes(this.tbody);
    }
    if (this.plugins.FixedHeight) {
      this.plugins.FixedHeight.updateFakeRow();
    }
    if (this.btnFirst) {
      this.btnFirst.disabled = this._query.page <= 1;
      this.btnPrev.disabled = this._query.page <= 1;
      this.btnNext.disabled = this._query.page >= this.pages;
      this.btnLast.disabled = this._query.page >= this.pages;
    }
    tfoot.querySelector(".dg-low").textContent = low.toString();
    tfoot.querySelector(".dg-high").textContent = high.toString();
    tfoot.querySelector(".dg-total").textContent = `${this.total}`;
    tfoot.toggleAttribute("hidden", this.options.autohidePager && this._query.pageSize > this.total);
  }
  /**
   * @returns {number}
   */
  totalPages() {
    return Math.ceil(this.total / (this._query.pageSize || 1));
  }
  /**
   * Make sure the current page is still valid
   */
  fixPage() {
    if (!this.inputPage) return this;
    this.pages = this.totalPages();
    if (this._query.page > this.pages) {
      this._query.page = Math.max(1, this.pages);
    }
    if (this._query.page < 1) {
      this._query.page = 1;
    }
    this.inputPage.max = `${this.pages}`;
    this.inputPage.value = `${this._query.page}`;
    this.inputPage.disabled = this.pages < 2;
    return this;
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

// src/utils/elementOffset.js
function elementOffset(el) {
  const rect = el.getBoundingClientRect();
  const scrollLeft = window.pageXOffset || document.documentElement.scrollLeft;
  const scrollTop = window.pageYOffset || document.documentElement.scrollTop;
  return { top: rect.top + scrollTop, left: rect.left + scrollLeft };
}

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
        const columnIndex = visibleCols.findIndex((col2) => col2 === target.parentNode);
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
      const item = grid.rows[idx - 1];
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
    setAttribute(th, "role", "columnheader");
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
    setAttribute(th, "role", "columnheader");
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
    setAttribute(td, "role", "gridcell");
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
      dispatch(
        el,
        "rowsSelected",
        {
          selection: grid.getSelection()
        },
        true
      );
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
    if (grid.query.pageSize > grid.total) {
      return;
    }
    if (grid.query.page !== grid.totalPages()) {
      return;
    }
    if (!grid.options.autoheight) {
      return;
    }
    const max = grid.query.pageSize * grid.rowHeight;
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
    if (!grid.rows.length) {
      return;
    }
    const firstVal = grid.rows[0];
    const lastVal = grid.rows[grid.rows.length - 1];
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
    setAttribute(th, "role", "columnheader");
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
    setAttribute(th, "role", "columnheader");
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
    setAttribute(td, "role", "gridcell");
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
    setAttribute(actionsTh, "role", "columnheader");
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
    actionsTh.setAttribute("role", "columnheader");
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
    this.log("Init");
  }
  async connected() {
    this.log("connected");
    const grid = this.grid;
    if (!grid.options.saveState) {
      this.log("disabled");
      return;
    }
    this.log("enabled");
    const cachedState = this._getState();
    if (cachedState) {
      this.cachedState = cachedState;
      this.log("restore state");
      if (Array.isArray(cachedState.columns)) {
        for (const col of cachedState.columns) {
          const target = grid.options.columns.find((c) => c.field === col.field);
          if (target && col.hidden) {
            target.hidden = true;
          }
        }
      }
      if (cachedState.query) {
        grid._query = cachedState.query;
      }
    }
    grid.addEventListener("bodyRendered", () => this._update());
    document.addEventListener("scrollend", () => this._update());
  }
  /**
   * Persist the current query, columns and scroll position.
   */
  _update() {
    const grid = this.grid;
    if (!grid.options.saveState || !grid.classList.contains("dg-initialized")) {
      return;
    }
    this._setState({
      query: grid.query,
      columns: grid.options.columns.map((col) => ({ field: col.field, hidden: col.hidden })),
      scrollTo: window.scrollY
    });
  }
  log(...data) {
    this.grid.log("[Save-State] ", ...data);
  }
  /**
   * @returns {CachedGridState}
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
   * @param {CachedGridState} state
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
global.ArrayDataSource = ArrayDataSource;
global.FetchDataSource = FetchDataSource;
export {
  ArrayDataSource,
  data_grid_default as DataGrid,
  FetchDataSource,
  data_grid_default2 as default
};
/**
 * Data Grid custom element
 * https://github.com/lekoala/data-grid/
 * @license MIT
 */
//# sourceMappingURL=data-grid.js.map
