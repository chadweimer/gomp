BEGIN;

CREATE OR REPLACE FUNCTION sync_seq(table_name TEXT, col_name TEXT)
RETURNS VOID AS $$
DECLARE
  seq_name TEXT;
  max_id   BIGINT;
BEGIN
  SELECT pg_get_serial_sequence(table_name, col_name) INTO seq_name;

  IF seq_name IS NOT NULL THEN
    SELECT COALESCE(MAX(col_name), 1) INTO max_id FROM table_name;
    PERFORM setval(seq_name, max_id);
  ELSE
    RAISE NOTICE 'No sequence associated with %.%', table_name, col_name;
  END IF;
END;
$$ LANGUAGE plpgsql;

COMMIT;