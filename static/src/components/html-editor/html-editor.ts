import { InputCustomEvent, isPlatform } from '@ionic/core';
import { ChainedCommands, Editor } from '@tiptap/core';
import { Selection } from '@tiptap/extensions';
import InvisibleCharacters, { HardBreakNode, ParagraphNode } from '@tiptap/extension-invisible-characters';
import StarterKit from '@tiptap/starter-kit';
import { LitElement, html, css, PropertyValues, nothing } from 'lit';
import { customElement, property, state, query } from 'lit/decorators.js';
import { emit, isNullOrEmpty } from '../../helpers/utils';
import { globalStyles } from '../../global/shared-styles';
import { GompImage } from './extensions';

type Panel = 'imagePicker' | 'linkPanel' | 'helpPanel';

interface ToolbarButton {
  name: string;
  title: string;
  content: unknown;
  click: () => void;
  active: boolean;
}

interface ShortcutKey {
  desc: string;
  keys: unknown;
}

@customElement('html-editor')
export class HTMLEditor extends LitElement {
  static readonly styles = [
    globalStyles,
    css`
      :host {
        display: block;
        width: 100%;
      }

      .editor-content {
        min-height: 2.5em;
        padding-bottom: var(--ion-padding, 0);
        outline: none;
      }

      .toolbar-container {
        position: sticky;
        top: 0;
        z-index: 10;
        margin: var(--ion-margin) 0;
        border: 1px solid var(--ion-color-light-tint);
        border-radius: 2px;
        background: var(--ion-background-color);
      }

      .editor-toolbar {
        --min-height: 0;
        --ion-toolbar-color: var(--ion-color-dark);
        --ion-toolbar-background: var(--ion-background-color);
        padding: 4px 0px;
      }

      .toolbar-panel {
        --ion-grid-padding: 2px;
        border-top: 1px solid var(--ion-color-light-tint);
      }

      .image-picker-panel {
        --ion-grid-column-padding: 2px;
      }

      .image-picker-panel img {
        object-fit: cover;
        border-radius: 4px;
      }

      .shortcut-desc,
      .shortcut-keys {
        font-size: 0.9em;
        display: inline-flex;
        align-items: center;
        color: var(--ion-text-color-step-100);
      }

      .shortcut-desc {
        justify-content: right;
      }

      .shortcut-keys {
        justify-content: left;
        white-space: nowrap;
        gap: 2px;
      }

      .shortcut-keys kbd {
        display: inline-block;
        padding: 4px;
        font-family: monospace;
        font-size: 0.9em;
        font-weight: 500;
        line-height: 1;
        background-color: var(--ion-background-color-step-50);
        border: 1px solid var(--ion-background-color-step-200);
        border-radius: 4px;
        box-shadow: 0 1px 1px rgba(0, 0, 0, 0.1);
      }

      .tiptap {
        outline: none;
        min-height: 2em;
      }

      .tiptap .selection {
        color: var(--ion-color-primary-contrast);
        background-color: var(--ion-color-primary-tint);
      }

      .tiptap img {
        max-width: 100%;
        height: auto;
      }

      .tiptap img:not([style*='height' i]) {
        max-height: 400px;
      }

      .tiptap [data-resize-container] {
        display: inline-flex;
        position: relative;
        margin: 0.5em 0;
        max-width: 100%;
      }

      .tiptap [data-resize-wrapper] {
        position: relative;
        display: inline-block;
        line-height: 0;
        max-width: 100%;
      }

      .tiptap [data-resize-container].ProseMirror-selectednode [data-resize-wrapper],
      .tiptap [data-resize-container][data-resize-state='true'] [data-resize-wrapper],
      .tiptap img.ProseMirror-selectednode,
      .tiptap .selection img {
        outline: 2px solid var(--ion-color-primary-tint);
        outline-offset: 2px;
        border-radius: 3px;
      }

      .tiptap [data-resize-handle] {
        position: absolute;
        z-index: 20;
        box-sizing: border-box;
        background-color: var(--ion-color-primary-tint);
        border: 1.5px solid #ffffff;
        border-radius: 3px;
        box-shadow: 0 1px 4px rgba(0, 0, 0, 0.35);
        touch-action: none;
        user-select: none;
        opacity: 0;
        transition: opacity 0.15s ease-in-out, background-color 0.15s ease-in-out;
      }

      .tiptap [data-resize-handle]::after {
        content: '';
        position: absolute;
        top: 50%;
        left: 50%;
        width: 24px;
        height: 24px;
        transform: translate(-50%, -50%);
        pointer-events: auto;
      }

      .tiptap [data-resize-container]:hover [data-resize-handle],
      .tiptap [data-resize-container].ProseMirror-selectednode [data-resize-handle],
      .tiptap [data-resize-container][data-resize-state='true'] [data-resize-handle] {
        opacity: 1;
      }

      .tiptap [data-resize-handle]:hover {
        background-color: var(--ion-color-primary-tint);
      }

      .tiptap [data-resize-handle][data-resize-handle='top-left'],
      .tiptap [data-resize-handle][data-resize-handle='top-right'],
      .tiptap [data-resize-handle][data-resize-handle='bottom-left'],
      .tiptap [data-resize-handle][data-resize-handle='bottom-right'] {
        width: 10px;
        height: 10px;
      }

      .tiptap [data-resize-handle][data-resize-handle='top-left'] {
        cursor: nwse-resize;
        top: -5px;
        left: -5px;
      }

      .tiptap [data-resize-handle][data-resize-handle='top-right'] {
        cursor: nesw-resize;
        top: -5px;
        right: -5px;
      }

      .tiptap [data-resize-handle][data-resize-handle='bottom-left'] {
        cursor: nesw-resize;
        bottom: -5px;
        left: -5px;
      }

      .tiptap [data-resize-handle][data-resize-handle='bottom-right'] {
        cursor: nwse-resize;
        bottom: -5px;
        right: -5px;
      }

      .tiptap [data-resize-handle][data-resize-handle='top'],
      .tiptap [data-resize-handle][data-resize-handle='bottom'] {
        cursor: ns-resize;
        height: 6px;
        left: 8px;
        right: 8px;
      }

      .tiptap [data-resize-handle][data-resize-handle='top'] {
        top: -3px;
      }

      .tiptap [data-resize-handle][data-resize-handle='bottom'] {
        bottom: -3px;
      }

      .tiptap [data-resize-handle][data-resize-handle='left'],
      .tiptap [data-resize-handle][data-resize-handle='right'] {
        cursor: ew-resize;
        width: 6px;
        top: 8px;
        bottom: 8px;
      }

      .tiptap [data-resize-handle][data-resize-handle='left'] {
        left: -3px;
      }

      .tiptap [data-resize-handle][data-resize-handle='right'] {
        right: -3px;
      }

      .tiptap-invisible-character {
        color: var(--ion-color-medium);
      }

      .tiptap-invisible-character--break::before {
        content: '⏎';
      }

      .tiptap-invisible-character--paragraph::before {
        content: '¶';
      }
    `
  ];

  @property({ type: String }) value = '';
  @property({ type: Array }) images?: { name: string; url: string; thumbUrl: string }[];

  @state() private isBoldActive = false;
  @state() private isItalicActive = false;
  @state() private isUnderlineActive = false;
  @state() private isOrderedListActive = false;
  @state() private isUnorderedListActive = false;
  @state() private isLinkActive = false;
  @state() private isInvisibleCharactersActive = false;

  @state() private activePanel: Panel | null = null;
  @state() private linkUrl = '';

  @query('.editor-content') private readonly editorContentRef?: HTMLElement;
  private editor: Editor | null = null;

  constructor() {
    super();
    if (!this.hasAttribute('tabindex')) {
      this.setAttribute('tabindex', '-1');
    }
    this.addEventListener('focus', (e: FocusEvent) => this.handleFocus(e));
    this.addEventListener('focusout', (e: FocusEvent) => this.handleBlur(e));
    this.addEventListener('keydown', (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        e.preventDefault();
        this.activePanel = null;
      }
    });
  }

  firstUpdated() {
    this.initEditor();
  }

  updated(changedProperties: PropertyValues<this>) {
    if (changedProperties.has('value')) {
      if (this.editor && !this.editor.isDestroyed) {
        const currentHTML = this.getCleanHTML();
        if ((this.value ?? '') !== currentHTML) {
          this.editor.commands.setContent(this.value || '', { emitUpdate: false });
          this.updateButtonStates();
        }
      }
    }
  }

  disconnectedCallback() {
    super.disconnectedCallback();
    this.editor?.destroy();
    this.editor = null;
  }

  getValue(): Promise<string> {
    return Promise.resolve(this.getCleanHTML());
  }

  private initEditor() {
    if (!this.editorContentRef || this.editor) {
      return;
    }

    const extensions = [
      StarterKit.configure({
        code: false,
        codeBlock: false,
        heading: false,
        link: {
          openOnClick: false,
          HTMLAttributes: {
            target: '_blank',
            rel: 'noopener noreferrer',
          },
        },
        trailingNode: false,
      }),
      GompImage.configure({
        inline: true,
        resize: {
          enabled: true,
          minWidth: 50,
          minHeight: 50,
          alwaysPreserveAspectRatio: true,
        },
      }),
      InvisibleCharacters.configure({
        builders: [new HardBreakNode(), new ParagraphNode()],
        visible: false,
      }),
      Selection,
    ];

    this.editor = new Editor({
      element: this.editorContentRef,
      extensions,
      content: this.value || '',
      onTransaction: () => {
        this.updateButtonStates();
      },
      onSelectionUpdate: () => {
        this.closePanel('helpPanel');
        this.updateButtonStates();
      },
    });

    this.updateButtonStates();
  }

  private handleFocus(e: FocusEvent) {
    if (e.target === this) {
      const tiptapEl = this.renderRoot.querySelector('.tiptap') as HTMLElement | null;
      tiptapEl?.focus();
      this.editor?.commands.focus();
    }
  }

  private handleBlur(e: FocusEvent) {
    if (this.contains(e.relatedTarget as Node) || this.renderRoot.contains(e.relatedTarget as Node)) {
      return;
    }

    this.activePanel = null;
    emit(this, 'valueChanged', this.getCleanHTML());
  }

  private getCleanHTML(): string {
    if (!this.editor || this.editor.isDestroyed) {
      return this.value ?? '';
    }
    const htmlContent = this.editor.getHTML();
    return htmlContent === '<p></p>' ? '' : htmlContent;
  }

  private updateButtonStates() {
    if (!this.editor || this.editor.isDestroyed) {
      return;
    }

    this.isBoldActive = this.editor.isActive('bold');
    this.isItalicActive = this.editor.isActive('italic');
    this.isUnderlineActive = this.editor.isActive('underline');
    this.isOrderedListActive = this.editor.isActive('orderedList');
    this.isUnorderedListActive = this.editor.isActive('bulletList');
    this.isLinkActive = this.editor.isActive('link');
    this.isInvisibleCharactersActive = this.editor.storage.invisibleCharacters?.visibility?.() ?? false;

    if (this.isLinkActive) {
      const linkAttrs = this.editor.getAttributes('link') as { href?: string };
      this.linkUrl = linkAttrs.href || '';
    } else {
      this.linkUrl = '';
    }
  }

  private editorCommand(fn: (chain: ChainedCommands) => ChainedCommands) {
    if (!this.editor || this.editor.isDestroyed) {
      return;
    }
    fn(this.editor.chain().focus()).run();
  }

  private togglePanel(panel: Panel) {
    this.activePanel = this.activePanel === panel ? null : panel;
  }

  private closePanel(panel: Panel) {
    this.activePanel = this.activePanel === panel ? null : this.activePanel;
  }

  private applyLink(linkUrl: string) {
    if (isNullOrEmpty(linkUrl)) {
      this.removeLink();
      return;
    }

    if (!linkUrl.startsWith('http://') && !linkUrl.startsWith('https://')) {
      linkUrl = 'https://' + linkUrl;
    }

    this.editorCommand((chain) => chain.extendMarkRange('link').setLink({ href: linkUrl }));
    this.closePanel('linkPanel');
  }

  private removeLink() {
    this.editorCommand((chain) => chain.extendMarkRange('link').unsetLink());
    this.closePanel('linkPanel');
  }

  private insertImage(image: { name: string; url: string; thumbUrl: string }) {
    this.editorCommand((chain) =>
      chain.insertContent({
        type: GompImage.name,
        attrs: {
          src: image.url,
          alt: image.name,
          'data-image': image.name,
        },
      })
    );

    this.closePanel('imagePicker');
  }

  render() {
    const primaryButtons: ToolbarButton[] = [
      {
        name: 'bold',
        content: html`<strong>B</strong>`,
        title: 'Bold',
        click: () => this.editorCommand((chain) => chain.toggleBold()),
        active: this.isBoldActive,
      },
      {
        name: 'italic',
        content: html`<em>I</em>`,
        title: 'Italic',
        click: () => this.editorCommand((chain) => chain.toggleItalic()),
        active: this.isItalicActive,
      },
      {
        name: 'underline',
        content: html`<u>U</u>`,
        title: 'Underline',
        click: () => this.editorCommand((chain) => chain.toggleUnderline()),
        active: this.isUnderlineActive,
      },
      {
        name: 'ordered-list',
        content: '#',
        title: 'Numbered list',
        click: () => this.editorCommand((chain) => chain.toggleOrderedList()),
        active: this.isOrderedListActive,
      },
      {
        name: 'unordered-list',
        content: html`<ion-icon icon="list"></ion-icon>`,
        title: 'Bullet list',
        click: () => this.editorCommand((chain) => chain.toggleBulletList()),
        active: this.isUnorderedListActive,
      },
      {
        name: 'link',
        content: html`<ion-icon icon="link"></ion-icon>`,
        title: 'Hyperlink',
        click: () => this.togglePanel('linkPanel'),
        active: this.activePanel === 'linkPanel' || this.isLinkActive,
      },
    ];

    if ((this.images?.length ?? 0) > 0) {
      primaryButtons.push({
        name: 'image',
        title: 'Insert image',
        content: html`<ion-icon icon="image"></ion-icon>`,
        click: () => this.togglePanel('imagePicker'),
        active: this.activePanel === 'imagePicker',
      });
    }

    const secondaryButtons: ToolbarButton[] = [
      {
        name: 'invisible-characters',
        content: html`<ion-icon icon="document-text-outline"></ion-icon>`,
        title: 'Invisible characters',
        click: () => this.editorCommand((chain) => chain.toggleInvisibleCharacters()),
        active: this.isInvisibleCharactersActive,
      },
      {
        name: 'help',
        content: html`<ion-icon icon="help-circle-outline"></ion-icon>`,
        title: 'Keyboard shortcuts',
        click: () => this.togglePanel('helpPanel'),
        active: this.activePanel === 'helpPanel',
      },
    ];

    const modKey = isPlatform('ios') ? 'Cmd ⌘' : 'Ctrl';
    const shortcutKeys: ShortcutKey[] = [
      { desc: 'Bold', keys: html`<kbd>${modKey}</kbd>+<kbd>B</kbd>` },
      { desc: 'Italic', keys: html`<kbd>${modKey}</kbd>+<kbd>I</kbd>` },
      { desc: 'Underline', keys: html`<kbd>${modKey}</kbd>+<kbd>U</kbd>` },
      { desc: 'Ordered List', keys: html`<kbd>${modKey}</kbd>+<kbd>Shift</kbd>+<kbd>7</kbd>` },
      { desc: 'Bullet List', keys: html`<kbd>${modKey}</kbd>+<kbd>Shift</kbd>+<kbd>8</kbd>` },
      { desc: 'Hyperlink', keys: html`<kbd>${modKey}</kbd>+<kbd>K</kbd>` },
      { desc: 'Line Break (⏎)', keys: html`<kbd>Shift</kbd>+<kbd>Enter</kbd>` },
      { desc: 'New Paragraph (¶)', keys: html`<kbd>Enter</kbd>` },
      { desc: 'New Numbered', keys: html`<kbd>1.</kbd><kbd>Space</kbd>` },
      { desc: 'New Bullets', keys: html`<kbd>*</kbd><kbd>Space</kbd>` },
      { desc: 'Undo / Redo', keys: html`<kbd>${modKey}</kbd>+<kbd>Z</kbd>/<kbd>Y</kbd>` },
    ];

    return html`
      <div class="toolbar-container">
        <ion-toolbar class="editor-toolbar">
          <ion-buttons slot="start" class="prevent-selection">
            ${primaryButtons.map(
      (btn) => html`
                <ion-button
                  @click=${btn.click}
                  fill=${btn.active ? 'solid' : 'clear'}
                  title=${btn.title}
                  tabindex="-1"
                >
                  ${btn.content}
                </ion-button>
              `
    )}
          </ion-buttons>

          <ion-buttons slot="end" class="prevent-selection">
            ${secondaryButtons.map(
      (btn) => html`
                <ion-button
                  @click=${btn.click}
                  fill=${btn.active ? 'solid' : 'clear'}
                  title=${btn.title}
                  tabindex="-1"
                >
                  ${btn.content}
                </ion-button>
              `
    )}
          </ion-buttons>
        </ion-toolbar>

        ${this.activePanel === 'linkPanel'
        ? html`
              <ion-item class="fill toolbar-panel link-panel" lines="none">
                <ion-input
                  type="url"
                  class="link-input"
                  placeholder="https://example.com"
                  .value=${this.linkUrl}
                  @ionInput=${(e: InputCustomEvent) => this.linkUrl = e.detail.value ?? ''}
                  @keydown=${(e: KeyboardEvent) => {
            if (e.key === 'Enter') {
              e.preventDefault();
              this.applyLink(this.linkUrl);
            }
          }}
                ></ion-input>
                <ion-button slot="end" size="small" fill="solid" @click=${() => this.applyLink(this.linkUrl)}>
                  Apply
                </ion-button>
                ${this.isLinkActive
            ? html`
                      <ion-button slot="end" size="small" fill="outline" color="danger" @click=${() => this.removeLink()}>
                        Remove
                      </ion-button>
                    `
            : nothing}
              </ion-item>
            `
        : nothing}
        ${this.activePanel === 'imagePicker'
        ? html`
              <ion-grid class="toolbar-panel image-picker-panel">
                <ion-row>
                  ${this.images?.map(
          (image) => html`
                      <ion-col size="3" size-sm="2" size-md="1">
                        <ion-button fill="clear" @click=${() => this.insertImage(image)}>
                          <img slot="icon-only" src=${image.thumbUrl} alt=${image.name} />
                        </ion-button>
                      </ion-col>
                    `
        )}
                </ion-row>
              </ion-grid>
            `
        : nothing}
        ${this.activePanel === 'helpPanel'
        ? html`
              <ion-grid class="toolbar-panel help-panel">
                <ion-row>
                  ${shortcutKeys.map(
          (shortcut) => html`
                      <ion-col class="shortcut-desc" size="6" size-md="3" size-xl="2">
                        ${shortcut.desc}
                      </ion-col>
                      <ion-col class="shortcut-keys" size="6" size-md="3" size-xl="2">
                        ${shortcut.keys}
                      </ion-col>
                    `
        )}
                </ion-row>
              </ion-grid>
            `
        : nothing}
      </div>

      <div class="editor-content"></div>
    `;
  }
}

declare global {
  interface HTMLElementTagNameMap {
    'html-editor': HTMLEditor;
  }
}
