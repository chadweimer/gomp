import { Component, Element, Event, EventEmitter, Fragment, h, Host, Method, Prop, State, Watch } from '@stencil/core';
import { Editor } from '@tiptap/core';
import StarterKit from '@tiptap/starter-kit';
import { isNullOrEmpty } from '../../helpers/utils';
import { GompImage } from './extensions';

@Component({
  tag: 'html-editor',
  styleUrl: 'html-editor.css',
  shadow: false,
})
export class HTMLEditor {
  @Element() el!: HTMLHtmlEditorElement;

  @Prop() value: string = '';
  @Prop() label?: string;
  @Prop() labelPlacement?: 'fixed' | 'floating' | 'stacked';
  @Prop() images?: { name: string; url: string; thumbUrl: string }[];

  @Prop() enableHeadings: boolean = true;
  @Prop() enableLinks: boolean = true;
  @Prop() enableLists: boolean = true;

  @Event() valueChanged!: EventEmitter<string>;

  @State() isBoldActive: boolean = false;
  @State() isItalicActive: boolean = false;
  @State() isUnderlineActive: boolean = false;
  @State() isHeading2Active: boolean = false;
  @State() isHeading3Active: boolean = false;
  @State() isOrderedListActive: boolean = false;
  @State() isUnorderedListActive: boolean = false;
  @State() isLinkActive: boolean = false;

  @State() isImagePickerOpen: boolean = false;
  @State() isLinkPanelOpen: boolean = false;
  @State() linkUrl: string = '';

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
      >
        {!isNullOrEmpty(this.label) && <ion-label position={this.labelPlacement}>{this.label}</ion-label>}
        <ion-toolbar class="editor-toolbar">
          <ion-buttons class="prevent-selection">
            <ion-button
              onClick={() => this.toggleBold()}
              size="default"
              fill={this.isBoldActive ? 'solid' : 'clear'}
              tabindex="-1"
              title="Bold"
            >
              <strong>B</strong>
            </ion-button>
            <ion-button
              onClick={() => this.toggleItalic()}
              size="default"
              fill={this.isItalicActive ? 'solid' : 'clear'}
              tabindex="-1"
              title="Italic"
            >
              <em>I</em>
            </ion-button>
            <ion-button
              onClick={() => this.toggleUnderline()}
              size="default"
              fill={this.isUnderlineActive ? 'solid' : 'clear'}
              tabindex="-1"
              title="Underline"
            >
              <u>U</u>
            </ion-button>

            {this.enableHeadings && (
              <Fragment>
                <ion-button
                  onClick={() => this.toggleHeading(2)}
                  size="default"
                  fill={this.isHeading2Active ? 'solid' : 'clear'}
                  tabindex="-1"
                  title="Heading 2"
                >
                  H2
                </ion-button>
                <ion-button
                  onClick={() => this.toggleHeading(3)}
                  size="default"
                  fill={this.isHeading3Active ? 'solid' : 'clear'}
                  tabindex="-1"
                  title="Heading 3"
                >
                  H3
                </ion-button>
              </Fragment>
            )}

            {this.enableLists && (
              <Fragment>
                <ion-button
                  onClick={() => this.toggleOrderedList()}
                  size="default"
                  fill={this.isOrderedListActive ? 'solid' : 'clear'}
                  tabindex="-1"
                  title="Numbered list"
                >
                  #
                </ion-button>
                <ion-button
                  onClick={() => this.toggleUnorderedList()}
                  size="default"
                  fill={this.isUnorderedListActive ? 'solid' : 'clear'}
                  tabindex="-1"
                  title="Bullet list"
                >
                  <ion-icon icon="list" />
                </ion-button>
              </Fragment>
            )}

            {this.enableLinks && (
              <ion-button
                onClick={() => this.toggleLinkPanel()}
                size="default"
                fill={this.isLinkPanelOpen || this.isLinkActive ? 'solid' : 'clear'}
                tabindex="-1"
                title="Hyperlink"
              >
                <ion-icon icon="link" />
              </ion-button>
            )}

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
                <Fragment>
                  <ion-button size="small" fill="outline" onClick={() => this.openLinkPreview()}>
                    Open
                  </ion-button>
                  <ion-button size="small" fill="outline" color="danger" onClick={() => this.removeLink()}>
                    Remove
                  </ion-button>
                </Fragment>
              )}
            </div>
          )}

          {this.isImagePickerOpen && (
            <div class="image-picker-panel">
              <div class="image-picker-grid">
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
            </div>
          )}
        </ion-toolbar>

        <div ref={el => (this.editorContentRef = el!)} class="editor-content" />
      </Host>
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
        heading: this.enableHeadings ? { levels: [1, 2, 3] } : false,
        bulletList: this.enableLists ? {} : false,
        orderedList: this.enableLists ? {} : false,
        link: this.enableLinks
          ? {
            openOnClick: false,
            HTMLAttributes: {
              target: '_blank',
              rel: 'noopener noreferrer',
            },
          }
          : false,
        underline: {},
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
      },
    });

    this.updateButtonStates();
  }

  private handleFocus(e: FocusEvent) {
    if (e.target === this.el) {
      this.editorContentRef?.focus();
      this.editor?.commands.focus();
    }
  }

  private handleBlur(e: FocusEvent) {
    if (this.el.contains(e.relatedTarget as Node)) {
      return;
    }

    this.isImagePickerOpen = false;
    this.isLinkPanelOpen = false;

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
    this.isHeading2Active = this.editor.isActive('heading', { level: 2 });
    this.isHeading3Active = this.editor.isActive('heading', { level: 3 });
    this.isOrderedListActive = this.editor.isActive('orderedList');
    this.isUnorderedListActive = this.editor.isActive('bulletList');
    this.isLinkActive = this.editor.isActive('link');

    if (this.isLinkActive) {
      const linkAttrs = this.editor.getAttributes('link') as { href?: string };
      this.linkUrl = linkAttrs.href || '';
    }
  }

  private toggleBold() {
    this.editor?.chain().focus().toggleBold().run();
  }

  private toggleItalic() {
    this.editor?.chain().focus().toggleItalic().run();
  }

  private toggleUnderline() {
    this.editor?.chain().focus().toggleUnderline().run();
  }

  private toggleHeading(level: 2 | 3) {
    this.editor?.chain().focus().toggleHeading({ level }).run();
  }

  private toggleOrderedList() {
    this.editor?.chain().focus().toggleOrderedList().run();
  }

  private toggleUnorderedList() {
    this.editor?.chain().focus().toggleBulletList().run();
  }

  private toggleLinkPanel() {
    this.isLinkPanelOpen = !this.isLinkPanelOpen;
    this.isImagePickerOpen = false;

    if (this.isLinkPanelOpen && this.isLinkActive) {
      const linkAttrs = this.editor?.getAttributes('link') as { href?: string } | undefined;
      this.linkUrl = linkAttrs?.href || '';
    }
  }

  private applyLink() {
    if (isNullOrEmpty(this.linkUrl)) {
      this.removeLink();
      return;
    }

    this.editor?.chain().focus().extendMarkRange('link').setLink({ href: this.linkUrl }).run();
    this.isLinkPanelOpen = false;
    this.updateButtonStates();
  }

  private removeLink() {
    this.editor?.chain().focus().extendMarkRange('link').unsetLink().run();
    this.linkUrl = '';
    this.isLinkPanelOpen = false;
    this.updateButtonStates();
  }

  private openLinkPreview() {
    if (!isNullOrEmpty(this.linkUrl)) {
      window.open(this.linkUrl, '_blank', 'noopener,noreferrer');
    }
  }

  private toggleImagePicker() {
    this.isImagePickerOpen = !this.isImagePickerOpen;
    this.isLinkPanelOpen = false;
  }

  private insertImage(image: { name: string; url: string; thumbUrl: string }) {
    this.isImagePickerOpen = false;

    if (this.editor && !this.editor.isDestroyed) {
      this.editor
        .chain()
        .focus()
        .insertContent({
          type: GompImage.name,
          attrs: {
            src: image.url,
            alt: image.name,
            'data-image': image.name,
          },
        })
        .run();

      this.updateButtonStates();
      this.valueChanged.emit(this.getCleanHTML());
    }
  }
}
