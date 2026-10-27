import { css, unsafeCSS } from 'lit';
import appStyles from './app.css?inline';

export const globalStyles = css`${unsafeCSS(appStyles)}`;
