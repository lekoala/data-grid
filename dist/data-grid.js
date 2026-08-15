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
  if (check && hasAttribute(el, name))
    return;
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
  existingNode.parentNode?.insertBefore(newNode, existingNode.nextSibling);
}

// src/core/base-element.js
class BaseElement extends HTMLElement {
  constructor(options = {}) {
    super();
    this.options = Object.assign({}, this.defaultOptions, options);
    this.log("constructor");
    this.setup = false;
    this.rendered = false;
    this.fireEvents = true;
    this._ready();
    this.log("ready");
  }
  get defaultOptions() {
    return {};
  }
  static get observedAttributes() {
    return [];
  }
  static template() {
    return "";
  }
  _ready() {}
  _connected() {}
  _disconnected() {}
  log(...data) {
    if (this.options.debug) {
      console.log(`[${getAttribute(this, "id")}] `, ...data);
    }
  }
  handleEvent(event) {
    const handler = Reflect.get(this, `on${event.type}`);
    if (typeof handler === "function") {
      handler.call(this, event);
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
        const ctor = this.constructor;
        template.innerHTML = ctor.template();
        this.appendChild(template.content.cloneNode(true));
        this.rendered = true;
      }
      await this._connected();
      dispatch(this, "connected");
    }, 0);
  }
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
  get transformAttributes() {
    return {};
  }
  attributeChangedCallback(attributeName, oldValue, newValue) {
    if (oldValue === newValue) {
      return;
    }
    this.log(`attributeChangedCallback: ${attributeName}`);
    const transformer = Reflect.get(this.transformAttributes, attributeName) ?? normalizeData;
    const attr = camelize(attributeName);
    const raw = newValue === "" ? "true" : newValue;
    Reflect.set(this.options, attr, transformer(raw));
    if (this.fireEvents) {
      const handler = Reflect.get(this, `${attr}Changed`);
      if (typeof handler === "function") {
        handler.call(this);
      }
    }
  }
}
var base_element_default = BaseElement;

// src/data-source.js
function encodeSearchParams(value, prefix = "", out = new URLSearchParams) {
  if (value === null || value === undefined) {
    return out;
  }
  if (Array.isArray(value)) {
    for (let i = 0;i < value.length; i++) {
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
function isNumericValue(value) {
  if (value === "" || value === null || value === undefined || typeof value === "boolean") {
    return false;
  }
  return Number.isFinite(Number(value));
}
function applyFilters(rows, filters) {
  if (!filters) {
    return rows.slice();
  }
  return rows.filter((item) => {
    for (const [field, filter] of Object.entries(filters)) {
      const state = typeof filter === "object" ? filter : { operator: "contains", value: filter };
      const operator = state.operator ?? "contains";
      const value = state.value;
      const cell = item[field];
      if (operator === "empty") {
        if (cell !== "" && cell !== null && cell !== undefined) {
          return false;
        }
        continue;
      }
      if (operator === "notEmpty") {
        if (cell === "" || cell === null || cell === undefined) {
          return false;
        }
        continue;
      }
      if (value === null || value === undefined || value === "") {
        continue;
      }
      const cellLower = `${cell ?? ""}`.toLowerCase();
      const valueLower = String(value).toLowerCase();
      switch (operator) {
        case "eq":
          if (`${cell}` !== String(value))
            return false;
          break;
        case "neq":
          if (`${cell}` === String(value))
            return false;
          break;
        case "startsWith":
          if (!cellLower.startsWith(valueLower))
            return false;
          break;
        case "endsWith":
          if (!cellLower.endsWith(valueLower))
            return false;
          break;
        case "lt":
        case "lte":
        case "gt":
        case "gte":
          if (isNumericValue(cell) && isNumericValue(value)) {
            const a = Number(cell);
            const b = Number(value);
            if (operator === "lt" && a >= b)
              return false;
            if (operator === "lte" && a > b)
              return false;
            if (operator === "gt" && a <= b)
              return false;
            if (operator === "gte" && a < b)
              return false;
          } else {
            const cmp = `${cell ?? ""}`.localeCompare(String(value), undefined, { sensitivity: "base" });
            if (operator === "lt" && cmp >= 0)
              return false;
            if (operator === "lte" && cmp > 0)
              return false;
            if (operator === "gt" && cmp <= 0)
              return false;
            if (operator === "gte" && cmp < 0)
              return false;
          }
          break;
        case "between": {
          if (!Array.isArray(value) || value.length !== 2) {
            continue;
          }
          const [min, max] = value;
          if (isNumericValue(cell) && isNumericValue(min) && isNumericValue(max)) {
            const v = Number(cell);
            if (v < Number(min) || v > Number(max))
              return false;
          } else {
            const cmpMin = `${cell ?? ""}`.localeCompare(String(min), undefined, { sensitivity: "base" });
            const cmpMax = `${cell ?? ""}`.localeCompare(String(max), undefined, { sensitivity: "base" });
            if (cmpMin < 0 || cmpMax > 0)
              return false;
          }
          break;
        }
        case "in":
          if (!Array.isArray(value)) {
            continue;
          }
          if (!value.some((v) => `${v}` === `${cell}`))
            return false;
          break;
        default:
          if (!cellLower.includes(valueLower))
            return false;
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
    if (valA > valB)
      return dir;
    if (valA < valB)
      return -dir;
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

class FetchDataSource {
  constructor(url, { params = {}, serializeQuery, parseResponse } = {}) {
    this.url = url;
    this.params = params;
    this.serializeQuery = serializeQuery;
    this.parseResponse = parseResponse;
  }
  buildUrl(query) {
    let base = window.location.href;
    if (!base || base === "about:blank") {
      base = "http://localhost/";
    }
    const last = base.split("/").pop();
    if (!last?.includes(".")) {
      base += base.endsWith("/") ? "" : "/";
    }
    const url = new URL(this.url, base);
    const serialized = this.serializeQuery ? this.serializeQuery(query) : query;
    const merged = { ...serialized, ...this.params, r: Date.now() };
    encodeSearchParams(merged, "", url.searchParams);
    return url;
  }
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
      const error = new Error(response.statusText || "Network response error");
      error.response = response;
      throw error;
    }
    const json = await response.json();
    return this.parseResponse ? this.parseResponse(json) : parseResult(json);
  }
}

class ArrayDataSource {
  constructor(rows = []) {
    this.rows = Array.isArray(rows) ? rows : [];
  }
  static async fromUrl(url, parseResponse) {
    const response = await fetch(url);
    if (!response.ok) {
      throw new Error(response.statusText || "Network response error");
    }
    const json = await response.json();
    const result = parseResponse ? parseResponse(json) : parseResult(json);
    return new ArrayDataSource(result.rows);
  }
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
  add(row) {
    this.rows.push(row);
  }
  remove(value, key) {
    const k = key ?? (this.rows[0] && Object.keys(this.rows[0])[0]);
    if (k === undefined) {
      return;
    }
    const idx = this.rows.findIndex((row) => row[k] === value);
    if (idx !== -1) {
      this.rows.splice(idx, 1);
    }
  }
}

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
    if (timer !== null) {
      clearTimeout(timer);
    }
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
  return Math.floor(metrics.width) + padding;
}

// src/utils/randstr.js
function randstr(prefix) {
  return Math.random().toString(36).replace("0.", prefix || "");
}

// src/data-grid.js
var plugins = {};
var connectedInstances = new Set;
var labels = {
  itemsPerPage: "Items per page",
  gotoPage: "Go to page",
  gotoFirstPage: "Go to first page",
  gotoPrevPage: "Go to previous page",
  gotoNextPage: "Go to next page",
  gotoLastPage: "Go to last page",
  pageRange: "{from} - {to} of {total} items",
  resultCount: "{count} items",
  selectedCount: "{count} selected",
  selectAll: "Select all rows",
  toggleActions: "Toggle row actions",
  resizeColumn: "Resize column",
  noData: "No data",
  loading: "Loading…",
  areYouSure: "Are you sure?",
  networkError: "Network response error"
};
var LABEL_PLACEHOLDER_PATTERN = /\{(\w+)\}/g;
function formatLabel(template, values) {
  return template.replace(LABEL_PLACEHOLDER_PATTERN, (_, key) => String(values[key] ?? ""));
}
function normalizeQuery(query) {
  const q = query || {};
  const page = Math.floor(Number(q.page)) || 1;
  const pageSize = Math.floor(Number(q.pageSize)) || 10;
  const sort = Array.isArray(q.sort) ? q.sort.filter((s) => s?.field).map((s) => ({
    field: String(s.field),
    direction: s.direction === "desc" ? "desc" : "asc"
  })) : [];
  const filters = {};
  if (q.filters && typeof q.filters === "object") {
    for (const [key, filter] of Object.entries(q.filters)) {
      if (filter === null || filter === undefined) {
        continue;
      }
      let operator;
      let value;
      if (typeof filter === "object") {
        operator = filter.operator;
        if (!operator) {
          continue;
        }
        value = filter.value;
      } else {
        operator = "contains";
        value = filter;
      }
      const hasValue = value !== undefined && value !== null && value !== "";
      if (hasValue || operator === "empty" || operator === "notEmpty") {
        filters[key] = hasValue ? { operator, value } : { operator };
      }
    }
  }
  return { page: Math.max(1, page), pageSize: Math.max(1, pageSize), sort, filters };
}
function orderColumns(columns) {
  const start = [];
  const middle = [];
  const end = [];
  for (const col of columns) {
    if (col.position === "start") {
      start.push(col);
    } else if (col.position === "end") {
      end.push(col);
    } else {
      middle.push(col);
    }
  }
  return [...start.reverse(), ...middle, ...end];
}
function applyCellContent(el, content) {
  if (content === undefined || content === null) {
    return;
  }
  if (content instanceof Node) {
    el.appendChild(content);
    return;
  }
  if (typeof content === "object" && content.html !== undefined) {
    el.innerHTML = content.html;
    return;
  }
  el.textContent = content;
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

class DataGrid extends base_element_default {
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
  plugins = this._initPlugins();
  _initialQuery = normalizeQuery(this.options.initialQuery);
  _query = normalizeQuery(this._initialQuery);
  _selection = { mode: "explicit", ids: new Set, except: new Set };
  _requestSeq = 0;
  _controller = null;
  initialResult = null;
  _initialResult = this.options.initialResult || this.initialResult || null;
  rows = [];
  total = 0;
  meta = {};
  pages = 0;
  loading = false;
  error = null;
  _columns = [];
  dataSource = null;
  table = null;
  btnFirst = null;
  btnPrev = null;
  btnNext = null;
  btnLast = null;
  selectPerPage = null;
  inputPage = null;
  headerRow = null;
  rowHeight = null;
  _renderContext = null;
  _ready() {
    this.fireEvents = false;
    setAttribute(this, "id", this.options.id ?? randstr("el-"), true);
    if (this.options.singleSelect)
      this.options.selectable = true;
  }
  _initPlugins() {
    const instances = {};
    for (const [pluginName, pluginClass] of Object.entries(plugins)) {
      instances[pluginName] = new pluginClass(this);
    }
    return instances;
  }
  static template() {
    return `
<table>
    <thead>
        <tr class="dg-head-columns"><th><!-- keep for getTextWidth --></th></tr>
        <tr class="dg-head-filters"></tr>
    </thead>
    <tbody data-empty-message="${labels.noData}"></tbody>
    <tfoot hidden>
        <tr>
            <td>
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
                <div class="dg-meta">${formatLabel(labels.pageRange, { from: 0, to: 0, total: 0 })}</div>
            </div>
            </td>
        </tr>
    </tfoot>
</table>
<div class="dg-status" role="status" aria-atomic="true"></div>
<ul class="dg-menu" hidden></ul>
`;
  }
  get labels() {
    return labels;
  }
  static getLabels() {
    return labels;
  }
  static setLabels(v) {
    labels = { ...labels, ...v };
    for (const instance of connectedInstances) {
      instance.updateLabels();
    }
  }
  static async loadLabels(url) {
    const response = await fetch(url);
    if (!response.ok) {
      throw new Error(`Unable to load labels: ${response.status}`);
    }
    const nextLabels = await response.json();
    DataGrid.setLabels(nextLabels);
    return nextLabels;
  }
  formatLabel(template, values) {
    return formatLabel(template, values);
  }
  get noData() {
    return this.options.noData || this.labels.noData;
  }
  #setNoData(tbody) {
    if (!this.hasDataError && tbody.getAttribute("data-empty-message") !== this.noData) {
      tbody.setAttribute("data-empty-message", this.noData);
    }
  }
  #updateStatus(text) {
    const status = this.querySelector(".dg-status");
    if (status) {
      status.textContent = text;
    }
  }
  updateLabels() {
    if (this.selectPerPage) {
      this.selectPerPage.setAttribute("aria-label", this.labels.itemsPerPage);
    }
    if (this.inputPage) {
      this.inputPage.setAttribute("aria-label", this.labels.gotoPage);
    }
    const buttonLabels = [
      [this.btnFirst, this.labels.gotoFirstPage],
      [this.btnPrev, this.labels.gotoPrevPage],
      [this.btnNext, this.labels.gotoNextPage],
      [this.btnLast, this.labels.gotoLastPage]
    ];
    for (const [button, label] of buttonLabels) {
      if (!button) {
        continue;
      }
      button.setAttribute("aria-label", label);
      button.setAttribute("title", label);
    }
    this.#setNoData(this.tbody);
    this.updateMetaLabel();
    if (this.loading) {
      this.#updateStatus(this.labels.loading);
    } else if (this.hasDataError) {
      this.#updateStatus(this.tbody?.getAttribute("data-empty-message") || this.labels.networkError);
    } else {
      this.#updateStatus(this.rows.length ? this.formatLabel(this.labels.resultCount, { count: this.total }) : this.noData);
    }
    this.runPlugins("updateLabels");
  }
  updateMetaLabel() {
    const meta = this.querySelector(".dg-meta");
    if (!meta) {
      return;
    }
    const total = this.total;
    const page = this._query.page || 1;
    let high = page * this._query.pageSize;
    let low = high - this._query.pageSize + 1;
    if (high > total) {
      high = total;
    }
    if (!total) {
      low = 0;
    }
    meta.textContent = this.formatLabel(this.labels.pageRange, { from: low, to: high, total });
  }
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
      transform: "",
      filterType: "text",
      firstFilterOption: { value: "", text: "" }
    };
  }
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
      density: "default",
      pageSizes: [10, 25, 50, 100, 250],
      showPageSize: true,
      columns: [],
      actions: [],
      collapseActions: false,
      selectable: false,
      selectVisibleOnly: true,
      singleSelect: false,
      rowKey: "id",
      rowLabel: null,
      bulkActions: [],
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
      caption: "",
      initialQuery: null,
      initialResult: null,
      dataSource: null
    };
  }
  get isInit() {
    return this.classList.contains("dg-initialized");
  }
  get hasDataError() {
    return Boolean(this.error);
  }
  get query() {
    return normalizeQuery(this._query);
  }
  get page() {
    return this._query.page;
  }
  static registerPlugins(list) {
    plugins = list;
  }
  static unregisterPlugins(plugin = null) {
    if (plugin === null) {
      plugins = {};
    } else {
      delete plugins[plugin];
    }
  }
  static registeredPlugins() {
    return plugins;
  }
  runPlugins(hook, ...args) {
    for (const plugin of Object.values(this.plugins)) {
      const fn = Reflect.get(plugin, hook);
      if (typeof fn === "function") {
        fn.call(plugin, ...args);
      }
    }
  }
  buildColumns() {
    const columns = this.convertColumns(this.options.columns);
    this.runPlugins("extendColumns", columns);
    return orderColumns(columns);
  }
  getColumns() {
    return this._columns;
  }
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
      "dir",
      "density"
    ];
  }
  get thead() {
    return $("thead", this);
  }
  get tbody() {
    return $("tbody", this);
  }
  get tfoot() {
    return $("tfoot", this);
  }
  setupDataSource() {
    if (this.options.dataSource) {
      this.dataSource = this.options.dataSource;
    } else if (this.options.src) {
      this.dataSource = new FetchDataSource(this.options.src, { params: this.options.params });
    } else {
      this.dataSource = new ArrayDataSource([]);
    }
  }
  setupInitialState() {
    if (!this._initialResult) {
      this._initialResult = this.options.initialResult || this.initialResult || null;
    }
    if (this.options.initialQuery) {
      return;
    }
    if (this.hasAttribute("page-size")) {
      const pageSize = Number.parseInt(this.getAttribute("page-size") ?? "");
      if (pageSize) {
        this._query.pageSize = pageSize;
        this._initialQuery.pageSize = pageSize;
      }
    }
    if (this.hasAttribute("page")) {
      const page = Number.parseInt(this.getAttribute("page") ?? "");
      if (page) {
        this._query.page = page;
        this._initialQuery.page = page;
      }
    }
  }
  setQuery(patch) {
    const next = normalizeQuery(this._query);
    const touchesPopulation = patch.filters !== undefined || patch.sort !== undefined || patch.pageSize !== undefined;
    if (patch.pageSize !== undefined)
      next.pageSize = patch.pageSize;
    if (patch.sort !== undefined)
      next.sort = patch.sort;
    if (patch.filters !== undefined)
      next.filters = patch.filters;
    if (touchesPopulation && patch.page === undefined)
      next.page = 1;
    if (patch.page !== undefined)
      next.page = patch.page;
    this._query = normalizeQuery(next);
    return this.refresh();
  }
  resetQuery() {
    this._query = normalizeQuery(this._initialQuery);
    return this.refresh();
  }
  refresh() {
    return this.load();
  }
  async load() {
    const requestId = ++this._requestSeq;
    this._controller?.abort();
    const controller = new AbortController;
    this._controller = controller;
    this.loading = true;
    this.error = null;
    setAttribute(this, "data-loading", "");
    removeAttribute(this, "data-error");
    this.#updateStatus(this.labels.loading);
    try {
      let result;
      if (this._initialResult) {
        result = this._initialResult;
        this._initialResult = null;
      } else {
        const ds = this.dataSource;
        if (!ds) {
          throw new Error("No data source");
        }
        result = await ds.load(this.query, { signal: controller.signal });
      }
      if (requestId !== this._requestSeq)
        return;
      this.applyResult(result);
      this.#updateStatus(this.rows.length ? this.formatLabel(this.labels.resultCount, { count: this.total }) : this.noData);
    } catch (err) {
      if (requestId !== this._requestSeq)
        return;
      const e = err;
      if (e?.name === "AbortError" || controller.signal.aborted)
        return;
      const message = this.options.errorMessage || e?.message?.replace(/^\s+|\r\n|\n|\r$/g, "") || this.labels.networkError;
      this.error = e;
      setAttribute(this, "data-error", "");
      this.tbody?.setAttribute("data-empty-message", message);
      this.#updateStatus(message);
      this.renderBody();
      dispatch(this, "loadError", e);
    } finally {
      if (requestId === this._requestSeq) {
        this.loading = false;
        removeAttribute(this, "data-loading");
      }
    }
  }
  applyResult(result) {
    this.rows = result.rows || [];
    this.total = result.total ?? this.rows.length;
    this.meta = result.meta || {};
    if (this.options.columns.length === 0 && this.rows.length) {
      this.options.columns = this.convertColumns(Object.keys(this.rows[0]));
    } else {
      this.options.columns = this.convertColumns(this.options.columns);
    }
    this.fixPage();
    this.renderBody();
  }
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
    this.runPlugins("responsiveChanged", this.options.responsive);
    this.renderTable();
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
    connectedInstances.add(this);
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
    this.btnFirst?.addEventListener("click", this.getFirst);
    this.btnPrev?.addEventListener("click", this.getPrev);
    this.btnNext?.addEventListener("click", this.getNext);
    this.btnLast?.addEventListener("click", this.getLast);
    this.selectPerPage?.addEventListener("change", this.changePerPage);
    this.selectPerPage?.toggleAttribute("hidden", !this.options.showPageSize);
    this.inputPage?.addEventListener("input", this.gotoPage);
    this.setupDataSource();
    this.setupInitialState();
    for (const plugin of Object.values(this.plugins)) {
      await plugin.connected?.();
    }
    this.dirChanged();
    this.populatePageSizes();
    this.updateLabels();
    await this.init();
  }
  _disconnected() {
    connectedInstances.delete(this);
    this._controller?.abort();
    this.btnFirst?.removeEventListener("click", this.getFirst);
    this.btnPrev?.removeEventListener("click", this.getPrev);
    this.btnNext?.removeEventListener("click", this.getNext);
    this.btnLast?.removeEventListener("click", this.getLast);
    this.selectPerPage?.removeEventListener("change", this.changePerPage);
    this.inputPage?.removeEventListener("input", this.gotoPage);
    for (const plugin of Object.values(this.plugins)) {
      plugin.disconnected?.();
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
    return c ? Reflect.get(c, prop) : null;
  }
  setColProp(field, prop, val) {
    const c = this.getCol(field);
    if (c) {
      Reflect.set(c, prop, val);
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
    if (render)
      this.renderTable();
    dispatch(this, "columnVisibility", {
      col: field,
      visibility: "visible"
    });
  }
  hideColumn(field, render = true) {
    this.setColProp(field, "hidden", true);
    if (render)
      this.renderTable();
    dispatch(this, "columnVisibility", {
      col: field,
      visibility: "hidden"
    });
  }
  columnsLength(visibleOnly = false) {
    let len = 0;
    for (const col of this.getColumns()) {
      if (visibleOnly && col.hidden) {
        continue;
      }
      if (!col.attr) {
        len++;
      }
    }
    return len;
  }
  configureUi() {
    if (!this.table)
      return this;
    this.table.style.visibility = "hidden";
    this.renderTable();
    if (!this.options.responsive) {
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
  resolveRowKey(row, index = 0) {
    const rowKey = this.options.rowKey;
    let key;
    if (typeof rowKey === "function") {
      key = rowKey(row);
    } else if (rowKey) {
      key = row[rowKey];
    }
    return key === undefined || key === null ? String(index) : String(key);
  }
  getRowLabel(row, index = 0) {
    const resolver = this.options.rowLabel;
    if (typeof resolver === "function") {
      return String(resolver(row, index));
    }
    if (typeof resolver === "string" && resolver) {
      const v = row?.[resolver];
      if (v !== undefined && v !== null && v !== "") {
        return String(v);
      }
    }
    return this.resolveRowKey(row, index);
  }
  isRowSelected(row, index = 0) {
    const key = this.resolveRowKey(row, index);
    const sel = this._selection;
    return sel.mode === "all" ? !sel.except.has(key) : sel.ids.has(key);
  }
  getSelectionState() {
    return {
      mode: this._selection.mode,
      ids: new Set(this._selection.ids),
      except: new Set(this._selection.except)
    };
  }
  selectRow(row, index = 0) {
    const key = this.resolveRowKey(row, index);
    const sel = this._selection;
    if (this.options.singleSelect) {
      sel.mode = "explicit";
      sel.ids.clear();
      sel.except.clear();
      sel.ids.add(key);
    } else if (sel.mode === "all") {
      sel.except.delete(key);
    } else {
      sel.ids.add(key);
    }
    this._selectionChanged();
  }
  deselectRow(row, index = 0) {
    const key = this.resolveRowKey(row, index);
    const sel = this._selection;
    if (sel.mode === "all") {
      sel.except.add(key);
    } else {
      sel.ids.delete(key);
    }
    this._selectionChanged();
  }
  toggleRow(row, index = 0) {
    if (this.isRowSelected(row, index)) {
      this.deselectRow(row, index);
    } else {
      this.selectRow(row, index);
    }
  }
  selectAll() {
    if (this.options.selectVisibleOnly) {
      const ids = new Set(this.rows.map((row, i) => this.resolveRowKey(row, i)));
      this._selection = { mode: "explicit", ids, except: new Set };
    } else {
      this._selection = { mode: "all", ids: new Set, except: new Set };
    }
    this._selectionChanged();
  }
  clearSelection() {
    this._selection = { mode: "explicit", ids: new Set, except: new Set };
    this._selectionChanged();
  }
  getSelection(...keys) {
    const selected = [];
    for (let i = 0;i < this.rows.length; i++) {
      const row = this.rows[i];
      if (!this.isRowSelected(row, i)) {
        continue;
      }
      if (keys.length === 0) {
        selected.push(row);
      } else if (keys.length === 1) {
        selected.push(row[keys[0]]);
      } else {
        selected.push(Object.fromEntries(keys.map((k) => [k, row[k]])));
      }
    }
    return this.options.singleSelect ? selected[0] ?? {} : selected;
  }
  _selectionChanged() {
    const tbody = this.tbody;
    if (tbody) {
      const trs = Array.from(tbody.querySelectorAll("tr"));
      for (let i = 0;i < this.rows.length; i++) {
        const tr = trs[i];
        if (!tr || tr.classList.contains("dg-fake-row")) {
          continue;
        }
        if (this.isRowSelected(this.rows[i], i)) {
          setAttribute(tr, "data-selected", "");
        } else {
          removeAttribute(tr, "data-selected");
        }
      }
    }
    dispatch(this, "selectionChange", { selectionState: this.getSelectionState() });
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
      const keyEvent = event;
      const key = keyEvent.keyCode || keyEvent.key;
      if (key === 13 || key === "Enter") {
        event.preventDefault();
      } else {
        return;
      }
    }
    if (!this.inputPage) {
      return;
    }
    const page = Number.parseInt(this.inputPage.value);
    if (page) {
      return this.setQuery({ page });
    }
  }
  changePerPage() {
    const select = this.selectPerPage;
    if (!select) {
      return;
    }
    const pageSize = Number.parseInt(select.options[select.selectedIndex].value);
    return this.setQuery({ pageSize });
  }
  getColumnSortDirection(field) {
    const s = (this._query.sort || []).find((x) => x.field === field);
    return s?.direction ?? null;
  }
  sortData(baseCol = null) {
    this.log("sort data");
    let col = baseCol;
    if (col) {
      const field = col.getAttribute("field");
      if (field && this.getColProp(field, "noSort")) {
        this.log("sorting prevented because column is not sortable");
        return;
      }
    }
    if (col === null) {
      col = this.querySelector("thead tr.dg-head-columns th[aria-sort]");
    }
    if (!col) {
      return;
    }
    const current = col.getAttribute("aria-sort");
    let next;
    if (!current) {
      next = "ascending";
    } else if (current === "ascending") {
      next = "descending";
    } else {
      next = null;
    }
    const sort = next === null ? [] : [
      {
        field: col.getAttribute("field") ?? "",
        direction: next === "ascending" ? "asc" : "desc"
      }
    ];
    const headers = findAll(this, "thead tr.dg-head-columns th");
    for (const th of headers) {
      const match = sort.find((s) => s.field === th.getAttribute("field"));
      if (match) {
        th.setAttribute("aria-sort", match.direction === "asc" ? "ascending" : "descending");
        setAttribute(th, "data-sort", match.direction);
      } else {
        th.removeAttribute("aria-sort");
        th.removeAttribute("data-sort");
      }
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
  filterData() {
    this.log("filter data");
    const filters = {};
    const inputs = findAll(this, this._filterSelector);
    for (const input of inputs) {
      const value = input.value;
      const name = input.dataset.name;
      if (value && name) {
        const isSelect = /select/i.test(input.tagName);
        filters[name] = {
          operator: isSelect ? "eq" : "contains",
          value
        };
      }
    }
    return this.setQuery({ filters });
  }
  renderTable() {
    this.log("render table");
    this._columns = this.buildColumns();
    this.runPlugins("beforeRender");
    this._renderContext = "table";
    this.updateTableLabel();
    this.renderHeader();
    this.renderFooter();
    this.runPlugins("afterRender", this._renderContext);
  }
  updateTableLabel() {
    const table = this.table;
    if (!table) {
      return;
    }
    const caption = this.options.caption;
    let cap = table.querySelector("caption");
    if (caption) {
      if (!cap) {
        cap = ce("caption");
        table.insertBefore(cap, table.firstChild);
      }
      cap.textContent = caption;
      table.removeAttribute("aria-labelledby");
      table.removeAttribute("aria-label");
    } else {
      cap?.remove();
      const labelledby = this.getAttribute("aria-labelledby");
      const ariaLabel = this.getAttribute("aria-label");
      if (labelledby) {
        table.setAttribute("aria-labelledby", labelledby);
        table.removeAttribute("aria-label");
      } else if (ariaLabel) {
        table.setAttribute("aria-label", ariaLabel);
        table.removeAttribute("aria-labelledby");
      } else {
        table.removeAttribute("aria-labelledby");
        table.removeAttribute("aria-label");
      }
    }
  }
  renderHeader() {
    this.log("render header");
    const thead = this.thead;
    this.createColumnHeaders(thead);
    this.createColumnFilters(thead);
    dispatch(this, "headerRendered");
  }
  renderFooter() {
    this.log("render footer");
    const tfoot = this.tfoot;
    if (!tfoot)
      return;
    const td = tfoot.querySelector("td");
    if (!td)
      return;
    tfoot.removeAttribute("hidden");
    setAttribute(td, "colspan", this.columnsLength(true));
    tfoot.style.display = "";
  }
  createColumnHeaders(thead) {
    const availableWidth = this.clientWidth;
    const colMaxWidth = Math.round(availableWidth / this.columnsLength(true) * 2);
    const tr = ce("tr");
    this.headerRow = tr;
    tr.setAttribute("class", "dg-head-columns");
    let sampleTh = thead?.querySelector("tr.dg-head-columns th");
    this.log("createColumnHeaders - sampleTh", sampleTh);
    if (!sampleTh) {
      sampleTh = ce("th");
      thead?.querySelector("tr")?.appendChild(sampleTh);
    }
    let totalWidth = 0;
    this.log("createColumnHeaders - columns", this.getColumns());
    for (const column of this.getColumns()) {
      if (column.attr) {
        continue;
      }
      const th = ce("th");
      th.setAttribute("scope", "col");
      setAttribute(th, "data-column-id", column.id ?? column.field);
      if (!column.virtual) {
        th.setAttribute("id", randstr("dg-col-"));
        th.setAttribute("field", column.field ?? "");
      }
      const ctx = { grid: this, column, sampleTh, availableWidth, colMaxWidth };
      if (column.renderHeaderCell) {
        column.renderHeaderCell(th, ctx);
      } else {
        this.renderDefaultHeaderCell(th, ctx);
      }
      tr.appendChild(th);
      if (!column.hidden) {
        totalWidth += Number.parseInt(th.getAttribute("width") ?? "") || 0;
      }
    }
    if (totalWidth < availableWidth) {
      const visibleCols = findAll(tr, "th:not([hidden],.dg-not-resizable)");
      if (visibleCols.length) {
        const lastCol = visibleCols[visibleCols.length - 1];
        removeAttribute(lastCol, "width");
      }
    }
    const oldRow = thead?.querySelector("tr.dg-head-columns");
    if (thead && oldRow) {
      thead.replaceChild(tr, oldRow);
    }
    if (thead && thead.offsetWidth > availableWidth) {
      this.log(`adjust width to fix size, ${thead.offsetWidth} > ${availableWidth}`);
      const scrollbarWidth = this.offsetWidth - this.clientWidth;
      let diff = thead.offsetWidth - availableWidth - scrollbarWidth;
      if (this.options.responsive) {
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
        const actualWidth = Number.parseInt(th.getAttribute("width") ?? "");
        const minWidth = Number.parseInt(th.dataset.minWidth ?? "") || 0;
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
    const sortableHeaders = findAll(tr, "th.dg-sortable");
    for (const th of sortableHeaders) {
      const button = th.querySelector("button[type=button]");
      if (button) {
        button.addEventListener("click", () => this.sortData(th));
      }
    }
  }
  renderDefaultHeaderCell(th, ctx) {
    const { column, sampleTh } = ctx;
    const sortable = this.options.sortable && !column.noSort;
    if (sortable) {
      th.classList.add("dg-sortable");
    }
    if (this.options.responsive) {
      setAttribute(th, "data-responsive", column.responsive || "");
    }
    const computedWidth = getTextWidth(column.title ?? "", sampleTh ?? document.body, true) + 20;
    th.dataset.minWidth = `${computedWidth}`;
    applyColumnDefinition(th, column);
    const w = Math.max(Number.parseInt(th.dataset.minWidth ?? ""), Number.parseInt(th.getAttribute("width") ?? ""));
    setAttribute(th, "width", w);
    if (column.hidden) {
      th.setAttribute("hidden", "");
    }
    if (sortable) {
      const direction = this.getColumnSortDirection(column.field ?? "");
      if (direction) {
        th.setAttribute("aria-sort", direction === "asc" ? "ascending" : "descending");
        setAttribute(th, "data-sort", direction);
      }
      const button = ce("button");
      button.type = "button";
      button.classList.add("dg-sort");
      button.textContent = column.title ?? "";
      th.appendChild(button);
    } else {
      th.textContent = column.title ?? "";
    }
  }
  createColumnFilters(thead) {
    let idx = 0;
    const tr = ce("tr");
    tr.setAttribute("class", "dg-head-filters");
    if (!this.options.filterable) {
      tr.setAttribute("hidden", "");
    }
    const headerThs = Array.from(thead?.querySelectorAll("tr.dg-head-columns th") ?? []);
    this.log("createColumnFilters - columns", this.getColumns());
    for (const column of this.getColumns()) {
      if (column.attr) {
        continue;
      }
      const relatedTh = headerThs[idx];
      if (!relatedTh) {
        console.warn("Related th not found", idx);
        continue;
      }
      const th = ce("th");
      setAttribute(th, "data-column-id", column.id ?? column.field);
      const ctx = { grid: this, column };
      if (column.renderFilterCell) {
        column.renderFilterCell(th, ctx);
      } else {
        this.renderDefaultFilterCell(th, column, relatedTh);
      }
      if (column.hidden) {
        th.setAttribute("hidden", "");
      }
      tr.appendChild(th);
      idx++;
    }
    const oldRow = thead?.querySelector("tr.dg-head-filters");
    if (thead && oldRow) {
      thead.replaceChild(tr, oldRow);
    }
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
  renderDefaultFilterCell(th, column, relatedTh) {
    const filter = this.createFilterElement(column, relatedTh);
    const field = column.field;
    if (field) {
      const filterState = this._query.filters?.[field];
      if (filterState) {
        filter.value = filterState.value ?? "";
      }
    }
    th.appendChild(filter);
  }
  createFilterElement(column, relatedTh) {
    const isSelect = column.filterType === "select";
    const filter = isSelect ? ce("select") : ce("input");
    filter.classList.add("dg-filter");
    if (isSelect) {
      for (const e of this.getFilterOptions(column)) {
        const opt = ce("option");
        opt.value = `${e.value}`;
        opt.text = e.text;
        if (filter instanceof HTMLSelectElement) {
          filter.add(opt);
        }
      }
    } else {
      const input = filter;
      input.type = "text";
      input.inputMode = "search";
      input.autocomplete = "off";
      input.placeholder = "Filter…";
      input.spellcheck = false;
    }
    filter.dataset.name = column.field ?? "";
    filter.id = randstr("dg-filter-");
    filter.setAttribute("aria-labelledby", relatedTh.getAttribute("id") ?? "");
    return filter;
  }
  getFilterOptions(column) {
    const field = column.field;
    const firstFilterOption = column.firstFilterOption || this.defaultColumn.firstFilterOption || { value: "", text: "" };
    if (Array.isArray(column.filterList)) {
      return column.filterList;
    }
    const metaOptions = field ? this.meta?.filters?.[field] : undefined;
    if (Array.isArray(metaOptions)) {
      return [firstFilterOption, ...metaOptions];
    }
    if (this.dataSource instanceof ArrayDataSource) {
      const uniqueValues = [...new Set((this.dataSource.rows ?? []).map((e) => field ? e[field] : undefined))].filter((v) => v !== undefined && v !== null && v !== "").sort();
      return [firstFilterOption, ...uniqueValues.map((e) => ({ value: e, text: e }))];
    }
    return [firstFilterOption];
  }
  renderBody() {
    this.log("render body");
    this._columns = this.buildColumns();
    this.runPlugins("beforeRender");
    this._renderContext = "body";
    const tbody = ce("tbody");
    const prev = this.tbody;
    const message = prev?.getAttribute("data-empty-message") ?? "";
    let i = 0;
    for (const item of this.rows) {
      const tr = ce("tr");
      if (this.options.expand) {
        tr.classList.add("dg-expandable");
        on(tr, "click", (ev) => {
          if (ev.target.matches(this._excludedRowElementSelector))
            return;
          toggleClass(ev.currentTarget, "dg-expanded");
        });
      }
      for (const column of this.getColumns()) {
        if (!column) {
          console.error("Empty column found!", this.getColumns());
          continue;
        }
        const field = column.field;
        if (column.attr) {
          if (field && item[field]) {
            if (column.attr === "class") {
              addClass(tr, item[field]);
            } else {
              tr.setAttribute(column.attr, item[field]);
            }
          }
          continue;
        }
        const td = ce("td");
        setAttribute(td, "data-column-id", column.id ?? field);
        applyColumnDefinition(td, column);
        td.setAttribute("data-name", column.title ?? "");
        const ctx = { grid: this, column, row: item, rowIndex: i, value: field ? item[field] : undefined, tr };
        if (column.renderCell) {
          applyCellContent(td, column.renderCell(ctx));
        } else {
          this.renderDefaultCell(td, ctx);
        }
        tr.appendChild(td);
      }
      tbody.appendChild(tr);
      dispatch(this, "rowRendered", { rowData: item, tr });
      i++;
    }
    const colspan = Math.max(1, this.columnsLength(true));
    if (this.hasDataError) {
      const tr = ce("tr");
      tr.classList.add("dg-error-row");
      const td = ce("td");
      td.colSpan = colspan;
      td.textContent = message || this.labels.networkError;
      tr.appendChild(td);
      tbody.appendChild(tr);
    } else if (this.rows.length === 0) {
      const tr = ce("tr");
      tr.classList.add("dg-empty-row");
      const td = ce("td");
      td.colSpan = colspan;
      td.textContent = this.noData;
      tr.appendChild(td);
      tbody.appendChild(tr);
    }
    if (prev) {
      tbody.setAttribute("data-empty-message", message);
      this.table?.replaceChild(tbody, prev);
    }
    this.paginate();
    this.runPlugins("afterRender", this._renderContext);
    if (this.hasDataError || this.rows.length) {
      removeAttribute(this, "data-empty");
    } else {
      setAttribute(this, "data-empty", "");
    }
    dispatch(this, "bodyRendered");
  }
  renderDefaultCell(td, ctx) {
    const { column, row: item, rowIndex: i } = ctx;
    const field = column.field;
    if (!field || !item) {
      return;
    }
    if (column.editable) {
      addClass(td, "dg-editable-col");
      td.dataset.field = field;
      td.dataset.rowIndex = `${i}`;
    }
    const v = item[field] ?? "";
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
    td.textContent = tv;
  }
  paginate() {
    this.log("paginate");
    const tfoot = this.tfoot;
    if (!tfoot)
      return;
    this.pages = this.totalPages();
    if (this.btnFirst)
      this.btnFirst.disabled = this._query.page <= 1;
    if (this.btnPrev)
      this.btnPrev.disabled = this._query.page <= 1;
    if (this.btnNext)
      this.btnNext.disabled = this._query.page >= this.pages;
    if (this.btnLast)
      this.btnLast.disabled = this._query.page >= this.pages;
    this.updateMetaLabel();
    tfoot.toggleAttribute("hidden", this.options.autohidePager && this._query.pageSize > this.total);
  }
  totalPages() {
    return Math.ceil(this.total / (this._query.pageSize || 1));
  }
  fixPage() {
    if (!this.inputPage)
      return this;
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
}
var data_grid_default = DataGrid;

// src/core/base-plugin.js
class BasePlugin {
  constructor(grid) {
    this.grid = grid;
  }
  connected() {}
  disconnected() {}
  extendColumns(columns) {}
  beforeRender() {}
  afterRender(context) {}
  updateLabels() {}
  responsiveChanged(enabled) {}
  handleEvent(event) {
    const handler = Reflect.get(this, `on${event.type}`);
    if (typeof handler === "function") {
      handler.call(this, event);
    }
  }
}
var base_plugin_default = BasePlugin;

// src/utils/elementOffset.js
function elementOffset(el) {
  const rect = el.getBoundingClientRect();
  const scrollLeft = window.pageXOffset || document.documentElement.scrollLeft;
  const scrollTop = window.pageYOffset || document.documentElement.scrollTop;
  return { top: rect.top + scrollTop, left: rect.left + scrollLeft };
}

// src/plugins/column-resizer.js
class ColumnResizer extends base_plugin_default {
  afterRender(context) {
    if (context !== "table") {
      return;
    }
    this.renderResizer(this.grid.labels.resizeColumn);
  }
  updateLabels() {
    const resizeLabel = this.grid.labels.resizeColumn;
    const resizers = findAll(this.grid, ".dg-resizer");
    for (const resizer of resizers) {
      resizer.ariaLabel = resizeLabel;
    }
  }
  renderResizer(resizeLabel) {
    const grid = this.grid;
    const table = grid.table;
    if (!table) {
      return;
    }
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
        const target = e.target;
        const currentCols = findAll(grid, "thead tr.dg-head-columns th");
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
        for (let j = 0;j < visibleCols.length; j++) {
          if (j > columnIndex) {
            removeAttribute(cols[j], "width");
          }
        }
        on(document, "mousemove", mouseMoveHandler);
        on(document, "mouseup", mouseUpHandler);
      });
    }
  }
}
var column_resizer_default = ColumnResizer;

// src/utils/getParentElement.js
function getParentElement(el, type, prop = "nodeName") {
  let parent = el;
  while (parent && Reflect.get(parent, prop) !== type) {
    parent = parent.parentElement;
  }
  return parent;
}

// src/plugins/context-menu.js
class ContextMenu extends base_plugin_default {
  connected() {
    this.menu = this.grid.querySelector(".dg-menu");
  }
  disconnected() {
    if (this.grid.headerRow) {
      off(this.grid.headerRow, "contextmenu", this);
    }
  }
  afterRender(context) {
    if (context !== "table") {
      return;
    }
    this.createMenu();
    this.attachContextMenu();
  }
  attachContextMenu() {
    const grid = this.grid;
    if (grid.headerRow) {
      on(grid.headerRow, "contextmenu", this);
    }
  }
  onchange(e) {
    const grid = this.grid;
    const t = e.target;
    const field = t.dataset.name;
    if (!field) {
      return;
    }
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
    if (!menu) {
      return;
    }
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
    if (!menu) {
      return;
    }
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
      const text = document.createTextNode(col.title ?? "");
      label.appendChild(checkbox);
      label.appendChild(text);
      li.appendChild(label);
      menu.appendChild(li);
    }
  }
}
var context_menu_default = ContextMenu;

// src/plugins/draggable-headers.js
class DraggableHeaders extends base_plugin_default {
  afterRender(context) {
    if (context !== "table") {
      return;
    }
    const headers = findAll(this.grid, "thead tr.dg-head-columns th[data-column-id]");
    for (const th of headers) {
      this.makeHeaderDraggable(th);
    }
  }
  makeHeaderDraggable(th) {
    const grid = this.grid;
    th.draggable = true;
    on(th, "dragstart", (e) => {
      grid.log("reorder col");
      const dt = e.dataTransfer;
      if (!dt) {
        return;
      }
      dt.effectAllowed = "move";
      dt.setData("text/plain", th.getAttribute("data-column-id") ?? "");
    });
    on(th, "dragover", (e) => {
      if (e.preventDefault) {
        e.preventDefault();
      }
      if (e.dataTransfer) {
        e.dataTransfer.dropEffect = "move";
      }
      return false;
    });
    on(th, "drop", (e) => {
      if (e.stopPropagation) {
        e.stopPropagation();
      }
      const target = getParentElement(e.target, "TH");
      const dt = e.dataTransfer;
      if (!dt) {
        return false;
      }
      const draggedId = dt.getData("text/plain");
      const targetId = target?.getAttribute("data-column-id");
      if (!targetId || draggedId === targetId) {
        grid.log("reordered col stayed the same");
        return false;
      }
      if (draggedId.startsWith("$") || targetId.startsWith("$")) {
        return false;
      }
      grid.log(`reordered col from ${draggedId} to ${targetId}`);
      const cols = grid.options.columns;
      const from = cols.findIndex((c) => (c.id ?? c.field) === draggedId);
      const to = cols.findIndex((c) => (c.id ?? c.field) === targetId);
      if (from === -1 || to === -1) {
        return false;
      }
      [cols[from], cols[to]] = [cols[to], cols[from]];
      grid.renderTable();
      dispatch(grid, "columnReordered", {
        col: draggedId,
        from,
        to
      });
      return false;
    });
  }
}
var draggable_headers_default = DraggableHeaders;

// src/plugins/touch-support.js
class TouchSupport extends base_plugin_default {
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
    this.touch = e.touches[0] ?? null;
  }
  ontouchmove(e) {
    if (!this.touch) {
      return;
    }
    const touch = e.touches[0];
    if (!touch) {
      return;
    }
    const grid = this.grid;
    const xDiff = this.touch.clientX - touch.clientX;
    const yDiff = this.touch.clientY - touch.clientY;
    if (Math.abs(xDiff) > Math.abs(yDiff)) {
      if (xDiff > 0) {
        grid.getNext();
      } else {
        grid.getPrev();
      }
    }
    this.touch = null;
  }
}
var touch_support_default = TouchSupport;

// src/plugins/selectable-rows.js
var SELECTABLE_CLASS = "dg-selectable";
var SELECT_ALL_CLASS = "dg-select-all";

class SelectableRows extends base_plugin_default {
  get isSingleSelect() {
    return this.grid.options.singleSelect;
  }
  get visibleOnly() {
    return this.grid.options.selectVisibleOnly;
  }
  connected() {
    this.grid.addEventListener("selectionChange", this);
  }
  disconnected() {
    this.grid.removeEventListener("selectionChange", this);
  }
  handleEvent(event) {
    if (event.type === "selectionChange") {
      this.syncSelection();
    }
  }
  extendColumns(columns) {
    if (!this.grid.options.selectable) {
      return;
    }
    columns.unshift({
      id: "$selection",
      virtual: true,
      position: "start",
      noSort: true,
      title: "",
      class: SELECTABLE_CLASS,
      renderHeaderCell: (th) => this.createHeaderCell(th),
      renderFilterCell: () => this.createFilterCell(),
      renderCell: (ctx) => this.createDataCell(ctx)
    });
  }
  afterRender(context) {
    if (context === "body") {
      this.syncSelection();
    } else if (context === "table") {
      this.syncSelectAll();
    }
  }
  updateLabels() {
    if (this.selectAll) {
      this.selectAll.setAttribute("aria-label", this.grid.labels.selectAll);
    }
  }
  syncSelection() {
    const grid = this.grid;
    if (!grid.options.selectable) {
      return;
    }
    const tbody = grid.tbody;
    if (!tbody) {
      return;
    }
    const inputs = Array.from(tbody.querySelectorAll(`.${SELECTABLE_CLASS} input`));
    const trs = Array.from(tbody.querySelectorAll("tr"));
    for (const input of inputs) {
      const tr = input.closest("tr");
      if (!tr) {
        continue;
      }
      const index = trs.indexOf(tr);
      const row = grid.rows[index];
      if (row === undefined) {
        continue;
      }
      input.checked = grid.isRowSelected(row, index);
    }
    this.syncSelectAll();
  }
  syncSelectAll() {
    const grid = this.grid;
    if (!this.selectAll || !grid.options.selectable) {
      return;
    }
    const visible = [];
    const tbody = grid.tbody;
    if (tbody) {
      const inputs = Array.from(tbody.querySelectorAll(`.${SELECTABLE_CLASS} input`));
      for (const input of inputs) {
        if (this.visibleOnly && input.closest("tr[hidden]")) {
          continue;
        }
        visible.push(input);
      }
    }
    const checked = visible.filter((input) => input.checked).length;
    this.selectAll.indeterminate = checked > 0 && checked < visible.length;
    this.selectAll.checked = visible.length > 0 && checked === visible.length;
  }
  createHeaderCell(th) {
    setAttribute(th, "width", "40");
    th.classList.add("dg-not-resizable", "dg-not-sortable");
    this.selectAll = document.createElement("input");
    this.selectAll.type = "checkbox";
    this.selectAll.classList.add(SELECT_ALL_CLASS);
    this.selectAll.setAttribute("aria-label", this.grid.labels.selectAll);
    this.selectAll.addEventListener("change", () => {
      if (this.selectAll?.checked) {
        this.grid.selectAll();
      } else {
        this.grid.clearSelection();
      }
    });
    const label = document.createElement("label");
    label.hidden = this.isSingleSelect;
    label.appendChild(this.selectAll);
    th.appendChild(label);
    this.syncSelectAll();
  }
  createFilterCell() {}
  createDataCell({ row, rowIndex }) {
    const grid = this.grid;
    const input = document.createElement("input");
    input.type = this.isSingleSelect ? "radio" : "checkbox";
    input.checked = row ? grid.isRowSelected(row, rowIndex ?? 0) : false;
    input.setAttribute("aria-label", `Select ${grid.getRowLabel(row ?? {}, rowIndex ?? 0)}`);
    if (this.isSingleSelect) {
      input.name = "dg-row-select";
    }
    const label = document.createElement("label");
    label.classList.add("dg-clickable-cell");
    label.appendChild(input);
    label.addEventListener("click", (event) => {
      event.stopPropagation();
    });
    if (this.isSingleSelect) {
      input.addEventListener("click", (event) => {
        event.preventDefault();
        if (row && grid.isRowSelected(row, rowIndex ?? 0)) {
          grid.deselectRow(row, rowIndex ?? 0);
        } else if (row) {
          grid.selectRow(row, rowIndex ?? 0);
        }
      });
    } else {
      input.addEventListener("change", () => {
        if (row) {
          grid.toggleRow(row, rowIndex ?? 0);
        }
      });
    }
    return label;
  }
}
var selectable_rows_default = SelectableRows;

// src/plugins/bulk-actions.js
class BulkActions extends base_plugin_default {
  connected() {
    const grid = this.grid;
    this.bar = document.createElement("div");
    this.bar.className = "dg-bulk-actions";
    this.bar.hidden = true;
    const table = grid.querySelector("table");
    if (table) {
      grid.insertBefore(this.bar, table);
    } else {
      grid.appendChild(this.bar);
    }
    grid.addEventListener("selectionChange", this);
    this.render();
  }
  disconnected() {
    this.grid.removeEventListener("selectionChange", this);
    this.bar?.remove();
  }
  handleEvent(event) {
    if (event.type === "selectionChange") {
      this.render();
    }
  }
  afterRender(context) {
    if (context === "body") {
      this.render();
    }
  }
  updateLabels() {
    this.render();
  }
  render() {
    const grid = this.grid;
    const bulkActions = grid.options.bulkActions ?? [];
    if (!this.bar || !bulkActions.length) {
      return;
    }
    const selection = grid.getSelectionState();
    const hasSelection = selection.mode === "all" || selection.ids.size > 0;
    this.bar.hidden = !hasSelection;
    if (!hasSelection) {
      return;
    }
    while (this.bar.firstChild) {
      this.bar.removeChild(this.bar.firstChild);
    }
    const count = selection.mode === "all" ? Math.max(0, grid.total - selection.except.size) : selection.ids.size;
    const countEl = document.createElement("span");
    countEl.className = "dg-bulk-count";
    countEl.textContent = grid.formatLabel(grid.labels.selectedCount, { count });
    this.bar.appendChild(countEl);
    for (const action of bulkActions) {
      const button = document.createElement("button");
      button.type = "button";
      button.dataset.action = action.name;
      if (action.intent) {
        button.dataset.intent = action.intent;
      }
      button.textContent = action.label ?? action.name;
      button.addEventListener("click", (event) => {
        event.stopPropagation();
        dispatch(grid, "bulkAction", {
          action: action.name,
          selection: grid.getSelectionState(),
          query: grid.query
        });
      });
      this.bar.appendChild(button);
    }
  }
}
var bulk_actions_default = BulkActions;

// src/plugins/fixed-height.js
class FixedHeight extends base_plugin_default {
  constructor(grid) {
    super(grid);
    this.hasFixedHeight = false;
    if (grid.style.height) {
      grid.style.overflowY = "auto";
      this.hasFixedHeight = true;
    }
  }
  afterRender(context) {
    if (context !== "body") {
      return;
    }
    this.createFakeRow();
    this.updateFakeRow();
  }
  createFakeRow() {
    const grid = this.grid;
    const tbody = grid.querySelector("tbody");
    const tr = document.createElement("tr");
    setAttribute(tr, "hidden", "");
    tr.classList.add("dg-fake-row");
    tbody?.appendChild(tr);
  }
  get fakeRow() {
    return this.grid.querySelector(".dg-fake-row");
  }
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
    const rowHeight = grid.rowHeight ?? 0;
    const max = grid.query.pageSize * rowHeight;
    const visibleRows = grid.querySelectorAll("tbody tr:not([hidden])").length;
    const fakeHeight = visibleRows > 1 ? max - visibleRows * rowHeight : max;
    if (fakeHeight > 0) {
      setAttribute(fakeRow, "height", fakeHeight);
      fakeRow.removeAttribute("hidden");
    } else {
      fakeRow.removeAttribute("height");
    }
  }
}
var fixed_height_default = FixedHeight;

// src/plugins/autosize-column.js
class AutosizeColumn extends base_plugin_default {
  afterRender(context) {
    if (context !== "table") {
      return;
    }
    const grid = this.grid;
    if (!grid.options.autosize) {
      return;
    }
    const availableWidth = grid.clientWidth;
    const colMaxWidth = Math.round(availableWidth / grid.columnsLength(true) * 2);
    const ths = findAll(grid, "thead tr.dg-head-columns th[data-column-id]:not([hidden])");
    let totalWidth = 0;
    for (const th of ths) {
      const column = grid.getColumns().find((c) => (c.id ?? c.field) === th.getAttribute("data-column-id"));
      if (!column) {
        continue;
      }
      const colAvailableWidth = Math.min(availableWidth - totalWidth, colMaxWidth);
      const w = this.computeSize(th, column, Number.parseInt(th.dataset.minWidth ?? ""), colAvailableWidth);
      totalWidth += Number(w) || 0;
    }
  }
  computeSize(th, column, min, max) {
    const grid = this.grid;
    if (hasAttribute(th, "width")) {
      return getAttribute(th, "width");
    }
    const field = column.field;
    if (!field || !grid.rows.length) {
      return;
    }
    const firstVal = grid.rows[0];
    const lastVal = grid.rows[grid.rows.length - 1];
    let v = firstVal[field] ? firstVal[field].toString() : "";
    const v2 = lastVal[field] ? lastVal[field].toString() : "";
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
}
var autosize_column_default = AutosizeColumn;

// src/plugins/responsive-grid.js
var RESPONSIVE_CLASS = "dg-responsive";
function sortByPriority(list) {
  return list.sort((a, b) => {
    const v1 = Number.parseInt(a.dataset.responsive ?? "") || 1;
    const v2 = Number.parseInt(b.dataset.responsive ?? "") || 1;
    return v2 - v1;
  });
}

class ResponsiveGrid extends base_plugin_default {
  constructor(grid) {
    super(grid);
    this.observerBlocked = false;
    this.prevAction = null;
    this.unblockTimeout = null;
    this._lastEntry = null;
    this._scheduleResize = debounce(() => this.resize(), 100);
    this.observer = new ResizeObserver((entries) => {
      this._lastEntry = entries[entries.length - 1];
      this._scheduleResize();
    });
  }
  connected() {
    if (this.grid.options.responsive) {
      this.observe();
    }
  }
  disconnected() {
    this.unobserve();
  }
  responsiveChanged(enabled) {
    if (enabled) {
      this.observe();
    } else {
      this.unobserve();
    }
  }
  observe() {
    if (!this.grid.options.responsive) {
      return;
    }
    this.observer.observe(this.grid);
    this.grid.style.display = "block";
    this.grid.style.overflowX = "hidden";
  }
  unobserve() {
    this.observer.unobserve(this.grid);
    this.grid.style.display = "unset";
    this.grid.style.overflowX = "unset";
  }
  extendColumns(columns) {
    if (!this.grid.options.responsiveToggle || !this.hasHiddenColumns()) {
      return;
    }
    columns.unshift({
      id: "$responsive",
      virtual: true,
      position: "start",
      noSort: true,
      title: "",
      class: `${RESPONSIVE_CLASS}-toggle`,
      renderHeaderCell: (th) => this.createHeaderCell(th),
      renderFilterCell: () => this.createFilterCell(),
      renderCell: () => this.createDataCell()
    });
  }
  blockObserver() {
    this.observerBlocked = true;
    if (this.unblockTimeout) {
      clearTimeout(this.unblockTimeout);
    }
  }
  unblockObserver() {
    this.unblockTimeout = setTimeout(() => {
      this.observerBlocked = false;
    }, 200);
  }
  hasHiddenColumns() {
    let flag = false;
    for (const col of this.grid.options.columns) {
      if (col.responsiveHidden) {
        flag = true;
      }
    }
    return flag;
  }
  createHeaderCell(th) {
    setAttribute(th, "width", "40");
    th.classList.add("dg-not-resizable", "dg-not-sortable");
  }
  createFilterCell() {}
  createDataCell() {
    const cell = document.createElement("div");
    cell.classList.add("dg-clickable-cell");
    cell.innerHTML = `<svg class='${RESPONSIVE_CLASS}-open' viewbox="0 0 24 24" height="24" width="24">
  <line x1="7" y1="12" x2="17" y2="12" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" />
  <line y1="7" x1="12" y2="17" x2="12" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" />
</svg>
<svg class='${RESPONSIVE_CLASS}-close' viewbox="0 0 24 24" height="24" width="24" style="display:none">
  <line x1="7" y1="12" x2="17" y2="12" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" />
</svg>`;
    cell.addEventListener("click", this);
    cell.addEventListener("mousedown", this);
    return cell;
  }
  resize() {
    const grid = this.grid;
    const table = grid.table;
    const headerRow = grid.headerRow;
    if (this.observerBlocked) {
      return;
    }
    if (!table || !headerRow) {
      return;
    }
    const entry = this._lastEntry;
    if (!entry) {
      return;
    }
    const contentBoxSize = Array.isArray(entry.contentBoxSize) ? entry.contentBoxSize[0] : entry.contentBoxSize;
    const size = Math.round(contentBoxSize.inlineSize);
    const tableWidth = table.offsetWidth;
    const realTableWidth = findAll(headerRow, "th").reduce((result, th) => {
      return result + th.offsetWidth;
    }, 0);
    const diff = (realTableWidth || tableWidth) - size - 1;
    const minWidth = 50;
    const prevAction = this.prevAction;
    const headerCols = sortByPriority(findAll(headerRow, "th[field]").reverse().filter((col) => {
      return col.dataset.responsive !== "0";
    }));
    let changed = false;
    grid.log(`table is ${tableWidth}/${realTableWidth} and available size is ${size}. Diff: ${diff}`);
    if (diff > 0) {
      if (prevAction === "show") {
        return;
      }
      this.prevAction = "hide";
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
      this.prevAction = "show";
      const requiredWidth = headerCols.filter((col) => {
        return !col.hasAttribute("hidden");
      }).reduce((result, col) => {
        const width = col.dataset.minWidth ? Number.parseInt(col.dataset.minWidth ?? "") : col.offsetWidth;
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
        const colWidth = Number.parseInt(col.dataset.minWidth ?? "");
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
    const footer = find(table, "tfoot");
    if (!footer) {
      return;
    }
    const realFooterWidth = findAll(footer, ".dg-footer > div").reduce((result, div) => {
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
    this.unblockTimeout = setTimeout(() => {
      this.prevAction = null;
    }, 1000);
    table.style.visibility = "visible";
  }
  computeLabelWidth() {
    let idealWidth = 0;
    const hCols = findAll(this.grid, ".dg-head-columns th");
    for (const hCol of hCols) {
      if (idealWidth >= 120) {
        break;
      }
      idealWidth += hCol.offsetWidth;
    }
    return idealWidth;
  }
  onmousedown(ev) {
    ev.preventDefault();
  }
  onclick(ev) {
    ev.stopPropagation();
    const cell = ev.currentTarget;
    const tr = cell.closest("tr");
    if (!tr) {
      return;
    }
    const open = find(cell, `.${RESPONSIVE_CLASS}-open`);
    const close = find(cell, `.${RESPONSIVE_CLASS}-close`);
    if (!open || !close) {
      return;
    }
    this.blockObserver();
    const isExpanded = hasClass(tr, `${RESPONSIVE_CLASS}-expanded`);
    if (isExpanded) {
      removeClass(tr, `${RESPONSIVE_CLASS}-expanded`);
      open.style.display = "unset";
      close.style.display = "none";
      const childRow = tr.nextElementSibling;
      if (childRow) {
        const hiddenCols = findAll(childRow, `.${RESPONSIVE_CLASS}-hidden`);
        for (const col of hiddenCols) {
          tr.appendChild(col);
          setAttribute(col, "hidden");
        }
        childRow.parentElement?.removeChild(childRow);
      }
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
        labelCol.innerHTML = label ?? "";
        childTableRow.appendChild(col);
        removeAttribute(col, "hidden");
      }
    }
    this.unblockObserver();
  }
}
var responsive_grid_default = ResponsiveGrid;

// src/utils/interpolate.js
function interpolate(str, data) {
  return str.replace(/\{([^}]+)?\}/g, ($1, $2) => data[$2]);
}

// src/plugins/row-actions.js
class RowActions extends base_plugin_default {
  hasActions() {
    return this.grid.options.actions.length > 0;
  }
  extendColumns(columns) {
    if (!this.grid.options.actions.length) {
      return;
    }
    columns.push({
      id: "$actions",
      virtual: true,
      position: "end",
      noSort: true,
      title: "",
      class: `dg-actions ${this.actionClass}`,
      renderHeaderCell: (th) => this.createHeaderCell(th),
      renderFilterCell: () => this.createFilterCell(),
      renderCell: (ctx) => this.makeActionRow(ctx)
    });
  }
  createHeaderCell(th) {
    th.classList.add("dg-not-sortable", "dg-not-resizable");
  }
  createFilterCell() {}
  updateLabels() {
    const toggleLabel = this.grid.labels.toggleActions;
    const toggles = findAll(this.grid, ".dg-actions-toggle");
    for (const toggle of toggles) {
      toggle.setAttribute("aria-label", toggleLabel);
      toggle.setAttribute("title", toggleLabel);
    }
  }
  makeActionRow({ row, tr, grid }) {
    const labels2 = grid.labels;
    const rowData = row ?? {};
    const fragment = document.createDocumentFragment();
    const actionsToggle = document.createElement("button");
    actionsToggle.type = "button";
    actionsToggle.classList.add("dg-actions-toggle");
    actionsToggle.textContent = "⋯";
    actionsToggle.setAttribute("aria-label", labels2.toggleActions);
    actionsToggle.setAttribute("aria-expanded", "false");
    actionsToggle.title = labels2.toggleActions;
    on(actionsToggle, "click", (ev) => {
      ev.stopPropagation();
      const parent = ev.target.parentElement;
      const expanded = parent?.classList.toggle("dg-actions-expand") ?? false;
      actionsToggle.setAttribute("aria-expanded", expanded ? "true" : "false");
    });
    fragment.appendChild(actionsToggle);
    for (const action of grid.options.actions) {
      if (action.visible && !action.visible(rowData)) {
        continue;
      }
      const { el, dispatchAction } = this.createActionElement(action, rowData, grid, labels2);
      fragment.appendChild(el);
      if (action.default && tr) {
        tr.classList.add("dg-actionable");
        on(tr, "click", dispatchAction);
      }
    }
    return fragment;
  }
  createActionElement(action, row, grid, labels2) {
    const href = action.href ? typeof action.href === "function" ? action.href(row) : interpolate(action.href, row) : null;
    const render = action.render ?? grid.options.actionRenderer;
    const content = render ? render({ action, row, grid }) : null;
    let el;
    if (content instanceof Element && (content.tagName === "BUTTON" || content.tagName === "A")) {
      el = content;
    } else {
      const isLink = href !== null;
      el = document.createElement(isLink ? "a" : "button");
      if (!isLink) {
        el.type = "button";
      }
      if (content === null || content === undefined) {
        el.textContent = action.label ?? action.name;
      } else {
        this.applyContent(el, content);
        if (content instanceof Node || typeof content === "object" && content.html !== undefined) {
          el.setAttribute("aria-label", action.label ?? action.name);
        }
      }
    }
    if (href !== null && !el.hasAttribute("href")) {
      el.href = href;
    }
    el.dataset.action = action.name;
    if (action.intent) {
      el.dataset.intent = action.intent;
      el.classList.add(`dg-intent-${action.intent}`);
    }
    if (action.class) {
      el.classList.add(...action.class.split(" "));
    }
    if (action.disabled?.(row)) {
      el.disabled = true;
    }
    const dispatchAction = (ev) => {
      ev.stopPropagation();
      if (action.confirm) {
        const c = confirm(labels2.areYouSure);
        if (!c) {
          ev.preventDefault();
          return;
        }
      }
      dispatch(grid, "action", {
        data: row,
        action: action.name
      });
    };
    el.addEventListener("click", dispatchAction);
    return { el, dispatchAction };
  }
  applyContent(el, content) {
    if (content instanceof Node) {
      el.appendChild(content);
    } else if (typeof content === "object" && content.html !== undefined) {
      el.innerHTML = content.html;
    } else {
      el.textContent = content;
    }
  }
  get actionClass() {
    if (this.grid.options.actions.length < 3 && !this.grid.options.collapseActions) {
      return `dg-actions-${this.grid.options.actions.length}`;
    }
    return "dg-actions-more";
  }
}
var row_actions_default = RowActions;

// src/plugins/editable-column.js
class EditableColumn extends base_plugin_default {
  afterRender(context) {
    if (context !== "body") {
      return;
    }
    const grid = this.grid;
    const cells = findAll(grid, "tbody td.dg-editable-col");
    for (const td of cells) {
      const rowIndex = Number.parseInt(td.dataset.rowIndex ?? "");
      const column = grid.getColumns().find((c) => (c.id ?? c.field) === td.getAttribute("data-column-id"));
      const item = grid.rows[rowIndex];
      if (!column || !item) {
        continue;
      }
      this.makeEditableInput(td, column, item, rowIndex);
    }
  }
  makeEditableInput(td, column, item, i) {
    const grid = this.grid;
    const field = column.field;
    if (!field) {
      return;
    }
    const gridId = grid.getAttribute("id") ?? "";
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
    input.classList.add("dg-editable");
    input.name = `${gridId.replace("-", "_")}[${i + 1}][${field}]`;
    input.setAttribute("aria-label", column.title ?? field);
    input.value = item[field];
    input.dataset.field = field;
    const previous = () => item[field];
    const startEditing = () => {
      td.dataset.editing = "";
      td.removeAttribute("data-invalid");
      td.removeAttribute("title");
    };
    const endEditing = () => {
      td.removeAttribute("data-editing");
    };
    const reject = (message = null) => {
      input.value = previous();
      endEditing();
      if (message) {
        td.dataset.invalid = "";
        td.title = message;
      }
    };
    const commit = () => {
      const value = input.value;
      if (value === previous()) {
        endEditing();
        return;
      }
      const error = this.validate(column, value, item);
      if (error) {
        reject(error);
        return;
      }
      const prev = previous();
      item[field] = value;
      const ev = new CustomEvent("edit", {
        detail: { data: item, value, field, column },
        cancelable: true
      });
      grid.dispatchEvent(ev);
      if (ev.defaultPrevented) {
        item[field] = prev;
      }
      endEditing();
    };
    input.addEventListener("click", (ev) => ev.stopPropagation());
    input.addEventListener("keydown", (ev) => {
      if (ev.key === "Enter") {
        ev.preventDefault();
        input.blur();
      } else if (ev.key === "Escape") {
        reject();
        input.blur();
      }
    });
    input.addEventListener("focus", startEditing);
    input.addEventListener("blur", commit);
    td.replaceChildren(input);
  }
  validate(column, value, row) {
    const ctx = { row, column, grid: this.grid };
    const res = column.validate?.(value, ctx) ?? this.grid.options.validate?.(value, ctx);
    if (typeof res === "string") {
      return res;
    }
    return res === false ? "Invalid value" : null;
  }
}
var editable_column_default = EditableColumn;

// src/plugins/spinner-support.js
class SpinnerSupport extends base_plugin_default {
  connected() {
    if (this.grid.options.spinnerClass) {
      this.add();
    }
  }
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
      if (styleParent) {
        const position = /head/i.test(styleParent.tagName) ? "beforeend" : "afterbegin";
        styleParent.insertAdjacentHTML(position, template);
      }
    }
    !$(`i${cls}`, grid) && grid.insertAdjacentHTML("afterbegin", `<i class="${classes}"></i>`);
  }
}
var spinner_support_default = SpinnerSupport;

// src/plugins/save-state.js
class SaveState extends base_plugin_default {
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
  _update() {
    const grid = this.grid;
    if (!grid.options.saveState || !grid.classList.contains("dg-initialized")) {
      return;
    }
    this._setState({
      query: grid.query,
      columns: grid.options.columns.map((col) => ({ field: col.field ?? "", hidden: Boolean(col.hidden) })),
      scrollTo: window.scrollY
    });
  }
  log(...data) {
    this.grid.log("[Save-State] ", ...data);
  }
  _getState() {
    let state;
    try {
      const raw = sessionStorage.getItem(`gridSaveState_${this.grid.id}`);
      if (raw) {
        state = JSON.parse(raw);
      }
    } catch (_) {}
    return state;
  }
  _setState(state) {
    sessionStorage.setItem(`gridSaveState_${this.grid.id}`, JSON.stringify(state));
  }
}
var save_state_default = SaveState;

// data-grid.js
data_grid_default.registerPlugins({
  ColumnResizer: column_resizer_default,
  ContextMenu: context_menu_default,
  DraggableHeaders: draggable_headers_default,
  TouchSupport: touch_support_default,
  SelectableRows: selectable_rows_default,
  BulkActions: bulk_actions_default,
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
  data_grid_default2 as default,
  FetchDataSource,
  data_grid_default as DataGrid,
  ArrayDataSource
};

//# debugId=26BD5A3AB4C8510064756E2164756E21
