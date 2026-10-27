import { fixture, html } from '@open-wc/testing';
import { describe, it, expect } from 'vitest';
import './html-viewer';
import { HTMLViewer } from './html-viewer';

describe('html-viewer', () => {
  it('renders empty by default', async () => {
    const el = await fixture<HTMLViewer>(html`<html-viewer></html-viewer>`);
    const div = el.shadowRoot?.querySelector('div');
    expect(div).not.toBeNull();
    expect(div?.innerHTML).toBe('');
  });

  it('binds to value and updates when value changes', async () => {
    const el = await fixture<HTMLViewer>(html`<html-viewer .value=${'<b>test</b>'}></html-viewer>`);
    const div = el.shadowRoot?.querySelector('div');
    expect(div?.innerHTML).toBe('<b>test</b>');

    el.value = '<i>updated</i>';
    await el.updateComplete;
    expect(div?.innerHTML).toBe('<i>updated</i>');
  });
});

