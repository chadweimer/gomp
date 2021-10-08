import { toastController } from '@ionic/core';
import { AccessLevel, User, YesNoAny } from '../models';

export function formatDate(dateStr: string) {
  return new Date(dateStr).toLocaleDateString();
}

export function configureModalAutofocus(el: HTMLElement) {
  el.closest('ion-modal')?.addEventListener('focus', performAutofocus);
}
function performAutofocus(this: HTMLIonModalElement) {
  const focusEl = this.querySelector('[autofocus]');
  if (focusEl instanceof HTMLElement) {
    focusEl.focus();
  }
  this.removeEventListener('focus', performAutofocus);
}

export function hasAccessLevel(user: User | null | undefined, accessLevel: AccessLevel) {
  if (!user) {
    return false;
  }

  switch (accessLevel) {
    case AccessLevel.Administrator:
      return user.accessLevel === AccessLevel.Administrator;

    case AccessLevel.Editor:
      return user.accessLevel === AccessLevel.Administrator || user.accessLevel === AccessLevel.Editor;

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
      return null;
  }
}

export async function showToast(message: string, duration = 2000) {
  const toast = await toastController.create({ message, duration });
  toast.present();
}
