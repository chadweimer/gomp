/* eslint-disable */
/* tslint:disable */
/**
 * This is an autogenerated file created by the Stencil compiler.
 * It contains typing information for all components that exist in this project.
 */
import { HTMLStencilElement, JSXBase } from "@stencil/core/internal";
import { Recipe, RecipeCompact, User, UserSettings } from "./models";
export namespace Components {
    interface AppRoot {
    }
    interface PageAdmin {
    }
    interface PageEditRecipe {
    }
    interface PageHome {
        "userSettings": UserSettings | null;
    }
    interface PageLogin {
    }
    interface PageRecipes {
    }
    interface PageSearch {
    }
    interface PageSettings {
    }
    interface PageViewRecipe {
        "recipeId": number;
    }
    interface RecipeCard {
        "recipe": RecipeCompact | null;
    }
    interface RecipeEditor {
        "recipe": Recipe | null;
    }
    interface UserEditor {
        "user": User | null;
    }
}
declare global {
    interface HTMLAppRootElement extends Components.AppRoot, HTMLStencilElement {
    }
    var HTMLAppRootElement: {
        prototype: HTMLAppRootElement;
        new (): HTMLAppRootElement;
    };
    interface HTMLPageAdminElement extends Components.PageAdmin, HTMLStencilElement {
    }
    var HTMLPageAdminElement: {
        prototype: HTMLPageAdminElement;
        new (): HTMLPageAdminElement;
    };
    interface HTMLPageEditRecipeElement extends Components.PageEditRecipe, HTMLStencilElement {
    }
    var HTMLPageEditRecipeElement: {
        prototype: HTMLPageEditRecipeElement;
        new (): HTMLPageEditRecipeElement;
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
    interface HTMLPageRecipesElement extends Components.PageRecipes, HTMLStencilElement {
    }
    var HTMLPageRecipesElement: {
        prototype: HTMLPageRecipesElement;
        new (): HTMLPageRecipesElement;
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
    interface HTMLPageViewRecipeElement extends Components.PageViewRecipe, HTMLStencilElement {
    }
    var HTMLPageViewRecipeElement: {
        prototype: HTMLPageViewRecipeElement;
        new (): HTMLPageViewRecipeElement;
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
    interface HTMLUserEditorElement extends Components.UserEditor, HTMLStencilElement {
    }
    var HTMLUserEditorElement: {
        prototype: HTMLUserEditorElement;
        new (): HTMLUserEditorElement;
    };
    interface HTMLElementTagNameMap {
        "app-root": HTMLAppRootElement;
        "page-admin": HTMLPageAdminElement;
        "page-edit-recipe": HTMLPageEditRecipeElement;
        "page-home": HTMLPageHomeElement;
        "page-login": HTMLPageLoginElement;
        "page-recipes": HTMLPageRecipesElement;
        "page-search": HTMLPageSearchElement;
        "page-settings": HTMLPageSettingsElement;
        "page-view-recipe": HTMLPageViewRecipeElement;
        "recipe-card": HTMLRecipeCardElement;
        "recipe-editor": HTMLRecipeEditorElement;
        "user-editor": HTMLUserEditorElement;
    }
}
declare namespace LocalJSX {
    interface AppRoot {
    }
    interface PageAdmin {
    }
    interface PageEditRecipe {
    }
    interface PageHome {
        "userSettings"?: UserSettings | null;
    }
    interface PageLogin {
    }
    interface PageRecipes {
    }
    interface PageSearch {
    }
    interface PageSettings {
    }
    interface PageViewRecipe {
        "recipeId"?: number;
    }
    interface RecipeCard {
        "recipe"?: RecipeCompact | null;
    }
    interface RecipeEditor {
        "recipe"?: Recipe | null;
    }
    interface UserEditor {
        "user"?: User | null;
    }
    interface IntrinsicElements {
        "app-root": AppRoot;
        "page-admin": PageAdmin;
        "page-edit-recipe": PageEditRecipe;
        "page-home": PageHome;
        "page-login": PageLogin;
        "page-recipes": PageRecipes;
        "page-search": PageSearch;
        "page-settings": PageSettings;
        "page-view-recipe": PageViewRecipe;
        "recipe-card": RecipeCard;
        "recipe-editor": RecipeEditor;
        "user-editor": UserEditor;
    }
}
export { LocalJSX as JSX };
declare module "@stencil/core" {
    export namespace JSX {
        interface IntrinsicElements {
            "app-root": LocalJSX.AppRoot & JSXBase.HTMLAttributes<HTMLAppRootElement>;
            "page-admin": LocalJSX.PageAdmin & JSXBase.HTMLAttributes<HTMLPageAdminElement>;
            "page-edit-recipe": LocalJSX.PageEditRecipe & JSXBase.HTMLAttributes<HTMLPageEditRecipeElement>;
            "page-home": LocalJSX.PageHome & JSXBase.HTMLAttributes<HTMLPageHomeElement>;
            "page-login": LocalJSX.PageLogin & JSXBase.HTMLAttributes<HTMLPageLoginElement>;
            "page-recipes": LocalJSX.PageRecipes & JSXBase.HTMLAttributes<HTMLPageRecipesElement>;
            "page-search": LocalJSX.PageSearch & JSXBase.HTMLAttributes<HTMLPageSearchElement>;
            "page-settings": LocalJSX.PageSettings & JSXBase.HTMLAttributes<HTMLPageSettingsElement>;
            "page-view-recipe": LocalJSX.PageViewRecipe & JSXBase.HTMLAttributes<HTMLPageViewRecipeElement>;
            "recipe-card": LocalJSX.RecipeCard & JSXBase.HTMLAttributes<HTMLRecipeCardElement>;
            "recipe-editor": LocalJSX.RecipeEditor & JSXBase.HTMLAttributes<HTMLRecipeEditorElement>;
            "user-editor": LocalJSX.UserEditor & JSXBase.HTMLAttributes<HTMLUserEditorElement>;
        }
    }
}
