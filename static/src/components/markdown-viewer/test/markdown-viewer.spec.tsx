import { h } from '@stencil/core';
import { newSpecPage } from '@stencil/core/testing';
import { MarkdownViewer } from '../markdown-viewer';

describe('markdown-viewer', () => {
  it('builds', async () => {
    const page = await newSpecPage({
      components: [MarkdownViewer],
      html: '<markdown-viewer></markdown-viewer>',
    });
    expect(page.rootInstance).toBeInstanceOf(MarkdownViewer);
  });

  it('renders', async () => {
    const page = await newSpecPage({
      components: [MarkdownViewer],
      html: '<markdown-viewer></markdown-viewer>',
    });
    expect(page.root.shadowRoot).toEqualHtml('');
  });

  it('bind to value', async () => {
    const value = '**bold text**';
    const page = await newSpecPage({
      components: [MarkdownViewer],
      template: () => (<markdown-viewer value={value}></markdown-viewer>),
    });
    expect(page.root.shadowRoot).toEqualHtml('<p><strong>bold text</strong></p>');
    expect(page.rootInstance.value).toEqual(value);
    page.rootInstance.value = 'Some other text';
    await page.waitForChanges();
    expect(page.root.shadowRoot).toEqualHtml('<p>Some other text</p>');
  });

  it('update value', async () => {
    const value = '**bold text**';
    const page = await newSpecPage({
      components: [MarkdownViewer],
      template: () => (<markdown-viewer></markdown-viewer>),
    });
    page.rootInstance.value = value;
    await page.waitForChanges();
    expect(page.root.shadowRoot).toEqualHtml('<p><strong>bold text</strong></p>');
    expect(page.rootInstance.value).toEqual(value);
  });
});
