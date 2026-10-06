import { actionSheetController, ActionSheetOptions, alertController, AlertOptions, ComponentRef, loadingController, modalController, ModalOptions, toastController } from "@ionic/core";

async function enableBackForOverlay<T = unknown>(presenter: () => Promise<T>) {
  const onPopState = (e: PopStateEvent) => {
    if (!(e.state as { modal?: boolean })?.modal) {
      globalThis.history.pushState({ modal: true }, '');
    }
  };

  globalThis.addEventListener('popstate', onPopState);
  if (!(globalThis.history.state as { modal?: boolean })?.modal) {
    globalThis.history.pushState({ modal: true }, '');
  }
  try {
    return await presenter();
  } finally {
    globalThis.removeEventListener('popstate', onPopState);
    if ((globalThis.history.state as { modal?: boolean })?.modal) {
      globalThis.history.back();
    }
  }
}

export async function showModal<T = unknown>(options: ModalOptions<ComponentRef>) {
  return await enableBackForOverlay(async () => {
    // Default to not allowing backdrop dismiss if not specified.
    options.backdropDismiss ??= false;

    const modal = await modalController.create(options);
    await modal.present();
    return await modal.onDidDismiss<T>();
  });
}

export async function showAlert<T = unknown>(options: AlertOptions) {
  return await enableBackForOverlay(async () => {
    const alert = await alertController.create(options);
    await alert.present();
    return await alert.onDidDismiss<T>();
  });
}

export async function showActionSheet<T = unknown>(options: ActionSheetOptions) {
  return await enableBackForOverlay(async () => {
    const actionSheet = await actionSheetController.create(options);
    await actionSheet.present();
    return await actionSheet.onDidDismiss<T>();
  });
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

function getContainingModal(el: HTMLElement) {
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
  if (focusEl?.tagName === 'HTML-EDITOR') {
    focusEl = focusEl.querySelector('.editor-content');
  }

  if (focusEl instanceof HTMLElement) {
    focusEl.focus();
  }

  this.removeEventListener('focus', performAutofocus);
}

export function dismissContainingModal(el: HTMLElement, data?: unknown, role?: string) {
  return getContainingModal(el)?.dismiss(data, role);
}

export function configureModalCanDismiss(el: HTMLElement, isDirty: (data?: unknown, role?: string) => boolean | Promise<boolean>, destructiveRoles: string[] = ['cancel']) {
  const modal = getContainingModal(el);
  if (modal) {
    modal.canDismiss = async (data?: unknown, role?: string) => {
      // Dismiss immediately if the modal is no longer attached to the DOM.
      if (modal.presentingElement && modal.presentingElement?.parentElement === null) {
        return true;
      }

      // Only check if the component is dirty for a destructive operation
      if (role && !destructiveRoles.includes(role)) {
        return true;
      }

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
      }
      return true;
    };
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
