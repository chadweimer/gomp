import { newE2EPage } from '@stencil/core/testing';

describe('user-editor', () => {
  it('renders', async () => {
    const page = await newE2EPage();
    await page.setContent('<user-editor></user-editor>');

    const element = await page.find('user-editor');
    expect(element).toHaveClass('hydrated');
  });
});
