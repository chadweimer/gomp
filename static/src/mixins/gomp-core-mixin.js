/**
* Base behavior behind most of the elements in the application.
*
* @polymer
* @mixinFunction
*/
GompCoreMixin = (superClass) => class extends superClass {
    static get properties() {
        return {
            isReady: {
                type: Boolean,
                value: false,
                notify: true,
            },
            isActive: {
                type: Boolean,
                value: false,
                notify: true,
                reflectToAttribute: true,
                observer: '_isActiveChanged',
            },
        };
    }

    ready() {
        super.ready();

        this.isReady = true;
    }

    showToast(message) {
        this.dispatchEvent(new CustomEvent('show-toast', {bubbles: true, composed: true, detail: {message: message}}));
    }
    _isNullOrEmpty(val) {
        return val === null || val === '';
    }

    _isActiveChanged(isActive) { }
};
