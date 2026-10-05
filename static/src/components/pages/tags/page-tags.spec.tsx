import { render, h, describe, it, expect, beforeEach, afterEach } from '@stencil/vitest';
import { vi } from 'vitest';
import { AlertButton, alertController } from '@ionic/core';
import { fetchMocker } from '../../../../vitest.setup';
import { TagSearchResult, TagSortBy, SortDir } from '../../../helpers/schema.gen';
import { SwipeDirection } from '../../../models';
import state, { clearState } from '../../../stores/state';
import './page-tags';
import { PageTags } from './page-tags';

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
  });

  afterEach(() => {
    globalThis.fetch = originalFetch;
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

    const { root } = await render(<page-tags />);
    expect(root).toHaveClass('hydrated');

    const items = root.querySelectorAll('ion-item');
    expect(items).toHaveLength(mockTagResult.tags?.length ?? 0);

    const firstLabel = items[0].querySelector('ion-label');
    expect(firstLabel).toHaveTextContent('dinner');
    const firstNote = items[0].querySelector('ion-note');
    expect(firstNote).toHaveTextContent('12');

    const navigator = root.querySelector('page-navigator');
    expect(navigator).not.toBeNull();
    expect(navigator).toEqualAttribute('page', '1');
    expect(navigator).toEqualAttribute('numpages', '1');
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

    const { root, waitForChanges } = await render(<page-tags />);
    expect(capturedUrl).toContain('sort=count');

    // Click sortBy button (first button in toolbar)
    const buttons = root.querySelectorAll<HTMLIonButtonElement>('ion-header ion-button');
    const sortButton = buttons[0];
    expect(sortButton).toHaveTextContent(TagSortBy.Count);

    sortButton.click();
    await waitForChanges();

    expect(capturedUrl).toContain('sort=tag');
    expect(sortButton).toHaveTextContent(TagSortBy.Tag);
  });

  it('toggles sort direction when dir button is clicked', async () => {
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

    const { root, waitForChanges } = await render(<page-tags />);
    expect(capturedUrl).toContain('dir=desc');

    const buttons = root.querySelectorAll<HTMLIonButtonElement>('ion-header ion-button');
    const dirButton = buttons[1];
    expect(dirButton).toHaveTextContent(SortDir.Desc);

    dirButton.click();
    await waitForChanges();

    expect(capturedUrl).toContain('dir=asc');
    expect(dirButton).toHaveTextContent(SortDir.Asc);
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

    const { root, waitForChanges } = await render(<page-tags />);
    expect(requestedPage).toBe('1');

    const navigator = root.querySelector('page-navigator');
    navigator?.dispatchEvent(new CustomEvent('pageChanged', { detail: 2 }));
    await waitForChanges();

    expect(requestedPage).toBe('2');
  });

  it('allows changing results per page through alert controller', async () => {
    let requestedCount = '';
    fetchMocker.mockResponse((req: Request) => {
      if (req.url.includes('/tags')) {
        const url = new URL(req.url);
        requestedCount = url.searchParams.get('count') ?? '';
        return {
          status: 200,
          body: JSON.stringify(mockTagResult),
        };
      }
      return { status: 404 };
    });

    const createAlertSpy = vi.spyOn(alertController, 'create').mockResolvedValue({
      present: vi.fn().mockResolvedValue(undefined),
    } as unknown as HTMLIonAlertElement);

    const { root, waitForChanges } = await render(<page-tags />);
    const buttons = root.querySelectorAll<HTMLIonButtonElement>('ion-header ion-button');
    const rppButton = buttons[2];
    expect(rppButton).toHaveTextContent('60');

    rppButton.click();
    await waitForChanges();

    expect(createAlertSpy).toHaveBeenCalledWith(expect.objectContaining({ header: 'Results Per Page' }));

    const alertOptions = createAlertSpy.mock.calls[0][0];
    const okButton = alertOptions.buttons?.find(b => typeof b === 'object' && b.text === 'OK') as AlertButton;
    expect(okButton).toBeDefined();

    const handler = okButton.handler as (val: number) => void;
    handler(24);
    await waitForChanges();

    expect(requestedCount).toBe('24');
    expect(rppButton).toHaveTextContent('24');
  });

  it('handles swipe gestures for page navigation', async () => {
    fetchMocker.mockResponse((req: Request) => {
      if (req.url.includes('/tags')) {
        return {
          status: 200,
          body: JSON.stringify({ total: 120, tags: mockTagResult.tags }),
        };
      }
      return { status: 404 };
    });

    const { instance, waitForChanges } = await render<HTMLPageTagsElement, PageTags>(<page-tags />);
    expect(mockGestureEnable).toHaveBeenCalled();
    expect(swipeHandler).toBeDefined();

    // Swipe left should advance page (1 -> 2)
    swipeHandler?.(SwipeDirection.Left);
    await waitForChanges();
    expect(instance?.page).toBe(2);

    // Swipe right should decrement page (2 -> 1)
    swipeHandler?.(SwipeDirection.Right);
    await waitForChanges();
    expect(instance?.page).toBe(1);

    // Swipe right at page 1 does not decrement further
    swipeHandler?.(SwipeDirection.Right);
    await waitForChanges();
    expect(instance?.page).toBe(1);
  });

  it('updates state searchFilter when a tag item is clicked', async () => {
    fetchMocker.mockResponse((req: Request) => {
      if (req.url.includes('/tags')) {
        return {
          status: 200,
          body: JSON.stringify(mockTagResult),
        };
      }
      return { status: 404 };
    });

    const { root } = await render(<page-tags />);
    const firstItem = root.querySelector<HTMLIonItemElement>('ion-item');
    firstItem?.click();

    expect(state.searchFilter.tags).toEqual(['dinner']);
  });

  it('handles API errors gracefully during load', async () => {
    const consoleErrorSpy = vi.spyOn(console, 'error').mockImplementation(() => { });
    fetchMocker.mockResponse(() => ({ status: 500, body: 'Server error' }));

    try {
      await render(<page-tags />);
    } catch (err) {
      expect(err).toBeDefined();
    }

    expect(consoleErrorSpy).toHaveBeenCalled();
  });
});
