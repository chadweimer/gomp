'use strict';
import { PolymerElement } from '@polymer/polymer/polymer-element.js';
import { property } from '@polymer/decorators';
import { User } from '../models/models.js';

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

    protected getCanEdit(user: User|null): boolean {
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
}
