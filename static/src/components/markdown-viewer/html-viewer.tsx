import { Component, Prop, h } from '@stencil/core';
import { preProcessMultilineText, sanitizeHTML } from '../../helpers/utils';

@Component({
  tag: 'html-viewer',
  styleUrl: 'html-viewer.css',
  shadow: true,
})
export class HTMLViewer {
  @Prop() value: string = '';

  render() {
    return (
      <div innerHTML={sanitizeHTML(preProcessMultilineText(this.value))} />
    );
  }
}
