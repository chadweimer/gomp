import { Component, Element, Host, Prop, Watch, h } from '@stencil/core';
import { marked } from 'marked';

@Component({
  tag: 'markdown-viewer',
  styleUrl: 'markdown-viewer.css',
  shadow: true,
})
export class MarkdownViewer {
  @Element() el!: HTMLMarkdownViewerElement;

  @Prop() value: string = '';

  @Watch('value')
  async onValueChange(newValue: string) {
    this.el.shadowRoot.innerHTML = await marked.parse(newValue);
  }

  async componentDidLoad() {
    if (this.value !== '') {
      this.el.shadowRoot.innerHTML = await marked.parse(this.value);
    }
  }

  render() {
    return (
      <Host />
    );
  }
}
