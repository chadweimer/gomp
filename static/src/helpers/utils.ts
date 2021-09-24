export function sayHello() {
  return Math.random() < 0.5 ? 'Hello' : 'Hola';
}

export function formatDate(dateStr: string) {
  return new Date(dateStr).toLocaleDateString();
}

export function configureModalAutofocus(el: HTMLElement) {
  el.closest('ion-modal')?.addEventListener('focus', () => {
    const focusEl = el.querySelector('[autofocus]');
    if (focusEl instanceof HTMLElement) {
      focusEl.focus();
    }
  });
}
