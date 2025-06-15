import { newSpecPage } from '@stencil/core/testing';
import { PageTags } from '../page-tags';
import { SortDir } from '../../../../generated';

describe('page-tags', () => {
  it('builds', async () => {
    const page = await newSpecPage({
      components: [PageTags],
      html: '<page-tags></page-tags>',
    });
    expect(page.rootInstance).toBeInstanceOf(PageTags);
    // Should not render any tag items
    const items = page.root.querySelectorAll('ion-item');
    expect(items.length).toBe(0);
  });

  it('renders tags sorted by count descending by default', async () => {
    const tags = { apple: 2, banana: 5, cherry: 1 };
    const page = await newSpecPage({
      components: [PageTags],
      html: '<page-tags></page-tags>'
    });
    const instance = page.rootInstance as PageTags;;
    instance.tags = tags;
    await page.waitForChanges();
    const items = page.root.querySelectorAll('ion-item');
    expect(items.length).toBe(3);
    expect(items[0].textContent).toContain('banana');
    expect(items[1].textContent).toContain('apple');
    expect(items[2].textContent).toContain('cherry');
  });

  it('can render tags sorted by count ascending', async () => {
    const tags = { apple: 2, banana: 5, cherry: 1 };
    const page = await newSpecPage({
      components: [PageTags],
      html: '<page-tags></page-tags>'
    });
    const instance = page.rootInstance as PageTags;
    instance.tags = tags;
    instance.sortDir = SortDir.Asc;
    await page.waitForChanges();
    const items = page.root.querySelectorAll('ion-item');
    expect(items[0].textContent).toContain('cherry');
    expect(items[1].textContent).toContain('apple');
    expect(items[2].textContent).toContain('banana');
  });

  it('can render tags sorted by tag descending', async () => {
    const tags = { apple: 2, banana: 5, cherry: 1 };
    const page = await newSpecPage({
      components: [PageTags],
      html: '<page-tags></page-tags>'
    });
    const instance = page.rootInstance as PageTags;
    instance.tags = tags;
    instance.sortBy = 'tag';
    await page.waitForChanges();
    const items = page.root.querySelectorAll('ion-item');
    expect(items[0].textContent).toContain('cherry');
    expect(items[1].textContent).toContain('banana');
    expect(items[2].textContent).toContain('apple');
  });

  it('can render tags sorted by tag ascending', async () => {
    const tags = { apple: 2, banana: 5, cherry: 1 };
    const page = await newSpecPage({
      components: [PageTags],
      html: '<page-tags></page-tags>'
    });
    const instance = page.rootInstance as PageTags;
    instance.tags = tags;
    instance.sortBy = 'tag';
    instance.sortDir = SortDir.Asc;
    await page.waitForChanges();
    const items = page.root.querySelectorAll('ion-item');
    expect(items[0].textContent).toContain('apple');
    expect(items[1].textContent).toContain('banana');
    expect(items[2].textContent).toContain('cherry');
  });
});
