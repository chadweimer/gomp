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
    expect(tabButtons[0].querySelector('app-icon')?.getAttribute('name')).toBe('description');
    expect(tabButtons[0].querySelector('ion-label')?.textContent).toBe('Configuration');

    expect(tabButtons[1].getAttribute('tab')).toBe('tab-admin-users');
    expect(tabButtons[1].getAttribute('href')).toBe('/admin/users');
    expect(tabButtons[1].querySelector('app-icon')?.getAttribute('name')).toBe('group');
    expect(tabButtons[1].querySelector('ion-label')?.textContent).toBe('Users');

    expect(tabButtons[2].getAttribute('tab')).toBe('tab-admin-maintenance');
    expect(tabButtons[2].getAttribute('href')).toBe('/admin/maintenance');
    expect(tabButtons[2].querySelector('app-icon')?.getAttribute('name')).toBe('construction');
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
    it.each([
      { current: 'tab-admin-configuration', dir: SwipeDirection.Left, expected: 'tab-admin-users' },
      { current: 'tab-admin-configuration', dir: SwipeDirection.Right, expected: null },
      { current: 'tab-admin-users', dir: SwipeDirection.Left, expected: 'tab-admin-maintenance' },
      { current: 'tab-admin-users', dir: SwipeDirection.Right, expected: 'tab-admin-configuration' },
      { current: 'tab-admin-maintenance', dir: SwipeDirection.Right, expected: 'tab-admin-users' },
      { current: 'tab-admin-maintenance', dir: SwipeDirection.Left, expected: null },
    ])(
      'handles swipe $dir from $current (expects $expected)',
      async ({ current, dir, expected }) => {
        const root = await fixture<PageAdmin>(html`<page-admin></page-admin>`);
        const tabs = root.renderRoot.querySelector<HTMLIonTabsElement>('ion-tabs');
        expect(tabs).not.toBeNull();
        tabs!.getSelected = vi.fn().mockResolvedValue(current);
        tabs!.select = vi.fn().mockResolvedValue(true);

        expect(swipeHandler).toBeDefined();
        swipeHandler!(dir);
        await root.updateComplete;

        if (expected != null) {
          expect(tabs?.select).toHaveBeenCalledWith(expected);
        } else {
          expect(tabs?.select).not.toHaveBeenCalled();
        }
      }
    );
  });
});
