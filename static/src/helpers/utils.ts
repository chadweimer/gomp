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

const ALLOWED_STYLE_PROPERTIES = new Set(['width', 'height', 'margin', 'margin-left', 'margin-right', 'margin-top', 'margin-bottom', 'display']);

DOMPurify.addHook('uponSanitizeAttribute', (_node, data) => {
  if (data.attrName === 'style') {
    const style = data.attrValue ?? '';
    const safeProps = style
      .split(';')
      .map(s => s.trim())
      .filter(s => {
        const [prop, val] = s.split(':').map(p => p.trim().toLowerCase());
        if (!prop || !val) return false;
        if (!ALLOWED_STYLE_PROPERTIES.has(prop)) return false;
        if (val.includes('url(') || val.includes('javascript:') || val.includes('expression')) return false;
        return true;
      });
    data.attrValue = safeProps.join('; ');
    if (!data.attrValue) {
      data.keepAttr = false;
    }
  }
});

export function sanitizeHTML(html: string) {
  // Sanitize the HTML using DOMPurify to prevent XSS attacks while allowing safe formatting.
  return DOMPurify.sanitize(html, {
    ALLOWED_TAGS: [
      'b', 'i', 'u', 's', 'strong', 'em', 'p', 'h1', 'h2', 'h3', 'h4', 'h5', 'h6',
      'ul', 'ol', 'li', 'br', 'span', 'a', 'img', 'div'
    ],
    ALLOWED_ATTR: ['href', 'target', 'rel', 'src', 'alt', 'data-image', 'data-width', 'data-height', 'class', 'style', 'loading'],
    ALLOW_DATA_ATTR: true,
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
      const parts = [`image:${imageName}`];
      const width = img.dataset.width || img.style.width;
      if (width) {
        parts.push(`width=${width}`);
      }
      const height = img.dataset.height || img.style.height;
      if (height) {
        parts.push(`height=${height}`);
      }
      const token = `{{${parts.join('|')}}}`;
      const parent = img.parentElement;
      if (parent?.tagName.toLowerCase() === 'a' && parent?.children.length === 1) {
        parent.replaceWith(token);
      } else {
        img.replaceWith(token);
      }
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
  value = value.replace(/\{\{image:([^}|]+)(?:\|([^}]+))?\}\}/g, (_match, imageName: string, attrString?: string) => {
    const url = getRecipeImageUrl(recipeId, imageName);
    const template = host.ownerDocument.createElement('template');

    let width: string | null = null;
    let height = '400px';
    if (attrString) {
      for (const part of attrString.split('|')) {
        const [k, v] = part.split('=');
        if (k === 'width' && v) {
          width = v;
        }
        if (k === 'height' && v) {
          height = v;
        }
      }
    }

    const img = createImageElement(host, imageName, url, width, height);

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
    return template.innerHTML;
  });
  return sanitizeHTML(value);
}

export function createImageElement(
  host: Element,
  imageName: string,
  src: string,
  width: string | null | undefined,
  height: string | null | undefined
): HTMLImageElement {
  const img = host.ownerDocument.createElement('img');
  img.loading = 'lazy';
  img.src = src;
  img.alt = imageName;
  img.dataset.image = imageName;
  if (width) {
    img.dataset.width = width;
    img.style.width = width.endsWith('%') || width.endsWith('px') ? width : `${width}px`;
  }
  if (height) {
    img.dataset.height = height;
    img.style.height = height.endsWith('%') || height.endsWith('px') ? height : `${height}px`;
  }
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
