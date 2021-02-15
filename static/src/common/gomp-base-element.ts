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

    // eslint-disable-next-line @typescript-eslint/no-unused-vars
    protected isActiveChanged(_: boolean) {
        // Nothing to do in base
    }

    protected getCanEdit(user: User): boolean {
        if (!user?.accessLevel) {
            return false;
        }

        return user.accessLevel === 'admin' || user.accessLevel === 'editor';
    }

    protected areEqual(a: any, b: any) {
        return a === b;
    }

    protected formatDate(dateStr: string) {
        return new Date(dateStr).toLocaleDateString();
    }

    protected async AjaxGet(url: string, queryObj?: any) {
        const query = new URLSearchParams(queryObj);
        const fullUrl = `${url}?${query.toString()}`;

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
            body: JSON.stringify(body)
        };
        return await this.ajaxFetch(url, init);
    }

    protected async AjaxPost<TBody>(url: string, body: TBody) {
        const init: RequestInit = {
            method: 'POST',
            body: JSON.stringify(body)
        };
        return await this.ajaxFetch(url, init);
    }

    protected async AjaxPostWithLocation<TBody>(url: string, body: TBody) {
        const resp = await this.AjaxPost(url, body);
        return resp.headers.get('Location');
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
        const shouldProceed = this.dispatchEvent(new CustomEvent('ajax-presend', {bubbles: true, composed: true, cancelable: true, detail: {options: init}}));
        if (!shouldProceed) {
            return null;
        }

        try {
            const resp = await fetch(url, init);
            this.dispatchEvent(new CustomEvent('ajax-response', {bubbles: true, composed: true, detail: resp}));

            return resp;
        } catch (e) {
            this.dispatchEvent(new CustomEvent('ajax-error', {bubbles: true, composed: true, detail: e}));
            throw e;
        }
    }
}
