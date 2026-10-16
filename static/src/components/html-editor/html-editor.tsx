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
    interface ToolbarButton {
      name: string;
      title: string;
      content: unknown;
      click: () => void;
      active: boolean;
    }

    const primaryButtons: ToolbarButton[] = [
      {
        name: 'bold',
        content: <strong>B</strong>,
        title: 'Bold',
        click: () => this.editorCommand((chain) => chain.toggleBold()),
        active: this.isBoldActive,
      },
      {
        name: 'italic',
        content: <em>I</em>,
        title: 'Italic',
        click: () => this.editorCommand((chain) => chain.toggleItalic()),
        active: this.isItalicActive,
      },
      {
        name: 'underline',
        content: <u>U</u>,
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
        content: <ion-icon icon="list" />,
        title: 'Bullet list',
        click: () => this.editorCommand((chain) => chain.toggleBulletList()),
        active: this.isUnorderedListActive,
      },
      {
        name: 'link',
        content: <ion-icon icon="link" />,
        title: 'Hyperlink',
        click: () => this.togglePanel('linkPanel'),
        active: this.activePanel === 'linkPanel' || this.isLinkActive,
      },
    ];
    if ((this.images?.length ?? 0) > 0) {
      primaryButtons.push({
        name: 'image',
        title: 'Insert image',
        content: <ion-icon icon="image" />,
        click: () => this.togglePanel('imagePicker'),
        active: this.activePanel === 'imagePicker',
      });
    }

    const secondaryButtons: ToolbarButton[] = [
      {
        name: 'invisible-characters',
        content: <ion-icon icon="document-text-outline" />,
        title: 'Invisible characters',
        click: () => this.editorCommand((chain) => chain.toggleInvisibleCharacters()),
        active: this.isInvisibleCharactersActive,
      },
      {
        name: 'help',
        content: <ion-icon icon="help-circle-outline" />,
        title: 'Keyboard shortcuts',
        click: () => this.togglePanel('helpPanel'),
        active: this.activePanel === 'helpPanel',
      },
    ];

    const modKey = isPlatform('ios') ? 'Cmd ⌘' : 'Ctrl';
    const shortcutKeys = [
      { desc: 'Bold', keys: [<kbd>{modKey}</kbd>, '+', <kbd>B</kbd>] },
      { desc: 'Italic', keys: [<kbd>{modKey}</kbd>, '+', <kbd>I</kbd>] },
      { desc: 'Underline', keys: [<kbd>{modKey}</kbd>, '+', <kbd>U</kbd>] },
      { desc: 'Ordered List', keys: [<kbd>{modKey}</kbd>, '+', <kbd>Shift</kbd>, '+', <kbd>7</kbd>] },
      { desc: 'Bullet List', keys: [<kbd>{modKey}</kbd>, '+', <kbd>Shift</kbd>, '+', <kbd>8</kbd>] },
      { desc: 'Hyperlink', keys: [<kbd>{modKey}</kbd>, '+', <kbd>K</kbd>] },
      { desc: 'Line Break (⏎)', keys: [<kbd>Shift</kbd>, '+', <kbd>Enter</kbd>] },
      { desc: 'New Paragraph (¶)', keys: [<kbd>Enter</kbd>] },
      { desc: 'New Numbered', keys: [<kbd>1.</kbd>, ' ', <kbd>Space</kbd>] },
      { desc: 'New Bullets', keys: [<kbd>*</kbd>, ' ', <kbd>Space</kbd>] },
      { desc: 'Undo / Redo', keys: [<kbd>{modKey}</kbd>, '+', <kbd>Z</kbd>, '/', <kbd>Y</kbd>] },
    ];
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
              {primaryButtons.map(btn =>
                <ion-button key={btn.name} onClick={btn.click} fill={btn.active ? 'solid' : 'clear'} title={btn.title} tabindex="-1">
                  {btn.content}
                </ion-button>
              )}
            </ion-buttons>

            <ion-buttons slot="end" class="prevent-selection">
              {secondaryButtons.map(btn =>
                <ion-button key={btn.name} onClick={btn.click} fill={btn.active ? 'solid' : 'clear'} title={btn.title} tabindex="-1">
                  {btn.content}
                </ion-button>
              )}
            </ion-buttons>
          </ion-toolbar>

          {this.activePanel === 'linkPanel' && (
            <ion-item class="fill toolbar-panel link-panel" lines="none">
              <ion-input
                type="url"
                class="link-input"
                placeholder="https://example.com"
                value={this.linkUrl}
                onIonInput={e => (this.linkUrl = e.detail.value ?? '')}
                onKeyDown={(e: KeyboardEvent) => {
                  if (e.key === 'Enter') {
                    e.preventDefault();
                    this.applyLink(this.linkUrl);
                  }
                }}
              />
              <ion-button slot="end" size="small" fill="solid" onClick={() => this.applyLink(this.linkUrl)}>
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
            <ion-grid class="toolbar-panel image-picker-panel">
              <ion-row>
                {this.images?.map(image => (
                  <ion-col key={image.name} size="3" size-sm="2" size-md="1">
                    <ion-button fill="clear" onClick={() => this.insertImage(image)}>
                      <img slot="icon-only" src={image.thumbUrl} alt={image.name} />
                    </ion-button>
                  </ion-col>
                ))}
              </ion-row>
            </ion-grid>
          )}

          {this.activePanel === 'helpPanel' && (
            <ion-grid class="toolbar-panel help-panel">
              <ion-row>
                {shortcutKeys.map(shortcut => [
                  <ion-col key={`${shortcut.desc}-desc`} class="shortcut-desc" size="6" size-md="3" size-xl="2">
                    {shortcut.desc}
                  </ion-col>,
                  <ion-col key={`${shortcut.desc}-keys`} class="shortcut-keys" size="6" size-md="3" size-xl="2">
                    {shortcut.keys}
                  </ion-col>,
                ])}
              </ion-row>
            </ion-grid>
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
    this.editorCommand((chain) => chain.insertContent({
      type: GompImage.name,
      attrs: {
        src: image.url,
        alt: image.name,
        'data-image': image.name,
      },
    }));

    this.closePanel('imagePicker');
  }
}
