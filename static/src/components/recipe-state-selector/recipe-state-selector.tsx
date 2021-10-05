import { CheckboxChangeEventDetail } from '@ionic/core';
import { Component, Event, EventEmitter, h, Prop, State } from '@stencil/core';
import { RecipeState } from '../../models';

@Component({
  tag: 'recipe-state-selector',
  styleUrl: 'recipe-state-selector.css',
})
export class RecipeStateSelector {
  @Prop() selectedStates: RecipeState[] = [RecipeState.Active];

  @State() internalSelectedStates: RecipeState[] = [];

  @Event() selectedStatesChanged: EventEmitter<RecipeState[]>;

  private static availableRecipeStates = [
    { name: 'Active', value: RecipeState.Active },
    { name: 'Archived', value: RecipeState.Archived }
  ];

  componentWillLoad() {
    this.internalSelectedStates = this.selectedStates;
  }

  render() {
    return (
      <ion-list>
        {RecipeStateSelector.availableRecipeStates.map(state =>
          <ion-item>
            <ion-label>{state.name}</ion-label>
            <ion-checkbox slot="end" value={state.value} checked={this.selectedStates.includes(state.value)} onIonChange={e => this.onSelectionChanged(e)}></ion-checkbox>
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
