
-- Schema

CREATE TABLE app_configuration (
    title TEXT NOT NULL
);

-- Seed data

INSERT INTO app_configuration (title) SELECT 'GOMP: Go Meal Planner';
