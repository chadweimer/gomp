DROP INDEX recipe_full_text_idx;
CREATE INDEX recipe_full_text_name_idx ON recipe USING GIN (to_tsvector('english', recipe.name));
CREATE INDEX recipe_full_text_ingredients_idx ON recipe USING GIN (to_tsvector('english', recipe.ingredients));
CREATE INDEX recipe_full_text_directions_idx ON recipe USING GIN (to_tsvector('english', recipe.directions));