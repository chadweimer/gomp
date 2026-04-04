await import('./www/static/build/app.esm.js');

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

export { };
