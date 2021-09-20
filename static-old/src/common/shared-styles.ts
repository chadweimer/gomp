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
            span.chip {
                display: inline-block;
                padding: 4px 8px;
                border-radius: 16px;
                margin: 4px;
                background-color: var(--paper-grey-300);
                font-size: 12px;
            }
            span.chip.selectable {
                cursor: pointer;
            }
            span.chip.selectable:hover {
                background-color: var(--paper-grey-400);
            }
            span.chip.green {
                background-color: var(--paper-green-100) !important;
            }
            span.chip.green:hover {
                color: white !important;
                background-color: var(--paper-green-500) !important;
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
            mwc-checkbox {
                --mdc-theme-secondary: var(--mdc-theme-primary);
            }

            /* Padding and Margins */
            .padded-10 {
                padding: 10px;
            }
            .item-inset {
                padding-left: 16px;
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
            li[divider] {
                list-style: none;
                height: 0;
                margin: 0;
                border: none;
                border-bottom-width: 1px;
                border-bottom-style: solid;
                border-bottom-color: rgba(0, 0, 0, 0.12);
            }
            .fill {
                width: 100%;
            }

            @media screen and (min-width: 1200px) {
                mwc-dialog {
                    --mdc-dialog-min-width: 33vw;
                }
            }
            @media screen and (min-width: 992px) and (max-width: 1199px) {
                mwc-dialog {
                    --mdc-dialog-min-width: 50vw;
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
                mwc-dialog {
                    --mdc-dialog-min-width: 75vw;
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
                mwc-dialog {
                    --mdc-dialog-min-width: 95vw;
                }
            }
        </style>
    </template>
</dom-module>`;

document.head.appendChild($documentContainer.content);
