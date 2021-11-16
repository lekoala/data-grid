/**
 * Data Grid Web component
 *
 * Credits for inspiration
 * @link https://github.com/riverside/zino-grid
 */
"use strict";

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
    <tbody role="rowgroup"></tbody>
    <tfoot role="rowgroup" hidden>
        <tr role="row" aria-rowindex="1">
            <td role="gridcell">
            <div class="dg-footer">
                <div class="dg-page-nav">
                  <select class="dg-per-page" aria-label="${labels.itemsPerPage}"></select>
                </div>
                <div class="dg-pagination">
                  <button type="button" class="dg-btn-first dg-rotate" title="${labels.gotoFirstPage}" aria-label="${labels.gotoFirstPage}" disabled>
                    <i class="dg-skip-icon"></i>
                  </button>
                  <button type="button" class="dg-btn-prev dg-rotate" title="${labels.gotoPrevPage}" aria-label="${labels.gotoPrevPage}" disabled>
                    <i class="dg-nav-icon"></i>
                  </button>
                  <button type="button" class="dg-btn-next" title="${labels.gotoNextPage}" aria-label="${labels.gotoNextPage}" disabled>
                    <i class="dg-nav-icon"></i>
                  </button>
                  <button type="button" class="dg-btn-last" title="${labels.gotoLastPage}" aria-label="${labels.gotoLastPage}" disabled>
                    <i class="dg-skip-icon"></i>
                  </button>
                  <input type="number" class="dg-goto-page" min="1" step="1" value="1" aria-label="${labels.gotoPage}">
                </div>
                <div class="dg-meta">
                  <span class="dg-low">0</span> - <span class="dg-high">0</span> ${labels.of} <span class="dg-total">0</span> ${labels.items}
                </div>
            </div>
            </td>
        </tr>
    </tfoot>
</table>
`;

class DataGrid extends HTMLElement {
  constructor(options = {}) {
    super();

    this.state = {
      pages: 0,
      page: 1,
      perPage: 10,
      perPageValues: [10, 25, 50, 100, 250],
      debug: false,
      filter: false,
      sort: false,
      defaultSort: "",
      reorder: false,
      dir: "ltr",
      columns: [],
    };
    this.setOptions(options);

    // The grid displays data
    this.data = [];
    // We store the data in this
    this.originalData = [];

    // Don't use shadow dom as it makes theming super hard
    this.appendChild(template.content.cloneNode(true));
    this.root = this;
    this.initialized = false;
    this.touch = null;
    this.isResizing = false;

    // Init page values
    this.perPageValues = this.state.perPageValues;

    // Set id
    if (!this.hasAttribute("id")) {
      this.setAttribute("id", DataGrid.randstr("dg-"));
    }

    this.log("constructor");
  }

  // utils

  /**
   * Uses canvas.measureText to compute and return the width of the given text of given font in pixels.
   * @see https://stackoverflow.com/questions/118241/calculate-text-width-with-javascript/21015393#21015393
   * @param {String} text The text to be rendered.
   * @param {String} font The css font descriptor that text is to be rendered with (e.g. "bold 14px verdana").
   * @return {Number}
   */
  static getTextWidth(text, font = null) {
    if (!font) {
      font = DataGrid.getCanvasFontSize();
    }
    // re-use canvas object for better performance
    const canvas = DataGrid.getTextWidth.canvas || (DataGrid.getTextWidth.canvas = document.createElement("canvas"));
    const context = canvas.getContext("2d");
    context.font = font;
    const metrics = context.measureText(text);
    return parseInt(metrics.width);
  }

  /**
   * @param {HTMLElement} element
   * @param {String} prop
   * @returns {String}
   */
  static getCssStyle(element, prop) {
    return window.getComputedStyle(element, null).getPropertyValue(prop);
  }

  /**
   * @param {HTMLElement} el
   * @returns {String}
   */
  static getCanvasFontSize(el = document.body) {
    const fontWeight = DataGrid.getCssStyle(el, "font-weight") || "normal";
    const fontSize = DataGrid.getCssStyle(el, "font-size") || "1rem";
    const fontFamily = DataGrid.getCssStyle(el, "font-family") || "Arial";

    return `${fontWeight} ${fontSize} ${fontFamily}`;
  }

  /**
   * @param {HTMLElement} el
   * @param {String} value
   * @param {String} label
   * @param {Boolean} checked
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
   * @param {String} prefix
   * @returns {String}
   */
  static randstr(prefix) {
    return Math.random()
      .toString(36)
      .replace("0.", prefix || "");
  }
  /**
   * @param {String|Array} v
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
    val = val.toString().toLowerCase();
    if (["ltr", "rtl"].includes(val)) {
      this.setAttribute("dir", val);
    }
  }
  get perPageValues() {
    return this.state.perPageValues;
  }
  set perPageValues(val) {
    if (Array.isArray(val)) {
      this.state.perPageValues = val;
      let select = this.querySelector(".dg-per-page");
      while (select.lastChild) {
        select.removeChild(select.lastChild);
      }
      this.state.perPageValues.forEach((v) => {
        DataGrid.addSelectOption(select, v, v);
      });
    }
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
  get columns() {
    return this.state.columns;
  }
  set columns(val) {
    this.state.columns = DataGrid.convertColumns(DataGrid.convertArray(val));
  }
  connectedCallback() {
    this.log("connectedCallback");

    this.btnFirst = this.root.querySelector(".dg-btn-first");
    this.btnPrev = this.root.querySelector(".dg-btn-prev");
    this.btnNext = this.root.querySelector(".dg-btn-next");
    this.btnLast = this.root.querySelector(".dg-btn-last");
    this.selectPerPage = this.root.querySelector(".dg-per-page");
    this.inputPage = this.root.querySelector(".dg-goto-page");

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
    // TODO: figure out screen drag ?
    this.touchstart = this.touchstart.bind(this);
    this.touchmove = this.touchmove.bind(this);
    document.addEventListener("touchstart", this.touchstart);
    document.addEventListener("touchmove", this.touchmove);

    this.loadData();
    this.toggleSort();
    this.root.classList.add("dg-initialized");
    this.initialized = true;
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

  disconnectedCallback() {
    this.log("disconnectedCallback");

    this.btnFirst.removeEventListener("click", this.getFirst);
    this.btnPrev.removeEventListener("click", this.getPrev);
    this.btnNext.removeEventListener("click", this.getNext);
    this.btnLast.removeEventListener("click", this.getLast);
    this.btnRefresh.removeEventListener("click", this.refresh);
    this.selectPerPage.removeEventListener("change", this.changePerPage, {
      passive: true,
    });
    this.inputPage.removeEventListener("input", this.gotoPage);

    document.removeEventListener("touchstart", this.touchstart);
    document.removeEventListener("touchmove", this.touchmove);
  }
  attributeChangedCallback(attributeName, oldValue, newValue) {
    this.log("attributeChangedCallback: " + attributeName);

    let element;
    switch (attributeName) {
      case "url":
        this.state.url = newValue;

        // Only load if connected, otherwise other attributes might not be read yet
        if (this.initialized) {
          this.loadData();
        }
        break;
      case "page":
        this.state.page = Number(newValue);
        this.fixPage();
        this.updateGoto();
        if (this.initialized) {
          this.paginate();
        }
        break;
      case "per-page":
        this.state.perPage = Number(newValue);
        if (this.initialized) {
          element = this.selectPerPage;
          element.value = newValue;
          this.fixPage();
          this.updateGoto();
          this.paginate();
          window.scroll({ top: DataGrid.elementOffset(element).top });
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
        this.toggleFilter();
        break;
      case "reorder":
        this.state.reorder = newValue === "true";
        this.toggleReorder();
        break;
      case "sort":
        this.state.sort = newValue === "true";
        if (this.initialized) {
          this.toggleSort();
        }
        break;
      case "default-sort":
        this.state.defaultSort = newValue;
        if (this.initialized) {
          this.toggleSort();
        }
        break;
    }
  }
  /**
   * @param {Object} options
   */
  setOptions(options) {
    for (const [key, value] of Object.entries(options)) {
      // State is updated if necessary through setters
      if (key in this) {
        this[key] = value;
        // this.state[key] = value;
      }
    }
  }
  columnsLength() {
    let len = 0;
    this.state.columns.forEach((col) => {
      if (!col.attr) {
        len++;
      }
    });
    return len;
  }
  fixPage() {
    this.state.pages = Math.ceil(this.data.length / this.state.perPage);

    // Constrain values
    if (this.state.pages < this.state.page) {
      this.state.page = this.state.pages;
    }
    if (this.state.page < 1) {
      this.state.page = 1;
    }

    // Updata input
    if (this.inputPage) {
      this.inputPage.setAttribute("max", this.state.pages);
    } else {
      this.root.querySelector(".dg-goto-page").setAttribute("max", this.state.pages);
    }
  }
  toggleFilter() {
    const row = this.root.querySelector("thead tr.dg-head-filters");
    if (this.state.filter) {
      row.removeAttribute("hidden");
    } else {
      row.setAttribute("hidden", "hidden");
    }
  }
  toggleReorder() {
    this.root.querySelectorAll("thead tr.dg-head-columns th").forEach((th) => {
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
      if (this.state.sort) {
        th.setAttribute("aria-sort", "none");
      } else {
        th.removeAttribute("aria-sort");
      }
    });
  }
  updateGoto() {
    let element;
    if (this.inputPage) {
      element = this.inputPage;
    } else {
      element = this.root.querySelector(".dg-goto-page");
    }
    element.value = this.state.page;
    element.disabled = this.state.pages === 1;
  }
  loadData() {
    this.log("loadData");
    if (!this.url) {
      this.log("No url set yet");
      return;
    }
    this.fetchData().then((response) => {
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
      this.root.querySelector("table").setAttribute("aria-rowcount", this.data.length);
      this.root.querySelector("tfoot").removeAttribute("hidden");
      this.renderHeader();
    });
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

    this.state.pages = Math.ceil(this.data.length / this.state.perPage);
    this.page = 1;

    let col = this.root.querySelector("thead tr.dg-head-columns th[aria-sort$='scending']");
    if (this.state.sort && col) {
      // sortData automatically renders the body
      this.sortData(col);
    } else {
      this.renderBody();
    }
  }
  sortData(col) {
    this.log("sort data");

    // Remove active sort if any
    this.root.querySelectorAll("thead tr:first-child th").forEach((th) => {
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

    const sort = col.getAttribute("aria-sort");
    if (sort === "none") {
      let stack = [];
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

        const valueA = sort === "ascending" ? a[field].toUpperCase() : b[field].toUpperCase();
        const valueB = sort === "ascending" ? b[field].toUpperCase() : a[field].toUpperCase();

        if (valueA > valueB) {
          return 1;
        }

        if (valueA < valueB) {
          return -1;
        }

        return 0;
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

    // Init columns with first row keys if not set
    if (this.state.columns.length === 0 && this.originalData.length) {
      this.state.columns = DataGrid.convertColumns(Object.keys(this.originalData[0]));
    }

    // Create columns
    tr = document.createElement("tr");
    tr.setAttribute("role", "row");
    tr.setAttribute("aria-rowindex", 1);
    tr.setAttribute("class", "dg-head-columns");
    this.state.columns.forEach((column, i) => {
      if (column.attr) {
        return;
      }
      let th = document.createElement("th");
      th.setAttribute("role", "columnheader button");
      th.setAttribute("aria-colindex", i + 1);
      th.setAttribute("id", DataGrid.randstr("dg-col-"));
      if (this.state.sort) {
        th.setAttribute("aria-sort", "none");
      }
      th.setAttribute("field", column.field);
      DataGrid.applyColumnDefinition(th, column);
      th.tabIndex = 0;
      th.textContent = column.title;

      // Autosize ?
      if (this.root.hasAttribute("autosize") && !th.getAttribute("width")) {
        let v = this.data[0][column.field];
        if (v.length) {
          th.setAttribute("width", DataGrid.getTextWidth(v));
        }
      }

      // Reorder columns with drag/drop
      if (this.state.reorder) {
        th.draggable = true;
        th.addEventListener("dragstart", (e) => {
          if (this.isResizing) {
            return false;
          }
          this.log("reorder col");
          e.dataTransfer.effectAllowed = "move";
          e.dataTransfer.setData("text/plain", e.target.getAttribute("aria-colindex"));
        });
        th.addEventListener("dragover", (e) => {
          if (this.isResizing) {
            return false;
          }
          if (e.preventDefault) {
            e.preventDefault();
          }
          e.dataTransfer.dropEffect = "move";
          return false;
        });
        th.addEventListener("drop", (e) => {
          if (this.isResizing) {
            return false;
          }
          this.log("reordered col");
          if (e.stopPropagation) {
            e.stopPropagation();
          }
          const index = e.dataTransfer.getData("text/plain");
          const targetIndex = e.target.getAttribute("aria-colindex");

          if (index === targetIndex) {
            return;
          }

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

      tr.appendChild(th);
    });

    thead.replaceChild(tr, thead.querySelector("tr.dg-head-columns"));
    if (this.state.defaultSort) {
      sortedColumn = this.root.querySelector("thead tr.dg-head-columns th[field='" + this.state.defaultSort + "']");
    }

    tr.querySelectorAll("[aria-sort]").forEach((sortableRow) => {
      sortableRow.addEventListener("click", () => {
        this.sortData(sortableRow);
      });
    });

    // Create Filters
    tr = document.createElement("tr");
    tr.setAttribute("role", "row");
    tr.setAttribute("aria-rowindex", 2);
    tr.setAttribute("class", "dg-head-filters");
    if (!this.state.filter) {
      tr.setAttribute("hidden", "hidden");
    }
    this.state.columns.forEach((column, i) => {
      if (column.attr) {
        return;
      }
      let relatedTh = thead.querySelector("tr.dg-head-columns th[aria-colindex='" + (i + 1) + "']");
      let th = document.createElement("th");
      th.setAttribute("aria-colindex", i + 1);

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

      th.appendChild(input);
      tr.appendChild(th);
    });

    thead.replaceChild(tr, thead.querySelector("tr.dg-head-filters"));

    tr.querySelectorAll("input").forEach((input) => {
      input.addEventListener("keypress", (e) => {
        const key = e.keyCode || e.key;
        if (key === 13 || key === "Enter") {
          this.filterData.call(this);
        }
      });
    });

    this.root.querySelector("table").setAttribute("aria-colcount", this.columnsLength().toString());
    this.root.querySelector("tfoot").querySelector("td").setAttribute("colspan", this.columnsLength().toString());

    if (sortedColumn) {
      this.sortData(sortedColumn);
    } else {
      this.renderBody();
    }

    this.root.querySelector("tfoot").style.display = "";
    if (this.hasAttribute("resizable")) {
      this.renderResizer();
    }
  }
  renderResizer() {
    const cols = this.root.querySelectorAll("thead tr.dg-head-columns th");
    let i = 0;

    cols.forEach((col) => {
      i++;

      const colMinSize = 50;

      // Create a resizer element
      const resizer = document.createElement("div");
      resizer.classList.add("dg-resizer");
      resizer.dataset.col = i;
      resizer.ariaLabel = labels.resizeColumn;

      // Add a resizer element to the column
      col.appendChild(resizer);

      // Handle resizing
      let startX = 0;
      let startW = 0;
      let remainingSpace = (cols.length - i) * colMinSize;
      let max = DataGrid.elementOffset(this).left + this.offsetWidth - remainingSpace;

      const mouseMoveHandler = (e) => {
        if (e.clientX > max) {
          return;
        }
        const newWidth = startW + (e.clientX - startX);
        if (newWidth > colMinSize) {
          col.width = newWidth;
        }
      };

      // When user releases the mouse, remove the existing event listeners
      const mouseUpHandler = () => {
        this.log("resized column");
        this.isResizing = false;

        resizer.classList.remove("dg-resizer-active");

        document.removeEventListener("mousemove", mouseMoveHandler);
        document.removeEventListener("mouseup", mouseUpHandler);
      };

      // Otherwise it could sort the col
      resizer.addEventListener("click", (e) => {
        e.stopPropagation();
      });
      //TODO: not compatible with reorder

      resizer.addEventListener("mousedown", (e) => {
        this.log("resize column");
        this.isResizing = true;

        resizer.classList.add("dg-resizer-active");

        // Remove width from next columns
        for (let j = 0; j < cols.length; j++) {
          if (j >= e.target.dataset.col) {
            cols[j].removeAttribute("width");
          }
        }

        // Register initial data
        startX = e.clientX;
        startW = col.offsetWidth;

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
    let tbody = document.createElement("tbody");

    this.data.forEach((item, i) => {
      tr = document.createElement("tr");
      tr.setAttribute("role", "row");
      tr.setAttribute("hidden", "hidden");
      tr.setAttribute("aria-rowindex", i + 1);
      tr.tabIndex = 0;
      this.state.columns.forEach((column, j) => {
        // It should be applied as an attr of the row
        if (column.attr) {
          tr.setAttribute(column.attr, item[column.field]);
          return;
        }
        td = document.createElement("td");
        td.setAttribute("role", "gridcell");
        td.setAttribute("aria-colindex", j + 1);
        DataGrid.applyColumnDefinition(td, column);
        td.setAttribute("data-name", column.title);
        td.tabIndex = -1;
        td.textContent = item[column.field];
        tr.appendChild(td);
      });
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
        tr.setAttribute("hidden", "hidden");
      } else {
        tr.removeAttribute("hidden");
      }
    });

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
