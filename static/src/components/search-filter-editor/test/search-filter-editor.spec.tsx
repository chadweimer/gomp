import { render, h, describe, it, expect } from '@stencil/vitest';
import { fetchMocker } from '../../../../vitest.setup';
import { UserSettings } from '../../../generated';

describe('search-filter-editor', () => {
  it('builds', async () => {
    fetchMocker.mockResponse(async (req: Request) => {
      if (req.url.match(/\/users\/current\/settings$/)) {
        const settings: UserSettings = {
          userId: 1,
          homeTitle: "My Home",
          homeImageUrl: "http://example.com/image.jpg",
          favoriteTags: ["tag1", "tag2"],
        };
        return {
          status: 200,
          body: JSON.stringify(settings),
        };
      }
      return {
        status: 404,
      };
    });
    const { root } = await render(<search-filter-editor />);
    expect(root).toHaveClass('hydrated');
    const savedSearchLoader = root.shadowRoot?.querySelector('#savedSearchLoader');
    expect(savedSearchLoader).toBeNull();
  });
});

describe('shows saved filter loader', () => {
  it('builds', async () => {
    fetchMocker.mockResponse(async (req: Request) => {
      if (req.url.match(/\/users\/current\/settings$/)) {
        const settings: UserSettings = {
          userId: 1,
          homeTitle: "My Home",
          homeImageUrl: "http://example.com/image.jpg",
          favoriteTags: ["tag1", "tag2"],
        };
        return {
          status: 200,
          body: JSON.stringify(settings),
        };
      } else if (req.url.match(/\/users\/current\/filters$/)) {
        return {
          status: 200,
          body: JSON.stringify([]),
        };
      }
      return {
        status: 404,
      };
    });
    const { root } = await render(<search-filter-editor show-saved-loader></search-filter-editor>);
    expect(root).toHaveProperty('showSavedLoader', true);
    const savedSearchLoader = root.shadowRoot?.querySelector('#savedSearchLoader');
    expect(savedSearchLoader).not.toBeNull();
  });
});
