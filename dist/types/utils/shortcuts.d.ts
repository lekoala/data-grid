/**
 * @param {Element} el
 * @param {String} name
 * @returns {any}
 */
export function getAttribute(el: Element, name: string): any;
/**
 * @param {Element} el
 * @param {String} name
 * @returns {Boolean}
 */
export function hasAttribute(el: Element, name: string): boolean;
/**
 * @param {Element} el
 * @param {String} name
 * @param {any} v
 * @param {Boolean} check Prevent setting if attribute is already there
 */
export function setAttribute(el: Element, name: string, v?: any, check?: boolean): void;
/**
 * @param {Element} el
 * @param {String} name
 */
export function removeAttribute(el: Element, name: string): void;
/**
 * @param {EventTarget} el
 * @param {String} type
 * @param {Function|EventListenerObject|FlexibleListener} listener
 */
export function on(el: EventTarget, type: string, listener: Function | EventListenerObject | FlexibleListener): void;
/**
 * @param {EventTarget} el
 * @param {String} type
 * @param {Function|EventListenerObject|FlexibleListener} listener
 */
export function off(el: EventTarget, type: string, listener: Function | EventListenerObject | FlexibleListener): void;
/**
 * @param {EventTarget} el
 * @param {String} type
 * @param {Function|EventListenerObject|FlexibleListener} listener
 */
export function one(el: EventTarget, type: string, listener: Function | EventListenerObject | FlexibleListener): void;
/**
 * @param {HTMLElement} el
 * @param {String} name
 * @param {any} data
 * @param {Boolean} bubbles
 */
export function dispatch(el: HTMLElement, name: string, data?: any, bubbles?: boolean): void;
/**
 * @param {Element} el
 * @param {String} name
 * @returns {Boolean}
 */
export function hasClass(el: Element, name: string): boolean;
/**
 * @param {Element} el
 * @param {String} name
 */
export function addClass(el: Element, name: string): void;
/**
 * @param {Element} el
 * @param {String} name
 */
export function removeClass(el: Element, name: string): void;
/**
 * @param {Element} el
 * @param {String} name
 */
export function toggleClass(el: Element, name: string): void;
/**
 * @param {String|HTMLElement} selector
 * @param {HTMLElement|Document} base
 * @returns {FlexibleHTMLElement|null}
 */
export function $(selector: string | HTMLElement, base?: HTMLElement | Document): FlexibleHTMLElement | null;
/**
 * @param {String} selector
 * @param {Element|Document} base
 * @returns {Array<FlexibleHTMLElement>}
 */
export function $$(selector: string, base?: Element | Document): Array<FlexibleHTMLElement>;
/**
 * Easily retrieve untyped element
 * For actual type, prefer use of el.querySelector
 * @param {HTMLElement} el
 * @param {String|HTMLElement} selector
 * @returns {FlexibleHTMLElement|null}
 */
export function find(el: HTMLElement, selector: string | HTMLElement): FlexibleHTMLElement | null;
/**
 * Easily retrieve untyped elements
 * For actual type, prefer use of el.querySelectorAll
 * @param {Element} el
 * @param {String} selector
 * @returns {Array<FlexibleHTMLElement>}
 */
export function findAll(el: Element, selector: string): Array<FlexibleHTMLElement>;
/**
 * @param {*} el
 * @returns {FlexibleHTMLElement}
 */
export function el(el: any): FlexibleHTMLElement;
/**
 * @template {keyof HTMLElementTagNameMap} K
 * @param {K} tagName
 * @param {HTMLElement|null} [parent]
 * @returns {HTMLElementTagNameMap[K]}
 */
export function ce<K extends keyof HTMLElementTagNameMap>(tagName: K, parent?: HTMLElement | null): HTMLElementTagNameMap[K];
/**
 * @param {HTMLElement} newNode
 * @param {HTMLElement} existingNode
 */
export function insertAfter(newNode: HTMLElement, existingNode: HTMLElement): void;
export type FlexibleHTMLProps = {
    /**
     * (HTMLInputElement)
     */
    checked?: boolean | undefined;
    /**
     * (HTMLInputElement)
     */
    value?: string | undefined;
    /**
     * (HTMLTableRowElement)
     *
     * A flexible type HTMLElement type that does not require using instanceof all over the place
     * Make sure that your selector is indeed valid
     * Only includes most commons props
     */
    rowHeight?: number | undefined;
};
export type FlexibleHTMLElement = HTMLElement & FlexibleHTMLProps;
/**
 * Keep this as reference for easy documentation
 */
export type MixedHTMLElement = HTMLElement & HTMLInputElement & HTMLTableRowElement;
export type FlexibleEventProps = {
    target: FlexibleHTMLElement;
    currentTarget: FlexibleHTMLElement;
    /**
     * (DragEvent)
     */
    dataTransfer?: DataTransfer | undefined;
    /**
     * (MouseEvent)
     */
    clientX?: number | undefined;
    /**
     * (MouseEvent)
     */
    clientY?: number | undefined;
};
export type FlexibleEvent = Event & FlexibleEventProps;
/**
 * Keep this as reference for easy documentation
 */
export type MixedEvent = Event & MouseEvent & InputEvent & DragEvent & FocusEvent & KeyboardEvent & PointerEvent;
export type FlexibleListener = (event: FlexibleEvent) => any;
//# sourceMappingURL=shortcuts.d.ts.map