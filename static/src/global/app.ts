import { setupConfig } from '@ionic/core';
import { register } from 'swiper/element/bundle';

const setup = () => {
  setupConfig({});
  register();
};

export default setup;
