BEGIN;

CREATE INDEX recipe_full_text_idx ON recipe USING GIN (to_tsvector('english', recipe.name || ' ' || recipe.ingredients || ' ' || recipe.directions));

COMMIT;