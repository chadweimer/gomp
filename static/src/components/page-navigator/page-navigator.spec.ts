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
  });

  describe('button disabled states', () => {
    it('disables back buttons when on the first page', async () => {
      const el = await fixture<PageNavigator>(html`<page-navigator .page=${1} .numPages=${5}></page-navigator>`);
      const buttons = el.renderRoot.querySelectorAll('ion-button');

      expect(buttons?.[0].hasAttribute('disabled')).toBe(true);
      expect(buttons?.[1].hasAttribute('disabled')).toBe(true);
      expect(buttons?.[2].textContent?.trim()).toBe('1 of 5');
      expect(buttons?.[3].hasAttribute('disabled')).toBe(false);
      expect(buttons?.[4].hasAttribute('disabled')).toBe(false);
    });

    it('disables forward buttons when on the last page', async () => {
      const el = await fixture<PageNavigator>(html`<page-navigator .page=${5} .numPages=${5}></page-navigator>`);
      const buttons = el.renderRoot.querySelectorAll('ion-button');

      expect(buttons?.[0].hasAttribute('disabled')).toBe(false);
      expect(buttons?.[1].hasAttribute('disabled')).toBe(false);
      expect(buttons?.[2].textContent?.trim()).toBe('5 of 5');
      expect(buttons?.[3].hasAttribute('disabled')).toBe(true);
      expect(buttons?.[4].hasAttribute('disabled')).toBe(true);
    });

    it('enables all navigation buttons on middle pages', async () => {
      const el = await fixture<PageNavigator>(html`<page-navigator .page=${3} .numPages=${5}></page-navigator>`);
      const buttons = el.renderRoot.querySelectorAll('ion-button');

      expect(buttons?.[0].hasAttribute('disabled')).toBe(false);
      expect(buttons?.[1].hasAttribute('disabled')).toBe(false);
      expect(buttons?.[2].textContent?.trim()).toBe('3 of 5');
      expect(buttons?.[3].hasAttribute('disabled')).toBe(false);
      expect(buttons?.[4].hasAttribute('disabled')).toBe(false);
    });
  });

  describe('event emissions', () => {
    it('emits pageChanged with 1 when clicking first page button', async () => {
      const el = await fixture<PageNavigator>(html`<page-navigator .page=${3} .numPages=${5}></page-navigator>`);
      const spy = vi.fn();
      el.addEventListener('pageChanged', spy);

      const buttons = el.renderRoot.querySelectorAll('ion-button');
      buttons?.[0].click();

      expect(spy).toHaveBeenCalledTimes(1);
      expect(spy.mock.calls[0][0].detail).toBe(1);
    });

    it('emits pageChanged with previous page when clicking previous button', async () => {
      const el = await fixture<PageNavigator>(html`<page-navigator .page=${3} .numPages=${5}></page-navigator>`);
      const spy = vi.fn();
      el.addEventListener('pageChanged', spy);

      const buttons = el.renderRoot.querySelectorAll('ion-button');
      buttons?.[1].click();

      expect(spy).toHaveBeenCalledTimes(1);
      expect(spy.mock.calls[0][0].detail).toBe(2);
    });

    it('emits pageChanged with next page when clicking next button', async () => {
      const el = await fixture<PageNavigator>(html`<page-navigator .page=${3} .numPages=${5}></page-navigator>`);
      const spy = vi.fn();
      el.addEventListener('pageChanged', spy);

      const buttons = el.renderRoot.querySelectorAll('ion-button');
      buttons?.[3].click();

      expect(spy).toHaveBeenCalledTimes(1);
      expect(spy.mock.calls[0][0].detail).toBe(4);
    });

    it('emits pageChanged with last page when clicking last page button', async () => {
      const el = await fixture<PageNavigator>(html`<page-navigator .page=${3} .numPages=${5}></page-navigator>`);
      const spy = vi.fn();
      el.addEventListener('pageChanged', spy);

      const buttons = el.renderRoot.querySelectorAll('ion-button');
      buttons?.[4].click();

      expect(spy).toHaveBeenCalledTimes(1);
      expect(spy.mock.calls[0][0].detail).toBe(5);
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
  });
});
