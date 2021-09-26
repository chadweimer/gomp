import { AccessLevel, User } from '../models';

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
