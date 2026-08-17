/**
 * @typedef FlexibleHTMLProps
 * @property {boolean} [checked] (HTMLInputElement)
 * @property {string} [value] (HTMLInputElement)
 * @property {number} [rowHeight] (HTMLTableRowElement)
 *
 * A flexible type HTMLElement type that does not require using instanceof all over the place
 * Make sure that your selector is indeed valid
 * Only includes most commons props
 * @typedef {HTMLElement & FlexibleHTMLProps} FlexibleHTMLElement
 */
export type FlexibleHTMLProps = {
    /**
     * (HTMLInputElement)
     */
    checked?: boolean;
    /**
     * (HTMLInputElement)
     */
    value?: string;
    /**
     * (HTMLTableRowElement)
     *
     * A flexible type HTMLElement type that does not require using instanceof all over the place
     * Make sure that your selector is indeed valid
     * Only includes most commons props
     */
    rowHeight?: number;
};
export type FlexibleHTMLElement = HTMLElement & FlexibleHTMLProps;
export type MixedHTMLElement = HTMLElement & HTMLInputElement & HTMLTableRowElement;
export type FlexibleEventProps = {
    target: FlexibleHTMLElement;
    currentTarget: FlexibleHTMLElement;
    /**
     * (DragEvent)
     */
    dataTransfer?: DataTransfer;
    /**
     * (MouseEvent)
     */
    clientX?: number;
    /**
     * (MouseEvent)
     */
    clientY?: number;
};
export type FlexibleEvent = Event & FlexibleEventProps;
export type MixedEvent = Event & MouseEvent & InputEvent & DragEvent & FocusEvent & KeyboardEvent & PointerEvent;
export type FlexibleListener = (event: FlexibleEvent) => any;
/**
 * @param {Element} el
 * @param {String} name
 * @returns {any}
 */
export declare function getAttribute(el: Element, name: string): any;
/**
 * @param {Element} el
 * @param {String} name
 * @returns {Boolean}
 */
export declare function hasAttribute(el: Element, name: string): boolean;
/**
 * @param {Element} el
 * @param {String} name
 * @param {any} v
 * @param {Boolean} check Prevent setting if attribute is already there
 */
export declare function setAttribute(el: Element, name: string, v?: any, check?: boolean): void;
/**
 * @param {Element} el
 * @param {String} name
 */
export declare function removeAttribute(el: Element, name: string): void;
/**
 * @param {EventTarget} el
 * @param {String} type
 * @param {Function|EventListenerObject|FlexibleListener} listener
 * @param {AddEventListenerOptions} [options]
 */
export declare function on(el: EventTarget, type: string, listener: Function | EventListenerObject | FlexibleListener, options?: AddEventListenerOptions): void;
/**
 * @param {EventTarget} el
 * @param {String} type
 * @param {Function|EventListenerObject|FlexibleListener} listener
 * @param {AddEventListenerOptions} [options]
 */
export declare function off(el: EventTarget, type: string, listener: Function | EventListenerObject | FlexibleListener, options?: AddEventListenerOptions): void;
/**
 * @param {EventTarget} el
 * @param {String} type
 * @param {Function|EventListenerObject|FlexibleListener} listener
 */
export declare function one(el: EventTarget, type: string, listener: Function | EventListenerObject | FlexibleListener): void;
/**
 * @param {HTMLElement} el
 * @param {String} name
 * @param {any} data
 * @param {Boolean} bubbles
 */
export declare function dispatch(el: HTMLElement, name: string, data?: any, bubbles?: boolean): void;
/**
 * @param {Element} el
 * @param {String} name
 * @returns {Boolean}
 */
export declare function hasClass(el: Element, name: string): boolean;
/**
 * @param {Element} el
 * @param {String} name
 */
export declare function addClass(el: Element, name: string): void;
/**
 * @param {Element} el
 * @param {String} name
 */
export declare function removeClass(el: Element, name: string): void;
/**
 * @param {Element} el
 * @param {String} name
 */
export declare function toggleClass(el: Element, name: string): void;
/**
 * @param {String|HTMLElement} selector
 * @param {HTMLElement|Document} base
 * @returns {FlexibleHTMLElement|null}
 */
export declare function $(selector: string | HTMLElement, base?: HTMLElement | Document): FlexibleHTMLElement | null;
/**
 * @param {String} selector
 * @param {Element|Document} base
 * @returns {Array<FlexibleHTMLElement>}
 */
export declare function $$(selector: string, base?: Element | Document): Array<FlexibleHTMLElement>;
/**
 * Easily retrieve untyped element
 * For actual type, prefer use of el.querySelector
 * @param {HTMLElement} el
 * @param {String|HTMLElement} selector
 * @returns {FlexibleHTMLElement|null}
 */
export declare function find(el: HTMLElement, selector: string | HTMLElement): FlexibleHTMLElement | null;
/**
 * Easily retrieve untyped elements
 * For actual type, prefer use of el.querySelectorAll
 * @param {Element} el
 * @param {String} selector
 * @returns {Array<FlexibleHTMLElement>}
 */
export declare function findAll(el: Element, selector: string): Array<FlexibleHTMLElement>;
/**
 * @param {*} el
 * @returns {FlexibleHTMLElement}
 */
export declare function el(el: any): FlexibleHTMLElement;
/**
 * @template {keyof HTMLElementTagNameMap} K
 * @param {K} tagName
 * @param {HTMLElement|null} [parent]
 * @returns {HTMLElementTagNameMap[K]}
 */
export declare function ce<K extends keyof HTMLElementTagNameMap>(tagName: K, parent?: HTMLElement | null): HTMLElementTagNameMap[K];
/**
 * @param {HTMLElement} newNode
 * @param {HTMLElement} existingNode
 */
export declare function insertAfter(newNode: HTMLElement, existingNode: HTMLElement): void;
//# sourceMappingURL=shortcuts.d.ts.map