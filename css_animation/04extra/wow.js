/*
 * decaffeinate suggestions:
 * DS101: Remove unnecessary use of Array.from
 * DS102: Remove unnecessary code created because of implicit returns
 * DS205: Consider reworking code to avoid use of IIFEs
 * DS206: Consider reworking classes to avoid initClass
 * DS207: Consider shorter variations of null checks
 * DS208: Avoid top-level this
 * Full docs: https://github.com/decaffeinate/decaffeinate/blob/master/docs/suggestions.md
 */
//
// Name    : wow
// Author  : Matthieu Aussaguel, http://mynameismatthieu.com/, @mattaussaguel
// Version : 1.1.2
// Repo    : https://github.com/matthieua/WOW
// Website : http://mynameismatthieu.com/wow
//


class Util {
  extend(custom, defaults) {
    for (let key in defaults) { const value = defaults[key]; if (custom[key] == null) { custom[key] = value; } }
    return custom;
  }

  isMobile(agent) {
    return /Android|webOS|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini/i.test(agent);
  }

  createEvent(event, bubble, cancel, detail = null) {
    let customEvent;
    if (bubble == null) { bubble = false; }
    if (cancel == null) { cancel = false; }
    if (document.createEvent != null) { // W3C DOM
      customEvent = document.createEvent('CustomEvent');
      customEvent.initCustomEvent(event, bubble, cancel, detail);
    } else if (document.createEventObject != null) { // IE DOM < 9
      customEvent = document.createEventObject();
      customEvent.eventType = event;
    } else {
      customEvent.eventName = event;
    }

    return customEvent;
  }

  emitEvent(elem, event) {
    if (elem.dispatchEvent != null) { // W3C DOM
      return elem.dispatchEvent(event);
    } else if (event in (elem != null)) {
      return elem[event]();
    } else if (`on${event}` in (elem != null)) {
      return elem[`on${event}`]();
    }
  }

  addEvent(elem, event, fn) {
    if (elem.addEventListener != null) { // W3C DOM
      return elem.addEventListener(event, fn, false);
    } else if (elem.attachEvent != null) { // IE DOM
      return elem.attachEvent(`on${event}`, fn);
    } else { // fallback
      return elem[event] = fn;
    }
  }

  removeEvent(elem, event, fn) {
    if (elem.removeEventListener != null) { // W3C DOM
      return elem.removeEventListener(event, fn, false);
    } else if (elem.detachEvent != null) { // IE DOM
      return elem.detachEvent(`on${event}`, fn);
    } else { // fallback
      return delete elem[event];
    }
  }

  innerHeight() {
    if ('innerHeight' in window) {
      return window.innerHeight;
    } else { return document.documentElement.clientHeight; }
  }
}

// Minimalistic WeakMap shim, just in case.
var WeakMap = this.WeakMap || this.MozWeakMap || 
  (WeakMap = class WeakMap {
    constructor() {
      this.keys   = [];
      this.values = [];
    }

    get(key) {
      for (let i = 0; i < this.keys.length; i++) {
        const item = this.keys[i];
        if (item === key) {
          return this.values[i];
        }
      }
    }

    set(key, value) {
      for (let i = 0; i < this.keys.length; i++) {
        const item = this.keys[i];
        if (item === key) {
          this.values[i] = value;
          return;
        }
      }
      this.keys.push(key);
      return this.values.push(value);
    }
  });

// Dummy MutationObserver, to avoid raising exceptions.
var MutationObserver = this.MutationObserver || this.WebkitMutationObserver || this.MozMutationObserver || 
  (MutationObserver = (function() {
    MutationObserver = class MutationObserver {
      static initClass() {
  
        this.notSupported = true;
      }
      constructor() {
        if (typeof console !== 'undefined' && console !== null) {
          console.warn('MutationObserver is not supported by your browser.');
        }
        if (typeof console !== 'undefined' && console !== null) {
          console.warn('WOW.js cannot detect dom mutations, please call .sync() after loading new content.');
        }
      }

      observe() {}
    };
    MutationObserver.initClass();
    return MutationObserver;
  })());

// getComputedStyle shim, from http://stackoverflow.com/a/21797294
const getComputedStyle = this.getComputedStyle || 
  function(el, pseudo) {
    this.getPropertyValue = function(prop) {
      if (prop === 'float') { prop = 'styleFloat'; }
      if (getComputedStyleRX.test(prop)) { prop.replace(getComputedStyleRX, (_, _char)=> _char.toUpperCase()); }
      return (el.currentStyle != null ? el.currentStyle[prop] : undefined) || null;
    };
    return this;
  };
var getComputedStyleRX = /(\-([a-z]){1})/g;

const Cls = (this.WOW = class WOW {
  static initClass() {
    this.prototype.defaults = {
      boxClass:        'wow',
      animateClass:    'animated',
      offset:          0,
      mobile:          true,
      live:            true,
      callback:        null,
      scrollContainer: null
    };
  
    this.prototype.animate = (function() {
      if ('requestAnimationFrame' in window) {
        return callback => window.requestAnimationFrame(callback);
      } else {
        return callback => callback();
      }
    })();
  
    this.prototype.vendors = ["moz", "webkit"];
  }

  constructor(options) {
    this.start = this.start.bind(this);
    this.resetAnimation = this.resetAnimation.bind(this);
    this.scrollHandler = this.scrollHandler.bind(this);
    this.scrollCallback = this.scrollCallback.bind(this);
    if (options == null) { options = {}; }
    this.scrolled = true;
    this.config   = this.util().extend(options, this.defaults);
    if (options.scrollContainer != null) {
      this.config.scrollContainer = document.querySelector(options.scrollContainer);
    }
    // Map of elements to animation names:
    this.animationNameCache = new WeakMap();
    this.wowEvent = this.util().createEvent(this.config.boxClass);
  }

  init() {
    this.element = window.document.documentElement;
    if (["interactive", "complete"].includes(document.readyState)) {
      this.start();
    } else {
      this.util().addEvent(document, 'DOMContentLoaded', this.start);
    }
    return this.finished = [];
  }

  start() {
    let box;
    this.stopped = false;
    this.boxes = ((() => {
      const result = [];
      for (box of Array.from(this.element.querySelectorAll(`.${this.config.boxClass}`))) {         result.push(box);
      }
      return result;
    })());
    this.all = ((() => {
      const result1 = [];
      for (box of Array.from(this.boxes)) {         result1.push(box);
      }
      return result1;
    })());
    if (this.boxes.length) {
      if (this.disabled()) {
        this.resetStyle();
      } else {
        for (box of Array.from(this.boxes)) { this.applyStyle(box, true); }
      }
    }
    if (!this.disabled()) {
      this.util().addEvent(this.config.scrollContainer || window, 'scroll', this.scrollHandler);
      this.util().addEvent(window, 'resize', this.scrollHandler);
      this.interval = setInterval(this.scrollCallback, 50);
    }
    if (this.config.live) {
      return new MutationObserver(records => {
        return Array.from(records).map((record) =>
          Array.from(record.addedNodes || []).map((node) => this.doSync(node)));
    })
      .observe(document.body, {
        childList: true,
        subtree: true
      }
      );
    }
  }

  // unbind the scroll event
  stop() {
    this.stopped = true;
    this.util().removeEvent(this.config.scrollContainer || window, 'scroll', this.scrollHandler);
    this.util().removeEvent(window, 'resize', this.scrollHandler);
    if (this.interval != null) { return clearInterval(this.interval); }
  }

  sync(element) {
    if (MutationObserver.notSupported) { return this.doSync(this.element); }
  }

  doSync(element) {
    if (element == null) { ({ element } = this); }
    if (element.nodeType !== 1) { return; }
    element = element.parentNode || element;
    return (() => {
      const result = [];
      for (let box of Array.from(element.querySelectorAll(`.${this.config.boxClass}`))) {
        if (!Array.from(this.all).includes(box)) {
          this.boxes.push(box);
          this.all.push(box);
          if (this.stopped || this.disabled()) {
            this.resetStyle();
          } else {
            this.applyStyle(box, true);
          }
          result.push(this.scrolled = true);
        } else {
          result.push(undefined);
        }
      }
      return result;
    })();
  }

  // show box element
  show(box) {
    this.applyStyle(box);
    box.className = `${box.className} ${this.config.animateClass}`;
    if (this.config.callback != null) { this.config.callback(box); }
    this.util().emitEvent(box, this.wowEvent);

    this.util().addEvent(box, 'animationend', this.resetAnimation);
    this.util().addEvent(box, 'oanimationend', this.resetAnimation);
    this.util().addEvent(box, 'webkitAnimationEnd', this.resetAnimation);
    this.util().addEvent(box, 'MSAnimationEnd', this.resetAnimation);

    return box;
  }

  applyStyle(box, hidden) {
    const duration  = box.getAttribute('data-wow-duration');
    const delay     = box.getAttribute('data-wow-delay');
    const iteration = box.getAttribute('data-wow-iteration');

    return this.animate(() => this.customStyle(box, hidden, duration, delay, iteration));
  }

  resetStyle() {
    return Array.from(this.boxes).map((box) => (box.style.visibility = 'visible'));
  }

  resetAnimation(event) {
    if (event.type.toLowerCase().indexOf('animationend') >= 0) {
      const target = event.target || event.srcElement;
      return target.className = target.className.replace(this.config.animateClass, '').trim();
    }
  }

  customStyle(box, hidden, duration, delay, iteration) {
    if (hidden) { this.cacheAnimationName(box); }
    box.style.visibility = hidden ? 'hidden' : 'visible';

    if (duration) { this.vendorSet(box.style, {animationDuration: duration}); }
    if (delay) { this.vendorSet(box.style, {animationDelay: delay}); }
    if (iteration) { this.vendorSet(box.style, {animationIterationCount: iteration}); }
    this.vendorSet(box.style, {animationName: hidden ? 'none' : this.cachedAnimationName(box)});

    return box;
  }
  vendorSet(elem, properties) {
    return (() => {
      const result = [];
      for (var name in properties) {
        var value = properties[name];
        elem[`${name}`] = value;
        result.push(Array.from(this.vendors).map((vendor) => (elem[`${vendor}${name.charAt(0).toUpperCase()}${name.substr(1)}`] = value)));
      }
      return result;
    })();
  }
  vendorCSS(elem, property) {
    const style = getComputedStyle(elem);
    let result = style.getPropertyCSSValue(property);
    for (let vendor of Array.from(this.vendors)) { result = result || style.getPropertyCSSValue(`-${vendor}-${property}`); }
    return result;
  }

  animationName(box) {
    let animationName;
    try {
      animationName = this.vendorCSS(box, 'animation-name').cssText;
    } catch (error) { // Opera, fall back to plain property value
      animationName = getComputedStyle(box).getPropertyValue('animation-name');
    }
    if (animationName === 'none') {
      return '';  // SVG/Firefox, unable to get animation name?
    } else {
      return animationName;
    }
  }

  cacheAnimationName(box) {
    // https://bugzilla.mozilla.org/show_bug.cgi?id=921834
    // box.dataset is not supported for SVG elements in Firefox
    return this.animationNameCache.set(box, this.animationName(box));
  }
  cachedAnimationName(box) {
    return this.animationNameCache.get(box);
  }

  // fast window.scroll callback
  scrollHandler() {
    return this.scrolled = true;
  }

  scrollCallback() {
    if (this.scrolled) {
      this.scrolled = false;
      this.boxes = (() => {
        const result = [];
        for (let box of Array.from(this.boxes)) {
          if (box) {
            if (this.isVisible(box)) {
              this.show(box);
              continue;
            }
            result.push(box);
          }
        }
        return result;
      })();
      if (!this.boxes.length && !this.config.live) { return this.stop(); }
    }
  }


  // Calculate element offset top
  offsetTop(element) {
    // SVG elements don't have an offsetTop in Firefox.
    // This will use their nearest parent that has an offsetTop.
    // Also, using ('offsetTop' of element) causes an exception in Firefox.
    while (element.offsetTop === undefined) { element = element.parentNode; }
    let top = element.offsetTop;
    while ((element = element.offsetParent)) { top += element.offsetTop; }
    return top;
  }

  // check if box is visible
  isVisible(box) {
    const offset     = box.getAttribute('data-wow-offset') || this.config.offset;
    const viewTop    = (this.config.scrollContainer && this.config.scrollContainer.scrollTop) || window.pageYOffset;
    const viewBottom = (viewTop + Math.min(this.element.clientHeight, this.util().innerHeight())) - offset;
    const top        = this.offsetTop(box);
    const bottom     = top + box.clientHeight;

    return (top <= viewBottom) && (bottom >= viewTop);
  }

  util() {
    return this._util != null ? this._util : (this._util = new Util());
  }

  disabled() {
    return !this.config.mobile && this.util().isMobile(navigator.userAgent);
  }
});
Cls.initClass();