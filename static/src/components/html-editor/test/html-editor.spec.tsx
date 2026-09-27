import { render, h, describe, it, expect, vi } from '@stencil/vitest';
import { HtmlEditorImage } from '../../../models';
import '../html-editor';

describe('html-editor', () => {
  const mockImages: HtmlEditorImage[] = [
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

  it('toggles image picker panel open and closed via image button and close button', async () => {
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

    const closeBtn = picker?.querySelector<HTMLIonButtonElement>('.image-picker-header ion-button');
    expect(closeBtn).not.toBeNull();

    closeBtn?.click();
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

    // Event should be emitted
    expect(valueChangedSpy).toHaveBeenCalledTimes(1);
    const eventArg = valueChangedSpy.mock.calls[0][0] as CustomEvent<string>;
    expect(eventArg.detail).toContain(`<img src="${mockImages[0].url}" alt="${mockImages[0].name}">`);
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

    editorContent?.dispatchEvent(new FocusEvent('blur', { relatedTarget: outsideEl }));
    await waitForChanges();

    expect(root.querySelector('.image-picker-panel')).toBeNull();
    outsideEl.remove();
  });
});
