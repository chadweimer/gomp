import { Component, h, Prop, State, Event, Watch, Host, EventEmitter, Element } from '@stencil/core';
import { marked } from 'marked';
import TurndownService from 'turndown';
import { isNull, isNullOrEmpty } from '../../helpers/utils';

@Component({
  tag: 'markdown-editor',
  styleUrl: 'markdown-editor.css',
  scoped: true, // Shadow DOM is not supported with Selections
})
export class MarkdownEditor {
  @Element() el!: HTMLMarkdownEditorElement;

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
  private turndownService: TurndownService;

  constructor() {
    this.turndownService = new TurndownService({
      headingStyle: 'atx',
      hr: '---',
      bulletListMarker: '-',
      codeBlockStyle: 'fenced',
    });
    this.turndownService.addRule('underline', {
      filter: ['u'],
      replacement: function (content) {
        return '<u>' + content + '</u>'
      }
    });
  }

  @Watch('value')
  async onValueChange(newValue: string) {
    if (!isNull(this.editorContentRef)) {
      const editorMarkdown = this.turndownService.turndown(this.editorContentRef.innerHTML);
      if (editorMarkdown !== newValue) {
        this.editorContentRef.innerHTML = await marked.parse(newValue);
      }
      this.updateButtonStates();
    }
  }

  async componentDidLoad() {
    if (!isNullOrEmpty(this.value)) {
      this.editorContentRef.innerHTML = await marked.parse(this.value);
    }

    this.el.ownerDocument.addEventListener('selectionchange', () => this.handleSelectionChange());

    this.updateButtonStates();
  }

  disconnectedCallback() {
    this.el.ownerDocument.removeEventListener('selectionchange', () => this.handleSelectionChange());
  }

  render() {
    return (
      <Host>
        {!isNullOrEmpty(this.label) ? <ion-label position={this.labelPlacement}>{this.label}</ion-label> : ''}
        <ion-buttons class="ion-padding-top">
          <ion-button
            onClick={() => this.executeCommand('bold')}
            fill={this.isBoldActive ? 'solid' : 'clear'}
          >
            <strong>B</strong>
          </ion-button>
          <ion-button
            onClick={() => this.executeCommand('italic')}
            fill={this.isItalicActive ? 'solid' : 'clear'}
          >
            <em>I</em>
          </ion-button>
          <ion-button
            onClick={() => this.executeCommand('underline')}
            fill={this.isUnderlineActive ? 'solid' : 'clear'}
          >
            <u>U</u>
          </ion-button>
          <ion-button
            onClick={() => this.executeCommand('insertOrderedList')}
            fill={this.isOrderedListActive ? 'solid' : 'clear'}
          >
            #
          </ion-button>
          <ion-button
            onClick={() => this.executeCommand('insertUnorderedList')}
            fill={this.isUnorderedListActive ? 'solid' : 'clear'}
          >
            <ion-icon icon="list" />
          </ion-button>
        </ion-buttons>
        <div
          class="editor-content"
          contentEditable="true"
          onBlurCapture={() => this.handleInput()}
          onMouseUp={() => this.handleSelectionChange()}
          onKeyUp={() => this.handleSelectionChange()}
          ref={(el) => (this.editorContentRef = el)}
        >
        </div>
      </Host>
    );
  }

  private handleInput() {
    const editorMarkdown = this.turndownService.turndown(this.editorContentRef.innerHTML);
    this.valueChanged.emit(editorMarkdown);
  }

  private handleSelectionChange() {
    this.updateButtonStates();
  }

  private updateButtonStates() {
    // Check if the editor is focused
    if (!this.el.contains(this.el.ownerDocument.activeElement)) {
      this.isBoldActive = false;
      this.isItalicActive = false;
      this.isUnderlineActive = false;
      this.isOrderedListActive = false;
      this.isUnorderedListActive = false;
      this.isLinkActive = false;
      this.activeHeading = null
      return;
    }

    if (typeof this.el.ownerDocument.queryCommandState === 'function') {
      this.isBoldActive = this.el.ownerDocument.queryCommandState('bold');
      this.isItalicActive = this.el.ownerDocument.queryCommandState('italic');
      this.isUnderlineActive = this.el.ownerDocument.queryCommandState('underline');
      this.isOrderedListActive = this.el.ownerDocument.queryCommandState('insertOrderedList');
      this.isUnorderedListActive = this.el.ownerDocument.queryCommandState('insertUnorderedList');
    }

    // Check link active state (more complex)
    if (typeof this.el.ownerDocument.getSelection === 'function') {
      const selection = this.el.ownerDocument.getSelection();
      this.isLinkActive = false;
      if (selection && selection.rangeCount > 0) {
        const range = selection.getRangeAt(0);
        const commonAncestor = range.commonAncestorContainer;
        const anchor = this.findAncestor(commonAncestor, 'A');
        if (!isNull(anchor)) {
          this.isLinkActive = true;
        }
      }
    }

    // Check active heading/blockquote
    const parentBlock = this.getSelectionParentBlock();
    this.activeHeading = null;
    if (!isNull(parentBlock)) {
      const tagName = parentBlock.tagName.toLowerCase();
      if (['h1', 'h2', 'h3', 'h4', 'h5', 'h6'].includes(tagName)) {
        this.activeHeading = tagName as 'h1' | 'h2' | 'h3' | 'h4' | 'h5' | 'h6';
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

  private getSelectionParentBlock(): HTMLElement | null {
    if (typeof this.el.ownerDocument.getSelection === 'function') {
      const selection = this.el.ownerDocument.getSelection();
      if (selection.rangeCount === 0) return null;

      let node = selection.getRangeAt(0).commonAncestorContainer;
      // Walk up the DOM tree until we find a block element or the editor's content div
      while (node && node !== this.editorContentRef && !['div', 'p', 'h1', 'h2', 'h3', 'h4', 'h5', 'h6', 'blockquote', 'li'].includes(node.nodeName.toLowerCase())) {
        node = node.parentNode;
      }
      // Ensure the node is within the editor and is an actual element
      if (node && node instanceof HTMLElement && this.editorContentRef.contains(node)) {
        return node;
      }
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
