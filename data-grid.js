/**
 * Data Grid Web component
 *
 * Credits for inspiration
 * @link https://github.com/riverside/zino-grid
 */
"use strict";

/**
 * @typedef Column
 * @property {string} field - the key in the data
 * @property {string} title - the title to display in the header (defaults to "field" if not set)
 * @property {number} width - the width of the column (auto otherwise)
 * @property {string} class - class to set on the column (target body or header with th.class or td.class)
 * @property {string} attr - don't render the column and set a matching attribute on the row with the value of the field
 * @property {boolean} hidden - hide the column
 * @property {boolean} editable - replace with input
 */

/**
 * @typedef Action
 * @property {string} title - the title of the button
 * @property {string} url - link for the action
 * @property {string} html - custom button data
 */

const labels = Object.assign(
  {
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
  },
  window.DataGridLabels || {}
);
const template = document.createElement("template");
template.innerHTML = `
<table role="grid" >
    <thead role="rowgroup">
        <tr role="row" aria-rowindex="1" class="dg-head-columns"></tr>
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

/**
 * @property {Column[]} state.columns
 * @property {Action[]} state.actions
 */
class DataGrid extends HTMLElement {
  constructor(options = {}) {
    super();

    // Don't use shadow dom as it makes theming super hard
    this.appendChild(template.content.cloneNode(true));
    this.root = this;

    this.state = {
      // reflected and observed
      url: null,
      page: 1,
      perPage: 10,
      debug: false,
      filter: false,
      sort: false,
      defaultSort: "",
      reorder: false,
      dir: "ltr",
      // not reflected
      pages: 0,
      perPageValues: [10, 25, 50, 100, 250],
      columns: [],
      actions: [],
    };
    this.setOptions(options);

    // The grid displays data
    this.data = [];
    // We store the data in this
    this.originalData = [];

    // Init values
    this.isInitialized = false;
    this.touch = null;
    this.isResizing = false;
    this.defaultHeight = 0;

    // Set id
    if (!this.hasAttribute("id")) {
      this.setAttribute("id", DataGrid.randstr("dg-"));
    }

    this.log("constructor");
  }

  // utils

  /**
   * @param {string} str
   * @param {Object} data
   * @returns {string}
   */
  static interpolate(str, data) {
    return str.replace(/\{([^\}]+)?\}/g, function ($1, $2) {
      return data[$2];
    });
  }

  /**
   * @param {HTMLElement} el
   * @param {string} type
   * @param {string} prop
   * @returns {HTMLElement}
   */
  static getParentNode(el, type, prop = "nodeName") {
    let parent = el;
    while (parent[prop] != type) {
      parent = parent.parentNode;
    }
    return parent;
  }

  /**
   * Uses canvas.measureText to compute and return the width of the given text of given font in pixels.
   * @see https://stackoverflow.com/questions/118241/calculate-text-width-with-javascript/21015393#21015393
   * @param {string} text The text to be rendered.
   * @param {HTMLElement} el Target element (defaults to body)
   * @return {number}
   */
  static getTextWidth(text, el = document.body) {
    const styles = window.getComputedStyle(el, null);
    const fontWeight = styles.getPropertyValue("font-weight") || "normal";
    const fontSize = styles.getPropertyValue("font-size") || "1rem";
    const fontFamily = styles.getPropertyValue("font-family") || "Arial";

    // re-use canvas object for better performance
    const canvas = DataGrid.getTextWidth.canvas || (DataGrid.getTextWidth.canvas = document.createElement("canvas"));
    const context = canvas.getContext("2d");
    context.font = `${fontWeight} ${fontSize} ${fontFamily}`;
    const metrics = context.measureText(text);
    return parseInt(metrics.width);
  }

  /**
   * @param {HTMLElement} el
   * @param {string} value
   * @param {string} label
   * @param {boolean} checked
   */
  static addSelectOption(el, value, label, checked = false) {
    let opt = document.createElement("option");
    opt.value = value;
    if (checked) {
      opt.selected = "selected";
    }
    opt.label = label;
    el.appendChild(opt);
  }
  /**
   * @param {string} prefix
   * @returns {string}
   */
  static randstr(prefix) {
    return Math.random()
      .toString(36)
      .replace("0.", prefix || "");
  }
  /**
   * @param {string|Array} v
   * @returns
   */
  static convertArray(v) {
    if (typeof v === "string") {
      if (v[0] === "{") {
        return JSON.parse(v);
      }
      return v.split(",");
    }
    if (!Array.isArray(v)) {
      console.error("Invalid array", v);
    }
    return v;
  }
  /**
   * @param {HTMLElement} el
   * @returns {Object}
   */
  static elementOffset(el) {
    var rect = el.getBoundingClientRect(),
      scrollLeft = window.pageXOffset || document.documentElement.scrollLeft,
      scrollTop = window.pageYOffset || document.documentElement.scrollTop;
    return { top: rect.top + scrollTop, left: rect.left + scrollLeft };
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
   * @returns {Object}
   */
  static convertColumns(columns) {
    let cols = [];
    // Convert objects to array
    if (typeof columns === "object" && !Array.isArray(columns)) {
      Object.keys(columns).forEach((key) => {
        let col = {};
        col.title = columns[key];
        col.field = key;
        cols.push(col);
      });
    } else {
      columns.forEach((item) => {
        let col = {};
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

  // reflected attrs, see https://gist.github.com/WebReflection/ec9f6687842aa385477c4afca625bbf4#reflected-dom-attributes

  static get observedAttributes() {
    return ["url", "page", "per-page", "debug", "filter", "sort", "default-sort", "dir", "reorder"];
  }
  attributeChangedCallback(attributeName, oldValue, newValue) {
    this.log("attributeChangedCallback: " + attributeName);

    // Update state but only trigger events if initialized
    switch (attributeName) {
      case "url":
        this.state.url = newValue;
        if (this.isInitialized && newValue) {
          this.loadData();
        }
        break;
      case "page":
        this.state.page = Number(newValue);
        if (this.isInitialized) {
          this.fixPage();
          this.paginate();
        }
        break;
      case "per-page":
        this.state.perPage = Number(newValue);
        if (this.isInitialized) {
          this.selectPerPage.value = newValue;
          this.fixPage();
          this.paginate();

          // Scroll and keep a sizable amount of data displayed
          if (this.sticky) {
            window.scroll({ top: DataGrid.elementOffset(this.selectPerPage).top - this.defaultHeight });
          }
        }
        break;
      case "debug":
        this.state.debug = newValue === "true";
        break;
      case "dir":
        this.state.dir = newValue;
        this.root.querySelector(".dg-wrapper").dir = this.state.dir;
        break;
      case "filter":
        this.state.filter = newValue === "true";
        if (this.isInitialized) {
          this.toggleFilter();
        }
        break;
      case "reorder":
        this.state.reorder = newValue === "true";
        if (this.isInitialized) {
          this.toggleReorder();
        }
        break;
      case "sort":
        this.state.sort = newValue === "true";
        if (this.isInitialized) {
          this.toggleSort();
        }
        break;
      case "default-sort":
        this.state.defaultSort = newValue;
        if (this.isInitialized) {
          this.toggleSort();
        }
        break;
    }
  }
  get page() {
    return this.getAttribute("page");
  }
  set page(val) {
    this.setAttribute("page", val);
  }
  get perPage() {
    return this.getAttribute("per-page");
  }
  set perPage(val) {
    this.setAttribute("per-page", val);
  }
  get debug() {
    return this.getAttribute("debug") === "true";
  }
  set debug(val) {
    this.setAttribute("debug", val);
  }
  get dir() {
    return this.getAttribute("dir");
  }
  set dir(val) {
    this.setAttribute("dir", val);
  }
  get filter() {
    return this.getAttribute("filter") === "true";
  }
  set filter(val) {
    this.setAttribute("filter", val);
  }
  get reorder() {
    return this.getAttribute("reorder") === "true";
  }
  set reorder(val) {
    this.setAttribute("reorder", val);
  }
  get sort() {
    return this.getAttribute("sort") === "true";
  }
  set sort(val) {
    this.setAttribute("sort", val);
  }
  get defaultSort() {
    return this.getAttribute("default-sort");
  }
  set defaultSort(val) {
    this.setAttribute("default-sort", val);
  }
  get url() {
    return this.getAttribute("url");
  }
  set url(val) {
    this.setAttribute("url", val);
  }

  // Boolean

  get autosize() {
    return this.hasAttribute("autosize");
  }
  set autosize(val) {
    val ? this.setAttribute("autosize", "") : this.removeAttribute("autosize");
  }
  get resizable() {
    return this.hasAttribute("resizable");
  }
  set resizable(val) {
    val ? this.setAttribute("resizable", "") : this.removeAttribute("resizable");
  }
  get sticky() {
    return this.hasAttribute("sticky");
  }
  set sticky(val) {
    val ? this.setAttribute("sticky", "") : this.removeAttribute("sticky");
  }
  get responsive() {
    return this.hasAttribute("responsive");
  }
  set responsive(val) {
    val ? this.setAttribute("responsive", "") : this.removeAttribute("responsive");
  }
  get expand() {
    return this.hasAttribute("expand");
  }
  set expand(val) {
    val ? this.setAttribute("expand", "") : this.removeAttribute("expand");
  }
  get selectable() {
    return this.hasAttribute("selectable");
  }
  set selectable(val) {
    val ? this.setAttribute("selectable", "") : this.removeAttribute("selectable");
  }

  // Not reflected

  get perPageValues() {
    return this.state.perPageValues;
  }
  set perPageValues(val) {
    if (Array.isArray(val)) {
      this.state.perPageValues = val;
      if (this.selectPerPage) {
        while (this.selectPerPage.lastChild) {
          this.selectPerPage.removeChild(this.selectPerPage.lastChild);
        }
        this.state.perPageValues.forEach((v) => {
          DataGrid.addSelectOption(this.selectPerPage, v, v);
        });
      }
    }
  }
  get columns() {
    return this.state.columns;
  }
  set columns(val) {
    this.state.columns = DataGrid.convertColumns(DataGrid.convertArray(val));
  }
  get actions() {
    return this.state.actions;
  }
  set actions(val) {
    this.state.actions = DataGrid.convertArray(val);
  }
  connectedCallback() {
    this.log("connectedCallback");

    this.btnFirst = this.root.querySelector(".dg-btn-first");
    this.btnPrev = this.root.querySelector(".dg-btn-prev");
    this.btnNext = this.root.querySelector(".dg-btn-next");
    this.btnLast = this.root.querySelector(".dg-btn-last");
    this.selectPerPage = this.root.querySelector(".dg-select-per-page");
    this.inputPage = this.root.querySelector(".dg-input-page");

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
    this.selectPerPage.addEventListener("change", this.changePerPage, {
      passive: true,
    });
    this.inputPage.addEventListener("input", this.gotoPage);

    // Touch support
    this.touchstart = this.touchstart.bind(this);
    this.touchmove = this.touchmove.bind(this);
    document.addEventListener("touchstart", this.touchstart);
    document.addEventListener("touchmove", this.touchmove);

    // Populate
    this.perPageValues = this.state.perPageValues;

    this.loadData();
    this.root.classList.add("dg-initialized");
    this.isInitialized = true;

    this.toggleSort();
    this.toggleFilter();
    this.toggleReorder();
  }
  disconnectedCallback() {
    this.log("disconnectedCallback");

    this.btnFirst.removeEventListener("click", this.getFirst);
    this.btnPrev.removeEventListener("click", this.getPrev);
    this.btnNext.removeEventListener("click", this.getNext);
    this.btnLast.removeEventListener("click", this.getLast);
    this.selectPerPage.removeEventListener("change", this.changePerPage, {
      passive: true,
    });
    this.inputPage.removeEventListener("input", this.gotoPage);

    // Touch support
    document.removeEventListener("touchstart", this.touchstart);
    document.removeEventListener("touchmove", this.touchmove);

    // Selectable
    if (this.selectAll) {
      this.selectAll.removeEventListener("change", this.toggleSelectAll);
    }

    // Context menu
    if (this.headerRow) {
      this.headerRow.removeEventListener("contextmenu", this.showContextMenu);
    }

    // TODO: what about the others listeners?
  }
  toggleSelectAll() {
    this.root.querySelectorAll("tbody .dg-selectable input").forEach((cb) => {
      cb.checked = this.selectAll.checked;
    });
  }
  touchstart(e) {
    this.touch = e.touches[0];
  }
  touchmove(e) {
    if (!this.touch) {
      return;
    }
    const xDiff = this.touch.clientX - e.touches[0].clientX;
    const yDiff = this.touch.clientY - e.touches[0].clientY;

    if (Math.abs(xDiff) > Math.abs(yDiff)) {
      if (xDiff > 0) {
        this.getNext();
      } else {
        this.getPrev();
      }
    }
    this.touch = null;
  }

  /**
   * @param {Object} options
   */
  setOptions(options) {
    for (const [key, value] of Object.entries(options)) {
      if (key in this) {
        this[key] = value;
        this.state[key] = value;
      }
    }
  }
  getColProp(field, prop) {
    this.state.columns.forEach((col) => {
      if (col.field == field) {
        return col[prop];
      }
    });
  }
  setColProp(field, prop, val) {
    this.state.columns.forEach((col) => {
      if (col.field == field) {
        col[prop] = val;
      }
    });
  }
  startIndex() {
    return this.selectable ? 2 : 1;
  }
  columnsLength(visibleOnly = false) {
    let len = 0;
    this.state.columns.forEach((col) => {
      if (visibleOnly && col.hidden) {
        return;
      }
      if (!col.attr) {
        len++;
      }
    });
    if (this.selectable) {
      len++;
    }
    if (this.state.actions.length) {
      len++;
    }
    return len;
  }
  computeDefaultHeight() {
    this.defaultHeight = this.root.querySelector("table").offsetHeight;
    if (this.style.height) {
      this.style.height = this.defaultHeight + "px";
      this.style.overflowY = "auto";
    }
    if (this.style.minHeight && parseInt(this.style.minHeight) > this.defaultHeight) {
      this.style.minHeight = this.defaultHeight + "px";
    }
  }
  /**
   * This needs to be called each time the data changes or the perPage value changes
   */
  fixPage() {
    this.state.pages = Math.ceil(this.data.length / this.state.perPage);

    // Constrain values
    if (this.state.pages < this.state.page) {
      this.state.page = this.state.pages;
    }
    if (this.state.page < 1) {
      this.state.page = 1;
    }

    // Show current page in input
    this.inputPage.setAttribute("max", this.state.pages);
    this.inputPage.value = this.state.page;
    this.inputPage.disabled = this.state.pages === 1;
  }
  toggleFilter() {
    const row = this.root.querySelector("thead tr.dg-head-filters");
    if (this.state.filter) {
      row.removeAttribute("hidden");
    } else {
      row.setAttribute("hidden", true);
    }
  }
  toggleReorder() {
    this.root.querySelectorAll("thead tr.dg-head-columns th").forEach((th) => {
      if (th.classList.contains("dg-selectable")) {
        return;
      }
      if (this.state.reorder) {
        th.draggable = true;
      } else {
        th.removeAttribute("draggable");
      }
    });
  }
  toggleSort() {
    this.log("toggle sort");
    this.root.querySelectorAll("thead tr.dg-head-columns th").forEach((th) => {
      if (th.classList.contains("dg-selectable")) {
        return;
      }
      if (this.state.sort) {
        th.setAttribute("aria-sort", "none");
      } else {
        th.removeAttribute("aria-sort");
      }
    });
  }
  addRow(row) {
    this.log("Add row");
    this.originalData.push(row);
    this.data = this.originalData.slice();
    this.fixPage();
    this.sortData();
  }
  removeRow(value = null, key = null) {
    if (key === null) {
      key = this.columns[0]["field"];
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
    this.fixPage();
    this.sortData();
  }
  getSelection(key = null) {
    let selectedData = [];
    this.data.forEach((item, i) => {
      const row = this.root.querySelector("tbody tr[aria-rowindex='" + (i + 1) + "']");
      const checkbox = row.querySelector(".dg-selectable input");
      if (checkbox.checked) {
        if (key) {
          selectedData.push(item[key]);
        } else {
          selectedData.push(item);
        }
      }
    });
    return selectedData;
  }
  getData() {
    return this.originalData;
  }
  clearData() {
    // Clear the state but keep attribute so we can reload
    this.state.url = null;
    if (this.data.length === 0) {
      return;
    }
    this.data = this.originalData = [];
    this.fixPage();
    this.renderHeader();
    this.computeDefaultHeight();
  }
  async loadData() {
    this.log("loadData");
    if (!this.url) {
      this.log("No url set yet");
      return;
    }
    let response = await this.fetchData();

    if (Array.isArray(response)) {
      this.data = response;
    } else {
      if (!response.data) {
        console.error("Invalid response, it should contain a data key with an array or be a plain array", response);
        return;
      }

      // We may have a config object
      if (response.options) {
        this.setOptions(response.options);
      }

      this.data = response.data;
    }
    this.originalData = this.data.slice();
    this.fixPage();

    // Make sure we have a proper set of columns
    if (this.state.columns.length === 0 && this.originalData.length) {
      this.state.columns = DataGrid.convertColumns(Object.keys(this.originalData[0]));
    }

    this.createMenu();
    this.root.querySelector("table").setAttribute("aria-rowcount", this.data.length);
    this.root.querySelector("tfoot").removeAttribute("hidden");
    this.renderHeader();
  }
  getFirst() {
    this.page = 1;
  }
  getLast() {
    this.page = this.state.pages;
  }
  getPrev() {
    this.page = this.state.page - 1;
  }
  getNext() {
    this.page = this.state.page + 1;
  }
  refresh() {
    this.loadData();
  }
  changePerPage() {
    this.perPage = this.selectPerPage.options[this.selectPerPage.selectedIndex].value;
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
    this.page = this.inputPage.value;
  }
  clearFilter() {
    this.root.querySelectorAll("thead input").forEach((input) => {
      input.value = "";
    });
    this.filterData();
  }
  filterData() {
    this.log("filter data");

    this.data = this.originalData.slice();

    this.root.querySelectorAll("thead input").forEach((input) => {
      let value = input.value;
      if (value) {
        let name = input.dataset.name;
        this.data = this.data.filter((item) => {
          let str = item[name] + "";
          return str.toLowerCase().indexOf(value.toLowerCase()) !== -1;
        });
      }
    });

    this.fixPage();

    let col = this.root.querySelector("thead tr.dg-head-columns th[aria-sort$='scending']");
    if (this.state.sort && col) {
      this.sortData(col);
    } else {
      this.renderBody();
    }
  }
  /**
   * Data will be sorted then rendered using renderBody
   * @param {string} col The clicked that was clicked or null to use current sort
   */
  sortData(col = null) {
    this.log("sort data");

    // We clicked on a column, update sort state
    if (col !== null) {
      // Remove active sort if any
      this.root.querySelectorAll("thead tr:first-child th").forEach((th) => {
        if (th.classList.contains("dg-selectable")) {
          return;
        }
        if (th !== col) {
          th.setAttribute("aria-sort", "none");
        }
      });

      // Set three-state col
      if (!col.hasAttribute("aria-sort") || col.getAttribute("aria-sort") === "none") {
        col.setAttribute("aria-sort", "ascending");
      } else if (col.getAttribute("aria-sort") === "ascending") {
        col.setAttribute("aria-sort", "descending");
      } else if (col.getAttribute("aria-sort") === "descending") {
        col.setAttribute("aria-sort", "none");
      }
    } else {
      // Or fetch current sort
      col = this.root.querySelector("thead tr.dg-head-columns th[aria-sort$='scending']");
    }

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
  fetchData() {
    let url = new URL(this.url, window.location.href);
    const params = {
      r: Math.ceil(Math.random() * 9999999),
    };

    Object.keys(params).forEach((key) => url.searchParams.append(key, params[key]));

    return fetch(url).then((response) => {
      return response.json();
    });
  }
  renderHeader() {
    this.log("render header");
    let tr;
    let sortedColumn;
    let thead = this.root.querySelector("thead");

    this.createColumnHeaders(thead);
    if (this.state.defaultSort) {
      // We can have a default sort even with sort disabled
      sortedColumn = this.root.querySelector("thead tr.dg-head-columns th[field='" + this.state.defaultSort + "']");
    }

    // Create column filters
    this.createColumnFilters(thead);

    // Configure table
    this.root.querySelector("table").setAttribute("aria-colcount", this.columnsLength(true).toString());
    this.root.querySelector("tfoot").querySelector("td").setAttribute("colspan", this.columnsLength(true).toString());

    if (sortedColumn) {
      this.sortData(sortedColumn);
    } else {
      this.renderBody();
    }

    this.root.querySelector("tfoot").style.display = "";
    if (this.resizable) {
      this.renderResizer();
    }
  }
  createColumnHeaders(thead) {
    const colMinWidth = 50;
    const colMaxWidth = parseInt((thead.offsetWidth / this.columnsLength(true)) * 2);

    let idx = 0;
    let tr;

    // Create row
    tr = document.createElement("tr");
    this.headerRow = tr;
    tr.setAttribute("role", "row");
    tr.setAttribute("aria-rowindex", 1);
    tr.setAttribute("class", "dg-head-columns");

    // Selectable
    if (this.selectable) {
      let selectableTh = document.createElement("th");
      selectableTh.setAttribute("role", "columnheader button");
      selectableTh.setAttribute("aria-colindex", 1);
      selectableTh.classList.add("dg-selectable");
      selectableTh.tabIndex = 0;

      this.selectAll = document.createElement("input");
      this.selectAll.type = "checkbox";
      this.selectAll.classList.add("dg-select-all");

      this.toggleSelectAll = this.toggleSelectAll.bind(this);
      this.selectAll.addEventListener("change", this.toggleSelectAll);

      let label = document.createElement("label");
      label.appendChild(this.selectAll);

      selectableTh.appendChild(label);
      selectableTh.setAttribute("width", 40);
      tr.appendChild(selectableTh);
    }

    // Create columns
    idx = 0;
    this.state.columns.forEach((column, i) => {
      if (column.attr) {
        return;
      }
      let th = document.createElement("th");
      th.setAttribute("role", "columnheader button");
      th.setAttribute("aria-colindex", idx + this.startIndex());
      th.setAttribute("id", DataGrid.randstr("dg-col-"));
      if (this.state.sort) {
        th.setAttribute("aria-sort", "none");
      }
      th.setAttribute("field", column.field);
      th.dataset.minWidth = DataGrid.getTextWidth(column.title, th) + 30;
      DataGrid.applyColumnDefinition(th, column);
      th.tabIndex = 0;
      th.textContent = column.title;

      if (column.hidden) {
        th.setAttribute("hidden", true);
      }

      // Autosize small based on first/last row ?
      if (this.autosize && !th.getAttribute("width")) {
        this.autosizeColumn(th, column, colMinWidth, colMaxWidth);
      }

      // Reorder columns with drag/drop
      if (this.state.reorder) {
        this.makeHeaderDraggable(th);
      }
      tr.appendChild(th);
      idx++;
    });

    // Actions
    if (this.state.actions.length) {
      let actionsTh = document.createElement("th");
      actionsTh.setAttribute("role", "columnheader button");
      actionsTh.setAttribute("aria-colindex", this.columnsLength(true));
      actionsTh.classList.add("dg-actions");
      actionsTh.tabIndex = 0;
      tr.appendChild(actionsTh);
    }

    thead.replaceChild(tr, thead.querySelector("tr.dg-head-columns"));

    // Context menu
    this.showContextMenu = this.showContextMenu.bind(this);
    tr.addEventListener("contextmenu", this.showContextMenu);

    // Sort col on click
    tr.querySelectorAll("[aria-sort]").forEach((sortableRow) => {
      sortableRow.addEventListener("click", () => this.sortData(sortableRow));
    });
  }
  createColumnFilters(thead) {
    let idx = 0;
    let tr;

    // Create row for filters
    tr = document.createElement("tr");
    this.filterRow = tr;
    tr.setAttribute("role", "row");
    tr.setAttribute("aria-rowindex", 2);
    tr.setAttribute("class", "dg-head-filters");
    if (!this.state.filter) {
      tr.setAttribute("hidden", true);
    }

    // Selectable
    if (this.selectable) {
      let th = document.createElement("th");
      th.setAttribute("role", "columnheader button");
      th.setAttribute("aria-colindex", 1);
      th.classList.add("dg-selectable");
      th.tabIndex = 0;
      tr.appendChild(th);
    }

    this.state.columns.forEach((column, i) => {
      if (column.attr) {
        return;
      }
      let relatedTh = thead.querySelector("tr.dg-head-columns th[aria-colindex='" + (idx + this.startIndex()) + "']");
      let th = document.createElement("th");
      th.setAttribute("aria-colindex", idx + this.startIndex());

      let input = document.createElement("input");
      input.type = "text";
      input.autocomplete = "off";
      input.spellcheck = false;
      // Allows binding filter to this column
      input.dataset.name = column.field;
      input.id = DataGrid.randstr("dg-filter-");
      // Don't use aria-label as it triggers autocomplete
      input.setAttribute("aria-labelledby", relatedTh.getAttribute("id"));
      if (!this.state.filter) {
        th.tabIndex = 0;
      } else {
        input.tabIndex = 0;
      }

      if (column.hidden) {
        th.setAttribute("hidden", true);
      }

      th.appendChild(input);
      tr.appendChild(th);
      idx++;
    });

    // Actions
    if (this.state.actions.length) {
      let actionsTh = document.createElement("th");
      actionsTh.setAttribute("role", "columnheader button");
      actionsTh.setAttribute("aria-colindex", this.columnsLength(true));
      actionsTh.classList.add("dg-actions");
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
  autosizeColumn(th, column, min, max) {
    let v = this.data[0][column.field].toString();
    let v2 = this.data[this.data.length - 1][column.field].toString();
    if (v2.length > v.length) {
      v = v2;
    }
    if (v.length <= 6) {
      th.setAttribute("width", min);
    } else if (v.length > 50) {
      th.setAttribute("width", max);
    } else {
      th.setAttribute("width", DataGrid.getTextWidth(v, th));
    }
  }
  showContextMenu(e) {
    e.preventDefault();

    const target = DataGrid.getParentNode(e.target, "THEAD");
    const menu = this.root.querySelector(".dg-menu");
    const rect = target.getBoundingClientRect();
    const x = e.clientX - rect.left;
    const y = e.clientY - rect.top;

    menu.style.top = `${y}px`;
    menu.style.left = `${x}px`;

    menu.removeAttribute("hidden");

    const documentClickHandler = (e) => {
      if (!menu.contains(e.target)) {
        menu.setAttribute("hidden", true);
        document.removeEventListener("click", documentClickHandler);
      }
    };
    document.addEventListener("click", documentClickHandler);
  }
  createMenu() {
    const menu = this.root.querySelector(".dg-menu");
    this.state.columns.forEach((col) => {
      if (col.attr) {
        return;
      }
      const field = col.field;
      const li = document.createElement("li");
      const label = document.createElement("label");
      const checkbox = document.createElement("input");
      checkbox.setAttribute("type", "checkbox");
      if (!col.hidden) {
        checkbox.checked = true;
      }
      checkbox.addEventListener("change", (e) => {
        e.target.checked ? this.showColumn(field, e.target) : this.hideColumn(field, e.target);
      });

      const text = document.createTextNode(col.title);

      label.appendChild(checkbox);
      label.appendChild(text);

      li.appendChild(label);
      menu.appendChild(li);
    });
  }
  showColumn(field, checkbox = null) {
    if (checkbox) {
      checkbox.checked = true;
    }
    this.setColProp(field, "hidden", false);
    this.renderHeader();
  }
  hideColumn(field, checkbox = null) {
    const numHiddenCols = this.state.columns.filter((th) => {
      return th.hidden === true;
    }).length;

    if (numHiddenCols === this.columnsLength() - 1) {
      // Restore checkbox value
      if (checkbox) {
        checkbox.checked = true;
      }
      return;
    }
    this.setColProp(field, "hidden", true);
    this.renderHeader();
  }
  makeHeaderDraggable(th) {
    th.draggable = true;
    th.addEventListener("dragstart", (e) => {
      if (this.isResizing && e.preventDefault) {
        e.preventDefault();
        return;
      }
      this.log("reorder col");
      e.dataTransfer.effectAllowed = "move";
      e.dataTransfer.setData("text/plain", e.target.getAttribute("aria-colindex"));
    });
    th.addEventListener("dragover", (e) => {
      if (e.preventDefault) {
        e.preventDefault();
      }
      e.dataTransfer.dropEffect = "move";
      return false;
    });
    th.addEventListener("drop", (e) => {
      if (e.stopPropagation) {
        e.stopPropagation();
      }
      const target = DataGrid.getParentNode(e.target, "TH");
      const index = e.dataTransfer.getData("text/plain");
      const targetIndex = target.getAttribute("aria-colindex");

      if (index === targetIndex) {
        this.log("reordered col stayed the same");
        return;
      }
      this.log("reordered col from " + index + " to " + targetIndex);

      const tmp = this.state.columns[index - 1];
      this.state.columns[index - 1] = this.columns[targetIndex - 1];
      this.state.columns[targetIndex - 1] = tmp;

      const swapNodes = (selector, el1) => {
        const rowIndex = el1.parentNode.getAttribute("aria-rowindex");
        const el2 = this.root.querySelector(selector + " tr[aria-rowindex='" + rowIndex + "'] [aria-colindex='" + targetIndex + "']");
        el1.setAttribute("aria-colindex", targetIndex);
        el2.setAttribute("aria-colindex", index);
        const newNode = document.createElement("th");
        el1.parentNode.insertBefore(newNode, el1);
        el2.parentNode.replaceChild(el1, el2);
        newNode.parentNode.replaceChild(el2, newNode);
      };

      // Swap all rows in header and body
      this.root.querySelectorAll("thead th[aria-colindex='" + index + "']").forEach((el1) => {
        swapNodes("thead", el1);
      });
      this.root.querySelectorAll('tbody td[aria-colindex="' + index + '"]').forEach((el1) => {
        swapNodes("tbody", el1);
      });

      return false;
    });
  }
  renderResizer() {
    const table = this.root.querySelector("table");
    const cols = this.root.querySelectorAll("thead tr.dg-head-columns th");

    cols.forEach((col) => {
      if (col.classList.contains("dg-selectable")) {
        return;
      }
      // Create a resizer element
      const resizer = document.createElement("div");
      resizer.classList.add("dg-resizer");
      resizer.ariaLabel = labels.resizeColumn;

      // Add a resizer element to the column
      col.appendChild(resizer);

      // Handle resizing
      let startX = 0;
      let startW = 0;
      let remainingSpace = 0;
      let max = 0;

      const mouseMoveHandler = (e) => {
        if (e.clientX > max) {
          return;
        }
        const newWidth = startW + (e.clientX - startX);
        if (col.dataset.minWidth && newWidth > col.dataset.minWidth) {
          col.width = newWidth;
        }
      };

      // When user releases the mouse, remove the existing event listeners
      const mouseUpHandler = () => {
        this.log("resized column");

        this.isResizing = false;
        resizer.classList.remove("dg-resizer-active");
        if (this.state.reorder) {
          col.draggable = true;
        }
        col.style.overflow = "hidden";

        document.removeEventListener("mousemove", mouseMoveHandler);
        document.removeEventListener("mouseup", mouseUpHandler);
      };

      // Otherwise it could sort the col
      resizer.addEventListener("click", (e) => {
        e.stopPropagation();
      });

      resizer.addEventListener("mousedown", (e) => {
        e.stopPropagation();
        this.isResizing = true;

        const currentCols = this.root.querySelectorAll(".dg-head-columns th");
        const visibleCols = Array.from(currentCols).filter((col) => {
          return !col.hasAttribute("hidden");
        });
        const columns = Array.from(visibleCols);
        const columnIndex = columns.findIndex((column) => column == e.target.parentNode);
        this.log("resize column");

        resizer.classList.add("dg-resizer-active");

        // Make sure we don't drag it
        if (col.hasAttribute("draggable")) {
          col.removeAttribute("draggable");
        }

        // Allow overflow when resizing
        col.style.overflow = "visible";

        // Show full column height (-1 to avoid scrollbar)
        resizer.style.height = table.offsetHeight - 1 + "px";

        // Register initial data
        startX = e.clientX;
        startW = col.offsetWidth;

        remainingSpace = (visibleCols.length - columnIndex) * 30;
        max = DataGrid.elementOffset(this).left + this.offsetWidth - remainingSpace;

        // Remove width from next columns to allow auto layout
        col.setAttribute("width", startW);
        for (let j = 0; j < visibleCols.length; j++) {
          if (j > columnIndex) {
            cols[j].removeAttribute("width");
          }
        }

        // Attach handlers
        document.addEventListener("mousemove", mouseMoveHandler);
        document.addEventListener("mouseup", mouseUpHandler);
      });
    });
  }
  renderBody() {
    this.log("render body");
    let tr;
    let td;
    let idx;
    let tbody = document.createElement("tbody");
    this.data.forEach((item, i) => {
      tr = document.createElement("tr");
      tr.setAttribute("role", "row");
      tr.setAttribute("hidden", true);
      tr.setAttribute("aria-rowindex", i + 1);
      tr.tabIndex = 0;

      // Selectable
      if (this.selectable) {
        td = document.createElement("td");
        td.setAttribute("role", "gridcell button");
        td.setAttribute("aria-colindex", 1);
        td.classList.add("dg-selectable");

        let selectOne = document.createElement("input");
        selectOne.type = "checkbox";
        let label = document.createElement("label");
        label.appendChild(selectOne);
        td.appendChild(label);

        tr.appendChild(td);
      }

      idx = 0;
      this.state.columns.forEach((column, j) => {
        if (!column) {
          console.log(this.state.columns);
        }
        // It should be applied as an attr of the row
        if (column.attr) {
          tr.setAttribute(column.attr, item[column.field]);
          return;
        }
        td = document.createElement("td");
        td.setAttribute("role", "gridcell");
        td.setAttribute("aria-colindex", idx + this.startIndex());
        DataGrid.applyColumnDefinition(td, column);
        td.setAttribute("data-name", column.title);
        td.tabIndex = -1;
        if (column.editable) {
          let input = document.createElement("input");
          input.type = "text";
          input.autocomplete = "off";
          input.spellcheck = false;
          input.tabIndex = 0;
          input.classList.add("dg-editable");
          input.name = column.field + "[" + i + "]";
          input.value = item[column.field];
          input.dataset.field = column.field;

          input.addEventListener("keypress", (ev) => {
            if (ev.type === "keypress") {
              const key = ev.keyCode || ev.key;
              if (key === 13 || key === "Enter") {
                input.blur();
              }
            }
          });
          input.addEventListener("blur", (ev) => {
            // Only fire on update
            if (input.value == item[input.dataset.field]) {
              return;
            }
            // Update underlying data
            item[input.dataset.field] = input.value;
            // Notify
            const event = new CustomEvent("edit", {
              bubbles: true,
              detail: {
                data: item,
                value: input.value,
              },
            });
            this.dispatchEvent(event);
          });
          td.appendChild(input);
        } else {
          td.textContent = item[column.field];
        }
        if (column.hidden) {
          td.setAttribute("hidden", true);
        }
        tr.appendChild(td);
        idx++;
      });

      // Actions
      if (this.state.actions.length) {
        td = document.createElement("td");
        td.setAttribute("role", "gridcell");
        td.setAttribute("aria-colindex", this.columnsLength(true));
        td.classList.add("dg-actions");
        td.tabIndex = 0;

        this.state.actions.forEach((action) => {
          let button = document.createElement("button");
          if (action.html) {
            button.innerHTML = action.html;
          } else {
            button.innerText = action.title ?? action.name;
          }
          if (action.url) {
            button.type = "submit";
            button.formAction = DataGrid.interpolate(action.url, item);
          }
          if (action.class) {
            button.classList.add(action.class);
          }
          button.addEventListener("click", (ev) => {
            const event = new CustomEvent("action", {
              bubbles: true,
              detail: {
                data: item,
                action: action.name,
              },
            });
            this.dispatchEvent(event);
          });
          td.appendChild(button);
        });

        tr.appendChild(td);
      }

      tbody.appendChild(tr);
    });

    tbody.setAttribute("role", "rowgroup");

    this.root.querySelector("table").replaceChild(tbody, this.root.querySelector("tbody"));
    this.paginate();
  }
  paginate() {
    this.log("paginate");
    let index;
    let high = this.state.page * this.state.perPage;
    let low = high - this.state.perPage + 1;
    let tbody = this.root.querySelector("tbody");
    let tfoot = this.root.querySelector("tfoot");

    if (high > this.data.length) {
      high = this.data.length;
    }
    if (!this.data.length) {
      low = 0;
    }

    tbody.querySelectorAll("tr").forEach((tr) => {
      index = Number(tr.getAttribute("aria-rowindex"));
      if (index > high || index < low) {
        tr.setAttribute("hidden", true);
      } else {
        tr.removeAttribute("hidden");
      }
    });

    // Store default height and update styles if needed
    if (this.defaultHeight == 0) {
      this.computeDefaultHeight();
    }

    // Enable/disable buttons
    if (this.btnFirst) {
      this.btnFirst.disabled = this.state.page <= 1;
      this.btnPrev.disabled = this.state.page <= 1;
      this.btnNext.disabled = this.state.page >= this.state.pages;
      this.btnLast.disabled = this.state.page >= this.state.pages;
    }

    tfoot.querySelector(".dg-low").textContent = low.toString();
    tfoot.querySelector(".dg-high").textContent = high.toString();
    tfoot.querySelector(".dg-total").textContent = this.data.length.toString();
  }
  log(message) {
    if (this.debug) {
      console.log("[" + this.getAttribute("id") + "] " + message);
    }
  }
}

customElements.define("data-grid", DataGrid);

export default DataGrid;
