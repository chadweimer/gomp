import { h } from '@stencil/core';
import { newSpecPage } from '@stencil/core/testing';
import { HTMLViewer } from '../html-viewer';

describe('html-viewer', () => {
  it('builds', async () => {
    const page = await newSpecPage({
      components: [HTMLViewer],
      html: '<html-viewer></html-viewer>',
    });
    expect(page.rootInstance).toBeInstanceOf(HTMLViewer);
  });

  it('renders', async () => {
    const page = await newSpecPage({
      components: [HTMLViewer],
      html: '<html-viewer></html-viewer>',
    });
    const node = page.root.shadowRoot.querySelector('div');
    expect(node).not.toBeNull();
    expect(node).toEqualText('');
  });

  it('bind to value', async () => {
    const value = 'text';
    const page = await newSpecPage({
      components: [HTMLViewer],
      template: () => (<html-viewer value={value}></html-viewer>),
    });
    const node = page.root.shadowRoot.querySelector('div');
    expect(node.innerHTML).toEqualHtml('text');
    expect(page.rootInstance.value).toEqual(value);
    page.rootInstance.value = 'Some other text';
    await page.waitForChanges();
    expect(node.innerHTML).toEqualHtml('Some other text');
  });

  it('renders whitespace', async () => {
    const value = 'text with  extra   spaces\nand\n\nnewlines';
    const page = await newSpecPage({
      components: [HTMLViewer],
      template: () => (<html-viewer value={value}></html-viewer>),
    });
    const node = page.root.shadowRoot.querySelector('div');
    expect(node.innerHTML).toEqualHtml('text with&nbsp; extra&nbsp; &nbsp;spaces<br>and<br><br>newlines');
    expect(page.rootInstance.value).toEqual(value);
  });
});
