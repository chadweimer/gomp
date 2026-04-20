import { render, h, describe, it, expect } from '@stencil/vitest';
import { fetchMocker } from '../../../../../vitest.setup';
import '../page-tags';

describe('page-tags', () => {
  it('builds', async () => {
    const tags: { [tag: string]: number } = {
      "tag1": 5,
      "tag2": 3,
      "tag3": 8,
    };
    fetchMocker.mockResponse(async (req: Request) => {
      if (req.url.match(/\/tags$/)) {
        return {
          status: 200,
          body: JSON.stringify(tags),
        };
      }
      return {
        status: 404,
      };
    });
    const { root } = await render(<page-tags />);
    expect(root).toHaveClass('hydrated');
    // Should render an ion-item for each tag
    const items = root.querySelectorAll('ion-item');
    expect(items.length).toBe(Object.keys(tags).length);
  });
});
