import { RadioGroupChangeEventDetail } from '@ionic/core';
import { Component, Event, EventEmitter, h, Prop } from '@stencil/core';
import { SortBy } from '../../models';

@Component({
  tag: 'sort-by-selector',
  styleUrl: 'sort-by-selector.css',
  shadow: true,
})
export class SortBySelector {
  @Prop() sortBy: SortBy = SortBy.Name;

  @Event() sortByChanged: EventEmitter<SortBy>;

  private static availableSortBy = [
    { name: 'Name', value: SortBy.Name },
    { name: 'Rating', value: SortBy.Rating },
    { name: 'Created', value: SortBy.Created },
    { name: 'Modified', value: SortBy.Modified },
    { name: 'Random', value: SortBy.Random }
  ];

  render() {
    return (
      <ion-list>
        <ion-radio-group value={this.sortBy} onIonChange={e => this.onSelectionChanged(e)}>
          {SortBySelector.availableSortBy.map(item =>
            <ion-item>
              <ion-label>{item.name}</ion-label>
              <ion-radio slot="end" value={item.value}></ion-radio>
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
