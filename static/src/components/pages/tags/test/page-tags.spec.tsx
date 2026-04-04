import { render, h, describe, it, expect } from '@stencil/vitest';
import { SortDir } from '../../../../generated';

describe('page-tags', () => {
  it('builds', async () => {
    const { root } = await render(<page-tags />);
    expect(root).toHaveClass('hydrated');
    // Should not render any tag items
    const items = root.querySelectorAll('ion-item');
    expect(items.length).toBe(0);
  });

  // it('renders tags sorted by count descending by default', async () => {
  //   const tags = { apple: 2, banana: 5, cherry: 1 };
  //   const { root, waitForChanges, setProps } = await render(<page-tags />);
  //   setProps({ tags });
  //   await waitForChanges();
  //   const items = root.querySelectorAll('ion-item');
  //   expect(items.length).toBe(3);
  //   expect(items[0]).toHaveTextContent('banana');
  //   expect(items[1]).toHaveTextContent('apple');
  //   expect(items[2]).toHaveTextContent('cherry');
  // });

  // it('can render tags sorted by count ascending', async () => {
  //   const tags = { apple: 2, banana: 5, cherry: 1 };
  //   const { root, waitForChanges, setProps } = await render(<page-tags />);
  //   setProps({ tags, sortDir: SortDir.Asc });
  //   await waitForChanges();
  //   const items = root.querySelectorAll('ion-item');
  //   expect(items[0]).toHaveTextContent('cherry');
  //   expect(items[1]).toHaveTextContent('apple');
  //   expect(items[2]).toHaveTextContent('banana');
  // });

  // it('can render tags sorted by tag descending', async () => {
  //   const tags = { apple: 2, banana: 5, cherry: 1 };
  //   const { root, waitForChanges, setProps } = await render(<page-tags />);
  //   setProps({ tags, sortBy: 'tag' });
  //   await waitForChanges();
  //   const items = root.querySelectorAll('ion-item');
  //   expect(items[0]).toHaveTextContent('cherry');
  //   expect(items[1]).toHaveTextContent('banana');
  //   expect(items[2]).toHaveTextContent('apple');
  // });

  // it('can render tags sorted by tag ascending', async () => {
  //   const tags = { apple: 2, banana: 5, cherry: 1 };
  //   const { root, waitForChanges, setProps } = await render(<page-tags />);
  //   setProps({ tags, sortBy: 'tag', sortDir: SortDir.Asc });
  //   await waitForChanges();
  //   const items = root.querySelectorAll('ion-item');
  //   expect(items[0]).toHaveTextContent('apple');
  //   expect(items[1]).toHaveTextContent('banana');
  //   expect(items[2]).toHaveTextContent('cherry');
  // });
});
