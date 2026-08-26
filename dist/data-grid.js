/*** Data Grid Web Component * https://github.com/lekoala/data-grid ***/
// src/utils/camelize.js
function camelize(str) {
  return str.toLowerCase().replace(/[^a-zA-Z0-9]+(.)/g, (m, chr) => chr.toUpperCase());
}

// src/utils/dispatch.js
function dispatch(target, type, detail = {}, options = {}) {
  return target.dispatchEvent(new CustomEvent(type, { ...options, detail }));
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
      console.log(`[${this.getAttribute("id")}] `, ...data);
    }
  }
  handleEvent(event) {
    const handler = this[`on${event.type}`];
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
    const options = this.options;
    const transformer = this.transformAttributes[attributeName] ?? normalizeData;
    const attr = camelize(attributeName);
    const raw = newValue === "" ? "true" : newValue;
    options[attr] = transformer(raw);
    if (this.fireEvents) {
      const handler = this[`${attr}Changed`];
      if (typeof handler === "function") {
        handler.call(this);
      }
    }
  }
}
var base_element_default = BaseElement;

// src/utils/formatValue.js
var formatDefaults = {
  boolean: {
    align: "center",
    minWidth: 48,
    width: 56,
    filter: "boolean"
  },
  date: {
    minWidth: 104,
    width: 120,
    filter: "date"
  },
  datetime: {
    minWidth: 152,
    width: 168
  },
  number: {
    align: "end",
    filter: "number"
  }
};
var ISO_DATE = /^\d{4}-\d{2}-\d{2}$/;
var ISO_DATETIME = /^\d{4}-\d{2}-\d{2}T.+(?:Z|[+-]\d{2}:\d{2})$/i;
var DATE_FORBIDDEN_OPTIONS = [
  "timeStyle",
  "hour",
  "minute",
  "second",
  "fractionalSecondDigits",
  "dayPeriod",
  "timeZone"
];
var DATETIME_COMPONENT_KEYS = [
  "weekday",
  "era",
  "year",
  "month",
  "day",
  "dayPeriod",
  "hour",
  "minute",
  "second",
  "fractionalSecondDigits",
  "timeZoneName"
];
function resolveLocale(grid) {
  return grid?.closest("[lang]")?.getAttribute("lang") || grid?.ownerDocument?.documentElement.lang || undefined;
}
function toLocalISODate(date) {
  const year = date.getFullYear();
  const month = `${date.getMonth() + 1}`.padStart(2, "0");
  const day = `${date.getDate()}`.padStart(2, "0");
  return `${year}-${month}-${day}`;
}
function normalizeBoolean(value) {
  if (value === true || value === "true" || value === 1 || value === "1") {
    return true;
  }
  if (value === false || value === "false" || value === 0 || value === "0") {
    return false;
  }
  return null;
}
function formatBoolean(value, ctx) {
  const bool = normalizeBoolean(value);
  if (bool === null) {
    return "";
  }
  const grid = ctx.grid;
  const labels = grid?.labels;
  const doc = grid?.ownerDocument ?? document;
  const span = doc.createElement("span");
  span.className = "dg-boolean";
  span.dataset.value = bool ? "true" : "false";
  span.setAttribute("role", "img");
  span.setAttribute("aria-label", bool ? labels?.booleanTrue ?? "Yes" : labels?.booleanFalse ?? "No");
  return span;
}
function resolveDateTimeOptions(format, formatOptions = {}) {
  const { style, ...options } = formatOptions;
  if (format === "date") {
    for (const key of DATE_FORBIDDEN_OPTIONS) {
      if (options[key] !== undefined) {
        throw new TypeError(`The "${format}" formatter does not accept time or timeZone options`);
      }
    }
  }
  const hasGranular = DATETIME_COMPONENT_KEYS.some((key) => options[key] !== undefined);
  if (!hasGranular) {
    if (options.dateStyle === undefined) {
      options.dateStyle = style ?? "short";
    }
    if (format === "datetime" && options.timeStyle === undefined) {
      options.timeStyle = style ?? "short";
    }
  }
  return options;
}
function parseDateValue(value, format) {
  if (value instanceof Date) {
    if (Number.isNaN(value.getTime())) {
      return null;
    }
    return {
      date: value,
      datetimeAttr: format === "datetime" ? value.toISOString() : toLocalISODate(value)
    };
  }
  if (typeof value === "number" && Number.isFinite(value)) {
    const date = new Date(value);
    return {
      date,
      datetimeAttr: format === "datetime" ? date.toISOString() : toLocalISODate(date)
    };
  }
  if (typeof value === "string") {
    if (format === "date") {
      if (!ISO_DATE.test(value)) {
        return null;
      }
      const [year, month, day] = value.split("-").map(Number);
      const date2 = new Date(year, month - 1, day);
      if (date2.getFullYear() !== year || date2.getMonth() !== month - 1 || date2.getDate() !== day) {
        return null;
      }
      return { date: date2, datetimeAttr: value };
    }
    if (!ISO_DATETIME.test(value)) {
      return null;
    }
    const date = new Date(value);
    if (Number.isNaN(date.getTime())) {
      return null;
    }
    return { date, datetimeAttr: date.toISOString() };
  }
  return null;
}
function formatDate(value, format, formatOptions, ctx = {}) {
  const parsed = parseDateValue(value, format);
  if (!parsed) {
    return "";
  }
  const options = resolveDateTimeOptions(format, formatOptions);
  const doc = ctx.grid?.ownerDocument ?? document;
  const time = doc.createElement("time");
  time.dateTime = parsed.datetimeAttr;
  time.textContent = new Intl.DateTimeFormat(resolveLocale(ctx.grid), options).format(parsed.date);
  return time;
}
function formatNumber(value, formatOptions = {}, ctx = {}) {
  if (value === null || value === undefined) {
    return "";
  }
  if (typeof value === "string" && value.trim() === "") {
    return "";
  }
  const number = Number(value);
  if (!Number.isFinite(number)) {
    return "";
  }
  const options = { ...formatOptions };
  if (!options.style && options.currency && options.unit) {
    throw new TypeError("currency and unit cannot both infer number style");
  }
  if (options.style === undefined && options.currency) {
    options.style = "currency";
  }
  if (options.style === undefined && options.unit) {
    options.style = "unit";
  }
  return new Intl.NumberFormat(resolveLocale(ctx.grid), options).format(number);
}
function getFormatDefaults(format, formatOptions) {
  if (format === null || format === undefined) {
    return null;
  }
  if (format === "number" && formatOptions?.style === "percent") {
    return { align: "end", minWidth: 72, width: 88, filter: "number" };
  }
  return formatDefaults[format] || null;
}
function formatValue(value, format, formatOptions, ctx = {}) {
  switch (format) {
    case "boolean":
      return formatBoolean(value, ctx);
    case "date":
    case "datetime":
      return formatDate(value, format, formatOptions, ctx);
    case "number":
      return formatNumber(value, formatOptions, ctx);
    default:
      return value;
  }
}

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
        case "neq": {
          let equal;
          if (typeof value === "boolean") {
            const cellBool = normalizeBoolean(cell);
            equal = cellBool === null ? `${cell}` === String(value) : cellBool === value;
          } else {
            equal = `${cell}` === String(value);
          }
          if (operator === "eq" ? !equal : equal)
            return false;
          break;
        }
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
          if (!Array.isArray(value) || !value.length) {
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

// src/utils/applyContent.js
function applyContent(el, content) {
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

// src/utils/attributes.js
function parseBooleanAttribute(value) {
  return value === "" || value === "true" || value === "1";
}
function parseIntegerListAttribute(value) {
  return value.split(",").map((item) => Number.parseInt(item, 10)).filter((item) => Number.isFinite(item));
}
function parseEnumAttribute(value, allowed, fallback) {
  return allowed.includes(value) ? value : fallback;
}

// src/utils/debounce.js
function debounce(handler, timeout = 300) {
  let timer = null;
  let lastArgs = null;
  const fn = (...args) => {
    lastArgs = args;
    if (timer !== null) {
      clearTimeout(timer);
    }
    timer = setTimeout(() => {
      timer = null;
      lastArgs = null;
      handler(...args);
    }, timeout);
  };
  fn.cancel = () => {
    if (timer !== null) {
      clearTimeout(timer);
      timer = null;
    }
    lastArgs = null;
  };
  fn.flush = () => {
    if (timer === null) {
      return;
    }
    clearTimeout(timer);
    timer = null;
    const args = lastArgs ?? [];
    lastArgs = null;
    handler(...args);
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

// src/utils/multiSelectFilter.js
function checkboxes(root) {
  return root.querySelectorAll(".dg-multiselect-panel input[data-value]");
}
function summarize(labels) {
  if (labels.length <= 2) {
    return labels.join(", ");
  }
  return `${labels.slice(0, 2).join(", ")} +${labels.length - 2}`;
}
function updateMultiSelectSummary(root) {
  const summary = root.querySelector(".dg-multiselect-summary");
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
function createMultiSelect(column, options, relatedTh) {
  const doc = relatedTh.ownerDocument;
  const root = doc.createElement("div");
  root.className = "dg-multiselect dg-filter-control";
  root.id = randstr("dg-filter-");
  root.dataset.name = column.field ?? "";
  root.dataset.filterMode = "multi";
  root.dataset.emptyText = column.firstFilterOption?.text || column.filterPlaceholder || "";
  const trigger = doc.createElement("button");
  trigger.type = "button";
  trigger.className = "dg-multiselect-trigger";
  const panelId = randstr("dg-multiselect-");
  trigger.setAttribute("popovertarget", panelId);
  trigger.setAttribute("aria-controls", panelId);
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
  panel.popover = "auto";
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
function readMultiSelect(root) {
  const values = [];
  for (const box of checkboxes(root)) {
    if (box.checked) {
      values.push(`${box.dataset.value}`);
    }
  }
  return values;
}
function setMultiSelectValues(root, values) {
  const selected = (values ?? []).map((v) => `${v}`);
  for (const box of checkboxes(root)) {
    box.checked = selected.includes(`${box.dataset.value}`);
  }
  updateMultiSelectSummary(root);
}
function clearMultiSelect(root) {
  for (const box of checkboxes(root)) {
    box.checked = false;
  }
  updateMultiSelectSummary(root);
}

// src/utils/popover.js
function supportsPopoverAnchor() {
  return "popover" in HTMLElement.prototype && typeof CSS !== "undefined" && typeof CSS.supports === "function" && CSS.supports("position-area", "block-end span-inline-start") && CSS.supports("top", "anchor(bottom)") && CSS.supports("min-width", "anchor-size(width)") && CSS.supports("position-try-fallbacks", "flip-block flip-inline");
}

// src/utils/spanningRow.js
function createSpanningRow(grid, { id, className } = {}) {
  const row = document.createElement("tr");
  if (id) {
    row.id = id;
  }
  if (className) {
    row.className = className;
  }
  const cell = document.createElement("td");
  cell.dataset.dgSpanColumns = "";
  cell.colSpan = Math.max(1, grid.columnsLength(true));
  row.appendChild(cell);
  return { row, cell };
}

// src/utils/transformValue.js
var transforms = {
  uppercase: (value) => String(value).toUpperCase(),
  lowercase: (value) => String(value).toLowerCase(),
  array: (value) => Array.isArray(value) ? value.join(", ") : value
};
function transformValue(value, transform, ctx) {
  if (typeof transform === "function") {
    return transform(value, ctx);
  }
  if (typeof transform === "string" && transforms[transform]) {
    return transforms[transform](value, ctx);
  }
  return value;
}

// src/data-grid.js
var DECLARATIVE_CELLS = Symbol("dgDeclarativeCells");
function declarativeCells(row) {
  return row[DECLARATIVE_CELLS];
}
function setDeclarativeCell(row, field, meta) {
  let cells = declarativeCells(row);
  if (!cells) {
    cells = {};
    Object.defineProperty(row, DECLARATIVE_CELLS, {
      value: cells,
      enumerable: false,
      configurable: true
    });
  }
  cells[field] = meta;
}
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
  showDetails: "Show details for {row}",
  hideDetails: "Hide details for {row}",
  showHiddenColumns: "Show additional columns for {row}",
  hideHiddenColumns: "Hide additional columns for {row}",
  resizeColumn: "Resize column",
  search: "Search",
  noData: "No data",
  loading: "Loading…",
  areYouSure: "Are you sure?",
  networkError: "Network response error",
  booleanTrue: "Yes",
  booleanFalse: "No"
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
      const hasValue = value !== undefined && value !== null && value !== "" && !(Array.isArray(value) && value.length === 0);
      if (hasValue || operator === "empty" || operator === "notEmpty") {
        filters[key] = hasValue ? { operator, value } : { operator };
      }
    }
  }
  return { page: Math.max(1, page), pageSize: Math.max(1, pageSize), search, sort, filters };
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
      column.sortable = parseBooleanAttribute(th.dataset.sortable);
    }
    if (th.dataset.filterable !== undefined) {
      column.filterable = parseBooleanAttribute(th.dataset.filterable);
    }
    if (th.dataset.wrap !== undefined) {
      column.wrap = parseBooleanAttribute(th.dataset.wrap);
    }
    if (th.dataset.filter) {
      const mode = th.dataset.filter;
      if (["text", "select", "boolean", "number", "date"].includes(mode)) {
        column.filterType = mode;
      }
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
    if (th.dataset.frozen === "start") {
      column.frozen = "start";
    }
    if (th.dataset.hidden !== undefined) {
      column.hidden = parseBooleanAttribute(th.dataset.hidden);
    }
    if (th.dataset.editable !== undefined) {
      column.editable = parseBooleanAttribute(th.dataset.editable);
    }
    if (th.dataset.editableType) {
      column.editableType = th.dataset.editableType;
    }
    if (th.dataset.transform) {
      column.transform = th.dataset.transform;
    }
    if (th.dataset.format) {
      column.format = th.dataset.format;
    }
    if (th.dataset.align) {
      if (["start", "center", "end"].includes(th.dataset.align)) {
        column.align = th.dataset.align;
      }
    }
    if (th.dataset.width !== undefined) {
      const width = Number(th.dataset.width);
      if (Number.isFinite(width)) {
        column.width = width;
      }
    }
    if (th.dataset.minWidth !== undefined) {
      const minWidth = Number(th.dataset.minWidth);
      if (Number.isFinite(minWidth)) {
        column.minWidth = minWidth;
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
      action.default = parseBooleanAttribute(el.dataset.default);
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
    for (let index = 0;index < columns.length; index++) {
      const column = columns[index];
      if (!column.field) {
        continue;
      }
      const td = tds[index];
      if (!td) {
        continue;
      }
      const raw = td.dataset.value;
      if (raw !== undefined) {
        row[column.field] = normalizeData(raw);
        setDeclarativeCell(row, column.field, {
          value: row[column.field],
          label: td.textContent.trim(),
          content: Array.from(td.childNodes)
        });
      } else {
        row[column.field] = td.textContent.trim();
      }
    }
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
function isColumnHidden(column) {
  return Boolean(column.hidden || column.responsiveHidden);
}
function getColumnAlign(column) {
  return column.align ?? getFormatDefaults(column.format, column.formatOptions)?.align ?? null;
}
function getColumnFilterType(column) {
  return column.filterType ?? getFormatDefaults(column.format, column.formatOptions)?.filter ?? "text";
}
function isPercentColumn(column) {
  return column.format === "number" && column.formatOptions?.style === "percent";
}
function applyColumnDefinition(el, column) {
  if (column.width) {
    const minWidth = Number.parseInt(el.dataset.minWidth ?? "") || 0;
    el.setAttribute("width", String(Math.max(column.width, minWidth)));
  }
  if (column.class) {
    el.classList.add(...column.class.trim().split(/\s+/));
  }
  if (column.frozen === "start") {
    el.dataset.frozen = "start";
  } else {
    delete el.dataset.frozen;
  }
  if (isColumnHidden(column)) {
    el.setAttribute("hidden", "");
    if (column.responsiveHidden) {
      el.classList.add("dg-responsive-hidden");
    }
  }
  if (column.sortable === false && el.tagName === "TH") {
    el.classList.add("dg-not-sortable");
  }
}

class DataGrid extends base_element_default {
  constructor(options = {}) {
    super(options);
    this._filterSelector = "[id^=dg-filter]";
    this._excludedRowElementSelector = "a,button,input,select,textarea,[contenteditable]:not([contenteditable='false']),[data-row-click-ignore]";
    this.plugins = this._initPlugins();
    this._initialQuery = normalizeQuery(this.options.initialQuery);
    this._query = normalizeQuery(this._initialQuery);
    this._selection = { mode: "explicit", ids: new Set, except: new Set };
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
    this._columns = [];
    this.dataSource = null;
    this.table = null;
    this.scrollEl = document.createElement("div");
    this.btnFirst = null;
    this.btnPrev = null;
    this.btnNext = null;
    this.btnLast = null;
    this.selectPerPage = null;
    this.inputPage = null;
    this.searchInput = null;
    this.headerRow = null;
    this.rowHeight = null;
    this._loadObserver = null;
    this._lazyPending = false;
    this._renderContext = null;
    this._frozenFrame = null;
  }
  _ready() {
    this.fireEvents = false;
    if (!this.hasAttribute("id")) {
      this.setAttribute("id", this.options.id ?? randstr("el-"));
    }
    this._syncSelectionOptions();
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
                  <span class="dg-select-field">
                    <select class="dg-select-per-page" aria-label="${labels.itemsPerPage}"></select>
                  </span>
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
  _setNoData(tbody) {
    if (!this.hasDataError && tbody.getAttribute("data-empty-message") !== this.noData) {
      tbody.setAttribute("data-empty-message", this.noData);
    }
  }
  _updateStatus(text) {
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
    this._setNoData(this.tbody);
    this.updateMetaLabel();
    this.updatePageStatus();
    if (this.loading) {
      this._updateStatus(this.labels.loading);
    } else if (this.hasDataError) {
      this._updateStatus(this.tbody?.getAttribute("data-empty-message") || this.labels.networkError);
    } else {
      this._updateStatus(this.rows.length ? this.formatLabel(this.labels.resultCount, { count: this.total }) : this.noData);
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
      frozen: null,
      transform: null,
      format: null,
      align: null,
      filterType: null,
      filterPlaceholder: "…",
      firstFilterOption: { value: "", text: "" },
      filterMultiple: false
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
      rowClick: "action",
      rowKey: "id",
      rowLabel: null,
      bulkActions: [],
      resizable: false,
      autosize: false,
      wrap: false,
      snapColumns: false,
      autoheight: true,
      autohidePager: false,
      responsive: false,
      responsiveToggle: true,
      responsiveStartOpen: false,
      rowDetails: null,
      rowDetailsStartOpen: false,
      filterDelay: 300,
      searchable: false,
      searchPlaceholder: "…",
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
      const fn = plugin[hook];
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
  getPlugin(name) {
    return this.plugins[name];
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
      "row-details-start-open",
      "selectable",
      "single-select",
      "select-visible-only",
      "row-click",
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
      "wrap",
      "snap-columns",
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
      "page-sizes": parseIntegerListAttribute,
      "row-click": (raw) => parseEnumAttribute(raw, ["action", "select", "none"], "action")
    };
  }
  get thead() {
    return this.querySelector("thead");
  }
  get tbody() {
    return this.querySelector("tbody");
  }
  get tfoot() {
    return this.querySelector("tfoot");
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
    this.setAttribute("data-loading", "");
    this.removeAttribute("data-error");
    this._updateStatus(this.labels.loading);
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
      this._updateStatus(this.rows.length ? this.formatLabel(this.labels.resultCount, { count: this.total }) : this.noData);
    } catch (err) {
      if (requestId !== this._requestSeq)
        return;
      const e = err;
      if (e?.name === "AbortError" || controller.signal.aborted)
        return;
      const message = this.options.errorMessage || e?.message?.replace(/^\s+|\r\n|\n|\r$/g, "") || this.labels.networkError;
      this.error = e;
      this.setAttribute("data-error", "");
      this.tbody?.setAttribute("data-empty-message", message);
      this._updateStatus(message);
      this.renderBody();
      dispatch(this, "loadError", e);
    } finally {
      if (requestId === this._requestSeq) {
        this.loading = false;
        this.removeAttribute("data-loading");
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
    this.setAttribute("dir", this.options.dir);
  }
  showPageSizeChanged() {
    this.selectPerPage?.toggleAttribute("hidden", !this.options.showPageSize);
    this.selectPerPage?.closest(".dg-select-field")?.toggleAttribute("hidden", !this.options.showPageSize);
  }
  responsiveChanged() {
    this.runPlugins("responsiveChanged", this.options.responsive);
    this.renderTable();
  }
  snapColumnsChanged() {
    this.classList.toggle("dg-snap-columns", Boolean(this.options.snapColumns));
  }
  wrapChanged() {
    if (this.table) {
      this.renderBody();
    }
  }
  rowDetailsStartOpenChanged() {
    if (this.table) {
      this.renderBody();
    }
  }
  menuChanged() {
    this.renderHeader();
  }
  selectableChanged() {
    this.renderTable();
    this.renderBody();
  }
  _syncSelectionOptions() {
    if (this.options.singleSelect) {
      this.options.selectable = true;
    }
  }
  singleSelectChanged() {
    this._syncSelectionOptions();
    if (this.options.singleSelect) {
      this._clearSelectionIfNeeded();
    }
    this.selectableChanged();
  }
  rowClickChanged() {
    if (this.table) {
      this.renderBody();
    }
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
      topbar = document.createElement("div");
      topbar.className = "dg-topbar";
      const start = document.createElement("div");
      start.className = "dg-topbar-start";
      const end = document.createElement("div");
      end.className = "dg-topbar-end";
      topbar.append(start, end);
      this.insertBefore(topbar, this.scrollEl);
    }
    return topbar;
  }
  renderSearch() {
    if (!this.options.searchable) {
      this.searchInput?.closest(".dg-search-field")?.remove();
      this.searchInput = null;
      return;
    }
    if (this.searchInput) {
      this.searchInput.setAttribute("aria-label", this.labels.search);
      this.searchInput.setAttribute("placeholder", this.options.searchPlaceholder);
      return;
    }
    const input = document.createElement("input");
    input.type = "search";
    input.name = "search";
    input.className = "dg-search";
    input.setAttribute("placeholder", this.options.searchPlaceholder);
    input.setAttribute("aria-label", this.labels.search);
    input.value = this._query.search;
    const field = document.createElement("span");
    field.className = "dg-search-field";
    const icon = document.createElement("span");
    icon.className = "dg-search-icon";
    icon.setAttribute("aria-hidden", "true");
    icon.innerHTML = `<svg viewBox="0 0 16 16" width="16" height="16" fill="currentColor" focusable="false">
            <path d="M11.742 10.344a6.5 6.5 0 1 0-1.397 1.398h-.001q.044.06.098.115l3.85 3.85a1 1 0 0 0 1.415-1.414l-3.85-3.85a1 1 0 0 0-.115-.1zM12 6.5a5.5 5.5 0 1 1-11 0 5.5 5.5 0 0 1 11 0" />
        </svg>`;
    field.append(icon, input);
    textInputState.set(input, {
      composing: false,
      apply: debounce(() => this.commitSearch(), this.options.searchDelay)
    });
    this.ensureTopbar().querySelector(".dg-topbar-end")?.appendChild(field);
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
      existing.tabIndex = 0;
      this.scrollEl = existing;
      const table = existing.querySelector(":scope > table");
      if (table) {
        this.table = table;
      }
      return;
    }
    const scroll = document.createElement("div");
    scroll.className = "dg-scroll";
    scroll.tabIndex = 0;
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
    this._syncSelectionOptions();
    this.addEventListener("click", this);
    this.addEventListener("change", this);
    this.addEventListener("input", this);
    this.addEventListener("keydown", this);
    this.addEventListener("mouseover", this);
    this.addEventListener("compositionstart", this);
    this.addEventListener("compositionend", this);
    this.addEventListener("columnResized", this);
    this.addEventListener("columnReordered", this);
    this.addEventListener("columnVisibility", this);
    this.selectPerPage?.toggleAttribute("hidden", !this.options.showPageSize);
    this.selectPerPage?.closest(".dg-select-field")?.toggleAttribute("hidden", !this.options.showPageSize);
    this.setupDataSource();
    this.setupInitialState();
    for (const plugin of Object.values(this.plugins)) {
      await plugin.connected?.();
    }
    this.dirChanged();
    this.snapColumnsChanged();
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
    this.removeEventListener("mouseover", this);
    this.removeEventListener("compositionstart", this);
    this.removeEventListener("compositionend", this);
    this.removeEventListener("columnResized", this);
    this.removeEventListener("columnReordered", this);
    this.removeEventListener("columnVisibility", this);
    if (this._frozenFrame !== null) {
      cancelAnimationFrame(this._frozenFrame);
      this._frozenFrame = null;
    }
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
      case "mouseover":
        this._handleMouseover(target);
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
  _handleMouseover(target) {
    const cell = target.closest("tbody td");
    if (!cell || !this._ownsControl(cell)) {
      return;
    }
    const generated = cell.hasAttribute("data-dg-overflow-title");
    if (cell.hasAttribute("title") && !generated) {
      return;
    }
    const truncated = !cell.classList.contains("dg-wrap") && cell.scrollWidth > cell.clientWidth;
    const text = cell.textContent.trim();
    if (truncated && text) {
      cell.title = text;
      cell.setAttribute("data-dg-overflow-title", "");
    } else if (generated) {
      cell.removeAttribute("title");
      cell.removeAttribute("data-dg-overflow-title");
    }
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
    const tr = target.closest("tr.dg-data-row");
    if (tr && this._ownsControl(tr) && this.options.rowClick !== "none") {
      const rowIndex = Number(tr.dataset.rowIndex);
      const row = this.rows[rowIndex];
      if (row) {
        return this._handleRowClick(event, row, rowIndex);
      }
    }
  }
  _isRowClickExcluded(event) {
    const selector = this._excludedRowElementSelector;
    const path = typeof event.composedPath === "function" ? event.composedPath() : [event.target];
    for (const node of path) {
      if (node instanceof Element && node.matches(selector)) {
        return true;
      }
    }
    return false;
  }
  _handleRowClick(event, row, rowIndex) {
    if (this._isRowClickExcluded(event)) {
      return;
    }
    if (!dispatch(this, "rowClick", {
      row,
      rowKey: this.resolveRowKey(row, rowIndex),
      rowIndex,
      originalEvent: event
    }, { cancelable: true })) {
      return;
    }
    if (this.options.rowClick === "select") {
      if (this.options.selectable) {
        return this.toggleRow(row, rowIndex);
      }
      return;
    }
    if (this.options.rowClick === "action") {
      const rowActions = this.getPlugin("RowActions");
      return rowActions?.activateDefaultAction(rowIndex);
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
    const multi = target.closest(".dg-multiselect");
    if (multi && this._ownsControl(multi)) {
      updateMultiSelectSummary(multi);
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
    const input = target.closest(`.dg-search, ${this._filterSelector}`);
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
    for (const col of this.options.columns) {
      if (col.field === field) {
        return col;
      }
    }
    return null;
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
  getColumnId(column) {
    return column.id ?? column.field ?? "";
  }
  getColumnById(id) {
    return this.getColumns().find((column) => this.getColumnId(column) === id) ?? null;
  }
  _createColumnCell(tag, column) {
    const cell = document.createElement(tag);
    cell.dataset.columnId = this.getColumnId(column);
    applyColumnDefinition(cell, column);
    const align = getColumnAlign(column);
    if (align) {
      cell.dataset.align = align;
    }
    if (tag === "td" && column.format) {
      cell.dataset.format = column.format;
    }
    return cell;
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
      const id = this.getColumnId(column);
      const hidden = isColumnHidden(column);
      for (const cell of this.querySelectorAll(`[data-column-id="${id}"]`)) {
        cell.toggleAttribute("hidden", hidden);
        cell.classList.toggle("dg-responsive-hidden", Boolean(column.responsiveHidden));
      }
    }
    this._syncSpanningCells();
    this.renderFooter();
    this.queueFrozenSync();
  }
  _syncSpanningCells() {
    const colspan = Math.max(1, this.columnsLength(true));
    for (const cell of this.querySelectorAll("[data-dg-span-columns]")) {
      cell.setAttribute("colspan", String(colspan));
    }
  }
  queueFrozenSync() {
    if (this._frozenFrame !== null) {
      return;
    }
    this._frozenFrame = requestAnimationFrame(() => {
      this._frozenFrame = null;
      this.syncFrozenColumns();
    });
  }
  syncFrozenColumns() {
    if (!this.headerRow || !this.scrollEl) {
      return;
    }
    for (const cell of this.querySelectorAll("[data-frozen-edge]")) {
      cell.removeAttribute("data-frozen-edge");
    }
    let offset = 0;
    let edgeCells = [];
    for (const column of this.getColumns()) {
      if (column.frozen !== "start" || isColumnHidden(column) || column.attr) {
        continue;
      }
      const id = this.getColumnId(column);
      const cells = [...this.querySelectorAll(`[data-column-id="${id}"]`)].filter((cell) => cell.closest("data-grid") === this);
      const header = cells.find((cell) => cell.parentElement?.classList.contains("dg-head-columns"));
      if (!header) {
        continue;
      }
      for (const cell of cells) {
        cell.style.setProperty("--dg-frozen-offset", `${offset}px`);
      }
      edgeCells = cells;
      offset += header.offsetWidth;
    }
    for (const cell of edgeCells) {
      cell.setAttribute("data-frozen-edge", "");
    }
    this.scrollEl.style.setProperty("--dg-frozen-start-width", `${offset}px`);
  }
  oncolumnResized() {
    this.queueFrozenSync();
  }
  oncolumnReordered() {
    this.queueFrozenSync();
  }
  oncolumnVisibility() {
    this.queueFrozenSync();
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
      const tr = this.querySelector("tbody tr") || this.querySelector("table tr");
      if (tr) {
        this.rowHeight = tr.offsetHeight;
      }
    }
    this._setNoData(this.tbody);
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
          tr.setAttribute("data-selected", "");
        } else {
          tr.removeAttribute("data-selected");
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
    const headers = this.querySelectorAll("thead tr.dg-head-columns th");
    for (const th of headers) {
      const match = sort.find((s) => s.field === th.getAttribute("field"));
      if (match) {
        th.setAttribute("aria-sort", match.direction === "asc" ? "ascending" : "descending");
        th.setAttribute("data-sort", match.direction);
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
  sortAsc(columnName) {
    return this._sort(columnName, "asc");
  }
  sortDesc(columnName) {
    return this._sort(columnName, "desc");
  }
  sortNone(columnName) {
    return this._sort(columnName, "none");
  }
  clearFilters() {
    const inputs = this.querySelectorAll(this._filterSelector);
    for (const input of inputs) {
      if (input.dataset.filterMode === "multi") {
        clearMultiSelect(input);
        continue;
      }
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
    const inputs = this.querySelectorAll(this._filterSelector);
    for (const input of inputs) {
      const name = input.dataset.name;
      if (!name) {
        continue;
      }
      if (input.dataset.filterMode === "multi") {
        const values = readMultiSelect(input);
        if (values.length) {
          filters[name] = { operator: "in", value: values };
        }
        continue;
      }
      const value = input.value;
      if (value) {
        const mode = input.dataset.filterMode;
        if (mode === "boolean") {
          filters[name] = { operator: "eq", value: value === "true" };
        } else if (mode === "number") {
          const num = Number(value);
          const isPercent = input.dataset.percent === "true";
          filters[name] = {
            operator: "contains",
            value: Number.isFinite(num) ? isPercent ? num / 100 : num : value
          };
        } else if (mode === "date") {
          filters[name] = { operator: "startsWith", value };
        } else {
          const isSelect = /select/i.test(input.tagName);
          filters[name] = {
            operator: isSelect ? "eq" : "contains",
            value
          };
        }
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
    this.queueFrozenSync();
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
        cap = document.createElement("caption");
        table.insertBefore(cap, table.firstChild);
      }
      cap.textContent = caption;
      table.removeAttribute("aria-labelledby");
      table.removeAttribute("aria-label");
      this.scrollEl.setAttribute("role", "region");
      this.scrollEl.setAttribute("aria-label", caption);
      this.scrollEl.removeAttribute("aria-labelledby");
    } else {
      cap?.remove();
      const labelledby = this.getAttribute("aria-labelledby");
      const ariaLabel = this.getAttribute("aria-label");
      if (labelledby) {
        table.setAttribute("aria-labelledby", labelledby);
        table.removeAttribute("aria-label");
        this.scrollEl.setAttribute("role", "region");
        this.scrollEl.setAttribute("aria-labelledby", labelledby);
        this.scrollEl.removeAttribute("aria-label");
      } else if (ariaLabel) {
        table.setAttribute("aria-label", ariaLabel);
        table.removeAttribute("aria-labelledby");
        this.scrollEl.setAttribute("role", "region");
        this.scrollEl.setAttribute("aria-label", ariaLabel);
        this.scrollEl.removeAttribute("aria-labelledby");
      } else {
        table.removeAttribute("aria-labelledby");
        table.removeAttribute("aria-label");
        this.scrollEl.removeAttribute("role");
        this.scrollEl.removeAttribute("aria-labelledby");
        this.scrollEl.removeAttribute("aria-label");
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
    const tr = document.createElement("tr");
    this.headerRow = tr;
    tr.setAttribute("class", "dg-head-columns");
    const oldRow = thead?.querySelector("tr.dg-head-columns") ?? null;
    let sampleTh = oldRow?.querySelector("th") ?? null;
    this.log("createColumnHeaders - sampleTh", sampleTh);
    let seededSample = false;
    if (!sampleTh) {
      sampleTh = document.createElement("th");
      if (oldRow) {
        oldRow.appendChild(sampleTh);
      } else {
        seededSample = true;
        tr.appendChild(sampleTh);
        thead?.appendChild(tr);
      }
    }
    this.log("createColumnHeaders - columns", this.getColumns());
    for (const column of this.getColumns()) {
      if (column.attr) {
        continue;
      }
      const th = document.createElement("th");
      th.setAttribute("scope", "col");
      th.setAttribute("data-column-id", this.getColumnId(column));
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
      const align = getColumnAlign(column);
      if (align) {
        th.dataset.align = align;
      }
      tr.appendChild(th);
    }
    if (seededSample) {
      sampleTh.remove();
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
      const thWithWidth = tr.querySelectorAll("th[width]");
      for (const th of thWithWidth) {
        if (th.classList.contains("dg-not-resizable")) {
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
          th.setAttribute("width", String(newWidth));
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
      th.setAttribute("data-responsive", String(column.responsive || ""));
    }
    const defaults = getFormatDefaults(column.format, column.formatOptions);
    const intrinsicWidth = getTextWidth(column.title ?? "", sampleTh ?? document.body, true) + 20;
    const effectiveMin = Math.max(intrinsicWidth, column.minWidth ?? 0, defaults?.minWidth ?? 0);
    th.dataset.minWidth = `${effectiveMin}`;
    applyColumnDefinition(th, column);
    const preferredWidth = column.width || defaults?.width;
    if (preferredWidth !== undefined && Number.isFinite(preferredWidth)) {
      const width = Math.max(effectiveMin, preferredWidth);
      th.setAttribute("width", String(width));
      th.dataset.preferredWidth = String(width);
    } else {
      th.removeAttribute("width");
      delete th.dataset.preferredWidth;
    }
    if (isColumnHidden(column)) {
      th.setAttribute("hidden", "");
    }
    if (sortable) {
      const direction = this.getColumnSortDirection(column.field ?? "");
      if (direction) {
        th.setAttribute("aria-sort", direction === "asc" ? "ascending" : "descending");
        th.setAttribute("data-sort", direction);
      }
      const button = document.createElement("button");
      button.type = "button";
      button.classList.add("dg-sort");
      const label = document.createElement("span");
      label.classList.add("dg-sort-label");
      label.textContent = column.title ?? "";
      const indicator = document.createElement("span");
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
    const tr = document.createElement("tr");
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
      const th = this._createColumnCell("th", column);
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
    const filteredRows = tr.querySelectorAll(this._filterSelector);
    for (const el of filteredRows) {
      if (/select/i.test(el.tagName) || el.classList.contains("dg-multiselect")) {
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
        if (filter.dataset.filterMode === "multi") {
          setMultiSelectValues(filter, Array.isArray(filterState.value) ? filterState.value : []);
        } else {
          filter.value = filter.dataset.percent === "true" ? String(Number(filterState.value) * 100) : String(filterState.value ?? "");
        }
      }
    }
    if (filter instanceof HTMLSelectElement) {
      const field2 = document.createElement("span");
      field2.className = "dg-select-field";
      field2.appendChild(filter);
      th.appendChild(field2);
    } else {
      th.appendChild(filter);
    }
  }
  createFilterElement(column, relatedTh) {
    const type = getColumnFilterType(column);
    if (type === "select" && column.filterMultiple && supportsPopoverAnchor()) {
      return createMultiSelect(column, this.getFilterOptions(column), relatedTh);
    }
    const isSelect = type === "select" || type === "boolean";
    const filter = isSelect ? document.createElement("select") : document.createElement("input");
    filter.classList.add("dg-filter");
    filter.classList.add("dg-filter-control");
    filter.dataset.filterMode = type;
    if (isPercentColumn(column)) {
      filter.dataset.percent = "true";
    }
    if (type === "boolean") {
      const first = column.firstFilterOption || this.defaultColumn.firstFilterOption || { value: "", text: "" };
      const options = [
        first,
        { value: "true", text: this.labels?.booleanTrue ?? "Yes" },
        { value: "false", text: this.labels?.booleanFalse ?? "No" }
      ];
      for (const e of options) {
        const opt = document.createElement("option");
        opt.value = `${e.value}`;
        opt.text = e.text;
        filter.add(opt);
      }
    } else if (type === "select") {
      for (const e of this.getFilterOptions(column)) {
        const opt = document.createElement("option");
        opt.value = `${e.value}`;
        opt.text = e.text;
        if (filter instanceof HTMLSelectElement) {
          filter.add(opt);
        }
      }
    } else {
      const input = filter;
      input.type = "text";
      input.inputMode = type === "number" ? "decimal" : "search";
      input.autocomplete = "off";
      if (!column.filterPlaceholder || column.filterPlaceholder === this.defaultColumn.filterPlaceholder) {
        if (type === "date") {
          input.placeholder = "YYYY-MM-DD";
        } else if (isPercentColumn(column)) {
          input.placeholder = "%";
        } else {
          input.placeholder = this.defaultColumn.filterPlaceholder ?? "";
        }
      } else {
        input.placeholder = column.filterPlaceholder ?? "";
      }
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
      const labels2 = new Map;
      for (const row of this.dataSource.rows ?? []) {
        if (!field) {
          continue;
        }
        const v = row[field];
        if (v === undefined || v === null || v === "") {
          continue;
        }
        const meta = declarativeCells(row)?.[field];
        const text = meta?.label || v;
        if (!labels2.has(v)) {
          labels2.set(v, text);
        }
      }
      const options = [...labels2.entries()].map(([value, text]) => ({ value, text })).sort((a, b) => a.text < b.text ? -1 : a.text > b.text ? 1 : 0);
      return [firstFilterOption, ...options];
    }
    return [firstFilterOption];
  }
  renderBody() {
    this.log("render body");
    this._columns = this.buildColumns();
    this.runPlugins("beforeRender");
    this._renderContext = "body";
    const tbody = document.createElement("tbody");
    const prev = this.tbody;
    const message = prev?.getAttribute("data-empty-message") ?? "";
    let i = 0;
    for (const item of this.rows) {
      const tr = document.createElement("tr");
      tr.classList.add("dg-data-row");
      tr.dataset.rowIndex = String(i);
      if (this.options.rowClick === "select" && this.options.selectable) {
        tr.classList.add("dg-clickable-row");
      }
      for (const column of this.getColumns()) {
        if (!column) {
          console.error("Empty column found!", this.getColumns());
          continue;
        }
        const field = column.field;
        if (column.attr) {
          if (field && item[field] != null) {
            if (column.attr === "class") {
              tr.classList.add(...item[field].trim().split(/\s+/));
            } else {
              tr.setAttribute(column.attr, item[field]);
            }
          }
          continue;
        }
        const td = this._createColumnCell("td", column);
        if (column.wrap ?? this.options.wrap) {
          td.classList.add("dg-wrap");
        }
        td.setAttribute("data-name", column.title ?? "");
        const ctx = { grid: this, column, row: item, rowIndex: i, value: field ? item[field] : undefined, tr };
        const cellClass = typeof column.cellClass === "function" ? column.cellClass(ctx) : column.cellClass;
        const classes = String(cellClass ?? "").trim();
        if (classes) {
          td.classList.add(...classes.split(/\s+/));
        }
        if (column.renderCell) {
          applyContent(td, column.renderCell(ctx));
        } else {
          this.renderDefaultCell(td, ctx);
        }
        tr.appendChild(td);
      }
      tbody.appendChild(tr);
      dispatch(this, "rowRendered", { rowData: item, tr });
      i++;
    }
    if (this.hasDataError) {
      const { row, cell } = createSpanningRow(this, { className: "dg-error-row" });
      cell.textContent = message || this.labels.networkError;
      tbody.appendChild(row);
    } else if (this.rows.length === 0) {
      const { row, cell } = createSpanningRow(this, { className: "dg-empty-row" });
      cell.textContent = this.noData;
      tbody.appendChild(row);
    }
    tbody.setAttribute("data-empty-message", message);
    if (prev) {
      this.table?.replaceChild(tbody, prev);
    } else {
      this.table?.appendChild(tbody);
    }
    this.paginate();
    this.runPlugins("afterRender", this._renderContext);
    this.queueFrozenSync();
    if (this.hasDataError || this.rows.length) {
      this.removeAttribute("data-empty");
    } else {
      this.setAttribute("data-empty", "");
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
      td.classList.add("dg-editable-col");
      td.dataset.field = field;
      td.dataset.rowIndex = `${i}`;
    }
    const value = item[field] ?? "";
    const meta = declarativeCells(item)?.[field];
    if (meta?.content.length && Object.is(value, meta.value)) {
      const fragment = document.createDocumentFragment();
      for (const node of meta.content) {
        fragment.appendChild(node.cloneNode(true));
      }
      applyContent(td, fragment);
      return;
    }
    const transformed = transformValue(value, column.transform, ctx);
    if (column.format) {
      applyContent(td, formatValue(transformed, column.format, column.formatOptions, ctx));
    } else {
      td.textContent = transformed;
    }
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
    const handler = this[`on${event.type}`];
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
  constructor(grid) {
    super(grid);
    this._resizeController = null;
  }
  connected() {
    this.grid.addEventListener("mousedown", this);
    this.grid.addEventListener("click", this);
  }
  disconnected() {
    this.grid.removeEventListener("mousedown", this);
    this.grid.removeEventListener("click", this);
    this._resizeController?.abort();
    this._resizeController = null;
  }
  afterRender(context) {
    if (context !== "table") {
      return;
    }
    this.renderResizer(this.grid.labels.resizeColumn);
  }
  updateLabels() {
    const resizeLabel = this.grid.labels.resizeColumn;
    const resizers = this.grid.querySelectorAll(".dg-resizer");
    for (const resizer of resizers) {
      resizer.ariaLabel = resizeLabel;
    }
  }
  renderResizer(resizeLabel) {
    const cols = this.grid.querySelectorAll("thead tr.dg-head-columns th");
    for (const col of cols) {
      if (col.classList.contains("dg-not-resizable")) {
        continue;
      }
      const resizer = document.createElement("div");
      resizer.classList.add("dg-resizer");
      resizer.ariaLabel = resizeLabel;
      col.appendChild(resizer);
    }
  }
  onclick(event) {
    const target = event.target;
    if (!(target instanceof Element) || !this.grid._ownsControl(target)) {
      return;
    }
    if (target.closest(".dg-resizer")) {
      event.stopPropagation();
    }
  }
  onmousedown(event) {
    const target = event.target;
    if (!(target instanceof Element) || !this.grid._ownsControl(target)) {
      return;
    }
    const resizer = target.closest(".dg-resizer");
    if (!resizer) {
      return;
    }
    event.preventDefault();
    event.stopPropagation();
    const grid = this.grid;
    const table = grid.table;
    const col = resizer.closest("th");
    if (!table || !col) {
      return;
    }
    const currentCols = [...grid.querySelectorAll("thead tr.dg-head-columns th")];
    const visibleCols = currentCols.filter((col2) => {
      return !col2.hasAttribute("hidden");
    });
    const columnIndex = visibleCols.findIndex((col2) => col2 === resizer.parentNode);
    grid.log("resize column");
    resizer.classList.add("dg-resizer-active");
    col.removeAttribute("draggable");
    col.style.overflow = "visible";
    resizer.style.height = `${table.offsetHeight - 1}px`;
    const startX = event.clientX;
    const startW = col.offsetWidth;
    const remainingSpace = (visibleCols.length - columnIndex) * 30;
    const max = elementOffset(resizer).left + grid.offsetWidth - remainingSpace;
    col.setAttribute("width", String(startW));
    for (let j = 0;j < visibleCols.length; j++) {
      if (j > columnIndex) {
        visibleCols[j].removeAttribute("width");
      }
    }
    this._resizeController?.abort();
    this._resizeController = new AbortController;
    const { signal } = this._resizeController;
    const mouseMoveHandler = (e) => {
      if (e.clientX > max) {
        return;
      }
      const newWidth = startW + (e.clientX - startX);
      if (col.dataset.minWidth && newWidth > Number.parseInt(col.dataset.minWidth)) {
        col.setAttribute("width", String(newWidth));
      }
    };
    const mouseUpHandler = () => {
      grid.log("resized column");
      resizer.classList.remove("dg-resizer-active");
      if (grid.options.reorder) {
        col.draggable = true;
      }
      col.style.overflow = "hidden";
      this._resizeController?.abort();
      this._resizeController = null;
      dispatch(grid, "columnResized", {
        col: col.getAttribute("field"),
        width: col.getAttribute("width")
      });
    };
    document.addEventListener("mousemove", mouseMoveHandler, { signal });
    document.addEventListener("mouseup", mouseUpHandler, { signal, once: true });
  }
}
var column_resizer_default = ColumnResizer;

// src/plugins/context-menu.js
class ContextMenu extends base_plugin_default {
  constructor(grid) {
    super(grid);
    this.menu = null;
  }
  connected() {
    const menu = this.grid.ownerDocument.createElement("ul");
    if (typeof menu.showPopover !== "function") {
      return;
    }
    menu.className = "dg-menu dg-context-menu";
    menu.popover = "auto";
    this.grid.appendChild(menu);
    this.menu = menu;
    this.grid.addEventListener("contextmenu", this);
    this.grid.addEventListener("change", this);
  }
  disconnected() {
    this.grid.removeEventListener("contextmenu", this);
    this.grid.removeEventListener("change", this);
    this.menu?.remove();
    this.menu = null;
  }
  afterRender(context) {
    if (context !== "table" || !this.menu) {
      return;
    }
    this.createMenu();
  }
  onchange(event) {
    const target = event.target;
    if (!(target instanceof Element) || !this.grid._ownsControl(target)) {
      return;
    }
    const t = target.closest(".dg-menu input[data-name]");
    if (!t) {
      return;
    }
    const grid = this.grid;
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
  oncontextmenu(event) {
    const menu = this.menu;
    if (!this.grid.options.menu || !menu) {
      return;
    }
    const target = event.target;
    if (!(target instanceof Element) || !this.grid._ownsControl(target)) {
      return;
    }
    const header = target.closest("thead th");
    if (!header) {
      return;
    }
    event.preventDefault();
    const x = event.clientX;
    const y = event.clientY;
    menu.style.left = `${x}px`;
    menu.style.top = `${y}px`;
    menu.showPopover();
    const rect = menu.getBoundingClientRect();
    const viewport = menu.ownerDocument.documentElement;
    menu.style.left = `${Math.min(x, viewport.clientWidth - rect.width)}px`;
    menu.style.top = `${Math.min(y, viewport.clientHeight - rect.height)}px`;
  }
  createMenu() {
    const grid = this.grid;
    const menu = this.menu;
    if (!menu) {
      return;
    }
    menu.replaceChildren();
    for (const col of grid.options.columns) {
      if (col.attr) {
        continue;
      }
      const li = document.createElement("li");
      const label = document.createElement("label");
      const checkbox = document.createElement("input");
      checkbox.setAttribute("type", "checkbox");
      checkbox.setAttribute("data-name", col.field ?? "");
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
  connected() {
    this.grid.addEventListener("dragstart", this);
    this.grid.addEventListener("dragover", this);
    this.grid.addEventListener("drop", this);
  }
  disconnected() {
    this.grid.removeEventListener("dragstart", this);
    this.grid.removeEventListener("dragover", this);
    this.grid.removeEventListener("drop", this);
  }
  afterRender(context) {
    if (context !== "table") {
      return;
    }
    const headers = this.grid.querySelectorAll('thead tr.dg-head-columns th[data-column-id]:not([data-column-id^="$"])');
    for (const th of headers) {
      th.draggable = true;
    }
  }
  _draggableHeader(event) {
    const target = event.target;
    if (!(target instanceof Element) || !this.grid._ownsControl(target)) {
      return null;
    }
    return target.closest('thead tr.dg-head-columns th[data-column-id]:not([data-column-id^="$"])');
  }
  ondragstart(event) {
    const th = this._draggableHeader(event);
    if (!th) {
      return;
    }
    this.grid.log("reorder col");
    const dt = event.dataTransfer;
    if (!dt) {
      return;
    }
    dt.effectAllowed = "move";
    dt.setData("text/plain", th.getAttribute("data-column-id") ?? "");
  }
  ondragover(event) {
    if (!this._draggableHeader(event)) {
      return;
    }
    event.preventDefault();
    if (event.dataTransfer) {
      event.dataTransfer.dropEffect = "move";
    }
  }
  ondrop(event) {
    const target = this._draggableHeader(event);
    if (!target) {
      return;
    }
    event.stopPropagation();
    const dt = event.dataTransfer;
    if (!dt) {
      return;
    }
    const draggedId = dt.getData("text/plain");
    const targetId = target.getAttribute("data-column-id");
    if (!targetId || draggedId === targetId) {
      this.grid.log("reordered col stayed the same");
      return;
    }
    if (draggedId.startsWith("$") || targetId.startsWith("$")) {
      return;
    }
    this.grid.log(`reordered col from ${draggedId} to ${targetId}`);
    const cols = this.grid.options.columns;
    const from = cols.findIndex((c) => this.grid.getColumnId(c) === draggedId);
    const to = cols.findIndex((c) => this.grid.getColumnId(c) === targetId);
    if (from === -1 || to === -1) {
      return;
    }
    [cols[from], cols[to]] = [cols[to], cols[from]];
    this.grid.renderTable();
    dispatch(this.grid, "columnReordered", {
      col: draggedId,
      from,
      to
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
    this.grid.addEventListener("change", this);
    this.grid.addEventListener("click", this);
  }
  disconnected() {
    this.grid.removeEventListener("selectionChange", this);
    this.grid.removeEventListener("change", this);
    this.grid.removeEventListener("click", this);
  }
  onselectionChange() {
    this.syncSelection();
  }
  onchange(event) {
    const target = event.target;
    if (!(target instanceof Element) || !this.grid._ownsControl(target)) {
      return;
    }
    const grid = this.grid;
    if (!grid.options.selectable) {
      return;
    }
    const selectAll = target.closest(`.${SELECT_ALL_CLASS}`);
    if (selectAll) {
      if (selectAll.checked) {
        grid.selectAll();
      } else {
        grid.clearSelection();
      }
      return;
    }
    const checkbox = target.closest(`.${SELECTABLE_CLASS} input[type="checkbox"]`);
    if (checkbox) {
      const rowIndex = this._rowIndex(checkbox);
      if (rowIndex === null) {
        return;
      }
      const row = grid.rows[rowIndex];
      if (row !== undefined) {
        grid.toggleRow(row, rowIndex);
      }
    }
  }
  onclick(event) {
    const target = event.target;
    if (!(target instanceof Element) || !this.grid._ownsControl(target)) {
      return;
    }
    const grid = this.grid;
    if (!grid.options.selectable) {
      return;
    }
    if (target.closest("label.dg-clickable-cell")) {
      event.stopPropagation();
    }
    const radio = target.closest(`.${SELECTABLE_CLASS} input[type="radio"]`);
    if (!radio) {
      return;
    }
    event.preventDefault();
    const rowIndex = this._rowIndex(radio);
    if (rowIndex === null) {
      return;
    }
    const row = grid.rows[rowIndex];
    if (row === undefined) {
      return;
    }
    if (grid.isRowSelected(row, rowIndex)) {
      grid.deselectRow(row, rowIndex);
    } else {
      grid.selectRow(row, rowIndex);
    }
  }
  _rowIndex(element) {
    const tr = element.closest("tr");
    if (!tr) {
      return null;
    }
    const rowIndex = Number.parseInt(tr.dataset.rowIndex ?? "", 10);
    return Number.isInteger(rowIndex) ? rowIndex : null;
  }
  extendColumns(columns) {
    if (!this.grid.options.selectable) {
      return;
    }
    columns.unshift({
      id: "$selection",
      virtual: true,
      position: "start",
      frozen: "start",
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
    for (const input of inputs) {
      const tr = input.closest("tr");
      if (!tr) {
        continue;
      }
      const index = Number.parseInt(tr.dataset.rowIndex ?? "", 10);
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
    let visible = 0;
    let checked = 0;
    const tbody = grid.tbody;
    if (tbody) {
      const inputs = Array.from(tbody.querySelectorAll(`.${SELECTABLE_CLASS} input`));
      for (const input of inputs) {
        if (this.visibleOnly && input.closest("tr[hidden]")) {
          continue;
        }
        visible += 1;
        if (input.checked) {
          checked += 1;
        }
      }
    }
    this.selectAll.indeterminate = checked > 0 && checked < visible;
    this.selectAll.checked = visible > 0 && checked === visible;
  }
  createHeaderCell(th) {
    th.classList.add("dg-not-resizable", "dg-not-sortable");
    this.selectAll = document.createElement("input");
    this.selectAll.type = "checkbox";
    this.selectAll.classList.add(SELECT_ALL_CLASS);
    this.selectAll.setAttribute("aria-label", this.grid.labels.selectAll);
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
      input.name = `dg-row-select-${grid.id}`;
    }
    const label = document.createElement("label");
    label.classList.add("dg-clickable-cell");
    label.appendChild(input);
    return label;
  }
}
var selectable_rows_default = SelectableRows;

// src/utils/actionConfirm.js
function resolveActionConfirmation(confirm, fallback, subject, context) {
  if (!confirm) {
    return null;
  }
  if (typeof confirm === "string") {
    return confirm;
  }
  if (typeof confirm === "function") {
    const result = confirm(subject, context);
    if (result === false) {
      return null;
    }
    if (typeof result === "string") {
      return result;
    }
  }
  return fallback;
}

// src/plugins/bulk-actions.js
class BulkActions extends base_plugin_default {
  constructor(grid) {
    super(grid);
    this.bar = null;
    this.countEl = null;
    this.countVisible = null;
    this.countStatus = null;
    this.buttons = null;
  }
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
    this.buttons = [];
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
        if (button.disabled) {
          return;
        }
        const selection = grid.getSelectionState();
        const message = resolveActionConfirmation(action.confirm, grid.labels.areYouSure, selection, {
          grid,
          action
        });
        if (message !== null && !window.confirm(message)) {
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
      this.buttons.push(button);
    }
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
  onselectionChange() {
    this.render();
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
    tr.setAttribute("hidden", "");
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
      fakeRow.setAttribute("height", String(fakeHeight));
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
    const columns = new Map;
    for (const column of grid.getColumns()) {
      columns.set(grid.getColumnId(column), column);
    }
    const ths = grid.querySelectorAll("thead tr.dg-head-columns th[data-column-id]:not([hidden])");
    let totalWidth = 0;
    for (const th of ths) {
      const column = columns.get(th.getAttribute("data-column-id") ?? "");
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
    if (th.hasAttribute("width")) {
      const width2 = th.getAttribute("width");
      if (width2 !== null) {
        return Number(width2);
      }
    }
    const field = column.field;
    if (!field || !grid.rows.length) {
      return;
    }
    const firstVal = grid.rows[0];
    const lastVal = grid.rows[grid.rows.length - 1];
    let v = firstVal[field] != null ? firstVal[field].toString() : "";
    const v2 = lastVal[field] != null ? lastVal[field].toString() : "";
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
    th.setAttribute("width", String(width));
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
      frozen: "start",
      width: 40,
      sortable: false,
      title: "",
      class: `${RESPONSIVE_CLASS}-toggle`,
      hidden: !this.hasHiddenColumns(),
      renderHeaderCell: (th) => this.createHeaderCell(th),
      renderFilterCell: () => this.createFilterCell(),
      renderCell: (ctx) => this.createDataCell(ctx)
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
        const size = Math.round(this._entryWidth(entry));
        if (size !== this._lastProcessedWidth) {
          this.resize();
        }
      }
    }, 200);
  }
  _entryWidth(entry) {
    const contentBoxSize = Array.isArray(entry.contentBoxSize) ? entry.contentBoxSize[0] : entry.contentBoxSize;
    return Math.round(contentBoxSize?.inlineSize ?? entry.contentRect?.width ?? 0);
  }
  hasHiddenColumns() {
    for (const col of this.grid.options.columns) {
      if (col.responsiveHidden) {
        return true;
      }
    }
    return false;
  }
  createHeaderCell(th) {
    th.classList.add("dg-not-resizable", "dg-not-sortable");
  }
  createFilterCell() {}
  createDataCell({ row, rowIndex = 0 }) {
    const cell = document.createElement("button");
    cell.type = "button";
    cell.classList.add("dg-clickable-cell", `${RESPONSIVE_CLASS}-toggle-control`);
    cell.setAttribute("aria-expanded", "false");
    cell.setAttribute("aria-controls", this._detailId(rowIndex));
    cell.setAttribute("aria-label", this.grid.formatLabel(this.grid.labels.showHiddenColumns, {
      row: this.grid.getRowLabel(row ?? {}, rowIndex)
    }));
    cell.innerHTML = `<svg aria-hidden="true" viewBox="0 0 24 24" width="24" height="24"><path d="m9 6 6 6-6 6" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/></svg>`;
    cell.addEventListener("click", this);
    return cell;
  }
  _detailId(rowIndex) {
    return `dg-responsive-detail-${this.grid.id}-${rowIndex}`;
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
    const size = this._entryWidth(entry);
    if (size === this._lastProcessedWidth) {
      return;
    }
    this._lastProcessedWidth = size;
    const widths = new Map;
    for (const th of headerRow.querySelectorAll("th")) {
      const el = th;
      widths.set(el, Number.parseInt(el.dataset.preferredWidth ?? "") || Number.parseInt(el.getAttribute("width") ?? "") || Number.parseInt(el.dataset.minWidth ?? "") || Number.parseInt(getComputedStyle(el).minWidth || "") || 0);
    }
    const preferredWidth = (th) => widths.get(th) ?? 0;
    const items = sortByPriority([...headerRow.querySelectorAll("th[field]")].reverse().filter((th) => {
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
    const fixedWidth = [...headerRow.querySelectorAll("th:not([field])")].filter((th) => {
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
    let visible = [...headerRow.querySelectorAll("th[field]")].map((th) => {
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
    const footer = table.querySelector("tfoot");
    if (footer) {
      const realFooterWidth = [
        ...footer.querySelectorAll(".dg-footer > div")
      ].reduce((result, div) => {
        return result + div.offsetWidth;
      }, 0);
      const availableFooterWidth = footer.offsetWidth - realFooterWidth;
      if (realFooterWidth > size) {
        footer.classList.add("dg-footer-compact");
      } else if (availableFooterWidth > 250) {
        footer.classList.remove("dg-footer-compact");
      }
    }
    table.style.visibility = "visible";
  }
  computeLabelWidth() {
    let idealWidth = 0;
    const hCols = this.grid.querySelectorAll(".dg-head-columns th");
    for (const hCol of hCols) {
      if (idealWidth >= 120) {
        break;
      }
      idealWidth += hCol.offsetWidth;
    }
    return idealWidth;
  }
  _dataRows() {
    return Array.from(this.grid.querySelectorAll("tbody > tr.dg-data-row"));
  }
  _isEssential(column) {
    if (!column?.field) {
      return false;
    }
    if (column.responsive === 0 || column.hidden || column.frozen === "start") {
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
      const id = this.grid.getColumnId(column);
      const td = tr.querySelector(`:scope > td[data-column-id="${id}"]`);
      if (td) {
        tr.appendChild(td);
      }
    }
  }
  _setToggleIcon(tr, expanded) {
    const control = tr.querySelector(`.${RESPONSIVE_CLASS}-toggle-control`);
    const rowIndex = Number.parseInt(tr.dataset.rowIndex ?? "0", 10) || 0;
    const row = this.grid.rows[rowIndex] ?? {};
    if (control) {
      control.setAttribute("aria-expanded", String(expanded));
      control.setAttribute("aria-label", this.grid.formatLabel(expanded ? this.grid.labels.hideHiddenColumns : this.grid.labels.showHiddenColumns, {
        row: this.grid.getRowLabel(row, rowIndex)
      }));
      control.classList.toggle(`${RESPONSIVE_CLASS}-toggle-control-open`, expanded);
    }
  }
  _setRowExpanded(tr, expanded) {
    tr.dataset.responsiveExpanded = String(expanded);
    const childRow = tr.nextElementSibling;
    const hasChildRow = childRow?.classList.contains(`${RESPONSIVE_CLASS}-child-row`);
    if (expanded) {
      if (hasChildRow) {
        return;
      }
      const hiddenCols = tr.querySelectorAll(`.${RESPONSIVE_CLASS}-hidden`);
      if (!hiddenCols.length) {
        return;
      }
      this._canonicalizeRow(tr);
      tr.classList.add(`${RESPONSIVE_CLASS}-expanded`);
      const rowIndex = Number.parseInt(tr.dataset.rowIndex ?? "0", 10) || 0;
      const { row: detailRow, cell: detailTd } = createSpanningRow(this.grid, {
        id: this._detailId(rowIndex),
        className: `${RESPONSIVE_CLASS}-child-row`
      });
      tr.after(detailRow);
      const childTable = document.createElement("table");
      detailTd.appendChild(childTable);
      childTable.classList.add(`${RESPONSIVE_CLASS}-table`);
      const idealWidth = this.computeLabelWidth();
      for (const col of tr.querySelectorAll(`.${RESPONSIVE_CLASS}-hidden`)) {
        const childTableRow = document.createElement("tr");
        const labelCol = document.createElement("th");
        labelCol.style.width = `${idealWidth}px`;
        labelCol.textContent = col.dataset.name ?? "";
        childTableRow.append(labelCol, col);
        childTable.appendChild(childTableRow);
        col.removeAttribute("hidden");
      }
      this._setToggleIcon(tr, true);
      return;
    }
    if (childRow && hasChildRow) {
      for (const col of childRow.querySelectorAll(`.${RESPONSIVE_CLASS}-hidden`)) {
        tr.appendChild(col);
        col.setAttribute("hidden", "");
      }
      childRow.remove();
      this._canonicalizeRow(tr);
    }
    tr.classList.remove(`${RESPONSIVE_CLASS}-expanded`);
    this._setToggleIcon(tr, false);
  }
  _restoreDetails() {
    for (const childRow of this.grid.querySelectorAll(`tbody tr.${RESPONSIVE_CLASS}-child-row`)) {
      const tr = childRow.previousElementSibling;
      if (tr) {
        for (const col of childRow.querySelectorAll(`.${RESPONSIVE_CLASS}-hidden`)) {
          tr.appendChild(col);
          col.setAttribute("hidden", "");
        }
        this._canonicalizeRow(tr);
        tr.classList.remove(`${RESPONSIVE_CLASS}-expanded`);
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
  updateLabels() {
    for (const tr of this._dataRows()) {
      this._setToggleIcon(tr, tr.dataset.responsiveExpanded === "true");
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
    this.blockObserver();
    this._setRowExpanded(tr, tr.dataset.responsiveExpanded !== "true");
    this.unblockObserver();
  }
}
var responsive_grid_default = ResponsiveGrid;

// src/utils/interpolate.js
function interpolate(str, data) {
  return str.replace(/\{([^}]+)?\}/g, ($1, $2) => data[$2] ?? "");
}

// src/plugins/row-actions.js
class RowActions extends base_plugin_default {
  constructor(grid) {
    super(grid);
    this.menu = null;
  }
  connected() {
    const menu = this.grid.ownerDocument.createElement("ul");
    if (!supportsPopoverAnchor()) {
      return;
    }
    menu.id = randstr("dg-actions-menu-");
    menu.className = "dg-menu dg-actions-menu";
    menu.popover = "auto";
    menu.addEventListener("click", () => menu.hidePopover?.(), true);
    this.grid.appendChild(menu);
    this.menu = menu;
    this.grid.addEventListener("click", this);
  }
  disconnected() {
    this.grid.removeEventListener("click", this);
    this.menu?.remove();
    this.menu = null;
  }
  onclick(event) {
    const target = event.target;
    if (!(target instanceof Element) || !this.grid._ownsControl(target)) {
      return;
    }
    const toggle = target.closest(".dg-actions-toggle");
    if (!toggle) {
      return;
    }
    const tr = toggle.closest("tr.dg-data-row");
    if (!tr) {
      return;
    }
    const rowIndex = Number(tr.dataset.rowIndex);
    const row = this.grid.rows[rowIndex];
    if (!tr || !row) {
      return;
    }
    this.renderActionMenu(row);
  }
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
      align: "end",
      sortable: false,
      title: "",
      class: "dg-actions",
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
    const toggles = this.grid.querySelectorAll(".dg-actions-toggle");
    for (const toggle of toggles) {
      toggle.setAttribute("aria-label", toggleLabel);
      toggle.setAttribute("title", toggleLabel);
    }
  }
  beforeRender() {
    this.menu?.hidePopover?.();
  }
  afterRender() {
    this.syncCellModes();
  }
  syncCellModes() {
    const grid = this.grid;
    const collapse = grid.options.collapseActions;
    let maxCount = 0;
    for (const row of grid.rows ?? []) {
      let count = 0;
      const actions = grid.getActionsForRow(row);
      const rowKey = grid.resolveRowKey(row);
      for (const action of actions) {
        if (action.visible && !action.visible(row, { grid, action, rowKey })) {
          continue;
        }
        count++;
      }
      if (count > maxCount) {
        maxCount = count;
      }
    }
    let mode = "dg-actions-inline";
    if (this.menu && (collapse || maxCount > 2)) {
      mode = "dg-actions-more";
    } else if (maxCount > 0 && maxCount <= 2) {
      mode = `dg-actions-${maxCount}`;
    }
    const cells = grid.querySelectorAll('[data-column-id="$actions"]');
    for (const cell of cells) {
      cell.classList.remove("dg-actions-1", "dg-actions-2", "dg-actions-more", "dg-actions-inline");
      cell.classList.add(mode);
    }
  }
  renderActionMenu(row) {
    const grid = this.grid;
    const menu = this.menu;
    if (!menu) {
      return;
    }
    const labels2 = grid.labels;
    const rowIndex = grid.rows.indexOf(row);
    menu.replaceChildren();
    const rowKey = grid.resolveRowKey(row, rowIndex);
    for (const action of grid.getActionsForRow(row)) {
      if (action.visible && !action.visible(row, { grid, action, rowKey })) {
        continue;
      }
      const li = grid.ownerDocument.createElement("li");
      const { el } = this.createActionElement(action, row, rowIndex, grid, labels2, true);
      li.appendChild(el);
      menu.appendChild(li);
    }
  }
  makeActionRow({ row, tr, grid, rowIndex }) {
    const labels2 = grid.labels;
    const rowData = row ?? {};
    const actions = grid.getActionsForRow(rowData);
    const fragment = document.createDocumentFragment();
    if (!actions.length) {
      return fragment;
    }
    if (this.menu) {
      const actionsToggle = document.createElement("button");
      actionsToggle.type = "button";
      actionsToggle.classList.add("dg-actions-toggle");
      actionsToggle.textContent = "⋯";
      actionsToggle.setAttribute("aria-label", labels2.toggleActions);
      actionsToggle.setAttribute("popovertarget", this.menu.id);
      actionsToggle.title = labels2.toggleActions;
      fragment.appendChild(actionsToggle);
    }
    let defaultApplied = false;
    const rowKey = grid.resolveRowKey(rowData, rowIndex ?? 0);
    for (const action of actions) {
      if (action.visible && !action.visible(rowData, { grid, action, rowKey })) {
        continue;
      }
      const { el } = this.createActionElement(action, rowData, rowIndex ?? 0, grid, labels2);
      fragment.appendChild(el);
      if (action.default) {
        if (defaultApplied) {
          grid.log(`multiple default actions for row ${rowKey}, using the first one`);
        } else {
          defaultApplied = true;
          el.dataset.dgDefaultAction = "";
          if (grid.options.rowClick === "action" && tr && el.getAttribute("aria-disabled") !== "true") {
            tr.classList.add("dg-clickable-row");
          }
        }
      }
    }
    return fragment;
  }
  activateDefaultAction(rowIndex) {
    const tr = this.grid.tbody?.querySelector(`tr.dg-data-row[data-row-index="${rowIndex}"]`);
    const action = tr?.querySelector("[data-dg-default-action]");
    if (action instanceof HTMLElement) {
      action.click();
    }
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
        applyContent(el, content);
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
      el.classList.add(...action.class.trim().split(/\s+/));
    }
    const isDisabled = typeof action.disabled === "function" ? action.disabled(row, ctx) : Boolean(action.disabled);
    if (isDisabled) {
      if (el.tagName === "BUTTON") {
        el.disabled = true;
      }
      el.setAttribute("aria-disabled", "true");
      el.classList.add("dg-disabled");
    }
    const message = resolveActionConfirmation(action.confirm, labels2.areYouSure, row, ctx);
    const dispatchAction = (ev) => {
      ev.stopPropagation();
      if (isDisabled) {
        ev.preventDefault();
        return;
      }
      if (message !== null && !window.confirm(message)) {
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
}
var row_actions_default = RowActions;

// src/plugins/editable-column.js
class EditableColumn extends base_plugin_default {
  afterRender(context) {
    if (context !== "body") {
      return;
    }
    const grid = this.grid;
    const columns = new Map;
    for (const column of grid.getColumns()) {
      columns.set(grid.getColumnId(column), column);
    }
    const cells = grid.querySelectorAll("tbody td.dg-editable-col");
    for (const td of cells) {
      const rowIndex = Number.parseInt(td.dataset.rowIndex ?? "");
      const column = columns.get(td.getAttribute("data-column-id") ?? "");
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
    input.value = item[field] ?? "";
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
      if (!dispatch(grid, "edit", { data: item, value, field, column }, { cancelable: true })) {
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
    const cls = classes.trim().split(/\s+/).map((e) => `.${e}`).join("");
    const template = `
<style id="dg-styles">
  data-grid ${cls} { position: absolute; top: 37%; left: 47%; z-index: 999; }
  data-grid:not(.dg-loading) ${cls} { display: none; }
  data-grid:not(.dg-initialized).dg-loading ${cls} { top: 0; }
</style>
`;
    if (!document.querySelector("#dg-styles")) {
      const styleParent = document.querySelector("head") ?? document.querySelector("body");
      if (styleParent) {
        const position = /head/i.test(styleParent.tagName) ? "beforeend" : "afterbegin";
        styleParent.insertAdjacentHTML(position, template);
      }
    }
    if (!grid.querySelector(`i${cls}`)) {
      grid.insertAdjacentHTML("afterbegin", `<i class="${classes}"></i>`);
    }
  }
}
var spinner_support_default = SpinnerSupport;

// src/plugins/save-state.js
class SaveState extends base_plugin_default {
  constructor(grid) {
    super(grid);
    this.cachedState = null;
    this.onBodyRendered = null;
    this.onScroll = null;
    this.log("Init");
  }
  connected() {
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
    this.onBodyRendered = () => this._update();
    this.onScroll = debounce(() => this._update(), 200);
    grid.addEventListener("bodyRendered", this.onBodyRendered);
    document.addEventListener("scroll", this.onScroll);
  }
  disconnected() {
    const grid = this.grid;
    if (this.onBodyRendered) {
      grid.removeEventListener("bodyRendered", this.onBodyRendered);
      this.onBodyRendered = null;
    }
    if (this.onScroll) {
      document.removeEventListener("scroll", this.onScroll);
      this.onScroll = null;
    }
  }
  _update() {
    const grid = this.grid;
    if (!grid.options.saveState || !grid.classList.contains("dg-initialized")) {
      return;
    }
    this._setState({
      query: grid.query,
      columns: grid.options.columns.map((col) => ({ field: col.field ?? "", hidden: Boolean(col.hidden) }))
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
    try {
      sessionStorage.setItem(`gridSaveState_${this.grid.id}`, JSON.stringify(state));
    } catch (_) {}
  }
}
var save_state_default = SaveState;

// src/plugins/row-details.js
var DETAILS_CLASS = "dg-row-details";

class RowDetails extends base_plugin_default {
  constructor(grid) {
    super(grid);
    this.expanded = new Set;
    this.collapsed = new Set;
  }
  connected() {
    this.grid.addEventListener("click", this);
  }
  disconnected() {
    this.grid.removeEventListener("click", this);
  }
  onclick(event) {
    const target = event.target;
    if (!(target instanceof Element) || !this.grid._ownsControl(target)) {
      return;
    }
    const button = target.closest(`.${DETAILS_CLASS}-toggle-control`);
    if (!button) {
      return;
    }
    event.stopPropagation();
    const tr = button.closest("tr.dg-data-row");
    if (!tr) {
      return;
    }
    const rowIndex = Number.parseInt(tr.dataset.rowIndex ?? "", 10);
    const row = this.grid.rows[rowIndex];
    if (!Number.isInteger(rowIndex) || !row) {
      return;
    }
    const key = this.grid.resolveRowKey(row, rowIndex);
    this.toggle(key);
  }
  extendColumns(columns) {
    if (typeof this.grid.options.rowDetails !== "function") {
      return;
    }
    columns.unshift({
      id: "$details",
      virtual: true,
      position: "start",
      frozen: "start",
      width: 40,
      sortable: false,
      title: "",
      class: `${DETAILS_CLASS}-toggle`,
      renderHeaderCell: (th) => th.classList.add("dg-not-resizable", "dg-not-sortable"),
      renderFilterCell: () => {},
      renderCell: (ctx) => this.createToggle(ctx)
    });
  }
  isExpanded(rowKey) {
    return this.expanded.has(String(rowKey));
  }
  expand(rowKey) {
    this._change(rowKey, true);
  }
  collapse(rowKey) {
    this._change(rowKey, false);
  }
  toggle(rowKey) {
    this._change(rowKey, !this.isExpanded(rowKey));
  }
  collapseAll() {
    for (const key of this.expanded) {
      this.collapsed.add(key);
    }
    this.expanded.clear();
    this.grid.renderBody();
  }
  _change(rowKey, expanded) {
    const key = String(rowKey);
    const index = this.grid.rows.findIndex((row, rowIndex) => this.grid.resolveRowKey(row, rowIndex) === key);
    if (index < 0) {
      return;
    }
    if (expanded) {
      this.expanded.add(key);
      this.collapsed.delete(key);
    } else {
      this.expanded.delete(key);
      this.collapsed.add(key);
    }
    const tr = this.grid.tbody?.querySelector(`tr.dg-data-row[data-row-index="${index}"]`);
    if (tr) {
      this._setRowExpanded(tr, this.grid.rows[index], index, expanded, true);
    }
  }
  _detailId(rowIndex) {
    return `dg-row-detail-${this.grid.id}-${rowIndex}`;
  }
  createToggle({ row = {}, rowIndex = 0 }) {
    const key = this.grid.resolveRowKey(row, rowIndex);
    const expanded = this.isExpanded(key);
    const button = document.createElement("button");
    button.type = "button";
    button.className = `dg-clickable-cell ${DETAILS_CLASS}-toggle-control`;
    button.setAttribute("aria-controls", this._detailId(rowIndex));
    this._syncToggle(button, row, rowIndex, expanded);
    button.innerHTML += `<svg aria-hidden="true" viewBox="0 0 24 24" width="24" height="24"><path d="m9 6 6 6-6 6" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/></svg>`;
    return button;
  }
  _syncToggle(button, row, rowIndex, expanded) {
    button.setAttribute("aria-expanded", String(expanded));
    button.setAttribute("aria-label", this.grid.formatLabel(expanded ? this.grid.labels.hideDetails : this.grid.labels.showDetails, {
      row: this.grid.getRowLabel(row, rowIndex)
    }));
    button.classList.toggle(`${DETAILS_CLASS}-toggle-control-open`, expanded);
  }
  _setRowExpanded(tr, row, rowIndex, expanded, emit) {
    const key = this.grid.resolveRowKey(row, rowIndex);
    const button = tr.querySelector(`.${DETAILS_CLASS}-toggle-control`);
    if (button) {
      this._syncToggle(button, row, rowIndex, expanded);
    }
    const id = this._detailId(rowIndex);
    const current = document.getElementById(id);
    if (!expanded) {
      current?.remove();
    } else if (!current) {
      const renderer = this.grid.options.rowDetails;
      if (typeof renderer !== "function") {
        return;
      }
      const { row: detailRow, cell: td } = createSpanningRow(this.grid, {
        id,
        className: `${DETAILS_CLASS}-row`
      });
      applyContent(td, renderer({ row, rowKey: key, grid: this.grid }));
      const responsiveRow = tr.nextElementSibling?.classList.contains("dg-responsive-child-row") ? tr.nextElementSibling : null;
      const anchor = responsiveRow || tr;
      anchor.parentNode?.insertBefore(detailRow, anchor.nextSibling);
    }
    if (emit) {
      dispatch(this.grid, "rowDetailsToggle", { row, rowKey: key, expanded });
    }
  }
  afterRender(context) {
    if (context !== "body" || typeof this.grid.options.rowDetails !== "function") {
      return;
    }
    for (const tr of this.grid.querySelectorAll("tbody > tr.dg-data-row")) {
      const rowIndex = Number.parseInt(tr.dataset.rowIndex ?? "0", 10) || 0;
      const row = this.grid.rows[rowIndex];
      if (!row) {
        continue;
      }
      const key = this.grid.resolveRowKey(row, rowIndex);
      if (this.grid.options.rowDetailsStartOpen && !this.collapsed.has(key)) {
        this.expanded.add(key);
      }
      if (this.expanded.has(key)) {
        this._setRowExpanded(tr, row, rowIndex, true, false);
      }
    }
  }
  updateLabels() {
    for (const tr of this.grid.querySelectorAll("tbody > tr.dg-data-row")) {
      const rowIndex = Number.parseInt(tr.dataset.rowIndex ?? "0", 10) || 0;
      const row = this.grid.rows[rowIndex];
      const button = tr.querySelector(`.${DETAILS_CLASS}-toggle-control`);
      if (row && button) {
        this._syncToggle(button, row, rowIndex, this.isExpanded(this.grid.resolveRowKey(row, rowIndex)));
      }
    }
  }
}
var row_details_default = RowDetails;

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
  SaveState: save_state_default,
  RowDetails: row_details_default
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
