import { createGesture, GestureDetail, loadingController, toastController } from '@ionic/core';
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
  return date?.toLocaleDateString() ?? '';
}

export function hasScope(token: string | null | undefined, accessLevel: AccessLevel) {
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
  if (val == undefined) {
    return '';
  }

  return val.replace(/([A-Z])/g, ' $1').trim()
}

export function enumKeyFromValue(keys: object, val: string) {
  if (val == undefined) {
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
  const focusEl = this.querySelector('[autofocus]');
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
    animated: false,
  });
  await loading.present();
  try {
    await action();
  } finally {
    await loading.dismiss();
  }
}

export async function getActiveComponent(router: HTMLIonRouterOutletElement | HTMLIonTabsElement) {
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
