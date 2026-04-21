import { render, h, describe, it, expect } from '@stencil/vitest';
import '../html-viewer';

describe('html-viewer', () => {
  it('builds', async () => {
    const { root } = await render(<html-viewer />);
    expect(root).toHaveClass('hydrated');
  });

  it('renders', async () => {
    const { root } = await render(<html-viewer />);
    const node = root.shadowRoot?.querySelector('div');
    expect(node).not.toBeNull();
    expect(node).toEqualText('');
  });

  it('bind to value', async () => {
    const value = 'text';
    const { root, waitForChanges, setProps } = await render(<html-viewer value={value}></html-viewer>);
    const node = root.shadowRoot?.querySelector('div');
    expect(node?.innerHTML).toEqualHtml('text');
    expect(root).toHaveProperty('value', value);
    await setProps({ value: 'Some other text' });
    await waitForChanges();
    expect(node?.innerHTML).toEqualHtml('Some other text');
  });

  it('renders whitespace', async () => {
    const value = 'text with  extra   spaces\nand\n\nnewlines';
    const { root } = await render(<html-viewer value={value}></html-viewer>);
    const node = root.shadowRoot?.querySelector('div');
    expect(node?.innerHTML).toEqualHtml('text with&nbsp; extra&nbsp; &nbsp;spaces<br>and<br><br>newlines');
    expect(root).toHaveProperty('value', value);
  });
});
