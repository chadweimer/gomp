import { h } from '@stencil/core';
import { newSpecPage } from '@stencil/core/testing';
import { UserEditor } from '../user-editor';
import { AccessLevel, User } from '../../../generated';

describe('user-editor', () => {
  it('builds', () => {
    expect(new UserEditor()).toBeTruthy();
  });

  it('defaults', async () => {
    const page = await newSpecPage({
      components: [UserEditor],
      html: '<user-editor></user-editor>',
    });
    const component = page.rootInstance as UserEditor;
    expect(component.user.id).toBeFalsy();
    expect(component.user.username).toEqual('');
    expect(component.user.accessLevel).toEqual(AccessLevel.Editor);
    const usernameInput = page.root.querySelector('ion-input[type=\'email\']');
    expect(usernameInput).toBeTruthy();
    expect(usernameInput).toEqualAttribute('value', '');
    const accessLevelSelect = page.root.querySelector('ion-select');
    expect(accessLevelSelect).toBeTruthy();
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
    const usernameInput = page.root.querySelector('ion-input[type=\'email\']');
    expect(usernameInput).toBeTruthy();
    expect(usernameInput).toEqualAttribute('value', user.username);
    const accessLevelSelect = page.root.querySelector('ion-select');
    expect(accessLevelSelect).toBeTruthy();
    expect(accessLevelSelect).toEqualAttribute('value', user.accessLevel);
  });

  it('shows passwords', async () => {
    const user: User = {
      id: undefined,
      username: 'someone@example.com',
      accessLevel: AccessLevel.Editor,
    };
    const page = await newSpecPage({
      components: [UserEditor],
      template: () => (<user-editor user={user}></user-editor>),
    });
    const component = page.rootInstance as UserEditor;
    expect(component.user).toEqual(user);
    const passwordInput = page.root.querySelector('ion-input[type=\'password\']');
    expect(passwordInput).toBeTruthy();
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
    const passwordInput = page.root.querySelector('ion-input[type=\'password\']');
    expect(passwordInput).toBeFalsy();
  });
});
