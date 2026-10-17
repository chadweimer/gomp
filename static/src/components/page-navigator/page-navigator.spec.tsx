import { render, h, describe, it, expect, vi } from '@stencil/vitest';
import './page-navigator';

describe('page-navigator', () => {
  it('renders default values', async () => {
    const { root } = await render(<page-navigator />);
    expect(root).toHaveClass('hydrated');

    const buttons = root.shadowRoot?.querySelectorAll('ion-button');
    expect(buttons).toHaveLength(5);
    expect(buttons?.[0]).toHaveAttribute('disabled');
    expect(buttons?.[1]).toHaveAttribute('disabled');
    expect(buttons?.[2]).toHaveAttribute('disabled');
    expect(buttons?.[2]).toHaveTextContent('1 of 1');
    expect(buttons?.[3]).toHaveAttribute('disabled');
    expect(buttons?.[4]).toHaveAttribute('disabled');
  });

  describe('button disabled states', () => {
    it('disables back buttons when on the first page', async () => {
      const { root } = await render(<page-navigator page={1} numPages={5} />);
      const buttons = root.shadowRoot?.querySelectorAll('ion-button');

      expect(buttons?.[0]).toHaveAttribute('disabled');
      expect(buttons?.[1]).toHaveAttribute('disabled');
      expect(buttons?.[2]).toHaveTextContent('1 of 5');
      expect(buttons?.[3]).not.toHaveAttribute('disabled');
      expect(buttons?.[4]).not.toHaveAttribute('disabled');
    });

    it('disables forward buttons when on the last page', async () => {
      const { root } = await render(<page-navigator page={5} numPages={5} />);
      const buttons = root.shadowRoot?.querySelectorAll('ion-button');

      expect(buttons?.[0]).not.toHaveAttribute('disabled');
      expect(buttons?.[1]).not.toHaveAttribute('disabled');
      expect(buttons?.[2]).toHaveTextContent('5 of 5');
      expect(buttons?.[3]).toHaveAttribute('disabled');
      expect(buttons?.[4]).toHaveAttribute('disabled');
    });

    it('enables all navigation buttons on middle pages', async () => {
      const { root } = await render(<page-navigator page={3} numPages={5} />);
      const buttons = root.shadowRoot?.querySelectorAll('ion-button');

      expect(buttons?.[0]).not.toHaveAttribute('disabled');
      expect(buttons?.[1]).not.toHaveAttribute('disabled');
      expect(buttons?.[2]).toHaveTextContent('3 of 5');
      expect(buttons?.[3]).not.toHaveAttribute('disabled');
      expect(buttons?.[4]).not.toHaveAttribute('disabled');
    });
  });

  describe('event emissions', () => {
    it('emits pageChanged with 1 when clicking first page button', async () => {
      const { root, waitForChanges } = await render<HTMLPageNavigatorElement>(
        <page-navigator page={3} numPages={5} />
      );
      const spy = vi.fn();
      root.addEventListener('pageChanged', spy);

      const buttons = root.shadowRoot?.querySelectorAll('ion-button');
      buttons?.[0]?.click();
      await waitForChanges();

      expect(spy).toHaveBeenCalledTimes(1);
      expect(spy).toHaveBeenCalledWith(expect.objectContaining({ detail: 1 }));
    });

    it('emits pageChanged with previous page when clicking previous button', async () => {
      const { root, waitForChanges } = await render<HTMLPageNavigatorElement>(
        <page-navigator page={3} numPages={5} />
      );
      const spy = vi.fn();
      root.addEventListener('pageChanged', spy);

      const buttons = root.shadowRoot?.querySelectorAll('ion-button');
      buttons?.[1]?.click();
      await waitForChanges();

      expect(spy).toHaveBeenCalledTimes(1);
      expect(spy).toHaveBeenCalledWith(expect.objectContaining({ detail: 2 }));
    });

    it('emits pageChanged with next page when clicking next button', async () => {
      const { root, waitForChanges } = await render<HTMLPageNavigatorElement>(
        <page-navigator page={3} numPages={5} />
      );
      const spy = vi.fn();
      root.addEventListener('pageChanged', spy);

      const buttons = root.shadowRoot?.querySelectorAll('ion-button');
      buttons?.[3]?.click();
      await waitForChanges();

      expect(spy).toHaveBeenCalledTimes(1);
      expect(spy).toHaveBeenCalledWith(expect.objectContaining({ detail: 4 }));
    });

    it('emits pageChanged with numPages when clicking last page button', async () => {
      const { root, waitForChanges } = await render<HTMLPageNavigatorElement>(
        <page-navigator page={3} numPages={5} />
      );
      const spy = vi.fn();
      root.addEventListener('pageChanged', spy);

      const buttons = root.shadowRoot?.querySelectorAll('ion-button');
      buttons?.[4]?.click();
      await waitForChanges();

      expect(spy).toHaveBeenCalledTimes(1);
      expect(spy).toHaveBeenCalledWith(expect.objectContaining({ detail: 5 }));
    });
  });

  describe('styling props', () => {
    it('propagates fill and color to buttons', async () => {
      const { root } = await render(
        <page-navigator page={2} numPages={5} fill="outline" color="secondary" />
      );
      const buttons = root.shadowRoot?.querySelectorAll('ion-button');
      expect(buttons?.[0]).toEqualAttribute('fill', 'outline');
      expect(buttons?.[0]).toEqualAttribute('color', 'secondary');
      expect(buttons?.[2]).toEqualAttribute('fill', 'outline');
      expect(buttons?.[2]).toEqualAttribute('color', 'secondary');
    });
  });
});
