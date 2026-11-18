import { fixture, html } from '@open-wc/testing';
import { describe, it, expect, vi } from 'vitest';
import './page-navigator';
import { PageNavigator } from './page-navigator';

describe('page-navigator', () => {
  it('renders default values', async () => {
    const el = await fixture<PageNavigator>(html`<page-navigator></page-navigator>`);
    const buttons = el.renderRoot.querySelectorAll('ion-button');

    expect(buttons).toHaveLength(5);
    expect(buttons?.[0].hasAttribute('disabled')).toBe(true);
    expect(buttons?.[1].hasAttribute('disabled')).toBe(true);
    expect(buttons?.[2].hasAttribute('disabled')).toBe(true);
    expect(buttons?.[2].textContent?.trim()).toBe('1 of 1');
    expect(buttons?.[3].hasAttribute('disabled')).toBe(true);
    expect(buttons?.[4].hasAttribute('disabled')).toBe(true);

    const icons = el.renderRoot.querySelectorAll('app-icon');
    expect(icons).toHaveLength(4);
    icons.forEach((icon) => {
      expect(icon.hasAttribute('size')).toBe(false);
    });
  });

  describe('button disabled states', () => {
    it.each([
      {
        scenario: 'disables back buttons when on the first page',
        page: 1,
        numPages: 5,
        expectedText: '1 of 5',
        expectedDisabled: [true, true, false, false],
      },
      {
        scenario: 'disables forward buttons when on the last page',
        page: 5,
        numPages: 5,
        expectedText: '5 of 5',
        expectedDisabled: [false, false, true, true],
      },
      {
        scenario: 'enables all navigation buttons on middle pages',
        page: 3,
        numPages: 5,
        expectedText: '3 of 5',
        expectedDisabled: [false, false, false, false],
      },
    ])('$scenario', async ({ page, numPages, expectedText, expectedDisabled }) => {
      const el = await fixture<PageNavigator>(
        html`<page-navigator .page=${page} .numPages=${numPages}></page-navigator>`
      );
      const buttons = el.renderRoot.querySelectorAll('ion-button');

      expect(buttons?.[0].hasAttribute('disabled')).toBe(expectedDisabled[0]);
      expect(buttons?.[1].hasAttribute('disabled')).toBe(expectedDisabled[1]);
      expect(buttons?.[2].textContent?.trim()).toBe(expectedText);
      expect(buttons?.[3].hasAttribute('disabled')).toBe(expectedDisabled[2]);
      expect(buttons?.[4].hasAttribute('disabled')).toBe(expectedDisabled[3]);
    });
  });

  describe('event emissions', () => {
    it.each([
      { description: 'first page button', buttonIndex: 0, expectedPage: 1 },
      { description: 'previous button', buttonIndex: 1, expectedPage: 2 },
      { description: 'next button', buttonIndex: 3, expectedPage: 4 },
      { description: 'last page button', buttonIndex: 4, expectedPage: 5 },
    ])('emits pageChanged with $expectedPage when clicking $description', async ({ buttonIndex, expectedPage }) => {
      const el = await fixture<PageNavigator>(html`<page-navigator .page=${3} .numPages=${5}></page-navigator>`);
      const spy = vi.fn();
      el.addEventListener('pageChanged', spy);

      const buttons = el.renderRoot.querySelectorAll('ion-button');
      buttons?.[buttonIndex].click();

      expect(spy).toHaveBeenCalledTimes(1);
      expect(spy.mock.calls[0][0].detail).toBe(expectedPage);
    });
  });

  describe('styling props', () => {
    it('propagates fill to buttons', async () => {
      const el = await fixture<PageNavigator>(
        html`<page-navigator .page=${2} .numPages=${5} fill="outline"></page-navigator>`
      );
      const buttons = el.renderRoot.querySelectorAll('ion-button');
      expect(buttons?.[0].getAttribute('fill')).toBe('outline');
      expect(buttons?.[2].getAttribute('fill')).toBe('outline');
    });

    it('propagates size to icons and reflects attribute', async () => {
      const el = await fixture<PageNavigator>(
        html`<page-navigator size="small"></page-navigator>`
      );
      expect(el.getAttribute('size')).toBe('small');
      let icons = el.renderRoot.querySelectorAll('app-icon');
      expect(icons).toHaveLength(4);
      icons.forEach((icon) => {
        expect(icon.getAttribute('size')).toBe('small');
      });

      el.size = 'large';
      await el.updateComplete;
      expect(el.getAttribute('size')).toBe('large');
      icons = el.renderRoot.querySelectorAll('app-icon');
      icons.forEach((icon) => {
        expect(icon.getAttribute('size')).toBe('large');
      });
    });
  });
});
