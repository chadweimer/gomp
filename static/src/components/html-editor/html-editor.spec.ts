import { fixture, html } from '@open-wc/testing';
import { describe, it, expect, vi } from 'vitest';
import './html-editor';
import { HTMLEditor } from './html-editor';

describe('html-editor', () => {
  const mockImages: { name: string; url: string; thumbUrl: string }[] = [
    {
      name: 'step1.jpg',
      url: '/uploads/recipes/1/images/step1.jpg',
      thumbUrl: '/uploads/recipes/1/thumbs/step1.jpg',
    },
    {
      name: 'step2.png',
      url: '/uploads/recipes/1/images/step2.png',
      thumbUrl: '/uploads/recipes/1/thumbs/step2.png',
    },
  ];

  it('builds and renders default formatting buttons without image button when images is not provided', async () => {
    const el = await fixture<HTMLEditor>(html`<html-editor .value=${'<p>Hello world</p>'}></html-editor>`);

    const boldBtn = el.renderRoot.querySelector('ion-button strong');
    expect(boldBtn).not.toBeNull();
    expect(boldBtn?.textContent?.trim()).toBe('B');

    const italicBtn = el.renderRoot.querySelector('ion-button em');
    expect(italicBtn).not.toBeNull();

    const underlineBtn = el.renderRoot.querySelector('ion-button u');
    expect(underlineBtn).not.toBeNull();

    const listIcon = el.renderRoot.querySelector('ion-button ion-icon[icon="list"]');
    expect(listIcon).not.toBeNull();

    const imageIcon = el.renderRoot.querySelector('ion-button ion-icon[icon="image"]');
    expect(imageIcon).toBeNull();

    const picker = el.renderRoot.querySelector('.image-picker-panel');
    expect(picker).toBeNull();
  });

  it('renders image button and toggles image picker panel when images provided', async () => {
    const el = await fixture<HTMLEditor>(html`<html-editor .images=${mockImages}></html-editor>`);

    const imageIcon = el.renderRoot.querySelector('ion-button ion-icon[icon="image"]');
    expect(imageIcon).not.toBeNull();

    const imageBtn = imageIcon?.closest('ion-button') as HTMLElement;
    imageBtn.click();
    await el.updateComplete;

    const picker = el.renderRoot.querySelector('.image-picker-panel');
    expect(picker).not.toBeNull();

    // Clicking again closes panel
    imageBtn.click();
    await el.updateComplete;
    expect(el.renderRoot.querySelector('.image-picker-panel')).toBeNull();
  });

  it('emits valueChanged on blur', async () => {
    const el = await fixture<HTMLEditor>(
      html`<html-editor .images=${mockImages} .value=${`<p>Step 1: <img src="${mockImages[0].url}" data-image="${mockImages[0].name}" /></p>`}></html-editor>`
    );

    const onValueChanged = vi.fn();
    el.addEventListener('valueChanged', (e: Event) => onValueChanged((e as CustomEvent).detail));

    const outsideEl = document.createElement('div');
    document.body.appendChild(outsideEl);

    el.dispatchEvent(new FocusEvent('focusout', { relatedTarget: outsideEl, bubbles: true }));
    await el.updateComplete;

    expect(onValueChanged).toHaveBeenCalledTimes(1);
    const detail = onValueChanged.mock.calls[0][0] as string;
    expect(detail).toContain(`src="${mockImages[0].url}"`);
    expect(detail).toContain(`data-image="${mockImages[0].name}"`);
    outsideEl.remove();
  });

  it('closes panel on blur when focus moves outside', async () => {
    const el = await fixture<HTMLEditor>(html`<html-editor .images=${mockImages}></html-editor>`);

    const imageIcon = el.renderRoot.querySelector('ion-button ion-icon[icon="image"]');
    const imageBtn = imageIcon?.closest('ion-button') as HTMLElement;
    imageBtn.click();
    await el.updateComplete;
    expect(el.renderRoot.querySelector('.image-picker-panel')).not.toBeNull();

    const outsideEl = document.createElement('div');
    document.body.appendChild(outsideEl);

    el.dispatchEvent(new FocusEvent('focusout', { relatedTarget: outsideEl, bubbles: true }));
    await el.updateComplete;

    expect(el.renderRoot.querySelector('.image-picker-panel')).toBeNull();
    outsideEl.remove();
  });

  it('delegates focus to editor content when host receives focus', async () => {
    const el = await fixture<HTMLEditor>(html`<html-editor></html-editor>`);
    const editor = el.renderRoot.querySelector('.tiptap') as HTMLElement;
    expect(editor).not.toBeNull();

    const focusSpy = vi.spyOn(editor, 'focus');
    el.focus();
    await el.updateComplete;

    expect(focusSpy).toHaveBeenCalled();
  });

  it('does not re-delegate focus when a child element receives focus', async () => {
    const el = await fixture<HTMLEditor>(html`<html-editor></html-editor>`);
    const editorToolbar = el.renderRoot.querySelector('.editor-toolbar') as HTMLElement;
    expect(editorToolbar).not.toBeNull();
    const editor = el.renderRoot.querySelector('.tiptap') as HTMLElement;
    expect(editor).not.toBeNull();

    const focusSpy = vi.spyOn(editor, 'focus');

    editorToolbar.dispatchEvent(new FocusEvent('focus', { bubbles: true }));
    await el.updateComplete;

    expect(focusSpy).not.toHaveBeenCalled();
  });

  it('does not render image button when images is an empty array', async () => {
    const el = await fixture<HTMLEditor>(html`<html-editor .images=${[]}></html-editor>`);
    const imageIcon = el.renderRoot.querySelector('ion-button ion-icon[icon="image"]');
    expect(imageIcon).toBeNull();
  });

  it('inserts image when an image is selected', async () => {
    const el = await fixture<HTMLEditor>(
      html`<html-editor .images=${mockImages} .value=${'<p>Instructions</p>'}></html-editor>`
    );

    const imageBtn = el.renderRoot.querySelector('ion-button ion-icon[icon="image"]')?.closest('ion-button') as HTMLIonButtonElement;
    imageBtn.click();
    await el.updateComplete;

    let picker = el.renderRoot.querySelector('.image-picker-panel');
    const items = picker?.querySelectorAll('ion-button');
    items?.[0]?.click();
    await el.updateComplete;

    // Picker should be closed
    picker = el.renderRoot.querySelector('.image-picker-panel');
    expect(picker).toBeNull();

    // Editor content should contain the image tag
    const editorContent = el.renderRoot.querySelector('.editor-content');
    const img = editorContent?.querySelector('img[data-image]');
    expect(img).not.toBeNull();
    expect(img?.getAttribute('src')).toBe(mockImages[0].url);
    expect(img?.getAttribute('alt')).toBe(mockImages[0].name);
    expect(img?.getAttribute('data-image')).toBe(mockImages[0].name);

    // Event should be emitted with sentinel
    const currentValue = await el.getValue();
    expect(currentValue).toContain(`src="${mockImages[0].url}"`);
    expect(currentValue).toContain(`data-image="${mockImages[0].name}"`);
  });

  it('toggles link panel and creates a link', async () => {
    const el = await fixture<HTMLEditor>(
      html`<html-editor .value=${'<p>Click here</p>'}></html-editor>`
    );

    const linkBtn = el.renderRoot.querySelector('ion-button[title="Hyperlink"]') as HTMLIonButtonElement;
    expect(linkBtn).not.toBeNull();

    linkBtn.click();
    await el.updateComplete;

    const panel = el.renderRoot.querySelector('.link-panel');
    expect(panel).not.toBeNull();

    const input = panel?.querySelector('.link-input') as HTMLIonInputElement;
    input.value = 'https://example.com';
    input.dispatchEvent(new CustomEvent('ionInput', { detail: { value: 'https://example.com' } }));
    await el.updateComplete;

    const applyBtn = panel?.querySelector('ion-button') as HTMLIonButtonElement;
    applyBtn.click();
    await el.updateComplete;

    expect(el.renderRoot.querySelector('.link-panel')).toBeNull();
  });

  it('renders image with data-image and data-height attributes using GompImage', async () => {
    const el = await fixture<HTMLEditor>(
      html`<html-editor
        .images=${mockImages}
        .value=${`<p>Step 1: <img src="${mockImages[0].url}" data-image="${mockImages[0].name}" data-height="250px" /></p>`}
      ></html-editor>`
    );

    const img = el.renderRoot.querySelector('.editor-content img') as HTMLImageElement;
    expect(img).not.toBeNull();
    expect(img.dataset.image).toBe(mockImages[0].name);
    expect(img.dataset.height).toBe('250px');
    expect(img.style.height).toBe('250px');
  });

  it('renders formatting buttons in slot="start" and utility buttons in slot="end"', async () => {
    const el = await fixture<HTMLEditor>(html`<html-editor></html-editor>`);
    const startButtons = el.renderRoot.querySelector('ion-buttons[slot="start"]');
    expect(startButtons).not.toBeNull();

    const utilityButtons = el.renderRoot.querySelector('ion-buttons[slot="end"]');
    expect(utilityButtons).not.toBeNull();

    const buttons = utilityButtons?.querySelectorAll('ion-button');
    expect(buttons).toHaveLength(2);

    const invisIcon = buttons?.[0].querySelector('ion-icon[icon="document-text-outline"]');
    expect(invisIcon).not.toBeNull();
    expect(buttons?.[0].getAttribute('title')).toBe('Invisible characters');

    const helpIcon = buttons?.[1].querySelector('ion-icon[icon="help-circle-outline"]');
    expect(helpIcon).not.toBeNull();
    expect(buttons?.[1].getAttribute('title')).toBe('Keyboard shortcuts');
  });

  it('toggles help panel open and closed via help button', async () => {
    const el = await fixture<HTMLEditor>(html`<html-editor></html-editor>`);

    const helpBtn = el.renderRoot.querySelector('ion-button[title="Keyboard shortcuts"]') as HTMLIonButtonElement;
    expect(helpBtn).not.toBeNull();

    expect(el.renderRoot.querySelector('.help-panel')).toBeNull();

    helpBtn.click();
    await el.updateComplete;

    let helpPanel = el.renderRoot.querySelector('.help-panel');
    expect(helpPanel).not.toBeNull();

    const shortcutDescs = helpPanel?.querySelectorAll('.shortcut-desc');
    expect(shortcutDescs && shortcutDescs.length > 0).toBe(true);

    const shortcutKeys = helpPanel?.querySelectorAll('.shortcut-keys');
    expect(shortcutKeys && shortcutKeys.length > 0).toBe(true);

    expect(shortcutDescs?.length).toEqual(shortcutKeys?.length);

    helpBtn.click();
    await el.updateComplete;

    helpPanel = el.renderRoot.querySelector('.help-panel');
    expect(helpPanel).toBeNull();
  });

  it('closes help panel when pressing Escape key', async () => {
    const el = await fixture<HTMLEditor>(html`<html-editor></html-editor>`);

    const helpBtn = el.renderRoot.querySelector('ion-button[title="Keyboard shortcuts"]') as HTMLIonButtonElement;
    helpBtn.click();
    await el.updateComplete;

    expect(el.renderRoot.querySelector('.help-panel')).not.toBeNull();

    el.dispatchEvent(new KeyboardEvent('keydown', { key: 'Escape', bubbles: true }));
    await el.updateComplete;

    expect(el.renderRoot.querySelector('.help-panel')).toBeNull();
  });

  it('closes other panels when help panel is opened and vice versa', async () => {
    const el = await fixture<HTMLEditor>(html`<html-editor .images=${mockImages}></html-editor>`);

    const helpBtn = el.renderRoot.querySelector('ion-button[title="Keyboard shortcuts"]') as HTMLIonButtonElement;
    const imageBtn = el.renderRoot.querySelector('ion-button ion-icon[icon="image"]')?.closest('ion-button') as HTMLIonButtonElement;
    const linkBtn = el.renderRoot.querySelector('ion-button[title="Hyperlink"]') as HTMLIonButtonElement;

    // Open image picker
    imageBtn.click();
    await el.updateComplete;
    expect(el.renderRoot.querySelector('.image-picker-panel')).not.toBeNull();

    // Open help panel -> image picker should close
    helpBtn.click();
    await el.updateComplete;
    expect(el.renderRoot.querySelector('.help-panel')).not.toBeNull();
    expect(el.renderRoot.querySelector('.image-picker-panel')).toBeNull();

    // Open link panel -> help panel should close
    linkBtn.click();
    await el.updateComplete;
    expect(el.renderRoot.querySelector('.link-panel')).not.toBeNull();
    expect(el.renderRoot.querySelector('.help-panel')).toBeNull();
  });

  it('closes help panel on blur when focus moves outside the component', async () => {
    const el = await fixture<HTMLEditor>(html`<html-editor></html-editor>`);

    const helpBtn = el.renderRoot.querySelector('ion-button[title="Keyboard shortcuts"]') as HTMLIonButtonElement;
    helpBtn.click();
    await el.updateComplete;
    expect(el.renderRoot.querySelector('.help-panel')).not.toBeNull();

    const outsideEl = document.createElement('div');
    document.body.appendChild(outsideEl);

    el.dispatchEvent(new FocusEvent('focusout', { relatedTarget: outsideEl, bubbles: true }));
    await el.updateComplete;

    expect(el.renderRoot.querySelector('.help-panel')).toBeNull();
    outsideEl.remove();
  });

  it('returns clean HTML from getValue()', async () => {
    const el = await fixture<HTMLEditor>(html`<html-editor .value=${'<p>Initial text</p>'}></html-editor>`);
    const val = await el.getValue();
    expect(val).toBe('<p>Initial text</p>');
  });
});
