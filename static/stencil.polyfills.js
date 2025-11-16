// Polyfill adoptedStyleSheets for Jest/JSDOM environment used by Stencil tests
(function () {
  if (globalThis.document.adoptedStyleSheets === undefined || globalThis.document.adoptedStyleSheets === null) {
    Object.defineProperty(globalThis.document, 'adoptedStyleSheets', {
      configurable: true,
      enumerable: true,
      writable: true,
      value: []
    });
  }
})();
