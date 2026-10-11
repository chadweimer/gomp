import { Component, Element, Event, EventEmitter, h, Host, Method, Prop, State, Watch } from '@stencil/core';
import { ChainedCommands, Editor } from '@tiptap/core';
import InvisibleCharacters, { HardBreakNode, ParagraphNode } from '@tiptap/extension-invisible-characters';
import StarterKit from '@tiptap/starter-kit';
import { isNullOrEmpty } from '../../helpers/utils';
import { GompImage } from './extensions';

@Component({
  tag: 'html-editor',
  styleUrl: 'html-editor.css',
  shadow: true,
})
export class HTMLEditor {
  @Element() el!: HTMLHtmlEditorElement;

  @Prop() value = '';
  @Prop() images?: { name: string; url: string; thumbUrl: string }[];

  @Event() valueChanged!: EventEmitter<string>;

  @State() isBoldActive = false;
  @State() isItalicActive = false;
  @State() isUnderlineActive = false;
  @State() isOrderedListActive = false;
  @State() isUnorderedListActive = false;
  @State() isLinkActive = false;
  @State() isInvisibleCharactersActive = false;

  @State() isImagePickerOpen = false;
  @State() isLinkPanelOpen = false;
  @State() isHelpPanelOpen = false;
  @State() linkUrl = '';

  private editorContentRef!: HTMLElement;
  private editor: Editor | null = null;

  @Watch('value')
  onValueChange(newValue: string) {
    if (this.editor && !this.editor.isDestroyed) {
      const currentHTML = this.getCleanHTML();
      if ((newValue ?? '') !== currentHTML) {
        this.editor.commands.setContent(newValue || '', { emitUpdate: false });
        this.updateButtonStates();
      }
    }
  }

  componentDidLoad() {
    this.initEditor();
  }

  disconnectedCallback() {
    this.editor?.destroy();
    this.editor = null;
  }

  render() {
    return (
      <Host
        tabindex={this.el.getAttribute('tabindex') ?? '-1'}
        onFocus={(e: FocusEvent) => this.handleFocus(e)}
        onFocusout={(e: FocusEvent) => this.handleBlur(e)}
        onKeyDown={(e: KeyboardEvent) => {
          if (e.key === 'Escape' && this.isHelpPanelOpen) {
            e.preventDefault();
            this.isHelpPanelOpen = false;
          }
        }}
      >
        <div class="toolbar-container">
          <ion-toolbar class="editor-toolbar">
            <ion-buttons slot="start" class="prevent-selection">
              <ion-button
                onClick={() => this.editorCommand((chain) => chain.toggleBold())}
                size="default"
                fill={this.isBoldActive ? 'solid' : 'clear'}
                tabindex="-1"
                title="Bold"
              >
                <strong>B</strong>
              </ion-button>
              <ion-button
                onClick={() => this.editorCommand((chain) => chain.toggleItalic())}
                size="default"
                fill={this.isItalicActive ? 'solid' : 'clear'}
                tabindex="-1"
                title="Italic"
              >
                <em>I</em>
              </ion-button>
              <ion-button
                onClick={() => this.editorCommand((chain) => chain.toggleUnderline())}
                size="default"
                fill={this.isUnderlineActive ? 'solid' : 'clear'}
                tabindex="-1"
                title="Underline"
              >
                <u>U</u>
              </ion-button>
              <ion-button
                onClick={() => this.editorCommand((chain) => chain.toggleOrderedList())}
                size="default"
                fill={this.isOrderedListActive ? 'solid' : 'clear'}
                tabindex="-1"
                title="Numbered list"
              >
                #
              </ion-button>
              <ion-button
                onClick={() => this.editorCommand((chain) => chain.toggleBulletList())}
                size="default"
                fill={this.isUnorderedListActive ? 'solid' : 'clear'}
                tabindex="-1"
                title="Bullet list"
              >
                <ion-icon icon="list" />
              </ion-button>
              <ion-button
                onClick={() => this.toggleLinkPanel()}
                size="default"
                fill={this.isLinkPanelOpen || this.isLinkActive ? 'solid' : 'clear'}
                tabindex="-1"
                title="Hyperlink"
              >
                <ion-icon icon="link" />
              </ion-button>

              {(this.images?.length ?? 0) > 0 && (
                <ion-button
                  onClick={() => this.toggleImagePicker()}
                  size="default"
                  fill={this.isImagePickerOpen ? 'solid' : 'clear'}
                  tabindex="-1"
                  title="Insert image"
                >
                  <ion-icon icon="image" />
                </ion-button>
              )}
            </ion-buttons>

            <ion-buttons slot="end" class="prevent-selection">
              <ion-button
                onClick={() => this.editorCommand((chain) => chain.toggleInvisibleCharacters())}
                size="default"
                fill={this.isInvisibleCharactersActive ? 'solid' : 'clear'}
                tabindex="-1"
                title="Invisible characters"
              >
                <ion-icon icon="document-text-outline" />
              </ion-button>
              <ion-button
                onClick={() => this.toggleHelpPanel()}
                size="default"
                fill={this.isHelpPanelOpen ? 'solid' : 'clear'}
                tabindex="-1"
                title="Keyboard shortcuts"
              >
                <ion-icon icon="help-circle-outline" />
              </ion-button>
            </ion-buttons>
          </ion-toolbar>
          {this.isLinkPanelOpen && (
            <div class="editor-panel link-panel">
              <input
                type="url"
                class="link-input"
                placeholder="https://example.com"
                value={this.linkUrl}
                onInput={e => (this.linkUrl = (e.target as HTMLInputElement).value)}
                onKeyDown={(e: KeyboardEvent) => {
                  if (e.key === 'Enter') {
                    e.preventDefault();
                    this.applyLink();
                  }
                }}
              />
              <ion-button size="small" fill="solid" onClick={() => this.applyLink()}>
                Apply
              </ion-button>
              {this.isLinkActive && (
                <ion-button size="small" fill="outline" color="danger" onClick={() => this.removeLink()}>
                  Remove
                </ion-button>
              )}
            </div>
          )}

          {this.isImagePickerOpen && (
            <div class="editor-panel image-picker-panel">
              {this.images?.map(image => (
                <ion-button
                  key={image.name}
                  fill="clear"
                  class="image-picker-item"
                  onClick={() => this.insertImage(image)}
                >
                  <img slot="icon-only" src={image.thumbUrl} alt={image.name} />
                </ion-button>
              ))}
            </div>
          )}

          {this.isHelpPanelOpen && (
            <div class="editor-panel help-panel">
              <div class="shortcuts-grid">
                <div class="shortcut-row">
                  <span class="shortcut-desc">Bold</span>
                  <span class="shortcut-keys"><kbd>Ctrl</kbd>+<kbd>B</kbd></span>
                </div>
                <div class="shortcut-row">
                  <span class="shortcut-desc">Italic</span>
                  <span class="shortcut-keys"><kbd>Ctrl</kbd>+<kbd>I</kbd></span>
                </div>
                <div class="shortcut-row">
                  <span class="shortcut-desc">Underline</span>
                  <span class="shortcut-keys"><kbd>Ctrl</kbd>+<kbd>U</kbd></span>
                </div>
                <div class="shortcut-row">
                  <span class="shortcut-desc">Line break (⏎)</span>
                  <span class="shortcut-keys"><kbd>Shift</kbd>+<kbd>Enter</kbd></span>
                </div>
                <div class="shortcut-row">
                  <span class="shortcut-desc">New paragraph (¶)</span>
                  <span class="shortcut-keys"><kbd>Enter</kbd></span>
                </div>
                <div class="shortcut-row">
                  <span class="shortcut-desc">Bullet list</span>
                  <span class="shortcut-keys"><kbd>*</kbd> <kbd>Space</kbd></span>
                </div>
                <div class="shortcut-row">
                  <span class="shortcut-desc">Numbered list</span>
                  <span class="shortcut-keys"><kbd>1.</kbd> <kbd>Space</kbd></span>
                </div>
                <div class="shortcut-row">
                  <span class="shortcut-desc">Undo / Redo</span>
                  <span class="shortcut-keys"><kbd>Ctrl</kbd>+<kbd>Z</kbd> / <kbd>Ctrl</kbd>+<kbd>Y</kbd></span>
                </div>
              </div>
            </div>
          )}
        </div>

        <div ref={el => (this.editorContentRef = el!)} class="editor-content" />
      </Host >
    );
  }

  @Method()
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
          alwaysPreserveAspectRatio: true
        }
      }),
      InvisibleCharacters.configure({
        builders: [new HardBreakNode(), new ParagraphNode()],
        visible: false,
      }),
    ];

    this.editor = new Editor({
      element: this.editorContentRef,
      extensions,
      content: this.value || '',
      onTransaction: () => {
        this.updateButtonStates();
        this.valueChanged.emit(this.getCleanHTML());
      },
      onSelectionUpdate: () => {
        this.updateButtonStates();
        this.isHelpPanelOpen = false;
      },
    });

    this.updateButtonStates();
  }

  private handleFocus(e: FocusEvent) {
    if (e.target === this.el) {
      this.editor?.commands.focus();
    }
  }

  private handleBlur(e: FocusEvent) {
    if (this.el.contains(e.relatedTarget as Node)) {
      return;
    }

    this.isImagePickerOpen = false;
    this.isLinkPanelOpen = false;
    this.isHelpPanelOpen = false;

    this.valueChanged.emit(this.getCleanHTML());
  }

  private getCleanHTML(): string {
    if (!this.editor || this.editor.isDestroyed) {
      return this.value ?? '';
    }
    const html = this.editor.getHTML();
    return html === '<p></p>' ? '' : html;
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
    this.isInvisibleCharactersActive = this.editor.storage.invisibleCharacters.visibility();

    if (this.isLinkActive) {
      const linkAttrs = this.editor.getAttributes('link') as { href?: string };
      this.linkUrl = linkAttrs.href || '';
    }
  }

  private editorCommand(fn: (chain: ChainedCommands) => ChainedCommands) {
    if (!this.editor) {
      return;
    }
    fn(this.editor.chain().focus()).run();
  }

  private toggleLinkPanel() {
    this.isLinkPanelOpen = !this.isLinkPanelOpen;
    this.isImagePickerOpen = false;
    this.isHelpPanelOpen = false;

    if (this.isLinkPanelOpen && this.isLinkActive) {
      const linkAttrs = this.editor?.getAttributes('link') as { href?: string } | undefined;
      this.linkUrl = linkAttrs?.href || '';
    }
  }

  private toggleImagePicker() {
    this.isImagePickerOpen = !this.isImagePickerOpen;
    this.isLinkPanelOpen = false;
    this.isHelpPanelOpen = false;
  }

  private toggleHelpPanel() {
    this.isHelpPanelOpen = !this.isHelpPanelOpen;
    this.isLinkPanelOpen = false;
    this.isImagePickerOpen = false;
  }

  private applyLink() {
    if (isNullOrEmpty(this.linkUrl)) {
      this.removeLink();
      return;
    }

    this.editorCommand((chain) => chain.extendMarkRange('link').setLink({ href: this.linkUrl }));
    this.isLinkPanelOpen = false;
    this.updateButtonStates();
  }

  private removeLink() {
    this.editorCommand((chain) => chain.extendMarkRange('link').unsetLink());
    this.linkUrl = '';
    this.isLinkPanelOpen = false;
    this.updateButtonStates();
  }

  private insertImage(image: { name: string; url: string; thumbUrl: string }) {
    this.isImagePickerOpen = false;

    if (this.editor && !this.editor.isDestroyed) {
      this.editorCommand((chain) => chain.insertContent({
        type: GompImage.name,
        attrs: {
          src: image.url,
          alt: image.name,
          'data-image': image.name,
        },
      }));

      this.updateButtonStates();
      this.valueChanged.emit(this.getCleanHTML());
    }
  }
}
