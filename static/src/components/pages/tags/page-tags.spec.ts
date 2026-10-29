import { fixture, html } from '@open-wc/testing';
import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { alertController } from '@ionic/core';
import { fetchMocker } from '../../../../vitest.setup';
import { SortDir, TagSearchResult, TagSortBy } from '../../../helpers/schema.gen';
import { SwipeDirection } from '../../../models';
import state, { clearState } from '../../../stores/state';
import './page-tags';
import type { PageTags } from './page-tags';
import { PageNavigator } from '../../page-navigator/page-navigator';

let swipeHandler: ((swipe: SwipeDirection) => void) | undefined;
const mockGestureDestroy = vi.fn();
const mockGestureEnable = vi.fn();

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
  };
});

describe('page-tags', () => {
  const originalFetch = globalThis.fetch;
  let routerEl: HTMLIonRouterElement;

  const mockTagResult: TagSearchResult = {
    total: 3,
    tags: [
      { tag: 'dinner', count: 12 },
      { tag: 'dessert', count: 5 },
      { tag: 'breakfast', count: 2 },
    ],
  };

  beforeEach(() => {
    fetchMocker.resetMocks();
    clearState();
    mockGestureEnable.mockClear();
    mockGestureDestroy.mockClear();
    swipeHandler = undefined;

    routerEl = document.createElement('ion-router');
    routerEl.push = vi.fn().mockResolvedValue(true);
    document.body.appendChild(routerEl);
  });

  afterEach(() => {
    globalThis.fetch = originalFetch;
    routerEl.remove();
    vi.restoreAllMocks();
  });

  it('builds and renders tags and page-navigator', async () => {
    fetchMocker.mockResponse((req: Request) => {
      if (req.url.includes('/tags')) {
        return {
          status: 200,
          body: JSON.stringify(mockTagResult),
        };
      }
      return { status: 404 };
    });

    const el = await fixture<PageTags>(html`<page-tags></page-tags>`);
    await el.activatedCallback();
    await new Promise(resolve => setTimeout(resolve, 50));

    const items = el.renderRoot.querySelectorAll('ion-item');
    expect(items).toHaveLength(mockTagResult.tags?.length ?? 0);

    const firstLabel = items[0].querySelector('ion-label');
    expect(firstLabel?.textContent?.trim()).toBe('dinner');
    const firstNote = items[0].querySelector('ion-note');
    expect(firstNote?.textContent?.trim()).toBe('12');

    const navigator = el.renderRoot.querySelector<PageNavigator>('page-navigator');
    expect(navigator).not.toBeNull();
    expect(navigator?.page).toBe(1);
    expect(navigator?.numPages).toBe(1);
  });

  it('toggles sort by when sort button is clicked', async () => {
    let capturedUrl = '';
    fetchMocker.mockResponse((req: Request) => {
      if (req.url.includes('/tags')) {
        capturedUrl = req.url;
        return {
          status: 200,
          body: JSON.stringify(mockTagResult),
        };
      }
      return { status: 404 };
    });

    const el = await fixture<PageTags>(html`<page-tags></page-tags>`);
    await el.activatedCallback();
    await new Promise(resolve => setTimeout(resolve, 50));

    expect(capturedUrl).toContain('sort=count');

    // Click sortBy button (first button in toolbar)
    const buttons = el.renderRoot.querySelectorAll<HTMLIonButtonElement>('ion-header ion-button');
    const sortButton = buttons[0];
    expect(sortButton?.textContent.trim()).toBe(TagSortBy.Count);
    sortButton.click();
    await new Promise(resolve => setTimeout(resolve, 50));

    expect(capturedUrl).toContain('sort=tag');
    expect(sortButton?.textContent.trim()).toBe(TagSortBy.Tag);
  });

  it('toggles sort direction when direction button is clicked', async () => {
    let capturedUrl = '';
    fetchMocker.mockResponse((req: Request) => {
      if (req.url.includes('/tags')) {
        capturedUrl = req.url;
        return {
          status: 200,
          body: JSON.stringify(mockTagResult),
        };
      }
      return { status: 404 };
    });

    const el = await fixture<PageTags>(html`<page-tags></page-tags>`);
    await el.activatedCallback();
    await new Promise(resolve => setTimeout(resolve, 50));

    expect(capturedUrl).toContain('dir=desc');

    // Click sortDir button (second button in toolbar)
    const buttons = el.renderRoot.querySelectorAll<HTMLIonButtonElement>('ion-header ion-button');
    const dirButton = buttons[1];
    expect(dirButton?.textContent.trim()).toBe(SortDir.Desc);
    dirButton.click();
    await new Promise(resolve => setTimeout(resolve, 50));

    expect(capturedUrl).toContain('dir=asc');
    expect(dirButton?.textContent.trim()).toBe(SortDir.Asc);
  });

  it('updates page when page-navigator emits pageChanged event', async () => {
    let requestedPage = '';
    fetchMocker.mockResponse((req: Request) => {
      if (req.url.includes('/tags')) {
        const url = new URL(req.url);
        requestedPage = url.searchParams.get('page') ?? '';
        return {
          status: 200,
          body: JSON.stringify({ total: 100, tags: mockTagResult.tags }),
        };
      }
      return { status: 404 };
    });

    const el = await fixture<PageTags>(html`<page-tags></page-tags>`);
    await el.activatedCallback();
    await new Promise(resolve => setTimeout(resolve, 50));
    expect(requestedPage).toBe('1');

    const navigator = el.renderRoot.querySelector('page-navigator');
    navigator?.dispatchEvent(new CustomEvent('pageChanged', { detail: 2 }));
    await new Promise(resolve => setTimeout(resolve, 50));

    expect(requestedPage).toBe('2');
  });

  it('sets state.searchFilter when a tag is clicked', async () => {
    fetchMocker.mockResponse((req: Request) => {
      if (req.url.includes('/tags')) {
        return {
          status: 200,
          body: JSON.stringify(mockTagResult),
        };
      }
      return { status: 404 };
    });

    const el = await fixture<PageTags>(html`<page-tags></page-tags>`);
    await el.activatedCallback();
    await new Promise(resolve => setTimeout(resolve, 50));

    const items = el.renderRoot.querySelectorAll<HTMLIonItemElement>('ion-item');
    items[0].click(); // 'dinner'

    expect(state.searchFilter?.tags).toEqual(['dinner']);
  });

  it('handles swipe gestures to change page', async () => {
    let pageQueried = 1;
    fetchMocker.mockResponse((req: Request) => {
      if (req.url.includes('/tags')) {
        const url = new URL(req.url, 'http://localhost');
        pageQueried = Number(url.searchParams.get('page') || '1');
        return {
          status: 200,
          body: JSON.stringify({ total: 180, tags: mockTagResult.tags }),
        };
      }
      return { status: 404 };
    });

    const el = await fixture<PageTags>(html`<page-tags></page-tags>`);
    await el.activatedCallback();
    await new Promise(resolve => setTimeout(resolve, 50));

    expect(mockGestureEnable).toHaveBeenCalled();
    expect(swipeHandler).toBeDefined();

    // Swipe left advances page
    swipeHandler?.(SwipeDirection.Left);
    await new Promise(resolve => setTimeout(resolve, 50));
    expect(pageQueried).toBe(2);

    // Swipe right decrements page
    swipeHandler?.(SwipeDirection.Right);
    await new Promise(resolve => setTimeout(resolve, 50));
    expect(pageQueried).toBe(1);
  });

  it('handles GET tags failure gracefully', async () => {
    const consoleErrorSpy = vi.spyOn(console, 'error').mockImplementation(() => { });
    fetchMocker.mockResponse(() => Promise.resolve({ status: 500, body: 'Server error' }));

    const el = await fixture<PageTags>(html`<page-tags></page-tags>`);
    await el.activatedCallback();
    await new Promise(resolve => setTimeout(resolve, 50));

    expect(consoleErrorSpy).toHaveBeenCalled();
    const items = el.renderRoot.querySelectorAll('ion-item');
    expect(items).toHaveLength(0);
  });

  it('changes resultsPerPage when resultsPerPage button is clicked', async () => {
    let capturedUrl = '';
    fetchMocker.mockResponse((req: Request) => {
      if (req.url.includes('/tags')) {
        capturedUrl = req.url;
        return {
          status: 200,
          body: JSON.stringify(mockTagResult),
        };
      }
      return { status: 404 };
    });

    vi.spyOn(alertController, 'create').mockResolvedValue({
      present: vi.fn().mockResolvedValue(undefined),
      dismiss: vi.fn().mockResolvedValue(true),
      onDidDismiss: vi.fn().mockResolvedValue({ role: 'confirm', data: { values: 60 } }),
    } as unknown as HTMLIonAlertElement);

    const el = await fixture<PageTags>(html`<page-tags></page-tags>`);
    await el.activatedCallback();
    await new Promise(resolve => setTimeout(resolve, 50));

    const buttons = el.renderRoot.querySelectorAll<HTMLIonButtonElement>('ion-header ion-button');
    const rppButton = buttons[2];
    rppButton.click();
    await new Promise(resolve => setTimeout(resolve, 50));

    expect(capturedUrl).toContain('count=60');
  });
});
