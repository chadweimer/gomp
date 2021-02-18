import '@polymer/polymer/polymer-legacy.js';
import '@polymer/paper-styles/paper-styles.js';

const $documentContainer = document.createElement('template');
$documentContainer.innerHTML = `<dom-module id="shared-styles">
    <template>
        <style>
            /* Headings */
            h1 {
                @apply --paper-font-display2;
            }
            h2 {
                @apply --paper-font-display1;
            }
            h3 {
                @apply --paper-font-headline;
            }
            h4 {
                @apply --paper-font-title;
            }
            h5 {
                @apply --paper-font-subhead;
            }
            h6 {
                @apply --paper-font-body2;
            }
            header {
                @apply --paper-font-title;
            }

            /* HTML Controls */
            a {
                font-weight: 500;
                color: var(--primary-text-color);
                text-decoration: none;
                -webkit-user-select: none;
                -moz-user-select: none;
                -ms-user-select: none;
                user-select: none;
            }
            img.responsive {
                max-width: 100%;
                max-height: 20em;
                height: auto;
            }

            /* Web Components */
            iron-pages > :not(.iron-selected) {
                pointer-events: none;
            }
            paper-fab.green {
                --paper-fab-background: var(--paper-green-500);
                --paper-fab-keyboard-focus-background: var(--paper-green-900);
                position: fixed;
                bottom: 16px;
                right: 16px;
            }

            /* Padding and Margins */
            .padded-10 {
                padding: 10px;
            }

            /* Colors */
            .amber {
                color: var(--paper-amber-500);
            }
            .red {
                color: var(--paper-red-500);
            }
            .blue {
                color: var(--paper-blue-500);
            }
            .teal {
                color: var(--paper-teal-500);
            }
            .indigo {
                color: var(--paper-indigo-500);
            }

            /* Text Alignment */
            .text-left {
                text-align: left;
            }
            .text-right {
                text-align: right;
            }
            .text-center {
                text-align: center;
            }

            /* Table Layout */
            table.fill {
                width: 100%
            }

            /* Layout */
            .centered-horizontal {
                @apply --layout-horizontal;
                @apply --layout-center-justified;
            }
            .wrap-horizontal {
                @apply --layout-horizontal;
                @apply --layout-wrap;
            }
            .middle-vertical {
                vertical-align: middle;
            }

            @media screen and (min-width: 1200px) {
                paper-dialog {
                    width: 33%;
                }
            }
            @media screen and (min-width: 992px) and (max-width: 1199px) {
                paper-dialog {
                    width: 50%;
                }
            }
            @media screen and (min-width: 992px) {
                .hide-on-large-only {
                    display: none;
                }
                .container {
                    width: 50%;
                    margin: auto;
                }
                .container-wide {
                    width: 67%;
                    margin: auto;
                }
            }
            @media screen and (min-width: 600px) and (max-width: 991px) {
                paper-dialog {
                    width: 75%;
                }
                .container {
                    width: 75%;
                    margin: auto;
                }
                .container-wide {
                    width: 80%;
                    margin: auto;
                }
            }
            @media screen and (max-width: 991px) {
                .hide-on-med-and-down {
                    display: none;
                }
            }
            @media screen and (max-width: 599px) {
                .hide-on-small-only {
                    display: none;
                }
                paper-dialog {
                    width: 100%;
                }
            }
        </style>
    </template>
</dom-module>`;

document.head.appendChild($documentContainer.content);
