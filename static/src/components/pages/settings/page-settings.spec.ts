import { fixture, html } from '@open-wc/testing';
import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { SwipeDirection } from '../../../models';
import './page-settings';
import { PageSettings } from './page-settings';

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

describe('page-settings', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    swipeHandler = undefined;
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  it('builds and renders ion-tabs with 3 tabs and tab buttons', async () => {
    const root = await fixture<PageSettings>(html`<page-settings></page-settings>`);
    await root.updateComplete;

    const tabs = root.renderRoot.querySelector('ion-tabs');
    expect(tabs).not.toBeNull();

    const tabElements = root.renderRoot.querySelectorAll('ion-tab');
    expect(tabElements).toHaveLength(3);
    expect(tabElements[0].getAttribute('tab')).toBe('tab-settings-preferences');
    expect(tabElements[0].getAttribute('component')).toBe('page-settings-preferences');
    expect(tabElements[1].getAttribute('tab')).toBe('tab-settings-searches');
    expect(tabElements[1].getAttribute('component')).toBe('page-settings-searches');
    expect(tabElements[2].getAttribute('tab')).toBe('tab-settings-security');
    expect(tabElements[2].getAttribute('component')).toBe('page-settings-security');

    const tabButtons = root.renderRoot.querySelectorAll('ion-tab-button');
    expect(tabButtons).toHaveLength(3);

    expect(tabButtons[0].getAttribute('tab')).toBe('tab-settings-preferences');
    expect(tabButtons[0].getAttribute('href')).toBe('/settings/preferences');
    expect(tabButtons[0].querySelector('app-icon')?.getAttribute('name')).toBe('tune');
    expect(tabButtons[0].querySelector('ion-label')?.textContent).toBe('Preferences');

    expect(tabButtons[1].getAttribute('tab')).toBe('tab-settings-searches');
    expect(tabButtons[1].getAttribute('href')).toBe('/settings/searches');
    expect(tabButtons[1].querySelector('app-icon')?.getAttribute('name')).toBe('saved_search');
    expect(tabButtons[1].querySelector('ion-label')?.textContent).toBe('Searches');

    expect(tabButtons[2].getAttribute('tab')).toBe('tab-settings-security');
    expect(tabButtons[2].getAttribute('href')).toBe('/settings/security');
    expect(tabButtons[2].querySelector('app-icon')?.getAttribute('name')).toBe('fingerprint');
    expect(tabButtons[2].querySelector('ion-label')?.textContent).toBe('Security');
  });

  it('enables swipe gesture on connect and destroys gesture on disconnect', async () => {
    const root = await fixture<PageSettings>(html`<page-settings></page-settings>`);
    expect(mockGestureEnable).toHaveBeenCalled();

    root.disconnectedCallback();
    expect(mockGestureDestroy).toHaveBeenCalled();
  });

  it('triggers sendActivatedCallback when ionTabsDidChange is fired', async () => {
    const root = await fixture<PageSettings>(html`<page-settings></page-settings>`);
    const tabs = root.renderRoot.querySelector('ion-tabs');
    expect(tabs).not.toBeNull();

    tabs?.dispatchEvent(new CustomEvent('ionTabsDidChange'));
    await root.updateComplete;

    expect(mockSendActivatedCallback).toHaveBeenCalledWith(tabs);
  });

  describe('Swipe Navigation', () => {
    it('swipes left from preferences tab to searches tab', async () => {
      const root = await fixture<PageSettings>(html`<page-settings></page-settings>`);
      const tabs = root.renderRoot.querySelector<HTMLIonTabsElement>('ion-tabs');
      expect(tabs).not.toBeNull();
      tabs!.getSelected = vi.fn().mockResolvedValue('tab-settings-preferences');
      tabs!.select = vi.fn().mockResolvedValue(true);

      expect(swipeHandler).toBeDefined();
      swipeHandler!(SwipeDirection.Left);
      await root.updateComplete;

      expect(tabs?.select).toHaveBeenCalledWith('tab-settings-searches');
    });

    it('does nothing when swiping right from preferences tab', async () => {
      const root = await fixture<PageSettings>(html`<page-settings></page-settings>`);
      const tabs = root.renderRoot.querySelector<HTMLIonTabsElement>('ion-tabs');
      expect(tabs).not.toBeNull();
      tabs!.getSelected = vi.fn().mockResolvedValue('tab-settings-preferences');
      tabs!.select = vi.fn().mockResolvedValue(true);

      swipeHandler!(SwipeDirection.Right);
      await root.updateComplete;

      expect(tabs?.select).not.toHaveBeenCalled();
    });

    it('swipes left from searches tab to security tab', async () => {
      const root = await fixture<PageSettings>(html`<page-settings></page-settings>`);
      const tabs = root.renderRoot.querySelector<HTMLIonTabsElement>('ion-tabs');
      expect(tabs).not.toBeNull();
      tabs!.getSelected = vi.fn().mockResolvedValue('tab-settings-searches');
      tabs!.select = vi.fn().mockResolvedValue(true);

      swipeHandler!(SwipeDirection.Left);
      await root.updateComplete;

      expect(tabs?.select).toHaveBeenCalledWith('tab-settings-security');
    });

    it('swipes right from searches tab to preferences tab', async () => {
      const root = await fixture<PageSettings>(html`<page-settings></page-settings>`);
      const tabs = root.renderRoot.querySelector<HTMLIonTabsElement>('ion-tabs');
      expect(tabs).not.toBeNull();
      tabs!.getSelected = vi.fn().mockResolvedValue('tab-settings-searches');
      tabs!.select = vi.fn().mockResolvedValue(true);

      swipeHandler!(SwipeDirection.Right);
      await root.updateComplete;

      expect(tabs?.select).toHaveBeenCalledWith('tab-settings-preferences');
    });

    it('swipes right from security tab to searches tab', async () => {
      const root = await fixture<PageSettings>(html`<page-settings></page-settings>`);
      const tabs = root.renderRoot.querySelector<HTMLIonTabsElement>('ion-tabs');
      expect(tabs).not.toBeNull();
      tabs!.getSelected = vi.fn().mockResolvedValue('tab-settings-security');
      tabs!.select = vi.fn().mockResolvedValue(true);

      swipeHandler!(SwipeDirection.Right);
      await root.updateComplete;

      expect(tabs?.select).toHaveBeenCalledWith('tab-settings-searches');
    });

    it('does nothing when swiping left from security tab', async () => {
      const root = await fixture<PageSettings>(html`<page-settings></page-settings>`);
      const tabs = root.renderRoot.querySelector<HTMLIonTabsElement>('ion-tabs');
      expect(tabs).not.toBeNull();
      tabs!.getSelected = vi.fn().mockResolvedValue('tab-settings-security');
      tabs!.select = vi.fn().mockResolvedValue(true);

      swipeHandler!(SwipeDirection.Left);
      await root.updateComplete;

      expect(tabs?.select).not.toHaveBeenCalled();
    });
  });
});
