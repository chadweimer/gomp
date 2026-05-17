import { render, h, describe, it, expect } from '@stencil/vitest';
import { fetchMocker } from '../../../../../vitest.setup';
import { Recipe } from '../../../../components';
import '../page-recipe';
import { RecipeState } from '../../../../generated';

describe('page-recipe', () => {
  it('builds', async () => {
    fetchMocker.mockResponse((req: Request) => {
      if (req.url.match(/\/recipes\/\d+$/)) {
        const recipeObject: Recipe = {
          id: 1,
          name: 'Pancakes',
          state: RecipeState.Active,
          rating: 0,
          servingSize: '4',
          time: '30 minutes',
          nutritionInfo: '...',
          ingredients: '...',
          directions: '...',
          storageInstructions: '...',
          sourceUrl: '...',
          mainImageName: '',
          tags: ['breakfast'],
        };
        return {
          status: 200,
          body: JSON.stringify(recipeObject),
        };
      } else if (req.url.match(/\/recipes\/\d+\/rating$/)) {
        return {
          status: 200,
          body: JSON.stringify(4.5),
        };
      } else if (req.url.match(/\/recipes\/\d+\/(links|images|notes)$/)) {
        return {
          status: 200,
          body: JSON.stringify([]),
        };
      } else if (req.url.match(/\/recipes\/\d+\/image$/)) {
        return {
          status: 200,
          body: JSON.stringify(null),
        };
      }
      return {
        status: 404,
      };
    });
    const { root } = await render(<page-recipe recipe-id={1} />);
    expect(root).toHaveClass('hydrated');
  });
});
