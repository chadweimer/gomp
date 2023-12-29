import { Component, Host, h, Prop, Event, EventEmitter } from '@stencil/core';

@Component({
  tag: 'five-star-rating',
  styleUrl: 'five-star-rating.css',
  shadow: true,
})
export class FiveStarRating {
  @Prop() value = 0;
  @Prop() disabled = false;
  @Prop() icon = 'star';
  @Prop() size = 'small';

  @Event() valueSelected: EventEmitter<number>;

  private ratings = [
    { value: 5.0, class: 'whole' },
    { value: 4.5, class: 'half' },
    { value: 4.0, class: 'whole' },
    { value: 3.5, class: 'half' },
    { value: 3.0, class: 'whole' },
    { value: 2.5, class: 'half' },
    { value: 2.0, class: 'whole' },
    { value: 1.5, class: 'half' },
    { value: 1.0, class: 'whole' },
    { value: 0.5, class: 'half' },
  ];

  render() {
    return (
      <Host>
        {this.ratings.map(rating =>
          <ion-icon key={rating.value} icon={this.icon} size={this.size}
            class={{
              ['icon']: true,
              [rating.class]: true,
              ['selected']: rating.value <= this.value,
              ['disabled']: this.disabled
            }}
            onClick={() => this.onClicked(rating.value)} />
        )}
      </Host>
    );
  }

  private onClicked(value: number) {
    if (this.disabled) return;

    this.valueSelected.emit(value);
  }

}
