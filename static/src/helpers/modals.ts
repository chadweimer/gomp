import { actionSheetController, ActionSheetOptions, alertController, AlertOptions, ComponentRef, loadingController, modalController, ModalOptions, OverlayEventDetail, toastController } from "@ionic/core";

const dismissingModals = new WeakMap<HTMLElement, boolean>();
async function present<T = unknown>(
  presenter: HTMLElement & {
    present: () => Promise<void>,
    dismiss: (data?: unknown, role?: string) => Promise<boolean>,
    onDidDismiss: () => Promise<OverlayEventDetail<T>>
  },
  cancelRole: string
) {
  const onPopState = async () => {
    globalThis.history.pushState({ modal: true }, '');
    if (!dismissingModals.get(presenter)) {
      await presenter.dismiss(undefined, cancelRole);
    }
  };

  let pushedState = false;
  if (!(globalThis.history.state as { modal?: boolean })?.modal) {
    globalThis.addEventListener('popstate', onPopState);
    globalThis.history.pushState({ modal: true }, '');
    pushedState = true;
  }
  try {
    await presenter.present();
    return await presenter.onDidDismiss();
  } finally {
    globalThis.removeEventListener('popstate', onPopState);
    if (pushedState) {
      globalThis.history.back();
    }
  }
}

export async function showModal<T = unknown>(options: ModalOptions<ComponentRef>, cancelRole = 'cancel') {
  // Default to not allowing backdrop dismiss if not specified.
  options.backdropDismiss ??= false;

  const modal = await modalController.create(options);
  modal.addEventListener?.('focus', performAutofocus);
  try {
    return await present<T>(modal, cancelRole);
  } finally {
    modal.removeEventListener?.('focus', performAutofocus);
  }
}

export function configureModalCanDismiss(
  modal: HTMLIonModalElement | null | undefined,
  isDirty: (data?: unknown, role?: string) => boolean | Promise<boolean>
) {
  if (!modal) {
    return
  }

  modal.canDismiss = async (data?: unknown, role?: string) => {
    dismissingModals.set(modal, true);
    try {
      let isDirtyResult = isDirty(data, role);
      if (typeof isDirtyResult !== 'boolean') {
        isDirtyResult = await isDirtyResult;
      }
      if (isDirtyResult) {
        const { role: alertRole } = await showAlert({
          header: 'Discard Changes?',
          message: 'You have unsaved changes. Are you sure you want to discard them?',
          buttons: [
            { text: 'Continue Editing', role: 'cancel' },
            { text: 'Discard Changes', role: 'destructive' },
          ],
        });
        return alertRole === 'destructive';
      }
    } catch (ex) {
      console.error(ex);
    } finally {
      dismissingModals.delete(modal);
    }
    return true;
  };
}

export function getContainingModal(el: HTMLElement) {
  return el.closest('ion-modal');
}

export function performAutofocus(this: HTMLIonModalElement) {
  // Get the component displayed on the modal.
  let component: Element | null = null;
  if (typeof this.component === 'string') {
    component = this.querySelector(this.component);
  } else if (this.component instanceof HTMLElement) {
    component = this.component;
  }

  // Check the shadow DOM first, then the light DOM, and finally the component itself.
  const focusEl = component?.shadowRoot?.querySelector('[autofocus]')
    || component?.querySelector('[autofocus]')
    || component;

  if (focusEl instanceof HTMLElement) {
    focusEl.focus();
  }

  this.removeEventListener('focus', performAutofocus);
}

export async function showAlert<T = unknown>(options: AlertOptions, cancelRole = 'cancel') {
  const alert = await alertController.create(options);
  return await present<T>(alert, cancelRole);
}

export async function showActionSheet<T = unknown>(options: ActionSheetOptions, cancelRole = 'cancel') {
  const actionSheet = await actionSheetController.create(options);
  return await present<T>(actionSheet, cancelRole);
}

export async function showToast(message: string, duration = 2000) {
  const toast = await toastController.create({ message, duration });
  await toast.present();
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

export type ResultsPerPage = 24 | 36 | 60 | 96 | 120;
export const DEFAULT_RESULTS_PER_PAGE_OPTIONS: readonly ResultsPerPage[] = [24, 36, 60, 96, 120] as const;
export async function showResultsPerPageAlert<T extends number = ResultsPerPage>(
  currentValue: T,
  onSelect: (count: T) => void,
  options: readonly T[] = DEFAULT_RESULTS_PER_PAGE_OPTIONS as readonly T[],
): Promise<void> {
  const { data, role } = await showAlert<{ values: T }>({
    header: 'Results Per Page',
    inputs: options.map(item => ({
      type: 'radio',
      label: item.toLocaleString(),
      value: item,
      checked: currentValue === item,
    })),
    buttons: [
      { text: 'Cancel', role: 'cancel' },
      { text: 'OK', role: 'confirm' },
    ],
  });

  if (role === 'confirm') {
    onSelect(data?.values ?? currentValue)
  }
}
