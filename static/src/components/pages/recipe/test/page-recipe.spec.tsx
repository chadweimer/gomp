import { render, h, describe, it, expect } from '@stencil/vitest';

describe('page-recipe', () => {
  it('builds', async () => {
    const { root } = await render<HTMLPageRecipeElement>(<page-recipe />);
    expect(root).toHaveClass('hydrated');
  });
});
