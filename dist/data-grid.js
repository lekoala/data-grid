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
    const emptyA = a[field] === null || a[field] === undefined || a[field] === "";
    const emptyB = b[field] === null || b[field] === undefined || b[field] === "";
    if (emptyA !== emptyB) {
      return emptyA ? 1 : -1;
    }
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
  const rows = Array.isArray(json?.rows) ? json.rows : [];
  return {
    rows,
    total: Number.isFinite(json?.total) ? json.total : rows.length,
    meta: json?.meta ?? {}
  };
}
function applySearch(rows, search) {
  if (!search) {
    return rows;
  }
  const needle = search.toLowerCase();
  return rows.filter((row) => {
    for (const value of Object.values(row)) {
      if (value !== null && value !== undefined && `${value}`.toLowerCase().includes(needle)) {
        return true;
      }
    }
    return false;
  });
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
    rows = applySearch(rows, query.search);
    rows = applySort(rows, query.sort);
    const total = rows.length;
    return {
      rows: paginate(rows, query.page || 1, query.pageSize || 10),
      total,
      meta: { unfilteredTotal: this.rows.length }
    };
  }
  add(row) {
    this.rows.push(row);
  }
  remove(value, key) {
    const idx = this.rows.findIndex((row) => row[key] === value);
    if (idx === -1) {
      return false;
    }
    this.rows.splice(idx, 1);
    return true;
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
  const fn = (...args) => {
    if (timer !== null) {
      clearTimeout(timer);
    }
    timer = setTimeout(() => {
      timer = null;
      handler(...args);
    }, timeout);
  };
  fn.cancel = () => {
    if (timer !== null) {
      clearTimeout(timer);
      timer = null;
    }
  };
  fn.flush = () => {
    fn.cancel();
    handler();
  };
  return fn;
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
var textInputState = new WeakMap;
var labels = {
  itemsPerPage: "Items per page",
  gotoPage: "Go to page",
  gotoFirstPage: "Go to first page",
  gotoPrevPage: "Go to previous page",
  gotoNextPage: "Go to next page",
  gotoLastPage: "Go to last page",
  pageRange: "{from}–{to} / {total}",
  pageStatus: "Page {page} of {pages}",
  resultCount: "{count} items",
  selectedCount: "{count} selected",
  selectAll: "Select all rows",
  selectRow: "Select {row}",
  toggleActions: "Toggle row actions",
  resizeColumn: "Resize column",
  search: "Search",
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
  const search = typeof q.search === "string" ? q.search : "";
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
  return { page: Math.max(1, page), pageSize: Math.max(1, pageSize), search, sort, filters };
}
function parseDeclarativeBoolean(value) {
  return value === "" || value === "true" || value === "1";
}
function parseDeclarativeTable(table) {
  const columns = [];
  const sort = [];
  const headerRow = table.querySelector("thead > tr:first-child");
  if (!headerRow) {
    return { columns, sort };
  }
  const ths = headerRow.querySelectorAll(":scope > th[data-field]");
  for (const th of ths) {
    const field = th.dataset.field;
    if (!field) {
      continue;
    }
    const column = {
      field,
      title: th.textContent.trim()
    };
    if (th.dataset.sortable !== undefined) {
      column.sortable = parseDeclarativeBoolean(th.dataset.sortable);
    }
    if (th.dataset.filterable !== undefined) {
      column.filterable = parseDeclarativeBoolean(th.dataset.filterable);
    }
    if (th.dataset.filter) {
      column.filterType = th.dataset.filter;
    }
    if (th.dataset.filterPlaceholder !== undefined) {
      column.filterPlaceholder = th.dataset.filterPlaceholder;
    }
    if (th.dataset.responsive !== undefined) {
      const responsive = Number(th.dataset.responsive);
      if (Number.isFinite(responsive)) {
        column.responsive = responsive;
      }
    }
    if (th.dataset.hidden !== undefined) {
      column.hidden = parseDeclarativeBoolean(th.dataset.hidden);
    }
    if (th.dataset.editable !== undefined) {
      column.editable = parseDeclarativeBoolean(th.dataset.editable);
    }
    if (th.dataset.editableType) {
      column.editableType = th.dataset.editableType;
    }
    if (th.dataset.transform) {
      column.transform = th.dataset.transform;
    }
    if (th.dataset.width !== undefined) {
      const width = Number(th.dataset.width);
      if (Number.isFinite(width)) {
        column.width = width;
      }
    }
    const direction = th.dataset.sort;
    if (direction === "asc" || direction === "desc") {
      sort.push({ field, direction });
    }
    columns.push(column);
  }
  return { columns, sort };
}
function parseActionsCell(td) {
  const actions = [];
  const elements = td.querySelectorAll("[data-action]");
  for (const el of elements) {
    const name = el.dataset.action;
    if (!name) {
      continue;
    }
    const action = { name };
    const label = el.textContent.trim();
    if (label) {
      action.label = label;
    }
    const href = el.getAttribute("href");
    if (href) {
      action.href = href;
    }
    if (el.dataset.intent) {
      action.intent = el.dataset.intent;
    }
    if (el.dataset.confirm !== undefined) {
      action.confirm = el.dataset.confirm;
    }
    if (el.dataset.default !== undefined) {
      action.default = parseDeclarativeBoolean(el.dataset.default);
    }
    if (el.hasAttribute("disabled")) {
      action.disabled = true;
    }
    actions.push(action);
  }
  return actions;
}
function rowsFromTable(table, columns, rowKey = "id") {
  const tbody = table.querySelector("tbody");
  if (!tbody) {
    return [];
  }
  const rows = [];
  const trs = tbody.querySelectorAll(":scope > tr");
  for (const tr of trs) {
    const row = {};
    const tds = Array.from(tr.querySelectorAll(":scope > td")).filter((td) => !td.hasAttribute("data-actions"));
    columns.forEach((column, index) => {
      if (!column.field) {
        return;
      }
      const td = tds[index];
      if (!td) {
        return;
      }
      row[column.field] = td.dataset.value ?? td.textContent.trim();
    });
    const actionsCell = tr.querySelector(":scope > td[data-actions]");
    if (actionsCell) {
      const actions = parseActionsCell(actionsCell);
      if (actions.length) {
        row.$actions = actions;
      }
    }
    if (tr.dataset.rowKey !== undefined && typeof rowKey === "string") {
      row[rowKey] = tr.dataset.rowKey;
    }
    rows.push(row);
  }
  return rows;
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
function isColumnHidden(column) {
  return Boolean(column.hidden || column.responsiveHidden);
}
function applyColumnDefinition(el, column) {
  if (column.width) {
    setAttribute(el, "width", column.width);
  }
  if (column.class) {
    addClass(el, column.class);
  }
  if (isColumnHidden(column)) {
    setAttribute(el, "hidden", "");
    if (column.responsiveHidden) {
      addClass(el, "dg-responsive-hidden");
    }
  }
  if (column.sortable === false && el.tagName === "TH") {
    addClass(el, "dg-not-sortable");
  }
}

class DataGrid extends base_element_default {
  _filterSelector = "[id^=dg-filter]";
  _excludedRowElementSelector = "a,button,input,select,textarea";
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
  scrollEl = document.createElement("div");
  btnFirst = null;
  btnPrev = null;
  btnNext = null;
  btnLast = null;
  selectPerPage = null;
  inputPage = null;
  searchInput = null;
  headerRow = null;
  rowHeight = null;
  _loadObserver = null;
  _lazyPending = false;
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
<table data-dg-generated-table>
    <thead>
        <tr class="dg-head-columns"><th><!-- keep for getTextWidth --></th></tr>
        <tr class="dg-head-filters"></tr>
    </thead>
    <tbody data-empty-message="${labels.noData}"></tbody>
    <tfoot hidden>
        <tr>
            <td>
            <div class="dg-footer">
                <div class="dg-footer-controls">
                <div class="dg-page-nav">
                  <select class="dg-select-per-page" aria-label="${labels.itemsPerPage}"></select>
                </div>
                <div class="dg-pagination" role="group" aria-label="${formatLabel(labels.pageStatus, { page: 0, pages: 0 })}">
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
    if (this.searchInput) {
      this.searchInput.setAttribute("aria-label", this.labels.search);
      this.searchInput.setAttribute("placeholder", this.options.searchPlaceholder);
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
    this.updatePageStatus();
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
  updatePageStatus() {
    const pagination = this.querySelector(".dg-pagination");
    if (!pagination) {
      return;
    }
    const pages = this.totalPages();
    pagination.setAttribute("aria-label", this.formatLabel(this.labels.pageStatus, { page: this._query.page || 1, pages }));
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
      responsive: 1,
      responsiveHidden: false,
      transform: "",
      filterType: "text",
      filterPlaceholder: "",
      firstFilterOption: { value: "", text: "" }
    };
  }
  get defaultOptions() {
    return {
      id: null,
      src: "",
      params: {},
      loading: "eager",
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
      rowActions: false,
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
      responsiveStartOpen: false,
      filterDelay: 300,
      searchable: false,
      searchPlaceholder: "",
      searchDelay: 300,
      minSearchLength: 0,
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
      "loading",
      "sortable",
      "filterable",
      "searchable",
      "search-placeholder",
      "min-search-length",
      "responsive",
      "responsive-toggle",
      "responsive-start-open",
      "selectable",
      "single-select",
      "select-visible-only",
      "row-key",
      "row-label",
      "collapse-actions",
      "save-state",
      "no-data",
      "error-message",
      "page-sizes",
      "row-actions",
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
  get transformAttributes() {
    return {
      "page-sizes": (raw) => raw.split(",").map((value) => Number.parseInt(value, 10)).filter((value) => Number.isFinite(value))
    };
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
    const resetsPage = patch.search !== undefined || patch.filters !== undefined || patch.sort !== undefined || patch.pageSize !== undefined;
    const changesPopulation = patch.search !== undefined || patch.filters !== undefined;
    if (patch.pageSize !== undefined)
      next.pageSize = patch.pageSize;
    if (patch.search !== undefined)
      next.search = patch.search;
    if (patch.sort !== undefined)
      next.sort = patch.sort;
    if (patch.filters !== undefined)
      next.filters = patch.filters;
    if (resetsPage && patch.page === undefined)
      next.page = 1;
    if (patch.page !== undefined)
      next.page = patch.page;
    this._query = normalizeQuery(next);
    if (changesPopulation) {
      this._clearSelectionIfNeeded();
    }
    if (this._lazyPending) {
      return Promise.resolve();
    }
    return this.refresh();
  }
  resetQuery() {
    this._query = normalizeQuery(this._initialQuery);
    this._clearSelectionIfNeeded();
    return this.refresh();
  }
  refresh() {
    return this.load();
  }
  async load() {
    if (this._lazyPending) {
      this._lazyPending = false;
      this._loadObserver?.disconnect();
      this._loadObserver = null;
    }
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
      if (this.applyResult(result)) {
        return this.refresh();
      }
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
    const inferredColumns = this.options.columns.length === 0 && this.rows.length > 0;
    if (inferredColumns) {
      const fields = Object.keys(this.rows[0]).filter((field) => field !== "$actions");
      this.options.columns = this.convertColumns(fields);
    } else {
      this.options.columns = this.convertColumns(this.options.columns);
    }
    const requestedPage = this._query.page;
    this.fixPage();
    if (this.total > 0 && requestedPage > this.pages) {
      return true;
    }
    if (inferredColumns) {
      this.renderTable();
    }
    this.renderBody();
    return false;
  }
  srcChanged() {
    this.setupDataSource();
    this._clearSelectionIfNeeded();
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
    this.renderBody();
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
  searchableChanged() {
    this.renderSearch();
  }
  searchPlaceholderChanged() {
    if (this.searchInput) {
      this.searchInput.setAttribute("placeholder", this.options.searchPlaceholder);
    }
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
  ensureTopbar() {
    let topbar = this.querySelector(".dg-topbar");
    if (!topbar) {
      topbar = ce("div");
      topbar.className = "dg-topbar";
      const start = ce("div");
      start.className = "dg-topbar-start";
      const end = ce("div");
      end.className = "dg-topbar-end";
      topbar.append(start, end);
      this.insertBefore(topbar, this.scrollEl);
    }
    return topbar;
  }
  renderSearch() {
    if (!this.options.searchable) {
      this.searchInput?.remove();
      this.searchInput = null;
      return;
    }
    if (this.searchInput) {
      this.searchInput.setAttribute("aria-label", this.labels.search);
      this.searchInput.setAttribute("placeholder", this.labels.search);
      return;
    }
    const input = ce("input");
    input.type = "search";
    input.className = "dg-search";
    input.setAttribute("placeholder", this.options.searchPlaceholder);
    input.setAttribute("aria-label", this.labels.search);
    input.value = this._query.search;
    textInputState.set(input, {
      composing: false,
      apply: debounce(() => this.commitSearch(), this.options.searchDelay)
    });
    this.ensureTopbar().querySelector(".dg-topbar-end")?.appendChild(input);
    this.searchInput = input;
  }
  commitSearch() {
    const input = this.searchInput;
    if (!input) {
      return;
    }
    const value = input.value;
    if (value !== "" && value.length < this.options.minSearchLength) {
      return;
    }
    if (value === this._query.search) {
      return;
    }
    return this.setQuery({ search: value });
  }
  _adoptDeclarativeTable() {
    const adopted = this.querySelector(":scope > table[data-dg-table]");
    const generated = this.querySelector(":scope > table[data-dg-generated-table]");
    if (adopted) {
      generated?.remove();
      return;
    }
    if (!generated) {
      return;
    }
    const supplied = Array.from(this.querySelectorAll(":scope > table")).find((table) => table !== generated);
    if (!supplied) {
      return;
    }
    const caption = supplied.querySelector("caption");
    if (caption && !this.options.caption) {
      this.options.caption = caption.textContent.trim();
    }
    const { columns, sort } = parseDeclarativeTable(supplied);
    if (columns.length) {
      this.options.columns = columns;
    }
    if (supplied.querySelector("thead th[data-actions]")) {
      this.options.rowActions = true;
    }
    if (!this.options.initialQuery && sort.length) {
      this._initialQuery.sort = sort;
      this._query.sort = sort;
    }
    const effectiveColumns = columns.length ? columns : this.convertColumns(this.options.columns);
    if (!this.options.dataSource && !this.options.src && effectiveColumns.length) {
      this.options.dataSource = new ArrayDataSource(rowsFromTable(supplied, effectiveColumns, this.options.rowKey));
    }
    supplied.querySelector("thead > tr:first-child")?.remove();
    if (generated) {
      const tbody = generated.querySelector("tbody");
      const tfoot = generated.querySelector("tfoot");
      supplied.querySelector("tbody")?.remove();
      supplied.querySelector("tfoot")?.remove();
      if (tbody) {
        supplied.appendChild(tbody);
      }
      if (tfoot) {
        supplied.appendChild(tfoot);
      }
      generated.remove();
    }
    supplied.setAttribute("data-dg-table", "");
  }
  _wrapScroll() {
    const existing = this.querySelector(":scope > .dg-scroll");
    if (existing) {
      existing.className = "dg-scroll";
      this.scrollEl = existing;
      const table = existing.querySelector(":scope > table");
      if (table) {
        this.table = table;
      }
      return;
    }
    const scroll = ce("div");
    scroll.className = "dg-scroll";
    if (this.table) {
      this.insertBefore(scroll, this.table);
      scroll.appendChild(this.table);
    } else {
      this.appendChild(scroll);
    }
    this.scrollEl = scroll;
  }
  async _connected() {
    connectedInstances.add(this);
    this._adoptDeclarativeTable();
    this.table = this.querySelector("table");
    this._wrapScroll();
    this.btnFirst = this.querySelector(".dg-btn-first");
    this.btnPrev = this.querySelector(".dg-btn-prev");
    this.btnNext = this.querySelector(".dg-btn-next");
    this.btnLast = this.querySelector(".dg-btn-last");
    this.selectPerPage = this.querySelector(".dg-select-per-page");
    this.inputPage = this.querySelector(".dg-input-page");
    this.addEventListener("click", this);
    this.addEventListener("change", this);
    this.addEventListener("input", this);
    this.addEventListener("keydown", this);
    this.addEventListener("compositionstart", this);
    this.addEventListener("compositionend", this);
    this.selectPerPage?.toggleAttribute("hidden", !this.options.showPageSize);
    this.setupDataSource();
    this.setupInitialState();
    for (const plugin of Object.values(this.plugins)) {
      await plugin.connected?.();
    }
    this.dirChanged();
    this.populatePageSizes();
    this.updateLabels();
    this.renderSearch();
    await this.init();
  }
  _disconnected() {
    connectedInstances.delete(this);
    this._loadObserver?.disconnect();
    this._loadObserver = null;
    this._controller?.abort();
    for (const input of this.querySelectorAll("input")) {
      textInputState.get(input)?.apply.cancel();
      textInputState.delete(input);
    }
    this.removeEventListener("click", this);
    this.removeEventListener("change", this);
    this.removeEventListener("input", this);
    this.removeEventListener("keydown", this);
    this.removeEventListener("compositionstart", this);
    this.removeEventListener("compositionend", this);
    for (const plugin of Object.values(this.plugins)) {
      plugin.disconnected?.();
    }
  }
  handleEvent(event) {
    const target = event.target;
    if (!(target instanceof Element)) {
      return;
    }
    switch (event.type) {
      case "click":
        this._handleClick(event, target);
        break;
      case "change":
        this._handleChange(event, target);
        break;
      case "input":
        this._handleInput(target);
        break;
      case "keydown":
        this._handleKeydown(event, target);
        break;
      case "compositionstart":
        this._handleComposition(target, true);
        break;
      case "compositionend":
        this._handleComposition(target, false);
        break;
      default:
        super.handleEvent(event);
    }
  }
  _ownsControl(element) {
    return Boolean(element && element.closest("data-grid") === this);
  }
  _cancelTextInputs(root) {
    for (const input of root.querySelectorAll("input")) {
      textInputState.get(input)?.apply.cancel();
      textInputState.delete(input);
    }
  }
  _handleClick(event, target) {
    const pager = target.closest(".dg-btn-first, .dg-btn-prev, .dg-btn-next, .dg-btn-last");
    if (pager && this._ownsControl(pager)) {
      if (pager.classList.contains("dg-btn-first"))
        return this.getFirst();
      if (pager.classList.contains("dg-btn-prev"))
        return this.getPrev();
      if (pager.classList.contains("dg-btn-next"))
        return this.getNext();
      if (pager.classList.contains("dg-btn-last"))
        return this.getLast();
      return;
    }
    const sortButton = target.closest(".dg-sort");
    if (sortButton && this._ownsControl(sortButton)) {
      const th = sortButton.closest("th.dg-sortable");
      if (th) {
        return this.sortData(th);
      }
    }
  }
  _handleChange(event, target) {
    const pageSize = target.closest(".dg-select-per-page");
    if (this._ownsControl(pageSize)) {
      return this.changePerPage();
    }
    const page = target.closest(".dg-input-page");
    if (this._ownsControl(page)) {
      return this.gotoPage();
    }
    const filter = target.closest(this._filterSelector);
    if (filter && this._ownsControl(filter) && /select/i.test(filter.tagName)) {
      return this.filterData();
    }
  }
  _handleInput(target) {
    const search = target.closest(".dg-search");
    if (this._ownsControl(search)) {
      this._clearSelectionIfNeeded();
      const state = textInputState.get(search);
      if (state && !state.composing) {
        state.apply();
      }
      return;
    }
    const filter = target.closest(this._filterSelector);
    if (this._ownsControl(filter)) {
      const state = textInputState.get(filter);
      if (state && !state.composing) {
        state.apply();
      }
    }
  }
  _handleKeydown(event, target) {
    if (event.key === "Enter") {
      const page = target.closest(".dg-input-page");
      if (this._ownsControl(page)) {
        event.preventDefault();
        return this.gotoPage();
      }
      const state = textInputState.get(target);
      if (this._ownsControl(target) && state && !state.composing && !event.isComposing) {
        event.preventDefault();
        state.apply.flush();
        return;
      }
    }
    if (event.key === "Escape") {
      const input = target;
      const state = textInputState.get(input);
      if (this._ownsControl(target.closest(".dg-search")) && state && input.value) {
        input.value = "";
        state.apply.cancel();
        return this.commitSearch();
      }
      const filter = target.closest(this._filterSelector);
      if (this._ownsControl(filter) && state && input.value) {
        input.value = "";
        state.apply.cancel();
        return this.filterData();
      }
    }
  }
  _handleComposition(target, composing) {
    const input = target.closest(".dg-search, " + this._filterSelector);
    if (!input || !this._ownsControl(input)) {
      return;
    }
    const state = textInputState.get(input);
    if (!state) {
      return;
    }
    state.composing = composing;
    if (!composing) {
      state.apply();
    }
  }
  init() {
    if (this._deferInitialLoad()) {
      this.configureUi();
      this.classList.add("dg-initialized");
      this.fireEvents = true;
      this._lazyPending = true;
      this._observeInitialLoad();
      this.log("initialized (lazy)");
      return;
    }
    return this.load().finally(() => {
      this.configureUi();
      this.classList.add("dg-initialized");
      this.fireEvents = true;
      this.log("initialized");
    });
  }
  _deferInitialLoad() {
    return this.options.loading === "lazy" && !this._initialResult && (Boolean(this.options.src) || Boolean(this.options.dataSource));
  }
  _observeInitialLoad() {
    this._loadObserver = new IntersectionObserver((entries) => {
      if (!entries.some((entry) => entry.isIntersecting)) {
        return;
      }
      this._loadObserver?.disconnect();
      this._loadObserver = null;
      this._lazyPending = false;
      this.load().finally(() => this.configureUi());
    }, { rootMargin: "200px 0px" });
    this._loadObserver.observe(this);
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
      return !isColumnHidden(col);
    });
  }
  isColumnSortable(column) {
    return Boolean(this.options.sortable && column.sortable !== false);
  }
  isColumnFilterable(column) {
    return Boolean(this.options.filterable && column.filterable !== false);
  }
  hiddenColumns() {
    return this.options.columns.filter((col) => {
      return isColumnHidden(col);
    });
  }
  _syncColumnVisibility() {
    this._columns = this.buildColumns();
    for (const column of this.getColumns()) {
      const id = column.id ?? column.field;
      const hidden = isColumnHidden(column);
      for (const cell of findAll(this, `[data-column-id="${id}"]`)) {
        cell.toggleAttribute("hidden", hidden);
        cell.classList.toggle("dg-responsive-hidden", Boolean(column.responsiveHidden));
      }
    }
    this.renderFooter();
  }
  showColumn(field, render = true) {
    this.setColProp(field, "hidden", false);
    if (render)
      this._syncColumnVisibility();
    dispatch(this, "columnVisibility", {
      col: field,
      visibility: "visible"
    });
  }
  hideColumn(field, render = true) {
    this.setColProp(field, "hidden", true);
    if (render)
      this._syncColumnVisibility();
    dispatch(this, "columnVisibility", {
      col: field,
      visibility: "hidden"
    });
  }
  columnsLength(visibleOnly = false) {
    let len = 0;
    for (const col of this.getColumns()) {
      if (visibleOnly && isColumnHidden(col)) {
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
  findRowByKey(rowKey) {
    const wanted = String(rowKey);
    return this.rows.find((row) => this.resolveRowKey(row) === wanted);
  }
  updateRow(rowKey, patch) {
    const row = this.findRowByKey(rowKey);
    if (!row) {
      return false;
    }
    Object.assign(row, patch);
    this.renderBody();
    return true;
  }
  removeRow(rowKey) {
    const ds = this.dataSource;
    if (!ds || !Array.isArray(ds.rows)) {
      return false;
    }
    const wanted = String(rowKey);
    const index = ds.rows.findIndex((row) => this.resolveRowKey(row) === wanted);
    if (index === -1) {
      return false;
    }
    ds.rows.splice(index, 1);
    this.refresh();
    return true;
  }
  getActionsForRow(row) {
    if (row.$actions === undefined) {
      return this.options.actions;
    }
    const definitions = {};
    for (const [name, definition] of Object.entries(this.meta?.actions ?? {})) {
      definitions[name] = { name, ...definition };
    }
    for (const action of this.options.actions) {
      definitions[action.name] = { ...definitions[action.name], ...action };
    }
    const resolved = [];
    for (const item of row.$actions) {
      if (typeof item === "string") {
        const definition = definitions[item];
        if (definition) {
          resolved.push(definition);
        }
      } else if (item && typeof item === "object") {
        const base = definitions[item.name];
        resolved.push(base ? { ...base, ...item } : item);
      }
    }
    return resolved;
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
  _clearSelectionIfNeeded() {
    const selection = this._selection;
    if (selection.mode === "explicit" && selection.ids.size === 0) {
      return;
    }
    this.clearSelection();
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
      const trs = Array.from(tbody.querySelectorAll("tr.dg-data-row"));
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
  gotoPage() {
    if (!this.inputPage) {
      return;
    }
    const pages = this.totalPages();
    const page = Number.parseInt(this.inputPage.value);
    const clamped = Number.isFinite(page) ? Math.min(Math.max(1, page), pages) : this._query.page;
    if (clamped === this._query.page) {
      this.fixPage();
      return;
    }
    return this.setQuery({ page: clamped });
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
      const column = field ? this.getCol(field) : null;
      if (column && !this.isColumnSortable(column)) {
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
    if (direction !== "none") {
      const column = this.getCol(columnName);
      if (column && !this.isColumnSortable(column)) {
        this.log("sorting prevented because column is not sortable");
        return Promise.resolve();
      }
    }
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
  setSearch(search) {
    const value = typeof search === "string" ? search : `${search ?? ""}`;
    if (this.searchInput) {
      this.searchInput.value = value;
    }
    return this.setQuery({ search: value });
  }
  clearSearch() {
    if (this.searchInput) {
      this.searchInput.value = "";
    }
    return this.setQuery({ search: "" });
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
    td.colSpan = Math.max(1, this.columnsLength(true));
    tfoot.style.display = "";
  }
  createColumnHeaders(thead) {
    const availableWidth = this.scrollEl.clientWidth;
    const colMaxWidth = Math.round(availableWidth / this.columnsLength(true) * 2);
    const tr = ce("tr");
    this.headerRow = tr;
    tr.setAttribute("class", "dg-head-columns");
    const oldRow = thead?.querySelector("tr.dg-head-columns") ?? null;
    let sampleTh = oldRow?.querySelector("th") ?? null;
    this.log("createColumnHeaders - sampleTh", sampleTh);
    let seededSample = false;
    if (!sampleTh) {
      sampleTh = ce("th");
      if (oldRow) {
        oldRow.appendChild(sampleTh);
      } else {
        seededSample = true;
        tr.appendChild(sampleTh);
        thead?.appendChild(tr);
      }
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
      applyColumnDefinition(th, column);
      tr.appendChild(th);
      if (!isColumnHidden(column)) {
        totalWidth += Number.parseInt(th.getAttribute("width") ?? "") || 0;
      }
    }
    if (seededSample) {
      sampleTh.remove();
    }
    if (totalWidth < availableWidth) {
      const visibleCols = findAll(tr, "th:not([hidden],.dg-not-resizable)");
      if (visibleCols.length) {
        const lastCol = visibleCols[visibleCols.length - 1];
        removeAttribute(lastCol, "width");
      }
    }
    if (thead && oldRow) {
      thead.replaceChild(tr, oldRow);
    }
    if (thead && thead.offsetWidth > availableWidth) {
      this.log(`adjust width to fix size, ${thead.offsetWidth} > ${availableWidth}`);
      const scrollbarWidth = this.scrollEl.offsetWidth - this.scrollEl.clientWidth;
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
  }
  renderDefaultHeaderCell(th, ctx) {
    const { column, sampleTh } = ctx;
    const sortable = this.isColumnSortable(column);
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
    th.dataset.preferredWidth = `${w}`;
    if (isColumnHidden(column)) {
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
      const label = ce("span");
      label.classList.add("dg-sort-label");
      label.textContent = column.title ?? "";
      const indicator = ce("span");
      indicator.classList.add("dg-sort-indicator");
      indicator.setAttribute("aria-hidden", "true");
      button.append(label, indicator);
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
      if (this.isColumnFilterable(column)) {
        th.classList.add("dg-filter-cell");
        const ctx = { grid: this, column };
        if (column.renderFilterCell) {
          column.renderFilterCell(th, ctx);
        } else {
          this.renderDefaultFilterCell(th, column, relatedTh);
        }
      }
      if (isColumnHidden(column)) {
        th.setAttribute("hidden", "");
      }
      tr.appendChild(th);
      idx++;
    }
    const oldRow = thead?.querySelector("tr.dg-head-filters");
    if (oldRow) {
      this._cancelTextInputs(oldRow);
    }
    if (thead && oldRow) {
      thead.replaceChild(tr, oldRow);
    } else if (thead && !tr.parentNode) {
      thead.appendChild(tr);
    }
    const filteredRows = findAll(tr, this._filterSelector);
    for (const el of filteredRows) {
      if (/select/i.test(el.tagName)) {
        continue;
      }
      const input = el;
      textInputState.set(input, {
        composing: false,
        apply: debounce(() => this.filterData(), this.options.filterDelay)
      });
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
    filter.classList.add("dg-filter-control");
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
      input.placeholder = column.filterPlaceholder ?? "";
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
      tr.classList.add("dg-data-row");
      tr.dataset.rowIndex = String(i);
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
    tbody.setAttribute("data-empty-message", message);
    if (prev) {
      this.table?.replaceChild(tbody, prev);
    } else {
      this.table?.appendChild(tbody);
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
    this.updatePageStatus();
    tfoot.toggleAttribute("hidden", this.options.autohidePager && this._query.pageSize > this.total);
  }
  totalPages() {
    return Math.max(1, Math.ceil(this.total / (this._query.pageSize || 1)));
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
    this.updatePageStatus();
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
    const headers = findAll(this.grid, 'thead tr.dg-head-columns th[data-column-id]:not([data-column-id^="$"])');
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
      width: 40,
      sortable: false,
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
    const trs = Array.from(tbody.querySelectorAll("tr.dg-data-row"));
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
    label.classList.add("dg-clickable-cell");
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
    input.setAttribute("aria-label", grid.formatLabel(grid.labels.selectRow, { row: grid.getRowLabel(row ?? {}, rowIndex ?? 0) }));
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
  bar = null;
  countEl = null;
  countVisible = null;
  countStatus = null;
  buttons = null;
  connected() {
    const grid = this.grid;
    const bulkActions = grid.options.bulkActions ?? [];
    if (!bulkActions.length) {
      return;
    }
    const bar = document.createElement("div");
    bar.className = "dg-bulk-actions";
    this.bar = bar;
    this.countEl = document.createElement("span");
    this.countEl.className = "dg-selection-count";
    this.countEl.setAttribute("role", "status");
    this.countEl.setAttribute("aria-live", "polite");
    this.countEl.setAttribute("aria-atomic", "true");
    this.countEl.hidden = true;
    this.countVisible = document.createElement("span");
    this.countVisible.setAttribute("aria-hidden", "true");
    this.countStatus = document.createElement("span");
    this.countStatus.className = "dg-visually-hidden";
    this.countEl.append(this.countVisible, this.countStatus);
    bar.appendChild(this.countEl);
    this.buttons = bulkActions.map((action) => {
      const button = document.createElement("button");
      button.type = "button";
      button.dataset.action = action.name;
      if (action.intent) {
        button.dataset.intent = action.intent;
      }
      button.textContent = action.label ?? action.name;
      button.addEventListener("click", (event) => {
        event.stopPropagation();
        if (button.disabled) {
          return;
        }
        const selection = grid.getSelectionState();
        let mustConfirm = Boolean(action.confirm);
        let message = grid.labels.areYouSure;
        if (typeof action.confirm === "string") {
          message = action.confirm;
        } else if (typeof action.confirm === "function") {
          const result = action.confirm(selection, { grid, action });
          if (typeof result === "string") {
            message = result;
          } else if (result === false) {
            mustConfirm = false;
          }
        }
        if (mustConfirm && !window.confirm(message)) {
          return;
        }
        dispatch(grid, "bulkAction", {
          action,
          name: action.name,
          selection,
          query: grid.query,
          trigger: button
        });
      });
      bar.appendChild(button);
      return button;
    });
    const table = grid.querySelector("table");
    if (table) {
      grid.ensureTopbar().querySelector(".dg-topbar-start")?.appendChild(bar);
    } else {
      grid.appendChild(bar);
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
    if (!this.bar || !this.countEl || !this.buttons?.length) {
      return;
    }
    const grid = this.grid;
    const selection = grid.getSelectionState();
    const count = selection.mode === "all" ? Math.max(0, grid.total - selection.except.size) : selection.ids.size;
    this.countEl.hidden = count === 0;
    if (this.countVisible && this.countStatus) {
      this.countVisible.textContent = `${count}`;
      this.countStatus.textContent = grid.formatLabel(grid.labels.selectedCount, { count });
    }
    for (const button of this.buttons) {
      button.disabled = count === 0;
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
    const visibleRows = grid.querySelectorAll("tbody tr.dg-data-row:not([hidden])").length;
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
var RESPONSIVE_TOGGLE_WIDTH = 40;
var RESTORE_HYSTERESIS = 8;
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
    this.unblockTimeout = null;
    this._lastEntry = null;
    this._lastProcessedWidth = null;
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
    if (this.unblockTimeout) {
      clearTimeout(this.unblockTimeout);
    }
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
    this._observed = this.grid.scrollEl || this.grid;
    this.observer.observe(this._observed);
  }
  unobserve() {
    if (this._observed) {
      this.observer.unobserve(this._observed);
      this._observed = null;
    }
  }
  extendColumns(columns) {
    if (!this.grid.options.responsive || !this.grid.options.responsiveToggle) {
      return;
    }
    columns.unshift({
      id: "$responsive",
      virtual: true,
      position: "start",
      width: 40,
      sortable: false,
      title: "",
      class: `${RESPONSIVE_CLASS}-toggle`,
      hidden: !this.hasHiddenColumns(),
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
      const entry = this._lastEntry;
      if (entry) {
        const contentBoxSize = Array.isArray(entry.contentBoxSize) ? entry.contentBoxSize[0] : entry.contentBoxSize;
        const size = Math.round(contentBoxSize.inlineSize);
        if (size !== this._lastProcessedWidth) {
          this.resize();
        }
      }
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
    if (size === this._lastProcessedWidth) {
      return;
    }
    this._lastProcessedWidth = size;
    const preferredWidth = (th) => {
      return Number.parseInt(th.dataset.preferredWidth ?? "") || Number.parseInt(th.getAttribute("width") ?? "") || Number.parseInt(th.dataset.minWidth ?? "") || Number.parseInt(getComputedStyle(th).minWidth || "") || 0;
    };
    const items = sortByPriority(findAll(headerRow, "th[field]").reverse().filter((th) => {
      const column = grid.getCol(th.getAttribute("field") ?? "");
      return column && this._isEssential(column) === false;
    })).map((th) => {
      return {
        th,
        column: grid.getCol(th.getAttribute("field") ?? "")
      };
    });
    const isColumnHidden2 = (column) => {
      return Boolean(column && (column.hidden || column.responsiveHidden));
    };
    const fixedWidth = findAll(headerRow, "th:not([field])").filter((th) => {
      return !th.classList.contains(`${RESPONSIVE_CLASS}-toggle`);
    }).reduce((result, th) => {
      return result + preferredWidth(th);
    }, 0);
    const requiredWidth = (visibleItems) => {
      let total = fixedWidth;
      if (grid.options.responsiveToggle && items.some(({ column }) => column?.responsiveHidden)) {
        total += RESPONSIVE_TOGGLE_WIDTH;
      }
      for (const { th } of visibleItems) {
        total += preferredWidth(th);
      }
      return total;
    };
    let visible = findAll(headerRow, "th[field]").map((th) => {
      return {
        th,
        column: grid.getCol(th.getAttribute("field") ?? "")
      };
    }).filter(({ column }) => !isColumnHidden2(column));
    let changed = false;
    if (requiredWidth(visible) > size) {
      for (const item of items) {
        if (requiredWidth(visible) <= size) {
          break;
        }
        if (visible.length <= 1) {
          break;
        }
        const { column } = item;
        if (!column?.field || isColumnHidden2(column)) {
          continue;
        }
        grid.setColProp(column.field, "responsiveHidden", true);
        visible = visible.filter((c) => c.th !== item.th);
        changed = true;
      }
    } else {
      const restorable = items.filter(({ column }) => column?.responsiveHidden).reverse();
      for (const { th, column } of restorable) {
        if (!column?.field) {
          continue;
        }
        const width = preferredWidth(th);
        if (requiredWidth(visible) + width > size - RESTORE_HYSTERESIS) {
          break;
        }
        grid.setColProp(column.field, "responsiveHidden", false);
        visible = [...visible, { th, column }];
        changed = true;
      }
    }
    if (changed) {
      this.blockObserver();
      this._rebuildDetails();
      this.unblockObserver();
    }
    const footer = find(table, "tfoot");
    if (footer) {
      const realFooterWidth = findAll(footer, ".dg-footer > div").reduce((result, div) => {
        return result + div.offsetWidth;
      }, 0);
      const availableFooterWidth = footer.offsetWidth - realFooterWidth;
      if (realFooterWidth > size) {
        addClass(footer, "dg-footer-compact");
      } else if (availableFooterWidth > 250) {
        removeClass(footer, "dg-footer-compact");
      }
    }
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
  _dataRows() {
    return Array.from(this.grid.querySelectorAll("tbody > tr.dg-data-row"));
  }
  _isEssential(column) {
    if (!column?.field) {
      return false;
    }
    if (column.responsive === 0 || column.hidden) {
      return true;
    }
    if (this.grid.getColumnSortDirection(column.field)) {
      return true;
    }
    if (this.grid._query?.filters?.[column.field]) {
      return true;
    }
    return false;
  }
  _canonicalizeRow(tr) {
    for (const column of this.grid.getColumns()) {
      if (column.attr) {
        continue;
      }
      const id = column.id ?? column.field;
      const td = tr.querySelector(`:scope > td[data-column-id="${id}"]`);
      if (td) {
        tr.appendChild(td);
      }
    }
  }
  _setToggleIcon(tr, expanded) {
    const open = find(tr, `.${RESPONSIVE_CLASS}-open`);
    const close = find(tr, `.${RESPONSIVE_CLASS}-close`);
    if (!open || !close) {
      return;
    }
    open.style.display = expanded ? "none" : "unset";
    close.style.display = expanded ? "unset" : "none";
  }
  _setRowExpanded(tr, expanded) {
    tr.dataset.responsiveExpanded = String(expanded);
    const childRow = tr.nextElementSibling;
    const hasChildRow = childRow?.classList.contains(`${RESPONSIVE_CLASS}-child-row`);
    if (expanded) {
      if (hasChildRow) {
        return;
      }
      const hiddenCols = findAll(tr, `.${RESPONSIVE_CLASS}-hidden`);
      if (!hiddenCols.length) {
        return;
      }
      this._canonicalizeRow(tr);
      addClass(tr, `${RESPONSIVE_CLASS}-expanded`);
      const detailRow = ce("tr");
      insertAfter(detailRow, tr);
      addClass(detailRow, `${RESPONSIVE_CLASS}-child-row`);
      const detailTd = ce("td", detailRow);
      setAttribute(detailTd, "colspan", this.grid.columnsLength(true));
      const childTable = ce("table", detailTd);
      addClass(childTable, `${RESPONSIVE_CLASS}-table`);
      const idealWidth = this.computeLabelWidth();
      for (const col of findAll(tr, `.${RESPONSIVE_CLASS}-hidden`)) {
        const childTableRow = ce("tr", childTable);
        const labelCol = ce("th", childTableRow);
        labelCol.style.width = `${idealWidth}px`;
        labelCol.innerHTML = col.dataset.name ?? "";
        childTableRow.appendChild(col);
        removeAttribute(col, "hidden");
      }
      this._setToggleIcon(tr, true);
      return;
    }
    if (childRow && hasChildRow) {
      for (const col of findAll(childRow, `.${RESPONSIVE_CLASS}-hidden`)) {
        tr.appendChild(col);
        setAttribute(col, "hidden");
      }
      childRow.remove();
      this._canonicalizeRow(tr);
    }
    removeClass(tr, `${RESPONSIVE_CLASS}-expanded`);
    this._setToggleIcon(tr, false);
  }
  _restoreDetails() {
    for (const childRow of findAll(this.grid, `tbody tr.${RESPONSIVE_CLASS}-child-row`)) {
      const tr = childRow.previousElementSibling;
      if (tr) {
        for (const col of findAll(childRow, `.${RESPONSIVE_CLASS}-hidden`)) {
          tr.appendChild(col);
          setAttribute(col, "hidden");
        }
        this._canonicalizeRow(tr);
        removeClass(tr, `${RESPONSIVE_CLASS}-expanded`);
      }
      childRow.remove();
    }
  }
  _rebuildDetails() {
    this._restoreDetails();
    this.grid._syncColumnVisibility();
    if (!this.hasHiddenColumns()) {
      return;
    }
    this._seedRows();
  }
  _seedRows() {
    for (const tr of this._dataRows()) {
      let expanded = tr.dataset.responsiveExpanded;
      if (expanded === undefined) {
        expanded = String(this.grid.options.responsiveStartOpen);
        tr.dataset.responsiveExpanded = expanded;
      }
      if (expanded === "true") {
        this._setRowExpanded(tr, true);
      }
    }
  }
  afterRender(context) {
    if (context !== "body") {
      return;
    }
    if (!this.grid.options.responsiveStartOpen || !this.hasHiddenColumns()) {
      return;
    }
    this._seedRows();
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
    this._setRowExpanded(tr, tr.dataset.responsiveExpanded !== "true");
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
    const grid = this.grid;
    return grid.options.actions.length > 0 || grid.options.rowActions;
  }
  extendColumns(columns) {
    if (!this.hasActions()) {
      return;
    }
    columns.push({
      id: "$actions",
      virtual: true,
      position: "end",
      sortable: false,
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
  afterRender(context) {
    if (context === "table") {
      this.closeActionMenu();
    } else if (context === "body") {
      this.syncCellModes();
    }
  }
  syncCellModes() {
    const grid = this.grid;
    const cells = findAll(grid, 'tbody td[data-column-id="$actions"]');
    for (const cell of cells) {
      const count = cell.querySelectorAll("[data-action]").length;
      cell.classList.remove("dg-actions-0", "dg-actions-1", "dg-actions-2", "dg-actions-more");
      if (count === 0) {
        cell.classList.add("dg-actions-more");
      } else if (!grid.options.collapseActions && count <= 2) {
        cell.classList.add(`dg-actions-${count}`);
      } else {
        cell.classList.add("dg-actions-more");
      }
    }
  }
  toggleActionMenu(cell, row) {
    if (this.openCell === cell) {
      this.closeActionMenu();
      return;
    }
    this.openActionMenu(cell, row);
  }
  openActionMenu(cell, row) {
    const grid = this.grid;
    const labels2 = grid.labels;
    const rowIndex = grid.rows.indexOf(row);
    if (!this.menu) {
      this.menu = document.createElement("ul");
      this.menu.classList.add("dg-actions-menu");
      grid.appendChild(this.menu);
      this.menu.addEventListener("click", () => this.closeActionMenu(), true);
    }
    const menu = this.menu;
    while (menu.lastChild) {
      menu.removeChild(menu.lastChild);
    }
    for (const action of grid.getActionsForRow(row)) {
      const rowKey = grid.resolveRowKey(row, rowIndex);
      if (action.visible && !action.visible(row, { grid, action, rowKey })) {
        continue;
      }
      const li = document.createElement("li");
      const { el } = this.createActionElement(action, row, rowIndex, grid, labels2, true);
      li.appendChild(el);
      menu.appendChild(li);
    }
    if (!menu.lastChild) {
      return;
    }
    this.openCell = cell;
    cell.querySelector(".dg-actions-toggle")?.setAttribute("aria-expanded", "true");
    menu.classList.add("dg-actions-open");
    this.positionActionMenu(cell);
    this._boundDocumentClick = (ev) => {
      if (!menu.contains(ev.target)) {
        this.closeActionMenu();
      }
    };
    on(document, "click", this._boundDocumentClick);
    this._boundKeydown = (ev) => {
      if (ev.key === "Escape") {
        this.closeActionMenu();
      }
    };
    on(document, "keydown", this._boundKeydown);
  }
  positionActionMenu(cell) {
    const menu = this.menu;
    const grid = this.grid;
    if (!menu) {
      return;
    }
    const gridRect = grid.getBoundingClientRect();
    const cellRect = cell.getBoundingClientRect();
    const menuHeight = menu.offsetHeight;
    const menuWidth = menu.offsetWidth;
    let top = cellRect.bottom - gridRect.top;
    if (top + menuHeight > gridRect.height) {
      top = cellRect.top - gridRect.top - menuHeight;
    }
    menu.style.top = `${Math.max(0, top)}px`;
    let right = gridRect.right - cellRect.right;
    if (right + menuWidth > gridRect.width) {
      right = gridRect.width - menuWidth;
    }
    menu.style.right = `${Math.max(0, right)}px`;
    menu.style.left = "auto";
  }
  closeActionMenu() {
    if (this._boundDocumentClick) {
      off(document, "click", this._boundDocumentClick);
      this._boundDocumentClick = null;
    }
    if (this._boundKeydown) {
      off(document, "keydown", this._boundKeydown);
      this._boundKeydown = null;
    }
    if (this.openCell) {
      this.openCell.querySelector(".dg-actions-toggle")?.setAttribute("aria-expanded", "false");
    }
    this.openCell = null;
    this.menu?.classList.remove("dg-actions-open");
  }
  makeActionRow({ row, tr, grid, rowIndex }) {
    const labels2 = grid.labels;
    const rowData = row ?? {};
    const actions = grid.getActionsForRow(rowData);
    const fragment = document.createDocumentFragment();
    if (!actions.length) {
      return fragment;
    }
    const actionsToggle = document.createElement("button");
    actionsToggle.type = "button";
    actionsToggle.classList.add("dg-actions-toggle");
    actionsToggle.textContent = "⋯";
    actionsToggle.setAttribute("aria-label", labels2.toggleActions);
    actionsToggle.setAttribute("aria-expanded", "false");
    actionsToggle.title = labels2.toggleActions;
    on(actionsToggle, "click", (ev) => {
      ev.stopPropagation();
      const cell = actionsToggle.closest("td") ?? actionsToggle.parentElement;
      if (cell) {
        this.toggleActionMenu(cell, rowData);
      }
    });
    fragment.appendChild(actionsToggle);
    let defaultApplied = false;
    for (const action of actions) {
      const rowKey = grid.resolveRowKey(rowData, rowIndex ?? 0);
      if (action.visible && !action.visible(rowData, { grid, action, rowKey })) {
        continue;
      }
      const { el, dispatchAction } = this.createActionElement(action, rowData, rowIndex ?? 0, grid, labels2);
      fragment.appendChild(el);
      if (action.default) {
        if (defaultApplied) {
          grid.log(`multiple default actions for row ${rowKey}, using the first one`);
        } else if (tr) {
          defaultApplied = true;
          tr.classList.add("dg-actionable");
          on(tr, "click", (ev) => {
            const target = ev.target;
            if (target.closest(grid._excludedRowElementSelector)) {
              return;
            }
            dispatchAction(ev);
          });
        }
      }
    }
    return fragment;
  }
  createActionElement(action, row, rowIndex, grid, labels2, menu = false) {
    const rowKey = grid.resolveRowKey(row, rowIndex);
    const ctx = { grid, action, rowKey };
    const href = action.href ? typeof action.href === "function" ? action.href(row, ctx) : interpolate(action.href, row) : null;
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
        if (menu) {
          const label = document.createElement("span");
          label.className = "dg-action-label";
          label.textContent = action.label ?? action.name;
          el.append(label);
        } else if (content instanceof Node || typeof content === "object" && content.html !== undefined) {
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
    const isDisabled = typeof action.disabled === "function" ? action.disabled(row, ctx) : Boolean(action.disabled);
    if (isDisabled) {
      if (el.tagName === "BUTTON") {
        el.disabled = true;
      }
      el.setAttribute("aria-disabled", "true");
      el.classList.add("dg-disabled");
    }
    let mustConfirm = Boolean(action.confirm);
    let message = labels2.areYouSure;
    if (typeof action.confirm === "string") {
      message = action.confirm;
    } else if (typeof action.confirm === "function") {
      const result = action.confirm(row, ctx);
      if (typeof result === "string") {
        message = result;
      } else if (result === false) {
        mustConfirm = false;
      }
    }
    const dispatchAction = (ev) => {
      ev.stopPropagation();
      if (isDisabled) {
        ev.preventDefault();
        return;
      }
      if (mustConfirm && !window.confirm(message)) {
        ev.preventDefault();
        return;
      }
      dispatch(grid, "action", {
        action,
        name: action.name,
        row,
        rowKey,
        rowIndex,
        trigger: el
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
    const { actions, collapseActions, rowActions } = this.grid.options;
    if (rowActions && actions.length === 0) {
      return "dg-actions-more";
    }
    if (actions.length < 3 && !collapseActions) {
      return `dg-actions-${actions.length}`;
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
