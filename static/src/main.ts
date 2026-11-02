import { initialize } from '@ionic/core';
import { defineCustomElements } from '@ionic/core/loader';

import './global/app.css';

// Initialize Ionic Framework
initialize({
  mode: 'md',
});
void defineCustomElements(window, {
  resourcesUrl: '/static/',
});

// Register the root element
import './components/app-root/app-root';
