import { initialize } from '@ionic/core';
import { defineCustomElements } from '@ionic/core/loader';
import { setAssetPath } from 'ionicons';

import './global/app.css';
import './components/app-root/app-root.css';

// Configure asset path for Ionicons SVGs
setAssetPath('/static/');

// Initialize Ionic Framework
initialize({
  mode: 'md',
});
defineCustomElements(window, {
  resourcesUrl: '/static/',
});

// Register the root element
import './components/app-root/app-root';

