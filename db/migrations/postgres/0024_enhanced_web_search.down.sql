BEGIN;

DROP FUNCTION IF EXISTS websearch_to_wildcard_tsquery(config regconfig, querytext text);

END;
