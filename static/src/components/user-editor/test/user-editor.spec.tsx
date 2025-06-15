import { h } from '@stencil/core';
import { newSpecPage } from '@stencil/core/testing';
import { UserEditor } from '../user-editor';
import { AccessLevel, User } from '../../../generated';

describe('user-editor', () => {
  it('builds', async () => {
    const page = await newSpecPage({
      components: [UserEditor],
      html: '<user-editor></user-editor>',
    });
    expect(page.rootInstance).toBeInstanceOf(UserEditor);
  });

  it('defaults', async () => {
    const page = await newSpecPage({
      components: [UserEditor],
      html: '<user-editor></user-editor>',
    });
    const component = page.rootInstance as UserEditor;
    expect(component.user.id).toBeUndefined();
    expect(component.user.username).toEqual('');
    expect(component.user.accessLevel).toEqual(AccessLevel.Editor);
    const usernameInput = page.root.shadowRoot.querySelector('ion-input[type=\'email\']');
    expect(usernameInput).not.toBeNull();
    expect(usernameInput).toEqualAttribute('value', '');
    const accessLevelSelect = page.root.shadowRoot.querySelector('ion-select');
    expect(accessLevelSelect).not.toBeNull();
    expect(accessLevelSelect).toEqualAttribute('value', AccessLevel.Editor);
  });

  it('bind to user', async () => {
    const user: User = {
      id: 1,
      username: 'someone@example.com',
      accessLevel: AccessLevel.Admin,
    };
    const page = await newSpecPage({
      components: [UserEditor],
      template: () => (<user-editor user={user}></user-editor>),
    });
    const component = page.rootInstance as UserEditor;
    expect(component.user).toEqual(user);
    const usernameInput = page.root.shadowRoot.querySelector('ion-input[type=\'email\']');
    expect(usernameInput).not.toBeNull();
    expect(usernameInput).toEqualAttribute('value', user.username);
    const accessLevelSelect = page.root.shadowRoot.querySelector('ion-select');
    expect(accessLevelSelect).not.toBeNull();
    expect(accessLevelSelect).toEqualAttribute('value', user.accessLevel);
  });

  it('shows passwords', async () => {
    const user: User = {
      id: null,
      username: 'someone@example.com',
      accessLevel: AccessLevel.Editor,
    };
    const page = await newSpecPage({
      components: [UserEditor],
      template: () => (<user-editor user={user}></user-editor>),
    });
    const component = page.rootInstance as UserEditor;
    expect(component.user).toEqual(user);
    const passwordInput = page.root.shadowRoot.querySelector('ion-input[type=\'password\']');
    expect(passwordInput).not.toBeNull();
  });

  it('hides passwords', async () => {
    const user: User = {
      id: 1,
      username: 'someone@example.com',
      accessLevel: AccessLevel.Editor,
    };
    const page = await newSpecPage({
      components: [UserEditor],
      template: () => (<user-editor user={user}></user-editor>),
    });
    const component = page.rootInstance as UserEditor;
    expect(component.user).toEqual(user);
    const passwordInput = page.root.shadowRoot.querySelector('ion-input[type=\'password\']');
    expect(passwordInput).toBeNull();
  });
});
