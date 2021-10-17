export async function ajaxGet<TResult>(target: EventTarget, url: string, queryObj?: any): Promise<TResult | undefined> {
  const queryString = convertToQueryString(queryObj);
  const fullUrl = `${url}?${queryString}`;

  const init: RequestInit = {};
  const resp = await ajaxFetch(target, fullUrl, init);
  if (resp.status === 404) {
    return undefined;
  }
  const result = await resp.json() as TResult;
  return result;
}

export async function ajaxPut<TBody>(target: EventTarget, url: string, body: TBody) {
  const init: RequestInit = {
    method: 'PUT',
    body: body instanceof FormData
      ? body
      : JSON.stringify(body)
  };
  return await ajaxFetch(target, url, init);
}

export async function ajaxPost<TBody>(target: EventTarget, url: string, body: TBody) {
  const init: RequestInit = {
    method: 'POST',
    body: body instanceof FormData
      ? body
      : JSON.stringify(body)
  };
  return await ajaxFetch(target, url, init);
}

export async function ajaxPostWithLocation<TBody>(target: EventTarget, url: string, body: TBody) {
  const resp = await ajaxPost(target, url, body);
  return resp.headers.get('Location') ?? '';
}

export async function ajaxPostWithResult<TBody, TResult>(target: EventTarget, url: string, body: TBody) {
  const resp = await ajaxPost(target, url, body);
  const result = await resp.json() as TResult;
  return result;
}

export async function ajaxDelete(target: EventTarget, url: string) {
  const init: RequestInit = {
    method: 'DELETE'
  };
  return await ajaxFetch(target, url, init);
}

async function ajaxFetch(target: EventTarget, url: string, init: RequestInit) {
  const jwtToken = localStorage.getItem('jwtToken');
  if (jwtToken) {
    init.headers = { Authorization: 'Bearer ' + jwtToken };
  }

  target.dispatchEvent(new CustomEvent('ajax-presend', { bubbles: true, composed: true, detail: { options: init } }));

  let resp: Response | null = null;
  try {
    resp = await fetch(url, init);

    if (resp.ok || resp.status === 404) {
      target.dispatchEvent(new CustomEvent('ajax-response', { bubbles: true, composed: true, detail: resp }));
      return resp;
    } else {
      const errorMsg = await resp.text();
      throw new Error(`${resp.statusText}: ${errorMsg}`);
    }
  } catch (ex) {
    target.dispatchEvent(new CustomEvent('ajax-error', { bubbles: true, composed: true, detail: { error: ex, response: resp } }));
    throw ex;
  }
}

function convertToQueryString(obj: any) {
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
