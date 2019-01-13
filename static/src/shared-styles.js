import '@polymer/polymer/polymer-legacy.js';
import '@polymer/paper-styles/paper-styles.js';
const $_documentContainer = document.createElement('template');

$_documentContainer.innerHTML = `<dom-module id="shared-styles">
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
                color: #212121;
                text-decoration: none;
            }
        </style>
    </template>
</dom-module>`;

document.head.appendChild($_documentContainer.content);

/* shared styles for all views */
/*
  FIXME(polymer-modulizer): the above comments were extracted
  from HTML and may be out of place here. Review them and
  then delete this comment!
*/
;
