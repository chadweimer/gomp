import { Component, Prop, h } from '@stencil/core';
import DOMPurify from 'dompurify';
import { marked } from 'marked';

@Component({
  tag: 'markdown-viewer',
  styleUrl: 'markdown-viewer.css',
  shadow: true,
})
export class MarkdownViewer {
  @Prop() value: string = '';

  render() {
    return (
      <div innerHTML={DOMPurify.sanitize(marked.parse(this.value).toString())} />
    );
  }
}
