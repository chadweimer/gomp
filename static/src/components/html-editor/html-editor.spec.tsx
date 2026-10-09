import { render, h, describe, it, expect, vi } from '@stencil/vitest';
import './html-editor';

describe('html-editor', () => {
  const mockImages: { name: string; url: string; }[] = [
    {
      name: 'step1.jpg',
      url: '/uploads/recipes/1/thumbs/step1.jpg',
    },
    {
      name: 'step2.png',
      url: '/uploads/recipes/1/thumbs/step2.png',
    },
  ];

  it('builds and renders default formatting buttons without image button when images is not provided', async () => {
    const { root } = await render(<html-editor value="<p>Hello world</p>" />);
    expect(root).toHaveClass('hydrated');

    const boldBtn = root.querySelector('ion-button strong');
    expect(boldBtn).not.toBeNull();
    expect(boldBtn).toEqualText('B');

    const italicBtn = root.querySelector('ion-button em');
    expect(italicBtn).not.toBeNull();

    const underlineBtn = root.querySelector('ion-button u');
    expect(underlineBtn).not.toBeNull();

    const listIcon = root.querySelector('ion-button ion-icon[icon="list"]');
    expect(listIcon).not.toBeNull();

    const imageIcon = root.querySelector('ion-button ion-icon[icon="image"]');
    expect(imageIcon).toBeNull();

    const picker = root.querySelector('.image-picker-panel');
    expect(picker).toBeNull();
  });

  it('does not render image button when images is an empty array', async () => {
    const { root } = await render(<html-editor images={[]} />);
    const imageIcon = root.querySelector('ion-button ion-icon[icon="image"]');
    expect(imageIcon).toBeNull();
  });

  it('renders image button when images has items', async () => {
    const { root } = await render(<html-editor images={mockImages} />);
    const imageIcon = root.querySelector('ion-button ion-icon[icon="image"]');
    expect(imageIcon).not.toBeNull();

    const picker = root.querySelector('.image-picker-panel');
    expect(picker).toBeNull();
  });

  it('toggles image picker panel open and closed via image button', async () => {
    const { root, waitForChanges } = await render(<html-editor images={mockImages} />);

    const imageBtn = root.querySelector('ion-button ion-icon[icon="image"]')?.closest<HTMLIonButtonElement>('ion-button');
    expect(imageBtn).not.toBeNull();

    imageBtn?.click();
    await waitForChanges();

    let picker = root.querySelector('.image-picker-panel');
    expect(picker).not.toBeNull();

    const items = root.querySelectorAll('.image-picker-item');
    expect(items).toHaveLength(mockImages.length);

    const firstImg = items[0].querySelector('img');
    expect(firstImg).toEqualAttribute('src', mockImages[0].url);
    expect(firstImg).toEqualAttribute('alt', mockImages[0].name);

    imageBtn?.click();
    await waitForChanges();

    picker = root.querySelector('.image-picker-panel');
    expect(picker).toBeNull();
  });

  it('inserts image and emits valueChanged when an image is selected', async () => {
    const { root, waitForChanges } = await render(<html-editor images={mockImages} value="<p>Instructions</p>" />);

    const valueChangedSpy = vi.fn();
    root.addEventListener('valueChanged', valueChangedSpy);

    const imageBtn = root.querySelector('ion-button ion-icon[icon="image"]')?.closest<HTMLIonButtonElement>('ion-button');
    imageBtn?.click();
    await waitForChanges();

    const items = root.querySelectorAll<HTMLButtonElement>('.image-picker-item');
    items[0]?.click();
    await waitForChanges();

    // Picker should be closed
    const picker = root.querySelector('.image-picker-panel');
    expect(picker).toBeNull();

    // Editor content should contain the image tag
    const editorContent = root.querySelector('.editor-content');
    const img = editorContent?.querySelector('img');
    expect(img).not.toBeNull();
    expect(img).toEqualAttribute('src', mockImages[0].url);
    expect(img).toEqualAttribute('alt', mockImages[0].name);
    expect(img).toEqualAttribute('data-image', mockImages[0].name);

    // Event should be emitted with sentinel
    expect(valueChangedSpy).toHaveBeenCalledTimes(1);
    const eventArg = valueChangedSpy.mock.calls[0][0] as CustomEvent<string>;
    expect(eventArg.detail).toContain(`src="${mockImages[0].url}"`);
    expect(eventArg.detail).toContain(`data-image="${mockImages[0].name}"`);
  });

  it('emits valueChanged on blur', async () => {
    const { root, waitForChanges } = await render(
      <html-editor images={mockImages} value={`<p>Step 1: <img src="${mockImages[0].url}" data-image="${mockImages[0].name}" /></p>`} />,
    );

    const editorContent = root.querySelector('.editor-content');
    const img = editorContent?.querySelector('img');
    expect(img).not.toBeNull();

    const valueChangedSpy = vi.fn();
    root.addEventListener('valueChanged', valueChangedSpy);

    const outsideEl = document.createElement('div');
    document.body.appendChild(outsideEl);

    editorContent?.dispatchEvent(new FocusEvent('focusout', { relatedTarget: outsideEl, bubbles: true }));
    await waitForChanges();

    expect(valueChangedSpy).toHaveBeenCalledTimes(1);
    const eventArg = valueChangedSpy.mock.calls[0][0] as CustomEvent<string>;
    expect(eventArg.detail).toContain(`src="${mockImages[0].url}"`);
    expect(eventArg.detail).toContain(`data-image="${mockImages[0].name}"`);
    outsideEl.remove();
  });

  it('closes picker on blur when focus moves outside the component', async () => {
    const { root, waitForChanges } = await render(<html-editor images={mockImages} />);

    const imageBtn = root.querySelector('ion-button ion-icon[icon="image"]')?.closest<HTMLIonButtonElement>('ion-button');
    imageBtn?.click();
    await waitForChanges();

    expect(root.querySelector('.image-picker-panel')).not.toBeNull();

    const editorContent = root.querySelector('.editor-content');
    const outsideEl = document.createElement('div');
    document.body.appendChild(outsideEl);

    editorContent?.dispatchEvent(new FocusEvent('focusout', { relatedTarget: outsideEl, bubbles: true }));
    await waitForChanges();

    expect(root.querySelector('.image-picker-panel')).toBeNull();
    outsideEl.remove();
  });

  it('delegates focus to .editor-content when html-editor receives focus', async () => {
    const { root } = await render(<html-editor />);
    const editorContent = root.querySelector('.editor-content') as HTMLElement;
    expect(editorContent).not.toBeNull();

    const focusSpy = vi.spyOn(editorContent, 'focus');

    root.focus();

    expect(focusSpy).toHaveBeenCalledTimes(1);
  });

  it('does not re-delegate focus when a child element receives focus', async () => {
    const { root } = await render(<html-editor />);
    const editorToolbar = root.querySelector('.editor-toolbar') as HTMLElement;
    expect(editorToolbar).not.toBeNull();
    const editorContent = root.querySelector('.editor-content') as HTMLElement;
    expect(editorContent).not.toBeNull();

    const focusSpy = vi.spyOn(editorContent, 'focus');

    editorToolbar.focus();

    expect(focusSpy).not.toHaveBeenCalled();
  });

  it('respects feature flags to toggle headings, links, font size, and alignment', async () => {
    const { root: defaultRoot } = await render(<html-editor />);
    expect(defaultRoot.querySelector('ion-button[title="Heading 2"]')).not.toBeNull();
    expect(defaultRoot.querySelector('ion-button[title="Heading 3"]')).not.toBeNull();
    expect(defaultRoot.querySelector('ion-button[title="Hyperlink"]')).not.toBeNull();
    expect(defaultRoot.querySelector('ion-button[title="Font size"]')).toBeNull();
    expect(defaultRoot.querySelector('ion-button[title="Text alignment"]')).toBeNull();

    const { root: customRoot } = await render(
      <html-editor
        enableHeadings={false}
        enableLinks={false}
        enableFontSize={true}
        enableAlignment={true}
      />
    );
    expect(customRoot.querySelector('ion-button[title="Heading 2"]')).toBeNull();
    expect(customRoot.querySelector('ion-button[title="Heading 3"]')).toBeNull();
    expect(customRoot.querySelector('ion-button[title="Hyperlink"]')).toBeNull();
    expect(customRoot.querySelector('ion-button[title="Font size"]')).not.toBeNull();
    expect(customRoot.querySelector('ion-button[title="Text alignment"]')).not.toBeNull();
  });

  it('toggles font size panel and applies font size', async () => {
    const { root, waitForChanges } = await render(
      <html-editor enableFontSize={true} value="<p>Some text</p>" />
    );

    const fontBtn = root.querySelector('ion-button[title="Font size"]') as HTMLIonButtonElement;
    expect(fontBtn).not.toBeNull();

    fontBtn.click();
    await waitForChanges();

    const panel = root.querySelector('.font-size-panel');
    expect(panel).not.toBeNull();

    const largeBtn = panel?.querySelectorAll('ion-button')[2];
    expect(largeBtn?.textContent).toBe('Large');

    largeBtn?.click();
    await waitForChanges();

    expect(root.querySelector('.font-size-panel')).toBeNull();
  });

  it('toggles alignment panel and applies alignment', async () => {
    const { root, waitForChanges } = await render(
      <html-editor enableAlignment={true} value="<p>Centered</p>" />
    );

    const alignBtn = root.querySelector('ion-button[title="Text alignment"]') as HTMLIonButtonElement;
    expect(alignBtn).not.toBeNull();

    alignBtn.click();
    await waitForChanges();

    const panel = root.querySelector('.align-panel');
    expect(panel).not.toBeNull();

    const centerBtn = panel?.querySelectorAll('ion-button')[1];
    expect(centerBtn?.textContent).toBe('Center');

    centerBtn?.click();
    await waitForChanges();

    expect(root.querySelector('.align-panel')).toBeNull();
  });

  it('toggles link panel and creates a link', async () => {
    const { root, waitForChanges } = await render(
      <html-editor enableLinks={true} value="<p>Click here</p>" />
    );

    const linkBtn = root.querySelector('ion-button[title="Hyperlink"]') as HTMLIonButtonElement;
    expect(linkBtn).not.toBeNull();

    linkBtn.click();
    await waitForChanges();

    const panel = root.querySelector('.link-panel');
    expect(panel).not.toBeNull();

    const input = panel?.querySelector('.link-input') as HTMLInputElement;
    input.value = 'https://example.com';
    input.dispatchEvent(new CustomEvent('input'));

    const applyBtn = panel?.querySelector('ion-button') as HTMLIonButtonElement;
    applyBtn.click();
    await waitForChanges();

    expect(root.querySelector('.link-panel')).toBeNull();
  });

  it('renders image with width and alignment attributes in custom node view', async () => {
    const { root } = await render(
      <html-editor
        images={mockImages}
        value={`<p>Step 1: <img src="${mockImages[0].url}" data-image="${mockImages[0].name}" data-width="250px" data-align="center" /></p>`}
      />
    );

    const container = root.querySelector('.editor-image-container');
    expect(container).not.toBeNull();
    expect(container).toHaveClass('image-align-center');

    const wrapper = root.querySelector('.editor-image-wrapper') as HTMLElement;
    expect(wrapper).not.toBeNull();
    expect(wrapper.style.width).toBe('250px');
  });
});
