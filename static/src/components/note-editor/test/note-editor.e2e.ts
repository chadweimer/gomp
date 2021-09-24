import { newE2EPage } from '@stencil/core/testing';

describe('note-editor', () => {
  it('renders', async () => {
    const page = await newE2EPage();
    await page.setContent('<note-editor></note-editor>');

    const element = await page.find('note-editor');
    expect(element).toHaveClass('hydrated');
  });
});
