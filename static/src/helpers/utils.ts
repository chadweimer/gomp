import { GestureDetail, loadingController, toastController } from '@ionic/core';
import { AccessLevel, User, YesNoAny } from '../generated';
import { SwipeDirection } from '../models';

export function formatDate(dateStr: string) {
  return new Date(dateStr).toLocaleDateString();
}

export function hasAccessLevel(user: User | null | undefined, accessLevel: AccessLevel) {
  if (!user) {
    return false;
  }

  switch (accessLevel) {
    case AccessLevel.Admin:
      return user.accessLevel === AccessLevel.Admin;

    case AccessLevel.Editor:
      return user.accessLevel === AccessLevel.Admin || user.accessLevel === AccessLevel.Editor;

    default:
      return true;
  }
}

export async function redirect(route: string) {
  const router = document.querySelector('ion-router');
  await router.push(route);
}

export function capitalizeFirstLetter(val: string) {
  return val.charAt(0).toLocaleUpperCase() + val.slice(1);
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

export function getSwipe(e: GestureDetail) {
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

export async function dismissContainingModal(el: HTMLElement, data?: any) {
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

export async function getActiveComponent(tabs: HTMLIonTabsElement) {
  const tabId = await tabs.getSelected();
  if (tabId !== undefined) {
    const tab = await tabs.getTab(tabId);
    if (tab.component !== undefined) {
      return tab.querySelector(tab.component.toString());
    } else {
      const nav = tab.querySelector('ion-nav');
      const activePage = await nav.getActive();
      return activePage?.element;
    }
  }

  return undefined;
}

export async function sendActivatedCallback(tabs: HTMLIonTabsElement) {
  // Let the current page know it's being deactivated
  const el = await getActiveComponent(tabs) as any;
  if (el && typeof el.activatedCallback === 'function') {
    el.activatedCallback();
  }
}

export async function sendDeactivatingCallback(tabs: HTMLIonTabsElement) {
  // Let the current page know it's being deactivated
  const el = await getActiveComponent(tabs) as any;
  if (el && typeof el.deactivatingCallback === 'function') {
    el.deactivatingCallback();
  }
}
