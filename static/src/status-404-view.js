import { PolymerElement } from '@polymer/polymer/polymer-element.js';
import './shared-styles.js';
import { html } from '@polymer/polymer/lib/utils/html-tag.js';
class Status404View extends PolymerElement {
  static get template() {
    return html`
        <style include="shared-styles">
            :host {
                display: block;
                padding: 8px;
            }
        </style>

        <span>Could not locate the requested resource.</span>
`;
  }

  static get is() { return 'status-404-view'; }
}

window.customElements.define(Status404View.is, Status404View);
