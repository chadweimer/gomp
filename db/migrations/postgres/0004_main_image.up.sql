ALTER TABLE recipe
ADD COLUMN image_id INTEGER,
FOREIGN KEY(image_id) REFERENCES recipe_image(id);

UPDATE recipe AS r SET r.image_id = (SELECT i.id FROM recipe_image AS i WHERE i.recipe_id = r.id LIMIT 1);
