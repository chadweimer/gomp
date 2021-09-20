import { PolymerElement } from '@polymer/polymer/polymer-element.js';
import { property } from '@polymer/decorators';
import { User } from '../models/models.js';
import { Dialog } from '@material/mwc-dialog';
import { TextArea } from '@material/mwc-textarea';
import { TextField } from '@material/mwc-textfield';

export abstract class GompBaseElement extends PolymerElement {
    @property({type: Boolean, notify: true})
    protected isReady = false;
    @property({type: Boolean, notify: true, reflectToAttribute: true, observer: 'isActiveChanged'})
    protected isActive = false;

    public ready() {
        super.ready();

        this.isReady = true;
    }

    protected showToast(message: string) {
        this.dispatchEvent(new CustomEvent('show-toast', {bubbles: true, composed: true, detail: {message}}));
    }

    protected navigateTo(url: string) {
        this.dispatchEvent(
            new CustomEvent('change-page', {bubbles: true, composed: true, detail: {url: url}}));
    }

    // eslint-disable-next-line @typescript-eslint/no-unused-vars
    protected isActiveChanged(_: boolean) {
        // Nothing to do in base
    }

    protected getCanEdit(user: User|null|undefined): boolean {
        if (!user?.accessLevel) {
            return false;
        }

        return user.accessLevel === 'admin' || user.accessLevel === 'editor';
    }

    protected areEqual(a: any, b: any) {
        return a == b;
    }

    protected isIn(a: any, ...b: any[]) {
        return b.includes(a);
    }
    protected isInArray(a: any, b: any[]) {
        return b.includes(a);
    }

    protected formatDate(dateStr: string) {
        return new Date(dateStr).toLocaleDateString();
    }

    protected hackDialogForInnerOverlays(dialog: Dialog) {
        // WORKAROUND: Allow the suggestion overlay to leave the dialog bounds
        const surface = dialog.shadowRoot?.querySelector('.mdc-dialog__surface') as HTMLElement;
        if (surface) {
            surface.style.overflow = 'visible';
        }
        const content = dialog.shadowRoot?.querySelector('.mdc-dialog__content') as HTMLElement;
        if (content) {
            content.style.overflow = 'visible';
        }
    }

    protected async hackAutoSizeTextarea(textArea: TextArea, minRows = 1, maxRows: number|undefined = undefined) {
        const inner = textArea.shadowRoot?.querySelector('textarea');
        if (!inner) return;

        inner.rows = minRows;
        await null;
        while (inner.scrollHeight > inner.offsetHeight && (!maxRows || inner.rows < maxRows)) {
            inner.rows++;
            await null;
        }
    }

    protected async AjaxGet(url: string, queryObj?: any) {
        const queryString = this.convertToQueryString(queryObj);
        const fullUrl = `${url}?${queryString}`;

        const init: RequestInit = {};
        return await this.ajaxFetch(fullUrl, init);
    }

    protected async AjaxGetWithResult<TResult>(url: string, queryObj?: any) {
        const resp = await this.AjaxGet(url, queryObj);
        const result = await resp.json() as TResult;
        return result;
    }

    protected async AjaxPut<TBody>(url: string, body: TBody) {
        const init: RequestInit = {
            method: 'PUT',
            body: body instanceof FormData
                ? body
                : JSON.stringify(body)
        };
        return await this.ajaxFetch(url, init);
    }

    protected async AjaxPost<TBody>(url: string, body: TBody) {
        const init: RequestInit = {
            method: 'POST',
            body: body instanceof FormData
                ? body
                : JSON.stringify(body)
        };
        return await this.ajaxFetch(url, init);
    }

    protected async AjaxPostWithLocation<TBody>(url: string, body: TBody) {
        const resp = await this.AjaxPost(url, body);
        return resp.headers.get('Location') ?? '';
    }

    protected async AjaxPostWithResult<TBody, TResult>(url: string, body: TBody) {
        const resp = await this.AjaxPost(url, body);
        const result = await resp.json() as TResult;
        return result;
    }

    protected async AjaxDelete(url: string) {
        const init: RequestInit = {
            method: 'DELETE'
        };
        return await this.ajaxFetch(url, init);
    }

    private async ajaxFetch(url: string, init?: RequestInit) {
        this.dispatchEvent(new CustomEvent('ajax-presend', {bubbles: true, composed: true, detail: {options: init}}));

        let resp: Response|null = null;
        try {
            resp = await fetch(url, init);

            if (resp.ok) {
                this.dispatchEvent(new CustomEvent('ajax-response', {bubbles: true, composed: true, detail: resp}));
                return resp;
            } else {
                const errorMsg = await resp.text();
                throw new Error(`${resp.statusText}: ${errorMsg}`);
            }
        } catch (e) {
            this.dispatchEvent(new CustomEvent('ajax-error', {bubbles: true, composed: true, detail: {error: e, response: resp}}));
            throw e;
        }
    }

    private convertToQueryString(obj: any) {
        const queryParts = [];

        for (let param in obj) {
            const value = obj[param];
            param = encodeURIComponent(param);

            if (Array.isArray(value)) {
                value.forEach(item => queryParts.push(param + '=' + encodeURIComponent(item)));
            } else if (value !== null) {
                queryParts.push(param + '=' + encodeURIComponent(value));
            } else {
                queryParts.push(param);
            }
        }

        return queryParts.join('&');
    }

    protected getRequiredTextFieldValue(field: TextField): string|undefined {
        const val = field.value.trim();
        if (val === '') {
            field.setCustomValidity('Required');
            field.reportValidity();
            return undefined;
        } else {
            field.setCustomValidity('');
            field.reportValidity();
            return val;
        }
    }
}
