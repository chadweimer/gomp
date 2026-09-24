BEGIN;

DROP FUNCTION IF EXISTS sync_seq(table_name TEXT, col_name TEXT);

COMMIT;