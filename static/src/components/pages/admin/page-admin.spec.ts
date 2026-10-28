import { fixture, html } from '@open-wc/testing';
import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { SwipeDirection } from '../../../models';
import './page-admin';
import { PageAdmin } from './page-admin';

let swipeHandler: ((swipe: SwipeDirection) => void) | undefined;
const { mockSendActivatedCallback, mockGestureDestroy, mockGestureEnable } = vi.hoisted(() => ({
  mockSendActivatedCallback: vi.fn().mockResolvedValue(undefined),
  mockGestureDestroy: vi.fn(),
  mockGestureEnable: vi.fn(),
}));

vi.mock('../../../helpers/utils', async (importOriginal) => {
  const actual = await importOriginal<typeof import('../../../helpers/utils')>();
  return {
    ...actual,
    createSwipeGesture: vi.fn((_el: HTMLElement, handler: (swipe: SwipeDirection) => void) => {
      swipeHandler = handler;
      return {
        enable: mockGestureEnable,
        destroy: mockGestureDestroy,
      };
    }),
    sendActivatedCallback: mockSendActivatedCallback,
  };
});

describe('page-admin', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    swipeHandler = undefined;
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  it('builds and renders ion-tabs with 3 tabs and tab buttons', async () => {
    const root = await fixture<PageAdmin>(html`<page-admin></page-admin>`);
    await root.updateComplete;

    const tabs = root.renderRoot.querySelector('ion-tabs');
    expect(tabs).not.toBeNull();

    const tabElements = root.renderRoot.querySelectorAll('ion-tab');
    expect(tabElements).toHaveLength(3);
    expect(tabElements[0].getAttribute('tab')).toBe('tab-admin-configuration');
    expect(tabElements[0].getAttribute('component')).toBe('page-admin-configuration');
    expect(tabElements[1].getAttribute('tab')).toBe('tab-admin-users');
    expect(tabElements[1].getAttribute('component')).toBe('page-admin-users');
    expect(tabElements[2].getAttribute('tab')).toBe('tab-admin-maintenance');
    expect(tabElements[2].getAttribute('component')).toBe('page-admin-maintenance');

    const tabButtons = root.renderRoot.querySelectorAll('ion-tab-button');
    expect(tabButtons).toHaveLength(3);

    expect(tabButtons[0].getAttribute('tab')).toBe('tab-admin-configuration');
    expect(tabButtons[0].getAttribute('href')).toBe('/admin/configuration');
    expect(tabButtons[0].querySelector('ion-icon')?.getAttribute('name')).toBe('document-text');
    expect(tabButtons[0].querySelector('ion-label')?.textContent).toBe('Configuration');

    expect(tabButtons[1].getAttribute('tab')).toBe('tab-admin-users');
    expect(tabButtons[1].getAttribute('href')).toBe('/admin/users');
    expect(tabButtons[1].querySelector('ion-icon')?.getAttribute('name')).toBe('people');
    expect(tabButtons[1].querySelector('ion-label')?.textContent).toBe('Users');

    expect(tabButtons[2].getAttribute('tab')).toBe('tab-admin-maintenance');
    expect(tabButtons[2].getAttribute('href')).toBe('/admin/maintenance');
    expect(tabButtons[2].querySelector('ion-icon')?.getAttribute('name')).toBe('build');
    expect(tabButtons[2].querySelector('ion-label')?.textContent).toBe('Maintenance');
  });

  it('enables swipe gesture on connect and destroys gesture on disconnect', async () => {
    const root = await fixture<PageAdmin>(html`<page-admin></page-admin>`);
    expect(mockGestureEnable).toHaveBeenCalled();

    root.disconnectedCallback();
    expect(mockGestureDestroy).toHaveBeenCalled();
  });

  it('triggers sendActivatedCallback when ionTabsDidChange is fired', async () => {
    const root = await fixture<PageAdmin>(html`<page-admin></page-admin>`);
    const tabs = root.renderRoot.querySelector('ion-tabs');
    expect(tabs).not.toBeNull();

    tabs?.dispatchEvent(new CustomEvent('ionTabsDidChange'));
    await root.updateComplete;

    expect(mockSendActivatedCallback).toHaveBeenCalledWith(tabs);
  });

  describe('Swipe Navigation', () => {
    it('swipes left from configuration tab to users tab', async () => {
      const root = await fixture<PageAdmin>(html`<page-admin></page-admin>`);
      const tabs = root.renderRoot.querySelector('ion-tabs') as HTMLIonTabsElement;
      tabs.getSelected = vi.fn().mockResolvedValue('tab-admin-configuration');
      tabs.select = vi.fn().mockResolvedValue(true);

      expect(swipeHandler).toBeDefined();
      swipeHandler!(SwipeDirection.Left);

      await new Promise(resolve => setTimeout(resolve, 0));
      expect(tabs.select).toHaveBeenCalledWith('tab-admin-users');
    });

    it('does nothing when swiping right from configuration tab', async () => {
      const root = await fixture<PageAdmin>(html`<page-admin></page-admin>`);
      const tabs = root.renderRoot.querySelector('ion-tabs') as HTMLIonTabsElement;
      tabs.getSelected = vi.fn().mockResolvedValue('tab-admin-configuration');
      tabs.select = vi.fn().mockResolvedValue(true);

      swipeHandler!(SwipeDirection.Right);

      await new Promise(resolve => setTimeout(resolve, 0));
      expect(tabs.select).not.toHaveBeenCalled();
    });

    it('swipes left from users tab to maintenance tab', async () => {
      const root = await fixture<PageAdmin>(html`<page-admin></page-admin>`);
      const tabs = root.renderRoot.querySelector('ion-tabs') as HTMLIonTabsElement;
      tabs.getSelected = vi.fn().mockResolvedValue('tab-admin-users');
      tabs.select = vi.fn().mockResolvedValue(true);

      swipeHandler!(SwipeDirection.Left);

      await new Promise(resolve => setTimeout(resolve, 0));
      expect(tabs.select).toHaveBeenCalledWith('tab-admin-maintenance');
    });

    it('swipes right from users tab to configuration tab', async () => {
      const root = await fixture<PageAdmin>(html`<page-admin></page-admin>`);
      const tabs = root.renderRoot.querySelector('ion-tabs') as HTMLIonTabsElement;
      tabs.getSelected = vi.fn().mockResolvedValue('tab-admin-users');
      tabs.select = vi.fn().mockResolvedValue(true);

      swipeHandler!(SwipeDirection.Right);

      await new Promise(resolve => setTimeout(resolve, 0));
      expect(tabs.select).toHaveBeenCalledWith('tab-admin-configuration');
    });

    it('swipes right from maintenance tab to users tab', async () => {
      const root = await fixture<PageAdmin>(html`<page-admin></page-admin>`);
      const tabs = root.renderRoot.querySelector('ion-tabs') as HTMLIonTabsElement;
      tabs.getSelected = vi.fn().mockResolvedValue('tab-admin-maintenance');
      tabs.select = vi.fn().mockResolvedValue(true);

      swipeHandler!(SwipeDirection.Right);

      await new Promise(resolve => setTimeout(resolve, 0));
      expect(tabs.select).toHaveBeenCalledWith('tab-admin-users');
    });

    it('does nothing when swiping left from maintenance tab', async () => {
      const root = await fixture<PageAdmin>(html`<page-admin></page-admin>`);
      const tabs = root.renderRoot.querySelector('ion-tabs') as HTMLIonTabsElement;
      tabs.getSelected = vi.fn().mockResolvedValue('tab-admin-maintenance');
      tabs.select = vi.fn().mockResolvedValue(true);

      swipeHandler!(SwipeDirection.Left);

      await new Promise(resolve => setTimeout(resolve, 0));
      expect(tabs.select).not.toHaveBeenCalled();
    });
  });
});

