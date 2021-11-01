import { RadioGroupChangeEventDetail } from '@ionic/core';
import { Component, Event, EventEmitter, h, Prop } from '@stencil/core';
import { capitalizeFirstLetter } from '../../helpers/utils';
import { SortBy } from '../../generated';

@Component({
  tag: 'sort-by-selector',
  styleUrl: 'sort-by-selector.css',
  shadow: true,
})
export class SortBySelector {
  @Prop() sortBy: SortBy = SortBy.Name;

  @Event() sortByChanged: EventEmitter<SortBy>;

  render() {
    return (
      <ion-list>
        <ion-radio-group value={this.sortBy} onIonChange={e => this.onSelectionChanged(e)}>
          {Object.values(SortBy).map(item =>
            <ion-item>
              <ion-label>{capitalizeFirstLetter(item)}</ion-label>
              <ion-radio slot="end" value={item}></ion-radio>
            </ion-item>
          )}
        </ion-radio-group>
      </ion-list>
    );
  }

  private onSelectionChanged(e: CustomEvent<RadioGroupChangeEventDetail<SortBy>>): void {
    this.sortByChanged.emit(e.detail.value);
  }
}
