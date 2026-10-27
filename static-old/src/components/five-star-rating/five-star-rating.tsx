import { Component, Host, h, Prop, State, Event, EventEmitter } from '@stencil/core';

@Component({
  tag: 'five-star-rating',
  styleUrl: 'five-star-rating.css',
  shadow: true,
})
export class FiveStarRating {
  @Prop() value = 0;
  @Prop() disabled = false;
  @Prop() size = 'small';

  @State() hoverValue: number | null = null;

  @Event() valueSelected!: EventEmitter<number>;

  private readonly stars = [1, 2, 3, 4, 5];

  render() {
    const isHovering = !this.disabled && this.hoverValue !== null;
    const displayValue = isHovering ? this.hoverValue! : this.value;

    return (
      <Host onMouseLeave={() => this.hoverValue = null}>
        {this.stars.map(star => {
          const iconName = this.getIconName(star, displayValue);
          return (
            <ion-icon
              key={star}
              name={iconName}
              size={this.size}
              class={{
                hover: isHovering,
                disabled: this.disabled,
              }}
              onMouseMove={e => !this.disabled && (this.hoverValue = this.getRatingFromEvent(e, star))}
              onClick={e => !this.disabled && this.valueSelected.emit(this.hoverValue ?? this.getRatingFromEvent(e, star))}
            />
          );
        })}
      </Host>
    );
  }

  private getIconName(star: number, value: number): string {
    if (value >= star) {
      return 'star';
    }
    if (value >= star - 0.5) {
      return 'star-half';
    }
    return 'star-outline';
  }

  private getRatingFromEvent(event: MouseEvent, star: number): number {
    const target = event.currentTarget as HTMLElement | null;
    if (target) {
      const rect = target.getBoundingClientRect();
      if (rect.width > 0 && event.clientX - rect.left < rect.width / 2) {
        return star - 0.5;
      }
    }
    return star;
  }
}
