import { render, h, describe, it, expect, vi } from '@stencil/vitest';
import './five-star-rating';

describe('five-star-rating', () => {
  it('builds', async () => {
    const { root } = await render(<five-star-rating />);
    expect(root).toHaveClass('hydrated');
  });

  it('renders empty stars by default', async () => {
    const { root } = await render(<five-star-rating />);
    const icons = root.shadowRoot?.querySelectorAll('ion-icon');
    expect(icons).not.toBeNull();
    expect(icons).toHaveLength(5);
    icons?.forEach(icon => {
      expect(icon).toEqualAttribute('name', 'star-outline');
      expect(icon).not.toHaveClass('hover');
    });
  });

  it('renders value with whole, half, and outline stars', async () => {
    const { root } = await render(<five-star-rating value={3.5} />);
    const icons = root.shadowRoot?.querySelectorAll('ion-icon');
    expect(icons).not.toBeNull();
    expect(icons).toHaveLength(5);

    icons?.forEach((icon, i) => {
      if (i <= 2) {
        expect(icon).toEqualAttribute('name', 'star');
      } else if (i === 3) {
        expect(icon).toEqualAttribute('name', 'star-half');
      } else {
        expect(icon).toEqualAttribute('name', 'star-outline');
      }
    });
  });

  it('previews half and whole star ratings on hover and resets on mouse leave', async () => {
    const { root, waitForChanges } = await render(<five-star-rating value={4} />);
    const icons = root.shadowRoot?.querySelectorAll('ion-icon');
    expect(icons).not.toBeNull();

    vi.spyOn(icons![2], 'getBoundingClientRect').mockReturnValue({
      left: 40,
      width: 20,
      top: 0,
      right: 60,
      bottom: 20,
      height: 20,
      x: 40,
      y: 0,
      toJSON: () => ({}),
    });

    // Hover left half of 3rd star -> 2.5
    icons?.item(2).dispatchEvent(new MouseEvent('mousemove', { clientX: 45, bubbles: true }));
    await waitForChanges();

    icons?.forEach((icon, i) => {
      if (i <= 1) {
        expect(icon).toEqualAttribute('name', 'star');
      } else if (i === 2) {
        expect(icon).toEqualAttribute('name', 'star-half');
      } else {
        expect(icon).toEqualAttribute('name', 'star-outline');
      }
      expect(icon).toHaveClass('hover');
    });

    // Hover right half of 3rd star -> 3
    icons?.item(2).dispatchEvent(new MouseEvent('mousemove', { clientX: 55, bubbles: true }));
    await waitForChanges();

    expect(icons?.item(2)).toEqualAttribute('name', 'star');
    expect(icons?.item(3)).toEqualAttribute('name', 'star-outline');

    // Mouse leave resets to value=4
    root.dispatchEvent(new MouseEvent('mouseleave'));
    await waitForChanges();

    icons?.forEach((icon, i) => {
      if (i === 4) {
        expect(icon).toEqualAttribute('name', 'star-outline');
      } else {
        expect(icon).toEqualAttribute('name', 'star');
      }
      expect(icon).not.toHaveClass('hover');
    });
  });

  it('emits valueSelected when clicked', async () => {
    const onValueSelected = vi.fn();
    const { root, waitForChanges } = await render(<five-star-rating onValueSelected={onValueSelected} />);
    const icons = root.shadowRoot?.querySelectorAll('ion-icon');
    expect(icons).not.toBeNull();

    vi.spyOn(icons![1], 'getBoundingClientRect').mockReturnValue({
      left: 20,
      width: 20,
      top: 0,
      right: 40,
      bottom: 20,
      height: 20,
      x: 20,
      y: 0,
      toJSON: () => ({}),
    });

    // Click left half of 2nd star -> 1.5
    icons?.item(1).dispatchEvent(new MouseEvent('click', { clientX: 25, bubbles: true }));
    await waitForChanges();
    expect(onValueSelected).toHaveBeenCalledTimes(1);
    expect(onValueSelected.mock.calls[0][0].detail).toBe(1.5);

    // Click right half of 2nd star -> 2
    icons?.item(1).dispatchEvent(new MouseEvent('click', { clientX: 35, bubbles: true }));
    await waitForChanges();
    expect(onValueSelected).toHaveBeenCalledTimes(2);
    expect(onValueSelected.mock.calls[1][0].detail).toBe(2);
  });

  it('does not preview or emit when disabled', async () => {
    const onValueSelected = vi.fn();
    const { root, waitForChanges } = await render(<five-star-rating value={2} disabled onValueSelected={onValueSelected} />);
    const icons = root.shadowRoot?.querySelectorAll('ion-icon');
    expect(icons).not.toBeNull();


    icons?.item(4).dispatchEvent(new MouseEvent('mousemove', { clientX: 95, bubbles: true }));
    icons?.item(4).dispatchEvent(new MouseEvent('click', { clientX: 95, bubbles: true }));
    await waitForChanges();

    expect(icons?.item(4)).toEqualAttribute('name', 'star-outline');
    expect(icons?.item(4)).not.toHaveClass('hover');
    expect(onValueSelected).not.toHaveBeenCalled();
  });
});
