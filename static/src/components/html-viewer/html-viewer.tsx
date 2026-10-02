import { Component, Prop, h } from '@stencil/core';

@Component({
  tag: 'html-viewer',
  styleUrl: 'html-viewer.css',
  shadow: true,
})
export class HTMLViewer {
  @Prop() value: string = '';

  render() {
    return (
      <div innerHTML={this.value} />
    );
  }
}
