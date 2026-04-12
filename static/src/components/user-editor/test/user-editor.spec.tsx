import { render, h, describe, it, expect } from '@stencil/vitest';
import { AccessLevel, User } from '../../../generated';

describe('user-editor', () => {
  it('builds', async () => {
    const { root } = await render(<user-editor />);
    expect(root).toHaveClass('hydrated');
  });

  it('defaults', async () => {
    const { root } = await render<HTMLUserEditorElement>(<user-editor />);
    expect(root.user.id).toBeUndefined();
    expect(root.user.username).toEqual('');
    expect(root.user.accessLevel).toEqual(AccessLevel.Editor);
    const usernameInput = root.shadowRoot?.querySelector('input[type=\'email\']');
    expect(usernameInput).not.toBeNull();
    expect(usernameInput).toHaveProperty('value', '');
    const accessLevelSelect = root.shadowRoot?.querySelector('ion-select');
    expect(accessLevelSelect).not.toBeNull();
    expect(accessLevelSelect).toHaveProperty('value', AccessLevel.Editor);
  });

  it('bind to user', async () => {
    const user: User = {
      id: 1,
      username: 'someone@example.com',
      accessLevel: AccessLevel.Admin,
    };
    const { root } = await render(<user-editor user={user} />);
    expect(root).toHaveProperty('user', user);
    const usernameInput = root.shadowRoot?.querySelector('input[type=\'email\']');
    expect(usernameInput).not.toBeNull();
    expect(usernameInput).toHaveProperty('value', user.username);
    const accessLevelSelect = root.shadowRoot?.querySelector('ion-select');
    expect(accessLevelSelect).not.toBeNull();
    expect(accessLevelSelect).toHaveProperty('value', user.accessLevel);
  });

  it('shows passwords', async () => {
    const user: User = {
      username: 'someone@example.com',
      accessLevel: AccessLevel.Editor,
    };
    const { root } = await render(<user-editor user={user} />);
    expect(root).toHaveProperty('user', user);
    const passwordInput = root.shadowRoot?.querySelector('input[type=\'password\']');
    expect(passwordInput).not.toBeNull();
  });

  it('hides passwords', async () => {
    const user: User = {
      id: 1,
      username: 'someone@example.com',
      accessLevel: AccessLevel.Editor,
    };
    const { root } = await render(<user-editor user={user} />);
    expect(root).toHaveProperty('user', user);
    const passwordInput = root.shadowRoot?.querySelector('input[type=\'password\']');
    expect(passwordInput).toBeNull();
  });
});
