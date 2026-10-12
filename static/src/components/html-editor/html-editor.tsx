import { Component, Element, Event, EventEmitter, h, Host, Method, Prop, State, Watch } from '@stencil/core';
import { ChainedCommands, Editor } from '@tiptap/core';
import { Selection } from '@tiptap/extensions';
import InvisibleCharacters, { HardBreakNode, ParagraphNode } from '@tiptap/extension-invisible-characters';
import StarterKit from '@tiptap/starter-kit';
import { isNullOrEmpty } from '../../helpers/utils';
import { GompImage } from './extensions';
import { isPlatform } from '@ionic/core';

type Panel = 'imagePicker' | 'linkPanel' | 'helpPanel';

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

  @State() activePanel: Panel | null = null;
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
    const ios = isPlatform('ios');
    const modKey = ios ? '⌘' : 'Ctrl';
    return (
      <Host
        tabindex={this.el.getAttribute('tabindex') ?? '-1'}
        onFocus={(e: FocusEvent) => this.handleFocus(e)}
        onFocusout={(e: FocusEvent) => this.handleBlur(e)}
        onKeyDown={(e: KeyboardEvent) => {
          if (e.key === 'Escape') {
            e.preventDefault();
            this.activePanel = null;
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
                onClick={() => this.togglePanel('linkPanel')}
                size="default"
                fill={this.activePanel === 'linkPanel' || this.isLinkActive ? 'solid' : 'clear'}
                tabindex="-1"
                title="Hyperlink"
              >
                <ion-icon icon="link" />
              </ion-button>

              {(this.images?.length ?? 0) > 0 && (
                <ion-button
                  onClick={() => this.togglePanel('imagePicker')}
                  size="default"
                  fill={this.activePanel === 'imagePicker' ? 'solid' : 'clear'}
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
                onClick={() => this.togglePanel('helpPanel')}
                size="default"
                fill={this.activePanel === 'helpPanel' ? 'solid' : 'clear'}
                tabindex="-1"
                title="Keyboard shortcuts"
              >
                <ion-icon icon="help-circle-outline" />
              </ion-button>
            </ion-buttons>
          </ion-toolbar>

          {this.activePanel === 'linkPanel' && (
            <ion-item class="fill link-panel" lines="full">
              <ion-input
                type="url"
                class="link-input"
                placeholder="https://example.com"
                value={this.linkUrl}
                onIonInput={e => (this.linkUrl = e.detail.value ?? '')}
                onKeyDown={(e: KeyboardEvent) => {
                  if (e.key === 'Enter') {
                    e.preventDefault();
                    this.applyLink();
                  }
                }}
              />
              <ion-button slot="end" size="small" fill="solid" onClick={() => this.applyLink()}>
                Apply
              </ion-button>
              {this.isLinkActive && (
                <ion-button slot="end" size="small" fill="outline" color="danger" onClick={() => this.removeLink()}>
                  Remove
                </ion-button>
              )}
            </ion-item>
          )}

          {this.activePanel === 'imagePicker' && (
            <ion-card class="image-picker-panel">
              <ion-card-content class="image-picker-grid">
                {this.images?.map(image => (
                  <ion-button
                    slot="start"
                    key={image.name}
                    fill="clear"
                    class="image-picker-item"
                    onClick={() => this.insertImage(image)}
                  >
                    <img slot="icon-only" src={image.thumbUrl} alt={image.name} />
                  </ion-button>
                ))}
              </ion-card-content>
            </ion-card>
          )}

          {this.activePanel === 'helpPanel' && (
            <ion-card class="help-panel">
              <ion-card-content class="shortcuts-grid">
                <div class="shortcut-row">
                  <span class="shortcut-desc">Bold</span>
                  <span class="shortcut-keys"><kbd>{modKey}</kbd>+<kbd>B</kbd></span>
                </div>
                <div class="shortcut-row">
                  <span class="shortcut-desc">Italic</span>
                  <span class="shortcut-keys"><kbd>{modKey}</kbd>+<kbd>I</kbd></span>
                </div>
                <div class="shortcut-row">
                  <span class="shortcut-desc">Underline</span>
                  <span class="shortcut-keys"><kbd>{modKey}</kbd>+<kbd>U</kbd></span>
                </div>
                <div class="shortcut-row">
                  <span class="shortcut-desc">Numbered</span>
                  <span class="shortcut-keys"><kbd>{modKey}</kbd>+<kbd>Shift</kbd>+<kbd>7</kbd></span>
                </div>
                <div class="shortcut-row">
                  <span class="shortcut-desc">Bullets</span>
                  <span class="shortcut-keys"><kbd>{modKey}</kbd>+<kbd>Shift</kbd>+<kbd>8</kbd></span>
                </div>
                <div class="shortcut-row">
                  <span class="shortcut-desc">Line Break (⏎)</span>
                  <span class="shortcut-keys"><kbd>Shift</kbd>+<kbd>Enter</kbd></span>
                </div>
                <div class="shortcut-row">
                  <span class="shortcut-desc">New Paragraph (¶)</span>
                  <span class="shortcut-keys"><kbd>Enter</kbd></span>
                </div>
                <div class="shortcut-row">
                  <span class="shortcut-desc">New Numbered</span>
                  <span class="shortcut-keys"><kbd>1.</kbd> <kbd>Space</kbd></span>
                </div>
                <div class="shortcut-row">
                  <span class="shortcut-desc">New Bullets</span>
                  <span class="shortcut-keys"><kbd>*</kbd> <kbd>Space</kbd></span>
                </div>
                <div class="shortcut-row">
                  <span class="shortcut-desc">Undo / Redo</span>
                  <span class="shortcut-keys"><kbd>{modKey}</kbd>+<kbd>Z</kbd>/<kbd>Y</kbd></span>
                </div>
              </ion-card-content>
            </ion-card>
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
      Selection,
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
        this.closePanel('helpPanel');
        this.updateButtonStates();
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

    this.activePanel = null;
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

  private applyLink() {
    if (isNullOrEmpty(this.linkUrl)) {
      this.removeLink();
      return;
    }

    if (!this.linkUrl.startsWith('http://') && !this.linkUrl.startsWith('https://')) {
      this.linkUrl = 'https://' + this.linkUrl;
    }

    this.editorCommand((chain) => chain.extendMarkRange('link').setLink({ href: this.linkUrl }));
    this.closePanel('linkPanel');
    this.updateButtonStates();
  }

  private removeLink() {
    this.editorCommand((chain) => chain.extendMarkRange('link').unsetLink());
    this.closePanel('linkPanel');
    this.updateButtonStates();
  }

  private insertImage(image: { name: string; url: string; thumbUrl: string }) {
    this.editorCommand((chain) => chain.insertContent({
      type: GompImage.name,
      attrs: {
        src: image.url,
        alt: image.name,
        'data-image': image.name,
      },
    }));

    this.closePanel('imagePicker');
    this.updateButtonStates();
  }
}
