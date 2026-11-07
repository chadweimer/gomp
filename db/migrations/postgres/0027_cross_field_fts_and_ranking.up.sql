BEGIN;

DROP INDEX IF EXISTS recipe_full_text_name_idx;
DROP INDEX IF EXISTS recipe_full_text_ingredients_idx;
DROP INDEX IF EXISTS recipe_full_text_directions_idx;

CREATE INDEX recipe_full_text_combined_idx ON recipe USING GIN (
    (
        setweight(to_tsvector('english', coalesce(name, '')), 'A') ||
        setweight(to_tsvector('english', coalesce(ingredients, '')), 'B') ||
        setweight(to_tsvector('english', coalesce(directions, '')), 'B') ||
        setweight(to_tsvector('english', coalesce(storage_instructions, '')), 'C') ||
        setweight(to_tsvector('english', coalesce(nutrition_info, '')), 'D')
    )
);

COMMIT;
