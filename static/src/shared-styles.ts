import '@polymer/polymer/polymer-legacy.js';
import '@polymer/paper-styles/paper-styles.js';

const $documentContainer = document.createElement('template');
$documentContainer.innerHTML = `<dom-module id="shared-styles">
    <template>
        <style>
            h1 {
                @apply --paper-font-display2;
            }
            h2 {
                @apply --paper-font-display1;
            }
            h3 {
                @apply --paper-font-title;
            }
            h4 {
                @apply --paper-font-headline;
            }
            h5 {
                @apply --paper-font-subhead;
            }
            h6 {
                @apply --paper-font-body2;
            }

            a {
                font-weight: 500;
                color: var(--primary-text-color);
                text-decoration: none;
                -webkit-user-select: none;
                -moz-user-select: none;
                -ms-user-select: none;
                user-select: none;
            }
        </style>
    </template>
</dom-module>`;

document.head.appendChild($documentContainer.content);
