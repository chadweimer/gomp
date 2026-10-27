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

    const boldBtn = el.shadowRoot?.querySelector('ion-button strong');
    expect(boldBtn).not.toBeNull();
    expect(boldBtn?.textContent?.trim()).toBe('B');

    const italicBtn = el.shadowRoot?.querySelector('ion-button em');
    expect(italicBtn).not.toBeNull();

    const underlineBtn = el.shadowRoot?.querySelector('ion-button u');
    expect(underlineBtn).not.toBeNull();

    const listIcon = el.shadowRoot?.querySelector('ion-button ion-icon[icon="list"]');
    expect(listIcon).not.toBeNull();

    const imageIcon = el.shadowRoot?.querySelector('ion-button ion-icon[icon="image"]');
    expect(imageIcon).toBeNull();

    const picker = el.shadowRoot?.querySelector('.image-picker-panel');
    expect(picker).toBeNull();
  });

  it('renders image button and toggles image picker panel when images provided', async () => {
    const el = await fixture<HTMLEditor>(html`<html-editor .images=${mockImages}></html-editor>`);

    const imageIcon = el.shadowRoot?.querySelector('ion-button ion-icon[icon="image"]');
    expect(imageIcon).not.toBeNull();

    const imageBtn = imageIcon?.closest('ion-button') as HTMLElement;
    imageBtn.click();
    await el.updateComplete;

    const picker = el.shadowRoot?.querySelector('.image-picker-panel');
    expect(picker).not.toBeNull();

    // Clicking again closes panel
    imageBtn.click();
    await el.updateComplete;
    expect(el.shadowRoot?.querySelector('.image-picker-panel')).toBeNull();
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
    const detail = onValueChanged.mock.calls[0][0];
    expect(detail).toContain(`src="${mockImages[0].url}"`);
    expect(detail).toContain(`data-image="${mockImages[0].name}"`);
    outsideEl.remove();
  });

  it('closes panel on blur when focus moves outside', async () => {
    const el = await fixture<HTMLEditor>(html`<html-editor .images=${mockImages}></html-editor>`);

    const imageIcon = el.shadowRoot?.querySelector('ion-button ion-icon[icon="image"]');
    const imageBtn = imageIcon?.closest('ion-button') as HTMLElement;
    imageBtn.click();
    await el.updateComplete;
    expect(el.shadowRoot?.querySelector('.image-picker-panel')).not.toBeNull();

    const outsideEl = document.createElement('div');
    document.body.appendChild(outsideEl);

    el.dispatchEvent(new FocusEvent('focusout', { relatedTarget: outsideEl, bubbles: true }));
    await el.updateComplete;

    expect(el.shadowRoot?.querySelector('.image-picker-panel')).toBeNull();
    outsideEl.remove();
  });

  it('delegates focus to editor content when host receives focus', async () => {
    const el = await fixture<HTMLEditor>(html`<html-editor></html-editor>`);
    const editor = el.shadowRoot?.querySelector('.tiptap') as HTMLElement;
    expect(editor).not.toBeNull();

    const focusSpy = vi.spyOn(editor, 'focus');
    el.focus();
    await el.updateComplete;

    expect(focusSpy).toHaveBeenCalled();
  });

  it('returns clean HTML from getValue()', async () => {
    const el = await fixture<HTMLEditor>(html`<html-editor .value=${'<p>Initial text</p>'}></html-editor>`);
    const val = await el.getValue();
    expect(val).toBe('<p>Initial text</p>');
  });
});
