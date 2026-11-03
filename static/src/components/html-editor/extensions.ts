import Image from '@tiptap/extension-image';

export const GompImage = Image.extend({
  addAttributes() {
    return {
      ...this.parent?.(),
      'data-image': {
        default: null,
        parseHTML: element => element.dataset.image,
        renderHTML: (attributes: Record<string, string | null>) => {
          const dataImage = attributes['data-image'];
          return dataImage != null && dataImage !== '' ? { 'data-image': dataImage } : {};
        },
      },
      height: {
        default: null,
        parseHTML: element => {
          return element.dataset.height != null && element.dataset.height !== '' ? element.dataset.height : element.style.height;
        },
        renderHTML: (attributes: Record<string, string | null>) => {
          let heightStr = attributes.height != null && attributes.height !== '' ? attributes.height : attributes['data-height'];
          if (heightStr == null || heightStr === '') {
            return {};
          }
          heightStr = String(heightStr);
          const styleHeight = heightStr.endsWith('%') || heightStr.endsWith('px') ? heightStr : `${heightStr}px`;
          return {
            'data-height': styleHeight,
            style: `height: ${styleHeight}`,
          };
        },
      },
    };
  },

  parseHTML() {
    return [
      {
        tag: 'img[data-image]',
      },
      {
        tag: 'img[src]',
      },
    ];
  },
});

