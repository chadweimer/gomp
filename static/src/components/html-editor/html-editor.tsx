import { Component, h, Prop, State, Event, Watch, Host, EventEmitter, Element } from '@stencil/core';
import { isNull, isNullOrEmpty, preProcessMultilineText, sanitizeHTML } from '../../helpers/utils';

@Component({
  tag: 'html-editor',
  styleUrl: 'html-editor.css',
  scoped: true,
})
export class HTMLEditor {
  @Element() el!: HTMLHtmlEditorElement;

  @Prop() value: string = '';
  @Prop() label?: string;
  @Prop() labelPlacement?: 'end' | 'fixed' | 'floating' | 'stacked' | 'start';

  @Event() valueChanged: EventEmitter<string>;

  @State() isBoldActive: boolean = false;
  @State() isItalicActive: boolean = false;
  @State() isUnderlineActive: boolean = false;
  @State() isLinkActive: boolean = false;
  @State() isOrderedListActive: boolean = false;
  @State() isUnorderedListActive: boolean = false;
  @State() activeHeading?: 'h1' | 'h2' | 'h3' | 'h4' | 'h5' | 'h6';

  private editorContentRef!: HTMLElement;

  @Watch('value')
  async onValueChange() {
    this.updateButtonStates();
  }

  componentDidLoad() {
    this.el.ownerDocument.addEventListener('selectionchange', this.updateButtonStates);

    this.updateButtonStates();
  }

  disconnectedCallback() {
    this.el.ownerDocument.removeEventListener('selectionchange', this.updateButtonStates);
  }

  render() {
    return (
      <Host>
        {!isNullOrEmpty(this.label) ? <ion-label position={this.labelPlacement}>{this.label}</ion-label> : ''}
        <ion-toolbar class="editor-toolbar">
          <ion-buttons>
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
          </ion-buttons>
        </ion-toolbar>
        <div
          ref={el => (this.editorContentRef = el)}
          class="editor-content"
          contentEditable="true"
          role="textbox"
          tabindex="0"
          onBlur={e => this.handleBlur(e)}
          onMouseUp={() => this.updateButtonStates()}
          onKeyUp={() => this.updateButtonStates()}
          innerHTML={sanitizeHTML(preProcessMultilineText(this.value))}
        >
        </div>
      </Host>
    );
  }

  private handleBlur(e: FocusEvent) {
    // If something inside this editor is focused, do not emit the value change.
    // This is important to prevent emitting changes when the user is still editing.
    if (this.el.contains(e.relatedTarget as Node)) {
      return;
    }

    this.valueChanged.emit(sanitizeHTML(this.editorContentRef.innerHTML));
  }

  // It's important for this to be a property so that it can be used in the event listeners
  private updateButtonStates = () => {
    // Reset all states
    this.isBoldActive = false;
    this.isItalicActive = false;
    this.isUnderlineActive = false;
    this.isOrderedListActive = false;
    this.isUnorderedListActive = false;
    this.isLinkActive = false;
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
      if (headingValue && headingValue.startsWith('h')) {
        const headingLevel = headingValue.slice(1);
        if (['1', '2', '3', '4', '5', '6'].includes(headingLevel)) {
          this.activeHeading = `h${headingLevel}` as 'h1' | 'h2' | 'h3' | 'h4' | 'h5' | 'h6';
        }
      }
    }

    // Check link active state (more complex)
    if (typeof this.el.ownerDocument.getSelection === 'function') {
      const selection = this.el.ownerDocument.getSelection();
      if (selection && selection.rangeCount > 0) {
        const range = selection.getRangeAt(0);
        const commonAncestor = range.commonAncestorContainer;
        const anchor = this.findAncestor(commonAncestor, 'A');
        if (!isNull(anchor)) {
          this.isLinkActive = true;
        }
      }
    }
  }

  private findAncestor(el: Node, tagName: string): HTMLElement | null {
    while (!isNull(el) && !isNull(el.parentNode)) {
      if (el instanceof HTMLElement && el.tagName === tagName) {
        return el;
      }
      el = el.parentNode;
    }
    return null;
  }

  private executeCommand(command: string, value?: string) {
    // Focus the editor content before executing command
    this.editorContentRef.focus();

    if (command === 'createLink') {
      const url = prompt('Enter the URL:');
      if (!isNull(url)) {
        this.el.ownerDocument.execCommand(command, false, url);
      }
    } else {
      this.el.ownerDocument.execCommand(command, false, value);
    }
    this.updateButtonStates();
  }
}
