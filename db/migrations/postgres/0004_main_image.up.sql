ALTER TABLE recipe
ADD COLUMN image_id INTEGER,
FOREIGN KEY(image_id) REFERENCES recipe_image(id);