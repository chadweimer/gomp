BEGIN;

DROP TABLE menu_recipe;
DROP TABLE recipe_list_menu;
DROP TABLE menu;
DROP TABLE recipe_list;

ALTER TYPE entity_state RENAME TO recipe_state;

COMMIT;
