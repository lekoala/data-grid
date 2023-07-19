import camelize from "../utils/camelize.js";
import normalizeData from "../utils/normalizeData.js";
import { dispatch, getAttribute, setAttribute } from "../utils/shortcuts.js";

/**
 * Base element that does not contain any specific logic
 * related to this project but makes HTMLElemnt usable
 */
class BaseElement extends HTMLElement {
  /**
   * @param {Object} options
   */
  constructor(options = {}) {
    super();
    this.options = Object.assign({}, this.defaultOptions, this.normalizedDataset, options);

    this.log("constructor");

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
    let jsonConfig = this.dataset.config ? JSON.parse(this.dataset.config) : {};
    let data = { ...this.dataset };
    for (var key in data) {
      if (key == "config") {
        continue;
      }
      data[key] = normalizeData(data[key]);
    }
    // Once normalized, merge into json config
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
  _ready() {}

  /**
   * @param {String|Error} message
   */
  log(message) {
    if (this.options.debug) {
      console.log("[" + getAttribute(this, "id") + "] " + message);
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
  _connected() {}

  connectedCallback() {
    // ensure whenDefined callbacks run first
    setTimeout(() => {
      this.log("connectedCallback");

      // Append only when labels had the opportunity to be set
      // Don't use shadow dom as it makes theming super hard
      const template = document.createElement("template");
      // @ts-ignore
      template.innerHTML = this.constructor.template();
      this.appendChild(template.content.cloneNode(true));

      this._connected();
      // @link https://gist.github.com/WebReflection/ec9f6687842aa385477c4afca625bbf4#life-cycle-events
      dispatch(this, "connected");
    }, 0);
  }

  /**
   * This is called when disconnected. Extend in subclass if needed.
   */
  _disconnected() {}

  disconnectedCallback() {
    this.log("disconnectedCallback");
    this._disconnected();
    // @link https://gist.github.com/WebReflection/ec9f6687842aa385477c4afca625bbf4#life-cycle-events
    dispatch(this, "disconnected");
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
    // It didn't change
    if (oldValue === newValue) {
      return;
    }

    this.log("attributeChangedCallback: " + attributeName);

    let isOption = false;
    const transformer = this.transformAttributes[attributeName] ?? normalizeData;

    // Data attributes are mapped to options while other attributes are mapped as properties
    if (attributeName.indexOf("data-") === 0) {
      attributeName = attributeName.slice(5);
      isOption = true;
    }
    attributeName = camelize(attributeName);
    if (isOption) {
      this.options[attributeName] = transformer(newValue);
    } else {
      this[attributeName] = transformer(newValue);
    }

    // Fire internal event
    if (this.fireEvents && this[`${attributeName}Changed`]) {
      this[`${attributeName}Changed`]();
    }
  }
}

export default BaseElement;
