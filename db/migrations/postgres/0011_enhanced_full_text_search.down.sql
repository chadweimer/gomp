DROP INDEX recipe_full_text_name_idx;
DROP INDEX recipe_full_text_ingredients_idx;
DROP INDEX recipe_full_text_directions_idx;
CREATE INDEX recipe_full_text_idx ON recipe USING GIN (to_tsvector('english', recipe.name || ' ' || recipe.ingredients || ' ' || recipe.directions));