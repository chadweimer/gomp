'use strict'
import { PolymerElement } from '@polymer/polymer/polymer-element.js';
import { property } from '@polymer/decorators';

export class GompBaseElement extends PolymerElement {
    @property({type: Boolean, notify: true})
    isReady = false;
    @property({type: Boolean, notify: true, reflectToAttribute: true, observer: '_isActiveChanged'})
    isActive = false;

    ready() {
        super.ready();

        this.isReady = true;
    }

    showToast(message: string) {
        this.dispatchEvent(new CustomEvent('show-toast', {bubbles: true, composed: true, detail: {message: message}}));
    }
    _isNullOrEmpty(val: string|null) {
        return val === null || val === '';
    }

    _isActiveChanged(_isActive: boolean) { }
}
