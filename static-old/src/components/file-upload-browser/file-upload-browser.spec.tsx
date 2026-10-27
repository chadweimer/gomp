import { render, h, describe, it, expect, beforeEach, afterEach, vi } from '@stencil/vitest';
import './file-upload-browser';

describe('file-upload-browser', () => {
  let modalEl: HTMLIonModalElement;

  beforeEach(() => {
    modalEl = document.createElement('ion-modal');
    modalEl.dismiss = vi.fn().mockResolvedValue(true);
    document.body.appendChild(modalEl);
  });

  afterEach(() => {
    modalEl.remove();
    vi.restoreAllMocks();
  });

  it('renders default values', async () => {
    const { root } = await render(<file-upload-browser />);
    expect(root).toHaveClass('hydrated');

    const title = root.shadowRoot?.querySelector('ion-title');
    expect(title).toHaveTextContent('Select File');

    const label = root.shadowRoot?.querySelector('ion-label');
    expect(label).toHaveTextContent('File');

    const fileInput = root.shadowRoot?.querySelector<HTMLInputElement>('input[type="file"]');
    expect(fileInput).not.toBeNull();
    expect(fileInput).toEqualAttribute('accept', '*/*');
    expect(fileInput).toHaveAttribute('required');
  });

  it('renders custom props', async () => {
    const { root } = await render(
      <file-upload-browser
        heading="Upload Recipe Image"
        label="Recipe Image"
        accept="image/*"
      />
    );

    const title = root.shadowRoot?.querySelector('ion-title');
    expect(title).toHaveTextContent('Upload Recipe Image');

    const label = root.shadowRoot?.querySelector('ion-label');
    expect(label).toHaveTextContent('Recipe Image');

    const fileInput = root.shadowRoot?.querySelector<HTMLInputElement>('input[type="file"]');
    expect(fileInput).toEqualAttribute('accept', 'image/*');
  });

  describe('save action', () => {
    it('does not dismiss when form validity fails', async () => {
      const { root, waitForChanges } = await render<HTMLFileUploadBrowserElement>(<file-upload-browser />);
      modalEl.appendChild(root);
      await waitForChanges();

      const form = root.shadowRoot?.querySelector('form');
      if (form) {
        vi.spyOn(form, 'reportValidity').mockReturnValue(false);
      }

      const uploadBtn = root.shadowRoot?.querySelector<HTMLIonButtonElement>('ion-buttons[slot="primary"] ion-button');
      uploadBtn?.click();
      await waitForChanges();

      expect(modalEl.dismiss).not.toHaveBeenCalled();
    });

    it('dismisses with selected file on upload', async () => {
      const { root, waitForChanges } = await render<HTMLFileUploadBrowserElement>(<file-upload-browser />);
      modalEl.appendChild(root);
      await waitForChanges();

      const file = new File(['mock content'], 'recipe.jpg', { type: 'image/jpeg' });
      const fileInput = root.shadowRoot?.querySelector<HTMLInputElement>('input[type="file"]');
      if (fileInput) {
        Object.defineProperty(fileInput, 'files', {
          value: [file],
          configurable: true,
        });
      }

      const form = root.shadowRoot?.querySelector('form');
      if (form) {
        vi.spyOn(form, 'reportValidity').mockReturnValue(true);
      }

      const uploadBtn = root.shadowRoot?.querySelector<HTMLIonButtonElement>('ion-buttons[slot="primary"] ion-button');
      uploadBtn?.click();
      await waitForChanges();

      expect(modalEl.dismiss).toHaveBeenCalledWith({ file }, 'save');
    });

    it('dismisses with null file when files list is empty', async () => {
      const { root, waitForChanges } = await render<HTMLFileUploadBrowserElement>(<file-upload-browser />);
      modalEl.appendChild(root);
      await waitForChanges();

      const form = root.shadowRoot?.querySelector('form');
      if (form) {
        vi.spyOn(form, 'reportValidity').mockReturnValue(true);
      }

      const uploadBtn = root.shadowRoot?.querySelector<HTMLIonButtonElement>('ion-buttons[slot="primary"] ion-button');
      uploadBtn?.click();
      await waitForChanges();

      expect(modalEl.dismiss).toHaveBeenCalledWith({ file: null }, 'save');
    });
  });

  describe('cancel action', () => {
    it('dismisses modal with cancel role when Cancel is clicked', async () => {
      const { root, waitForChanges } = await render<HTMLFileUploadBrowserElement>(<file-upload-browser />);
      modalEl.appendChild(root);
      await waitForChanges();

      const cancelBtn = root.shadowRoot?.querySelector<HTMLIonButtonElement>('ion-buttons[slot="secondary"] ion-button');
      cancelBtn?.click();
      await waitForChanges();

      expect(modalEl.dismiss).toHaveBeenCalledWith(undefined, 'cancel');
    });
  });
});
