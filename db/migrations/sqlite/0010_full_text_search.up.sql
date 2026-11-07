BEGIN;

CREATE VIRTUAL TABLE recipe_fts USING fts5(
    name,
    ingredients,
    directions,
    storage_instructions,
    nutrition_info,
    content='recipe',
    content_rowid='id',
    tokenize='porter unicode61 remove_diacritics 2'
);

CREATE TRIGGER recipe_fts_ai AFTER INSERT ON recipe BEGIN
    INSERT INTO recipe_fts(rowid, name, ingredients, directions, storage_instructions, nutrition_info)
    VALUES (new.id, new.name, new.ingredients, new.directions, new.storage_instructions, new.nutrition_info);
END;

CREATE TRIGGER recipe_fts_ad AFTER DELETE ON recipe BEGIN
    INSERT INTO recipe_fts(recipe_fts, rowid, name, ingredients, directions, storage_instructions, nutrition_info)
    VALUES ('delete', old.id, old.name, old.ingredients, old.directions, old.storage_instructions, old.nutrition_info);
END;

CREATE TRIGGER recipe_fts_au AFTER UPDATE ON recipe BEGIN
    INSERT INTO recipe_fts(recipe_fts, rowid, name, ingredients, directions, storage_instructions, nutrition_info)
    VALUES ('delete', old.id, old.name, old.ingredients, old.directions, old.storage_instructions, old.nutrition_info);
    INSERT INTO recipe_fts(rowid, name, ingredients, directions, storage_instructions, nutrition_info)
    VALUES (new.id, new.name, new.ingredients, new.directions, new.storage_instructions, new.nutrition_info);
END;

INSERT INTO recipe_fts(recipe_fts) VALUES('rebuild');

COMMIT;
