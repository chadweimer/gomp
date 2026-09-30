import { Component, h, Prop, State, Event, Watch, Host, EventEmitter, Element } from '@stencil/core';
import { createImageElement, isNull, isNullOrEmpty, preProcessMultilineText, sanitizeHTML } from '../../helpers/utils';
import { HtmlEditorImage } from '../../models';

@Component({
  tag: 'html-editor',
  styleUrl: 'html-editor.css',
  scoped: true,
})
export class HTMLEditor {
  @Element() el!: HTMLHtmlEditorElement;

  @Prop() value: string = '';
  @Prop() label?: string;
  @Prop() labelPlacement?: 'fixed' | 'floating' | 'stacked';
  @Prop() images?: HtmlEditorImage[];

  @Event() valueChanged!: EventEmitter<string>;

  @State() isBoldActive: boolean = false;
  @State() isItalicActive: boolean = false;
  @State() isUnderlineActive: boolean = false;
  @State() isOrderedListActive: boolean = false;
  @State() isUnorderedListActive: boolean = false;
  @State() isImagePickerOpen: boolean = false;
  @State() activeHeading: 'h1' | 'h2' | 'h3' | 'h4' | 'h5' | 'h6' | null = null;

  private editorContentRef!: HTMLElement;
  private savedRange: Range | null = null;

  @Watch('value')
  onValueChange() {
    this.updateButtonStates();
  }

  componentWillLoad() {
    this.updateButtonStates();
  }

  componentDidLoad() {
    this.el.ownerDocument.addEventListener('selectionchange', this.onSelectionChange);
  }

  disconnectedCallback() {
    this.el.ownerDocument.removeEventListener('selectionchange', this.onSelectionChange);
  }

  render() {
    return (
      <div onFocusout={(e: FocusEvent) => this.handleBlur(e)}>
        {!isNullOrEmpty(this.label) && <ion-label position={this.labelPlacement}>{this.label}</ion-label>}
        <ion-toolbar class="editor-toolbar">
          <ion-buttons class="prevent-selection">
            <ion-button
              onClick={() => this.executeCommand('bold')}
              size="default"
              fill={this.isBoldActive ? 'solid' : 'clear'}
              tabindex="-1"
            >
              <strong>B</strong>
            </ion-button>
            <ion-button
              onClick={() => this.executeCommand('italic')}
              size="default"
              fill={this.isItalicActive ? 'solid' : 'clear'}
              tabindex="-1"
            >
              <em>I</em>
            </ion-button>
            <ion-button
              onClick={() => this.executeCommand('underline')}
              size="default"
              fill={this.isUnderlineActive ? 'solid' : 'clear'}
              tabindex="-1"
            >
              <u>U</u>
            </ion-button>
            <ion-button
              onClick={() => this.executeCommand('insertOrderedList')}
              size="default"
              fill={this.isOrderedListActive ? 'solid' : 'clear'}
              tabindex="-1"
            >
              #
            </ion-button>
            <ion-button
              onClick={() => this.executeCommand('insertUnorderedList')}
              size="default"
              fill={this.isUnorderedListActive ? 'solid' : 'clear'}
              tabindex="-1"
            >
              <ion-icon icon="list" />
            </ion-button>
            {(this.images?.length ?? 0) > 0 && (
              <ion-button
                onClick={() => this.toggleImagePicker()}
                size="default"
                fill={this.isImagePickerOpen ? 'solid' : 'clear'}
                tabindex="-1"
              >
                <ion-icon icon="image" />
              </ion-button>
            )}
          </ion-buttons>
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
                    <img slot="icon-only" src={image.url} alt={image.name} />
                  </ion-button>
                ))}
              </div>
            </div>
          )}
        </ion-toolbar>
        <div
          ref={el => (this.editorContentRef = el!)}
          class="editor-content"
          contentEditable="true"
          role="textbox"
          tabindex="0"
          onMouseUp={() => this.updateButtonStates()}
          onKeyUp={() => this.updateButtonStates()}
          innerHTML={sanitizeHTML(preProcessMultilineText(this.toEditorHtml(this.value)))}
        >
        </div>
      </div>
    );
  }

  // It's important for this to be a property so that it can be used in the event listeners
  private readonly onSelectionChange = () => {
    this.updateButtonStates();
    this.saveSelection();
  }

  private handleBlur(e: FocusEvent) {
    // If something inside this editor is focused, do not emit the value change.
    // This is important to prevent emitting changes when the user is still editing.
    if (this.el.contains(e.relatedTarget as Node)) {
      return;
    }

    this.isImagePickerOpen = false;
    this.savedRange = null;
    this.valueChanged.emit(sanitizeHTML(this.toStorageHtml(this.editorContentRef.innerHTML)));
  }

  private saveSelection() {
    const selection = this.el.ownerDocument.getSelection();
    if (selection && selection.rangeCount > 0) {
      const range = selection.getRangeAt(0);
      if (this.editorContentRef?.contains(range.commonAncestorContainer)) {
        this.savedRange = range.cloneRange();
      }
    }
  }

  private updateButtonStates() {
    // Reset all states
    this.isBoldActive = false;
    this.isItalicActive = false;
    this.isUnderlineActive = false;
    this.isOrderedListActive = false;
    this.isUnorderedListActive = false;
    this.activeHeading = null;

    // Handle being inside a parent's shadow DOM
    let activeElement = this.el.ownerDocument.activeElement;
    while (!isNull(activeElement?.shadowRoot)) {
      activeElement = activeElement.shadowRoot.activeElement;
    }

    // Check if the editor is focused
    if (!this.el.contains(activeElement)) {
      return;
    }

    if (typeof this.el.ownerDocument.queryCommandState === 'function') {
      this.isBoldActive = this.el.ownerDocument.queryCommandState('bold');
      this.isItalicActive = this.el.ownerDocument.queryCommandState('italic');
      this.isUnderlineActive = this.el.ownerDocument.queryCommandState('underline');
      this.isOrderedListActive = this.el.ownerDocument.queryCommandState('insertOrderedList');
      this.isUnorderedListActive = this.el.ownerDocument.queryCommandState('insertUnorderedList');

      // Check if a heading is active
      const headingValue = this.el.ownerDocument.queryCommandValue('formatBlock');
      if (!isNull(headingValue) && headingValue.startsWith('h')) {
        const headingLevel = headingValue.slice(1);
        if (['1', '2', '3', '4', '5', '6'].includes(headingLevel)) {
          this.activeHeading = `h${headingLevel}` as 'h1' | 'h2' | 'h3' | 'h4' | 'h5' | 'h6';
        }
      }
    }
  }

  private executeCommand(command: string, value?: string) {
    // Focus the editor content before executing command
    this.editorContentRef.focus();

    if (typeof this.el.ownerDocument.execCommand === 'function') {
      this.el.ownerDocument.execCommand(command, false, value);
    }
    this.updateButtonStates();
  }

  private toggleImagePicker() {
    this.saveSelection();
    this.isImagePickerOpen = !this.isImagePickerOpen;
  }

  private insertImage(image: HtmlEditorImage) {
    this.isImagePickerOpen = false;
    this.editorContentRef.focus();

    const img = createImageElement(this.el, image.name, image.url);
    if (this.savedRange && this.editorContentRef.contains(this.savedRange.commonAncestorContainer)) {
      const selection = this.el.ownerDocument.getSelection();
      if (selection) {
        selection.removeAllRanges();
        selection.addRange(this.savedRange);
      }
      this.savedRange.deleteContents();
      this.savedRange.insertNode(img);

      this.savedRange.setStartAfter(img);
      this.savedRange.setEndAfter(img);
      if (selection) {
        selection.removeAllRanges();
        selection.addRange(this.savedRange);
      }
    } else {
      this.editorContentRef.appendChild(img);
    }

    this.saveSelection();
    this.updateButtonStates();
    this.valueChanged.emit(sanitizeHTML(this.toStorageHtml(this.editorContentRef.innerHTML)));
  }

  private toEditorHtml(value: string | null | undefined): string {
    if (isNullOrEmpty(value)) {
      return '';
    }

    return value.replace(/\{\{image:([^}]+)\}\}/g, (_match, imageName: string) => {
      const imgItem = this.images?.find(i => i.name === imageName);
      const template = this.el.ownerDocument.createElement('template');
      const img = createImageElement(this.el, imageName, imgItem?.url ?? '');
      template.content.appendChild(img);
      return template.innerHTML;
    });
  }

  private toStorageHtml(html: string): string {
    if (isNullOrEmpty(html)) {
      return '';
    }

    const template = this.el.ownerDocument.createElement('template');
    template.innerHTML = html;
    const images = template.content.querySelectorAll('img');
    images.forEach(img => {
      const imageName = img.dataset.image;
      if (imageName) {
        img.replaceWith(`{{image:${imageName}}}`);
      }
    });
    return template.innerHTML;
  }
}
