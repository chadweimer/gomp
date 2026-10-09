import Image from '@tiptap/extension-image';

// Ensure Range getClientRects exists in test/JSDOM environments
if (typeof Range !== 'undefined' && !Range.prototype.getClientRects) {
  Range.prototype.getClientRects = () => [] as unknown as DOMRectList;
  Range.prototype.getBoundingClientRect = () =>
    ({
      top: 0,
      left: 0,
      bottom: 0,
      right: 0,
      width: 0,
      height: 0,
      x: 0,
      y: 0,
      toJSON: () => { },
    }) as DOMRect;
}

export const GompImage = Image.extend({
  addAttributes() {
    return {
      ...this.parent?.(),
      'data-image': {
        default: null,
        parseHTML: element => element.dataset.image || null,
        renderHTML: (attributes: Record<string, string | null>) => {
          const dataImage = attributes['data-image'];
          if (!dataImage) return {};
          return { 'data-image': dataImage };
        },
      },
      width: {
        default: null,
        parseHTML: element => {
          const w = element.dataset?.width || element.style.width;
          if (!w) return null;
          const parsed = parseInt(w, 10);
          return isNaN(parsed) ? null : parsed;
        },
        renderHTML: (attributes: Record<string, string | null>) => {
          const raw = attributes.width || attributes['data-width'];
          if (!raw) return {};
          const widthStr = String(raw);
          const styleWidth = widthStr.endsWith('%') || widthStr.endsWith('px') ? widthStr : `${widthStr}px`;
          return {
            'data-width': styleWidth,
            style: `width: ${styleWidth}`,
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
