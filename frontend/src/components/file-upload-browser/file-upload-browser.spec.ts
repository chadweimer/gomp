import { fixture, html } from '@open-wc/testing';
import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import './file-upload-browser';
import { FileUploadBrowser } from './file-upload-browser';

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
    const el = await fixture<FileUploadBrowser>(html`<file-upload-browser></file-upload-browser>`);

    const title = el.shadowRoot?.querySelector('ion-title');
    expect(title?.textContent?.trim()).toBe('Select File');

    const label = el.shadowRoot?.querySelector('ion-label');
    expect(label?.textContent?.trim()).toBe('File');

    const fileInput = el.shadowRoot?.querySelector<HTMLInputElement>('input[type="file"]');
    expect(fileInput).not.toBeNull();
    expect(fileInput?.getAttribute('accept')).toBe('*/*');
    expect(fileInput?.hasAttribute('required')).toBe(true);
  });

  it('renders custom props', async () => {
    const el = await fixture<FileUploadBrowser>(html`
      <file-upload-browser
        heading="Upload Recipe Image"
        label="Recipe Image"
        accept="image/*"
      ></file-upload-browser>
    `);

    const title = el.shadowRoot?.querySelector('ion-title');
    expect(title?.textContent?.trim()).toBe('Upload Recipe Image');

    const label = el.shadowRoot?.querySelector('ion-label');
    expect(label?.textContent?.trim()).toBe('Recipe Image');

    const fileInput = el.shadowRoot?.querySelector<HTMLInputElement>('input[type="file"]');
    expect(fileInput?.getAttribute('accept')).toBe('image/*');
  });

  it('does not dismiss when form validity fails', async () => {
    const el = await fixture<FileUploadBrowser>(html`<file-upload-browser></file-upload-browser>`);
    modalEl.appendChild(el);
    await el.updateComplete;

    const form = el.shadowRoot?.querySelector('form');
    if (form) {
      vi.spyOn(form, 'reportValidity').mockReturnValue(false);
    }

    const uploadBtn = el.shadowRoot?.querySelector<HTMLIonButtonElement>('ion-buttons[slot="primary"] ion-button');
    uploadBtn?.click();

    expect(modalEl.dismiss).not.toHaveBeenCalled();
  });

  it('dismisses with selected file on upload', async () => {
    const el = await fixture<FileUploadBrowser>(html`<file-upload-browser></file-upload-browser>`);
    modalEl.appendChild(el);
    await el.updateComplete;

    const file = new File(['mock content'], 'recipe.jpg', { type: 'image/jpeg' });
    const fileInput = el.shadowRoot?.querySelector<HTMLInputElement>('input[type="file"]');
    if (fileInput) {
      Object.defineProperty(fileInput, 'files', {
        value: [file],
        configurable: true,
      });
    }

    const form = el.shadowRoot?.querySelector('form');
    if (form) {
      vi.spyOn(form, 'reportValidity').mockReturnValue(true);
    }

    const uploadBtn = el.shadowRoot?.querySelector<HTMLIonButtonElement>('ion-buttons[slot="primary"] ion-button');
    uploadBtn?.click();

    expect(modalEl.dismiss).toHaveBeenCalledWith({ file }, 'save');
  });

  it('dismisses modal on cancel', async () => {
    const el = await fixture<FileUploadBrowser>(html`<file-upload-browser></file-upload-browser>`);
    modalEl.appendChild(el);
    await el.updateComplete;

    const cancelBtn = el.shadowRoot?.querySelector<HTMLIonButtonElement>('ion-buttons[slot="secondary"] ion-button');
    cancelBtn?.click();

    expect(modalEl.dismiss).toHaveBeenCalledWith(undefined, 'cancel');
  });
});

