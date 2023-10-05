import { newE2EPage } from '@stencil/core/testing';

describe('note-card', () => {
  it('renders', async () => {
    const page = await newE2EPage();
    await page.setContent('<note-card></note-card>');

    const element = await page.find('note-card');
    expect(element).toHaveClass('hydrated');
  });
});
