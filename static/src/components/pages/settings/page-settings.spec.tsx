import { render, h, describe, it, expect, beforeEach, afterEach } from '@stencil/vitest';
import { vi } from 'vitest';
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
    const { root } = await render(<page-settings />);
    expect(root).toHaveClass('hydrated');

    const tabs = root.querySelector('ion-tabs');
    expect(tabs).not.toBeNull();

    const tabElements = root.querySelectorAll('ion-tab');
    expect(tabElements).toHaveLength(3);
    expect(tabElements[0]).toEqualAttribute('tab', 'tab-settings-preferences');
    expect(tabElements[0]).toEqualAttribute('component', 'page-settings-preferences');
    expect(tabElements[1]).toEqualAttribute('tab', 'tab-settings-searches');
    expect(tabElements[1]).toEqualAttribute('component', 'page-settings-searches');
    expect(tabElements[2]).toEqualAttribute('tab', 'tab-settings-security');
    expect(tabElements[2]).toEqualAttribute('component', 'page-settings-security');

    const tabButtons = root.querySelectorAll('ion-tab-button');
    expect(tabButtons).toHaveLength(3);

    expect(tabButtons[0]).toEqualAttribute('tab', 'tab-settings-preferences');
    expect(tabButtons[0]).toEqualAttribute('href', '/settings/preferences');
    expect(tabButtons[0].querySelector('ion-icon')).toEqualAttribute('name', 'options');
    expect(tabButtons[0].querySelector('ion-label')).toEqualText('Preferences');

    expect(tabButtons[1]).toEqualAttribute('tab', 'tab-settings-searches');
    expect(tabButtons[1]).toEqualAttribute('href', '/settings/searches');
    expect(tabButtons[1].querySelector('ion-icon')).toEqualAttribute('name', 'search');
    expect(tabButtons[1].querySelector('ion-label')).toEqualText('Searches');

    expect(tabButtons[2]).toEqualAttribute('tab', 'tab-settings-security');
    expect(tabButtons[2]).toEqualAttribute('href', '/settings/security');
    expect(tabButtons[2].querySelector('ion-icon')).toEqualAttribute('name', 'finger-print');
    expect(tabButtons[2].querySelector('ion-label')).toEqualText('Security');
  });

  it('enables swipe gesture on connect and destroys gesture on disconnect', async () => {
    const { instance } = await render<HTMLElement, PageSettings>(<page-settings />);
    expect(mockGestureEnable).toHaveBeenCalled();

    instance?.disconnectedCallback();
    expect(mockGestureDestroy).toHaveBeenCalled();
  });

  it('triggers sendActivatedCallback when ionTabsDidChange is fired', async () => {
    const { root, waitForChanges } = await render(<page-settings />);
    const tabs = root.querySelector('ion-tabs');
    expect(tabs).not.toBeNull();

    tabs?.dispatchEvent(new CustomEvent('ionTabsDidChange'));
    await waitForChanges();

    expect(mockSendActivatedCallback).toHaveBeenCalledWith(tabs);
  });

  describe('Swipe Navigation', () => {
    it('swipes left from preferences tab to searches tab', async () => {
      const { root, waitForChanges } = await render(<page-settings />);
      const tabs = root.querySelector('ion-tabs') as HTMLIonTabsElement;
      tabs.getSelected = vi.fn().mockResolvedValue('tab-settings-preferences');
      tabs.select = vi.fn().mockResolvedValue(true);

      expect(swipeHandler).toBeDefined();
      swipeHandler!(SwipeDirection.Left);
      await waitForChanges();

      expect(tabs.select).toHaveBeenCalledWith('tab-settings-searches');
    });

    it('does nothing when swiping right from preferences tab', async () => {
      const { root, waitForChanges } = await render(<page-settings />);
      const tabs = root.querySelector('ion-tabs') as HTMLIonTabsElement;
      tabs.getSelected = vi.fn().mockResolvedValue('tab-settings-preferences');
      tabs.select = vi.fn().mockResolvedValue(true);

      swipeHandler!(SwipeDirection.Right);
      await waitForChanges();

      expect(tabs.select).not.toHaveBeenCalled();
    });

    it('swipes left from searches tab to security tab', async () => {
      const { root, waitForChanges } = await render(<page-settings />);
      const tabs = root.querySelector('ion-tabs') as HTMLIonTabsElement;
      tabs.getSelected = vi.fn().mockResolvedValue('tab-settings-searches');
      tabs.select = vi.fn().mockResolvedValue(true);

      swipeHandler!(SwipeDirection.Left);
      await waitForChanges();

      expect(tabs.select).toHaveBeenCalledWith('tab-settings-security');
    });

    it('swipes right from searches tab to preferences tab', async () => {
      const { root, waitForChanges } = await render(<page-settings />);
      const tabs = root.querySelector('ion-tabs') as HTMLIonTabsElement;
      tabs.getSelected = vi.fn().mockResolvedValue('tab-settings-searches');
      tabs.select = vi.fn().mockResolvedValue(true);

      swipeHandler!(SwipeDirection.Right);
      await waitForChanges();

      expect(tabs.select).toHaveBeenCalledWith('tab-settings-preferences');
    });

    it('swipes right from security tab to searches tab', async () => {
      const { root, waitForChanges } = await render(<page-settings />);
      const tabs = root.querySelector('ion-tabs') as HTMLIonTabsElement;
      tabs.getSelected = vi.fn().mockResolvedValue('tab-settings-security');
      tabs.select = vi.fn().mockResolvedValue(true);

      swipeHandler!(SwipeDirection.Right);
      await waitForChanges();

      expect(tabs.select).toHaveBeenCalledWith('tab-settings-searches');
    });

    it('does nothing when swiping left from security tab', async () => {
      const { root, waitForChanges } = await render(<page-settings />);
      const tabs = root.querySelector('ion-tabs') as HTMLIonTabsElement;
      tabs.getSelected = vi.fn().mockResolvedValue('tab-settings-security');
      tabs.select = vi.fn().mockResolvedValue(true);

      swipeHandler!(SwipeDirection.Left);
      await waitForChanges();

      expect(tabs.select).not.toHaveBeenCalled();
    });
  });
});
