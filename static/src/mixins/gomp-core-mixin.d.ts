/**
 * DO NOT EDIT
 *
 * This file was automatically generated by
 *   https://github.com/Polymer/tools/tree/master/packages/gen-typescript-declarations
 *
 * To modify these typings, edit the source file(s):
 *   src/mixins/gomp-core-mixin.js
 */


// tslint:disable:variable-name Describing an API that's defined elsewhere.
// tslint:disable:no-any describes the API as best we are able today

import {dedupingMixin} from '@polymer/polymer/lib/utils/mixin.js';

export {GompCoreMixin};


/**
 * Base behavior behind most of the elements in the application.
 */
declare function GompCoreMixin<T extends new (...args: any[]) => {}>(base: T): T & GompCoreMixinConstructor;

interface GompCoreMixinConstructor {
  new(...args: any[]): GompCoreMixin;
}

export {GompCoreMixinConstructor};

interface GompCoreMixin {
  isReady: boolean|null|undefined;
  isActive: boolean|null|undefined;
  ready(): void;
  showToast(message: any): void;
  _isNullOrEmpty(val: any): any;
  _isActiveChanged(isActive: any): void;
}
