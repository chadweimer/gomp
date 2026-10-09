import { Node, mergeAttributes } from '@tiptap/core';

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
      toJSON: () => {},
    }) as DOMRect;
}

interface ImageNodeAttributes {
  src?: string;
  alt?: string;
  'data-image'?: string;
  'data-width'?: string;
  'data-align'?: 'left' | 'center' | 'right';
}

export const ImageNode = Node.create({
  name: 'imageNode',
  group: 'block',
  atom: true,
  draggable: true,

  addAttributes() {
    return {
      src: {
        default: null,
      },
      alt: {
        default: null,
      },
      'data-image': {
        default: null,
        parseHTML: element => element.getAttribute('data-image') || element.dataset.image || null,
        renderHTML: (attributes: Record<string, string | null>) => {
          const dataImage = attributes['data-image'];
          if (!dataImage) return {};
          return { 'data-image': dataImage };
        },
      },
      'data-width': {
        default: null,
        parseHTML: element => element.getAttribute('data-width') || element.style.width || element.dataset.width || null,
        renderHTML: (attributes: Record<string, string | null>) => {
          const w = attributes['data-width'];
          if (!w) return {};
          const styleWidth = w.endsWith('%') || w.endsWith('px') ? w : `${w}px`;
          return {
            'data-width': w,
            style: `width: ${styleWidth}`,
          };
        },
      },
      'data-align': {
        default: 'center',
        parseHTML: element => {
          return (
            element.getAttribute('data-align') ||
            element.dataset.align ||
            (element.classList.contains('image-align-left')
              ? 'left'
              : element.classList.contains('image-align-right')
                ? 'right'
                : 'center')
          );
        },
        renderHTML: (attributes: Record<string, string | null>) => {
          const align = attributes['data-align'] || 'center';
          return {
            'data-align': align,
            class: `image-align-${align}`,
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

  renderHTML({ HTMLAttributes }) {
    return ['img', mergeAttributes(this.options.HTMLAttributes as Record<string, unknown>, HTMLAttributes)];
  },

  addNodeView() {
    return ({ node, getPos, editor }) => {
      const attrs = node.attrs as ImageNodeAttributes;
      const container = document.createElement('div');
      const align = attrs['data-align'] || 'center';
      container.className = `editor-image-container image-align-${align}`;

      const wrapper = document.createElement('div');
      wrapper.className = 'editor-image-wrapper';
      const w = attrs['data-width'];
      if (w) {
        wrapper.style.width = w.endsWith('%') || w.endsWith('px') ? w : `${w}px`;
      }

      const img = document.createElement('img');
      img.src = attrs.src || '';
      img.alt = attrs.alt || '';
      img.dataset.image = attrs['data-image'] || '';
      if (w) img.dataset.width = w;
      if (align) img.dataset.align = align;

      wrapper.appendChild(img);

      if (editor.isEditable) {
        // Controls toolbar
        const controls = document.createElement('div');
        controls.className = 'image-controls-bar';

        const createBtn = (label: string, title: string, onClick: (e: MouseEvent) => void, isActive = false) => {
          const btn = document.createElement('button');
          btn.type = 'button';
          btn.className = `image-control-btn${isActive ? ' active' : ''}`;
          btn.title = title;
          btn.textContent = label;
          btn.onclick = onClick;
          return btn;
        };

        const setAlign = (newAlign: 'left' | 'center' | 'right', e: MouseEvent) => {
          e.preventDefault();
          e.stopPropagation();
          if (typeof getPos === 'function') {
            editor.commands.command(({ tr }) => {
              tr.setNodeAttribute(getPos(), 'data-align', newAlign);
              return true;
            });
          }
        };

        const setWidth = (newWidth: string, e: MouseEvent) => {
          e.preventDefault();
          e.stopPropagation();
          if (typeof getPos === 'function') {
            editor.commands.command(({ tr }) => {
              tr.setNodeAttribute(getPos(), 'data-width', newWidth);
              return true;
            });
          }
        };

        controls.appendChild(createBtn('◀', 'Align left', e => setAlign('left', e), align === 'left'));
        controls.appendChild(createBtn('●', 'Align center', e => setAlign('center', e), align === 'center'));
        controls.appendChild(createBtn('▶', 'Align right', e => setAlign('right', e), align === 'right'));
        controls.appendChild(createBtn('50%', 'Half width', e => setWidth('50%', e)));
        controls.appendChild(createBtn('100%', 'Full width', e => setWidth('100%', e)));

        const deleteBtn = createBtn('✕', 'Remove image', e => {
          e.preventDefault();
          e.stopPropagation();
          if (typeof getPos === 'function') {
            editor.commands.command(({ tr }) => {
              tr.delete(getPos(), getPos() + 1);
              return true;
            });
          }
        });
        deleteBtn.classList.add('delete');
        controls.appendChild(deleteBtn);

        wrapper.appendChild(controls);

        // Resize handle
        const handle = document.createElement('div');
        handle.className = 'image-resize-handle';
        handle.title = 'Drag to resize';

        let startX = 0;
        let startWidth = 0;

        const onMouseMove = (ev: MouseEvent) => {
          const deltaX = ev.clientX - startX;
          const containerWidth = container.clientWidth || 800;
          const newWidth = Math.max(100, Math.min(containerWidth, startWidth + deltaX));
          wrapper.style.width = `${newWidth}px`;
        };

        const onMouseUp = () => {
          document.removeEventListener('mousemove', onMouseMove);
          document.removeEventListener('mouseup', onMouseUp);
          if (typeof getPos === 'function') {
            const finalWidth = `${Math.round(wrapper.getBoundingClientRect().width)}px`;
            editor.commands.command(({ tr }) => {
              tr.setNodeAttribute(getPos(), 'data-width', finalWidth);
              return true;
            });
          }
        };

        handle.onmousedown = (ev: MouseEvent) => {
          ev.preventDefault();
          ev.stopPropagation();
          startX = ev.clientX;
          startWidth = wrapper.getBoundingClientRect().width;
          document.addEventListener('mousemove', onMouseMove);
          document.addEventListener('mouseup', onMouseUp);
        };

        wrapper.appendChild(handle);
      }

      container.appendChild(wrapper);

      return {
        dom: container,
        update: updatedNode => {
          if (updatedNode.type.name !== 'imageNode') return false;
          const updatedAttrs = updatedNode.attrs as ImageNodeAttributes;
          const newAlign = updatedAttrs['data-align'] || 'center';
          container.className = `editor-image-container image-align-${newAlign}`;
          const newW = updatedAttrs['data-width'];
          if (newW) {
            wrapper.style.width = newW.endsWith('%') || newW.endsWith('px') ? newW : `${newW}px`;
            img.dataset.width = newW;
          } else {
            wrapper.style.width = '';
            delete img.dataset.width;
          }
          img.dataset.align = newAlign;
          return true;
        },
      };
    };
  },
});

