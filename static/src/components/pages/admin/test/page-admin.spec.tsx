import { render, h, describe, it, expect, beforeEach, afterEach } from '@stencil/vitest';
import { vi } from 'vitest';
import { SwipeDirection } from '../../../../models';
import '../page-admin';
import { PageAdmin } from '../page-admin';

let swipeHandler: ((swipe: SwipeDirection) => void) | undefined;
const { mockSendActivatedCallback, mockGestureDestroy, mockGestureEnable } = vi.hoisted(() => ({
  mockSendActivatedCallback: vi.fn().mockResolvedValue(undefined),
  mockGestureDestroy: vi.fn(),
  mockGestureEnable: vi.fn(),
}));

vi.mock('../../../../helpers/utils', async (importOriginal) => {
  const actual = await importOriginal<typeof import('../../../../helpers/utils')>();
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
    const { root } = await render(<page-admin />);
    expect(root).toHaveClass('hydrated');

    const tabs = root.querySelector('ion-tabs');
    expect(tabs).not.toBeNull();

    const tabElements = root.querySelectorAll('ion-tab');
    expect(tabElements).toHaveLength(3);
    expect(tabElements[0]).toEqualAttribute('tab', 'tab-admin-configuration');
    expect(tabElements[0]).toEqualAttribute('component', 'page-admin-configuration');
    expect(tabElements[1]).toEqualAttribute('tab', 'tab-admin-users');
    expect(tabElements[1]).toEqualAttribute('component', 'page-admin-users');
    expect(tabElements[2]).toEqualAttribute('tab', 'tab-admin-maintenance');
    expect(tabElements[2]).toEqualAttribute('component', 'page-admin-maintenance');

    const tabButtons = root.querySelectorAll('ion-tab-button');
    expect(tabButtons).toHaveLength(3);

    expect(tabButtons[0]).toEqualAttribute('tab', 'tab-admin-configuration');
    expect(tabButtons[0]).toEqualAttribute('href', '/admin/configuration');
    expect(tabButtons[0].querySelector('ion-icon')).toEqualAttribute('name', 'document-text');
    expect(tabButtons[0].querySelector('ion-label')).toEqualText('Configuration');

    expect(tabButtons[1]).toEqualAttribute('tab', 'tab-admin-users');
    expect(tabButtons[1]).toEqualAttribute('href', '/admin/users');
    expect(tabButtons[1].querySelector('ion-icon')).toEqualAttribute('name', 'people');
    expect(tabButtons[1].querySelector('ion-label')).toEqualText('Users');

    expect(tabButtons[2]).toEqualAttribute('tab', 'tab-admin-maintenance');
    expect(tabButtons[2]).toEqualAttribute('href', '/admin/maintenance');
    expect(tabButtons[2].querySelector('ion-icon')).toEqualAttribute('name', 'build');
    expect(tabButtons[2].querySelector('ion-label')).toEqualText('Maintenance');
  });

  it('enables swipe gesture on connect and destroys gesture on disconnect', async () => {
    const { instance } = await render<HTMLElement, PageAdmin>(<page-admin />);
    expect(mockGestureEnable).toHaveBeenCalled();

    instance?.disconnectedCallback();
    expect(mockGestureDestroy).toHaveBeenCalled();
  });

  it('triggers sendActivatedCallback when ionTabsDidChange is fired', async () => {
    const { root, waitForChanges } = await render(<page-admin />);
    const tabs = root.querySelector('ion-tabs');
    expect(tabs).not.toBeNull();

    tabs?.dispatchEvent(new CustomEvent('ionTabsDidChange'));
    await waitForChanges();

    expect(mockSendActivatedCallback).toHaveBeenCalledWith(tabs);
  });

  describe('Swipe Navigation', () => {
    it('swipes left from configuration tab to users tab', async () => {
      const { root, waitForChanges } = await render(<page-admin />);
      const tabs = root.querySelector('ion-tabs') as HTMLIonTabsElement;
      tabs.getSelected = vi.fn().mockResolvedValue('tab-admin-configuration');
      tabs.select = vi.fn().mockResolvedValue(true);

      expect(swipeHandler).toBeDefined();
      swipeHandler!(SwipeDirection.Left);
      await waitForChanges();

      expect(tabs.select).toHaveBeenCalledWith('tab-admin-users');
    });

    it('does nothing when swiping right from configuration tab', async () => {
      const { root, waitForChanges } = await render(<page-admin />);
      const tabs = root.querySelector('ion-tabs') as HTMLIonTabsElement;
      tabs.getSelected = vi.fn().mockResolvedValue('tab-admin-configuration');
      tabs.select = vi.fn().mockResolvedValue(true);

      swipeHandler!(SwipeDirection.Right);
      await waitForChanges();

      expect(tabs.select).not.toHaveBeenCalled();
    });

    it('swipes left from users tab to maintenance tab', async () => {
      const { root, waitForChanges } = await render(<page-admin />);
      const tabs = root.querySelector('ion-tabs') as HTMLIonTabsElement;
      tabs.getSelected = vi.fn().mockResolvedValue('tab-admin-users');
      tabs.select = vi.fn().mockResolvedValue(true);

      swipeHandler!(SwipeDirection.Left);
      await waitForChanges();

      expect(tabs.select).toHaveBeenCalledWith('tab-admin-maintenance');
    });

    it('swipes right from users tab to configuration tab', async () => {
      const { root, waitForChanges } = await render(<page-admin />);
      const tabs = root.querySelector('ion-tabs') as HTMLIonTabsElement;
      tabs.getSelected = vi.fn().mockResolvedValue('tab-admin-users');
      tabs.select = vi.fn().mockResolvedValue(true);

      swipeHandler!(SwipeDirection.Right);
      await waitForChanges();

      expect(tabs.select).toHaveBeenCalledWith('tab-admin-configuration');
    });

    it('swipes right from maintenance tab to users tab', async () => {
      const { root, waitForChanges } = await render(<page-admin />);
      const tabs = root.querySelector('ion-tabs') as HTMLIonTabsElement;
      tabs.getSelected = vi.fn().mockResolvedValue('tab-admin-maintenance');
      tabs.select = vi.fn().mockResolvedValue(true);

      swipeHandler!(SwipeDirection.Right);
      await waitForChanges();

      expect(tabs.select).toHaveBeenCalledWith('tab-admin-users');
    });

    it('does nothing when swiping left from maintenance tab', async () => {
      const { root, waitForChanges } = await render(<page-admin />);
      const tabs = root.querySelector('ion-tabs') as HTMLIonTabsElement;
      tabs.getSelected = vi.fn().mockResolvedValue('tab-admin-maintenance');
      tabs.select = vi.fn().mockResolvedValue(true);

      swipeHandler!(SwipeDirection.Left);
      await waitForChanges();

      expect(tabs.select).not.toHaveBeenCalled();
    });
  });
});
