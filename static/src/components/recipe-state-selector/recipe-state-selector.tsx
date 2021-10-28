import { CheckboxChangeEventDetail } from '@ionic/core';
import { Component, Event, EventEmitter, h, Prop, State } from '@stencil/core';
import { RecipeState } from '../../generated';
import { capitalizeFirstLetter } from '../../helpers/utils';

@Component({
  tag: 'recipe-state-selector',
  styleUrl: 'recipe-state-selector.css',
})
export class RecipeStateSelector {
  @Prop() selectedStates: RecipeState[] = [RecipeState.Active];

  @State() internalSelectedStates: RecipeState[] = [];

  @Event() selectedStatesChanged: EventEmitter<RecipeState[]>;

  componentWillLoad() {
    this.internalSelectedStates = this.selectedStates;
  }

  render() {
    return (
      <ion-list>
        {Object.values(RecipeState).map(item =>
          <ion-item>
            <ion-label>{capitalizeFirstLetter(item)}</ion-label>
            <ion-checkbox slot="end" value={item} checked={this.selectedStates.includes(item)} onIonChange={e => this.onSelectionChanged(e)}></ion-checkbox>
          </ion-item>
        )}
      </ion-list>
    );
  }


  private onSelectionChanged(e: CustomEvent<CheckboxChangeEventDetail<RecipeState>>): void {
    if (e.detail.checked) {
      this.internalSelectedStates = [
        ...this.internalSelectedStates,
        e.detail.value
      ];
    } else {
      this.internalSelectedStates = this.internalSelectedStates.filter(state => state !== e.detail.value);
    }

    this.selectedStatesChanged.emit(this.internalSelectedStates);
  }

}
