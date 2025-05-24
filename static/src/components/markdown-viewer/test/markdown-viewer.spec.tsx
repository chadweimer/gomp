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
    const node = page.root.shadowRoot.querySelector('div');
    expect(node).not.toBeNull();
    expect(node).toEqualText('');
  });

  it('bind to value', async () => {
    const value = 'text';
    const page = await newSpecPage({
      components: [MarkdownViewer],
      template: () => (<markdown-viewer value={value}></markdown-viewer>),
    });
    const node = page.root.shadowRoot.querySelector('div');
    expect(node.innerHTML).toEqualHtml('<p>text</p>');
    expect(page.rootInstance.value).toEqual(value);
    page.rootInstance.value = 'Some other text';
    await page.waitForChanges();
    expect(node.innerHTML).toEqualHtml('<p>Some other text</p>');
  });

  it('renders markdown', async () => {
    const value = '**bold text**';
    const page = await newSpecPage({
      components: [MarkdownViewer],
      template: () => (<markdown-viewer value={value}></markdown-viewer>),
    });
    const node = page.root.shadowRoot.querySelector('div');
    expect(node.innerHTML).toEqualHtml('<p><strong>bold text</strong></p>');
    expect(page.rootInstance.value).toEqual(value);
  });
});
