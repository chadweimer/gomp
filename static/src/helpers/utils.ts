import { createGesture, GestureDetail } from '@ionic/core';
import DOMPurify from 'dompurify';
import { AccessLevel, User, YesNoAny } from '../helpers/schema.gen';
import { SwipeDirection } from '../models';

export interface ComponentWithActivatedCallback {
  activatedCallback?: () => Promise<void>;
}

export function isNull<T>(val: T | null | undefined): val is null | undefined {
  return val === undefined || val === null;
}

export function isNullOrEmpty(val: string | null | undefined): val is '' | null | undefined {
  return isNull(val) || val === '';
}

export function formatDate(date: string | Date | null | undefined) {
  if (isNull(date)) {
    return '';
  }

  if (typeof date === 'string') {
    date = new Date(date);
  }

  const userLocale = navigator.languages?.length > 0
    ? navigator.languages[0]
    : navigator.language;
  return date.toLocaleString(userLocale, {
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
    hour: '2-digit',
    minute: '2-digit',
  });
}

export function isAuthorized(user: User | null | undefined, accessLevel: AccessLevel) {
  if (isNull(user)) {
    return false;
  }

  switch (accessLevel) {
    case AccessLevel.Admin:
      return user.accessLevel === AccessLevel.Admin;
    case AccessLevel.Editor:
      return user.accessLevel === AccessLevel.Editor || user.accessLevel === AccessLevel.Admin;
    case AccessLevel.Viewer:
      return user.accessLevel === AccessLevel.Viewer || user.accessLevel === AccessLevel.Editor || user.accessLevel === AccessLevel.Admin;
    default:
      return false;
  }
}

export async function redirect(route: string) {
  const router = document.querySelector('ion-router');
  await router?.push(route);
}

export function insertSpacesBetweenWords(val: string | null | undefined) {
  if (isNull(val)) {
    return '';
  }

  return val.replace(/([A-Z])/g, ' $1').trim()
}

export function enumKeyFromValue(keys: Record<string, string>, val: string | null | undefined) {
  if (isNull(val)) {
    return '';
  }

  return Object.keys(keys).find(key => keys[key] === val);
}

export function toYesNoAny(value: boolean | null) {
  switch (value) {
    case true:
      return YesNoAny.Yes;

    case false:
      return YesNoAny.No;

    default:
      return YesNoAny.Any;
  }
}

export function fromYesNoAny(value: YesNoAny) {
  switch (value) {
    case YesNoAny.Yes:
      return true;

    case YesNoAny.No:
      return false;

    default:
      return null;
  }
}

export function createSwipeGesture(el: HTMLElement, handler: (swipe: SwipeDirection) => void) {
  return createGesture({
    el: el,
    threshold: 30,
    gestureName: 'swipe',
    onEnd: e => {
      const swipe = getSwipe(e);
      if (isNullOrEmpty(swipe)) return;

      handler(swipe);
    }
  });
}

function getSwipe(e: GestureDetail): SwipeDirection | undefined {
  if (Math.abs(e.velocityX) < 0.1) {
    return undefined
  }

  if (e.deltaX < 0) {
    return SwipeDirection.Left;
  }

  return SwipeDirection.Right;
}

async function getActiveComponent(router: HTMLIonRouterOutletElement | HTMLIonTabsElement) {
  const routeId = await router.getRouteId();
  if (isNull(routeId)) {
    return undefined;
  }

  if ('getTab' in router) {
    const tab = await router.getTab(routeId.id);
    if (!isNull(tab?.component)) {
      if (tab.component instanceof HTMLElement) {
        return tab.component;
      } else if (typeof tab.component === 'string') {
        return tab.querySelector(tab.component);
      }
    }
  }
  return routeId.element;
}

export async function sendActivatedCallback(router: HTMLIonRouterOutletElement | HTMLIonTabsElement) {
  // Let the current page know it's being deactivated
  const el = await getActiveComponent(router) as ComponentWithActivatedCallback | null | undefined;
  if (!isNull(el)) {
    await el.activatedCallback?.();
  }
}

export function preProcessMultilineText(text: string | null | undefined) {
  // This function exists to handle backward compatibility with older versions.
  // Before the introduction of the WYSIWYG edtior,
  // all text was rendered as the original text with whitespace preserved.

  if (isNull(text)) {
    return '';
  }

  // Return early if there are no newlines in the text.
  if (!text.includes('\n') && !text.includes('\r')) {
    return text;
  }

  // Convert all newlines to <br> tags.
  text = text.replace(/(\r\n|\r|\n)/g, '<br>');

  // Preserve all consecutive spaces.
  text = text.replace(/\s{2,}/gm, match => {
    // Replace multiple spaces with alternating &nbsp; and space characters.
    // This is to ensure that the text is rendered with the same whitespace as before,
    // while maintaining the ability for the text to be wrapped.
    return match.split('').map((char, index) => {
      return index % 2 === 0 ? '&nbsp;' : char;
    }).join('');
  });

  return text;
}

export function sanitizeHTML(html: string) {
  // Sanitize the HTML using DOMPurify to prevent XSS attacks.
  // Forbid the use of style attributes and style tags.
  // Also forbid span tags to prevent inline styles.
  return DOMPurify.sanitize(html, {
    FORBID_ATTR: ['style'],
    FORBID_TAGS: ['style', 'span'],
    ADD_ATTR: ['target', 'data-image'],
  });
}

export function toStorageHtml(host: Element, value: string | null | undefined): string {
  if (isNullOrEmpty(value)) {
    return '';
  }

  const template = host.ownerDocument.createElement('template');
  template.innerHTML = value;
  const images = template.content.querySelectorAll('img');
  images.forEach(img => {
    const imageName = img.dataset.image;
    if (imageName) {
      img.replaceWith(`{{image:${imageName}}}`);
    }
  });
  return sanitizeHTML(template.innerHTML);
}

export function toPresentationHtml(
  host: Element,
  value: string | null | undefined,
  recipeId: number | null | undefined,
  clickable = true
): string {
  if (isNullOrEmpty(value)) {
    return '';
  }

  value = preProcessMultilineText(value);
  value = value.replace(/\{\{image:([^}]+)\}\}/g, (_match, imageName: string) => {
    const thumbUrl = getRecipeThumbnailUrl(recipeId, imageName);
    const template = host.ownerDocument.createElement('template');
    const img = createImageElement(host, imageName, thumbUrl);

    if (!clickable) {
      template.content.appendChild(img);
    } else {
      const fullUrl = getRecipeImageUrl(recipeId, imageName);
      const a = host.ownerDocument.createElement('a');
      a.href = fullUrl;
      a.target = '_blank';
      a.relList.add('noopener', 'noreferrer');
      a.appendChild(img);
      template.content.appendChild(a);
    }
    return template.innerHTML;;
  });
  return sanitizeHTML(value);
}

export function createImageElement(host: Element, imageName: string, src: string): HTMLImageElement {
  const img = host.ownerDocument.createElement('img');
  img.loading = 'lazy';
  img.src = src;
  img.alt = imageName;
  img.dataset.image = imageName;
  return img;
}

export function scaleValue(value: number | null | undefined, divider: number, decimalPlaces: number) {
  return ((value ?? 0) / divider).toFixed(decimalPlaces);
}

export function getRecipeImageUrl(recipeId: number | null | undefined, imageName: string | null | undefined) {
  if (isNull(recipeId) || isNull(imageName)) {
    return '';
  }

  const encodedName = encodeURIComponent(imageName);
  return `/uploads/recipes/${recipeId}/images/${encodedName}`;
}

export function getRecipeThumbnailUrl(recipeId: number | null | undefined, imageName: string | null | undefined) {
  if (isNull(recipeId) || isNull(imageName)) {
    return '';
  }

  const encodedName = encodeURIComponent(imageName);
  return `/uploads/recipes/${recipeId}/thumbs/${encodedName}`;
}

export async function trap<T>(op: () => Promise<T>, failVal: T): Promise<T> {
  try {
    return await op();
  } catch (ex) {
    console.error(ex);
    return failVal;
  }
}

export function getAllShadowParents(el: Element): ShadowRoot[] {
  const shadows: ShadowRoot[] = [];
  let rootNode = el.getRootNode();
  while (rootNode instanceof ShadowRoot) {
    shadows.push(rootNode);
    rootNode = rootNode.host.getRootNode();
  }
  return shadows;
}
