import { render, h, describe, it, expect } from '@stencil/vitest';
import { fetchMocker } from '../../../../vitest.setup';
import { UserSettings } from '../../../generated';

describe('recipe-editor', () => {
  it('builds', async () => {
    fetchMocker.mockResponse((req: Request) => {
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
    const { root } = await render(<recipe-editor />);
    expect(root).toHaveClass('hydrated');
  });
});
