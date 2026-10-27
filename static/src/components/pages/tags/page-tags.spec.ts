import { fixture, html } from '@open-wc/testing';
import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { fetchMocker } from '../../../../vitest.setup';
import { TagSearchResult } from '../../../helpers/schema.gen';
import { SwipeDirection } from '../../../models';
import state, { clearState } from '../../../stores/state';
import './page-tags';
import type { PageTags } from './page-tags';

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
  let routerEl: HTMLElement & { push?: ReturnType<typeof vi.fn> };

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

    routerEl = document.createElement('ion-router') as any;
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

    const items = el.querySelectorAll('ion-item');
    expect(items).toHaveLength(mockTagResult.tags?.length ?? 0);

    const firstLabel = items[0].querySelector('ion-label');
    expect(firstLabel?.textContent?.trim()).toBe('dinner');
    const firstNote = items[0].querySelector('ion-note');
    expect(firstNote?.textContent?.trim()).toBe('12');

    const navigator = el.querySelector('page-navigator');
    expect(navigator).not.toBeNull();
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
    const buttons = el.querySelectorAll<HTMLIonButtonElement>('ion-header ion-button');
    const sortButton = buttons[0];
    sortButton.click();
    await new Promise(resolve => setTimeout(resolve, 50));

    expect(capturedUrl).toContain('sort=tag');
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
    const buttons = el.querySelectorAll<HTMLIonButtonElement>('ion-header ion-button');
    const dirButton = buttons[1];
    dirButton.click();
    await new Promise(resolve => setTimeout(resolve, 50));

    expect(capturedUrl).toContain('dir=asc');
  });

  it('sets state.searchFilter and redirects to /recipes when a tag is clicked', async () => {
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

    const items = el.querySelectorAll<HTMLIonItemElement>('ion-item');
    items[0].click(); // 'dinner'

    expect(state.searchFilter?.tags).toEqual(['dinner']);
    expect(routerEl.push).toHaveBeenCalledWith('/recipes');
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
});

