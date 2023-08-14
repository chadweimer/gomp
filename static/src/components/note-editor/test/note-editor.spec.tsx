import { newSpecPage } from '@stencil/core/testing';
import { NoteEditor } from '../note-editor';

describe('note-editor', () => {
  it('builds', () => {
    expect(new NoteEditor()).toBeTruthy();
  });
});
