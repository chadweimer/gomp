import { createGesture, GestureDetail, loadingController, toastController } from '@ionic/core';
import DOMPurify from 'dompurify';
import { jwtDecode, JwtPayload } from 'jwt-decode';
import { AccessLevel, YesNoAny } from '../generated';
import { SwipeDirection } from '../models';

interface GompClaims extends JwtPayload {
  scopes?: string[]
}

export function isNull<T>(val: T | null) {
  return typeof val === 'undefined' || val === null;
}

export function isNullOrEmpty(val: string | null) {
  return isNull(val) || val === '';
}

export function formatDate(date: Date | null) {
  if (isNull(date)) {
    return '';
  }
  return `${date.toLocaleDateString()} ${date.toLocaleTimeString()}`;
}

export function hasScope(token: string | null, accessLevel: AccessLevel) {
  if (isNullOrEmpty(token)) {
    return false;
  }
  const decoded = jwtDecode<GompClaims>(token);
  return decoded.scopes?.includes(accessLevel) ?? false;
}

export async function redirect(route: string) {
  const router = document.querySelector('ion-router');
  await router.push(route);
}

export function insertSpacesBetweenWords(val: string) {
  if (isNull(val)) {
    return '';
  }

  return val.replace(/([A-Z])/g, ' $1').trim()
}

export function enumKeyFromValue(keys: object, val: string) {
  if (isNull(val)) {
    return '';
  }

  return Object.keys(keys).find(key => keys[key] === val);
}

export function toYesNoAny(value: boolean | null) {
  switch (value) {
    case true:
      return YesNoAny.Yes;

    case false:
      return YesNoAny.No;

    default:
      return YesNoAny.Any;
  }
}

export function fromYesNoAny(value: YesNoAny) {
  switch (value) {
    case YesNoAny.Yes:
      return true;

    case YesNoAny.No:
      return false;

    default:
      return undefined;
  }
}

export async function enableBackForOverlay(presenter: () => Promise<void>) {
  if (!window.history.state?.modal) {
    window.history.pushState({ modal: true }, '');
  }
  try {
    await presenter();
  } finally {
    if (window.history.state?.modal) {
      window.history.back();
    }
  }
}

export function createSwipeGesture(el: HTMLElement, handler: (swipe: SwipeDirection) => void) {
  return createGesture({
    el: el,
    threshold: 30,
    gestureName: 'swipe',
    onEnd: e => {
      const swipe = getSwipe(e);
      if (isNullOrEmpty(swipe)) return

      handler(swipe);
    }
  });
}

function getSwipe(e: GestureDetail) {
  if (Math.abs(e.velocityX) < 0.1) {
    return undefined
  }

  if (e.deltaX < 0) {
    return SwipeDirection.Left;
  }

  return SwipeDirection.Right;
}

export function getContainingModal(el: HTMLElement) {
  return el.closest('ion-modal');
}

export function configureModalAutofocus(el: HTMLElement) {
  getContainingModal(el)?.addEventListener('focus', performAutofocus);
}

function performAutofocus(this: HTMLIonModalElement) {
  // Get the component displayed on the modal.
  let component: Element | null = null;
  if (typeof this.component === 'string') {
    component = this.querySelector(this.component);
  } else if (this.component instanceof HTMLElement) {
    component = this.component;
  }

  // Check the shadow DOM first, then the light DOM, and finally the component itself.
  let focusEl = component?.shadowRoot?.querySelector('[autofocus]') || component?.querySelector('[autofocus]') || component;

  // WORKAROUND: If the component is an HTML-EDITOR,
  // focus on the editor content instead of the editor itself.
  if (focusEl.tagName === 'HTML-EDITOR') {
    focusEl = focusEl.querySelector('.editor-content');
  }

  if (focusEl instanceof HTMLElement) {
    focusEl.focus();
  }

  this.removeEventListener('focus', performAutofocus);
}

export async function dismissContainingModal(el: HTMLElement, data?: unknown) {
  return getContainingModal(el).dismiss(data);
}

export async function showToast(message: string, duration = 2000) {
  const toast = await toastController.create({ message, duration });
  toast.present();
}

export async function showLoading(action: () => Promise<void>, message = 'Please wait...') {
  const loading = await loadingController.create({
    message: message,
  });
  await loading.present();
  try {
    await action();
  } finally {
    await loading.dismiss();
  }
}

async function getActiveComponent(router: HTMLIonRouterOutletElement | HTMLIonTabsElement) {
  const routeId = await router.getRouteId();
  if (isNull(routeId)) {
    return undefined;
  }

  if ('getTab' in router) {
    const tab = await router.getTab(routeId.id);
    if (!isNull(tab.component)) {
      if (tab.component instanceof HTMLElement) {
        return tab.component;
      } else if (typeof tab.component === 'string') {
        return tab.querySelector(tab.component);
      }
    }
  }
  return routeId.element;
}

export async function sendActivatedCallback(router: HTMLIonRouterOutletElement | HTMLIonTabsElement) {
  // Let the current page know it's being deactivated
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const el = await getActiveComponent(router) as any;
  if (!isNull(el) && typeof el.activatedCallback === 'function') {
    el.activatedCallback();
  }
}

export async function sendDeactivatingCallback(router: HTMLIonRouterOutletElement | HTMLIonTabsElement) {
  // Let the current page know it's being deactivated
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const el = await getActiveComponent(router) as any;
  if (!isNull(el) && typeof el.deactivatingCallback === 'function') {
    el.deactivatingCallback();
  }
}

export function preProcessMultilineText(text: string) {
  // This function exists to handle backward compatibility with older versions.
  // Before the introduction of the WYSIWYG edtior,
  // all text was rendered as the original text with whitespace preserved.

  // Return early if there are no newlines in the text.
  if (!text.includes('\n') && !text.includes('\r')) {
    return text;
  }

  // Convert all newlines to <br> tags.
  text = text.replace(/(\r\n|\r|\n)/g, '<br>');

  // Preserve all consecutive spaces.
  text = text.replace(/\s{2,}/gm, match => {
    // Replace multiple spaces with alternating &nbsp; and space characters.
    // This is to ensure that the text is rendered with the same whitespace as before,
    // while maintaining the ability for the text to be wrapped.
    return match.split('').map((char, index) => {
      return index % 2 === 0 ? '&nbsp;' : char;
    }).join('');
  });

  return text;
}

export function sanitizeHTML(html: string) {
  // Sanitize the HTML using DOMPurify to prevent XSS attacks.
  // Forbid the use of style attributes and style tags.
  // Also forbid span tags to prevent inline styles.
  return DOMPurify.sanitize(html, { FORBID_ATTR: ['style'], FORBID_TAGS: ['style', 'span'] });
}
