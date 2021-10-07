/* eslint-disable */
/* tslint:disable */
/**
 * This is an autogenerated file created by the Stencil compiler.
 * It contains typing information for all components that exist in this project.
 */
import { HTMLStencilElement, JSXBase } from "@stencil/core/internal";
import { Note, Recipe, RecipeCompact, RecipeState, SearchFilter, SortBy, User, UserSettings } from "./models";
export namespace Components {
    interface AppRoot {
    }
    interface FiveStarRating {
        "disabled": boolean;
        "icon": string;
        "size": string;
        "value": number;
    }
    interface ImageUploadBrowser {
    }
    interface NoteEditor {
        "note": Note;
    }
    interface PageAdmin {
    }
    interface PageHome {
        "activatedCallback": () => Promise<void>;
        "userSettings": UserSettings | null;
    }
    interface PageLogin {
    }
    interface PageRecipe {
        "activatedCallback": () => Promise<void>;
        "recipeId": number;
    }
    interface PageSearch {
        "activatedCallback": () => Promise<void>;
        "deactivatingCallback": () => Promise<void>;
        "performSearch": () => Promise<void>;
    }
    interface PageSettings {
    }
    interface RecipeCard {
        "recipe": RecipeCompact;
        "size": 'large' | 'small';
    }
    interface RecipeEditor {
        "recipe": Recipe;
    }
    interface RecipeStateSelector {
        "selectedStates": RecipeState[];
    }
    interface SearchFilterEditor {
        "name": string;
        "prompt": string;
        "searchFilter": SearchFilter;
        "showName": boolean;
    }
    interface SortBySelector {
        "sortBy": SortBy;
    }
    interface UserEditor {
        "user": User;
    }
}
declare global {
    interface HTMLAppRootElement extends Components.AppRoot, HTMLStencilElement {
    }
    var HTMLAppRootElement: {
        prototype: HTMLAppRootElement;
        new (): HTMLAppRootElement;
    };
    interface HTMLFiveStarRatingElement extends Components.FiveStarRating, HTMLStencilElement {
    }
    var HTMLFiveStarRatingElement: {
        prototype: HTMLFiveStarRatingElement;
        new (): HTMLFiveStarRatingElement;
    };
    interface HTMLImageUploadBrowserElement extends Components.ImageUploadBrowser, HTMLStencilElement {
    }
    var HTMLImageUploadBrowserElement: {
        prototype: HTMLImageUploadBrowserElement;
        new (): HTMLImageUploadBrowserElement;
    };
    interface HTMLNoteEditorElement extends Components.NoteEditor, HTMLStencilElement {
    }
    var HTMLNoteEditorElement: {
        prototype: HTMLNoteEditorElement;
        new (): HTMLNoteEditorElement;
    };
    interface HTMLPageAdminElement extends Components.PageAdmin, HTMLStencilElement {
    }
    var HTMLPageAdminElement: {
        prototype: HTMLPageAdminElement;
        new (): HTMLPageAdminElement;
    };
    interface HTMLPageHomeElement extends Components.PageHome, HTMLStencilElement {
    }
    var HTMLPageHomeElement: {
        prototype: HTMLPageHomeElement;
        new (): HTMLPageHomeElement;
    };
    interface HTMLPageLoginElement extends Components.PageLogin, HTMLStencilElement {
    }
    var HTMLPageLoginElement: {
        prototype: HTMLPageLoginElement;
        new (): HTMLPageLoginElement;
    };
    interface HTMLPageRecipeElement extends Components.PageRecipe, HTMLStencilElement {
    }
    var HTMLPageRecipeElement: {
        prototype: HTMLPageRecipeElement;
        new (): HTMLPageRecipeElement;
    };
    interface HTMLPageSearchElement extends Components.PageSearch, HTMLStencilElement {
    }
    var HTMLPageSearchElement: {
        prototype: HTMLPageSearchElement;
        new (): HTMLPageSearchElement;
    };
    interface HTMLPageSettingsElement extends Components.PageSettings, HTMLStencilElement {
    }
    var HTMLPageSettingsElement: {
        prototype: HTMLPageSettingsElement;
        new (): HTMLPageSettingsElement;
    };
    interface HTMLRecipeCardElement extends Components.RecipeCard, HTMLStencilElement {
    }
    var HTMLRecipeCardElement: {
        prototype: HTMLRecipeCardElement;
        new (): HTMLRecipeCardElement;
    };
    interface HTMLRecipeEditorElement extends Components.RecipeEditor, HTMLStencilElement {
    }
    var HTMLRecipeEditorElement: {
        prototype: HTMLRecipeEditorElement;
        new (): HTMLRecipeEditorElement;
    };
    interface HTMLRecipeStateSelectorElement extends Components.RecipeStateSelector, HTMLStencilElement {
    }
    var HTMLRecipeStateSelectorElement: {
        prototype: HTMLRecipeStateSelectorElement;
        new (): HTMLRecipeStateSelectorElement;
    };
    interface HTMLSearchFilterEditorElement extends Components.SearchFilterEditor, HTMLStencilElement {
    }
    var HTMLSearchFilterEditorElement: {
        prototype: HTMLSearchFilterEditorElement;
        new (): HTMLSearchFilterEditorElement;
    };
    interface HTMLSortBySelectorElement extends Components.SortBySelector, HTMLStencilElement {
    }
    var HTMLSortBySelectorElement: {
        prototype: HTMLSortBySelectorElement;
        new (): HTMLSortBySelectorElement;
    };
    interface HTMLUserEditorElement extends Components.UserEditor, HTMLStencilElement {
    }
    var HTMLUserEditorElement: {
        prototype: HTMLUserEditorElement;
        new (): HTMLUserEditorElement;
    };
    interface HTMLElementTagNameMap {
        "app-root": HTMLAppRootElement;
        "five-star-rating": HTMLFiveStarRatingElement;
        "image-upload-browser": HTMLImageUploadBrowserElement;
        "note-editor": HTMLNoteEditorElement;
        "page-admin": HTMLPageAdminElement;
        "page-home": HTMLPageHomeElement;
        "page-login": HTMLPageLoginElement;
        "page-recipe": HTMLPageRecipeElement;
        "page-search": HTMLPageSearchElement;
        "page-settings": HTMLPageSettingsElement;
        "recipe-card": HTMLRecipeCardElement;
        "recipe-editor": HTMLRecipeEditorElement;
        "recipe-state-selector": HTMLRecipeStateSelectorElement;
        "search-filter-editor": HTMLSearchFilterEditorElement;
        "sort-by-selector": HTMLSortBySelectorElement;
        "user-editor": HTMLUserEditorElement;
    }
}
declare namespace LocalJSX {
    interface AppRoot {
    }
    interface FiveStarRating {
        "disabled"?: boolean;
        "icon"?: string;
        "onValueSelected"?: (event: CustomEvent<number>) => void;
        "size"?: string;
        "value"?: number;
    }
    interface ImageUploadBrowser {
    }
    interface NoteEditor {
        "note"?: Note;
    }
    interface PageAdmin {
    }
    interface PageHome {
        "userSettings"?: UserSettings | null;
    }
    interface PageLogin {
    }
    interface PageRecipe {
        "recipeId"?: number;
    }
    interface PageSearch {
    }
    interface PageSettings {
    }
    interface RecipeCard {
        "recipe"?: RecipeCompact;
        "size"?: 'large' | 'small';
    }
    interface RecipeEditor {
        "recipe"?: Recipe;
    }
    interface RecipeStateSelector {
        "onSelectedStatesChanged"?: (event: CustomEvent<RecipeState[]>) => void;
        "selectedStates"?: RecipeState[];
    }
    interface SearchFilterEditor {
        "name"?: string;
        "prompt"?: string;
        "searchFilter"?: SearchFilter;
        "showName"?: boolean;
    }
    interface SortBySelector {
        "onSortByChanged"?: (event: CustomEvent<SortBy>) => void;
        "sortBy"?: SortBy;
    }
    interface UserEditor {
        "user"?: User;
    }
    interface IntrinsicElements {
        "app-root": AppRoot;
        "five-star-rating": FiveStarRating;
        "image-upload-browser": ImageUploadBrowser;
        "note-editor": NoteEditor;
        "page-admin": PageAdmin;
        "page-home": PageHome;
        "page-login": PageLogin;
        "page-recipe": PageRecipe;
        "page-search": PageSearch;
        "page-settings": PageSettings;
        "recipe-card": RecipeCard;
        "recipe-editor": RecipeEditor;
        "recipe-state-selector": RecipeStateSelector;
        "search-filter-editor": SearchFilterEditor;
        "sort-by-selector": SortBySelector;
        "user-editor": UserEditor;
    }
}
export { LocalJSX as JSX };
declare module "@stencil/core" {
    export namespace JSX {
        interface IntrinsicElements {
            "app-root": LocalJSX.AppRoot & JSXBase.HTMLAttributes<HTMLAppRootElement>;
            "five-star-rating": LocalJSX.FiveStarRating & JSXBase.HTMLAttributes<HTMLFiveStarRatingElement>;
            "image-upload-browser": LocalJSX.ImageUploadBrowser & JSXBase.HTMLAttributes<HTMLImageUploadBrowserElement>;
            "note-editor": LocalJSX.NoteEditor & JSXBase.HTMLAttributes<HTMLNoteEditorElement>;
            "page-admin": LocalJSX.PageAdmin & JSXBase.HTMLAttributes<HTMLPageAdminElement>;
            "page-home": LocalJSX.PageHome & JSXBase.HTMLAttributes<HTMLPageHomeElement>;
            "page-login": LocalJSX.PageLogin & JSXBase.HTMLAttributes<HTMLPageLoginElement>;
            "page-recipe": LocalJSX.PageRecipe & JSXBase.HTMLAttributes<HTMLPageRecipeElement>;
            "page-search": LocalJSX.PageSearch & JSXBase.HTMLAttributes<HTMLPageSearchElement>;
            "page-settings": LocalJSX.PageSettings & JSXBase.HTMLAttributes<HTMLPageSettingsElement>;
            "recipe-card": LocalJSX.RecipeCard & JSXBase.HTMLAttributes<HTMLRecipeCardElement>;
            "recipe-editor": LocalJSX.RecipeEditor & JSXBase.HTMLAttributes<HTMLRecipeEditorElement>;
            "recipe-state-selector": LocalJSX.RecipeStateSelector & JSXBase.HTMLAttributes<HTMLRecipeStateSelectorElement>;
            "search-filter-editor": LocalJSX.SearchFilterEditor & JSXBase.HTMLAttributes<HTMLSearchFilterEditorElement>;
            "sort-by-selector": LocalJSX.SortBySelector & JSXBase.HTMLAttributes<HTMLSortBySelectorElement>;
            "user-editor": LocalJSX.UserEditor & JSXBase.HTMLAttributes<HTMLUserEditorElement>;
        }
    }
}
