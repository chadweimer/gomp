BEGIN;

-- Schema

CREATE TABLE app_configuration (
    title TEXT NOT NULL
);

-- Seed data

INSERT INTO app_configuration (title) VALUES('GOMP: Go Meal Planner');

COMMIT;
