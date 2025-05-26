import { Color } from '@ionic/core';
import { Component, Host, Event, EventEmitter, Prop, h } from '@stencil/core';

@Component({
  tag: 'page-navigator',
  styleUrl: 'page-navigator.css',
  shadow: true,
})
export class PageNavigator {
  @Prop() page = 1;
  @Prop() numPages = 1;
  @Prop({ reflect: true }) fill?: 'clear' | 'outline' | 'solid' | 'default';
  @Prop({ reflect: true }) color?: Color;

  @Event() pageChanged: EventEmitter<number>;

  render() {
    return (
      <Host>
        <ion-buttons>
          <ion-button fill={this.fill} color={this.color} disabled={this.page === 1} onClick={() => this.pageChanged.emit(1)}>
            <ion-icon slot="icon-only" icon="arrow-back" />
          </ion-button>
          <ion-button fill={this.fill} color={this.color} disabled={this.page === 1} onClick={() => this.pageChanged.emit(this.page - 1)}>
            <ion-icon slot="icon-only" icon="chevron-back" />
          </ion-button>
          <ion-button fill={this.fill} color={this.color} disabled>
            {this.page} of {this.numPages}
          </ion-button>
          <ion-button fill={this.fill} color={this.color} disabled={this.page === this.numPages} onClick={() => this.pageChanged.emit(this.page + 1)}>
            <ion-icon slot="icon-only" icon="chevron-forward" />
          </ion-button>
          <ion-button fill={this.fill} color={this.color} disabled={this.page === this.numPages} onClick={() => this.pageChanged.emit(this.numPages)}>
            <ion-icon slot="icon-only" icon="arrow-forward" />
          </ion-button>
        </ion-buttons>
      </Host>
    );
  }
}
