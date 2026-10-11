import { render, h, describe, it, expect, vi } from '@stencil/vitest';
import './html-editor';

describe('html-editor', () => {
  const mockImages: { name: string; url: string; thumbUrl: string }[] = [
    {
      name: 'step1.jpg',
      url: '/uploads/recipes/1/images/step1.jpg',
      thumbUrl: '/uploads/recipes/1/thumbs/step1.jpg',
    },
    {
      name: 'step2.png',
      url: '/uploads/recipes/1/images/step2.png',
      thumbUrl: '/uploads/recipes/1/thumbs/step2.png',
    },
  ];

  it('builds and renders default formatting buttons without image button when images is not provided', async () => {
    const { root } = await render(<html-editor value="<p>Hello world</p>" />);
    expect(root).toHaveClass('hydrated');

    const shadowRoot = root.shadowRoot;
    expect(shadowRoot).not.toBeNull();

    const boldBtn = shadowRoot?.querySelector('ion-button strong');
    expect(boldBtn).not.toBeNull();
    expect(boldBtn).toEqualText('B');

    const italicBtn = shadowRoot?.querySelector('ion-button em');
    expect(italicBtn).not.toBeNull();

    const underlineBtn = shadowRoot?.querySelector('ion-button u');
    expect(underlineBtn).not.toBeNull();

    const listIcon = shadowRoot?.querySelector('ion-button ion-icon[icon="list"]');
    expect(listIcon).not.toBeNull();

    const imageIcon = shadowRoot?.querySelector('ion-button ion-icon[icon="image"]');
    expect(imageIcon).toBeNull();

    const picker = shadowRoot?.querySelector('.image-picker-panel');
    expect(picker).toBeNull();
  });

  it('does not render image button when images is an empty array', async () => {
    const { root } = await render(<html-editor images={[]} />);
    const imageIcon = root.shadowRoot?.querySelector('ion-button ion-icon[icon="image"]');
    expect(imageIcon).toBeNull();
  });

  it('renders image button when images has items', async () => {
    const { root } = await render(<html-editor images={mockImages} />);
    const imageIcon = root.shadowRoot?.querySelector('ion-button ion-icon[icon="image"]');
    expect(imageIcon).not.toBeNull();

    const picker = root.shadowRoot?.querySelector('.image-picker-panel');
    expect(picker).toBeNull();
  });

  it('toggles image picker panel open and closed via image button', async () => {
    const { root, waitForChanges } = await render(<html-editor images={mockImages} />);

    const imageBtn = root.shadowRoot?.querySelector('ion-button ion-icon[icon="image"]')?.closest<HTMLIonButtonElement>('ion-button');
    expect(imageBtn).not.toBeNull();

    imageBtn?.click();
    await waitForChanges();

    let picker = root.shadowRoot?.querySelector('.image-picker-panel');
    expect(picker).not.toBeNull();

    const items = root.shadowRoot?.querySelectorAll('.image-picker-item');
    expect(items).toHaveLength(mockImages.length);

    const firstImg = items?.[0].querySelector('img');
    expect(firstImg).toEqualAttribute('src', mockImages[0].thumbUrl);
    expect(firstImg).toEqualAttribute('alt', mockImages[0].name);

    imageBtn?.click();
    await waitForChanges();

    picker = root.shadowRoot?.querySelector('.image-picker-panel');
    expect(picker).toBeNull();
  });

  it('inserts image and emits valueChanged when an image is selected', async () => {
    const { root, waitForChanges } = await render(<html-editor images={mockImages} value="<p>Instructions</p>" />);

    const valueChangedSpy = vi.fn();
    root.addEventListener('valueChanged', valueChangedSpy);

    const imageBtn = root.shadowRoot?.querySelector('ion-button ion-icon[icon="image"]')?.closest<HTMLIonButtonElement>('ion-button');
    imageBtn?.click();
    await waitForChanges();

    const items = root.shadowRoot?.querySelectorAll<HTMLButtonElement>('.image-picker-item');
    items?.[0]?.click();
    await waitForChanges();

    // Picker should be closed
    const picker = root.shadowRoot?.querySelector('.image-picker-panel');
    expect(picker).toBeNull();

    // Editor content should contain the image tag
    const editorContent = root.shadowRoot?.querySelector('.editor-content');
    const img = editorContent?.querySelector('img[data-image]');
    expect(img).not.toBeNull();
    expect(img).toEqualAttribute('src', mockImages[0].url);
    expect(img).toEqualAttribute('alt', mockImages[0].name);
    expect(img).toEqualAttribute('data-image', mockImages[0].name);

    // Event should be emitted with sentinel
    expect(valueChangedSpy).toHaveBeenCalled();
    const eventArg = valueChangedSpy.mock.calls[0][0] as CustomEvent<string>;
    expect(eventArg.detail).toContain(`src="${mockImages[0].url}"`);
    expect(eventArg.detail).toContain(`data-image="${mockImages[0].name}"`);
  });

  it('emits valueChanged on blur', async () => {
    const { root, waitForChanges } = await render(
      <html-editor images={mockImages} value={`<p>Step 1: <img src="${mockImages[0].url}" data-image="${mockImages[0].name}" /></p>`} />,
    );

    const editorContent = root.shadowRoot?.querySelector('.editor-content');
    const img = editorContent?.querySelector('img');
    expect(img).not.toBeNull();

    const valueChangedSpy = vi.fn();
    root.addEventListener('valueChanged', valueChangedSpy);

    const outsideEl = document.createElement('div');
    document.body.appendChild(outsideEl);

    root.dispatchEvent(new FocusEvent('focusout', { relatedTarget: outsideEl, bubbles: true }));
    await waitForChanges();

    expect(valueChangedSpy).toHaveBeenCalledTimes(1);
    const eventArg = valueChangedSpy.mock.calls[0][0] as CustomEvent<string>;
    expect(eventArg.detail).toContain(`src="${mockImages[0].url}"`);
    expect(eventArg.detail).toContain(`data-image="${mockImages[0].name}"`);
    outsideEl.remove();
  });

  it('closes picker on blur when focus moves outside the component', async () => {
    const { root, waitForChanges } = await render(<html-editor images={mockImages} />);

    const imageBtn = root.shadowRoot?.querySelector('ion-button ion-icon[icon="image"]')?.closest<HTMLIonButtonElement>('ion-button');
    imageBtn?.click();
    await waitForChanges();

    expect(root.shadowRoot?.querySelector('.image-picker-panel')).not.toBeNull();

    const outsideEl = document.createElement('div');
    document.body.appendChild(outsideEl);

    root.dispatchEvent(new FocusEvent('focusout', { relatedTarget: outsideEl, bubbles: true }));
    await waitForChanges();

    expect(root.shadowRoot?.querySelector('.image-picker-panel')).toBeNull();
    outsideEl.remove();
  });

  it('delegates focus to .editor-content when html-editor receives focus', async () => {
    const { root } = await render(<html-editor />);
    const editorContent = root.shadowRoot?.querySelector('.editor-content') as HTMLElement;
    expect(editorContent).not.toBeNull();

    const focusSpy = vi.spyOn(editorContent, 'focus');

    root.focus();

    expect(focusSpy).toHaveBeenCalledTimes(1);
  });

  it('does not re-delegate focus when a child element receives focus', async () => {
    const { root } = await render(<html-editor />);
    const editorToolbar = root.shadowRoot?.querySelector('.editor-toolbar') as HTMLElement;
    expect(editorToolbar).not.toBeNull();
    const editorContent = root.shadowRoot?.querySelector('.editor-content') as HTMLElement;
    expect(editorContent).not.toBeNull();

    const focusSpy = vi.spyOn(editorContent, 'focus');

    editorToolbar.focus();

    expect(focusSpy).not.toHaveBeenCalled();
  });

  it('toggles link panel and creates a link', async () => {
    const { root, waitForChanges } = await render(
      <html-editor value="<p>Click here</p>" />
    );

    const linkBtn = root.shadowRoot?.querySelector('ion-button[title="Hyperlink"]') as HTMLIonButtonElement;
    expect(linkBtn).not.toBeNull();

    linkBtn.click();
    await waitForChanges();

    const panel = root.shadowRoot?.querySelector('.link-panel');
    expect(panel).not.toBeNull();

    const input = panel?.querySelector('.link-input') as HTMLInputElement;
    input.value = 'https://example.com';
    input.dispatchEvent(new CustomEvent('input'));

    const applyBtn = panel?.querySelector('ion-button') as HTMLIonButtonElement;
    applyBtn.click();
    await waitForChanges();

    expect(root.querySelector('.link-panel')).toBeNull();
  });

  it('renders image with data-image and data-height attributes using GompImage', async () => {
    const { root } = await render(
      <html-editor
        images={mockImages}
        value={`<p>Step 1: <img src="${mockImages[0].url}" data-image="${mockImages[0].name}" data-height="250px" /></p>`}
      />
    );

    const img = root.shadowRoot?.querySelector('.editor-content img') as HTMLImageElement;
    expect(img).not.toBeNull();
    expect(img.getAttribute('data-image')).toBe(mockImages[0].name);
    expect(img.getAttribute('data-height')).toBe('250px');
    expect(img.style.height).toBe('250px');
  });
});
