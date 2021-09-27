import { Component, Host, h } from '@stencil/core';

@Component({
  tag: 'image-uploader',
  styleUrl: 'image-uploader.css',
  shadow: true,
})
export class ImageUploader {

  render() {
    return (
      <Host>
        <slot></slot>
      </Host>
    );
  }

}
