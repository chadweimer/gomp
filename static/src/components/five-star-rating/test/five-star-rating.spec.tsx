import { render, h, describe, it, expect } from '@stencil/vitest';
import '../five-star-rating';

describe('five-star-rating', () => {
  it('builds', async () => {
    const { root } = await render(<five-star-rating />);
    expect(root).toHaveClass('hydrated');
  });

  it('renders', async () => {
    const { root } = await render(<five-star-rating />);
    const icons = root.shadowRoot?.querySelectorAll('ion-icon');
    expect(icons).not.toBeNull();
    expect(icons?.length).toBe(10);
    // Check that the icons alternate between whole and half icons
    for (let i = 0; i < icons!.length; i++) {
      const icon = icons![i];
      const expectedClass = i % 2 === 0 ? 'whole' : 'half';
      expect(icon).toHaveClass(expectedClass);
      expect(icon).not.toHaveClass('selected');
    }
  });

  it('renders value', async () => {
    const { root } = await render(<five-star-rating value={3.5} />);
    const icons = root.shadowRoot?.querySelectorAll('ion-icon');
    expect(icons).not.toBeNull();
    expect(icons?.length).toBe(10);
    // Check that only the last 7 icons are selected
    for (let i = 0; i < 3; i++) {
      const icon = icons![i];
      expect(icon).not.toHaveClass('selected');
    }
    for (let i = 3; i < icons!.length; i++) {
      const icon = icons![i];
      expect(icon).toHaveClass('selected');
    }
  });
});
